from unittest.mock import patch
import pytest
from app.pipeline.loaders.db_loader import DatabaseLoader


def test_pipeline_interrompe_em_falha_de_migracao():
    with patch("alembic.command.upgrade", side_effect=RuntimeError("migração falhou")):
        with pytest.raises(RuntimeError, match="migração falhou"):
            DatabaseLoader.ensure_schema_up_to_date()
