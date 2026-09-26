from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List
from app.pipeline.transformers.base import BaseTransformer
from app.core.texto import slugify
from app.pipeline.schemas.metricas import MetricaAcademicaClean


class MetricasTransformer(BaseTransformer):
    """
    Transformador de indicadores de desempenho acadêmico (DPO/INEP/LAI).
    
    Responsável por:
    - Validação de integridade numérica (aprovados + reprovados + trancados <= matriculados)
    - Cálculo da taxa canônica de aprovação: (aprovados / matriculados) * 100
    - Normalização de códigos e slugs das disciplinas associadas
    """

    def __init__(self):
        super().__init__(name="MetricasTransformer")

    def transform(self, raw_list: List[Dict[str, Any]]) -> List[MetricaAcademicaClean]:
        """Transforma a lista de registros brutos de métricas em modelos limpos."""
        clean_metricas: List[MetricaAcademicaClean] = []

        for item in raw_list:
            cod_disc = str(item.get("codigo_disciplina") or item.get("codigo") or "").strip().upper()
            nome_disc = str(item.get("nome_disciplina") or item.get("nome") or "").strip()

            try:
                ano = int(item.get("ano", 0))
                semestre = int(item.get("semestre", 0))

                if not cod_disc or ano <= 2000 or semestre not in (1, 2):
                    continue

                matriculados = int(item.get("matriculados", 0))
                aprovados = int(item.get("aprovados", 0))
                reprovados_nota = int(item.get("reprovados_nota", 0))
                reprovados_falta = int(item.get("reprovados_falta", 0))
                trancamentos = int(item.get("trancamentos", 0))

                # Validação estrita de integridade numérica
                if (
                    min(matriculados, aprovados, reprovados_nota, reprovados_falta, trancamentos) < 0
                    or aprovados > matriculados
                    or (aprovados + reprovados_nota + reprovados_falta + trancamentos) > matriculados
                ):
                    self.logger.warning(
                        f"Ignorando registro de métrica com integridade numérica inválida para '{cod_disc}' ({ano}/{semestre}): "
                        f"matriculados={matriculados}, aprovados={aprovados}, reprovados_nota={reprovados_nota}, "
                        f"reprovados_falta={reprovados_falta}, trancamentos={trancamentos}."
                    )
                    continue

                taxa_aprovacao = self.calcular_taxa_aprovacao(aprovados, matriculados)

                clean_metricas.append(
                    MetricaAcademicaClean(
                        codigo_disciplina=cod_disc,
                        slug_disciplina=slugify(nome_disc or cod_disc),
                        ano=ano,
                        semestre=semestre,
                        matriculados=matriculados,
                        aprovados=aprovados,
                        reprovados_nota=reprovados_nota,
                        reprovados_falta=reprovados_falta,
                        trancamentos=trancamentos,
                        taxa_aprovacao=taxa_aprovacao,
                    )
                )
            except Exception as e:
                self.logger.warning(f"Ignorando registro de métrica corrompido para '{cod_disc}': {e}")

        return clean_metricas

    @staticmethod
    def calcular_taxa_aprovacao(aprovados: int, matriculados: int) -> Decimal:
        """Calcula a taxa percentual de aprovação arredondada para 2 casas decimais."""
        if matriculados <= 0:
            return Decimal("0.00")
        taxa = (Decimal(aprovados) / Decimal(matriculados)) * Decimal("100")
        return taxa.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
