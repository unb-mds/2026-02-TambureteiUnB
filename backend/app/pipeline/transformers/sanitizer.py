from typing import Any, Dict, List
from app.pipeline.transformers.base import BaseTransformer
from app.pipeline.config import pipeline_settings
from app.pipeline.schemas.metricas import MetricaAcademicaClean


class LGPDSanitizer(BaseTransformer):
    """
    Sanitizador de dados em estrita conformidade com a LGPD e Privacy by Design.
    
    Regras implementadas:
    - [RN01 / RNF02] Anonimato Discente: Remoção de qualquer campo de identificação
      individual (matrícula, CPF, e-mail discente, nomes de estudantes).
    - [RN07] Baixa Amostragem: Registros históricos ou turmas com menos de
      5 alunos matriculados têm seus microdados suprimidos ou consolidados
      para impedir reidentificação indireta de estudantes.
    """

    def __init__(self, amostragem_minima: int = pipeline_settings.AMOSTRAGEM_MINIMA_LGPD):
        super().__init__(name="LGPDSanitizer")
        self.amostragem_minima = amostragem_minima

    def transform(self, raw_data: Any) -> Any:
        """Sanitiza payloads genéricos aplicando filtros de privacidade."""
        if isinstance(raw_data, list):
            return [self.sanitize_record(item) for item in raw_data]
        elif isinstance(raw_data, dict):
            return self.sanitize_record(raw_data)
        return raw_data

    def sanitize_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Remove campos sensíveis individuais caso existam no dataset bruto."""
        campos_proibidos = {
            "matricula", "cpf", "email_aluno", "nome_aluno", "ira", "identidade",
            "telefone", "endereco", "data_nascimento"
        }
        return {k: v for k, v in record.items() if k.lower() not in campos_proibidos}

    def sanitize_metricas(self, metricas: List[MetricaAcademicaClean]) -> List[MetricaAcademicaClean]:
        """
        Aplica a regra RN07 sobre a lista de métricas acadêmicas.
        
        Se matriculados < 5:
        - Marca amostragem_suprimida_lgpd = True
        - Suprime os valores detalhados de reprovação/trancamento no registro individual
        """
        sanitizadas: List[MetricaAcademicaClean] = []

        for m in metricas:
            if m.matriculados < self.amostragem_minima:
                self.logger.warning(
                    f"Aplicando RN07 (LGPD): Turma/Métrica de {m.codigo_disciplina} ({m.ano}/{m.semestre}) "
                    f"possui apenas {m.matriculados} matriculados (< {self.amostragem_minima}). "
                    f"Valores individuais suprimidos para evitar reidentificação."
                )
                m.amostragem_suprimida_lgpd = True
                m.aprovados = 0
                m.reprovados_nota = 0
                m.reprovados_falta = 0
                m.trancamentos = 0
                m.taxa_aprovacao = None

            sanitizadas.append(m)

        return sanitizadas
