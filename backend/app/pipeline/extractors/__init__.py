from app.pipeline.extractors.base import BaseExtractor
from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor
from app.pipeline.extractors.dpo_inep_extractor import DPOINEPExtractor
from app.pipeline.extractors.dpo_anuario_extractor import DPOAnuarioExtractor

__all__ = [
    "BaseExtractor",
    "SIGAAExtractor",
    "DPOINEPExtractor",
    "DPOAnuarioExtractor",
]
