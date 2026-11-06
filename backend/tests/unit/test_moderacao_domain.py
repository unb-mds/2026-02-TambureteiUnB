"""Testes unitarios de dominio puro e contratos para moderacao autonoma hibrida (Ollama)."""
import json

import pytest
from pydantic import ValidationError

from app.api.schemas.curadoria import DecisaoComentarioCuradoria
from app.domain.moderacao import (
    LIMIAR_CONFIANCA_PADRAO,
    MAX_CARACTERES_PDF,
    VereditoModIA,
    construir_prompt_comentario,
    construir_prompt_material,
    interpretar_resposta_ollama,
    resolver_moderacao_comentario,
    resolver_moderacao_material,
    truncar_texto_pdf,
    validar_limiar_confianca,
)


def test_constantes_padrao():
    assert LIMIAR_CONFIANCA_PADRAO == 0.80
    assert MAX_CARACTERES_PDF == 8000


@pytest.mark.parametrize("valor,esperado", [(0.0, 0.0), (0.8, 0.8), (1.0, 1.0), (1, 1.0), (0, 0.0)])
def test_validar_limiar_confianca_valido(valor, esperado):
    assert validar_limiar_confianca(valor) == esperado


@pytest.mark.parametrize("invalido", [-0.01, 1.01, True, False, "0.8", None])
def test_validar_limiar_confianca_invalido(invalido):
    with pytest.raises(ValueError, match="limiar de confianca"):
        validar_limiar_confianca(invalido)


def test_truncar_texto_pdf_limites_exatos():
    assert truncar_texto_pdf("  texto   com   espacos \n\n extras  ", limite=100) == "texto com espacos extras"
    exato = "a" * 20
    assert truncar_texto_pdf(exato, limite=20) == exato
    acima = "a" * 21
    assert truncar_texto_pdf(acima, limite=20) == ("a" * 20) + "..."
    assert truncar_texto_pdf("", limite=10) == ""
    with pytest.raises(ValueError, match="positivo"):
        truncar_texto_pdf("abc", limite=0)
    with pytest.raises(ValueError, match="positivo"):
        truncar_texto_pdf("abc", limite=-5)


def test_construir_prompt_comentario():
    mensagens = construir_prompt_comentario(
        "  Excelente explicacao de ponteiros em APC!  ",
        topico="Ponteiros",
        autor_alias="Aluno FCTE",
    )
    assert len(mensagens) == 2
    assert mensagens[0]["role"] == "system"
    assert "RN01" in mensagens[0]["content"]
    assert mensagens[1]["role"] == "user"
    assert "COMENTARIO ACADEMICO" in mensagens[1]["content"]
    assert "Aluno FCTE" in mensagens[1]["content"]
    assert "Ponteiros" in mensagens[1]["content"]
    assert "Excelente explicacao de ponteiros em APC!" in mensagens[1]["content"]

    padrao = construir_prompt_comentario("Duvida sobre listas", topico=None, autor_alias=None)
    assert "Estudante Anonimo" in padrao[1]["content"]
    assert "Geral" in padrao[1]["content"]

    with pytest.raises(ValueError, match="vazio"):
        construir_prompt_comentario("   ")


def test_construir_prompt_material():
    mensagens = construir_prompt_material(
        titulo="Resumo de Calculo 1",
        tipo="RESUMO",
        formato="pdf",
        texto_extraido="Limites e derivadas fundamentais.",
    )
    assert len(mensagens) == 2
    assert mensagens[0]["role"] == "system"
    assert "MATERIAL DE APOIO (RESUMO)" in mensagens[1]["content"]
    assert "Formato do arquivo: PDF" in mensagens[1]["content"]
    assert "Resumo de Calculo 1" in mensagens[1]["content"]
    assert "Limites e derivadas fundamentais." in mensagens[1]["content"]

    sem_texto = construir_prompt_material("Mapa mental", "DICA", "png", texto_extraido="")
    assert "[Sem texto extraido; analise baseada em imagem/metadados]" in sem_texto[1]["content"]

    with pytest.raises(ValueError, match="titulo"):
        construir_prompt_material("   ", "ARQUIVO", "pdf")


def test_interpretar_resposta_ollama_valida_e_invalida():
    payload = json.dumps({
        "decisao": "APROVAR",
        "confianca": 0.92,
        "categoria_violacao": "NENHUMA",
        "motivo": "  Conteudo estritamente academico e sem dados pessoais.  ",
    })
    veredito = interpretar_resposta_ollama(payload)
    assert veredito.decisao == "APROVAR"
    assert veredito.confianca == 0.92
    assert veredito.categoria_violacao == "NENHUMA"
    assert veredito.motivo == "Conteudo estritamente academico e sem dados pessoais."

    with pytest.raises(ValueError, match="vazia"):
        interpretar_resposta_ollama("   ")
    with pytest.raises(ValueError, match="malformado"):
        interpretar_resposta_ollama("{json_invalido")
    with pytest.raises(ValueError, match="objeto JSON"):
        interpretar_resposta_ollama("[1, 2, 3]")
    with pytest.raises(ValueError, match="Schema de veredito invalido"):
        interpretar_resposta_ollama(json.dumps({"decisao": "INVALIDO", "confianca": 1.5, "motivo": ""}))


def test_resolver_moderacao_comentario_tres_estados_e_fronteiras():
    # 1. Fallback quando Ollama esta offline (veredito=None)
    fallback = resolver_moderacao_comentario(None)
    assert fallback.status_final == "PENDENTE"
    assert fallback.confianca_ia is None
    assert fallback.moderado_por is None
    assert fallback.registrar_curadoria_ia is False
    assert "indisponivel" in fallback.motivo_moderacao

    # 2. Aprovacao automatica no limite exato (0.80)
    aprovado = resolver_moderacao_comentario(
        VereditoModIA(decisao="APROVAR", confianca=0.80, categoria_violacao="NENHUMA", motivo="Relato util."),
        limiar_confianca=0.80,
    )
    assert aprovado.status_final == "PUBLICADO"
    assert aprovado.confianca_ia == 0.80
    assert aprovado.moderado_por == "IA"
    assert aprovado.motivo_moderacao == "Relato util."

    # 3. Escalonamento humano imediatamente abaixo do limiar (0.799)
    abaixo = resolver_moderacao_comentario(
        VereditoModIA(decisao="APROVAR", confianca=0.799, categoria_violacao="NENHUMA", motivo="Duvida."),
        limiar_confianca=0.80,
    )
    assert abaixo.status_final == "PENDENTE"
    assert abaixo.confianca_ia == 0.799
    assert abaixo.moderado_por is None
    assert "[Escalonado pela IA (NENHUMA)]" in abaixo.motivo_moderacao

    # 4. Rejeicao automatica por ofensa com alta confianca
    oculto = resolver_moderacao_comentario(
        VereditoModIA(
            decisao="REJEITAR",
            confianca=0.95,
            categoria_violacao="OFENSA_DIFAMACAO",
            motivo="Linguagem ofensiva contra docente.",
        ),
        limiar_confianca=0.80,
    )
    assert oculto.status_final == "OCULTO"
    assert oculto.confianca_ia == 0.95
    assert oculto.moderado_por == "IA"
    assert "[OFENSA_DIFAMACAO]" in oculto.motivo_moderacao

    # 5. Pedido explicito de revisao humana mesmo com alta confianca
    revisao = resolver_moderacao_comentario(
        VereditoModIA(
            decisao="REVISAO_HUMANA",
            confianca=0.91,
            categoria_violacao="GABARITO_VIGENTE",
            motivo="Possivel resolucao de lista ativa.",
        ),
        limiar_confianca=0.80,
    )
    assert revisao.status_final == "PENDENTE"
    assert revisao.moderado_por is None

    # 6. Inconsistencia (APROVAR mas com categoria de violacao diferente de NENHUMA)
    inconsistente = resolver_moderacao_comentario(
        VereditoModIA(
            decisao="APROVAR",
            confianca=0.90,
            categoria_violacao="LGPD_DADOS_PESSOAIS",
            motivo="Contem matricula.",
        ),
        limiar_confianca=0.80,
    )
    assert inconsistente.status_final == "PENDENTE"
    assert inconsistente.moderado_por is None
    assert "[Inconsistencia IA" in inconsistente.motivo_moderacao


def test_resolver_moderacao_material_tres_estados_e_fronteiras():
    # 1. Fallback offline
    fallback = resolver_moderacao_material(None, motivo_fallback="Timeout no Ollama.")
    assert fallback.status_final == "PENDENTE"
    assert fallback.status_moderacao_arquivo == "em_analise"
    assert fallback.confianca_ia is None
    assert fallback.moderado_por is None
    assert fallback.registrar_curadoria_ia is False
    assert fallback.motivo_moderacao == "Timeout no Ollama."

    # 2. Aprovacao automatica de arquivo (confianca >= 0.80)
    aprovado = resolver_moderacao_material(
        VereditoModIA(decisao="APROVAR", confianca=0.85, categoria_violacao="NENHUMA", motivo="Lista de exercicios valida."),
        limiar_confianca=0.80,
    )
    assert aprovado.status_final == "APROVADO"
    assert aprovado.status_moderacao_arquivo == "ativo"
    assert aprovado.moderado_por == "IA"
    assert aprovado.registrar_curadoria_ia is True

    # 3. Retencao automatica de arquivo com dados pessoais (LGPD - RN01/RN06)
    recusado = resolver_moderacao_material(
        VereditoModIA(
            decisao="REJEITAR",
            confianca=0.93,
            categoria_violacao="LGPD_DADOS_PESSOAIS",
            motivo="Prova escaneada com nome e matricula do aluno no cabecalho.",
        ),
        limiar_confianca=0.80,
    )
    assert recusado.status_final == "RECUSADO"
    assert recusado.status_moderacao_arquivo == "bloqueado"
    assert recusado.moderado_por == "IA"
    assert recusado.registrar_curadoria_ia is True
    assert "[LGPD_DADOS_PESSOAIS]" in recusado.motivo_moderacao

    # 4. Baixa confianca escalona para fila humana sem registrar curadoria final
    escalonado = resolver_moderacao_material(
        VereditoModIA(decisao="REJEITAR", confianca=0.60, categoria_violacao="DIREITOS_AUTORAIS", motivo="Trecho longo."),
        limiar_confianca=0.80,
    )
    assert escalonado.status_final == "PENDENTE"
    assert escalonado.status_moderacao_arquivo == "em_analise"
    assert escalonado.moderado_por is None
    assert escalonado.registrar_curadoria_ia is False

    # 5. Inconsistencia (APROVAR com violacao)
    inconsistente = resolver_moderacao_material(
        VereditoModIA(decisao="APROVAR", confianca=0.95, categoria_violacao="SPAM_IRRELEVANTE", motivo="Propaganda."),
        limiar_confianca=0.80,
    )
    assert inconsistente.status_final == "PENDENTE"
    assert inconsistente.status_moderacao_arquivo == "em_analise"
    assert inconsistente.registrar_curadoria_ia is False


def test_schema_decisao_comentario_curadoria():
    aprovado = DecisaoComentarioCuradoria(status="PUBLICADO")
    assert aprovado.status == "PUBLICADO"
    assert aprovado.justificativa is None

    oculto = DecisaoComentarioCuradoria(status="OCULTO", justificativa="  Violacao de conduta.  ")
    assert oculto.status == "OCULTO"
    assert oculto.justificativa == "Violacao de conduta."

    with pytest.raises(ValidationError):
        DecisaoComentarioCuradoria(status="OCULTO", justificativa="   ")
    with pytest.raises(ValidationError):
        DecisaoComentarioCuradoria(status="PENDENTE")
    with pytest.raises(ValidationError):
        DecisaoComentarioCuradoria(status="PUBLICADO", justificativa="x" * 1001)
