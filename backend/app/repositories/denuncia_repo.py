from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, aliased, joinedload

from app.domain.denuncias import LIMIAR_OCULTACAO_DENUNCIAS
from app.models.comentario import Comentario
from app.models.conteudo import Conteudo
from app.models.denuncia import Denuncia
from app.repositories.base import BaseRepository


class DenunciaRepository(BaseRepository[Denuncia]):
    def __init__(self) -> None:
        super().__init__(Denuncia)

    def buscar_duplicada(
        self,
        db: Session,
        usuario_id: UUID,
        comentario_id: int | None,
        conteudo_id: int | None,
    ) -> Denuncia | None:
        filtros = [Denuncia.usuario_id == usuario_id]
        if comentario_id is not None:
            filtros.append(Denuncia.comentario_id == comentario_id)
        else:
            filtros.append(Denuncia.conteudo_id == conteudo_id)
        return db.scalar(select(Denuncia).where(*filtros))

    def contar_pendentes_alvo(
        self,
        db: Session,
        comentario_id: int | None,
        conteudo_id: int | None,
    ) -> int:
        filtros = [Denuncia.status == "PENDENTE"]
        if comentario_id is not None:
            filtros.append(Denuncia.comentario_id == comentario_id)
        else:
            filtros.append(Denuncia.conteudo_id == conteudo_id)
        return int(db.scalar(select(func.count()).select_from(Denuncia).where(*filtros)) or 0)

    def registrar(self, db: Session, denuncia: Denuncia) -> Denuncia:
        db.add(denuncia)
        db.flush()
        db.refresh(denuncia)
        return denuncia

    def listar_pendentes(
        self,
        db: Session,
        pagina: int,
        tamanho: int,
        tipo: str | None = None,
        categoria: str | None = None,
        situacao: str | None = None,
    ) -> tuple[list[Denuncia], int]:
        filtros = [Denuncia.status == "PENDENTE"]
        tipo_norm = (tipo or "").strip().upper()
        if tipo_norm == "COMENTARIO":
            filtros.append(Denuncia.comentario_id.isnot(None))
        elif tipo_norm == "MATERIAL":
            filtros.append(Denuncia.conteudo_id.isnot(None))

        cat_norm = (categoria or "").strip().upper()
        if cat_norm and cat_norm not in ("TODAS", "TODOS"):
            filtros.append(Denuncia.categoria == cat_norm)

        sit_norm = (situacao or "").strip().upper()
        if sit_norm in ("OCULTADOS", "ABAIXO_LIMIAR"):
            den_sub = aliased(Denuncia)
            contagem_alvo = (
                select(func.count(den_sub.id))
                .where(
                    den_sub.status == "PENDENTE",
                    or_(
                        and_(
                            Denuncia.comentario_id.isnot(None),
                            den_sub.comentario_id == Denuncia.comentario_id,
                        ),
                        and_(
                            Denuncia.conteudo_id.isnot(None),
                            den_sub.conteudo_id == Denuncia.conteudo_id,
                        ),
                    ),
                )
                .correlate(Denuncia)
                .scalar_subquery()
            )
            comentario_oculto = Denuncia.comentario.has(Comentario.status_moderacao == "PENDENTE")
            conteudo_oculto = Denuncia.conteudo.has(
                or_(
                    Conteudo.status_moderacao == "em_analise",
                    Conteudo.status_curadoria == "PENDENTE",
                )
            )
            esta_ocultado = or_(
                contagem_alvo >= LIMIAR_OCULTACAO_DENUNCIAS,
                comentario_oculto,
                conteudo_oculto,
            )
            if sit_norm == "OCULTADOS":
                filtros.append(esta_ocultado)
            else:
                filtros.append(~esta_ocultado)

        total = int(db.scalar(select(func.count()).select_from(Denuncia).where(*filtros)) or 0)
        consulta = (
            select(Denuncia)
            .options(
                joinedload(Denuncia.comentario).joinedload(Comentario.disciplina),
                joinedload(Denuncia.conteudo).joinedload(Conteudo.disciplina),
            )
            .where(*filtros)
            .order_by(Denuncia.created_at.desc(), Denuncia.id.desc())
            .offset((pagina - 1) * tamanho)
            .limit(tamanho)
        )
        return list(db.scalars(consulta)), total

    def obter_por_id(self, db: Session, denuncia_id: int, bloquear: bool = False) -> Denuncia | None:
        consulta = select(Denuncia).where(Denuncia.id == denuncia_id)
        if bloquear:
            consulta = consulta.with_for_update().execution_options(populate_existing=True)
        return db.scalar(consulta)

    def obter_comentario(self, db: Session, comentario_id: int, bloquear: bool = False) -> Comentario | None:
        consulta = select(Comentario).where(Comentario.id == comentario_id)
        if bloquear:
            consulta = consulta.with_for_update().execution_options(populate_existing=True)
        return db.scalar(consulta)

    def obter_conteudo(self, db: Session, conteudo_id: int, bloquear: bool = False) -> Conteudo | None:
        consulta = select(Conteudo).where(Conteudo.id == conteudo_id)
        if bloquear:
            consulta = consulta.with_for_update().execution_options(populate_existing=True)
        return db.scalar(consulta)

    def resolver_pendentes_alvo(
        self,
        db: Session,
        comentario_id: int | None,
        conteudo_id: int | None,
        novo_status: str,
        moderador_id: UUID,
        perfil_moderador: str,
        justificativa: str | None,
    ) -> tuple[int, datetime]:
        filtros = [Denuncia.status == "PENDENTE"]
        if comentario_id is not None:
            filtros.append(Denuncia.comentario_id == comentario_id)
        else:
            filtros.append(Denuncia.conteudo_id == conteudo_id)

        pendentes = list(db.scalars(select(Denuncia).where(*filtros).with_for_update()))
        agora = datetime.now(timezone.utc)
        for item in pendentes:
            item.status = novo_status
            item.moderador_id = moderador_id
            item.perfil_moderador = perfil_moderador
            item.justificativa_decisao = justificativa
            item.resolved_at = agora
        db.flush()
        return len(pendentes), agora


denuncia_repo = DenunciaRepository()
