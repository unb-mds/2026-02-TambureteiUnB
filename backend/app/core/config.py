import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from pydantic_core import PydanticCustomError


def _erro_quorum(valor) -> PydanticCustomError:
    return PydanticCustomError(
        "quorum_invalido",
        "O quórum mínimo de doações deve ser um número inteiro maior ou igual a 1 (valor informado: {valor}).",
        {"valor": valor},
    )


class Settings(BaseSettings):
    PROJECT_NAME: str = "Tamburetei UnB API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    MATERIALS_DIR: Path = Path("storage/materiais")
    MATERIAL_MAX_BYTES: int = Field(default=5 * 1024 * 1024, gt=0)

    # Banco de Dados
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "tamburetei_db")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    
    # JWT & Segurança
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey_unb_tamburetei_2026_mds")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 dias
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "*"
    ]
    
    # Limiar para baixa amostragem LGPD / DPO (< 5 alunos)
    AMOSTRAGEM_MINIMA_LGPD: int = 5

    # Quórum mínimo de doações idênticas para consolidar uma turma (US 3.2.1)
    QUORUM_MINIMO_DOACOES: int = 3

    @field_validator("QUORUM_MINIMO_DOACOES", mode="before")
    @classmethod
    def rejeitar_bool_no_quorum(cls, v):
        # bool é subclasse de int em Python: True passaria como 1.
        if isinstance(v, bool):
            raise _erro_quorum(v)
        return v

    @field_validator("QUORUM_MINIMO_DOACOES")
    @classmethod
    def validar_quorum_minimo(cls, v: int) -> int:
        if v < 1:
            raise _erro_quorum(v)
        return v

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        case_sensitive = True
        env_file = (".env", "../.env")
        extra = "allow"

settings = Settings()