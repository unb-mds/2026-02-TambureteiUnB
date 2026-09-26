import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class BaseTransformer(ABC):
    """Classe base abstrata para todos os transformadores do pipeline ETL."""

    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"{__name__}.{name}")

    @abstractmethod
    def transform(self, raw_data: Any) -> Any:
        """
        Executa a transformação, limpeza e normalização dos dados.
        
        Args:
            raw_data: Dados brutos extraídos da fonte.
            
        Retorna:
            Dados estruturados e normalizados de acordo com as regras de negócio.
        """
        pass
