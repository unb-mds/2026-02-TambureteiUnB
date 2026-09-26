"""Testes isolados: PostgreSQL dedicado via TEST_DATABASE_URL."""

import os
from unittest.mock import patch

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

# Credenciais exclusivas dos testes, antes de importar a aplicação.
os.environ.setdefault("SECRET_KEY", "chave-exclusiva-dos-testes-automatizados")
os.environ.setdefault("POSTGRES_PASSWORD", "senha-exclusiva-de-testes")

from app.core.config import Settings, settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models import Disciplina, Professor, Usuario


@pytest.fixture(scope="session")
def engine():
    url = os.getenv("TEST_DATABASE_URL")
    if url and not (make_url(url).database or "").endswith("_test"):
        raise ValueError("TEST_DATABASE_URL deve apontar para um banco dedicado com sufixo _test.")
    if not url:
        raise ValueError("Configure TEST_DATABASE_URL para um PostgreSQL dedicado com sufixo _test.")
    if make_url(url).get_backend_name() != "postgresql":
        raise ValueError("As migracoes de integracao exigem PostgreSQL.")
    engine = create_engine(url)

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


@pytest.fixture()
def professor_1(db):
    p = Professor(nome="Professor Teste 1", departamento="FGA/FCTE")
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@pytest.fixture()
def professor_2(db):
    p = Professor(nome="Professor Teste 2", departamento="FGA/FCTE")
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@pytest.fixture()
def admin_user(db):
    user = Usuario(
        nome="Admin Teste",
        email="admin.teste@unb.br",
        password_hash=get_password_hash("SenhaForte123!"),
        role="ADMIN",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def admin_token(admin_user):
    return create_access_token(data={"sub": admin_user.email, "role": admin_user.role})


@pytest.fixture()
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture()
def student_user(db):
    user = Usuario(
        nome="Aluno Teste",
        email="aluno.teste@unb.br",
        password_hash=get_password_hash("SenhaForte123!"),
        role="STUDENT",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def student_token(student_user):
    return create_access_token(data={"sub": student_user.email, "role": student_user.role})


@pytest.fixture()
def student_headers(student_token):
    return {"Authorization": f"Bearer {student_token}"}
