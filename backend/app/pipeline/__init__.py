"""
Módulo de Pipeline ETL do Tamburetei UnB (MDS 2026/2).

Responsável pela ingestão, limpeza, anonimização (LGPD) e carga de dados do
SIGAA, Dados Abertos UnB, DPO e INEP.
"""

from app.pipeline.config import pipeline_settings
from app.pipeline.runner import ETLRunner
from app.pipeline.extractors.base import BaseExtractor
from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor
from app.pipeline.extractors.dpo_inep_extractor import DPOINEPExtractor
from app.pipeline.transformers.base import BaseTransformer
from app.pipeline.transformers.sigaa_transformer import SIGAATransformer
from app.pipeline.transformers.metricas_transformer import MetricasTransformer
from app.pipeline.transformers.sanitizer import LGPDSanitizer
from app.pipeline.loaders.base import BaseLoader
from app.pipeline.loaders.db_loader import DatabaseLoader
from app.pipeline.loaders.export_loader import ExportLoader

__all__ = [
    "pipeline_settings",
    "ETLRunner",
    "BaseExtractor",
    "SIGAAExtractor",
    "DPOINEPExtractor",
    "BaseTransformer",
    "SIGAATransformer",
    "MetricasTransformer",
    "LGPDSanitizer",
    "BaseLoader",
    "DatabaseLoader",
    "ExportLoader",
]
