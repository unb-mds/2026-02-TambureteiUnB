def calcular_taxa_evasao(desvinculados: int, matriculados: int) -> float | None:
    if desvinculados < 0 or matriculados < 0:
        raise ValueError("Quantidades de alunos não podem ser negativas.")
    if matriculados == 0:
        return None
    return round(desvinculados / matriculados * 100, 2)


def calcular_media(valores: list[float]) -> float | None:
    if not valores:
        return None
    return round(sum(valores) / len(valores), 2)
