from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas.doacao import DoacaoCreate
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
        return doacao_repo.create(db, nova_doacao)


doacao_service = DoacaoService()
