def _calcular_percentual(numerador: int, denominador: int) -> float | None:
    if numerador < 0 or denominador < 0:
        raise ValueError("Quantidades de alunos não podem ser negativas.")
    if denominador == 0:
        return None
    return round(numerador / denominador * 100, 2)


def calcular_taxa_evasao(desvinculados: int, matriculados: int) -> float | None:
    return _calcular_percentual(desvinculados, matriculados)


def calcular_taxa_formacao(concluintes: int, ingressantes: int) -> float | None:
    return _calcular_percentual(concluintes, ingressantes)


def calcular_media(valores: list[float]) -> float | None:
    if not valores:
        return None
    return round(sum(valores) / len(valores), 2)
