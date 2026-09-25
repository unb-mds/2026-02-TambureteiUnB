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
        Extrai séries históricas do DPO/INEP por intervalo de anos a partir de dataset local.
        """
        input_file = kwargs.get("input_file")
        if not input_file:
            raise ValueError(
                "É necessário fornecer um 'input_file' válido (CSV ou JSON) para extração de métricas do DPO/INEP."
            )

        file_path = Path(input_file)
        if not file_path.is_file():
            raise FileNotFoundError(f"Arquivo de entrada não encontrado: {input_file}")

        self.logger.info(f"Extraindo métricas históricas DPO/INEP de {ano_inicio} a {ano_fim} a partir de {file_path}...")
        records = self.extract_from_file(file_path)

        if ano_inicio is None and ano_fim is None:
            return records

        filtered: List[Dict[str, Any]] = []
        for r in records:
            ano_val = r.get("ano")
            if ano_val is not None:
                try:
                    ano_int = int(ano_val)
                    if ano_inicio is not None and ano_int < ano_inicio:
                        continue
                    if ano_fim is not None and ano_int > ano_fim:
                        continue
                except (ValueError, TypeError):
                    pass
            filtered.append(r)

        self.logger.info(f"Filtro temporal ({ano_inicio}-{ano_fim}): {len(filtered)} de {len(records)} registros mantidos.")
        return filtered

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
