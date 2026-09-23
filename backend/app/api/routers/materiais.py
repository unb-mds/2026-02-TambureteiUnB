from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Path, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.api.schemas.material import MaterialPage, MaterialResponse
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
    id: Annotated[int, Path(gt=0)],
    titulo: Annotated[str, Form(min_length=1, max_length=200)],
    arquivo: Annotated[UploadFile, File(description="PDF, PNG ou JPG; máximo padrão de 5 MiB.")],
    usuario: Annotated[Usuario, Depends(require_role("STUDENT"))],
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
) -> MaterialResponse:
    return service.enviar(db, usuario.id, id, titulo, arquivo.file, arquivo.filename or "", arquivo.content_type or "")


@router.get("/cadeiras/{id}/materiais", response_model=MaterialPage)
def listar_materiais(
    id: Annotated[int, Path(gt=0)],
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
    titulo: Annotated[str | None, Query(max_length=200)] = None,
    pagina: Annotated[int, Query(ge=1)] = 1,
    tamanho_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
) -> MaterialPage:
    return service.listar(db, id, titulo, pagina, tamanho_pagina)


@router.get("/materiais/{id}/download", response_class=FileResponse)
def baixar_material(
    id: Annotated[int, Path(gt=0)],
    usuario: Annotated[Usuario, Depends(require_role("STUDENT"))],
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
) -> FileResponse:
    material, caminho = service.baixar(db, id)
    return FileResponse(
        caminho, media_type=TIPOS_MIME[material.formato],
        filename=f"material-{material.id}.{material.formato}",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"},
    )
