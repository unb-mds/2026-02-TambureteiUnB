from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from app.models.turma import Turma
from app.repositories.base import BaseRepository

class TurmaRepository(BaseRepository[Turma]):
    def __init__(self):
        super().__init__(Turma)

    def get_by_disciplina(self, db: Session, disciplina_id: int, semestre: Optional[str] = None) -> List[Turma]:
        query = db.query(Turma).options(joinedload(Turma.professores)).filter(Turma.disciplina_id == disciplina_id)
        if semestre:
            query = query.filter(Turma.semestre == semestre)
        return query.all()

    def get_turma_com_professores(self, db: Session, turma_id: int) -> Optional[Turma]:
        return db.query(Turma).options(joinedload(Turma.professores)).filter(Turma.id == turma_id).first()

    def get_by_semestre(self, db: Session, semestre: str, skip: int = 0, limit: int = 100) -> List[Turma]:
        return db.query(Turma).options(joinedload(Turma.professores)).filter(Turma.semestre == semestre).offset(skip).limit(limit).all()

turma_repo = TurmaRepository()
