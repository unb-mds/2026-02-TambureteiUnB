import pytest
from pydantic import ValidationError

from app.api.schemas.dashboard import (
    CursoFormacaoResponse,
    EvasaoCampusAnoItem,
    EvasaoCampusComparativoResponse,
    EvasaoCampusDetalheResponse,
    EvasaoCampusResumoItem,
    MetricaFormacaoItem,
)


class TestDashboardSchemas:
    def test_metrica_formacao_item(self):
        item = MetricaFormacaoItem(
            ano=2024,
            ingressantes=120,
            matriculados=480,
            concluintes=60,
            taxa_formacao=50.0,
        )
        assert item.ano == 2024
        assert item.ingressantes == 120
        assert item.concluintes == 60
        assert item.taxa_formacao == 50.0

    def test_curso_formacao_response(self):
        item_2023 = MetricaFormacaoItem(
            ano=2023,
            ingressantes=100,
            matriculados=450,
            concluintes=40,
            taxa_formacao=40.0,
        )
        item_2024 = MetricaFormacaoItem(
            ano=2024,
            ingressantes=100,
            matriculados=480,
            concluintes=60,
            taxa_formacao=60.0,
        )
        response = CursoFormacaoResponse(
            curso_id=1,
            curso_nome="Engenharia de Software",
            curso_slug="engenharia-de-software",
            taxa_media_formacao=50.0,
            serie_historica=[item_2023, item_2024],
        )
        assert response.curso_id == 1
        assert response.curso_nome == "Engenharia de Software"
        assert response.taxa_media_formacao == 50.0
        assert len(response.serie_historica) == 2
        assert response.serie_historica[0].ano == 2023
        assert response.serie_historica[1].ano == 2024


class TestEvasaoCampusSchemas:
    def test_evasao_campus_ano_item_valido(self):
        item = EvasaoCampusAnoItem(
            ano=2024,
            total_cursos=2,
            matriculados=1000,
            desvinculados=200,
            taxa_evasao=20.0,
        )
        assert item.ano == 2024
        assert item.total_cursos == 2
        assert item.taxa_evasao == 20.0

    def test_matriculados_negativos_retornam_mensagem_em_portugues(self):
        with pytest.raises(ValidationError) as erro:
            EvasaoCampusAnoItem(
                ano=2024,
                total_cursos=1,
                matriculados=-1,
                desvinculados=0,
                taxa_evasao=0.0,
            )
        assert "A quantidade de alunos não pode ser negativa." in str(erro.value)

    def test_taxa_negativa_retorna_mensagem_em_portugues(self):
        with pytest.raises(ValidationError) as erro:
            EvasaoCampusResumoItem(
                campus="FCTE - Gama",
                matriculados=100,
                desvinculados=10,
                taxa_evasao=-1.0,
                taxa_media_anual=10.0,
            )
        assert "A taxa de evasão não pode ser negativa." in str(erro.value)

    def test_comparativo_response(self):
        response = EvasaoCampusComparativoResponse(
            total_campi=1,
            campi=[
                EvasaoCampusResumoItem(
                    campus="Darcy Ribeiro",
                    matriculados=400,
                    desvinculados=20,
                    taxa_evasao=5.0,
                    taxa_media_anual=5.0,
                )
            ],
        )
        assert response.total_campi == 1
        assert response.campi[0].campus == "Darcy Ribeiro"

    def test_detalhe_response(self):
        response = EvasaoCampusDetalheResponse(
            campus="FCTE - Gama",
            matriculados=1400,
            desvinculados=240,
            taxa_evasao=17.14,
            taxa_media_anual=15.0,
            serie_historica=[
                EvasaoCampusAnoItem(
                    ano=2023,
                    total_cursos=1,
                    matriculados=400,
                    desvinculados=40,
                    taxa_evasao=10.0,
                )
            ],
        )
        assert response.campus == "FCTE - Gama"
        assert response.taxa_media_anual == 15.0
        assert response.serie_historica[0].ano == 2023
