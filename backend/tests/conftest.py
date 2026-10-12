import os
from unittest.mock import patch

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import make_url
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.main import app
from app.core.config import Settings, settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
from app.models.usuario import Usuario
from app.models.professor import Professor
from app.models.disciplina import Disciplina

@pytest.fixture(scope="session")
def engine():
    url = os.getenv("TEST_DATABASE_URL")
    if not url or not (make_url(url).database or "").endswith("_test"):
        raise ValueError("Configure TEST_DATABASE_URL para banco dedicado com sufixo _test.")
    if make_url(url).get_backend_name() != "postgresql":
        raise ValueError("Os testes de integração exigem PostgreSQL.")
    with patch.object(Settings, "SQLALCHEMY_DATABASE_URI", property(lambda _: url)):
        command.upgrade(Config("alembic.ini"), "head")
    test_engine = create_engine(url)
    try:
        yield test_engine
    finally:
        test_engine.dispose()


@pytest.fixture()
def db(engine):
    with engine.connect() as connection:
        transaction = connection.begin()
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            session.close()
            transaction.rollback()


@pytest.fixture()
def client(db, tmp_path, monkeypatch):
    """TestClient usando a MESMA sessão de teste (via dependency override)."""

    def override_get_db():
        yield db

    monkeypatch.setattr(settings, "MATERIALS_DIR", tmp_path / "uploads")
    previous = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


@pytest.fixture()
def disciplina(db):
    d = Disciplina(
        slug="fga0168-teste",
        nome="Métodos de Desenvolvimento de Software",
        codigo="FGA0168",
        departamento="FCTE",
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


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

@pytest.fixture(scope="session")
def password_hash():
    return get_password_hash("SenhaDeTeste123!")


@pytest.fixture()
def usuario(db, password_hash):
    user = Usuario(nome="Aluno Teste", email="aluno@example.com", password_hash=password_hash)
    db.add(user)
    db.commit()
    return user


@pytest.fixture()
def headers(usuario):
    return {"Authorization": "Bearer " + create_access_token({"sub": usuario.email, "role": usuario.role})}
