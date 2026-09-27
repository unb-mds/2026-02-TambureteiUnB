import logging
from abc import ABC, abstractmethod
from typing import Any, Dict

logger = logging.getLogger(__name__)


class BaseLoader(ABC):
    """Classe base abstrata para todos os carregadores (loaders) do pipeline ETL."""

    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"{__name__}.{name}")

    @abstractmethod
    def load(self, data: Any, **kwargs) -> Dict[str, int]:
        """
        Executa a persistência dos dados normalizados no destino configurado.
        
        Args:
            data: Dados estruturados e sanitizados prontos para carga.
            
        Retorna:
            Dicionário com contadores de registros inseridos/atualizados.
        """
        pass
