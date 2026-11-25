from typing import Annotated
from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, require_role
from app.api.schemas.relato_bug import DecisaoRelatoBug, FilaRelatosBugs, RelatoBugCreate, RelatoBugResponse
from app.core.database import get_db
from app.models.usuario import Usuario
from app.services.relato_bug_service import relato_bug_service

router = APIRouter(tags=["Relatos de problemas"])
Banco = Annotated[Session, Depends(get_db)]
Autenticado = Annotated[Usuario, Depends(get_current_user)]
Moderador = Annotated[Usuario, Depends(require_role("MODERATOR", "ADMIN"))]


@router.post("/relatos-bugs", response_model=RelatoBugResponse, status_code=201)
def criar(dados: RelatoBugCreate, db: Banco, usuario: Autenticado):
    return relato_bug_service.criar(db, dados, usuario)


@router.get("/moderacao/bugs", response_model=FilaRelatosBugs)
def listar(
    db: Banco,
    moderador: Moderador,
    pagina: Annotated[int, Query(ge=1)] = 1,
    tamanho_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return relato_bug_service.listar(db, pagina, tamanho_pagina)


@router.patch("/moderacao/bugs/{id}", response_model=RelatoBugResponse)
def decidir(id: Annotated[int, Path(gt=0)], dados: DecisaoRelatoBug, db: Banco, moderador: Moderador):
    return relato_bug_service.decidir(db, id, dados, moderador)
