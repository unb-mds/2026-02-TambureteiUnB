from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.schemas.disciplina import DisciplinaListaPaginada
from app.core.database import get_db
from app.services.disciplina_service import disciplina_service

router = APIRouter(prefix="/catalogo/cadeiras", tags=["Catálogo"])


@router.get("", response_model=DisciplinaListaPaginada)
def listar_catalogo_cadeiras(
    nome: Optional[str] = Query(None, description="Busca parcial por nome"),
    codigo: Optional[str] = Query(None, description="Busca parcial por código"),
    departamento: Optional[str] = Query(None, description="Busca parcial por departamento"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Catálogo e busca de cadeiras (RF04), com paginação e filtros case-insensitive."""
    return disciplina_service.listar_catalogo(db, nome, codigo, departamento, page, size)