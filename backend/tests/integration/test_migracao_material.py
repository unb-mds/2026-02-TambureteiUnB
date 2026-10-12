from unittest.mock import patch

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

from app.core.config import Settings


@pytest.mark.parametrize("revisao", ["001", "006", "007", "002_materiais", "007_merge_materiais_pipeline"])
def test_migracao_reversivel_e_indices(engine, revisao):
    url = engine.url.render_as_string(hide_password=False)
    with patch.object(Settings, "SQLALCHEMY_DATABASE_URI", property(lambda _: url)):
        try:
            command.downgrade(Config("alembic.ini"), "001")
            command.upgrade(Config("alembic.ini"), revisao)
            assert ("materiais" in inspect(engine).get_table_names()) == (revisao in {"002_materiais", "007_merge_materiais_pipeline"})
            assert "usuarios" in inspect(engine).get_table_names()
            assert "disciplinas" in inspect(engine).get_table_names()
        finally:
            command.upgrade(Config("alembic.ini"), "head")
    inspector = inspect(engine)
    assert {c["name"] for c in inspector.get_columns("materiais")} == {
        "id", "usuario_id", "disciplina_id", "titulo", "caminho_arquivo",
        "formato", "tamanho_bytes", "status_moderacao", "created_at",
    }
    assert {i["name"] for i in inspector.get_indexes("materiais") if not i.get("duplicates_constraint")} == {
        "ix_materiais_disciplina_status_id", "ix_materiais_usuario_id",
    }
    assert len(inspector.get_check_constraints("materiais")) == 4
    assert len(inspector.get_foreign_keys("materiais")) == 2

    assert "metricas_consolidadas" in inspector.get_table_names()
    assert "pre_requisitos" in {c["name"] for c in inspector.get_columns("disciplinas")}

    assert "metricas_cursos" in inspector.get_table_names()


@pytest.mark.parametrize("revisao", ["007", "007_merge_materiais_pipeline"])
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
                if revisao == "007":
                    connection.execute(text(
                        "INSERT INTO metricas_cursos (curso_id, ano, matriculados) VALUES (:id, 2025, 80)"
                    ), {"id": curso_id})
                else:
                    connection.execute(text(
                        "INSERT INTO materiais (disciplina_id, titulo, caminho_arquivo, formato, tamanho_bytes) "
                        "VALUES (:id, 'Material preservado', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf', 'pdf', 10)"
                    ), {"id": disciplina_id})
            command.upgrade(config, "head")
            with engine.connect() as connection:
                assert connection.scalar(text("SELECT nome FROM cursos WHERE id = :id"), {"id": curso_id}) == "Curso preservado"
                assert connection.scalar(text("SELECT nome FROM disciplinas WHERE id = :id"), {"id": disciplina_id}) == "Disciplina preservada"
                if revisao == "007":
                    assert connection.scalar(text("SELECT matriculados FROM metricas_cursos WHERE curso_id = :id"), {"id": curso_id}) == 80
                else:
                    assert connection.scalar(text("SELECT titulo FROM materiais WHERE disciplina_id = :id"), {"id": disciplina_id}) == "Material preservado"
        finally:
            command.upgrade(config, "head")
            with engine.begin() as connection:
                connection.execute(text("DELETE FROM cursos WHERE slug = 'curso-preservado'"))
                connection.execute(text("DELETE FROM disciplinas WHERE slug = 'disciplina-preservada'"))
