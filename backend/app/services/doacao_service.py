from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas.doacao import DoacaoCreate
from app.api.schemas.quorum import GrupoQuorum, QuorumProgressoResponse
from app.core.config import settings
from app.models.doacao import DoacaoEstatistica
from app.repositories.doacao_repo import doacao_repo
from app.repositories.turma_repo import turma_repo


class DoacaoService:
    def criar_doacao(
        self,
        db: Session,
        turma_id: int,
        usuario_id: UUID,
        dados: DoacaoCreate,
    ) -> DoacaoEstatistica:
        # 1. Verifica se a turma referenciada existe no banco
        turma = turma_repo.get_by_id(db, turma_id)
        if not turma:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                detail="Turma não encontrada.",
            )

        # 2. Impede doação duplicada do mesmo usuário para a mesma turma e semestre
        if doacao_repo.get_duplicada(db, usuario_id, turma_id, dados.semestre_referencia):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="Você já realizou uma doação de estatísticas para esta turma neste semestre.",
            )

        # 3. Instanciação e persistência
        nova_doacao = DoacaoEstatistica(
            turma_id=turma_id,
            usuario_id=usuario_id,
            semestre_referencia=dados.semestre_referencia,
            taxa_aprovacao=dados.taxa_aprovacao,
            taxa_reprovacao_nota=dados.taxa_reprovacao_nota,
            taxa_reprovacao_falta=dados.taxa_reprovacao_falta,
            taxa_trancamento=dados.taxa_trancamento,
            status="PENDENTE",
        )
        nova_doacao = doacao_repo.create(db, nova_doacao)

        # 4. Dispara o motor de consenso a cada nova doação (US 3.2.1)
        self.avaliar_consenso(db, turma_id, dados.semestre_referencia)
        db.refresh(nova_doacao)
        return nova_doacao

    @staticmethod
    def _escolher_vencedor(grupos: list, quorum: int):
        """
        Regra do consenso: só concorrem grupos com quantidade >= quórum.
        Vence o de maior quantidade; empate no topo não consolida ninguém.
        """
        elegiveis = sorted(
            (g for g in grupos if g.quantidade >= quorum),
            key=lambda g: g.quantidade,
            reverse=True,
        )
        if not elegiveis:
            return None
        if len(elegiveis) > 1 and elegiveis[0].quantidade == elegiveis[1].quantidade:
            return None
        return elegiveis[0]

    def avaliar_consenso(self, db: Session, turma_id: int, semestre_referencia: str) -> None:
        """Recalcula o status das doações da turma/semestre (idempotente)."""
        grupos = doacao_repo.agrupar_por_valores(db, turma_id, semestre_referencia)
        vencedor = self._escolher_vencedor(grupos, settings.QUORUM_MINIMO_DOACOES)
        doacao_repo.definir_consolidadas(db, turma_id, semestre_referencia, vencedor)

    def consultar_quorum(
        self,
        db: Session,
        turma_id: int,
        semestre_referencia: Optional[str] = None,
    ) -> QuorumProgressoResponse:
        turma = turma_repo.get_by_id(db, turma_id)
        if not turma:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")

        semestre = semestre_referencia or turma.semestre
        quorum = settings.QUORUM_MINIMO_DOACOES
        grupos = doacao_repo.agrupar_por_valores(db, turma_id, semestre)
        vencedor = self._escolher_vencedor(grupos, quorum)

        grupos_resp: List[GrupoQuorum] = [
            GrupoQuorum(
                taxa_aprovacao=float(g.taxa_aprovacao),
                taxa_reprovacao_nota=float(g.taxa_reprovacao_nota),
                taxa_reprovacao_falta=float(g.taxa_reprovacao_falta),
                taxa_trancamento=float(g.taxa_trancamento),
                quantidade=g.quantidade,
                atingiu_quorum=g.quantidade >= quorum,
                consolidado=g is vencedor,
            )
            for g in grupos
        ]
        return QuorumProgressoResponse(
            turma_id=turma_id,
            semestre_referencia=semestre,
            quorum_minimo=quorum,
            consolidado=vencedor is not None,
            grupos=grupos_resp,
        )


doacao_service = DoacaoService()