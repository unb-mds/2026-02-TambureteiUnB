import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

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
    SIGAA_HOME_URL: str = os.getenv(
        "SIGAA_HOME_URL",
        "https://sigaa.unb.br/sigaa/public/home.jsf"
    )
    SIGAA_BASE_URL: str = os.getenv(
        "SIGAA_BASE_URL",
        "https://sigaa.unb.br/sigaa/public/turmas/listar.jsf"
    )
    SIGAA_COMPONENTES_URL: str = os.getenv(
        "SIGAA_COMPONENTES_URL",
        "https://sigaa.unb.br/sigaa/public/componentes/busca_componentes.jsf"
    )
    SIGAA_CURRICULO_URL: str = os.getenv(
        "SIGAA_CURRICULO_URL",
        "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf"
    )
    SIGAA_CURSOS_LISTA_URL: str = os.getenv(
        "SIGAA_CURSOS_LISTA_URL",
        "https://sigaa.unb.br/sigaa/public/curso/lista.jsf?nivel=G"
    )
    SIGAA_PORTAL_CURSO_URL: str = os.getenv(
        "SIGAA_PORTAL_CURSO_URL",
        "https://sigaa.unb.br/sigaa/public/curso/portal.jsf"
    )
    FETCH_EMENTAS: bool = True
    FETCH_CURRICULOS: bool = True
    TODOS_CURSOS: bool = False
    TODOS_CURRICULOS: bool = False

    # Diretórios de persistência intermediária e metadados
    DATA_PATH: Path = DATA_DIR
    RAW_DIR: Path = RAW_DATA_DIR
    PROCESSED_DIR: Path = PROCESSED_DATA_DIR
    DEPARTAMENTOS_CSV: Path = DATA_DIR / "departamentos_ID_unb.csv"
    DEPARTAMENTOS_JSON: Path = DATA_DIR / "departamentos_unb.json"

    # Governança e LGPD (RN07 / RNF02)
    # Turmas ou amostragens com menos de 5 alunos devem ser consolidadas/suprimidas
    AMOSTRAGEM_MINIMA_LGPD: int = 5

    # Parâmetros de execução padrão
    DEFAULT_ANO_INICIO: int = 2021
    DEFAULT_ANO_FIM: int = 2026
    BATCH_SIZE: int = 100
    REQUEST_TIMEOUT: int = 30  # segundos

    model_config = SettingsConfigDict(env_prefix="PIPELINE_", extra="allow")


# Cursos oficiais da FCTE mapeados no SIGAA
FCTE_CURSOS = {
    414924: {
        "nome": "Engenharia de Software",
        "slug": "engenharia-de-software",
        "codigo_mec": "115998",
        "campus": "FCTE - Gama",
        "grau": "Bacharelado",
        "turno": "Diurno",
    },
    414916: {
        "nome": "Engenharia Aeroespacial",
        "slug": "engenharia-aeroespacial",
        "codigo_mec": "115997",
        "campus": "FCTE - Gama",
        "grau": "Bacharelado",
        "turno": "Diurno",
    },
    414919: {
        "nome": "Engenharia Automotiva",
        "slug": "engenharia-automotiva",
        "codigo_mec": "115996",
        "campus": "FCTE - Gama",
        "grau": "Bacharelado",
        "turno": "Diurno",
    },
    414922: {
        "nome": "Engenharia Eletrônica",
        "slug": "engenharia-eletronica",
        "codigo_mec": "115995",
        "campus": "FCTE - Gama",
        "grau": "Bacharelado",
        "turno": "Diurno",
    },
    414926: {
        "nome": "Engenharia de Energia",
        "slug": "engenharia-de-energia",
        "codigo_mec": "115994",
        "campus": "FCTE - Gama",
        "grau": "Bacharelado",
        "turno": "Diurno",
    },
    414915: {
        "nome": "Engenharia",
        "slug": "engenharia-abi",
        "codigo_mec": "115999",
        "campus": "FCTE - Gama",
        "grau": "Bacharelado",
        "turno": "Diurno",
    },
}

pipeline_settings = PipelineSettings()
pipeline_settings.FCTE_CURSOS = FCTE_CURSOS

