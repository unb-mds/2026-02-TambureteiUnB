from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.historico import HistoricoImportacaoResponse
from app.core.config import settings
from app.core.database import get_db
from app.models.usuario import Usuario
from app.services.historico_importacao_service import historico_importacao_service
from app.services.historico_parser_service import HistoricoParserError

router = APIRouter(prefix="/perfil", tags=["Perfil Acadêmico"])


@router.post("/importar-historico", response_model=HistoricoImportacaoResponse)
async def importar_historico_sigaa(
    arquivo: UploadFile = File(..., description="PDF do Histórico Escolar oficial emitido pelo SIGAA/UnB"),
    db: Session = Depends(get_db),
    _current_user: Usuario = Depends(get_current_user),
):
    """
    Importa e valida o Histórico Escolar (PDF) emitido pelo SIGAA em memória.

    - Extrai os dados acadêmicos para exibição local no perfil do discente.
    - Registra apenas amostras anonimizadas (com hash irreversível anti-duplicidade)
      para consolidar estatísticas reais das turmas e disciplinas (RN07).
    - Descarta imediatamente o PDF, nome, CPF e matrícula após o processamento.
    """
    filename = (arquivo.filename or "").lower()
    content_type = (arquivo.content_type or "").lower()
    if not filename.endswith(".pdf") and content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Envie um arquivo PDF oficial emitido pelo SIGAA/UnB.",
        )

    conteudo_bytes = await arquivo.read()
    if len(conteudo_bytes) > settings.HISTORICO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="O arquivo excede o tamanho máximo permitido (10 MB).",
        )

    try:
        return historico_importacao_service.processar_upload(db, conteudo_bytes)
    except HistoricoParserError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
