import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Diretório raiz do pipeline e dos dados locais
PIPELINE_DIR = Path(__file__).resolve().parent
DATA_DIR = PIPELINE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"

# Garantir existência dos diretórios
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)


class PipelineSettings(BaseSettings):
    """Configurações de execução do pipeline ETL do SIGAA e Dados Abertos UnB."""

    # Fontes de Dados Abertos UnB / SIGAA
    UNB_DADOS_ABERTOS_URL: str = os.getenv(
        "UNB_DADOS_ABERTOS_URL",
        "https://dados.unb.br/dataset"
    )
    SIGAA_BASE_URL: str = os.getenv(
        "SIGAA_BASE_URL",
        "https://sigaa.unb.br/sigaa/public/turmas/listar.jsf"
    )

    # Diretórios de persistência intermediária
    RAW_DIR: Path = RAW_DATA_DIR
    PROCESSED_DIR: Path = PROCESSED_DATA_DIR

    # Governança e LGPD (RN07 / RNF02)
    # Turmas ou amostragens com menos de 5 alunos devem ser consolidadas/suprimidas
    AMOSTRAGEM_MINIMA_LGPD: int = 5

    # Parâmetros de execução padrão
    DEFAULT_ANO_INICIO: int = 2021
    DEFAULT_ANO_FIM: int = 2026
    BATCH_SIZE: int = 100
    REQUEST_TIMEOUT: int = 30  # segundos

    class Config:
        env_prefix = "PIPELINE_"
        extra = "allow"


pipeline_settings = PipelineSettings()
