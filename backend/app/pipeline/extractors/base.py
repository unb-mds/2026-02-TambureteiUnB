import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List
from pathlib import Path

logger = logging.getLogger(__name__)


class BaseExtractor(ABC):
    """Classe base abstrata para todos os extratores do pipeline ETL."""

    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"{__name__}.{name}")

    @abstractmethod
    def extract(self, **kwargs) -> List[Dict[str, Any]]:
        """
        Executa a rotina de extração a partir da fonte correspondente.
        
        Retorna:
            Lista de dicionários contendo os dados brutos extraídos.
        """
        pass

    def save_raw_data(self, data: Any, output_path: Path) -> Path:
        """Salva os dados brutos coletados no diretório raw de staging."""
        import json

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        self.logger.info(f"Dados brutos salvos com sucesso em: {output_path}")
        return output_path
