import pytest
from app.api.schemas.curso import CursoResumo, CursoResponse, CursoGradeDisciplina
from app.api.schemas.disciplina import DisciplinaResponse, MetricaConsolidadaSchema, MetricaAcademicaSchema


class TestCursoSchemas:
    def test_curso_resumo_com_campus(self):
        curso = CursoResumo(
            codigo_mec="12345",
            nome="Engenharia de Software",
            campus="FGA",
            grau="Bacharelado",
            turno="Diurno",
            slug="engenharia-de-software",
        )
        assert curso.nome == "Engenharia de Software"
        assert curso.campus == "FGA"
        assert curso.slug == "engenharia-de-software"

    def test_curso_response_com_disciplinas(self):
        disc = CursoGradeDisciplina(
            codigo="FGA0168",
            nome="Métodos de Desenvolvimento de Software",
            slug="metodos-de-desenvolvimento-de-software",
            departamento="FCTE",
            creditos=4,
            periodo_sugerido=3,
            is_obrigatoria=True,
            natureza="Obrigatoria",
        )
        curso = CursoResponse(
            nome="Engenharia de Software",
            campus="FCTE - Gama",
            slug="engenharia-de-software",
            disciplinas=[disc],
        )
        assert len(curso.disciplinas) == 1
        assert curso.disciplinas[0].codigo == "FGA0168"
        assert curso.disciplinas[0].periodo_sugerido == 3


class TestDisciplinaSchemas:
    def test_disciplina_response_com_metricas(self):
        consolidada = MetricaConsolidadaSchema(
            matriculados=1420,
            aprovados=1054,
            reprovados_nota=278,
            reprovados_falta=50,
            trancamentos=88,
            taxa_aprovacao_acumulada=74.2,
        )
        historica = MetricaAcademicaSchema(
            ano=2024,
            semestre=1,
            matriculados=120,
            aprovados=90,
            reprovados_nota=20,
            reprovados_falta=5,
            trancamentos=5,
            taxa_aprovacao=75.0,
        )
        disciplina = DisciplinaResponse(
            codigo="FGA0168",
            nome="Métodos de Desenvolvimento de Software",
            slug="metodos-de-desenvolvimento-de-software",
            metrica_consolidada=consolidada,
            metricas=[historica],
        )
        assert disciplina.codigo == "FGA0168"
        assert disciplina.metrica_consolidada.matriculados == 1420
        assert len(disciplina.metricas) == 1
        assert disciplina.metricas[0].ano == 2024
