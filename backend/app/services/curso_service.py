from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.curso import Curso
from app.repositories.curso_repo import curso_repo


class CursoService:
    def listar(self, db: Session, q: str | None = None, campus: str | None = None) -> list[Curso]:
        return curso_repo.listar(db, q=q, campus=campus)

    def obter_por_slug(self, db: Session, slug: str) -> Curso:
        curso = curso_repo.get_by_slug(db, slug)
        if curso is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Curso não encontrado.")
        return curso

    def obter_grade(self, db: Session, curso_id: int) -> dict:
        curso = curso_repo.get_com_grade_by_id(db, curso_id)
        if curso is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Curso não encontrado.")

        periodos_map: dict[int | None, list[dict]] = {}
        for disc in curso.disciplinas:
            periodo = disc["periodo_sugerido"]
            periodos_map.setdefault(periodo, []).append(disc)

        periodos_ordenados = [
            {"periodo": periodo, "disciplinas": lista_disc}
            for periodo, lista_disc in periodos_map.items()
        ]

        return {
            "curso_id": curso.id,
            "curso_nome": curso.nome,
            "curso_slug": curso.slug,
            "periodos": periodos_ordenados,
        }


curso_service = CursoService()
