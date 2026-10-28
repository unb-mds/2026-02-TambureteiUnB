from unittest.mock import patch

import pytest
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text

from app.core.config import Settings


@pytest.mark.parametrize("revisao", ["001", "006", "007", "008"])
def test_migracao_reversivel_e_indices(engine, revisao):
    url = engine.url.render_as_string(hide_password=False)
    with patch.object(Settings, "SQLALCHEMY_DATABASE_URI", property(lambda _: url)):
        try:
            command.downgrade(Config("alembic.ini"), "001")
            command.upgrade(Config("alembic.ini"), revisao)
            assert ("materiais" in inspect(engine).get_table_names()) == False
            assert "usuarios" in inspect(engine).get_table_names()
            assert "disciplinas" in inspect(engine).get_table_names()
        finally:
            command.upgrade(Config("alembic.ini"), "head")
    inspector = inspect(engine)
    assert "materiais" not in inspector.get_table_names()
    assert {"id", "usuario_id", "disciplina_id", "titulo", "url_origem", "tipo",
            "caminho_arquivo", "formato", "tamanho_bytes", "status_moderacao", "created_at"}.issubset(
        {c["name"] for c in inspector.get_columns("conteudos")})
    assert "ix_conteudos_arquivos_disciplina_status" in {i["name"] for i in inspector.get_indexes("conteudos")}
    assert len(inspector.get_check_constraints("conteudos")) == 7
    assert len(inspector.get_foreign_keys("conteudos")) == 3

    assert "metricas_consolidadas" in inspector.get_table_names()
    assert "pre_requisitos" in {c["name"] for c in inspector.get_columns("disciplinas")}

    assert "metricas_cursos" in inspector.get_table_names()


@pytest.mark.parametrize("revisao", ["007", "008"])
def test_convergencia_preserva_registros_existentes(engine, revisao):
    url = engine.url.render_as_string(hide_password=False)
    config = Config("alembic.ini")
    with patch.object(Settings, "SQLALCHEMY_DATABASE_URI", property(lambda _: url)):
        try:
            command.downgrade(config, "001")
            command.upgrade(config, revisao)
            with engine.begin() as connection:
                curso_id = connection.scalar(text(
                    "INSERT INTO cursos (nome, slug) VALUES ('Curso preservado', 'curso-preservado') RETURNING id"
                ))
                disciplina_id = connection.scalar(text(
                    "INSERT INTO disciplinas (nome, slug) VALUES ('Disciplina preservada', 'disciplina-preservada') RETURNING id"
                ))
                connection.execute(text(
                    "INSERT INTO metricas_cursos (curso_id, ano, matriculados) VALUES (:id, 2025, 80)"
                ), {"id": curso_id})
                connection.execute(text("INSERT INTO conteudos (disciplina_id, titulo, tipo, url_origem, descricao, semestre) VALUES (:id, 'Link preservado', 'LINK_UTIL', 'https://unb.br', 'Descricao antiga', '2025.1')"), {"id": disciplina_id})
                original = connection.execute(text("SELECT * FROM conteudos WHERE disciplina_id = :id"), {"id": disciplina_id}).mappings().one()
            command.upgrade(config, "head")
            with engine.connect() as connection:
                assert connection.scalar(text("SELECT nome FROM cursos WHERE id = :id"), {"id": curso_id}) == "Curso preservado"
                assert connection.scalar(text("SELECT nome FROM disciplinas WHERE id = :id"), {"id": disciplina_id}) == "Disciplina preservada"
                atual = connection.execute(text("SELECT * FROM conteudos WHERE disciplina_id = :id"), {"id": disciplina_id}).mappings().one()
                assert {key: atual[key] for key in original} == dict(original)
                assert atual["caminho_arquivo"] is None
                assert connection.scalar(text("SELECT matriculados FROM metricas_cursos WHERE curso_id = :id"), {"id": curso_id}) == 80
        finally:
            command.upgrade(config, "head")
            with engine.begin() as connection:
                connection.execute(text("DELETE FROM cursos WHERE slug = 'curso-preservado'"))
                connection.execute(text("DELETE FROM disciplinas WHERE slug = 'disciplina-preservada'"))


def test_historico_linear_sem_heads_concorrentes():
    script = ScriptDirectory.from_config(Config("alembic.ini"))
    assert script.get_heads() == ["010_curadorias"]
    assert script.get_revision("010_curadorias").down_revision == "009_arquivos_conteudos"
    assert script.get_revision("009_arquivos_conteudos").down_revision == "008"
    assert all(not isinstance(r.down_revision, tuple) for r in script.walk_revisions())
