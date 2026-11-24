import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_cors_origins_aceita_string_separada_por_virgulas_e_remove_curinga():
    cfg = Settings(
        _env_file=None,
        BACKEND_CORS_ORIGINS="https://tambureteiunb.com.br/, https://www.tambureteiunb.com.br, *",
    )
    assert cfg.BACKEND_CORS_ORIGINS == [
        "https://tambureteiunb.com.br",
        "https://www.tambureteiunb.com.br",
    ]
    assert "*" not in cfg.BACKEND_CORS_ORIGINS


def test_producao_rejeita_secret_key_padrao_ou_curta():
    with pytest.raises(ValidationError, match="SECRET_KEY forte"):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY="supersecretkey_unb_tamburetei_2026_mds",
        )

    with pytest.raises(ValidationError, match="SECRET_KEY forte"):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY="chave-curta",
        )

    cfg_prod = Settings(
        _env_file=None,
        ENVIRONMENT="production",
        SECRET_KEY="chave_producao_super_forte_e_aleatoria_unb_2026_deploy",
    )
    assert cfg_prod.ENVIRONMENT == "production"
