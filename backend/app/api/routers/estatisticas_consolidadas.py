from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.api.schemas.estatistica_consolidada import EstatisticaConsolidadaResponse
from app.core.database import get_db
from app.services.doacao_service import doacao_service

router = APIRouter(prefix="/estatisticas-consolidadas", tags=["Estatísticas Consolidadas"])


@router.get("", response_model=List[EstatisticaConsolidadaResponse])
def listar_estatisticas_consolidadas(
    turma_id: Optional[int] = Query(None, description="Filtra por turma"),
    disciplina_id: Optional[int] = Query(None, description="Filtra por disciplina"),
    semestre: Optional[str] = Query(None, description="Ex.: 2026.1"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Lista as estatísticas oficiais (opção A: pública, só taxas agregadas)."""
    return doacao_service.listar_consolidadas(db, turma_id, disciplina_id, semestre, page, size)


@router.post("/turmas/{turma_id}/recalcular", response_model=EstatisticaConsolidadaResponse)
def recalcular_estatistica_turma(
    turma_id: int,
    semestre: Optional[str] = Query(None, description="Padrão: semestre da turma"),
    db: Session = Depends(get_db),
    _admin=Depends(require_role("ADMIN")),
):
    """Força o recálculo da estatística oficial. Somente administradores."""
    return doacao_service.recalcular_oficial(db, turma_id, semestre)