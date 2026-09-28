import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Tamburetei UnB API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
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

    @property
    def SQLALCHEMY_DATABASE_URI(self):
        from sqlalchemy.engine import URL

        return URL.create(
            "postgresql+psycopg2",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=int(self.POSTGRES_PORT),
            database=self.POSTGRES_DB,
        )

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        case_sensitive = True
        env_file = (".env", "../.env")
        extra = "allow"

settings = Settings()
