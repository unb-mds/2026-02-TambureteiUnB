"""Integração de cursos em PostgreSQL exclusivo, sem usar a base da aplicação."""
import os
from pathlib import Path
from unittest.mock import patch

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.database import get_db
from app.main import app


@pytest.fixture(scope="module")
def cursos_engine():
    url = os.getenv("TEST_DATABASE_URL")
    if not url or make_url(url).get_backend_name() != "postgresql" or not (make_url(url).database or "").endswith("_test"):
        raise ValueError("Configure TEST_DATABASE_URL para um PostgreSQL dedicado com sufixo _test.")
    backend = Path(__file__).resolve().parents[3]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))
    with patch.object(Settings, "SQLALCHEMY_DATABASE_URI", property(lambda _: url)):
        command.upgrade(config, "head")
    engine = create_engine(url)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def db(cursos_engine):
    with cursos_engine.connect() as connection:
        transaction = connection.begin()
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            session.close()
            transaction.rollback()


@pytest.fixture
def client(db):
    previous = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = lambda: db
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)
