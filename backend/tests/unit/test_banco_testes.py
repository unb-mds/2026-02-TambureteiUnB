"""O comando padrao nunca deve aceitar uma URL de producao como banco de testes."""
import pytest
from tests import conftest


@pytest.mark.parametrize("url, mensagem", [
    ("postgresql://postgres:postgres@localhost/tamburetei_db", "sufixo _test"),
    ("sqlite:///isolado_test", "PostgreSQL"),
])
def test_fixture_rejeita_destino_inseguro_antes_de_conectar(monkeypatch, url, mensagem):
    monkeypatch.setenv("TEST_DATABASE_URL", url)
    def nao_conectar(*args, **kwargs):
        pytest.fail("URL invalida nao deve abrir conexao nem executar DDL")
    monkeypatch.setattr(conftest, "create_engine", nao_conectar)
    fixture = conftest.engine.__wrapped__()
    with pytest.raises(ValueError, match=mensagem):
        next(fixture)
