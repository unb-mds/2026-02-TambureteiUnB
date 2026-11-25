from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.schemas.comentario import ComentarioCreate
from app.services.comentario_service import comentario_service


@pytest.mark.parametrize("operacao", ["criar", "listar"])
@pytest.mark.parametrize("disciplina_turma,status_esperado", [(10, None), (20, 422), (None, 404)])
def test_valida_vinculo_entre_turma_e_disciplina(operacao, disciplina_turma, status_esperado):
    turma = SimpleNamespace(id=99, disciplina_id=disciplina_turma) if disciplina_turma else None
    with (
        patch("app.services.comentario_service.disciplina_repo.get_by_id", return_value=SimpleNamespace(id=10)),
        patch("app.services.comentario_service.turma_repo.get_by_id", return_value=turma),
        patch("app.services.comentario_service.comentario_repo.create", side_effect=lambda db, obj: obj) as criar,
        patch(
            "app.services.comentario_service.comentario_repo.listar_por_disciplina_paginado", return_value=([], 0)
        ) as listar,
    ):

        def executar():
            if operacao == "criar":
                return comentario_service.criar_comentario(
                    None,
                    ComentarioCreate(disciplina_id=10, turma_id=99, conteudo="Relato válido"),
                    SimpleNamespace(id=uuid4()),
                )
            return comentario_service.listar_comentarios(None, 10, 99, 1, 20)

        if status_esperado:
            with pytest.raises(HTTPException) as erro:
                executar()
            assert erro.value.status_code == status_esperado
            if status_esperado == 422:
                assert "disciplina" in erro.value.detail.lower()
            criar.assert_not_called()
            listar.assert_not_called()
        else:
            assert executar() is not None


def test_comentario_sem_turma_preserva_fluxo():
    with (
        patch("app.services.comentario_service.disciplina_repo.get_by_id", return_value=SimpleNamespace(id=10)),
        patch("app.services.comentario_service.turma_repo.get_by_id") as turma,
        patch("app.services.comentario_service.comentario_repo.create", side_effect=lambda db, obj: obj),
    ):
        resultado = comentario_service.criar_comentario(
            None, ComentarioCreate(disciplina_id=10, conteudo="Relato sem turma"), SimpleNamespace(id=uuid4())
        )
        assert resultado.turma_id is None
        turma.assert_not_called()
