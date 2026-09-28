import math
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas.comentario import ComentarioCreate, ComentarioUpdate
from app.models.comentario import Comentario
from app.models.usuario import Usuario
from app.repositories.comentario_repo import comentario_repo
from app.repositories.disciplina_repo import disciplina_repo
from app.repositories.turma_repo import turma_repo


class ComentarioService:
    def criar_comentario(
        self,
        db: Session,
        dados: ComentarioCreate,
        current_user: Usuario,
    ) -> Comentario:

        if not disciplina_repo.get_by_id(db, dados.disciplina_id):
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada."
            )

        if dados.turma_id is not None:
            if not turma_repo.get_by_id(db, dados.turma_id):
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, detail="Turma não encontrada."
                )

        novo_comentario = Comentario(
            usuario_id=current_user.id,
            disciplina_id=dados.disciplina_id,
            turma_id=dados.turma_id,
            conteudo=dados.conteudo,
            autor_alias=dados.autor_alias,
            topico_dificuldade=dados.topico_dificuldade,
            status_moderacao="PUBLICADO",
        )
        return comentario_repo.create(db, novo_comentario)

    def listar_comentarios(
        self,
        db: Session,
        disciplina_id: int,
        turma_id: Optional[int],
        page: int,
        size: int,
    ) -> dict:

        if not disciplina_repo.get_by_id(db, disciplina_id):
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada."
            )

        if turma_id is not None:
            if not turma_repo.get_by_id(db, turma_id):
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, detail="Turma não encontrada."
                )

        items, total = comentario_repo.listar_por_disciplina_paginado(
            db, disciplina_id, turma_id, page, size
        )

        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": math.ceil(total / size) if total > 0 else 0,
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
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, detail="Comentário não encontrado."
            )

        if comentario.usuario_id != current_user.id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="Você só pode editar seus próprios comentários.",
            )

        comentario.conteudo = dados.conteudo
        return comentario_repo.update(db, comentario)

    def excluir_comentario(
        self, db: Session, comentario_id: int, current_user: Usuario
    ) -> None:

        comentario = comentario_repo.get_by_id(db, comentario_id)
        if not comentario:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, detail="Comentário não encontrado."
            )

        if comentario.usuario_id != current_user.id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="Você só pode excluir seus próprios comentários.",
            )

        comentario_repo.delete(db, comentario)


comentario_service = ComentarioService()
