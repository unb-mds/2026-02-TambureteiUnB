import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
from app.models.usuario import Usuario
from app.models.professor import Professor
from app.models.disciplina import Disciplina

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db():
    """Sessão de teste: tudo roda numa transação que é desfeita no final."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """TestClient usando a MESMA sessão de teste (via dependency override)."""

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


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
