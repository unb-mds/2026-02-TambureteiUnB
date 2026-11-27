from typing import Optional, List, Set, Tuple
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import case, exists, func, or_
import unicodedata
from app.models.disciplina import Disciplina
from app.models.estatistica_consolidada import EstatisticaConsolidada
from app.models.metrica import MetricaAcademica, MetricaConsolidada
from app.models.turma import Turma
from app.models.curso import CursoDisciplina
from app.repositories.base import BaseRepository

class DisciplinaRepository(BaseRepository[Disciplina]):
    def __init__(self):
        super().__init__(Disciplina)

    def get_by_slug(self, db: Session, slug: str) -> Optional[Disciplina]:
        return (
            db.query(Disciplina)
            .options(
                joinedload(Disciplina.cursos_disciplinas).joinedload(CursoDisciplina.curso),
                joinedload(Disciplina.metricas),
                joinedload(Disciplina.metrica_consolidada),
            )
            .filter(Disciplina.slug == slug)
            .first()
        )

    def get_by_codigo(self, db: Session, codigo: str) -> Optional[Disciplina]:
        return db.query(Disciplina).filter(Disciplina.codigo == codigo).first()

    def get_by_codigos(self, db: Session, codigos: List[str]) -> dict[str, Disciplina]:
        if not codigos:
            return {}
        encontradas = db.query(Disciplina).filter(Disciplina.codigo.in_(codigos)).all()
        return {d.codigo: d for d in encontradas if d.codigo}

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
    def listar_locais_oferta(self, db: Session, disciplina_ids: List[int], semestre: Optional[str] = None) -> dict:
        if not disciplina_ids:
            return {}
        query = db.query(Turma.disciplina_id, Turma.local).filter(
            Turma.disciplina_id.in_(disciplina_ids), Turma.local.isnot(None),
        )
        if semestre:
            query = query.filter(Turma.semestre == semestre)
        locais = {}
        for disciplina_id, local in query.distinct().all():
            if local.strip():
                locais.setdefault(disciplina_id, set()).add(local.strip())
        return {identifier: sorted(values) for identifier, values in locais.items()}

    def listar_ids_com_pizza(
        self, db: Session, disciplina_ids: Optional[List[int]] = None
    ) -> Set[int]:
        if disciplina_ids is not None and not disciplina_ids:
            return set()
        query = db.query(EstatisticaConsolidada.disciplina_id).filter(
            EstatisticaConsolidada.origem == "DOACAO_QUORUM",
            EstatisticaConsolidada.amostragem_suprimida_lgpd.is_(False),
        )
        if disciplina_ids is not None:
            query = query.filter(EstatisticaConsolidada.disciplina_id.in_(disciplina_ids))
        return {row[0] for row in query.distinct().all()}

    def search_paginated(
        self,
        db: Session,
        nome: Optional[str] = None,
        codigo: Optional[str] = None,
        departamento: Optional[str] = None,
        apenas_com_turmas: bool = False,
        semestre: Optional[str] = None,
        skip: int = 0,
        limit: Optional[int] = None,
    ) -> Tuple[List[Disciplina], int]:
        query = db.query(Disciplina).options(
            joinedload(Disciplina.metrica_consolidada),
            selectinload(Disciplina.metricas),
        )
        if apenas_com_turmas:
            query = query.filter(Disciplina.total_turmas > 0)
        if semestre:
            query = query.filter(Disciplina.turmas.any(Turma.semestre == semestre))
        if nome:
            normalized_name = func.translate(
                func.lower(Disciplina.nome),
                "áàâãäéèêëíìîïóòôõöúùûüç", "aaaaaeeeeiiiiooooouuuuc",
            )
            normalized_query = "".join(
                character for character in unicodedata.normalize("NFD", nome.lower())
                if unicodedata.category(character) != "Mn"
            )
            for word in normalized_query.split():
                escaped = word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
                query = query.filter(normalized_name.like(f"%{escaped}%", escape="\\"))
        if codigo:
            query = query.filter(Disciplina.codigo.ilike(f"%{codigo}%"))
        if departamento:
            query = query.filter(Disciplina.departamento.ilike(f"%{departamento}%"))
        total = query.count()

        tem_pizza_expr = exists().where(
            EstatisticaConsolidada.disciplina_id == Disciplina.id,
            EstatisticaConsolidada.origem == "DOACAO_QUORUM",
            EstatisticaConsolidada.amostragem_suprimida_lgpd.is_(False),
        )
        tem_historico_expr = or_(
            exists().where(
                MetricaConsolidada.disciplina_id == Disciplina.id,
                MetricaConsolidada.matriculados > 0,
            ),
            exists().where(MetricaAcademica.disciplina_id == Disciplina.id),
            exists().where(EstatisticaConsolidada.disciplina_id == Disciplina.id),
        )
        prioridade_dados = case(
            (tem_pizza_expr, 0),
            (tem_historico_expr, 1),
            else_=2,
        )

        query = query.order_by(prioridade_dados, Disciplina.nome).offset(skip)
        if limit is not None:
            query = query.limit(limit)
        items = query.all()
        return items, total

disciplina_repo = DisciplinaRepository()
