import math
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas.comentario import (
    ComentarioCadeiraCreate,
    ComentarioCreate,
    ComentarioResponse,
    ComentarioUpdate,
)
from app.models.comentario import Comentario
from app.models.usuario import Usuario
from app.repositories.comentario_repo import comentario_repo
from app.repositories.disciplina_repo import disciplina_repo
from app.repositories.turma_repo import turma_repo


class ComentarioService:
    @staticmethod
    def _validar_turma_da_disciplina(db: Session, turma_id: int | None, disciplina_id: int) -> None:
        if turma_id is None:
            return
        turma = turma_repo.get_by_id(db, turma_id)
        if not turma:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")
        if turma.disciplina_id != disciplina_id:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="A turma informada não pertence à disciplina selecionada.",
            )

    @staticmethod
    def _resolver_disciplina(db: Session, disciplina_id_ou_slug: int | str):
        if isinstance(disciplina_id_ou_slug, int) or (
            isinstance(disciplina_id_ou_slug, str) and disciplina_id_ou_slug.isdigit()
        ):
            return disciplina_repo.get_by_id(db, int(disciplina_id_ou_slug))
        termo = str(disciplina_id_ou_slug).strip()
        disc = disciplina_repo.get_by_slug(db, termo)
        if not disc:
            disc = disciplina_repo.get_by_codigo(db, termo.upper())
        return disc

    @staticmethod
    def _resolver_autor_alias(dados_alias: Optional[str], current_user: Usuario) -> str:
        alias = (dados_alias or "").strip()
        if not alias or alias.lower() in {
            "estudante anônimo",
            "estudante anonimo",
            "@estudante_anonimo",
            "anônimo",
            "anonimo",
        }:
            return "Estudante Anônimo"
        return current_user.nome

    def criar_comentario(
        self,
        db: Session,
        dados: ComentarioCreate,
        current_user: Usuario,
    ) -> Comentario:

        if not disciplina_repo.get_by_id(db, dados.disciplina_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada.")

        self._validar_turma_da_disciplina(db, dados.turma_id, dados.disciplina_id)

        if dados.parent_id is not None:
            comentario_pai = comentario_repo.get_by_id(db, dados.parent_id)
            if not comentario_pai:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND,
                    detail="Comentário pai não encontrado.",
                )
            if comentario_pai.disciplina_id != dados.disciplina_id:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="O comentário pai não pertence à disciplina selecionada.",
                )

        novo_comentario = Comentario(
            usuario_id=current_user.id,
            disciplina_id=dados.disciplina_id,
            turma_id=dados.turma_id,
            parent_id=dados.parent_id,
            conteudo=dados.conteudo,
            autor_alias=self._resolver_autor_alias(dados.autor_alias, current_user),
            topico_dificuldade=dados.topico_dificuldade,
            status_moderacao="PENDENTE",
        )
        return comentario_repo.create(db, novo_comentario)

    def criar_comentario_por_cadeira(
        self,
        db: Session,
        disciplina_id_ou_slug: int | str,
        dados: ComentarioCadeiraCreate,
        current_user: Usuario,
    ) -> Comentario:
        disciplina = self._resolver_disciplina(db, disciplina_id_ou_slug)
        if not disciplina:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada.")

        payload = ComentarioCreate(
            disciplina_id=disciplina.id,
            turma_id=dados.turma_id,
            parent_id=dados.parent_id,
            autor_alias=self._resolver_autor_alias(dados.autor_alias, current_user),
            topico_dificuldade=dados.topico_dificuldade,
            conteudo=dados.conteudo,
        )
        return self.criar_comentario(db, payload, current_user)

    def listar_comentarios(
        self,
        db: Session,
        disciplina_id: int | str,
        turma_id: Optional[int],
        page: int,
        size: int,
        topico: Optional[str] = None,
        apenas_dificuldades: bool = False,
        current_user_id: Optional[UUID] = None,
    ) -> dict:

        disciplina = self._resolver_disciplina(db, disciplina_id)
        if not disciplina:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada.")

        self._validar_turma_da_disciplina(db, turma_id, disciplina.id)

        items, total = comentario_repo.listar_por_disciplina_paginado(
            db,
            disciplina.id,
            turma_id,
            page,
            size,
            topico=topico,
            apenas_dificuldades=apenas_dificuldades,
        )

        comentario_ids = [item.id for item in items]
        votos_por_id = comentario_repo.contar_votos_comentarios(db, comentario_ids)
        votados_usuario = (
            comentario_repo.listar_votos_usuario(db, comentario_ids, current_user_id)
            if current_user_id is not None
            else set()
        )
        items_resposta = [
            ComentarioResponse.model_validate(item).model_copy(
                update={
                    "upvotes": votos_por_id.get(item.id, 0),
                    "liked_by_me": item.id in votados_usuario,
                }
            )
            for item in items
        ]

        return {
            "items": items_resposta,
            "total": total,
            "page": page,
            "size": size,
            "pages": math.ceil(total / size) if total > 0 else 0,
        }

    def alternar_voto(
        self,
        db: Session,
        comentario_id: int,
        current_user: Usuario,
    ) -> dict:
        comentario = comentario_repo.get_by_id(db, comentario_id)
        if not comentario or comentario.status_moderacao != "PUBLICADO":
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                detail="Comentário não encontrado ou ainda não publicado.",
            )
        upvotes, liked_by_me = comentario_repo.alternar_voto_comentario(
            db, comentario_id, current_user.id
        )
        return {
            "comentario_id": comentario_id,
            "upvotes": upvotes,
            "liked_by_me": liked_by_me,
        }

    def editar_comentario(
        self,
        db: Session,
        comentario_id: int,
        dados: ComentarioUpdate,
        current_user: Usuario,
    ) -> Comentario:

        comentario = comentario_repo.get_by_id(db, comentario_id)
        if not comentario:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Comentário não encontrado.")

        if comentario.usuario_id != current_user.id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="Você só pode editar seus próprios comentários.",
            )

        comentario.conteudo = dados.conteudo
        comentario.status_moderacao = "PENDENTE"
        comentario.motivo_moderacao = None
        comentario.confianca_ia = None
        comentario.moderado_por = None
        return comentario_repo.update(db, comentario)

    def excluir_comentario(self, db: Session, comentario_id: int, current_user: Usuario) -> None:

        comentario = comentario_repo.get_by_id(db, comentario_id)
        if not comentario:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Comentário não encontrado.")

        if comentario.usuario_id != current_user.id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="Você só pode excluir seus próprios comentários.",
            )

        comentario_repo.delete(db, comentario)

    def consultar_status_moderacao(
        self,
        db: Session,
        comentario_id: int,
        current_user: Usuario,
    ) -> Comentario:
        """Retorna o status da triagem de moderação ao próprio autor ou moderadores."""
        comentario = comentario_repo.get_by_id(db, comentario_id)
        if not comentario:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Comentário não encontrado.")

        eh_autor = comentario.usuario_id == current_user.id
        eh_moderador = (current_user.role or "").upper() in {"ADMIN", "MODERATOR"}
        if not (eh_autor or eh_moderador):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="Você só pode consultar o status dos seus próprios comentários.",
            )

        return comentario


comentario_service = ComentarioService()
