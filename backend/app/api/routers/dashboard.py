from typing import Annotated

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.api.schemas.dashboard import CursoFormacaoResponse
from app.core.database import get_db
from app.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/cursos/{identificador}/formacao", response_model=CursoFormacaoResponse)
def obter_formacao_curso(
    identificador: Annotated[str, Path(description="ID numérico ou slug do curso")],
    db: Session = Depends(get_db),
):
    return dashboard_service.obter_formacao_curso(db, identificador)
