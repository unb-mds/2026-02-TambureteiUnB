from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional
from app.pipeline.transformers.base import BaseTransformer
from app.pipeline.config import pipeline_settings
from app.pipeline.schemas.metricas import MetricaAcademicaClean
from app.pipeline.schemas.sigaa import (
    SIGAADisciplinaClean,
    SIGAADocenteClean,
    SIGAATurmaClean,
)


class LGPDSanitizer(BaseTransformer):
    """
    Sanitizador de dados em estrita conformidade com a LGPD e Privacy by Design.
    
    Regras implementadas:
    - [RN01 / RNF02] Anonimato Discente: Remoção de qualquer campo de identificação
      individual (matrícula, CPF, e-mail discente, nomes de estudantes, etc.).
    - [RN07] Baixa Amostragem: Registros históricos ou turmas com menos de
      5 alunos matriculados têm seus microdados suprimidos no registro individual
      e consolidados no acumulado geral da matéria para impedir reidentificação indireta.
    """

    def __init__(self, amostragem_minima: int = pipeline_settings.AMOSTRAGEM_MINIMA_LGPD):
        super().__init__(name="LGPDSanitizer")
        self.amostragem_minima = amostragem_minima
        self.acumulados_gerais: Dict[str, Dict[str, Any]] = {}

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

    def sanitize_sigaa(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aplica sanitização LGPD completa no fluxo de dados do SIGAA.
        
        Garante:
        - Remoção de qualquer metadado sensível de discentes
        - Integridade e anonimização de turmas e docentes
        - [RN07] Supressão do quantitativo discente em turmas com menos de 5 estudantes
        """
        disciplinas: List[SIGAADisciplinaClean] = data.get("disciplinas", [])
        docentes: List[SIGAADocenteClean] = data.get("docentes", [])
        turmas: List[SIGAATurmaClean] = data.get("turmas", [])

        clean_turmas: List[SIGAATurmaClean] = []
        for t in turmas:
            # 1. Garante que lista de docentes não contenha campos indevidos
            docentes_limpos = [
                d for d in t.docentes
                if not any(termo in d.lower() for termo in ["cpf", "matrícula", "matricula", "@"])
            ]
            t.docentes = docentes_limpos

            # 2. [RN07] Proteção para turmas com baixa amostragem (< 5 estudantes)
            if t.matriculados is not None and t.matriculados < self.amostragem_minima:
                self.logger.warning(
                    f"Aplicando RN07 (LGPD): Turma {t.codigo_turma} da disciplina {t.codigo_disciplina} "
                    f"possui apenas {t.matriculados} matriculados (< {self.amostragem_minima}). "
                    f"Dado individual de matriculados suprimido para impedir reidentificação discente."
                )
                t.amostragem_suprimida_lgpd = True
                t.matriculados = None

            clean_turmas.append(t)

        return {
            "disciplinas": disciplinas,
            "docentes": docentes,
            "turmas": clean_turmas,
        }

    def sanitize_metricas(self, metricas: List[MetricaAcademicaClean]) -> List[MetricaAcademicaClean]:
        """
        Aplica a regra RN07 sobre a lista de métricas acadêmicas.
        
        Para registros com matriculados < 5:
        1. Consolida os quantitativos brutos no acumulado geral da disciplina (RN07).
        2. Remove o registro individual da lista de saída para impedir que a existência
           e o quantitativo da turma de baixa amostragem sejam expostos individualmente.
        """
        sanitizadas: List[MetricaAcademicaClean] = []
        self.acumulados_gerais.clear()

        for m in metricas:
            cod = m.codigo_disciplina
            if cod not in self.acumulados_gerais:
                self.acumulados_gerais[cod] = {
                    "codigo_disciplina": cod,
                    "matriculados": 0,
                    "aprovados": 0,
                    "reprovados_nota": 0,
                    "reprovados_falta": 0,
                    "trancamentos": 0,
                    "total_turmas_suprimidas": 0,
                }

            # Consolidação no acumulado geral da disciplina (RN07)
            acum = self.acumulados_gerais[cod]
            acum["matriculados"] += m.matriculados
            acum["aprovados"] += m.aprovados
            acum["reprovados_nota"] += m.reprovados_nota
            acum["reprovados_falta"] += m.reprovados_falta
            acum["trancamentos"] += m.trancamentos

            if m.matriculados < self.amostragem_minima:
                self.logger.warning(
                    f"Aplicando RN07 (LGPD): Métrica de {m.codigo_disciplina} ({m.ano}/{m.semestre}) "
                    f"possui apenas {m.matriculados} matriculados (< {self.amostragem_minima}). "
                    f"Registro individual removido da saída e consolidado no acumulado geral da disciplina."
                )
                acum["total_turmas_suprimidas"] += 1
                # RN07: Remove o registro individual de baixa amostragem
                continue

            sanitizadas.append(m)

        # Computa a taxa acumulada geral
        for acum in self.acumulados_gerais.values():
            total_matr = acum["matriculados"]
            if total_matr > 0:
                taxa = (Decimal(acum["aprovados"]) / Decimal(total_matr)) * Decimal("100")
                acum["taxa_aprovacao_acumulada"] = taxa.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            else:
                acum["taxa_aprovacao_acumulada"] = Decimal("0.00")

        return sanitizadas

    def get_acumulado_geral(self, codigo_disciplina: str) -> Optional[Dict[str, Any]]:
        """Retorna as métricas agregadas consolidadas da disciplina com inclusão das amostras suprimidas."""
        return self.acumulados_gerais.get(codigo_disciplina.upper())
