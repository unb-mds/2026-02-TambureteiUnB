import logging
from typing import Any, Dict, List, Optional

from app.pipeline.config import pipeline_settings
from app.pipeline.extractors.sigaa_extractor import SIGAAExtractor
from app.pipeline.extractors.dpo_inep_extractor import DPOINEPExtractor
from app.pipeline.transformers.sigaa_transformer import SIGAATransformer
from app.pipeline.transformers.metricas_transformer import MetricasTransformer
from app.pipeline.transformers.sanitizer import LGPDSanitizer
from app.pipeline.loaders.db_loader import DatabaseLoader
from app.pipeline.loaders.export_loader import ExportLoader

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ETLRunner")


class ETLRunner:
    """
    Orquestrador central do pipeline de dados do Tamburetei UnB.
    
    Coordena as etapas de:
    1. Extração (SIGAA / Dados Abertos UnB / DPO / INEP)
    2. Transformação (normalização de disciplinas, turmas, professores e métricas)
    3. Sanitização LGPD (anonimização discente e regra RN07 para turmas < 5 alunos)
    4. Carga (persistência relacional no PostgreSQL e/ou exportação de datasets)
    """

    def __init__(
        self,
        sigaa_extractor: Optional[SIGAAExtractor] = None,
        dpo_extractor: Optional[DPOINEPExtractor] = None,
        sigaa_transformer: Optional[SIGAATransformer] = None,
        metricas_transformer: Optional[MetricasTransformer] = None,
        sanitizer: Optional[LGPDSanitizer] = None,
        db_loader: Optional[DatabaseLoader] = None,
        export_loader: Optional[ExportLoader] = None,
    ):
        self.sigaa_extractor = sigaa_extractor or SIGAAExtractor()
        self.dpo_extractor = dpo_extractor or DPOINEPExtractor()
        self.sigaa_transformer = sigaa_transformer or SIGAATransformer()
        self.metricas_transformer = metricas_transformer or MetricasTransformer()
        self.sanitizer = sanitizer or LGPDSanitizer()
        self.db_loader = db_loader or DatabaseLoader()
        self.export_loader = export_loader or ExportLoader()

    def run_sigaa_pipeline(
        self,
        semestre: str = "2026.1",
        input_file: Optional[str] = None,
        departamentos: Optional[List[int]] = None,
        max_departamentos: Optional[int] = None,
        dry_run: bool = False,
        export: bool = True,
    ) -> Dict[str, Any]:
        """
        Executa o pipeline completo de ingestão e normalização de dados do SIGAA.
        """
        logger.info(f"=== Iniciando Pipeline ETL SIGAA (Semestre: {semestre}) ===")

        # 1. Extração
        raw_data = self.sigaa_extractor.extract(
            semestre=semestre,
            input_file=input_file,
            departamentos=departamentos,
            max_departamentos=max_departamentos,
        )
        logger.info("Extração de dados concluída.")

        # 2. Transformação
        transformed = self.sigaa_transformer.transform(raw_data)
        logger.info(
            f"Transformação concluída: {len(transformed.get('disciplinas', []))} disciplinas, "
            f"{len(transformed.get('docentes', []))} docentes, "
            f"{len(transformed.get('turmas', []))} turmas."
        )

        # 3. Sanitização LGPD (RN01, RN07 e RNF02)
        sanitized_data = self.sanitizer.sanitize_sigaa(transformed)

        # 4. Exportação em arquivos se solicitado
        if export:
            self.export_loader.load(sanitized_data)

        # 5. Carga no banco de dados (se não for dry-run)
        load_stats = {}
        if not dry_run:
            load_stats = self.db_loader.load(sanitized_data)
        else:
            logger.info("Modo Dry-Run ativo: nenhuma escrita persistida no banco de dados.")

        logger.info("=== Pipeline ETL SIGAA finalizado com sucesso ===")
        return {
            "status": "success",
            "extracted": {k: len(v) for k, v in raw_data.items()},
            "transformed": {k: len(v) for k, v in sanitized_data.items()},
            "loaded": load_stats,
        }

    def run_metricas_pipeline(
        self,
        ano_inicio: int = pipeline_settings.DEFAULT_ANO_INICIO,
        ano_fim: int = pipeline_settings.DEFAULT_ANO_FIM,
        input_file: Optional[str] = None,
        dry_run: bool = False,
        export: bool = True,
    ) -> Dict[str, Any]:
        """
        Executa o pipeline de métricas históricas agregadas do DPO/INEP com proteção LGPD.
        """
        logger.info(f"=== Iniciando Pipeline ETL Métricas DPO/INEP ({ano_inicio} - {ano_fim}) ===")

        # 1. Extração
        raw_metricas = self.dpo_extractor.extract(
            ano_inicio=ano_inicio,
            ano_fim=ano_fim,
            input_file=input_file
        )
        if not raw_metricas:
            logger.warning("Nenhum registro de métrica encontrado para processamento.")
            return {
                "status": "success",
                "metricas_processadas": 0,
                "metricas_consolidadas": 0,
                "loaded": {},
            }

        # 2. Transformação e cálculo de taxas
        clean_metricas = self.metricas_transformer.transform(raw_metricas)

        # 3. Sanitização LGPD (RN07 - Baixa Amostragem < 5 alunos consolidada)
        sanitized_metricas = self.sanitizer.sanitize_metricas(clean_metricas)
        consolidadas = list(self.sanitizer.acumulados_gerais.values())

        payload = {
            "metricas": sanitized_metricas,
            "metricas_consolidadas": consolidadas,
        }

        # 4. Exportação
        if export:
            self.export_loader.load(payload)

        # 5. Carga
        load_stats = {}
        if not dry_run:
            load_stats = self.db_loader.load(payload)

        logger.info("=== Pipeline ETL Métricas DPO/INEP finalizado com sucesso ===")
        return {
            "status": "success",
            "metricas_processadas": len(sanitized_metricas),
            "metricas_consolidadas": len(consolidadas),
            "loaded": load_stats,
        }
