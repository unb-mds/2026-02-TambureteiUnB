import pytest
from pydantic import ValidationError

from app.api.schemas.denuncia import DecisaoDenuncia, DenunciaCreate


def test_denuncia_create_valida_comentario_ou_material():
    d1 = DenunciaCreate(
        comentario_id=10,
        categoria="OFENSA_DOCENTE",
        motivo="  Comentário contém ataque pessoal contra o professor da disciplina.  ",
    )
    assert d1.comentario_id == 10
    assert d1.conteudo_id is None
    assert d1.categoria == "OFENSA_DOCENTE"
    assert d1.motivo == "Comentário contém ataque pessoal contra o professor da disciplina."

    d2 = DenunciaCreate(
        material_id=25,
        categoria="GABARITO_ATIVO",
        motivo="Arquivo contém resolução de atividade avaliativa vigente.",
    )
    assert d2.conteudo_id == 25
    assert d2.comentario_id is None


@pytest.mark.parametrize(
    "payload,TrechoErro",
    [
        (
            {"motivo": "Motivo válido com mais de cinco letras"},
            "Informe exatamente um alvo",
        ),
        (
            {"comentario_id": 1, "conteudo_id": 2, "motivo": "Motivo válido com mais de cinco letras"},
            "Informe exatamente um alvo",
        ),
        (
            {"comentario_id": 1, "material_id": 2, "motivo": "Motivo válido com mais de cinco letras"},
            "Informe exatamente um alvo",
        ),
        (
            {"comentario_id": 0, "motivo": "Motivo válido"},
            "identificador do alvo deve ser positivo",
        ),
        (
            {"comentario_id": 1, "motivo": "abc"},
            "mínimo 5 caracteres",
        ),
        (
            {"comentario_id": 1, "motivo": "x" * 1001},
            "máximo 1000 caracteres",
        ),
        (
            {"comentario_id": 1, "categoria": "INVALIDA", "motivo": "Motivo válido"},
            "Categoria de denúncia inválida",
        ),
    ],
)
def test_denuncia_create_rejeita_payloads_invalidos(payload, TrechoErro):
    with pytest.raises(ValidationError) as exc_info:
        DenunciaCreate(**payload)
    assert TrechoErro in str(exc_info.value)


@pytest.mark.parametrize(
    "acao,justificativa,acao_normalizada",
    [
        ("EXCLUIR_CONTEUDO", "  Violação direta da RN04. ", "EXCLUIR_CONTEUDO"),
        ("DESCARTAR_DENUNCIA", None, "DESCARTAR_DENUNCIA"),
        ("REMOVER", "Conteúdo impróprio", "EXCLUIR_CONTEUDO"),
        ("APROVAR", "   ", "DESCARTAR_DENUNCIA"),
    ],
)
def test_decisao_denuncia_valida_acoes(acao, justificativa, acao_normalizada):
    decisao = DecisaoDenuncia(acao=acao, justificativa=justificativa)
    assert decisao.acao == acao_normalizada
    if justificativa and justificativa.strip():
        assert decisao.justificativa == justificativa.strip()
    else:
        assert decisao.justificativa is None


@pytest.mark.parametrize(
    "payload",
    [
        {"acao": "PENDENTE"},
        {"acao": "EXCLUIR_CONTEUDO", "justificativa": "x" * 1001},
        {"acao": "EXCLUIR_CONTEUDO", "moderador_id": "forjado"},
    ],
)
def test_decisao_denuncia_rejeita_invalidos(payload):
    with pytest.raises(ValidationError):
        DecisaoDenuncia(**payload)
