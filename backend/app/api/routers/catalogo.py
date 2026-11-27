from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.disciplina import DisciplinaListaPaginada
from app.api.schemas.estatistica_consolidada import SerieHistoricaResponse
from app.core.database import get_db
from app.models.usuario import Usuario
from app.services.disciplina_service import disciplina_service
from app.services.estatistica_service import estatistica_service

router = APIRouter(prefix="/catalogo/cadeiras", tags=["Catálogo"])


@router.get("", response_model=DisciplinaListaPaginada)
def listar_catalogo_cadeiras(
    nome: Optional[str] = Query(None, max_length=200, description="Busca parcial por nome"),
    codigo: Optional[str] = Query(None, max_length=50, description="Busca parcial por código"),
    departamento: Optional[str] = Query(None, max_length=200, description="Busca parcial por departamento"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Catálogo e busca de cadeiras (RF04), com paginação e filtros case-insensitive."""
    return disciplina_service.listar_catalogo(db, nome, codigo, departamento, page, size)


@router.get("/{disciplina_id}/estatisticas", response_model=SerieHistoricaResponse)
def obter_serie_historica_estatisticas(
    disciplina_id: int,
    ano_inicio: Optional[int] = Query(None, ge=1900, le=2100, description="Ano inicial (inclui o semestre .1)"),
    ano_fim: Optional[int] = Query(None, ge=1900, le=2100, description="Ano final (inclui até o semestre .4)"),
    db: Session = Depends(get_db),
    _usuario: Usuario = Depends(get_current_user),
):
    """Série histórica das estatísticas consolidadas por semestre (US 3.3.1), em ordem cronológica."""
    return estatistica_service.serie_historica(db, disciplina_id, ano_inicio, ano_fim)