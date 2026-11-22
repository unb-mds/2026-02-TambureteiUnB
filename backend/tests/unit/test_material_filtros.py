from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
from fastapi import HTTPException

from app.services.material_service import MaterialService


def test_categoria_agrupa_resumo_e_dica_no_servidor():
    service = MaterialService(Mock())
    with (
        patch.object(service, "resolver_disciplina", return_value=SimpleNamespace(id=10)),
        patch("app.services.material_service.material_repo.listar_ativos", return_value=([], 0)) as repo,
    ):
        resultado = service.listar(None, "calculo", "  resumo  ", 2, 20, tipos=[" resumo ", "DICA", "RESUMO"])
        assert resultado.pagina == 2
        assert repo.call_args.kwargs["tipos"] == ["DICA", "RESUMO"]
        assert repo.call_args.args[2] == "resumo"


@pytest.mark.parametrize("tipo,tipos", [(None, ["INVALIDO"]), ("ARQUIVO", ["DICA"])])
def test_filtros_invalidos_nao_consultam_repositorio(tipo, tipos):
    service = MaterialService(Mock())
    with (
        patch.object(service, "resolver_disciplina", return_value=SimpleNamespace(id=10)),
        patch("app.services.material_service.material_repo.listar_ativos") as repo,
    ):
        with pytest.raises(HTTPException) as erro:
            service.listar(None, 10, None, 1, 20, tipo=tipo, tipos=tipos)
        assert erro.value.status_code == 422
        repo.assert_not_called()
