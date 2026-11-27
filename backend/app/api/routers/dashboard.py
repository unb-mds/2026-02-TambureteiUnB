from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy.orm import Session

from app.api.schemas.dashboard import (
    CursoFormacaoResponse,
    DashboardGeralResponse,
    EvasaoCampusComparativoResponse,
    EvasaoCampusDetalheResponse,
)
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.services.dashboard_service import dashboard_service

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(rate_limit("dashboard:read", limit=120, window_seconds=60))],
)


@router.get("/cursos/{identificador}/formacao", response_model=CursoFormacaoResponse)
def obter_formacao_curso(
    identificador: Annotated[str, Path(max_length=200, description="ID numérico ou slug do curso")],
    response: Response,
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "public, max-age=60"
    return dashboard_service.obter_formacao_curso(db, identificador)


@router.get("/campus/evasao", response_model=EvasaoCampusComparativoResponse)
def listar_evasao_por_campus(
    response: Response,
    campus: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "public, max-age=60"
    return dashboard_service.listar_evasao_por_campus(db, campus)


@router.get("/campus/{campus}/evasao", response_model=EvasaoCampusDetalheResponse)
def obter_evasao_campus(campus: Annotated[str, Path(max_length=100)], response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=60"
    return dashboard_service.obter_evasao_campus(db, campus)


@router.get("/geral", response_model=DashboardGeralResponse)
def obter_dashboard_geral(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=60"
    return dashboard_service.obter_visao_geral(db)
