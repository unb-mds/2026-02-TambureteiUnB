import csv
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

from app.pipeline.extractors.base import BaseExtractor
from app.pipeline.config import pipeline_settings


class SIGAAExtractor(BaseExtractor):
    """
    Extrator de dados do SIGAA e do Portal de Dados Abertos da UnB.
    
    Responsável pela coleta de:
    - Turmas ofertadas por período letivo
    - Docentes responsáveis pelas turmas
    - Componentes curriculares (disciplinas e departamentos)
    """

    def __init__(self, base_url: Optional[str] = None):
        super().__init__(name="SIGAAExtractor")
        self.base_url = base_url or pipeline_settings.SIGAA_BASE_URL
        self.dados_abertos_url = pipeline_settings.UNB_DADOS_ABERTOS_URL

    def extract(self, semestre: Optional[str] = None, **kwargs) -> Dict[str, List[Dict[str, Any]]]:
        """
        Executa a extração completa de dados do SIGAA para um determinado semestre.
        
        Args:
            semestre: Período letivo de referência (ex: '2026.1').
            
        Retorna:
            Dicionário com listas brutas de turmas, disciplinas e docentes.
        """
        self.logger.info(f"Iniciando extração de dados do SIGAA para o semestre {semestre or 'vigente'}...")
        
        # Pode receber caminho para arquivo local de dados abertos ou realizar fetch
        local_file = kwargs.get("input_file")
        if local_file and Path(local_file).exists():
            return self.extract_from_file(Path(local_file))

        return {
            "turmas": self.extract_turmas(semestre=semestre),
            "disciplinas": self.extract_disciplinas(),
            "docentes": self.extract_docentes(),
        }

    def extract_from_file(self, file_path: Path) -> Dict[str, List[Dict[str, Any]]]:
        """Extrai dados brutos a partir de um arquivo CSV ou JSON de Dados Abertos."""
        self.logger.info(f"Lendo dados de arquivo local: {file_path}")
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
                records = data if isinstance(data, list) else data.get("turmas", [])
        else:
            raise ValueError(f"Formato de arquivo não suportado para extração: {ext}")

        return {
            "turmas": records,
            "disciplinas": [],
            "docentes": [],
        }

    def extract_turmas(self, semestre: Optional[str] = None) -> List[Dict[str, Any]]:
        """Extrai a listagem bruta de turmas ofertadas no período."""
        self.logger.info(f"Extraindo turmas do SIGAA para semestre={semestre}...")
        # Simula ou executa chamada à API de Dados Abertos UnB / SIGAA
        return []

    def extract_disciplinas(self) -> List[Dict[str, Any]]:
        """Extrai a listagem de componentes curriculares cadastrados no SIGAA."""
        self.logger.info("Extraindo componentes curriculares do SIGAA...")
        return []

    def extract_docentes(self) -> List[Dict[str, Any]]:
        """Extrai o corpo docente ativo do SIGAA."""
        self.logger.info("Extraindo lista de docentes do SIGAA...")
        return []
