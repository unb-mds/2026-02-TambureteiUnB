from typing import Optional, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.situacao import SituacaoDisciplina
from app.repositories.base import BaseRepository

class SituacaoRepository(BaseRepository[SituacaoDisciplina]):
    def __init__(self):
        super().__init__(SituacaoDisciplina)

    def get_by_usuario_e_disciplina(
        self, db: Session, usuario_id: UUID, disciplina_id: int
    ) -> Optional[SituacaoDisciplina]:
        return (
            db.query(SituacaoDisciplina)
            .filter(
                SituacaoDisciplina.usuario_id == usuario_id,
                SituacaoDisciplina.disciplina_id == disciplina_id
            )
            .first()
        )

    def registrar_ou_atualizar(
        self, db: Session, usuario_id: UUID, disciplina_id: int, situacao: str
    ) -> SituacaoDisciplina:
        """Garante a regra [RN02]: apenas um status ativo por aluno/disciplina."""
        registro = self.get_by_usuario_e_disciplina(db, usuario_id, disciplina_id)
        if registro:
            registro.situacao = situacao
            db.commit()
            db.refresh(registro)
            return registro
        else:
            novo = SituacaoDisciplina(
                usuario_id=usuario_id,
                disciplina_id=disciplina_id,
                situacao=situacao
            )
            db.add(novo)
            db.commit()
            db.refresh(novo)
            return novo

    def get_estatisticas_disciplina(self, db: Session, disciplina_id: int) -> Dict[str, int]:
        """Calcula a soma agregada anônima de situações registradas pelos alunos."""
        resultados = (
            db.query(SituacaoDisciplina.situacao, func.count(SituacaoDisciplina.id))
            .filter(SituacaoDisciplina.disciplina_id == disciplina_id)
            .group_by(SituacaoDisciplina.situacao)
            .all()
        )
        stats = {
            "APROVADO": 0,
            "REPROVADO_NOTA": 0,
            "REPROVADO_FALTA": 0,
            "TRANCOU": 0
        }
        for situacao, count in resultados:
            stats[situacao] = count
        return stats

situacao_repo = SituacaoRepository()
