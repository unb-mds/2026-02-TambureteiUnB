from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.professor import Professor
from app.repositories.base import BaseRepository

class ProfessorRepository(BaseRepository[Professor]):
    def __init__(self):
        super().__init__(Professor)

    def get_by_nome(self, db: Session, nome: str) -> Optional[Professor]:
        return db.query(Professor).filter(Professor.nome == nome).first()

    def get_by_departamento(self, db: Session, departamento: str, skip: int = 0, limit: int = 100) -> List[Professor]:
        return db.query(Professor).filter(Professor.departamento == departamento).offset(skip).limit(limit).all()

professor_repo = ProfessorRepository()
