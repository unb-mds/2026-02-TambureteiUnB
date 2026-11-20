import pytest
from app.pipeline.extractors.dpo_anuario_extractor import (
    DPOAnuarioExtractor,
    clean_int,
    normalize_text,
)


class TestDPOAnuarioExtractor:
    def test_clean_int(self):
        assert clean_int("1.193") == 1193
        assert clean_int(" 255 ") == 255
        assert clean_int(None) == 0
        assert clean_int("-") == 0
        assert clean_int("0") == 0
        assert clean_int("12.345.678") == 12345678

    def test_normalize_text(self):
        assert normalize_text("Administração") == "administracao"
        assert normalize_text("Ciências Contábeis - Noturno") == "cienciascontabeisnoturno"
        assert normalize_text("Engenharia de Software (FGA)") == "engenhariadesoftwarefga"

    def test_parse_course_row_label(self):
        nome, grau, turno = DPOAnuarioExtractor.parse_course_row_label("Administração (B - Integral)")
        assert nome == "Administração"
        assert grau == "B"
        assert turno == "Integral"

        nome, grau, turno = DPOAnuarioExtractor.parse_course_row_label("Engenharia (ABI - Integral)")
        assert nome == "Engenharia"
        assert grau == "ABI"
        assert turno == "Integral"

        nome, grau, turno = DPOAnuarioExtractor.parse_course_row_label("Ciências Contábeis (B - Noturno)")
        assert nome == "Ciências Contábeis"
        assert grau == "B"
        assert turno == "Noturno"

        nome, grau, turno = DPOAnuarioExtractor.parse_course_row_label("Pedagogia (L - A Distância)")
        assert nome == "Pedagogia"
        assert grau == "L"
        assert turno == "A Distância"

        nome, grau, turno = DPOAnuarioExtractor.parse_course_row_label("Faculdade de Tecnologia - FT")
        assert nome is None
        assert grau is None
        assert turno is None

    def test_parse_html_tables(self):
        sample_html = """
        <html>
            <caption>3.1 Dados e características dos cursos de graduação</caption>
            <table>
                <tr><td>Administração (B - Integral)</td><td>ADM</td><td>1º/1962</td><td>P. SERES</td><td>19/10/2020</td><td>3000</td></tr>
            </table>

            <caption>3.2 Ingresso nos cursos de graduação pelo vestibular</caption>
            <table>
                <tr><td>Administração (B - Integral)</td><td>49</td><td>0</td><td>51</td><td>32</td><td>0</td><td>71</td><td>0</td><td>2</td><td>255</td></tr>
            </table>

            <caption>3.4 Ingresso de alunos e número de formados nos cursos</caption>
            <table>
                <tr><td>Administração (B - Integral)</td><td>133</td><td>122</td><td>255</td><td>77</td><td>101</td><td>178</td></tr>
            </table>

            <caption>3.12 Alunos regulares ativos e com trancamento geral</caption>
            <table>
                <tr>
                    <td>Administração (B - Integral)</td>
                    <td>530</td><td>627</td><td>543</td><td>650</td>
                    <td>19</td><td>31</td><td>23</td><td>35</td>
                    <td>549</td><td>658</td><td>566</td><td>685</td>
                </tr>
            </table>

            <caption>3.16 Movimentação dos alunos nos cursos de graduação</caption>
            <table>
                <tr>
                    <td>Administração (B - Integral)</td>
                    <td>1.208</td><td>1.251</td>
                    <td>20</td><td>15</td>
                    <td>14</td><td>15</td>
                    <td>1.272</td><td>1.251</td>
                </tr>
            </table>
        </html>
        """
        extractor = DPOAnuarioExtractor()
        data = extractor.parse_html_tables(sample_html)

        key = ("Administração", "Integral")
        assert key in data
        item = data[key]
        assert item["ingressantes"] == 255
        assert item["concluintes"] == 178
        # Ativos 2º sem = 543 + 650 = 1193
        assert item["matriculados"] == 1193
        # Trancados 2º sem = 23 + 35 = 58
        assert item["trancados"] == 58
        # Abandono + Outros = (20 + 15) + (14 + 15) = 64
        assert item["desvinculados"] == 64
        assert item["carga_horaria"] == 3000

    def test_match_with_database_courses_strict_turno(self):
        dpo_data = {
            ("Administração", "Integral"): {
                "ingressantes": 255,
                "concluintes": 178,
                "matriculados": 1193,
                "trancados": 58,
                "desvinculados": 64,
                "vagas_totais": 255,
                "inscritos_total": 0,
            },
            ("Administração", "Noturno"): {
                "ingressantes": 0,
                "concluintes": 0,
                "matriculados": 0,
                "trancados": 0,
                "desvinculados": 0,
                "vagas_totais": 0,
                "inscritos_total": 0,
            },
            ("Pedagogia", "A Distância"): {
                "ingressantes": 10,
                "concluintes": 8,
                "matriculados": 50,
                "trancados": 2,
                "desvinculados": 1,
                "vagas_totais": 10,
                "inscritos_total": 0,
            },
        }

        mock_db_courses = [
            {"id": 1, "nome": "Administração", "slug": "administracao-diurno", "turno": "Diurno", "modalidade": "Presencial"},
            {"id": 2, "nome": "Administração", "slug": "administracao-noturno", "turno": "Noturno", "modalidade": "Presencial"},
            {"id": 3, "nome": "Pedagogia", "slug": "pedagogia-diurno", "turno": "Diurno", "modalidade": "Presencial"},
            {"id": 4, "nome": "Pedagogia", "slug": "pedagogia-ead", "turno": "A Distância", "modalidade": "A Distância"},
        ]

        extractor = DPOAnuarioExtractor()
        matched = extractor.match_with_database_courses(dpo_data, mock_db_courses, ano=2024)

        matched_by_slug = {m["curso_slug"]: m for m in matched}
        assert "administracao-diurno" in matched_by_slug
        assert matched_by_slug["administracao-diurno"]["matriculados"] == 1193
        assert matched_by_slug["administracao-diurno"]["concluintes"] == 178
        assert matched_by_slug["administracao-diurno"]["taxa_sucesso"] == 69.80  # 178 / 255 * 100

        assert "administracao-noturno" in matched_by_slug
        assert matched_by_slug["administracao-noturno"]["matriculados"] == 0

        # Pedagogia EaD deve mapear para o curso EaD e não colidir com o Diurno
        assert "pedagogia-ead" in matched_by_slug
        assert matched_by_slug["pedagogia-ead"]["matriculados"] == 50
        assert "pedagogia-diurno" not in matched_by_slug

    def test_year_urls_mapping(self):
        extractor = DPOAnuarioExtractor()
        assert extractor.YEAR_URLS[2024] == "https://anuariounb2025.netlify.app/grad.html"
        assert extractor.YEAR_URLS[2023] == "https://anuario2024.netlify.app/grad.html"
        assert extractor.YEAR_URLS[2022] == "https://anuario2023.netlify.app/grad.html"
        assert extractor.YEAR_URLS[2021] == "https://anuario2022.netlify.app/grad.html"
        assert extractor.YEAR_URLS[2020] == "https://anuario2021.netlify.app/grad.html"

    def test_curso_metricas_historicas_property(self):
        from unittest.mock import MagicMock
        from app.models.curso import Curso

        curso = Curso(id=1, nome="Administração", slug="administracao-diurno")
        m2024 = MagicMock(ano=2024, matriculados=1193)
        m2023 = MagicMock(ano=2023, matriculados=1185)
        m2022 = MagicMock(ano=2022, matriculados=1150)
        curso.metricas = [m2022, m2024, m2023]

        historicas = curso.metricas_historicas
        assert len(historicas) == 3
        assert [m.ano for m in historicas] == [2024, 2023, 2022]
        assert curso.metricas_recentes.ano == 2024
        assert curso.metricas_2024.ano == 2024
