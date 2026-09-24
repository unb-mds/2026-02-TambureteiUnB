import csv
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.pipeline.extractors.base import BaseExtractor


class DPOINEPExtractor(BaseExtractor):
    """
    Extrator de dados históricos do Decanato de Planejamento, Orçamento e
    Avaliação Institucional (DPO/UnB), INEP e pedidos via Lei de Acesso à Informação (LAI).
    
    Responsável pela coleta de séries históricas de:
    - Desempenho acadêmico (aprovados, reprovados por nota e falta, trancamentos)
    - Indicadores agregados por curso e disciplina
    """

    def __init__(self):
        super().__init__(name="DPOINEPExtractor")

    def extract(self, ano_inicio: Optional[int] = None, ano_fim: Optional[int] = None, **kwargs) -> List[Dict[str, Any]]:
        """
        Extrai séries históricas do DPO/INEP por intervalo de anos.
        """
        self.logger.info(f"Extraindo métricas históricas DPO/INEP de {ano_inicio} a {ano_fim}...")
        input_file = kwargs.get("input_file")
        if input_file and Path(input_file).exists():
            return self.extract_from_file(Path(input_file))
        return []

    def extract_from_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Lê arquivo de microdados ou relatórios tabulares do DPO/INEP."""
        self.logger.info(f"Lendo dados DPO/INEP de arquivo: {file_path}")
        ext = file_path.suffix.lower()
        records: List[Dict[str, Any]] = []

        if ext == ".csv":
            with open(file_path, mode="r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f, delimiter=";")
                if not reader.fieldnames or len(reader.fieldnames) == 1:
                    f.seek(0)
                    reader = csv.DictReader(f, delimiter=",")
                for row in reader:
                    records.append(dict(row))
        elif ext == ".json":
            with open(file_path, mode="r", encoding="utf-8") as f:
                data = json.load(f)
                records = data if isinstance(data, list) else data.get("metricas", [])
        return records
