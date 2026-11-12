from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas.doacao import DoacaoCreate
from app.api.schemas.quorum import GrupoQuorum, QuorumProgressoResponse
from app.core.config import settings
from app.domain.quorum import escolher_vencedor
from app.domain.semestre import semestre_valido
from app.models.doacao import DoacaoEstatistica
from app.repositories.doacao_repo import doacao_repo
from app.repositories.turma_repo import turma_repo

MSG_SEMESTRE_INVALIDO = "O semestre deve seguir o padrão canônico da UnB (exemplo: 2026.1 ou 2026.2)."


class DoacaoService:
    # Mantém compatibilidade com os testes unitários existentes.
    _escolher_vencedor = staticmethod(escolher_vencedor)

    def criar_doacao(
        self,
        db: Session,
        turma_id: int,
        usuario_id: UUID,
        dados: DoacaoCreate,
    ) -> DoacaoEstatistica:
        # 1. Turma precisa existir
        turma = turma_repo.get_by_id(db, turma_id)
        if not turma:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")

        # 2. Semestre da doação deve ser o da turma (consistência com o quórum)
        if dados.semestre_referencia != turma.semestre:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"O semestre da doação deve ser o mesmo da turma ({turma.semestre}).",
            )

        # 3. Impede doação duplicada do mesmo usuário para a mesma turma e semestre
        if doacao_repo.get_duplicada(db, usuario_id, turma_id, dados.semestre_referencia):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="Você já realizou uma doação de estatísticas para esta turma neste semestre.",
            )

        # 4. Persistência e consenso na mesma transação (um único commit)
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
        doacao_repo.adicionar(db, nova_doacao)
        self.avaliar_consenso(db, turma_id, dados.semestre_referencia)
        db.commit()
        db.refresh(nova_doacao)
        return nova_doacao

    def avaliar_consenso(self, db: Session, turma_id: int, semestre_referencia: str) -> None:
        """Recalcula o status das doações (idempotente). O commit é de quem chama."""
        grupos = doacao_repo.agrupar_por_valores(db, turma_id, semestre_referencia)
        vencedor = escolher_vencedor(grupos, settings.QUORUM_MINIMO_DOACOES)
        doacao_repo.definir_consolidadas(db, turma_id, semestre_referencia, vencedor)

    def consultar_quorum(
        self,
        db: Session,
        turma_id: int,
        semestre_referencia: Optional[str] = None,
    ) -> QuorumProgressoResponse:
        if semestre_referencia is not None and not semestre_valido(semestre_referencia):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=MSG_SEMESTRE_INVALIDO)

        turma = turma_repo.get_by_id(db, turma_id)
        if not turma:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")

        semestre = semestre_referencia or turma.semestre
        quorum = settings.QUORUM_MINIMO_DOACOES
        grupos = doacao_repo.agrupar_por_valores(db, turma_id, semestre)

        # "consolidado" reflete o estado persistido, não um recálculo em memória.
        grupos_resp: List[GrupoQuorum] = [
            GrupoQuorum(
                taxa_aprovacao=float(g.taxa_aprovacao),
                taxa_reprovacao_nota=float(g.taxa_reprovacao_nota),
                taxa_reprovacao_falta=float(g.taxa_reprovacao_falta),
                taxa_trancamento=float(g.taxa_trancamento),
                quantidade=g.quantidade,
                atingiu_quorum=g.quantidade >= quorum,
                consolidado=g.consolidadas > 0,
            )
            for g in grupos
        ]
        return QuorumProgressoResponse(
            turma_id=turma_id,
            semestre_referencia=semestre,
            quorum_minimo=quorum,
            consolidado=any(g.consolidado for g in grupos_resp),
            grupos=grupos_resp,
        )


doacao_service = DoacaoService()