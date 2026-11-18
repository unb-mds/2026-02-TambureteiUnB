import re
from typing import Optional, Tuple

PADRAO_SEMESTRE = re.compile(r"^\d{4}\.[1-4]$")
PRIMEIRO_PERIODO = 1
ULTIMO_PERIODO = 4  # inclui periodos de verao (.3/.4) aceitos pelo padrao canonico


def semestre_valido(valor: str) -> bool:
    return bool(PADRAO_SEMESTRE.match(valor))


def intervalo_anos_valido(ano_inicio: Optional[int], ano_fim: Optional[int]) -> bool:
    """So e invalido quando os dois limites existem e o fim e anterior ao inicio."""
    if ano_inicio is None or ano_fim is None:
        return True
    return ano_fim >= ano_inicio


def intervalo_semestres(
    ano_inicio: Optional[int], ano_fim: Optional[int]
) -> Tuple[Optional[str], Optional[str]]:
    """Converte anos em limites de semestre. Ex.: (2022, 2024) -> ("2022.1", "2024.4")."""
    semestre_inicio = f"{ano_inicio}.{PRIMEIRO_PERIODO}" if ano_inicio is not None else None
    semestre_fim = f"{ano_fim}.{ULTIMO_PERIODO}" if ano_fim is not None else None
    return semestre_inicio, semestre_fim
