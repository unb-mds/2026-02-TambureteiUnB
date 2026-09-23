"""Validações de upload independentes de HTTP, ORM e armazenamento."""

from pathlib import PurePath


class FormatoNaoSuportado(ValueError):
    pass


class ArquivoMuitoGrande(ValueError):
    pass


class ArquivoVazio(ValueError):
    pass


TIPOS_MIME = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg"}


def validar_formato(nome: str, tipo_mime: str, inicio: bytes) -> str:
    """Confere extensão, MIME declarado e assinatura; não substitui antivírus."""
    if not inicio:
        raise ArquivoVazio("O arquivo não pode estar vazio.")
    extensao = PurePath(nome).suffix.lower().lstrip(".")
    formato = "jpg" if extensao == "jpeg" else extensao
    assinaturas = {"pdf": b"%PDF-", "png": b"\x89PNG\r\n\x1a\n", "jpg": b"\xff\xd8\xff"}
    if (
        formato not in assinaturas
        or tipo_mime.lower() != TIPOS_MIME[formato]
        or not inicio.startswith(assinaturas[formato])
    ):
        raise FormatoNaoSuportado("Envie apenas PDF, PNG ou JPG com formato válido.")
    return formato


def validar_tamanho(tamanho: int, limite: int) -> None:
    if tamanho > limite:
        raise ArquivoMuitoGrande(f"O arquivo excede o limite de {limite} bytes.")
