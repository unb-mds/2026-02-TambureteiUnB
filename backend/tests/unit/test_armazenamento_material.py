from io import BytesIO
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services.armazenamento_material import ArmazenamentoMaterial


def test_falha_durante_leitura_remove_arquivo_parcial(tmp_path):
    class ArquivoComFalha(BytesIO):
        def read(self, tamanho=-1):
            if self.tell() > 0:
                raise OSError("Leitura interrompida")
            return super().read(tamanho)

    storage = ArmazenamentoMaterial(tmp_path, 100)
    with pytest.raises(OSError):
        storage.salvar(ArquivoComFalha(b"%PDF-1.7"), "a.pdf", "application/pdf")
    assert list(tmp_path.iterdir()) == []


def test_caminho_resolvido_fora_do_diretorio_e_rejeitado(tmp_path):
    storage = ArmazenamentoMaterial(tmp_path / "uploads", 100)
    # Simula resolução de symlink sem depender de privilégios de symlink no Windows.
    with patch.object(Path, "resolve", return_value=tmp_path / "segredo.pdf"):
        with pytest.raises(FileNotFoundError):
            storage.localizar("a" * 32 + ".pdf")
