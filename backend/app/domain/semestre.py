import re

PADRAO_SEMESTRE = re.compile(r"^\d{4}\.[1-4]$")


def semestre_valido(valor: str) -> bool:
    return bool(PADRAO_SEMESTRE.match(valor))