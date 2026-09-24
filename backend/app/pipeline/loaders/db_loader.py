from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.disciplina import Disciplina
from app.models.professor import Professor
from app.models.turma import Turma
from app.models.metrica import MetricaAcademica
from app.pipeline.loaders.base import BaseLoader
from app.pipeline.schemas.sigaa import (
    SIGAADisciplinaClean,
    SIGAADocenteClean,
    SIGAATurmaClean,
)
from app.pipeline.schemas.metricas import MetricaAcademicaClean


class DatabaseLoader(BaseLoader):
    """
    Carregador relacional para persistência dos dados no PostgreSQL 17 via SQLAlchemy.
    
    Gerencia transações e inserções com idempotência (upsert / checagem de existência)
    para as entidades canônicas do banco:
    - disciplinas
    - professores
    - turmas e turmas_professores
    - metricas_academicas
    """

    def __init__(self, db_session: Optional[Session] = None):
        super().__init__(name="DatabaseLoader")
        self._external_session = db_session

    def _get_session(self) -> Session:
        return self._external_session if self._external_session is not None else SessionLocal()

    def load(self, data: Dict[str, Any], **kwargs) -> Dict[str, int]:
        """Persiste todos os dados transformados em uma única transação atômica."""
        stats = {
            "disciplinas_carregadas": 0,
            "professores_carregados": 0,
            "turmas_carregadas": 0,
            "metricas_carregadas": 0,
        }

        db = self._get_session()
        owns_session = self._external_session is None

        try:
            if "disciplinas" in data:
                stats["disciplinas_carregadas"] = self.load_disciplinas(db, data["disciplinas"])

            if "docentes" in data:
                stats["professores_carregados"] = self.load_professores(db, data["docentes"])

            if "turmas" in data:
                stats["turmas_carregadas"] = self.load_turmas(db, data["turmas"])

            if "metricas" in data:
                stats["metricas_carregadas"] = self.load_metricas(db, data["metricas"])

            db.commit()
            self.logger.info(f"Carga no banco concluída com sucesso: {stats}")
        except Exception as e:
            db.rollback()
            self.logger.error(f"Erro durante a carga no banco de dados. Rollback efetuado: {e}")
            raise
        finally:
            if owns_session:
                db.close()

        return stats

    def load_disciplinas(self, db: Session, disciplinas: List[SIGAADisciplinaClean]) -> int:
        """Insere ou atualiza disciplinas canônicas."""
        count = 0
        for item in disciplinas:
            existing = db.query(Disciplina).filter(
                (Disciplina.slug == item.slug) | (Disciplina.codigo == item.codigo)
            ).first()

            if existing:
                existing.nome = item.nome
                if item.departamento:
                    existing.departamento = item.departamento
                if item.creditos:
                    existing.creditos = item.creditos
                if item.carga_horaria:
                    existing.carga_horaria = item.carga_horaria
                if item.ementa:
                    existing.ementa = item.ementa
            else:
                nova = Disciplina(
                    codigo=item.codigo,
                    slug=item.slug,
                    nome=item.nome,
                    departamento=item.departamento,
                    creditos=item.creditos,
                    carga_horaria=item.carga_horaria,
                    ementa=item.ementa,
                )
                db.add(nova)
            count += 1
        db.flush()
        return count

    def load_professores(self, db: Session, docentes: List[SIGAADocenteClean]) -> int:
        """Insere ou atualiza professores."""
        count = 0
        for item in docentes:
            existing = db.query(Professor).filter(Professor.nome == item.nome).first()
            if existing:
                if item.departamento and not existing.departamento:
                    existing.departamento = item.departamento
            else:
                novo = Professor(
                    nome=item.nome,
                    departamento=item.departamento,
                )
                db.add(novo)
            count += 1
        db.flush()
        return count

    def load_turmas(self, db: Session, turmas: List[SIGAATurmaClean]) -> int:
        """Insere ou atualiza turmas e vincula docentes."""
        count = 0
        for item in turmas:
            disciplina = db.query(Disciplina).filter(
                (Disciplina.codigo == item.codigo_disciplina) | (Disciplina.slug == item.slug_disciplina)
            ).first()

            if not disciplina:
                self.logger.warning(
                    f"Disciplina {item.codigo_disciplina} não encontrada. Ignorando turma {item.codigo_turma}."
                )
                continue

            existing_turma = db.query(Turma).filter(
                Turma.disciplina_id == disciplina.id,
                Turma.codigo_turma == item.codigo_turma,
                Turma.semestre == item.semestre,
            ).first()

            if existing_turma:
                turma = existing_turma
                turma.horario = item.horario or turma.horario
                turma.local = item.local or turma.local
            else:
                turma = Turma(
                    disciplina_id=disciplina.id,
                    codigo_turma=item.codigo_turma,
                    semestre=item.semestre,
                    horario=item.horario,
                    local=item.local,
                )
                db.add(turma)
                db.flush()

            # Vincula docentes cadastrados à turma
            for doc_nome in item.docentes:
                prof = db.query(Professor).filter(Professor.nome.ilike(f"%{doc_nome}%")).first()
                if prof and prof not in turma.professores:
                    turma.professores.append(prof)

            count += 1
        db.flush()
        return count

    def load_metricas(self, db: Session, metricas: List[MetricaAcademicaClean]) -> int:
        """Insere ou atualiza métricas históricas agregadas."""
        count = 0
        for item in metricas:
            disciplina = db.query(Disciplina).filter(
                (Disciplina.codigo == item.codigo_disciplina) | (Disciplina.slug == item.slug_disciplina)
            ).first()

            if not disciplina:
                continue

            existing = db.query(MetricaAcademica).filter(
                MetricaAcademica.disciplina_id == disciplina.id,
                MetricaAcademica.ano == item.ano,
                MetricaAcademica.semestre == item.semestre,
            ).first()

            if existing:
                existing.matriculados = item.matriculados
                existing.aprovados = item.aprovados
                existing.reprovados_nota = item.reprovados_nota
                existing.reprovados_falta = item.reprovados_falta
                existing.trancamentos = item.trancamentos
                existing.taxa_aprovacao = item.taxa_aprovacao
            else:
                nova_metrica = MetricaAcademica(
                    disciplina_id=disciplina.id,
                    ano=item.ano,
                    semestre=item.semestre,
                    matriculados=item.matriculados,
                    aprovados=item.aprovados,
                    reprovados_nota=item.reprovados_nota,
                    reprovados_falta=item.reprovados_falta,
                    trancamentos=item.trancamentos,
                    taxa_aprovacao=item.taxa_aprovacao,
                )
                db.add(nova_metrica)
            count += 1
        db.flush()
        return count
