import json
import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

_DEFAULT_INSECURE_SECRET_KEYS = {
    "",
    "supersecretkey_unb_tamburetei_2026_mds",
    "sua_chave_secreta_super_segura_unb_2026",
}


def _erro_quorum(valor) -> PydanticCustomError:
    return PydanticCustomError(
        "quorum_invalido",
        "O quórum mínimo de doações deve ser um número inteiro maior ou igual a 1 (valor informado: {valor}).",
        {"valor": valor},
    )


class Settings(BaseSettings):
    PROJECT_NAME: str = "Tamburetei UnB API"
    VERSION: str = "0.9.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 dias

    # CORS (aceita JSON list ou string separada por virgulas no .env; nunca usa '*')
    BACKEND_CORS_ORIGINS: List[str] | str = [
        "https://tambureteiunb.com.br",
        "https://www.tambureteiunb.com.br",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v) -> List[str]:
        if isinstance(v, str):
            bruto = v.strip()
            if not bruto:
                return []
            if bruto.startswith("["):
                parsed = json.loads(bruto)
                return [str(item).strip().rstrip("/") for item in parsed if str(item).strip() and str(item).strip() != "*"]
            return [item.strip().rstrip("/") for item in bruto.split(",") if item.strip() and item.strip() != "*"]
        if isinstance(v, list):
            return [str(item).strip().rstrip("/") for item in v if str(item).strip() and str(item).strip() != "*"]
        return []

    @model_validator(mode="after")
    def validar_segredos_producao(self):
        if (self.ENVIRONMENT or "").strip().lower() == "production":
            if (self.SECRET_KEY or "").strip() in _DEFAULT_INSECURE_SECRET_KEYS or len((self.SECRET_KEY or "").strip()) < 32:
                raise ValueError("SECRET_KEY forte (>= 32 caracteres) e obrigatoria em ENVIRONMENT=production.")
        return self
    
    # Limiar para baixa amostragem LGPD / DPO (< 5 alunos)
    AMOSTRAGEM_MINIMA_LGPD: int = 5

    # Importação de Histórico Escolar SIGAA (PDF)
    HISTORICO_MAX_BYTES: int = Field(default=10 * 1024 * 1024, gt=0)
    HISTORICO_MIN_AMOSTRAS: int = Field(default=int(os.getenv("HISTORICO_MIN_AMOSTRAS", "5")), ge=1)
    HISTORICO_DEDUP_SECRET: str = os.getenv("HISTORICO_DEDUP_SECRET", "")

    # Quórum mínimo de doações idênticas para consolidar uma turma (US 3.2.1)
    QUORUM_MINIMO_DOACOES: int = 3

    # Moderação Autônoma Híbrida via LLM Local (Ollama - ADR 08)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
    OLLAMA_VISION_MODEL: str = os.getenv("OLLAMA_VISION_MODEL", "")
    OLLAMA_TIMEOUT_SECONDS: float = Field(default=float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "90.0")), gt=0)
    MODERATION_CONFIDENCE_THRESHOLD: float = Field(
        default=float(os.getenv("MODERATION_CONFIDENCE_THRESHOLD", "0.80")),
        ge=0.0,
        le=1.0,
    )

    # Identidade e Configuracoes de E-mail (SMTP)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", os.getenv("SMTP_PASS", ""))
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "tambureteiunb@gmail.com")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Tamburetei UnB")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
    SMTP_SSL: bool = os.getenv("SMTP_SSL", "false").lower() in ("true", "1", "yes")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

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
