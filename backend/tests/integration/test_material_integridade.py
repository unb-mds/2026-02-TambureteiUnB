"""Restrições reais do PostgreSQL e preservação das contribuições."""
import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Conteudo


def material_valido(disciplina_id, usuario_id=None, **alteracoes):
    dados = dict(disciplina_id=disciplina_id, usuario_id=usuario_id, titulo="Resumo",
                 caminho_arquivo="a" * 32 + ".pdf", formato="pdf", tamanho_bytes=10)
    dados.update(alteracoes)
    return Conteudo(tipo="ARQUIVO", status_curadoria="APROVADO", status_moderacao=dados.pop("status_moderacao", "ativo"), **dados)


@pytest.mark.parametrize("alteracoes", [
    {"formato": "exe"}, {"tamanho_bytes": 0}, {"titulo": "   "},
    {"status_moderacao": "invalido"}, {"disciplina_id": 2147483647},
])
def test_banco_rejeita_metadados_invalidos(db, disciplina, alteracoes):
    dados = {"disciplina_id": disciplina.id, **alteracoes}
    with pytest.raises(IntegrityError), db.begin_nested():
        db.add(material_valido(**dados))
        db.flush()


def test_banco_impede_caminho_duplicado(db, disciplina):
    db.add(material_valido(disciplina.id))
    db.flush()
    with pytest.raises(IntegrityError), db.begin_nested():
        db.add(material_valido(disciplina.id))
        db.flush()


def test_exclusao_fisica_do_autor_preserva_material(db, disciplina, usuario):
    material = material_valido(disciplina.id, usuario.id)
    db.add(material)
    db.commit()
    db.delete(usuario)
    db.commit()
    db.refresh(material)
    assert material.usuario_id is None
    assert material.titulo == "Resumo"


def test_exclusao_da_disciplina_remove_metadados(db, disciplina):
    material = material_valido(disciplina.id)
    db.add(material)
    db.commit()
    material_id = material.id
    db.delete(disciplina)
    db.commit()
    db.expunge_all()
    assert db.get(Conteudo, material_id) is None
