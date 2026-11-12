from typing import Annotated
from fastapi import APIRouter, Depends, Path, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.api.deps import require_role
from app.api.schemas.curadoria import DecisaoCuradoria, FilaCuradoria, RegistroCuradoria
from app.core.config import settings
from app.core.database import get_db
from app.domain.materiais import TIPOS_MIME
from app.models.usuario import Usuario
from app.services.armazenamento_material import ArmazenamentoMaterial
from app.services.curadoria_service import CuradoriaService

router = APIRouter(prefix="/moderacao", tags=["Moderação"])
Moderador = Annotated[Usuario, Depends(require_role("MODERATOR", "ADMIN"))]
Banco = Annotated[Session, Depends(get_db)]
Identificador = Annotated[int, Path(gt=0)]


def get_curadoria_service() -> CuradoriaService:
    return CuradoriaService(ArmazenamentoMaterial(settings.MATERIALS_DIR, settings.MATERIAL_MAX_BYTES))


Servico = Annotated[CuradoriaService, Depends(get_curadoria_service)]


@router.get("/materiais", response_model=FilaCuradoria)
def fila(db: Banco, moderador: Moderador, servico: Servico,
         pagina: Annotated[int, Query(ge=1)] = 1,
         tamanho_pagina: Annotated[int, Query(ge=1, le=100)] = 20):
    return servico.listar(db, pagina, tamanho_pagina)


@router.patch("/conteudos/{id}/curadoria", response_model=RegistroCuradoria)
def decidir(id: Identificador, dados: DecisaoCuradoria, db: Banco, moderador: Moderador, servico: Servico):
    return servico.decidir(db, id, dados, moderador)


@router.get("/conteudos/{id}/historico", response_model=list[RegistroCuradoria])
def historico(id: Identificador, db: Banco, moderador: Moderador, servico: Servico):
    return servico.historico(db, id)


@router.get("/materiais/{id}/download", response_class=FileResponse)
def baixar(id: Identificador, db: Banco, moderador: Moderador, servico: Servico):
    conteudo, caminho = servico.baixar(db, id)
    return FileResponse(caminho, media_type=TIPOS_MIME[conteudo.formato], filename=f"material-{conteudo.id}.{conteudo.formato}",
                        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"})
