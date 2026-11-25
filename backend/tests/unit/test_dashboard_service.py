from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.services import dashboard_service as modulo
from app.services.dashboard_service import DashboardService


@pytest.fixture
def repo_mock(monkeypatch):
    repo = MagicMock()
    repo.contar_cursos.return_value = 4
    repo.listar_fluxo_institucional.return_value = [
        {
            "ano": 2023,
            "ingressantes": 100,
            "matriculados": 400,
            "concluintes": 40,
            "trancados": 20,
            "evadidos": 40,
        },
        {
            "ano": 2024,
            "ingressantes": 400,
            "matriculados": 1400,
            "concluintes": 200,
            "trancados": 70,
            "evadidos": 220,
        },
    ]
    repo.listar_evasao_campus.return_value = [
        {
            "campus": "FCTE - Gama",
            "ano": 2023,
            "total_cursos": 1,
            "matriculados": 400,
            "desvinculados": 40,
        },
        {
            "campus": "Darcy Ribeiro",
            "ano": 2024,
            "total_cursos": 1,
            "matriculados": 400,
            "desvinculados": 20,
        },
    ]
    monkeypatch.setattr(modulo, "dashboard_repo", repo)
    return repo


class TestDashboardServiceGeral:
    def test_obter_visao_geral_agrega_fluxo_e_campi(self, repo_mock):
        db = MagicMock()
        resultado = DashboardService().obter_visao_geral(db)

        assert resultado["total_cursos"] == 4
        assert resultado["total_campi"] == 2
        assert resultado["ingressantes"] == 500
        assert resultado["matriculados"] == 1800
        assert resultado["concluintes"] == 240
        assert resultado["trancados"] == 90
        assert resultado["evadidos"] == 260
        assert resultado["taxa_media_formacao"] == 45.0
        assert resultado["taxa_media_evasao"] == 12.86
        assert [item["ano"] for item in resultado["fluxo_estudantes"]] == [2023, 2024]
        assert resultado["resumo_campi"][0]["campus"] == "FCTE - Gama"
        repo_mock.listar_fluxo_institucional.assert_called_once_with(db)
        repo_mock.listar_evasao_campus.assert_called_once_with(db)

    def test_obter_visao_geral_sem_dados_lanca_404(self, repo_mock):
        repo_mock.listar_fluxo_institucional.return_value = []
        with pytest.raises(HTTPException) as exc:
            DashboardService().obter_visao_geral(MagicMock())
        assert exc.value.status_code == 404
        assert "ainda não estão disponíveis" in exc.value.detail

    def test_obter_visao_geral_erro_banco_lanca_503(self, repo_mock):
        repo_mock.listar_fluxo_institucional.side_effect = SQLAlchemyError("view indisponivel")
        with pytest.raises(HTTPException) as exc:
            DashboardService().obter_visao_geral(MagicMock())
        assert exc.value.status_code == 503
        assert "temporariamente indisponíveis" in exc.value.detail

    def test_obter_visao_geral_lida_com_denominador_zero_na_serie(self, repo_mock):
        repo_mock.listar_fluxo_institucional.return_value = [
            {
                "ano": 2024,
                "ingressantes": 0,
                "matriculados": 0,
                "concluintes": 0,
                "trancados": 5,
                "evadidos": 0,
            }
        ]
        repo_mock.listar_evasao_campus.return_value = []
        resultado = DashboardService().obter_visao_geral(MagicMock())
        assert resultado["taxa_media_formacao"] is None
        assert resultado["taxa_media_evasao"] is None
        assert resultado["fluxo_estudantes"][0]["taxa_formacao"] is None
        assert resultado["fluxo_estudantes"][0]["taxa_evasao"] is None
