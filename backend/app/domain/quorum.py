from dataclasses import dataclass
from decimal import Decimal
from typing import Optional, Sequence


@dataclass(frozen=True)
class GrupoValores:
    """Doações com exatamente os mesmos valores nas 4 taxas."""

    taxa_aprovacao: Decimal
    taxa_reprovacao_nota: Decimal
    taxa_reprovacao_falta: Decimal
    taxa_trancamento: Decimal
    quantidade: int
    consolidadas: int = 0


def escolher_vencedor(grupos: Sequence, quorum: int) -> Optional[GrupoValores]:
    """
    Só concorrem grupos com quantidade >= quórum.
    Vence o de maior quantidade; empate no topo não consolida ninguém.
    """
    elegiveis = sorted(
        (g for g in grupos if g.quantidade >= quorum),
        key=lambda g: g.quantidade,
        reverse=True,
    )
    if not elegiveis:
        return None
    if len(elegiveis) > 1 and elegiveis[0].quantidade == elegiveis[1].quantidade:
        return None
    return elegiveis[0]