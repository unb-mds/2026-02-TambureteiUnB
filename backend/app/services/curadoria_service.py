import logging
from pathlib import Path
from typing import BinaryIO
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.schemas.curadoria import (
    ComentarioPendente,
    DecisaoComentarioCuradoria,
    DecisaoCuradoria,
    FilaComentariosCuradoria,
    FilaCuradoria,
    RegistroCuradoria,
)
from app.api.schemas.material import MaterialResponse
from app.domain.materiais import ArquivoMuitoGrande, ArquivoVazio, FormatoNaoSuportado
from app.models.curadoria import Curadoria
from app.models.conteudo import Conteudo
from app.models.usuario import Usuario
from app.repositories.comentario_repo import comentario_repo
from app.repositories.curadoria_repo import curadoria_repo
from app.services.armazenamento_material import ArmazenamentoMaterial
from app.services.notificacao_service import notificacao_service

logger = logging.getLogger(__name__)


class CuradoriaService:
    def __init__(self, armazenamento: ArmazenamentoMaterial) -> None:
        self.armazenamento = armazenamento

    def listar(self, db: Session, pagina: int, tamanho: int) -> FilaCuradoria:
        itens, total = curadoria_repo.listar_pendentes(db, pagina, tamanho)
        return FilaCuradoria(items=itens, total=total, pagina=pagina, tamanho_pagina=tamanho)

    def obter(self, db: Session, conteudo_id: int, bloquear: bool = False) -> Conteudo:
        conteudo = curadoria_repo.obter_arquivo(db, conteudo_id, bloquear)
        if conteudo is None or conteudo.status_moderacao == "excluido":
            raise HTTPException(404, "Material não encontrado.")
        return conteudo

    def decidir(self, db: Session, conteudo_id: int, dados: DecisaoCuradoria, moderador: Usuario) -> RegistroCuradoria:
        try:
            conteudo = self.obter(db, conteudo_id, bloquear=True)
            if conteudo.status_curadoria != "PENDENTE":
                raise HTTPException(409, "Este material já foi avaliado. Atualize a fila.")
            eh_link = conteudo.caminho_arquivo is None and conteudo.url_origem is not None
            if eh_link:
                if conteudo.status_moderacao is not None:
                    raise HTTPException(409, "O material não está disponível para curadoria.")
            elif conteudo.status_moderacao not in {"ativo", "em_analise"}:
                raise HTTPException(409, "O material não está disponível para curadoria.")
            registro = Curadoria(
                conteudo_id=conteudo.id, moderador_id=moderador.id, perfil_moderador=moderador.role,
                status_anterior=conteudo.status_curadoria, status_novo=dados.status,
                justificativa=dados.justificativa,
            )
            conteudo.status_curadoria = dados.status
            conteudo.moderado_por = moderador.role
            if dados.justificativa:
                conteudo.motivo_moderacao = dados.justificativa
            if dados.status == "APROVADO" and not eh_link:
                conteudo.status_moderacao = "ativo"
            curadoria_repo.registrar(db, registro)

            chave_remover: str | None = None
            disciplina_slug = conteudo.disciplina.slug if conteudo.disciplina else None
            if dados.status == "APROVADO":
                notificacao_service.registrar(
                    db,
                    conteudo.usuario_id,
                    tipo="MATERIAL_APROVADO",
                    titulo="Material aprovado pela moderação",
                    mensagem=f'Seu material "{conteudo.titulo}" foi aprovado e já está publicado.',
                    link=f"/disciplinas/{disciplina_slug}" if disciplina_slug else "/perfil?filtro=APROVADO#minhas-contribuicoes",
                )
            else:
                remover_fisico = not eh_link and bool(dados.excluir_arquivo)
                if remover_fisico and conteudo.caminho_arquivo:
                    chave_remover = conteudo.caminho_arquivo
                    msg_recusa = (
                        f'Seu material "{conteudo.titulo}" foi recusado e o arquivo foi removido do servidor. '
                        f"Motivo: {dados.justificativa}"
                    )
                else:
                    msg_recusa = (
                        f'Seu material "{conteudo.titulo}" foi recusado. Você pode editar e reenviar pelo seu perfil. '
                        f"Motivo: {dados.justificativa}"
                    )
                notificacao_service.registrar(
                    db,
                    conteudo.usuario_id,
                    tipo="MATERIAL_RECUSADO",
                    titulo="Material recusado pela moderação",
                    mensagem=msg_recusa,
                    link="/perfil?filtro=RECUSADO#minhas-contribuicoes",
                )

            resposta = RegistroCuradoria.model_validate(registro)
            db.commit()
            if chave_remover:
                try:
                    self.armazenamento.remover(chave_remover)
                except OSError:
                    logger.warning(
                        "Arquivo físico do material %s não pôde ser removido após recusa.",
                        conteudo.id,
                    )
            return resposta
        except HTTPException:
            db.rollback()
            raise
        except SQLAlchemyError as exc:
            db.rollback()
            logger.exception("Falha ao registrar curadoria.")
            raise HTTPException(503, "Não foi possível registrar a decisão. Tente novamente.") from exc

    def listar_comentarios(self, db: Session, pagina: int, tamanho: int) -> FilaComentariosCuradoria:
        itens, total = curadoria_repo.listar_comentarios_pendentes(db, pagina, tamanho)
        return FilaComentariosCuradoria(items=itens, total=total, pagina=pagina, tamanho_pagina=tamanho)

    def decidir_comentario(
        self, db: Session, comentario_id: int, dados: DecisaoComentarioCuradoria, moderador: Usuario
    ) -> ComentarioPendente:
        try:
            comentario = curadoria_repo.obter_comentario(db, comentario_id, bloquear=True)
            if comentario is None:
                raise HTTPException(404, "Comentário não encontrado.")
            if comentario.status_moderacao != "PENDENTE":
                raise HTTPException(409, "Este comentário já foi avaliado. Atualize a fila.")
            comentario.status_moderacao = dados.status
            comentario.moderado_por = moderador.role
            if dados.justificativa:
                comentario.motivo_moderacao = dados.justificativa
            if dados.status == "OCULTO":
                comentario_repo.ocultar_descendentes(db, comentario.id, moderador.role)
            disciplina_slug = comentario.disciplina.slug if comentario.disciplina else None
            if dados.status == "PUBLICADO":
                notificacao_service.registrar(
                    db,
                    comentario.usuario_id,
                    tipo="COMENTARIO_APROVADO",
                    titulo="Comentário aprovado pela moderação",
                    mensagem="Seu comentário foi aprovado e já está visível na disciplina.",
                    link=f"/disciplinas/{disciplina_slug}" if disciplina_slug else "/perfil",
                )
            else:
                motivo_txt = f" Motivo: {dados.justificativa}" if dados.justificativa else ""
                notificacao_service.registrar(
                    db,
                    comentario.usuario_id,
                    tipo="COMENTARIO_OCULTADO",
                    titulo="Comentário recusado pela moderação",
                    mensagem=f"Seu comentário não foi publicado pela moderação.{motivo_txt}",
                    link=f"/disciplinas/{disciplina_slug}" if disciplina_slug else "/perfil",
                )
            db.flush()
            resposta = ComentarioPendente.model_validate(comentario)
            db.commit()
            return resposta
        except HTTPException:
            db.rollback()
            raise
        except SQLAlchemyError as exc:
            db.rollback()
            logger.exception("Falha ao registrar curadoria de comentário.")
            raise HTTPException(503, "Não foi possível registrar a decisão. Tente novamente.") from exc

    def baixar(self, db: Session, conteudo_id: int) -> tuple[Conteudo, Path]:
        conteudo = self.obter(db, conteudo_id)
        if conteudo.caminho_arquivo is None:
            raise HTTPException(404, "Arquivo não encontrado.")
        if conteudo.status_curadoria != "PENDENTE" or conteudo.status_moderacao not in {"ativo", "em_analise"}:
            raise HTTPException(409, "O material não está mais pendente. Atualize a fila.")
        try:
            caminho = self.armazenamento.localizar(conteudo.caminho_arquivo)
        except (OSError, ValueError) as exc:
            raise HTTPException(404, "Arquivo não encontrado.") from exc
        return conteudo, caminho

    def substituir_arquivo(
        self,
        db: Session,
        conteudo_id: int,
        arquivo: BinaryIO,
        nome: str,
        tipo_mime: str,
        moderador: Usuario,
        justificativa: str | None = None,
    ) -> MaterialResponse:
        """Substitui o arquivo físico de um material existente e remove o anterior do disco."""
        justificativa_limpa = (justificativa or "").strip() or "Arquivo substituído pela moderação."
        if len(justificativa_limpa) > 1000:
            raise HTTPException(422, "A justificativa deve ter no máximo 1000 caracteres.")

        conteudo = self.obter(db, conteudo_id, bloquear=True)
        if conteudo.caminho_arquivo is None:
            raise HTTPException(422, "Somente materiais com arquivo físico podem ter o arquivo substituído.")

        try:
            nova_chave, novo_formato, novo_tamanho = self.armazenamento.salvar(arquivo, nome, tipo_mime)
        except FormatoNaoSuportado as exc:
            raise HTTPException(415, str(exc)) from exc
        except ArquivoMuitoGrande as exc:
            raise HTTPException(413, str(exc)) from exc
        except ArquivoVazio as exc:
            raise HTTPException(400, str(exc)) from exc
        except OSError as exc:
            logger.exception("Falha ao armazenar arquivo substituto do material.")
            raise HTTPException(503, "Armazenamento temporariamente indisponível.") from exc

        chave_antiga = conteudo.caminho_arquivo
        try:
            conteudo.caminho_arquivo = nova_chave
            conteudo.formato = novo_formato
            conteudo.tamanho_bytes = novo_tamanho
            conteudo.moderado_por = moderador.role
            conteudo.motivo_moderacao = justificativa_limpa
            db.flush()
            resposta = MaterialResponse.model_validate(conteudo)
            db.commit()
        except Exception as exc:
            db.rollback()
            try:
                self.armazenamento.remover(nova_chave)
            except OSError:
                logger.exception("Falha ao limpar arquivo substituto após rollback.")
            if isinstance(exc, SQLAlchemyError):
                logger.exception("Falha ao persistir substituição de arquivo do material.")
                raise HTTPException(503, "Não foi possível substituir o arquivo. Tente novamente.") from exc
            raise

        if chave_antiga and chave_antiga != nova_chave:
            try:
                self.armazenamento.remover(chave_antiga)
            except OSError:
                logger.warning("Arquivo antigo do material %s não pôde ser removido do disco.", conteudo.id)

        return resposta

    def historico(self, db: Session, conteudo_id: int) -> list[RegistroCuradoria]:
        self.obter(db, conteudo_id)
        return [RegistroCuradoria.model_validate(item) for item in curadoria_repo.historico(db, conteudo_id)]
