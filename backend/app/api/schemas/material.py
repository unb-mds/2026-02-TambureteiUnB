from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class MaterialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    disciplina_id: int
    titulo: str
    formato: Literal["pdf", "png", "jpg"]
    tamanho_bytes: int
    status_moderacao: str
    created_at: datetime


class MaterialPage(BaseModel):
    items: list[MaterialResponse]
    total: int
    pagina: int
    tamanho_pagina: int
