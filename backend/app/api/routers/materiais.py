from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Path, Query, UploadFile
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
    MaterialUpdate,
    MaterialVotoResponse,
    MeuMaterialResponse,
    TituloMaterial,
)
from app.core.config import settings
from app.core.database import get_db
from app.domain.materiais import TIPOS_MIME
from app.models.usuario import Usuario
from app.services.armazenamento_material import ArmazenamentoMaterial
from app.services.material_service import MaterialService

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
    tipo: Annotated[str, Form(description="Tipo de material (ARQUIVO, RESUMO, PROVA_ANTIGA, DICA)")] = "ARQUIVO",
) -> MaterialResponse:
    return service.enviar(
        db, usuario.id, id, titulo, arquivo.file, arquivo.filename or "", arquivo.content_type or "", tipo=tipo
    )


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


@router.get("/materiais/meus", response_model=list[MeuMaterialResponse])
def listar_meus_materiais(
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> list[MeuMaterialResponse]:
    """Lista os materiais enviados pelo usuário autenticado (pendentes, aprovados e recusados)."""
    return service.listar_meus(db, current_user)


@router.patch("/materiais/{id}", response_model=MaterialResponse)
def editar_material(
    id: Annotated[int, Path(gt=0)],
    dados: MaterialUpdate,
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> MaterialResponse:
    """Permite ao autor editar título, categoria ou URL (em links) do próprio material."""
    return service.editar(db, id, dados, current_user)


@router.delete("/materiais/{id}", status_code=204)
def excluir_material(
    id: Annotated[int, Path(gt=0)],
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> None:
    """Permite ao autor ou à moderação excluir um material."""
    service.excluir(db, id, current_user)


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
