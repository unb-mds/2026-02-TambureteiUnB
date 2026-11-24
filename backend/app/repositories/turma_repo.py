from typing import Optional, List
from sqlalchemy.orm import Session, selectinload
from app.models.turma import Turma
from app.repositories.base import BaseRepository

class TurmaRepository(BaseRepository[Turma]):
    def __init__(self):
        super().__init__(Turma)

    def listar_semestres(self, db: Session) -> List[str]:
        return [row[0] for row in db.query(Turma.semestre).distinct().order_by(Turma.semestre.desc()).all()]

    def get_by_disciplina(self, db: Session, disciplina_id: int, semestre: Optional[str] = None) -> List[Turma]:
        query = db.query(Turma).options(selectinload(Turma.professores), selectinload(Turma.estatistica)).filter(Turma.disciplina_id == disciplina_id)
        if semestre:
            query = query.filter(Turma.semestre == semestre)
        return query.order_by(Turma.semestre.desc(), Turma.codigo_turma.asc()).all()

    def get_turma_com_professores(self, db: Session, turma_id: int) -> Optional[Turma]:
        return db.query(Turma).options(selectinload(Turma.professores), selectinload(Turma.estatistica)).filter(Turma.id == turma_id).first()

    def get_by_semestre(self, db: Session, semestre: str, skip: int = 0, limit: int = 100) -> List[Turma]:
        return db.query(Turma).options(selectinload(Turma.professores)).filter(Turma.semestre == semestre).offset(skip).limit(limit).all()

    def get_duplicada(self, db: Session, disciplina_id: int, codigo_turma: str, semestre: str) -> Optional[Turma]:
        return (
            db.query(Turma)
            .filter(
                Turma.disciplina_id == disciplina_id,
                Turma.codigo_turma == codigo_turma,
                Turma.semestre == semestre,
            )
            .first()
        )
        

turma_repo = TurmaRepository()