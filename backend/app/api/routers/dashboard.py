from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas.dashboard import CursoFormacaoResponse
from app.core.database import get_db
from app.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/cursos/{curso_id}/formacao", response_model=CursoFormacaoResponse)
def obter_formacao_curso(curso_id: int, db: Session = Depends(get_db)):
    return dashboard_service.obter_formacao_curso(db, curso_id)
