import pytest
from pydantic import TypeAdapter, ValidationError
from app.api.schemas.material import TituloMaterial


@pytest.mark.parametrize("titulo", ["", "   ", "x" * 201])
def test_titulo_em_portugues(titulo):
    with pytest.raises(ValidationError) as error:
        TypeAdapter(TituloMaterial).validate_python(titulo)
    assert error.value.errors()[0]["msg"] == "O título deve conter entre 1 e 200 caracteres."
