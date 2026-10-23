from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.api.schemas.quorum import GrupoQuorum, QuorumProgressoResponse
from app.core.config import Settings
from app.services.doacao_service import DoacaoService


def _grupo(qtd):
    return SimpleNamespace(quantidade=qtd)


class TestQuorumConfig:
    def test_padrao_e_tres(self):
        assert Settings(QUORUM_MINIMO_DOACOES=3).QUORUM_MINIMO_DOACOES == 3

    def test_quorum_igual_a_um_e_valido(self):
        assert Settings(QUORUM_MINIMO_DOACOES=1).QUORUM_MINIMO_DOACOES == 1

    @pytest.mark.parametrize("valor", [0, -1, -10])
    def test_quorum_menor_que_um_rejeitado(self, valor):
        with pytest.raises(ValidationError) as exc:
            Settings(QUORUM_MINIMO_DOACOES=valor)
        assert "O quórum mínimo de doações deve ser um número inteiro maior ou igual a 1" in str(exc.value)


class TestEscolherVencedor:
    def test_sem_grupos_retorna_none(self):
        assert DoacaoService._escolher_vencedor([], 3) is None

    def test_grupo_abaixo_do_quorum_retorna_none(self):
        assert DoacaoService._escolher_vencedor([_grupo(2), _grupo(1)], 3) is None

    def test_grupo_que_atinge_quorum_vence(self):
        g = _grupo(3)
        assert DoacaoService._escolher_vencedor([g, _grupo(1)], 3) is g

    def test_maior_quantidade_vence_quando_dois_atingem(self):
        a, b = _grupo(5), _grupo(3)
        assert DoacaoService._escolher_vencedor([b, a], 3) is a

    def test_empate_no_topo_nao_consolida(self):
        assert DoacaoService._escolher_vencedor([_grupo(3), _grupo(3)], 3) is None

    def test_empate_abaixo_do_quorum_nao_impede_vencedor(self):
        a = _grupo(3)
        assert DoacaoService._escolher_vencedor([a, _grupo(2), _grupo(2)], 3) is a


class TestQuorumSchemas:
    def test_progresso_sem_grupos_por_padrao(self):
        r = QuorumProgressoResponse(turma_id=1, semestre_referencia="2026.1", quorum_minimo=3, consolidado=False)
        assert r.grupos == []

    def test_grupo_exige_quantidade(self):
        with pytest.raises(ValidationError):
            GrupoQuorum(
                taxa_aprovacao=70.0,
                taxa_reprovacao_nota=20.0,
                taxa_reprovacao_falta=5.0,
                taxa_trancamento=5.0,
                atingiu_quorum=False,
                consolidado=False,
            )