from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Path, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.api.schemas.material import MaterialPage, MaterialResponse, TituloMaterial
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
    usuario: Annotated[Usuario, Depends(require_role("STUDENT"))],
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


@router.get("/cadeiras/{id}/materiais", response_model=MaterialPage)
def listar_materiais(
    id: Annotated[str, Path(description="ID ou slug da cadeira")],
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[MaterialService, Depends(get_material_service)],
    titulo: Annotated[str | None, Query(max_length=200)] = None,
    tipo: Annotated[str | None, Query(description="Filtro opcional por tipo de material")] = None,
    pagina: Annotated[int, Query(ge=1)] = 1,
    tamanho_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
) -> MaterialPage:
    return service.listar(db, id, titulo, pagina, tamanho_pagina, tipo=tipo)


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
