from app.api.schemas.dashboard import MetricaFormacaoItem, CursoFormacaoResponse


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
