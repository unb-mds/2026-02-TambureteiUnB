import pytest
from pydantic import ValidationError

from app.api.schemas.dashboard import (
    CursoFormacaoResponse,
    DashboardGeralResponse,
    EvasaoCampusAnoItem,
    EvasaoCampusComparativoResponse,
    EvasaoCampusDetalheResponse,
    EvasaoCampusResumoItem,
    FluxoEstudantesPeriodoItem,
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


class TestDashboardGeralSchemas:
    def test_fluxo_estudantes_periodo_item_valido(self):
        item = FluxoEstudantesPeriodoItem(
            ano=2024,
            ingressantes=400,
            matriculados=1400,
            concluintes=200,
            trancados=70,
            evadidos=220,
            taxa_formacao=50.0,
            taxa_evasao=15.71,
        )
        assert item.ano == 2024
        assert item.ingressantes == 400
        assert item.concluintes == 200
        assert item.evadidos == 220
        assert item.taxa_formacao == 50.0
        assert item.taxa_evasao == 15.71

    def test_fluxo_estudantes_quantidade_negativa_retorna_mensagem_em_portugues(self):
        with pytest.raises(ValidationError) as erro:
            FluxoEstudantesPeriodoItem(
                ano=2024,
                ingressantes=-5,
                matriculados=100,
                concluintes=10,
                trancados=5,
                evadidos=2,
                taxa_formacao=0.0,
                taxa_evasao=2.0,
            )
        assert "A quantidade de alunos não pode ser negativa." in str(erro.value)

    def test_fluxo_estudantes_taxa_negativa_retorna_mensagem_em_portugues(self):
        with pytest.raises(ValidationError) as erro:
            FluxoEstudantesPeriodoItem(
                ano=2024,
                ingressantes=100,
                matriculados=200,
                concluintes=20,
                trancados=5,
                evadidos=10,
                taxa_formacao=-1.0,
                taxa_evasao=5.0,
            )
        assert "A taxa institucional não pode ser negativa." in str(erro.value)

    def test_dashboard_geral_response_valido(self):
        response = DashboardGeralResponse(
            total_cursos=4,
            total_campi=2,
            ingressantes=500,
            matriculados=1800,
            concluintes=240,
            trancados=90,
            evadidos=260,
            taxa_media_formacao=45.0,
            taxa_media_evasao=12.86,
            resumo_campi=[
                EvasaoCampusResumoItem(
                    campus="FCTE - Gama",
                    matriculados=1400,
                    desvinculados=240,
                    taxa_evasao=17.14,
                    taxa_media_anual=15.0,
                )
            ],
            fluxo_estudantes=[
                FluxoEstudantesPeriodoItem(
                    ano=2024,
                    ingressantes=400,
                    matriculados=1400,
                    concluintes=200,
                    trancados=70,
                    evadidos=220,
                    taxa_formacao=50.0,
                    taxa_evasao=15.71,
                )
            ],
        )
        assert response.total_cursos == 4
        assert response.total_campi == 2
        assert response.evadidos == 260
        assert response.taxa_media_formacao == 45.0
        assert response.taxa_media_evasao == 12.86
        assert len(response.resumo_campi) == 1
        assert len(response.fluxo_estudantes) == 1

    def test_dashboard_geral_quantidade_negativa_retorna_mensagem_em_portugues(self):
        with pytest.raises(ValidationError) as erro:
            DashboardGeralResponse(
                total_cursos=-1,
                total_campi=0,
                ingressantes=0,
                matriculados=0,
                concluintes=0,
                trancados=0,
                evadidos=0,
                taxa_media_formacao=None,
                taxa_media_evasao=None,
            )
        assert "A quantidade consolidada não pode ser negativa." in str(erro.value)

    def test_dashboard_geral_taxa_negativa_retorna_mensagem_em_portugues(self):
        with pytest.raises(ValidationError) as erro:
            DashboardGeralResponse(
                total_cursos=1,
                total_campi=1,
                ingressantes=100,
                matriculados=200,
                concluintes=50,
                trancados=10,
                evadidos=20,
                taxa_media_formacao=-5.0,
                taxa_media_evasao=10.0,
            )
        assert "A taxa institucional não pode ser negativa." in str(erro.value)
