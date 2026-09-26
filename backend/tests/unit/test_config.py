import pytest
from pydantic import ValidationError
from sqlalchemy.engine import make_url
from app.core.config import Settings


def test_url_preserva_caracteres_especiais():
    config = Settings(_env_file=None, POSTGRES_USER="user@host", POSTGRES_PASSWORD="senha@:/%#")
    url = make_url(config.SQLALCHEMY_DATABASE_URI)
    assert url.username == "user@host"
    assert url.password == "senha@:/%#"


def test_chave_jwt_obrigatoria(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(ValidationError) as error:
        Settings(_env_file=None)
    assert any(item["loc"] == ("SECRET_KEY",) for item in error.value.errors())
