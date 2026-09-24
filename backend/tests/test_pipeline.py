import pytest
from decimal import Decimal
from pathlib import Path
from unittest.mock import MagicMock

from app.pipeline.transformers.sigaa_transformer import SIGAATransformer, slugify
from app.pipeline.transformers.metricas_transformer import MetricasTransformer
from app.pipeline.transformers.sanitizer import LGPDSanitizer
from app.pipeline.loaders.export_loader import ExportLoader
from app.pipeline.runner import ETLRunner
from app.pipeline.schemas.metricas import MetricaAcademicaClean


class TestSIGAATransformer:
    def test_slugify(self):
        assert slugify("Cálculo 1") == "calculo-1"
        assert slugify("Algoritmos e Programação de Computadores") == "algoritmos-e-programacao-de-computadores"
        assert slugify("Estruturas de Dados 2!!") == "estruturas-de-dados-2"

    def test_transform_disciplinas(self):
        transformer = SIGAATransformer()
        raw_disciplinas = [
            {
                "codigo": "MAT0025",
                "nome": "Cálculo 1",
                "departamento": "Departamento de Matemática",
                "creditos": 6,
                "carga_horaria": 90,
                "ementa": "Limites, derivadas e integrais.",
            },
            {
                # Duplicata com mesmo código deve ser descartada
                "codigo": "MAT0025",
                "nome": "Cálculo 1 Repetido",
            },
            {
                # Item sem código ou nome deve ser ignorado
                "codigo": "",
                "nome": "Disciplina Sem Código",
            },
        ]
        clean = transformer.transform_disciplinas(raw_disciplinas)
        assert len(clean) == 1
        assert clean[0].codigo == "MAT0025"
        assert clean[0].slug == "calculo-1"
        assert clean[0].creditos == 6

    def test_transform_docentes(self):
        transformer = SIGAATransformer()
        raw_docentes = [
            {"nome": "Prof. Dr. João Silva", "departamento": "MAT"},
            {"nome": "joao silva", "departamento": "MAT"},  # Duplicado normalizado
            {"nome": "Dra. Maria Santos", "departamento": "CIC"},
        ]
        clean = transformer.transform_docentes(raw_docentes)
        assert len(clean) == 2
        nomes = [d.nome for d in clean]
        assert "Joao Silva" in nomes
        assert "Maria Santos" in nomes

    def test_transform_turmas(self):
        transformer = SIGAATransformer()
        raw_turmas = [
            {
                "codigo_disciplina": "MAT0025",
                "nome_disciplina": "Cálculo 1",
                "codigo_turma": "01",
                "semestre": "2026.1",
                "horario": "35M12",
                "local": "ICC Ala Central",
                "docentes": ["João Silva"],
                "matriculados": 45,
            },
            {
                # Semestre em formato inválido deve ser descartado
                "codigo_disciplina": "MAT0025",
                "codigo_turma": "02",
                "semestre": "invalido",
            },
        ]
        clean = transformer.transform_turmas(raw_turmas)
        assert len(clean) == 1
        assert clean[0].codigo_disciplina == "MAT0025"
        assert clean[0].codigo_turma == "01"
        assert clean[0].semestre == "2026.1"
        assert clean[0].matriculados == 45


class TestMetricasTransformer:
    def test_calcular_taxa_aprovacao_normal(self):
        transformer = MetricasTransformer()
        taxa = transformer.calcular_taxa_aprovacao(aprovados=75, matriculados=100)
        assert taxa == Decimal("75.00")

    def test_calcular_taxa_aprovacao_divisao_por_zero(self):
        transformer = MetricasTransformer()
        taxa = transformer.calcular_taxa_aprovacao(aprovados=0, matriculados=0)
        assert taxa == Decimal("0.00")

    def test_transform_metricas(self):
        transformer = MetricasTransformer()
        raw_metricas = [
            {
                "codigo_disciplina": "MAT0025",
                "nome_disciplina": "Cálculo 1",
                "ano": 2024,
                "semestre": 1,
                "matriculados": 50,
                "aprovados": 35,
                "reprovados_nota": 10,
                "reprovados_falta": 3,
                "trancamentos": 2,
            }
        ]
        clean = transformer.transform(raw_metricas)
        assert len(clean) == 1
        assert clean[0].ano == 2024
        assert clean[0].semestre == 1
        assert clean[0].taxa_aprovacao == Decimal("70.00")


class TestLGPDSanitizer:
    def test_remover_campos_sensiveis_individuais(self):
        sanitizer = LGPDSanitizer()
        registro_com_dados_sensiveis = {
            "codigo_disciplina": "CIC0004",
            "matricula": "221000123",
            "cpf": "000.111.222-33",
            "email_aluno": "aluno@aluno.unb.br",
            "nome_aluno": "Estudante Identificado",
            "ira": "4.5",
            "turma": "01",
        }
        sanitizado = sanitizer.sanitize_record(registro_com_dados_sensiveis)
        assert "matricula" not in sanitizado
        assert "cpf" not in sanitizado
        assert "email_aluno" not in sanitizado
        assert "nome_aluno" not in sanitizado
        assert "ira" not in sanitizado
        assert sanitizado["codigo_disciplina"] == "CIC0004"
        assert sanitizado["turma"] == "01"

    def test_regra_rn07_baixa_amostragem_suprimida(self):
        """Turmas com menos de 5 matriculados devem ter valores individuais suprimidos."""
        sanitizer = LGPDSanitizer(amostragem_minima=5)
        metricas = [
            MetricaAcademicaClean(
                codigo_disciplina="MAT0099",
                slug_disciplina="topicos-especiais",
                ano=2024,
                semestre=2,
                matriculados=3,  # < 5 alunos
                aprovados=2,
                reprovados_nota=1,
                reprovados_falta=0,
                trancamentos=0,
                taxa_aprovacao=Decimal("66.67"),
            ),
            MetricaAcademicaClean(
                codigo_disciplina="MAT0025",
                slug_disciplina="calculo-1",
                ano=2024,
                semestre=2,
                matriculados=60,  # >= 5 alunos
                aprovados=45,
                reprovados_nota=10,
                reprovados_falta=3,
                trancamentos=2,
                taxa_aprovacao=Decimal("75.00"),
            ),
        ]

        resultado = sanitizer.sanitize_metricas(metricas)

        # Registro com baixa amostragem (< 5)
        assert resultado[0].amostragem_suprimida_lgpd is True
        assert resultado[0].aprovados == 0
        assert resultado[0].reprovados_nota == 0
        assert resultado[0].taxa_aprovacao is None

        # Registro normal (>= 5)
        assert resultado[1].amostragem_suprimida_lgpd is False
        assert resultado[1].aprovados == 45
        assert resultado[1].taxa_aprovacao == Decimal("75.00")


class TestExportLoader:
    def test_exportar_json_e_csv(self, tmp_path: Path):
        loader = ExportLoader(output_dir=tmp_path)
        data = {
            "disciplinas": [
                {"codigo": "MAT0025", "nome": "Cálculo 1", "slug": "calculo-1"}
            ]
        }
        stats = loader.load(data)
        assert stats["disciplinas_exportados"] == 1

        json_file = tmp_path / "disciplinas.json"
        csv_file = tmp_path / "disciplinas.csv"
        assert json_file.exists()
        assert csv_file.exists()


class TestETLRunner:
    def test_runner_sigaa_dry_run(self):
        mock_extractor = MagicMock()
        mock_extractor.extract.return_value = {
            "turmas": [
                {
                    "codigo_disciplina": "MAT0025",
                    "nome_disciplina": "Cálculo 1",
                    "codigo_turma": "01",
                    "semestre": "2026.1",
                    "matriculados": 30,
                }
            ],
            "disciplinas": [{"codigo": "MAT0025", "nome": "Cálculo 1"}],
            "docentes": [{"nome": "Prof. Teste"}],
        }

        mock_db_loader = MagicMock()
        mock_export_loader = MagicMock()

        runner = ETLRunner(
            sigaa_extractor=mock_extractor,
            db_loader=mock_db_loader,
            export_loader=mock_export_loader,
        )

        res = runner.run_sigaa_pipeline(semestre="2026.1", dry_run=True, export=True)
        assert res["status"] == "success"
        assert mock_db_loader.load.called is False  # Dry-run não deve chamar o banco
        assert mock_export_loader.load.called is True


class TestSIGAAExtractor:
    def test_load_departamentos_ids(self):
        from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor
        extractor = SIGAAExtractor()
        ids = extractor.load_departamentos_ids()
        assert len(ids) > 0
        assert 673 in ids  # FCTE / Gama
        assert 361 in ids  # MAT

    def test_extract_from_sample_csv(self):
        from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor
        sample_file = Path(__file__).resolve().parent.parent / "app" / "pipeline" / "data" / "sample_turmas.csv"
        extractor = SIGAAExtractor()
        data = extractor.extract_from_file(sample_file, semestre="2026.1")
        assert len(data["turmas"]) == 4
        assert len(data["disciplinas"]) == 4
        codigos = [d["codigo"] for d in data["disciplinas"]]
        assert "FGA0030" in codigos
        assert "MAT0025" in codigos

    def test_parse_turmas_html_agrupador_e_linha(self):
        from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor
        html = """
        <div id="turmasAbertas">
            <table class="listagem">
                <tr class="agrupador">
                    <td><span class="tituloDisciplina">FGA0030 - ESTRUTURAS DE DADOS 2</span></td>
                </tr>
                <tr class="linhaPar">
                    <td>01</td>
                    <td>2026.1</td>
                    <td>EDSON ALVES DA COSTA JUNIOR (60h)</td>
                    <td>35T23 (PRESENCIAL)</td>
                    <td>Graduação</td>
                    <td>80</td>
                    <td>65</td>
                    <td>FCTE - S1</td>
                </tr>
            </table>
        </div>
        """
        extractor = SIGAAExtractor()
        res = extractor.parse_turmas_html(html, departamento_id=673, semestre="2026.1")
        assert len(res["turmas"]) == 1
        turma = res["turmas"][0]
        assert turma["codigo_disciplina"] == "FGA0030"
        assert turma["nome_disciplina"] == "ESTRUTURAS DE DADOS 2"
        assert turma["codigo_turma"] == "01"
        assert turma["horario"] == "35T23"
        assert turma["docentes"] == ["EDSON ALVES DA COSTA JUNIOR"]
        assert turma["matriculados"] == 80
        assert turma["local"] == "FCTE - S1"

