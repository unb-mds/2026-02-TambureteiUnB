import pytest

from app.domain.denuncias import (
    LIMIAR_OCULTACAO_DENUNCIAS,
    MOTIVO_MAX_CARACTERES,
    MOTIVO_MIN_CARACTERES,
    analisar_risco_rn04,
    atingiu_limiar_ocultacao,
    determinar_transicao_moderacao,
    normalizar_justificativa_decisao,
    normalizar_motivo_denuncia,
    validar_categoria_denuncia,
)


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("OFENSA_DOCENTE", "OFENSA_DOCENTE"),
        ("  ofensa_docente ", "OFENSA_DOCENTE"),
        ("CONTEUDO_IMPROPRIO", "CONTEUDO_IMPROPRIO"),
        ("GABARITO_ATIVO", "GABARITO_ATIVO"),
        ("SPAM", "SPAM"),
        ("OUTRO", "OUTRO"),
    ],
)
def test_validar_categoria_denuncia_aceita_valores_validos(entrada, esperado):
    assert validar_categoria_denuncia(entrada) == esperado


@pytest.mark.parametrize("entrada", ["", "   ", "INVALIDA", None, 123])
def test_validar_categoria_denuncia_rejeita_valores_invalidos(entrada):
    with pytest.raises(ValueError, match="Categoria de denúncia inválida"):
        validar_categoria_denuncia(entrada)  # type: ignore[arg-type]


def test_normalizar_motivo_denuncia_limites_exatos():
    minimo = "a" * MOTIVO_MIN_CARACTERES
    maximo = "b" * MOTIVO_MAX_CARACTERES
    assert normalizar_motivo_denuncia(f"  {minimo}  ") == minimo
    assert normalizar_motivo_denuncia(maximo) == maximo


@pytest.mark.parametrize(
    "entrada,mensagem",
    [
        (None, "obrigatório"),
        ("", "obrigatório"),
        ("   ", "obrigatório"),
        ("abcd", "mínimo 5 caracteres"),
        ("x" * (MOTIVO_MAX_CARACTERES + 1), "máximo 1000 caracteres"),
    ],
)
def test_normalizar_motivo_denuncia_rejeita_invalidos(entrada, mensagem):
    with pytest.raises(ValueError, match=mensagem):
        normalizar_motivo_denuncia(entrada)


def test_normalizar_justificativa_decisao():
    assert normalizar_justificativa_decisao(None) is None
    assert normalizar_justificativa_decisao("") is None
    assert normalizar_justificativa_decisao("   ") is None
    assert normalizar_justificativa_decisao("  Violação da RN04 confirmada. ") == "Violação da RN04 confirmada."
    limite = "j" * 1000
    assert normalizar_justificativa_decisao(limite) == limite
    with pytest.raises(ValueError, match="máximo 1000 caracteres"):
        normalizar_justificativa_decisao("j" * 1001)


def test_atingiu_limiar_ocultacao_fronteiras():
    assert LIMIAR_OCULTACAO_DENUNCIAS == 3
    assert atingiu_limiar_ocultacao(0) is False
    assert atingiu_limiar_ocultacao(1) is False
    assert atingiu_limiar_ocultacao(2) is False
    assert atingiu_limiar_ocultacao(3) is True
    assert atingiu_limiar_ocultacao(4) is True
    assert atingiu_limiar_ocultacao(2, limiar=2) is True
    assert atingiu_limiar_ocultacao(1, limiar=2) is False


@pytest.mark.parametrize(
    "total,limiar",
    [
        (-1, 3),
        (1, 0),
        (1, -2),
        (True, 3),
        (1, False),
    ],
)
def test_atingiu_limiar_ocultacao_rejeita_parametros_invalidos(total, limiar):
    with pytest.raises(ValueError):
        atingiu_limiar_ocultacao(total, limiar)


def test_analisar_risco_rn04_identifica_categoria_e_termos_ofensivos():
    prioridade, sinais = analisar_risco_rn04("Relato sobre a prova final.", "OFENSA_DOCENTE")
    assert prioridade is True
    assert "CATEGORIA_OFENSA_DOCENTE" in sinais

    prioridade_termo, sinais_termo = analisar_risco_rn04(
        "Esse docente é incompetente e humilha a turma.", "OUTRO"
    )
    assert prioridade_termo is True
    assert "TERMO_DEPRECIATIVO_RN04:incompetente" in sinais_termo
    assert "TERMO_DEPRECIATIVO_RN04:humilha" in sinais_termo

    prioridade_limpo, sinais_limpo = analisar_risco_rn04(
        "A lista 3 cobra bastante recursão e árvores balanceadas.", "OUTRO"
    )
    assert prioridade_limpo is False
    assert sinais_limpo == []


@pytest.mark.parametrize(
    "acao,tipo_alvo,esperado",
    [
        (
            "EXCLUIR_CONTEUDO",
            "COMENTARIO",
            {"status_denuncia": "PROCEDENTE", "status_moderacao": "OCULTO", "status_curadoria": ""},
        ),
        (
            "REMOVER",
            "COMENTARIO",
            {"status_denuncia": "PROCEDENTE", "status_moderacao": "OCULTO", "status_curadoria": ""},
        ),
        (
            "DESCARTAR_DENUNCIA",
            "COMENTARIO",
            {"status_denuncia": "DESCARTADA", "status_moderacao": "PUBLICADO", "status_curadoria": ""},
        ),
        (
            "APROVAR",
            "COMENTARIO",
            {"status_denuncia": "DESCARTADA", "status_moderacao": "PUBLICADO", "status_curadoria": ""},
        ),
        (
            "EXCLUIR_CONTEUDO",
            "MATERIAL",
            {"status_denuncia": "PROCEDENTE", "status_moderacao": "excluido", "status_curadoria": "RECUSADO"},
        ),
        (
            "DESCARTAR_DENUNCIA",
            "MATERIAL",
            {"status_denuncia": "DESCARTADA", "status_moderacao": "ativo", "status_curadoria": "APROVADO"},
        ),
    ],
)
def test_determinar_transicao_moderacao(acao, tipo_alvo, esperado):
    assert determinar_transicao_moderacao(acao, tipo_alvo) == esperado


@pytest.mark.parametrize(
    "acao,tipo_alvo",
    [
        ("INVALIDA", "COMENTARIO"),
        ("EXCLUIR_CONTEUDO", "INVALIDO"),
        ("", "COMENTARIO"),
    ],
)
def test_determinar_transicao_moderacao_rejeita_entradas_invalidas(acao, tipo_alvo):
    with pytest.raises(ValueError):
        determinar_transicao_moderacao(acao, tipo_alvo)
