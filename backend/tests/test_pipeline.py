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

    def test_transform_disciplinas_calculo_creditos_automatico(self):
        transformer = SIGAATransformer()
        raw_disciplinas = [
            {
                "codigo": "FGA0030",
                "nome": "ESTRUTURAS DE DADOS 2",
                "carga_horaria": 60,
                "creditos": None,
                "ementa": "  Grafos, árvores e tabelas hash.   ",
            },
            {
                "codigo": "MAT0025",
                "nome": "CÁLCULO 1",
                "carga_horaria": 90,
                "creditos": None,
            },
            {
                "codigo": "FGA0069",
                "nome": "PRÁTICA DE CIRCUITOS 1",
                "carga_horaria": 30,
                "creditos": None,
            },
        ]
        clean = transformer.transform_disciplinas(raw_disciplinas)
        assert len(clean) == 3
        # 60h -> 4 créditos
        assert clean[0].creditos == 4
        assert clean[0].carga_horaria == 60
        assert clean[0].ementa == "Grafos, árvores e tabelas hash."
        # 90h -> 6 créditos
        assert clean[1].creditos == 6
        # 30h -> 2 créditos
        assert clean[2].creditos == 2

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
        assert "João Silva" in nomes
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

    def test_transform_metricas_integridade_numerica(self):
        transformer = MetricasTransformer()
        raw_metricas = [
            # Aprovados > matriculados (inválido)
            {
                "codigo_disciplina": "MAT0025",
                "ano": 2024,
                "semestre": 1,
                "matriculados": 10,
                "aprovados": 15,
            },
            # Soma dos resultados > matriculados (inválido)
            {
                "codigo_disciplina": "MAT0025",
                "ano": 2024,
                "semestre": 2,
                "matriculados": 20,
                "aprovados": 10,
                "reprovados_nota": 10,
                "reprovados_falta": 5,
            },
            # Valores negativos (inválido)
            {
                "codigo_disciplina": "MAT0025",
                "ano": 2023,
                "semestre": 1,
                "matriculados": 20,
                "aprovados": -2,
            },
            # Registro válido
            {
                "codigo_disciplina": "MAT0025",
                "ano": 2024,
                "semestre": 1,
                "matriculados": 50,
                "aprovados": 35,
                "reprovados_nota": 10,
                "reprovados_falta": 3,
                "trancamentos": 2,
            },
        ]
        clean = transformer.transform(raw_metricas)
        assert len(clean) == 1
        assert clean[0].matriculados == 50
        assert clean[0].aprovados == 35


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

    def test_remover_campos_sensiveis_com_acentos(self):
        sanitizer = LGPDSanitizer()
        registro_com_acentos = {
            "codigo_disciplina": "MAT0025",
            "Matrícula": "190012345",
            "Endereço": "Campus Darcy Ribeiro",
            "E-mail Aluno": "aluno@unb.br",
            "CPF": "12345678900",
            "turma": "02",
        }
        sanitizado = sanitizer.sanitize_record(registro_com_acentos)
        assert "Matrícula" not in sanitizado
        assert "Endereço" not in sanitizado
        assert "E-mail Aluno" not in sanitizado
        assert "CPF" not in sanitizado
        assert sanitizado["codigo_disciplina"] == "MAT0025"
        assert sanitizado["turma"] == "02"

    def test_regra_rn07_baixa_amostragem_suprimida(self):
        """Turmas com menos de 5 matriculados devem ter valores individuais consolidados e removidos da listagem individual."""
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

        # Registro com baixa amostragem (< 5) é removido da lista individual (RN07)
        assert len(resultado) == 1
        assert resultado[0].codigo_disciplina == "MAT0025"
        assert resultado[0].matriculados == 60
        assert resultado[0].aprovados == 45
        assert resultado[0].taxa_aprovacao == Decimal("75.00")

        # Acumulado geral da matéria consolidou a turma suprimida
        acum_mat0099 = sanitizer.get_acumulado_geral("MAT0099")
        assert acum_mat0099 is not None
        assert acum_mat0099["matriculados"] == 3
        assert acum_mat0099["aprovados"] == 2
        assert acum_mat0099["total_turmas_suprimidas"] == 1

    def test_sanitize_sigaa_turmas_rn07(self):
        """Turmas do SIGAA com menos de 5 alunos têm seus dados de matriculados suprimidos (RN07)."""
        from app.pipeline.schemas.sigaa import SIGAATurmaClean
        sanitizer = LGPDSanitizer(amostragem_minima=5)
        turmas = [
            SIGAATurmaClean(
                codigo_disciplina="MAT0025",
                slug_disciplina="calculo-1",
                codigo_turma="01",
                semestre="2026.1",
                capacidade=40,
                matriculados=3,  # < 5 alunos
                docentes=["Prof. A"],
            ),
            SIGAATurmaClean(
                codigo_disciplina="MAT0025",
                slug_disciplina="calculo-1",
                codigo_turma="02",
                semestre="2026.1",
                capacidade=40,
                matriculados=25,  # >= 5 alunos
                docentes=["Prof. B"],
            ),
        ]
        res = sanitizer.sanitize_sigaa({"turmas": turmas})
        clean = res["turmas"]
        assert len(clean) == 2
        # Turma com baixa amostragem (< 5) tem matriculados suprimido e flag ativada
        assert clean[0].amostragem_suprimida_lgpd is True
        assert clean[0].matriculados is None
        assert clean[0].capacidade == 40

        # Turma normal mantém dados
        assert clean[1].amostragem_suprimida_lgpd is False
        assert clean[1].matriculados == 25


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
        assert turma["capacidade"] == 80
        assert turma["matriculados"] == 65
        assert turma["local"] == "FCTE - S1"

    def test_extract_input_file_not_found(self):
        from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor
        extractor = SIGAAExtractor()
        with pytest.raises(FileNotFoundError):
            extractor.extract(input_file="arquivo_inexistente_12345.csv")

    def test_extract_from_json_with_docentes(self, tmp_path: Path):
        from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor
        import json
        json_file = tmp_path / "turmas_test.json"
        json_file.write_text(
            json.dumps({
                "turmas": [
                    {
                        "codigo_disciplina": "CIC0004",
                        "nome_disciplina": "APC",
                        "turma": "01",
                        "semestre": "2026.1",
                        "docentes": ["Carla Rocha", "Vinicius Ruela"],
                        "capacidade": 60,
                        "matriculados": 55,
                    }
                ]
            }),
            encoding="utf-8"
        )
        extractor = SIGAAExtractor()
        data = extractor.extract_from_file(json_file, semestre="2026.1")
        assert len(data["turmas"]) == 1
        assert len(data["docentes"]) == 2
        docentes_nomes = [d["nome"] for d in data["docentes"]]
        assert "Carla Rocha" in docentes_nomes
        assert "Vinicius Ruela" in docentes_nomes

    def test_fetch_todos_cursos_parsing_and_slug_uniqueness(self):
        from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor
        html = """
        <table class="listagem">
            <tr><td colspan="7">CIC - DEPTO CIÊNCIAS DA COMPUTAÇÃO</td></tr>
            <tr>
                <td><a href="portal.jsf?id=414599">CIÊNCIA DA COMPUTAÇÃO</a></td>
                <td>Bacharelado</td>
                <td>DIURNO</td>
                <td>BRASÍLIA</td>
            </tr>
            <tr>
                <td><a href="portal.jsf?id=414608">COMPUTAÇÃO</a></td>
                <td>Licenciatura</td>
                <td>NOTURNO</td>
                <td>BRASÍLIA</td>
            </tr>
            <tr><td colspan="7">ADM - DEPTO ADMINISTRAÇÃO</td></tr>
            <tr>
                <td><a href="portal.jsf?id=414112">ADMINISTRAÇÃO</a></td>
                <td>Bacharelado</td>
                <td>DIURNO</td>
                <td>BRASÍLIA</td>
            </tr>
            <tr>
                <td><a href="portal.jsf?id=414099">ADMINISTRAÇÃO</a></td>
                <td>Bacharelado</td>
                <td>NOTURNO</td>
                <td>BRASÍLIA</td>
            </tr>
            <tr><td colspan="7">FCTE - CAMPUS UNB GAMA</td></tr>
            <tr>
                <td><a href="portal.jsf?id=414924">ENGENHARIA DE SOFTWARE</a></td>
                <td>Bacharelado</td>
                <td>DIURNO</td>
                <td>BRASÍLIA</td>
            </tr>
        </table>
        """
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.content = html.encode("iso-8859-1")
        mock_client.get.return_value = mock_resp

        extractor = SIGAAExtractor()
        cursos = extractor.fetch_todos_cursos(mock_client)

        assert len(cursos) == 5
        slugs = [c["slug"] for c in cursos]
        assert len(set(slugs)) == 5  # 100% únicos sem colisões

        # Verifica desambiguação de Administração
        adm_diurno = next(c for c in cursos if c["codigo_sigaa"] == 414112)
        adm_noturno = next(c for c in cursos if c["codigo_sigaa"] == 414099)
        assert adm_diurno["slug"] == "administracao-diurno"
        assert adm_noturno["slug"] == "administracao-noturno"

        # Verifica identificação de campus
        fcte = next(c for c in cursos if c["codigo_sigaa"] == 414924)
        assert fcte["campus"] == "FCTE - Gama"
        cic = next(c for c in cursos if c["codigo_sigaa"] == 414599)
        assert cic["campus"] == "Darcy Ribeiro"

    def test_dpo_extractor_filter_years(self, tmp_path: Path):
        from app.pipeline.extractors.dpo_inep_extractor import DPOINEPExtractor
        import json
        json_file = tmp_path / "metricas_test.json"
        json_file.write_text(
            json.dumps([
                {"codigo_disciplina": "MAT0025", "ano": 2020, "semestre": 1, "matriculados": 50, "aprovados": 40},
                {"codigo_disciplina": "MAT0025", "ano": 2023, "semestre": 1, "matriculados": 60, "aprovados": 50},
                {"codigo_disciplina": "MAT0025", "ano": 2026, "semestre": 1, "matriculados": 70, "aprovados": 60},
            ]),
            encoding="utf-8"
        )
        extractor = DPOINEPExtractor()
        filtered = extractor.extract(ano_inicio=2022, ano_fim=2024, input_file=str(json_file))
        assert len(filtered) == 1
        assert filtered[0]["ano"] == 2023

    def test_dpo_extractor_default_sample_metrics(self):
        from app.pipeline.extractors.dpo_inep_extractor import DPOINEPExtractor
        extractor = DPOINEPExtractor()
        records = extractor.extract(ano_inicio=2024, ano_fim=2024)
        assert len(records) > 0
        codigos = [r.get("codigo_disciplina") for r in records]
        assert "MAT0025" in codigos
        assert "FGA0030" in codigos

    def test_dpo_extractor_file_not_found(self):
        from app.pipeline.extractors.dpo_inep_extractor import DPOINEPExtractor
        extractor = DPOINEPExtractor()
        with pytest.raises(FileNotFoundError):
            extractor.extract(input_file="arquivo_inexistente_99999.csv")

    def test_lgpd_sanitizer_acumulado_geral_rn07(self):
        sanitizer = LGPDSanitizer(amostragem_minima=5)
        metricas = [
            MetricaAcademicaClean(
                codigo_disciplina="MAT0025",
                slug_disciplina="calculo-1",
                ano=2023,
                semestre=1,
                matriculados=3,  # < 5 alunos (suprimido)
                aprovados=2,
                reprovados_nota=1,
                reprovados_falta=0,
                trancamentos=0,
            ),
            MetricaAcademicaClean(
                codigo_disciplina="MAT0025",
                slug_disciplina="calculo-1",
                ano=2023,
                semestre=2,
                matriculados=20,  # >= 5 alunos (normal)
                aprovados=15,
                reprovados_nota=3,
                reprovados_falta=1,
                trancamentos=1,
            ),
        ]
        sanitizadas = sanitizer.sanitize_metricas(metricas)
        # O registro individual de baixa amostragem é removido da saída por privacidade (RN07)
        assert len(sanitizadas) == 1
        assert sanitizadas[0].semestre == 2
        assert sanitizadas[0].matriculados == 20

        # Verifica se o acumulado geral consolidou ambos (RN07)
        acumulado = sanitizer.get_acumulado_geral("MAT0025")
        assert acumulado is not None
        assert acumulado["matriculados"] == 23  # 3 + 20
        assert acumulado["aprovados"] == 17     # 2 + 15
        assert acumulado["total_turmas_suprimidas"] == 1


class TestDatabaseLoader:
    def test_load_turmas_persists_capacidade_matriculados(self):
        from app.pipeline.loaders.db_loader import DatabaseLoader
        from app.pipeline.schemas.sigaa import SIGAATurmaClean
        from app.models.disciplina import Disciplina
        from app.models.turma import Turma
        from app.models.professor import Professor

        mock_db = MagicMock()
        mock_disc = Disciplina(id=1, codigo="MAT0025", slug="calculo-1", nome="Cálculo 1")

        def mock_query(model):
            mock_q = MagicMock()
            if model == Disciplina:
                mock_q.filter.return_value.all.return_value = [mock_disc]
                mock_q.all.return_value = [mock_disc]
            elif model == Turma:
                mock_q.filter.return_value.all.return_value = []
                mock_q.all.return_value = []
            elif model == Professor:
                mock_q.all.return_value = []
            else:
                mock_q.filter.return_value.all.return_value = []
                mock_q.all.return_value = []
            return mock_q

        mock_db.query.side_effect = mock_query

        loader = DatabaseLoader(db_session=mock_db)
        turmas = [
            SIGAATurmaClean(
                codigo_disciplina="MAT0025",
                slug_disciplina="calculo-1",
                codigo_turma="01",
                semestre="2026.1",
                capacidade=60,
                matriculados=45,
            )
        ]
        loaded_count = loader.load_turmas(mock_db, turmas)
        assert loaded_count == 1
        assert mock_db.add.called
        added_turma = mock_db.add.call_args[0][0]
        assert added_turma.capacidade == 60
        assert added_turma.matriculados == 45

    def test_load_turmas_clears_suppressed_matriculados(self):
        from app.pipeline.loaders.db_loader import DatabaseLoader
        from app.pipeline.schemas.sigaa import SIGAATurmaClean
        from app.models.disciplina import Disciplina
        from app.models.turma import Turma
        from app.models.professor import Professor

        mock_db = MagicMock()
        mock_disc = Disciplina(id=1, codigo="MAT0025", slug="calculo-1", nome="Cálculo 1")
        existing_turma = Turma(
            id=10,
            disciplina_id=1,
            codigo_turma="01",
            semestre="2026.1",
            capacidade=40,
            matriculados=30,
        )

        def mock_query(model):
            mock_q = MagicMock()
            if model == Disciplina:
                mock_q.filter.return_value.all.return_value = [mock_disc]
                mock_q.all.return_value = [mock_disc]
            elif model == Turma:
                mock_q.filter.return_value.all.return_value = [existing_turma]
                mock_q.all.return_value = [existing_turma]
            elif model == Professor:
                mock_q.all.return_value = []
            else:
                mock_q.filter.return_value.all.return_value = []
                mock_q.all.return_value = []
            return mock_q

        mock_db.query.side_effect = mock_query

        loader = DatabaseLoader(db_session=mock_db)
        turmas = [
            SIGAATurmaClean(
                codigo_disciplina="MAT0025",
                slug_disciplina="calculo-1",
                codigo_turma="01",
                semestre="2026.1",
                capacidade=40,
                matriculados=None,
                amostragem_suprimida_lgpd=True,
            )
        ]
        loader.load_turmas(mock_db, turmas)
        assert existing_turma.matriculados is None

    def test_load_metricas_deletes_suppressed_records(self):
        from app.pipeline.loaders.db_loader import DatabaseLoader
        from app.pipeline.schemas.metricas import MetricaAcademicaClean
        from app.models.disciplina import Disciplina
        from app.models.metrica import MetricaAcademica

        mock_db = MagicMock()
        mock_disc = Disciplina(id=1, codigo="MAT0025", slug="calculo-1", nome="Cálculo 1")
        existing_metrica = MetricaAcademica(
            id=5,
            disciplina_id=1,
            ano=2024,
            semestre=1,
            matriculados=4,
            aprovados=3,
        )

        def mock_query(model):
            mock_q = MagicMock()
            if model == Disciplina:
                mock_q.filter.return_value.all.return_value = [mock_disc]
                mock_q.all.return_value = [mock_disc]
            elif model == MetricaAcademica:
                mock_q.all.return_value = [existing_metrica]
            return mock_q

        mock_db.query.side_effect = mock_query

        loader = DatabaseLoader(db_session=mock_db)
        suprimidas = [
            MetricaAcademicaClean(
                codigo_disciplina="MAT0025",
                slug_disciplina="calculo-1",
                ano=2024,
                semestre=1,
                matriculados=4,
                aprovados=3,
                reprovados_nota=1,
                reprovados_falta=0,
                trancamentos=0,
                amostragem_suprimida_lgpd=True,
            )
        ]
        loader.load_metricas(mock_db, metricas=[], metricas_suprimidas=suprimidas)
        mock_db.delete.assert_called_once_with(existing_metrica)

    def test_load_metricas_consolidadas(self):
        from app.pipeline.loaders.db_loader import DatabaseLoader
        from app.models.disciplina import Disciplina

        mock_db = MagicMock()
        mock_disc = Disciplina(id=1, codigo="FGA0030", slug="estruturas-de-dados-2", nome="Estruturas de Dados 2")
        mock_db.query.return_value.filter.return_value.all.return_value = [mock_disc]
        mock_db.query.return_value.all.return_value = []

        loader = DatabaseLoader(db_session=mock_db)
        consolidadas = [
            {
                "codigo_disciplina": "FGA0030",
                "matriculados": 48,
                "aprovados": 37,
                "reprovados_nota": 6,
                "reprovados_falta": 3,
                "trancamentos": 2,
                "taxa_aprovacao_acumulada": Decimal("77.08"),
                "total_turmas_suprimidas": 1,
            }
        ]
        loaded_count = loader.load_metricas_consolidadas(mock_db, consolidadas)
        assert loaded_count == 1
        assert mock_db.add.called
        added_mc = mock_db.add.call_args[0][0]
        assert added_mc.disciplina_id == 1
        assert added_mc.matriculados == 48
        assert added_mc.total_turmas_suprimidas == 1

    def test_transform_cursos(self):
        from app.pipeline.transformers.sigaa_transformer import SIGAATransformer

        transformer = SIGAATransformer()
        raw_cursos = [
            {
                "codigo_sigaa": 414924,
                "codigo_mec": "115998",
                "nome": "Engenharia de Software",
                "slug": "engenharia-de-software",
                "campus": "FCTE - Gama",
            },
            {
                "codigo_sigaa": 414924,
                "nome": "Engenharia de Software",
                "slug": "engenharia-de-software",
            },
        ]
        clean_cursos = transformer.transform_cursos(raw_cursos)
        assert len(clean_cursos) == 1
        assert clean_cursos[0].slug == "engenharia-de-software"
        assert clean_cursos[0].codigo_sigaa == 414924

    def test_transform_disciplinas_com_cursos(self):
        from app.pipeline.transformers.sigaa_transformer import SIGAATransformer

        transformer = SIGAATransformer()
        raw_discs = [
            {
                "codigo": "CIC0004",
                "nome": "ALGORITMOS E PROGRAMAÇÃO DE COMPUTADORES",
                "carga_horaria": 90,
                "cursos": [
                    {
                        "curso_slug": "engenharia-de-software",
                        "periodo_sugerido": 1,
                        "is_obrigatoria": True,
                    }
                ],
            }
        ]
        clean_discs = transformer.transform_disciplinas(raw_discs)
        assert len(clean_discs) == 1
        assert clean_discs[0].codigo == "CIC0004"
        assert clean_discs[0].creditos == 6
        assert len(clean_discs[0].cursos) == 1
        assert clean_discs[0].cursos[0].curso_slug == "engenharia-de-software"
        assert clean_discs[0].cursos[0].periodo_sugerido == 1
        assert clean_discs[0].cursos[0].is_obrigatoria is True

    def test_load_cursos_and_cursos_disciplinas(self):
        from app.pipeline.loaders.db_loader import DatabaseLoader
        from app.models.curso import Curso, CursoDisciplina
        from app.models.disciplina import Disciplina
        from app.pipeline.schemas.sigaa import SIGAACursoClean, SIGAADisciplinaClean, SIGAACursoVinculoClean

        mock_db = MagicMock()
        mock_curso = Curso(id=1, slug="engenharia-de-software", nome="Engenharia de Software")
        mock_disc = Disciplina(id=10, codigo="CIC0004", slug="apc", nome="APC")

        def mock_query(model):
            mock_q = MagicMock()
            if model == Curso:
                mock_q.all.return_value = [mock_curso]
            elif model == Disciplina:
                mock_q.filter.return_value.all.return_value = [mock_disc]
                mock_q.all.return_value = [mock_disc]
            elif model == CursoDisciplina:
                mock_q.all.return_value = []
            return mock_q

        mock_db.query.side_effect = mock_query

        loader = DatabaseLoader(db_session=mock_db)
        # 1. Carrega Curso
        cursos = [
            SIGAACursoClean(
                nome="Engenharia de Software",
                slug="engenharia-de-software",
            )
        ]
        assert loader.load_cursos(mock_db, cursos) == 0  # Já existe

        # 2. Carrega Disciplina com vínculo
        discs = [
            SIGAADisciplinaClean(
                codigo="CIC0004",
                slug="apc",
                nome="APC",
                cursos=[
                    SIGAACursoVinculoClean(
                        curso_slug="engenharia-de-software",
                        periodo_sugerido=1,
                        is_obrigatoria=True,
                    )
                ],
            )
        ]
        loader.load_disciplinas(mock_db, discs)
        assert mock_db.add.called
        added_cd = [call[0][0] for call in mock_db.add.call_args_list if isinstance(call[0][0], CursoDisciplina)]
        assert len(added_cd) >= 1
        assert added_cd[0].curso_id == 1
        assert added_cd[0].disciplina_id == 10
        assert added_cd[0].periodo_sugerido == 1
        assert added_cd[0].is_obrigatoria is True

    def test_clean_depto_nome(self):
        from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor
        # Campi
        assert SIGAAExtractor._clean_depto_nome("CAMPUS UNB GAMA: FACULDADE DE CIÊNCIAS E TECNOLOGIAS EM ENGENHARIA - BRASÍLIA") == "FCTE - Gama"
        assert SIGAAExtractor._clean_depto_nome("CAMPUS UNB CEILÂNDIA: FACULDADE DE CIÊNCIAS E TECNOLOGIAS EM SAÚDE - BRASÍLIA") == "FCE - Ceilândia"
        assert SIGAAExtractor._clean_depto_nome("FACULDADE DE PLANALTINA - BRASÍLIA") == "FUP - Planaltina"
        # Darcy e abreviações
        assert SIGAAExtractor._clean_depto_nome("DEPTO CIÊNCIAS DA COMPUTAÇÃO - BRASÍLIA") == "Departamento de Ciências da Computação"
        assert SIGAAExtractor._clean_depto_nome("DEPTO MATEMÁTICA - BRASÍLIA") == "Departamento de Matemática"
        assert SIGAAExtractor._clean_depto_nome("FACULDADE DE DIREITO - BRASÍLIA") == "Faculdade de Direito"
        assert SIGAAExtractor._clean_depto_nome("DECANATO DE ENSINO DE GRADUACAO / DEG - BRASÍLIA") == "Decanato de Ensino de Graduacao / DEG"

    def test_fetch_departamentos_nomes_parsing(self):
        from unittest.mock import MagicMock
        from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor

        html = """
        <select id="formTurma:inputDepto">
            <option value="0">-- SELECIONE --</option>
            <option value="673">CAMPUS UNB GAMA: FACULDADE DE CIÊNCIAS E TECNOLOGIAS EM ENGENHARIA - BRASÍLIA</option>
            <option value="508">DEPTO CIÊNCIAS DA COMPUTAÇÃO - BRASÍLIA</option>
        </select>
        """
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.content = html.encode("utf-8")
        mock_resp.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_resp

        extractor = SIGAAExtractor()
        deptos = extractor.fetch_departamentos_nomes(mock_client)
        assert deptos == {
            673: "FCTE - Gama",
            508: "Departamento de Ciências da Computação",
        }

    def test_transform_docentes_multiplos_departamentos(self):
        from app.pipeline.transformers.sigaa_transformer import SIGAATransformer

        transformer = SIGAATransformer()
        raw_docentes = [
            {"nome": "Prof. Dr. Carla Silva Rocha", "departamento": "FCTE - Gama"},
            {"nome": "carla silva rocha", "departamento": "Departamento de Ciências da Computação"},
        ]
        clean = transformer.transform_docentes(raw_docentes)
        assert len(clean) == 1
        assert clean[0].nome == "Carla Silva Rocha"
        assert clean[0].departamento == "Departamento de Ciências da Computação, FCTE - Gama"

    def test_db_loader_merge_departamentos_docente(self):
        from unittest.mock import MagicMock
        from app.pipeline.loaders.db_loader import DatabaseLoader
        from app.models.professor import Professor
        from app.pipeline.schemas.sigaa import SIGAADocenteClean

        mock_db = MagicMock()
        prof_existente = Professor(id=1, nome="João Silva", departamento="FCTE - Gama")
        mock_db.query.return_value.all.return_value = [prof_existente]

        loader = DatabaseLoader(db_session=mock_db)
        docentes_novos = [
            SIGAADocenteClean(nome="João Silva", departamento="Departamento de Matemática"),
        ]
        loader.load_docentes(mock_db, docentes_novos)

    def test_fetch_detalhes_componente_parsing(self):
        from unittest.mock import MagicMock
        from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor

        html = """
        <table class="visualizacao">
            <tr>
                <th>Código:</th><td>FGA0168</td>
                <th>Nome:</th><td>MÉTODOS DE DESENVOLVIMENTO DE SOFTWARE</td>
            </tr>
            <tr>
                <th>Pré-Requisitos:</th><td>( ( CIC0004 ) OU ( CIC0007 ) )</td>
            </tr>
            <tr>
                <th>Co-Requisitos:</th><td>-</td>
            </tr>
            <tr>
                <th>Equivalências:</th><td>( ( MAT0053 ) )</td>
            </tr>
            <tr>
                <th>Ementa/Descrição:</th><td>Ciclos de vida de software. Metodologias ágeis e tradicionais. Testes automatizados.</td>
            </tr>
        </table>
        <table class="subFormulario">
            <caption>Outros componentes que têm esse componente como pré-requisito</caption>
            <tr><td>FGA0415 - MONITORIA EM ENGENHARIA E AMBIENTE</td></tr>
        </table>
        <table class="subFormulario">
            <caption>Histórico de Pré-Requisitos</caption>
            <tr><td>CIC0001 - INTRODUÇÃO À COMPUTAÇÃO</td></tr>
        </table>
        """
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_client.post.return_value = mock_resp

        extractor = SIGAAExtractor()
        detalhes = extractor.fetch_detalhes_componente(mock_client, "mock_vs", {"btn": "detalhes"})

        assert detalhes["pre_requisitos"] == "( ( CIC0004 ) OU ( CIC0007 ) )"
        assert "FGA0415" not in (detalhes["pre_requisitos"] or "")
        assert "CIC0001" not in (detalhes["pre_requisitos"] or "")
        assert detalhes["co_requisitos"] is None  # "-" foi normalizado para None
        assert detalhes["equivalencias"] == "( ( MAT0053 ) )"
        assert "Ciclos de vida de software" in detalhes["ementa"]

    def test_fetch_detalhes_componente_sem_pre_requisito_ignora_subtabela_falsa(self):
        """Valida que uma matéria com Pré-Requisitos: '-' (ex: FGA0302) não receba monitores ou sub-tabelas."""
        from unittest.mock import MagicMock
        from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor

        html = """
        <table class="visualizacao">
            <tr>
                <th>Código:</th><td>FGA0302</td>
                <th>Nome:</th><td>ENGENHARIA E AMBIENTE</td>
            </tr>
            <tr>
                <th>Pré-Requisitos:</th><td>-</td>
            </tr>
            <tr>
                <th>Co-Requisitos:</th><td>-</td>
            </tr>
            <tr>
                <th>Equivalências:</th><td>-</td>
            </tr>
            <tr>
                <th>Ementa/Descrição:</th><td>I. Conceitos básicos; II. A terra como um sistema.</td>
            </tr>
        </table>
        <table class="subFormulario">
            <caption>Outros componentes que têm esse componente como pré-requisito</caption>
            <tr><td>FGA0415 - MONITORIA EM ENGENHARIA E AMBIENTE</td></tr>
        </table>
        """
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = html
        mock_resp.raise_for_status = MagicMock()
        mock_client.post.return_value = mock_resp

        extractor = SIGAAExtractor()
        detalhes = extractor.fetch_detalhes_componente(mock_client, "mock_vs", {"btn": "detalhes"})

        assert detalhes["pre_requisitos"] is None
        assert detalhes["co_requisitos"] is None
        assert detalhes["equivalencias"] is None
        assert "Conceitos básicos" in detalhes["ementa"]

    def test_propagacao_bidirecional_equivalencias(self):
        """Valida que equivalência entre FGA0161 e FGA0302 seja propagada para ambas as disciplinas."""
        import re

        disciplinas_map = {
            "FGA0161": {"codigo": "FGA0161", "equivalencias": "( FGA0302 )"},
            "FGA0302": {"codigo": "FGA0302", "equivalencias": None},
        }

        for cod_a, disc_a in list(disciplinas_map.items()):
            equiv_a = disc_a.get("equivalencias")
            if equiv_a:
                codigos_b = re.findall(r"\b[A-Z]{3,4}\d{4}\b", equiv_a)
                for cod_b in codigos_b:
                    if cod_b in disciplinas_map and cod_b != cod_a:
                        equiv_b = disciplinas_map[cod_b].get("equivalencias")
                        if not equiv_b:
                            disciplinas_map[cod_b]["equivalencias"] = f"( {cod_a} )"
                        elif cod_a not in equiv_b:
                            disciplinas_map[cod_b]["equivalencias"] = f"{equiv_b} OU ( {cod_a} )"

        assert disciplinas_map["FGA0161"]["equivalencias"] == "( FGA0302 )"
        assert disciplinas_map["FGA0302"]["equivalencias"] == "( FGA0161 )"

    def test_transform_disciplinas_preserva_requisitos_e_natureza(self):
        from app.pipeline.transformers.sigaa_transformer import SIGAATransformer

        transformer = SIGAATransformer()
        raw_discs = [
            {
                "codigo": "FGA0168",
                "nome": "MDS",
                "pre_requisitos": "( ( CIC0004 ) )",
                "co_requisitos": None,
                "equivalencias": "( ( MAT0053 ) )",
                "cursos": [
                    {
                        "curso_slug": "engenharia-de-software",
                        "periodo_sugerido": 3,
                        "is_obrigatoria": True,
                        "natureza": "Obrigatoria",
                    },
                    {
                        "curso_slug": "engenharia-aeroespacial",
                        "periodo_sugerido": None,
                        "is_obrigatoria": False,
                        "natureza": "Optativa",
                    }
                ],
            }
        ]
        clean_discs = transformer.transform_disciplinas(raw_discs)
        assert len(clean_discs) == 1
        d = clean_discs[0]
        assert d.pre_requisitos == "( ( CIC0004 ) )"
        assert d.co_requisitos is None
        assert d.equivalencias == "( ( MAT0053 ) )"
        assert len(d.cursos) == 2
        assert d.cursos[0].natureza == "Obrigatoria"
        assert d.cursos[0].is_obrigatoria is True
        assert d.cursos[1].natureza == "Optativa"
        assert d.cursos[1].is_obrigatoria is False

    def test_db_loader_persists_requisitos_and_natureza(self):
        from app.pipeline.loaders.db_loader import DatabaseLoader
        from app.models.curso import Curso, CursoDisciplina
        from app.models.disciplina import Disciplina
        from app.pipeline.schemas.sigaa import SIGAADisciplinaClean, SIGAACursoVinculoClean

        mock_db = MagicMock()
        mock_curso = Curso(id=1, slug="engenharia-de-software", nome="Engenharia de Software")
        mock_disc = Disciplina(id=10, codigo="FGA0168", slug="mds", nome="MDS")

        def mock_query(model):
            mock_q = MagicMock()
            if model == Curso:
                mock_q.all.return_value = [mock_curso]
            elif model == Disciplina:
                mock_q.filter.return_value.all.return_value = [mock_disc]
                mock_q.all.return_value = [mock_disc]
            elif model == CursoDisciplina:
                mock_q.all.return_value = []
            return mock_q

        mock_db.query.side_effect = mock_query

        loader = DatabaseLoader(db_session=mock_db)
        discs = [
            SIGAADisciplinaClean(
                codigo="FGA0168",
                slug="mds",
                nome="MDS",
                pre_requisitos="( ( CIC0004 ) )",
                co_requisitos=None,
                equivalencias="( ( MAT0053 ) )",
                cursos=[
                    SIGAACursoVinculoClean(
                        curso_slug="engenharia-de-software",
                        periodo_sugerido=3,
                        is_obrigatoria=False,
                        natureza="Optativa",
                    )
                ],
            )
        ]
        loader.load_disciplinas(mock_db, discs)

        # Verifica atualização na Disciplina existente
        assert mock_disc.pre_requisitos == "( ( CIC0004 ) )"
        assert mock_disc.equivalencias == "( ( MAT0053 ) )"

        # Verifica inserção na CursoDisciplina com a natureza correta
        added_cd = [call[0][0] for call in mock_db.add.call_args_list if isinstance(call[0][0], CursoDisciplina)]
        assert len(added_cd) >= 1
        assert added_cd[0].natureza == "Optativa"
        assert added_cd[0].is_obrigatoria is False






