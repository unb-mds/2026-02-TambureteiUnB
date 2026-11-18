from __future__ import annotations

import logging
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.schemas.curadoria import DisciplinaCuradoria
from app.api.schemas.denuncia import (
    AlvoDenunciadoResumo,
    DecisaoDenuncia,
    DenunciaCreate,
    DenunciaItemFila,
    DenunciaResponse,
    FilaDenuncias,
    ResumoDecisaoDenuncia,
)
from app.domain.denuncias import (
    analisar_risco_rn04,
    atingiu_limiar_ocultacao,
    determinar_transicao_moderacao,
)
from app.models.denuncia import Denuncia
from app.models.usuario import Usuario
from app.repositories.denuncia_repo import denuncia_repo

logger = logging.getLogger(__name__)


class DenunciaService:
    def criar(self, db: Session, dados: DenunciaCreate, denunciante: Usuario) -> DenunciaResponse:
        try:
            tipo_alvo = "COMENTARIO" if dados.comentario_id is not None else "MATERIAL"
            comentario = None
            conteudo = None

            if dados.comentario_id is not None:
                comentario = denuncia_repo.obter_comentario(db, dados.comentario_id, bloquear=True)
                if comentario is None or comentario.status_moderacao == "OCULTO":
                    raise HTTPException(status.HTTP_404_NOT_FOUND, "Comentário não encontrado.")
            else:
                if dados.conteudo_id is None:
                    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Alvo da denúncia inválido.")
                conteudo = denuncia_repo.obter_conteudo(db, dados.conteudo_id, bloquear=True)
                if conteudo is None or conteudo.status_moderacao == "excluido":
                    raise HTTPException(status.HTTP_404_NOT_FOUND, "Material não encontrado.")

            duplicada = denuncia_repo.buscar_duplicada(
                db,
                denunciante.id,
                dados.comentario_id,
                dados.conteudo_id,
            )
            if duplicada is not None:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    "Você já denunciou este conteúdo.",
                )

            nova = Denuncia(
                comentario_id=dados.comentario_id,
                conteudo_id=dados.conteudo_id,
                usuario_id=denunciante.id,
                categoria=dados.categoria,
                motivo=dados.motivo,
                status="PENDENTE",
            )
            denuncia_repo.registrar(db, nova)

            total_pendentes = denuncia_repo.contar_pendentes_alvo(
                db,
                dados.comentario_id,
                dados.conteudo_id,
            )
            ocultado_automaticamente = False
            if atingiu_limiar_ocultacao(total_pendentes):
                ocultado_automaticamente = True
                if comentario is not None and comentario.status_moderacao == "PUBLICADO":
                    comentario.status_moderacao = "PENDENTE"
                elif conteudo is not None and conteudo.status_moderacao == "ativo":
                    conteudo.status_moderacao = "em_analise"
                db.flush()

            resposta = DenunciaResponse(
                id=nova.id,
                tipo_alvo=tipo_alvo,  # type: ignore[arg-type]
                comentario_id=nova.comentario_id,
                conteudo_id=nova.conteudo_id,
                categoria=nova.categoria,
                motivo=nova.motivo,
                status=nova.status,
                total_denuncias_alvo=total_pendentes,
                ocultado_automaticamente=ocultado_automaticamente,
                created_at=nova.created_at,
            )
            db.commit()
            return resposta
        except HTTPException:
            db.rollback()
            raise
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Você já denunciou este conteúdo.",
            ) from exc
        except SQLAlchemyError as exc:
            db.rollback()
            logger.exception("Falha ao registrar denúncia.")
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Não foi possível registrar a denúncia no momento.",
            ) from exc

    def listar_fila(
        self,
        db: Session,
        pagina: int,
        tamanho: int,
        tipo: str | None = None,
        categoria: str | None = None,
    ) -> FilaDenuncias:
        registros, total = denuncia_repo.listar_pendentes(db, pagina, tamanho, tipo, categoria)
        itens: list[DenunciaItemFila] = []

        for reg in registros:
            total_alvo = denuncia_repo.contar_pendentes_alvo(db, reg.comentario_id, reg.conteudo_id)
            if reg.comentario_id is not None and reg.comentario is not None:
                com = reg.comentario
                prioridade, sinais = analisar_risco_rn04(com.conteudo, reg.categoria)
                alvo = AlvoDenunciadoResumo(
                    id=com.id,
                    tipo_alvo="COMENTARIO",
                    titulo=None,
                    conteudo=com.conteudo,
                    autor_alias=com.autor_alias,
                    topico_dificuldade=com.topico_dificuldade,
                    formato=None,
                    status_moderacao=com.status_moderacao,
                    created_at=com.created_at,
                    disciplina=DisciplinaCuradoria.model_validate(com.disciplina),
                )
                tipo_alvo = "COMENTARIO"
            elif reg.conteudo_id is not None and reg.conteudo is not None:
                mat = reg.conteudo
                texto_analise = f"{mat.titulo} {mat.descricao or ''}"
                prioridade, sinais = analisar_risco_rn04(texto_analise, reg.categoria)
                alvo = AlvoDenunciadoResumo(
                    id=mat.id,
                    tipo_alvo="MATERIAL",
                    titulo=mat.titulo,
                    conteudo=mat.descricao or mat.titulo,
                    autor_alias="Autor Anônimo",
                    topico_dificuldade=mat.tipo,
                    formato=mat.formato,
                    status_moderacao=mat.status_moderacao or mat.status_curadoria,
                    created_at=mat.created_at,
                    disciplina=DisciplinaCuradoria.model_validate(mat.disciplina),
                )
                tipo_alvo = "MATERIAL"
            else:
                continue

            itens.append(
                DenunciaItemFila(
                    id=reg.id,
                    tipo_alvo=tipo_alvo,  # type: ignore[arg-type]
                    comentario_id=reg.comentario_id,
                    conteudo_id=reg.conteudo_id,
                    categoria=reg.categoria,
                    motivo=reg.motivo,
                    status=reg.status,
                    created_at=reg.created_at,
                    total_denuncias=max(1, total_alvo),
                    prioridade_rn04=prioridade,
                    sinalizacoes_rn04=sinais,
                    alvo=alvo,
                )
            )

        return FilaDenuncias(items=itens, total=total, pagina=pagina, tamanho_pagina=tamanho)

    def decidir(
        self,
        db: Session,
        denuncia_id: int,
        dados: DecisaoDenuncia,
        moderador: Usuario,
    ) -> ResumoDecisaoDenuncia:
        try:
            denuncia = denuncia_repo.obter_por_id(db, denuncia_id, bloquear=True)
            if denuncia is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Denúncia não encontrada.")
            if denuncia.status != "PENDENTE":
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    "Esta denúncia já foi avaliada. Atualize a fila.",
                )

            if denuncia.comentario_id is not None:
                tipo_alvo = "COMENTARIO"
                alvo_id = denuncia.comentario_id
                comentario = denuncia_repo.obter_comentario(db, alvo_id, bloquear=True)
                if comentario is None:
                    raise HTTPException(status.HTTP_404_NOT_FOUND, "Comentário denunciado não encontrado.")
                transicao = determinar_transicao_moderacao(dados.acao, tipo_alvo)
                comentario.status_moderacao = transicao["status_moderacao"]
                status_moderacao_alvo = comentario.status_moderacao
            else:
                if denuncia.conteudo_id is None:
                    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Alvo da denúncia inválido.")
                tipo_alvo = "MATERIAL"
                alvo_id = denuncia.conteudo_id
                conteudo = denuncia_repo.obter_conteudo(db, alvo_id, bloquear=True)
                if conteudo is None:
                    raise HTTPException(status.HTTP_404_NOT_FOUND, "Material denunciado não encontrado.")
                transicao = determinar_transicao_moderacao(dados.acao, tipo_alvo)
                conteudo.status_moderacao = transicao["status_moderacao"]
                if transicao["status_curadoria"]:
                    conteudo.status_curadoria = transicao["status_curadoria"]
                status_moderacao_alvo = conteudo.status_moderacao

            qtd, resolvido_em = denuncia_repo.resolver_pendentes_alvo(
                db=db,
                comentario_id=denuncia.comentario_id,
                conteudo_id=denuncia.conteudo_id,
                novo_status=transicao["status_denuncia"],
                moderador_id=moderador.id,
                perfil_moderador=moderador.role,
                justificativa=dados.justificativa,
            )

            resumo = ResumoDecisaoDenuncia(
                id=denuncia.id,
                tipo_alvo=tipo_alvo,  # type: ignore[arg-type]
                alvo_id=alvo_id,
                acao=dados.acao,  # type: ignore[arg-type]
                status_denuncia=transicao["status_denuncia"],
                status_moderacao_alvo=status_moderacao_alvo,
                denuncias_atualizadas=qtd,
                moderador_id=moderador.id,
                perfil_moderador=moderador.role,
                justificativa=dados.justificativa,
                resolved_at=resolvido_em,
            )
            db.commit()
            return resumo
        except HTTPException:
            db.rollback()
            raise
        except SQLAlchemyError as exc:
            db.rollback()
            logger.exception("Falha ao processar decisão de denúncia.")
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Não foi possível registrar a decisão. Tente novamente.",
            ) from exc


denuncia_service = DenunciaService()
