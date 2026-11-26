from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Path, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_user,
    get_optional_current_user_from_header,
)
from app.api.schemas.material import (
    MaterialLinkCreate,
    MaterialPage,
    MaterialResponse,
    MaterialStatusResponse,
    MaterialVotoResponse,
    TituloMaterial,
)
from app.core.config import settings
from app.core.database import get_db
from app.domain.materiais import TIPOS_MIME
from app.models.usuario import Usuario
from app.services.armazenamento_material import ArmazenamentoMaterial
from app.services.material_service import MaterialService
from app.services.moderacao_ia_service import processar_moderacao_material_bg

router = APIRouter(tags=["Materiais"])


def get_material_service() -> MaterialService:
    return MaterialService(ArmazenamentoMaterial(settings.MATERIALS_DIR, settings.MATERIAL_MAX_BYTES))


@router.post("/cadeiras/{id}/materiais", response_model=MaterialResponse, status_code=201)
def enviar_material(
    id: Annotated[str, Path(description="ID ou slug da cadeira")],
    titulo: Annotated[TituloMaterial, Form()],
    arquivo: Annotated[UploadFile, File(description="PDF, PNG ou JPG; máximo padrão de 5 MiB.")],
    usuario: Annotated[Usuario, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
    background_tasks: BackgroundTasks,
    tipo: Annotated[str, Form(description="Tipo de material (ARQUIVO, RESUMO, PROVA_ANTIGA, DICA)")] = "ARQUIVO",
) -> MaterialResponse:
    resposta = service.enviar(
        db, usuario.id, id, titulo, arquivo.file, arquivo.filename or "", arquivo.content_type or "", tipo=tipo
    )
    background_tasks.add_task(processar_moderacao_material_bg, resposta.id)
    return resposta


@router.post("/cadeiras/{id}/links", response_model=MaterialResponse, status_code=201)
def enviar_link(
    id: Annotated[str, Path(description="ID ou slug da cadeira")],
    dados: MaterialLinkCreate,
    usuario: Annotated[Usuario, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
) -> MaterialResponse:
    """Registra um link externo na fila de curadoria para aprovação da moderação."""
    return service.enviar_link(db, usuario.id, id, dados.titulo, dados.url_origem, tipo=dados.tipo)


@router.get("/cadeiras/{id}/materiais", response_model=MaterialPage)
def listar_materiais(
    id: Annotated[str, Path(description="ID ou slug da cadeira")],
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
    current_user: Annotated[Usuario | None, Depends(get_optional_current_user_from_header)] = None,
    titulo: Annotated[str | None, Query(max_length=200)] = None,
    tipo: Annotated[str | None, Query(description="Filtro opcional por tipo de material")] = None,
    tipos: Annotated[
        list[str] | None, Query(max_length=4, description="Tipos da categoria; não combinar com tipo")
    ] = None,
    pagina: Annotated[int, Query(ge=1)] = 1,
    tamanho_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
) -> MaterialPage:
    return service.listar(
        db,
        id,
        titulo,
        pagina,
        tamanho_pagina,
        tipo=tipo,
        tipos=tipos,
        current_user_id=current_user.id if current_user else None,
    )


@router.post("/materiais/{id}/voto", response_model=MaterialVotoResponse)
def alternar_voto_material(
    id: Annotated[int, Path(gt=0)],
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> MaterialVotoResponse:
    """Alterna a curtida (voto útil) de um usuário autenticado em um material de apoio."""
    return service.alternar_voto(db, id, current_user)


@router.get("/materiais/{id}/status", response_model=MaterialStatusResponse)
def consultar_status_material(
    id: Annotated[int, Path(gt=0)],
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> MaterialStatusResponse:
    """Consulta o status da triagem ou curadoria de um material do próprio autor."""
    return service.consultar_status_moderacao(db, id, current_user)


@router.get("/materiais/{id}/download", response_class=FileResponse)
def baixar_material(
    id: Annotated[int, Path(gt=0)],
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
) -> FileResponse:
    material, caminho = service.baixar(db, id)
    return FileResponse(
        caminho, media_type=TIPOS_MIME[material.formato],
        filename=f"material-{material.id}.{material.formato}",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"},
    )
