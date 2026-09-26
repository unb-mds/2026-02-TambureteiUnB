from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True, env_file=(".env", "../.env"), extra="allow"
    )

    PROJECT_NAME: str = "Tamburetei UnB API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = Field(min_length=1)
    POSTGRES_DB: str = "tamburetei_db"
    POSTGRES_PORT: int = Field(default=5432, ge=1, le=65535)

    SECRET_KEY: str = Field(min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000", "http://localhost:8000",
        "http://127.0.0.1:3000", "http://127.0.0.1:8000",
    ]
    AMOSTRAGEM_MINIMA_LGPD: int = 5
    MATERIALS_DIR: Path = Path(__file__).resolve().parents[2] / "storage" / "materiais"
    MATERIAL_MAX_BYTES: int = Field(default=5 * 1024 * 1024, gt=0)

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return URL.create(
            "postgresql+psycopg2", username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD, host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT, database=self.POSTGRES_DB,
        ).render_as_string(hide_password=False)


settings = Settings()
