import csv
import json
from pathlib import Path
from typing import Any, Dict, List
from app.pipeline.loaders.base import BaseLoader
from app.pipeline.config import pipeline_settings


class ExportLoader(BaseLoader):
    """
    Carregador de exportação de dados para arquivos locais (CSV e JSON).
    
    Atende ao requisito funcional [RF06] e aos entregáveis da R1:
    - Disponibilização de datasets consolidados e limpos
    - Formatos padronizados para download pela comunidade acadêmica
    """

    def __init__(self, output_dir: Path = pipeline_settings.PROCESSED_DIR):
        super().__init__(name="ExportLoader")
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def load(self, data: Dict[str, Any], **kwargs) -> Dict[str, int]:
        """Exporta os dados fornecidos em formatos JSON e CSV."""
        stats = {}
        for entity_name, items in data.items():
            if not items:
                continue

            # Converte itens para dicionários se forem modelos Pydantic
            dict_items = [
                item.model_dump() if hasattr(item, "model_dump") else item
                for item in items
            ]

            # Exporta JSON
            json_path = self.output_dir / f"{entity_name}.json"
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(dict_items, f, ensure_ascii=False, indent=2, default=str)

            # Exporta CSV
            if dict_items:
                csv_path = self.output_dir / f"{entity_name}.csv"
                keys = dict_items[0].keys()
                with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
                    writer = csv.DictWriter(f, fieldnames=keys, delimiter=";")
                    writer.writeheader()
                    writer.writerows(dict_items)

            stats[f"{entity_name}_exportados"] = len(dict_items)
            self.logger.info(f"Exportados {len(dict_items)} registros de {entity_name} em {self.output_dir}")

        return stats
