from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.domain.semestre import intervalo_anos_valido, intervalo_semestres
from app.services import estatistica_service as modulo
from app.services.estatistica_service import EstatisticaService


class TestIntervaloSemestres:
    def test_converte_anos_nos_limites_de_semestre(self):
        assert intervalo_semestres(2022, 2024) == ("2022.1", "2024.4")

    def test_mesmo_ano(self):
        assert intervalo_semestres(2023, 2023) == ("2023.1", "2023.4")

    def test_so_inicio(self):
        assert intervalo_semestres(2022, None) == ("2022.1", None)

    def test_so_fim(self):
        assert intervalo_semestres(None, 2024) == (None, "2024.4")

    def test_sem_limites(self):
        assert intervalo_semestres(None, None) == (None, None)


class TestIntervaloAnosValido:
    @pytest.mark.parametrize(
        "inicio, fim, esperado",
        [
            (2022, 2024, True),
            (2022, 2022, True),
            (2024, 2022, False),
            (2023, 2022, False),
            (None, 2022, True),
            (2022, None, True),
            (None, None, True),
        ],
    )
    def test_validacao(self, inicio, fim, esperado):
        assert intervalo_anos_valido(inicio, fim) is esperado


@pytest.fixture
def repos(monkeypatch):
    """Troca os repositórios do service por mocks (sem banco)."""
    disciplina = MagicMock()
    estatistica = MagicMock()
    disciplina.get_by_id.return_value = SimpleNamespace(id=7)
    estatistica.serie_historica_por_disciplina.return_value = []
    monkeypatch.setattr(modulo, "disciplina_repo", disciplina)
    monkeypatch.setattr(modulo, "estatistica_repo", estatistica)
    return SimpleNamespace(disciplina=disciplina, estatistica=estatistica)


def _linha(semestre, turmas=1, aprov="70.00", nota="20.00", falta="5.00", tranc="5.00"):
    return SimpleNamespace(
        semestre_referencia=semestre,
        total_turmas=turmas,
        taxa_aprovacao=Decimal(aprov),
        taxa_reprovacao_nota=Decimal(nota),
        taxa_reprovacao_falta=Decimal(falta),
        taxa_trancamento=Decimal(tranc),
    )


class TestEstatisticaService:
    def test_intervalo_invertido_retorna_400_sem_consultar_banco(self, repos):
        with pytest.raises(HTTPException) as exc:
            EstatisticaService().serie_historica(MagicMock(), 7, 2024, 2022)
        assert exc.value.status_code == 400
        assert "ano_fim" in exc.value.detail
        repos.disciplina.get_by_id.assert_not_called()
        repos.estatistica.serie_historica_por_disciplina.assert_not_called()

    def test_disciplina_inexistente_retorna_404(self, repos):
        repos.disciplina.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            EstatisticaService().serie_historica(MagicMock(), 7, 2022, 2024)
        assert exc.value.status_code == 404
        repos.estatistica.serie_historica_por_disciplina.assert_not_called()

    def test_repassa_semestres_convertidos_ao_repositorio(self, repos):
        db = MagicMock()
        EstatisticaService().serie_historica(db, 7, 2022, 2024)
        repos.estatistica.serie_historica_por_disciplina.assert_called_once_with(db, 7, "2022.1", "2024.4")

    def test_sem_parametros_consulta_sem_limites(self, repos):
        db = MagicMock()
        EstatisticaService().serie_historica(db, 7, None, None)
        repos.estatistica.serie_historica_por_disciplina.assert_called_once_with(db, 7, None, None)

    def test_mapeia_linhas_para_resposta(self, repos):
        repos.estatistica.serie_historica_por_disciplina.return_value = [
            _linha("2022.1", turmas=2, aprov="75.00", nota="15.00"),
            _linha("2023.2"),
        ]
        r = EstatisticaService().serie_historica(MagicMock(), 7, 2022, 2024)
        assert r.disciplina_id == 7
        assert (r.ano_inicio, r.ano_fim) == (2022, 2024)
        assert [s.semestre_referencia for s in r.semestres] == ["2022.1", "2023.2"]
        assert r.semestres[0].total_turmas == 2
        assert r.semestres[0].taxa_aprovacao == 75.0
        assert isinstance(r.semestres[0].taxa_aprovacao, float)
