from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.api.schemas.dashboard import (
    CursoFormacaoResponse,
    EvasaoCampusComparativoResponse,
    EvasaoCampusDetalheResponse,
)
from app.core.database import get_db
from app.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/cursos/{identificador}/formacao", response_model=CursoFormacaoResponse)
def obter_formacao_curso(
    identificador: Annotated[str, Path(description="ID numérico ou slug do curso")],
    db: Session = Depends(get_db),
):
    return dashboard_service.obter_formacao_curso(db, identificador)


@router.get("/campus/evasao", response_model=EvasaoCampusComparativoResponse)
def listar_evasao_por_campus(
    campus: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return dashboard_service.listar_evasao_por_campus(db, campus)


@router.get("/campus/{campus}/evasao", response_model=EvasaoCampusDetalheResponse)
def obter_evasao_campus(campus: str, db: Session = Depends(get_db)):
    return dashboard_service.obter_evasao_campus(db, campus)
