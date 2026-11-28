from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificacaoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: str
    titulo: str
    mensagem: str
    link: str | None = None
    lida: bool
    created_at: datetime


class ListaNotificacoesResponse(BaseModel):
    items: list[NotificacaoResponse]
    nao_lidas: int


class MarcarTodasLidasResponse(BaseModel):
    marcadas: int
