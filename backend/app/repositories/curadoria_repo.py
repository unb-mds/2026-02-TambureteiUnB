from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload
from app.models.comentario import Comentario
from app.models.conteudo import Conteudo
from app.models.curadoria import Curadoria
from app.models.denuncia import Denuncia
from app.repositories.base import BaseRepository


class CuradoriaRepository(BaseRepository[Curadoria]):
    def __init__(self) -> None:
        super().__init__(Curadoria)

    def listar_pendentes(self, db: Session, pagina: int, tamanho: int) -> tuple[list[Conteudo], int]:
        conteudos_denunciados = select(Denuncia.conteudo_id).where(
            Denuncia.status == "PENDENTE",
            Denuncia.conteudo_id.isnot(None),
        )
        origem_pendente = or_(
            and_(
                Conteudo.caminho_arquivo.isnot(None),
                Conteudo.status_moderacao.in_(["ativo", "em_analise"]),
            ),
            and_(
                Conteudo.url_origem.isnot(None),
                Conteudo.status_moderacao.is_(None),
            ),
        )
        filtros = (
            origem_pendente,
            Conteudo.status_curadoria == "PENDENTE",
            ~Conteudo.id.in_(conteudos_denunciados),
        )
        total = db.scalar(select(func.count()).select_from(Conteudo).where(*filtros)) or 0
        consulta = (select(Conteudo).options(joinedload(Conteudo.disciplina)).where(*filtros)
                    .order_by(Conteudo.created_at, Conteudo.id).offset((pagina - 1) * tamanho).limit(tamanho))
        return list(db.scalars(consulta)), total

    def obter_arquivo(self, db: Session, conteudo_id: int, bloquear: bool = False) -> Conteudo | None:
        consulta = select(Conteudo).where(
            Conteudo.id == conteudo_id,
            or_(Conteudo.caminho_arquivo.isnot(None), Conteudo.url_origem.isnot(None)),
        )
        if bloquear:
            consulta = consulta.with_for_update().execution_options(populate_existing=True)
        return db.scalar(consulta)

    def listar_comentarios_pendentes(self, db: Session, pagina: int, tamanho: int) -> tuple[list[Comentario], int]:
        comentarios_denunciados = select(Denuncia.comentario_id).where(
            Denuncia.status == "PENDENTE",
            Denuncia.comentario_id.isnot(None),
        )
        filtros = (
            Comentario.status_moderacao == "PENDENTE",
            ~Comentario.id.in_(comentarios_denunciados),
        )
        total = db.scalar(select(func.count()).select_from(Comentario).where(*filtros)) or 0
        consulta = (
            select(Comentario)
            .options(joinedload(Comentario.disciplina))
            .where(*filtros)
            .order_by(Comentario.created_at, Comentario.id)
            .offset((pagina - 1) * tamanho)
            .limit(tamanho)
        )
        return list(db.scalars(consulta)), total

    def obter_comentario(self, db: Session, comentario_id: int, bloquear: bool = False) -> Comentario | None:
        consulta = select(Comentario).where(Comentario.id == comentario_id)
        if bloquear:
            consulta = consulta.with_for_update().execution_options(populate_existing=True)
        return db.scalar(consulta)

    def registrar(self, db: Session, registro: Curadoria) -> None:
        db.add(registro)
        db.flush()
        db.refresh(registro)

    def historico(self, db: Session, conteudo_id: int) -> list[Curadoria]:
        return list(db.scalars(select(Curadoria).where(Curadoria.conteudo_id == conteudo_id).order_by(Curadoria.id)))


curadoria_repo = CuradoriaRepository()
