from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_current_user
from app.api.schemas.disciplina import DisciplinaResponse, DisciplinaResumo
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models.usuario import Usuario
from app.services.disciplina_service import disciplina_service
from app.api.schemas.comentario import (
    ComentarioCadeiraCreate,
    ComentarioListaPaginada,
    ComentarioResponse,
)
from app.services.comentario_service import comentario_service

router = APIRouter(prefix="/cadeiras", tags=["Cadeiras (Disciplinas)"])


@router.get(
    "",
    response_model=List[DisciplinaResumo],
    dependencies=[Depends(rate_limit("cadeiras:list", limit=90, window_seconds=60))],
)
def listar_disciplinas(
    response: Response,
    q: Optional[str] = Query(None, max_length=200, description="Busca por nome da disciplina"),
    codigo: Optional[str] = Query(None, max_length=50, description="Busca por código da disciplina"),
    departamento: Optional[str] = Query(None, max_length=200, description="Filtro por departamento"),
    apenas_com_turmas: bool = Query(False, description="Filtra apenas disciplinas com turmas"),
    semestre: Optional[str] = Query(None, pattern=r"^\d{4}\.[1-4]$", description="Semestre das turmas ofertadas"),
    limit: Optional[int] = Query(None, ge=1, le=10000, description="Limite de itens a retornar (máximo: 10000)"),
    db: Session = Depends(get_db),
):
    """
    Catálogo e Busca de Cadeiras (RF04).
    Permite busca por nome/código e filtro por departamento.
    """
    response.headers["Cache-Control"] = "public, max-age=60"
    return disciplina_service.listar(
        db,
        nome=q,
        codigo=codigo,
        departamento=departamento,
        apenas_com_turmas=apenas_com_turmas,
        semestre=semestre,
        limit=limit,
    )


@router.get(
    "/{slug}",
    response_model=DisciplinaResponse,
    dependencies=[Depends(rate_limit("cadeiras:detail", limit=240, window_seconds=60))],
)
def obter_disciplina(slug: str, db: Session = Depends(get_db)):
    """
    Página individual da Cadeira (Hub Colaborativo - RF07/RF08).
    Retorna dados da disciplina, ementa, pré-requisitos, equivalências
    e lista de itens resolvidos com seus respectivos slugs para navegação direta.
    """
    return disciplina_service.obter_por_slug(db, slug)

@router.get(
    "/{disciplina_id}/comentarios",
    response_model=ComentarioListaPaginada,
)
def listar_comentarios_cadeira(
    disciplina_id: str,
    turma_id: Optional[int] = Query(None, description="Filtrar por turma específica"),
    topico: Optional[str] = Query(None, max_length=200, description="Filtrar por tópico de dificuldade"),
    apenas_dificuldades: bool = Query(
        False, description="Filtrar apenas relatos com tópico de dificuldade"
    ),
    excluir_dificuldades: bool = Query(
        False, description="Ocultar relatos vinculados a tópicos de dificuldade"
    ),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
):
    """Lista comentários e alertas de dificuldade ativos de uma cadeira, com paginação e filtros."""
    return comentario_service.listar_comentarios(
        db,
        disciplina_id,
        turma_id,
        page,
        size,
        topico=topico,
        apenas_dificuldades=apenas_dificuldades,
        excluir_dificuldades=excluir_dificuldades,
        current_user_id=current_user.id if current_user else None,
    )


@router.post(
    "/{disciplina_id}/comentarios",
    response_model=ComentarioResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            rate_limit(
                "comentarios:create",
                limit=15,
                window_seconds=60,
                by_user=True,
                ip_ceiling=60,
                message="Você enviou muitos comentários em pouco tempo. Aguarde alguns segundos antes de publicar novamente.",
            )
        )
    ],
)
def criar_comentario_cadeira(
    disciplina_id: str,
    dados: ComentarioCadeiraCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Registra um novo comentário ou alerta de dificuldade em uma cadeira identificada por ID, slug ou código."""
    return comentario_service.criar_comentario_por_cadeira(
        db, disciplina_id, dados, current_user
    )
