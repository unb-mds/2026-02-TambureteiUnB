from decimal import Decimal
from io import BytesIO
from unittest.mock import patch

import pytest

from app.services.historico_importacao_service import _calcular_taxas_cem_porcento
from app.services.historico_parser_service import (
    HistoricoParserError,
    parse_historico_pdf,
)


TEXTO_LAYOUT_SIMULADO = """
SIGAA - Sistema Integrado de Gestão de Atividades Acadêmicas
UnB - Universidade de Brasília
Histórico Escolar - Emitido em: 21/11/2026 às 21:23
Nome: ESTUDANTE TESTE
Matrícula: 251037401
Curso: ENGENHARIA DE SOFTWARE/FCTE - BACHARELADO - DIURNO
Status: ATIVO    IRA: 3.9718    MP: 4.0333
Currículo: 6360/2 - 2024.2
Ano / Período Letivo Inicial: 2025.1
Período Letivo Atual: 4    Prazo para Conclusão (Padrão / Máximo): 2029.2 / 2032.2
Componentes Curriculares Cursados/Cursando
Ano/Período Letivo Componente Curricular CH Turma Freq % Nota Situação
2025.1  ENADE  > INGRESSANTE REGULAR NO ENADE  0  --  --  ---  --
2025.1  CIC0004  ALGORITMOS E PROGRAMAÇÃO DE COMPUTADORES  90  11  93,0  MS  APR
Dr. NILTON CORREIA DA SILVA (90h)
2025.1  MAT0025  CÁLCULO 1  90  27  87,0  MI  REP
MSc. WESLEY FERREIRA LOPES (90h)
2025.2  FGA0158  ORIENTAÇÃO A OBJETOS  60  02  100,0  SS  APR
LUCAS URSULINO BOAVENTURA (60h)
2026.1  #  DSC0172  VIGILÂNCIA EPIDEMIOLÓGICA PARTICIPATIVA  30  01  100,0  SS  APR
Dra. LIGIA MARIA CANTARINO DA COSTA (30h), Dr. JONAS LOTUFO BRANT DE CARVALHO (30h)
2026.2  FGA0160  MÉTODOS NUMÉRICOS PARA ENGENHARIA  60  03  --  -  TRANC
Dr. MANUEL NASCIMENTO DIAS BARCELOS JUNIOR (60h)
2026.2  FGA0312  MÉTODOS DE DESENVOLVIMENTO DE SOFTWARE  60  01  100,0  -  MATR
Dra. CARLA SILVA ROCHA AGUIAR (60h)
Legenda
Carga Horária Integralizada/Pendente
Exigido 2985 h 540 h 0 h 3525 h
Integralizado 150 h 30 h 0 h 180 h
Pendente 2835 h 510 h 0 h 3345 h
Componentes Curriculares Obrigatórios Pendentes:2
FGA0160 MÉTODOS NUMÉRICOS PARA ENGENHARIA 60 h
FGA0312 MÉTODOS DE DESENVOLVIMENTO DE SOFTWARE Matriculado 60 h
Para verificar a autenticidade deste documento entre em https://sig.unb.br/sigaa/documentos/ informando a matrícula, data de emissão
e o código de verificação: 30330eba4c
"""


class _FakePage:
    def __init__(self, texto: str):
        self._texto = texto

    def extract_text(self, extraction_mode=None):
        return self._texto


class _FakeReader:
    def __init__(self, texto: str):
        self.pages = [_FakePage(texto)]


def test_parse_historico_pdf_valido():
    with patch("app.services.historico_parser_service.PdfReader", return_value=_FakeReader(TEXTO_LAYOUT_SIMULADO)):
        res = parse_historico_pdf(b"%PDF-1.4 fake-sigaa-bytes")

    assert res.matricula == "251037401"
    assert res.dados_academicos.curso == "ENGENHARIA DE SOFTWARE/FCTE - BACHARELADO - DIURNO"
    assert res.dados_academicos.ira == pytest.approx(3.9718)
    assert res.dados_academicos.mp == pytest.approx(4.0333)
    assert res.dados_academicos.codigo_verificacao == "30330eba4c"
    assert res.carga_horaria.integralizado.total == 180

    assert len(res.cursadas) == 5  # ENADE ignorado; 1 MATR vai para cursando
    assert len(res.cursando) == 1
    assert res.cursando[0].codigo == "FGA0312"
    assert res.cursando[0].situacao == "MATR"

    dsc = next(c for c in res.cursadas if c.codigo == "DSC0172")
    assert dsc.natureza_simbolo == "#"
    assert len(dsc.professores) == 2

    assert len(res.pendentes) == 2
    assert res.pendentes[1].matriculado is True


def test_parse_historico_rejeita_arquivo_nao_pdf():
    with pytest.raises(HistoricoParserError, match="PDF válido"):
        parse_historico_pdf(b"texto comum")


def test_parse_historico_rejeita_documento_sem_sigaa():
    texto_falso = "Documento genérico sem identificação universitária"
    with patch("app.services.historico_parser_service.PdfReader", return_value=_FakeReader(texto_falso)):
        with pytest.raises(HistoricoParserError, match="não reconhecido"):
            parse_historico_pdf(BytesIO(b"%PDF-1.4 fake").read())


def test_parse_historico_rejeita_inconsistencia_carga_horaria():
    texto_adulterado = TEXTO_LAYOUT_SIMULADO.replace(
        "Integralizado 150 h 30 h 0 h 180 h",
        "Integralizado 2900 h 30 h 0 h 2930 h",
    )
    with patch("app.services.historico_parser_service.PdfReader", return_value=_FakeReader(texto_adulterado)):
        with pytest.raises(HistoricoParserError, match="Inconsistência"):
            parse_historico_pdf(b"%PDF-1.4 adulterado")


def test_calcular_taxas_soma_exatamente_cem():
    t1, t2, t3, t4 = _calcular_taxas_cem_porcento(1, 1, 1, 0)
    assert (t1 + t2 + t3 + t4) == Decimal("100.00")
    assert t4 == Decimal("0.00")
