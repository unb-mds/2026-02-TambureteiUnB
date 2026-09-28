from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, selectinload
from app.models.professor import Professor
from app.models.turma import Turma
from app.repositories.base import BaseRepository

class ProfessorRepository(BaseRepository[Professor]):
    def __init__(self):
        super().__init__(Professor)

    def get_by_nome(self, db: Session, nome: str) -> Optional[Professor]:
        return db.query(Professor).filter(Professor.nome == nome).first()

    def get_by_departamento(self, db: Session, departamento: str, skip: int = 0, limit: int = 100) -> List[Professor]:
        return db.query(Professor).filter(Professor.departamento == departamento).offset(skip).limit(limit).all()

    def get_by_ids(self, db: Session, ids: List[int]) -> List[Professor]:
        return db.query(Professor).filter(Professor.id.in_(ids)).all()

    def search_paginated(
        self, db: Session, nome: Optional[str] = None, skip: int = 0, limit: int = 20
    ) -> Tuple[List[Professor], int]:
        query = db.query(Professor)
        if nome:
            query = query.filter(Professor.nome.ilike(f"%{nome}%"))
        total = query.count()
        items = query.order_by(Professor.nome).offset(skip).limit(limit).all()
        return items, total

    def get_with_turmas(self, db: Session, professor_id: int) -> Optional[Professor]:
        return (
            db.query(Professor)
            .options(selectinload(Professor.turmas).joinedload(Turma.disciplina))
            .filter(Professor.id == professor_id)
            .first()
        )

professor_repo = ProfessorRepository()
