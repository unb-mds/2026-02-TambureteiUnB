from io import BytesIO

import pytest

from app.domain.materiais import (
    ArquivoMuitoGrande, ArquivoVazio, FormatoNaoSuportado, validar_formato, validar_tamanho,
)
from app.services.armazenamento_material import ArmazenamentoMaterial


@pytest.mark.parametrize("nome,mime,inicio,esperado", [
    ("a.PDF", "application/pdf", b"%PDF-1.7", "pdf"),
    ("a.png", "image/png", b"\x89PNG\r\n\x1a\n", "png"),
    ("a.jpg", "image/jpeg", b"\xff\xd8\xff", "jpg"),
    ("a.JPEG", "image/jpeg", b"\xff\xd8\xff", "jpg"),
])
def test_formatos(nome, mime, inicio, esperado):
    assert validar_formato(nome, mime, inicio) == esperado


@pytest.mark.parametrize("nome,mime,inicio", [
    ("a.exe", "application/pdf", b"%PDF-"),
    ("a.pdf", "image/png", b"%PDF-"),
    ("a.pdf", "application/pdf", b"<script>"),
    ("a.png", "image/png", b"PNG"),
    ("a.jpg", "image/jpeg", b"\xff\xd8"),
    ("sem-extensao", "application/pdf", b"%PDF-"),
])
def test_formato_invalido(nome, mime, inicio):
    with pytest.raises(FormatoNaoSuportado):
        validar_formato(nome, mime, inicio)


def test_arquivo_vazio():
    with pytest.raises(ArquivoVazio):
        validar_formato("a.pdf", "application/pdf", b"")


def test_limite_inclusivo():
    validar_tamanho(9, 10)
    validar_tamanho(10, 10)
    with pytest.raises(ArquivoMuitoGrande):
        validar_tamanho(11, 10)


def test_remove_arquivo_parcial_quando_excede_limite(tmp_path):
    storage = ArmazenamentoMaterial(tmp_path, 70_000)
    with pytest.raises(ArquivoMuitoGrande):
        storage.salvar(BytesIO(b"%PDF-" + b"x" * 70_000), "a.pdf", "application/pdf")
    assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize("chave", ["../segredo.pdf", "/etc/passwd", "C:\\segredo.pdf", "a.pdf", "../" + "a" * 32 + ".pdf"])
def test_download_rejeita_caminhos_arbitrarios(tmp_path, chave):
    storage = ArmazenamentoMaterial(tmp_path, 100)
    with pytest.raises(FileNotFoundError):
        storage.localizar(chave)


def test_nome_do_cliente_nao_controla_destino(tmp_path):
    storage = ArmazenamentoMaterial(tmp_path, 100)
    chave, formato, tamanho = storage.salvar(BytesIO(b"%PDF-1.7"), "../../arquivo.pdf", "application/pdf")
    assert storage.localizar(chave).parent == tmp_path.resolve()
    assert chave != "arquivo.pdf"
    assert (formato, tamanho) == ("pdf", 8)
    storage.remover(chave)
    assert list(tmp_path.iterdir()) == []
