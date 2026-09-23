"""Armazenamento privado: nomes gerados pelo servidor e escrita em blocos."""

import re
from pathlib import Path
from typing import BinaryIO
from uuid import uuid4

from app.domain.materiais import validar_formato, validar_tamanho


class ArmazenamentoMaterial:
    def __init__(self, diretorio: Path, limite: int):
        self.diretorio = diretorio.resolve()
        self.limite = limite

    def salvar(self, arquivo: BinaryIO, nome: str, tipo_mime: str) -> tuple[str, str, int]:
        bloco = arquivo.read(min(64 * 1024, self.limite + 1))
        validar_tamanho(len(bloco), self.limite)
        formato = validar_formato(nome, tipo_mime, bloco)
        chave = f"{uuid4().hex}.{formato}"
        self.diretorio.mkdir(parents=True, exist_ok=True)
        destino = self.diretorio / chave
        # O nome do cliente nunca é utilizado para construir o caminho de destino.
        saida = destino.open("xb")
        try:
            with saida:
                tamanho = 0
                while bloco:
                    tamanho += len(bloco)
                    validar_tamanho(tamanho, self.limite)
                    saida.write(bloco)
                    bloco = arquivo.read(min(64 * 1024, self.limite - tamanho + 1))
        except Exception:
            destino.unlink(missing_ok=True)
            raise
        return chave, formato, tamanho

    def localizar(self, chave: str) -> Path:
        if not re.fullmatch(r"[0-9a-f]{32}\.(pdf|png|jpg)", chave):
            raise FileNotFoundError("Caminho de material inválido.")
        caminho = (self.diretorio / chave).resolve()
        if not caminho.is_relative_to(self.diretorio) or not caminho.is_file():
            raise FileNotFoundError("Arquivo de material indisponível.")
        return caminho

    def remover(self, chave: str) -> None:
        self.localizar(chave).unlink(missing_ok=True)
