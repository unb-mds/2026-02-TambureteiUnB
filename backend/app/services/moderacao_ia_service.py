"""Servico de triagem autonoma hibrida via LLM local no Ollama e extracao de PDF."""
import base64
import logging
from pathlib import Path
from typing import Callable

import httpx
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.domain.moderacao import (
    MAX_CARACTERES_PDF,
    VereditoModIA,
    construir_prompt_comentario,
    construir_prompt_material,
    interpretar_resposta_ollama,
    resolver_moderacao_comentario,
    resolver_moderacao_material,
    truncar_texto_pdf,
)
from app.models.comentario import Comentario
from app.models.conteudo import Conteudo
from app.models.curadoria import Curadoria
from app.services.armazenamento_material import ArmazenamentoMaterial

logger = logging.getLogger(__name__)


def extrair_texto_pdf(caminho_arquivo: Path, limite: int = MAX_CARACTERES_PDF) -> str:
    """Extrai texto das paginas de um arquivo PDF local com fallback seguro."""
    try:
        from pypdf import PdfReader

        leitor = PdfReader(str(caminho_arquivo))
        if leitor.is_encrypted:
            return ""
        partes: list[str] = []
        acumulado = 0
        for pagina in leitor.pages:
            texto_pagina = (pagina.extract_text() or "").strip()
            if texto_pagina:
                partes.append(texto_pagina)
                acumulado += len(texto_pagina)
                if acumulado >= limite:
                    break
        return truncar_texto_pdf("\n".join(partes), limite=limite)
    except Exception as exc:
        logger.warning("Nao foi possivel extrair texto do PDF %s: %s", caminho_arquivo.name, exc)
        return ""


def consultar_ollama(
    mensagens: list[dict[str, object]],
    imagens_base64: list[str] | None = None,
    usar_modelo_visao: bool = False,
) -> VereditoModIA | None:
    """Envia prompt estruturado ao servidor local Ollama com degradacao graciosa."""
    base_url = (settings.OLLAMA_BASE_URL or "").strip()
    if not base_url:
        return None

    modelo = (
        (settings.OLLAMA_VISION_MODEL or "").strip()
        if usar_modelo_visao
        else (settings.OLLAMA_MODEL or "").strip()
    )
    if not modelo:
        return None

    mensagens_payload = [dict(m) for m in mensagens]
    if imagens_base64 and mensagens_payload:
        mensagens_payload[-1] = {**mensagens_payload[-1], "images": imagens_base64}

    payload = {
        "model": modelo,
        "messages": mensagens_payload,
        "stream": False,
        "format": VereditoModIA.model_json_schema(),
        "options": {"temperature": 0.0},
    }

    url = f"{base_url.rstrip('/')}/api/chat"
    try:
        with httpx.Client(timeout=settings.OLLAMA_TIMEOUT_SECONDS) as client:
            resposta = client.post(url, json=payload)
            resposta.raise_for_status()
            corpo = resposta.json()
            conteudo_str = corpo.get("message", {}).get("content", "")
            return interpretar_resposta_ollama(conteudo_str)
    except (httpx.HTTPError, ValueError, KeyError, OSError) as exc:
        logger.warning("Falha controlada ao consultar Ollama em %s: %s", url, exc)
        return None


def aplicar_triagem_comentario(db: Session, comentario_id: int) -> bool:
    """Executa a triagem de um comentario pendente usando a sessao fornecida."""
    comentario = db.get(Comentario, comentario_id)
    if comentario is None or comentario.status_moderacao != "PENDENTE":
        return False

    mensagens = construir_prompt_comentario(
        comentario.conteudo,
        topico=comentario.topico_dificuldade,
        autor_alias=comentario.autor_alias,
    )
    veredito = consultar_ollama(mensagens)
    transicao = resolver_moderacao_comentario(
        veredito,
        limiar_confianca=settings.MODERATION_CONFIDENCE_THRESHOLD,
    )

    comentario.status_moderacao = transicao.status_final
    comentario.motivo_moderacao = transicao.motivo_moderacao
    comentario.confianca_ia = transicao.confianca_ia
    comentario.moderado_por = transicao.moderado_por
    db.commit()
    return True


def aplicar_triagem_material(db: Session, conteudo_id: int) -> bool:
    """Executa a triagem de um material de apoio pendente usando a sessao fornecida."""
    conteudo = db.get(Conteudo, conteudo_id)
    if (
        conteudo is None
        or conteudo.caminho_arquivo is None
        or conteudo.status_curadoria != "PENDENTE"
        or conteudo.status_moderacao == "excluido"
    ):
        return False

    armazenamento = ArmazenamentoMaterial(settings.MATERIALS_DIR, settings.MATERIAL_MAX_BYTES)
    try:
        caminho = armazenamento.localizar(conteudo.caminho_arquivo)
    except (OSError, ValueError) as exc:
        logger.warning("Arquivo fisico nao localizado para triagem (id=%s): %s", conteudo_id, exc)
        return False

    formato = (conteudo.formato or "").lower()
    if formato == "pdf":
        texto_extraido = extrair_texto_pdf(caminho)
        if not texto_extraido.strip():
            conteudo.status_curadoria = "PENDENTE"
            conteudo.status_moderacao = "em_analise"
            conteudo.motivo_moderacao = (
                "Arquivo PDF digitalizado ou sem camada de texto extraivel — "
                "requer inspecao visual de moderador."
            )
            conteudo.confianca_ia = 0.0
            conteudo.moderado_por = None
            db.commit()
            return True

        mensagens = construir_prompt_material(
            titulo=conteudo.titulo,
            tipo=conteudo.tipo,
            formato=formato,
            texto_extraido=texto_extraido,
        )
        veredito = consultar_ollama(mensagens)
    elif formato in {"png", "jpg"}:
        if not (settings.OLLAMA_VISION_MODEL or "").strip():
            conteudo.status_curadoria = "PENDENTE"
            conteudo.status_moderacao = "em_analise"
            conteudo.motivo_moderacao = (
                "Arquivo visual (PNG/JPG) sem modelo multimodal configurado — "
                "requer inspecao visual de moderador."
            )
            conteudo.confianca_ia = 0.0
            conteudo.moderado_por = None
            db.commit()
            return True

        imagem_b64 = base64.b64encode(caminho.read_bytes()).decode("ascii")
        mensagens = construir_prompt_material(
            titulo=conteudo.titulo,
            tipo=conteudo.tipo,
            formato=formato,
            texto_extraido=None,
        )
        veredito = consultar_ollama(
            mensagens,
            imagens_base64=[imagem_b64],
            usar_modelo_visao=True,
        )
    else:
        return False

    transicao = resolver_moderacao_material(
        veredito,
        limiar_confianca=settings.MODERATION_CONFIDENCE_THRESHOLD,
    )

    status_anterior = conteudo.status_curadoria
    conteudo.status_curadoria = transicao.status_final
    if transicao.status_moderacao_arquivo:
        conteudo.status_moderacao = transicao.status_moderacao_arquivo
    conteudo.motivo_moderacao = transicao.motivo_moderacao
    conteudo.confianca_ia = transicao.confianca_ia
    conteudo.moderado_por = transicao.moderado_por

    if transicao.registrar_curadoria_ia:
        db.add(
            Curadoria(
                conteudo_id=conteudo.id,
                moderador_id=None,
                perfil_moderador="IA",
                status_anterior=status_anterior,
                status_novo=transicao.status_final,
                justificativa=transicao.motivo_moderacao[:1000],
            )
        )

    db.commit()
    return True


def processar_moderacao_comentario_bg(
    comentario_id: int,
    session_factory: Callable[[], Session] = SessionLocal,
) -> None:
    """Wrapper seguro para BackgroundTasks do FastAPI com sessao propria."""
    with session_factory() as db:
        try:
            aplicar_triagem_comentario(db, comentario_id)
        except SQLAlchemyError as exc:
            db.rollback()
            logger.warning("Erro de banco na triagem em background do comentario %s: %s", comentario_id, exc)
        except Exception as exc:
            db.rollback()
            logger.warning("Falha inesperada na triagem em background do comentario %s: %s", comentario_id, exc)


def processar_moderacao_material_bg(
    conteudo_id: int,
    session_factory: Callable[[], Session] = SessionLocal,
) -> None:
    """Wrapper seguro para BackgroundTasks do FastAPI com sessao propria."""
    with session_factory() as db:
        try:
            aplicar_triagem_material(db, conteudo_id)
        except SQLAlchemyError as exc:
            db.rollback()
            logger.warning("Erro de banco na triagem em background do material %s: %s", conteudo_id, exc)
        except Exception as exc:
            db.rollback()
            logger.warning("Falha inesperada na triagem em background do material %s: %s", conteudo_id, exc)
