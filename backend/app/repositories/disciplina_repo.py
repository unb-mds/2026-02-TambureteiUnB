from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, joinedload, selectinload
from app.models.disciplina import Disciplina
from app.models.curso import CursoDisciplina
from app.repositories.base import BaseRepository

class DisciplinaRepository(BaseRepository[Disciplina]):
    def __init__(self):
        super().__init__(Disciplina)

    def get_by_slug(self, db: Session, slug: str) -> Optional[Disciplina]:
        return (
            db.query(Disciplina)
            .options(selectinload(Disciplina.cursos_disciplinas).selectinload(CursoDisciplina.curso))
            .filter(Disciplina.slug == slug).first()
        )

    def get_by_codigos(self, db: Session, codigos: list[str]) -> list[Disciplina]:
        if not codigos:
            return []
        return db.query(Disciplina).filter(Disciplina.codigo.in_(codigos)).all()

    def get_by_codigo(self, db: Session, codigo: str) -> Optional[Disciplina]:
        return db.query(Disciplina).filter(Disciplina.codigo == codigo).first()

    def get_with_details(self, db: Session, slug: str) -> Optional[Disciplina]:
        """Recupera a disciplina com seus relacionamentos de métricas, conteúdos e comentários."""
        return (
            db.query(Disciplina)
            .options(
                joinedload(Disciplina.metricas),
                joinedload(Disciplina.conteudos),
                joinedload(Disciplina.comentarios)
            )
            .filter(Disciplina.slug == slug)
            .first()
        )

    def search_by_name(self, db: Session, query: str, limit: int = 20) -> List[Disciplina]:
        return (
            db.query(Disciplina)
            .filter(Disciplina.nome.ilike(f"%{query}%"))
            .limit(limit)
            .all()
        )
    def search_paginated(
        self,
        db: Session,
        nome: Optional[str] = None,
        codigo: Optional[str] = None,
        departamento: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Disciplina], int]:
        query = db.query(Disciplina)
        if nome:
            query = query.filter(Disciplina.nome.ilike(f"%{nome}%"))
        if codigo:
            query = query.filter(Disciplina.codigo.ilike(f"%{codigo}%"))
        if departamento:
            query = query.filter(Disciplina.departamento.ilike(f"%{departamento}%"))
        total = query.count()
        items = query.order_by(Disciplina.nome).offset(skip).limit(limit).all()
        return items, total

disciplina_repo = DisciplinaRepository()
