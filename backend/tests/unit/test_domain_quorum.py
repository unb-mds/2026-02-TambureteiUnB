import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.domain.quorum import GrupoValores, escolher_vencedor
from app.domain.semestre import semestre_valido


def _g(qtd):
    return GrupoValores(70, 20, 5, 5, quantidade=qtd)


class TestEscolherVencedorDominio:
    def test_quorum_exato_vence(self):
        g = _g(3)
        assert escolher_vencedor([g], 3) is g

    def test_um_abaixo_do_quorum_nao_vence(self):
        assert escolher_vencedor([_g(2)], 3) is None

    def test_empate_entre_elegiveis_nao_consolida(self):
        assert escolher_vencedor([_g(4), _g(4)], 3) is None

    def test_maioria_vence_mesmo_com_dois_elegiveis(self):
        g = _g(5)
        assert escolher_vencedor([_g(3), g], 3) is g


class TestSemestre:
    @pytest.mark.parametrize("v", ["2026.1", "2025.4"])
    def test_validos(self, v):
        assert semestre_valido(v)

    @pytest.mark.parametrize("v", ["invalido", "2026.5", "26.1", "2026/1", ""])
    def test_invalidos(self, v):
        assert not semestre_valido(v)


class TestConfigQuorum:
    def test_bool_rejeitado(self):
        with pytest.raises(ValidationError):
            Settings(QUORUM_MINIMO_DOACOES=True)

    def test_texto_zero_rejeitado(self):
        with pytest.raises(ValidationError):
            Settings(QUORUM_MINIMO_DOACOES="0")