from unittest.mock import patch

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.core.config import Settings


def test_migracao_reversivel_e_indices(engine):
    url = engine.url.render_as_string(hide_password=False)
    with patch.object(Settings, "SQLALCHEMY_DATABASE_URI", property(lambda _: url)):
        try:
            command.downgrade(Config("alembic.ini"), "001")
            assert "materiais" not in inspect(engine).get_table_names()
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
