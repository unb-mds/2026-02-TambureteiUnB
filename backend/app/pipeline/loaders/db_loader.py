from typing import Any, Dict, List, Optional, Set
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.disciplina import Disciplina
from app.models.professor import Professor
from app.models.turma import Turma
from app.models.metrica import MetricaAcademica, MetricaConsolidada
from app.pipeline.loaders.base import BaseLoader
from app.pipeline.schemas.sigaa import (
    SIGAADisciplinaClean,
    SIGAADocenteClean,
    SIGAATurmaClean,
)
from app.pipeline.schemas.metricas import MetricaAcademicaClean


class DatabaseLoader(BaseLoader):
    """
    Carregador relacional otimizado para persistência dos dados no PostgreSQL 17.
    
    Características:
    - Prevenção do problema N+1 através de pré-carregamento em memória (batch hashing).
    - Resolução determinística e inequívoca de disciplinas por código acadêmico canônico.
    - Vinculação exata de docentes por correspondência normalizada (sem falsos positivos de wildcard).
    - Persistência explícita do indicador de supressão LGPD (RN07).
    - Idempotência transacional (upsert com flush periódico e commit atômico).
    """

    def __init__(self, db_session: Optional[Session] = None):
        super().__init__(name="DatabaseLoader")
        self._external_session = db_session

    @staticmethod
    def ensure_schema_up_to_date():
        """Aplica migrações pendentes do Alembic até a revisão head."""
        try:
            import os
            from alembic.config import Config
            from alembic import command
            
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            alembic_ini = os.path.join(base_dir, "alembic.ini")
            if os.path.exists(alembic_ini):
                cfg = Config(alembic_ini)
                command.upgrade(cfg, "head")
        except Exception:
            # Em ambiente sem banco configurado ou teste unitário isolado, não interrompe execução
            pass

    def _get_session(self) -> Session:
        return self._external_session if self._external_session is not None else SessionLocal()

    def load(self, data: Dict[str, Any], **kwargs) -> Dict[str, int]:
        """Persiste todos os dados transformados em uma única transação atômica."""
        stats = {
            "disciplinas_carregadas": 0,
            "professores_carregados": 0,
            "turmas_carregadas": 0,
            "metricas_carregadas": 0,
            "metricas_consolidadas_carregadas": 0,
        }

        db = self._get_session()
        owns_session = self._external_session is None

        try:
            if owns_session:
                self.ensure_schema_up_to_date()

            if "disciplinas" in data:
                stats["disciplinas_carregadas"] = self.load_disciplinas(db, data["disciplinas"])

            if "docentes" in data:
                stats["professores_carregados"] = self.load_professores(db, data["docentes"])

            if "turmas" in data:
                stats["turmas_carregadas"] = self.load_turmas(db, data["turmas"])

            if "metricas" in data:
                stats["metricas_carregadas"] = self.load_metricas(
                    db,
                    data["metricas"],
                    metricas_suprimidas=data.get("metricas_suprimidas"),
                )

            if "metricas_consolidadas" in data:
                stats["metricas_consolidadas_carregadas"] = self.load_metricas_consolidadas(db, data["metricas_consolidadas"])

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
        """
        Insere ou atualiza disciplinas canônicas evitando consultas N+1.
        Resolução determinística: prioriza código canônico; fallback em slug.
        """
        if not disciplinas:
            return 0

        # Pré-carregamento em batch para eliminar N+1
        existing_by_codigo: Dict[str, Disciplina] = {
            d.codigo.upper(): d for d in db.query(Disciplina).filter(Disciplina.codigo.isnot(None)).all()
        }
        existing_by_slug: Dict[str, Disciplina] = {
            d.slug: d for d in db.query(Disciplina).all()
        }

        count = 0
        for item in disciplinas:
            codigo_key = item.codigo.strip().upper() if item.codigo else ""
            existing: Optional[Disciplina] = None

            # Resolução inequívoca por código; fallback por slug APENAS quando não houver código
            if codigo_key and codigo_key in existing_by_codigo:
                existing = existing_by_codigo[codigo_key]
            elif not codigo_key and item.slug in existing_by_slug:
                existing = existing_by_slug[item.slug]

            if existing:
                existing.nome = item.nome
                if item.departamento:
                    existing.departamento = item.departamento
                if item.creditos is not None:
                    existing.creditos = item.creditos
                if item.carga_horaria is not None:
                    existing.carga_horaria = item.carga_horaria
                if item.ementa:
                    existing.ementa = item.ementa
            else:
                slug_to_use = item.slug
                if slug_to_use in existing_by_slug:
                    slug_to_use = f"{item.slug}-{codigo_key.lower()}" if codigo_key else f"{item.slug}-1"

                nova = Disciplina(
                    codigo=codigo_key or None,
                    slug=slug_to_use,
                    nome=item.nome,
                    departamento=item.departamento,
                    creditos=item.creditos,
                    carga_horaria=item.carga_horaria,
                    ementa=item.ementa,
                )
                db.add(nova)
                db.flush()
                if codigo_key:
                    existing_by_codigo[codigo_key] = nova
                existing_by_slug[slug_to_use] = nova

            count += 1

        db.flush()
        return count

    def load_professores(self, db: Session, docentes: List[SIGAADocenteClean]) -> int:
        """
        Insere ou atualiza professores utilizando comparação de nome normalizado exato.
        Elimina consultas N+1 via hashmap pré-carregado.
        """
        if not docentes:
            return 0

        # Pré-carregamento de todos os professores em memória
        existing_by_nome: Dict[str, Professor] = {
            p.nome.strip().lower(): p for p in db.query(Professor).all()
        }

        count = 0
        for item in docentes:
            nome_key = item.nome.strip().lower()
            existing = existing_by_nome.get(nome_key)

            if existing:
                if item.departamento and not existing.departamento:
                    existing.departamento = item.departamento
            else:
                novo = Professor(
                    nome=item.nome.strip(),
                    departamento=item.departamento,
                )
                db.add(novo)
                db.flush()
                existing_by_nome[nome_key] = novo

            count += 1

        db.flush()
        return count

    def load_turmas(self, db: Session, turmas: List[SIGAATurmaClean]) -> int:
        """
        Insere ou atualiza turmas e associa docentes de forma estrita e sem consultas N+1.
        """
        if not turmas:
            return 0

        # 1. Pré-carregamento de disciplinas por código canônico (e fallback por slug)
        disciplinas_by_code: Dict[str, Disciplina] = {
            d.codigo.upper(): d for d in db.query(Disciplina).filter(Disciplina.codigo.isnot(None)).all()
        }
        disciplinas_by_slug: Dict[str, Disciplina] = {
            d.slug: d for d in db.query(Disciplina).all()
        }

        # 2. Pré-carregamento de professores por nome exato normalizado
        professores_by_nome: Dict[str, Professor] = {
            p.nome.strip().lower(): p for p in db.query(Professor).all()
        }

        # 3. Pré-carregamento de turmas existentes para os semestres do payload
        semestres_payload = list({t.semestre for t in turmas})
        existing_turmas_map: Dict[tuple, Turma] = {
            (t.disciplina_id, t.codigo_turma, t.semestre): t
            for t in db.query(Turma).filter(Turma.semestre.in_(semestres_payload)).all()
        }

        count = 0
        for item in turmas:
            cod_key = item.codigo_disciplina.strip().upper()
            disciplina: Optional[Disciplina] = None

            # Resolução determinística: prioriza código canônico
            if cod_key and cod_key in disciplinas_by_code:
                disciplina = disciplinas_by_code[cod_key]
            elif not cod_key and item.slug_disciplina in disciplinas_by_slug:
                disciplina = disciplinas_by_slug[item.slug_disciplina]

            if not disciplina:
                self.logger.warning(
                    f"Disciplina '{item.codigo_disciplina}' não localizada no banco. "
                    f"Ignorando turma '{item.codigo_turma}' ({item.semestre})."
                )
                continue

            turma_key = (disciplina.id, item.codigo_turma, item.semestre)
            turma = existing_turmas_map.get(turma_key)

            if turma:
                turma.horario = item.horario or turma.horario
                turma.local = item.local or turma.local
                if item.capacidade is not None:
                    turma.capacidade = item.capacidade
                if item.amostragem_suprimida_lgpd:
                    turma.matriculados = None
                elif item.matriculados is not None:
                    turma.matriculados = item.matriculados
            else:
                turma = Turma(
                    disciplina_id=disciplina.id,
                    codigo_turma=item.codigo_turma,
                    semestre=item.semestre,
                    horario=item.horario,
                    local=item.local,
                    capacidade=item.capacidade,
                    matriculados=None if item.amostragem_suprimida_lgpd else item.matriculados,
                )
                db.add(turma)
                db.flush()
                existing_turmas_map[turma_key] = turma

            # Vinculação estrita de docentes (correspondência exata de nome, sem falsos positivos)
            current_profs_ids: Set[int] = {p.id for p in turma.professores}
            for doc_nome in item.docentes:
                doc_key = doc_nome.strip().lower()
                prof = professores_by_nome.get(doc_key)
                if prof and prof.id not in current_profs_ids:
                    turma.professores.append(prof)
                    current_profs_ids.add(prof.id)

            count += 1

        db.flush()
        return count

    def load_metricas(
        self,
        db: Session,
        metricas: List[MetricaAcademicaClean],
        metricas_suprimidas: Optional[List[MetricaAcademicaClean]] = None,
    ) -> int:
        """
        Insere ou atualiza métricas históricas agregadas com persistência do indicador LGPD.
        Elimina consultas N+1 via batch hashing.
        Reconciliação LGPD (RN07): Remove do banco métricas que se tornaram suprimidas.
        """
        if not metricas and not metricas_suprimidas:
            return 0

        disciplinas_by_code: Dict[str, Disciplina] = {
            d.codigo.upper(): d for d in db.query(Disciplina).filter(Disciplina.codigo.isnot(None)).all()
        }
        disciplinas_by_slug: Dict[str, Disciplina] = {
            d.slug: d for d in db.query(Disciplina).all()
        }

        # Pré-carrega métricas existentes em um mapa (disciplina_id, ano, semestre)
        existing_metricas_map: Dict[tuple, MetricaAcademica] = {
            (m.disciplina_id, m.ano, m.semestre): m
            for m in db.query(MetricaAcademica).all()
        }

        # 1. Reconciliação LGPD RN07: Remove registros previamente persistidos que agora possuem baixa amostragem
        if metricas_suprimidas:
            for m_sup in metricas_suprimidas:
                cod_key = m_sup.codigo_disciplina.strip().upper()
                disciplina_sup: Optional[Disciplina] = None

                if cod_key and cod_key in disciplinas_by_code:
                    disciplina_sup = disciplinas_by_code[cod_key]
                elif not cod_key and m_sup.slug_disciplina in disciplinas_by_slug:
                    disciplina_sup = disciplinas_by_slug[m_sup.slug_disciplina]

                if not disciplina_sup:
                    continue

                metrica_key_sup = (disciplina_sup.id, m_sup.ano, m_sup.semestre)
                existing_sup = existing_metricas_map.get(metrica_key_sup)
                if existing_sup:
                    db.delete(existing_sup)
                    del existing_metricas_map[metrica_key_sup]
                    self.logger.warning(
                        f"LGPD RN07: Registro previamente persistido da disciplina '{cod_key}' "
                        f"({m_sup.ano}/{m_sup.semestre}) foi suprimido e excluído de metricas_academicas."
                    )

        count = 0
        for item in metricas:
            cod_key = item.codigo_disciplina.strip().upper()
            disciplina: Optional[Disciplina] = None

            if cod_key and cod_key in disciplinas_by_code:
                disciplina = disciplinas_by_code[cod_key]
            elif not cod_key and item.slug_disciplina in disciplinas_by_slug:
                disciplina = disciplinas_by_slug[item.slug_disciplina]

            if not disciplina:
                continue

            metrica_key = (disciplina.id, item.ano, item.semestre)
            existing = existing_metricas_map.get(metrica_key)

            if existing:
                existing.matriculados = item.matriculados
                existing.aprovados = item.aprovados
                existing.reprovados_nota = item.reprovados_nota
                existing.reprovados_falta = item.reprovados_falta
                existing.trancamentos = item.trancamentos
                existing.taxa_aprovacao = item.taxa_aprovacao
                existing.amostragem_suprimida_lgpd = item.amostragem_suprimida_lgpd
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
                    amostragem_suprimida_lgpd=item.amostragem_suprimida_lgpd,
                )
                db.add(nova_metrica)
                db.flush()
                existing_metricas_map[metrica_key] = nova_metrica

            count += 1

        db.flush()
        return count

    def load_metricas_consolidadas(self, db: Session, consolidadas: List[Dict[str, Any]]) -> int:
        """
        Insere ou atualiza métricas consolidadas agregadas da disciplina (RN07 - LGPD).
        Garante a integridade do acumulado geral da matéria incluindo turmas suprimidas.
        """
        if not consolidadas:
            return 0

        disciplinas_by_code: Dict[str, Disciplina] = {
            d.codigo.upper(): d for d in db.query(Disciplina).filter(Disciplina.codigo.isnot(None)).all()
        }
        disciplinas_by_slug: Dict[str, Disciplina] = {
            d.slug: d for d in db.query(Disciplina).all()
        }

        existing_map: Dict[int, MetricaConsolidada] = {
            mc.disciplina_id: mc for mc in db.query(MetricaConsolidada).all()
        }

        count = 0
        for item in consolidadas:
            cod_key = str(item.get("codigo_disciplina", "")).strip().upper()
            slug_key = str(item.get("slug_disciplina", "")).strip()

            disciplina: Optional[Disciplina] = None
            if cod_key and cod_key in disciplinas_by_code:
                disciplina = disciplinas_by_code[cod_key]
            elif not cod_key and slug_key in disciplinas_by_slug:
                disciplina = disciplinas_by_slug[slug_key]

            if not disciplina:
                continue

            existing = existing_map.get(disciplina.id)
            if existing:
                existing.matriculados = item.get("matriculados", 0)
                existing.aprovados = item.get("aprovados", 0)
                existing.reprovados_nota = item.get("reprovados_nota", 0)
                existing.reprovados_falta = item.get("reprovados_falta", 0)
                existing.trancamentos = item.get("trancamentos", 0)
                existing.taxa_aprovacao_acumulada = item.get("taxa_aprovacao_acumulada")
                existing.total_turmas_suprimidas = item.get("total_turmas_suprimidas", 0)
            else:
                nova = MetricaConsolidada(
                    disciplina_id=disciplina.id,
                    matriculados=item.get("matriculados", 0),
                    aprovados=item.get("aprovados", 0),
                    reprovados_nota=item.get("reprovados_nota", 0),
                    reprovados_falta=item.get("reprovados_falta", 0),
                    trancamentos=item.get("trancamentos", 0),
                    taxa_aprovacao_acumulada=item.get("taxa_aprovacao_acumulada"),
                    total_turmas_suprimidas=item.get("total_turmas_suprimidas", 0),
                )
                db.add(nova)
                db.flush()
                existing_map[disciplina.id] = nova

            count += 1

        db.flush()
        return count
