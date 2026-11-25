import pytest
from pydantic import ValidationError
from app.api.schemas.relato_bug import RelatoBugCreate, DecisaoRelatoBug


@pytest.mark.parametrize(
    "field,value",
    [
        ("titulo", "x" * 121),
        ("descricao", "x" * 3001),
        ("pagina", "//site.com"),
        ("pagina", "/perfil#dados"),
        ("pagina", "/perfil\\dados"),
    ],
)
def test_limites_e_pagina_privada(field, value):
    data = dict(titulo="Problema na grade", descricao="Não consigo baixar a grade.", pagina="/minha-grade")
    with pytest.raises(ValidationError):
        RelatoBugCreate(**{**data, field: value})


def test_remove_espacos_e_preserva_texto():
    result = RelatoBugCreate(
        titulo="  Problema na grade  ", descricao="  Não consigo baixar a grade.  ", pagina="/minha-grade"
    )
    assert result.titulo == "Problema na grade"
    assert result.descricao == "Não consigo baixar a grade."
    assert DecisaoRelatoBug(status="RESOLVIDO", justificativa="  ").justificativa is None


def test_justificativa_longa_rejeitada():
    with pytest.raises(ValidationError):
        DecisaoRelatoBug(status="DESCARTADO", justificativa="x" * 1001)
