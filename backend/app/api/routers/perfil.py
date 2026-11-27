from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.historico import (
    HistoricoImportacaoResponse,
    TurmasStatusConsultaRequest,
    TurmasStatusConsultaResponse,
)
from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models.usuario import Usuario
from app.services.doacao_service import doacao_service
from app.services.historico_importacao_service import historico_importacao_service
from app.services.historico_parser_service import HistoricoParserError

router = APIRouter(prefix="/perfil", tags=["Perfil Acadêmico"])

_UPLOAD_CHUNK_SIZE = 64 * 1024


async def _ler_pdf_com_limite(arquivo: UploadFile, max_bytes: int) -> bytes:
    """Le o arquivo em blocos de 64 KiB e interrompe imediatamente ao exceder max_bytes."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await arquivo.read(min(_UPLOAD_CHUNK_SIZE, max_bytes - total + 1))
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="O arquivo excede o tamanho máximo permitido (10 MB).",
            )
        chunks.append(chunk)
    return b"".join(chunks)


@router.post(
    "/importar-historico",
    response_model=HistoricoImportacaoResponse,
    dependencies=[
        Depends(
            rate_limit(
                "perfil:importar_historico",
                limit=6,
                window_seconds=15 * 60,
                by_user=True,
                ip_ceiling=20,
                message="Limite de importações de histórico atingido. Aguarde alguns minutos antes de enviar novamente.",
            )
        )
    ],
)
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

    conteudo_bytes = await _ler_pdf_com_limite(arquivo, settings.HISTORICO_MAX_BYTES)

    try:
        return historico_importacao_service.processar_upload(db, conteudo_bytes)
    except HistoricoParserError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.post(
    "/turmas-estatisticas/status",
    response_model=TurmasStatusConsultaResponse,
    dependencies=[
        Depends(
            rate_limit(
                "perfil:turmas_status",
                limit=20,
                window_seconds=60,
                by_user=True,
                ip_ceiling=60,
            )
        )
    ],
)
def consultar_status_turmas_estatisticas(
    payload: TurmasStatusConsultaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Informa quais turmas cursadas no histórico do estudante já possuem estatística
    consolidada via gráfico de pizza (DOACAO_QUORUM) ou histórico, além de resolver o turma_id.
    """
    itens = doacao_service.consultar_status_turmas_usuario(
        db, current_user.id, payload.itens
    )
    return TurmasStatusConsultaResponse(itens=itens)
