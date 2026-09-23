"""Testes isolados: SQLite local ou PostgreSQL dedicado via TEST_DATABASE_URL."""

import os
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import Settings, settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models import Disciplina, Usuario


@pytest.fixture(scope="session")
def engine(tmp_path_factory):
    url = os.getenv("TEST_DATABASE_URL")
    if url and not (make_url(url).database or "").endswith("_test"):
        raise ValueError("TEST_DATABASE_URL deve apontar para um banco dedicado com sufixo _test.")
    url = url or f"sqlite:///{tmp_path_factory.mktemp('db') / 'materiais.db'}"
    sqlite = make_url(url).get_backend_name() == "sqlite"
    engine = create_engine(url, connect_args={"check_same_thread": False} if sqlite else {})
    if sqlite:
        @event.listens_for(engine, "connect")
        def configurar_sqlite(connection, _):
            connection.isolation_level = None
            connection.execute("PRAGMA foreign_keys=ON")
            connection.create_function("now", 0, lambda: datetime.now(timezone.utc).isoformat())

        @event.listens_for(engine, "begin")
        def iniciar_transacao(connection):
            connection.exec_driver_sql("BEGIN")

    # Cria o esquema pelas migrações reais, nunca por Base.metadata.create_all().
    with patch.object(Settings, "SQLALCHEMY_DATABASE_URI", property(lambda _: url)):
        command.upgrade(Config("alembic.ini"), "head")
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine):
    with engine.connect() as connection:
        transaction = connection.begin()
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            session.close()
            transaction.rollback()


@pytest.fixture
def client(db, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "MATERIALS_DIR", tmp_path / "uploads")

    def database_override():
        yield db

    app.dependency_overrides[get_db] = database_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def password_hash():
    return get_password_hash("SenhaDeTeste123!")


@pytest.fixture
def usuario(db, password_hash):
    user = Usuario(nome="Aluno Teste", email="aluno@example.com", password_hash=password_hash)
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def headers(usuario):
    return {"Authorization": "Bearer " + create_access_token({"sub": usuario.email, "role": usuario.role})}


@pytest.fixture
def disciplina(db):
    disciplina = Disciplina(codigo="MAT1", nome="Cálculo", slug="calculo")
    db.add(disciplina)
    db.commit()
    return disciplina
