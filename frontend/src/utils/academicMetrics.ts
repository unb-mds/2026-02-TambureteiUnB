export function hasApprovalData(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function formatPositiveMetric(
  value: number | null | undefined,
  suffix = "",
): string {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? `${value}${suffix}`
    : "Sem dados";
}

export function formatExactPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return Number(value.toFixed(2)).toString();
}

export interface TurmaTaxasResumidas {
  aprovacao: number;
  reprovacao: number;
  trancamento: number;
}

export interface TurmaTaxasDetalhadas {
  aprovacao: number;
  reprovacaoNota: number;
  reprovacaoFalta: number;
  trancamento: number;
}

function normalizarParcelasCem(bruto: number[]): number[] {
  const limpos = bruto.map((valor) =>
    Number.isFinite(valor) ? Math.max(0, valor) : 0,
  );
  const somaBruta = limpos.reduce((acc, val) => acc + val, 0);
  if (somaBruta <= 0) {
    return limpos.map(() => 0);
  }

  const escalados = limpos.map((valor) => (valor / somaBruta) * 10000);
  const inteiros = escalados.map((valor) => Math.floor(valor));
  const somaInteiros = inteiros.reduce((acc, val) => acc + val, 0);
  const restante = 10000 - somaInteiros;

  if (restante > 0) {
    const indicesOrdenados = limpos
      .map((_, i) => i)
      .sort(
        (i, j) => escalados[j] - inteiros[j] - (escalados[i] - inteiros[i]),
      );
    for (let k = 0; k < restante; k += 1) {
      inteiros[indicesOrdenados[k % indicesOrdenados.length]] += 1;
    }
  }

  return inteiros.map((centesimos) => centesimos / 100);
}

/**
 * Preserva até 2 casas decimais das taxas de turma (evitando perda de precisão
 * por Math.round inteiro) e ajusta centésimos residuais pelo método dos
 * maiores restos para garantir que a soma dos 3 indicadores seja sempre 100%.
 */
export function resumirTaxasTurma(estatistica: {
  taxa_aprovacao: number;
  taxa_reprovacao_nota: number;
  taxa_reprovacao_falta: number;
  taxa_trancamento: number;
}): TurmaTaxasResumidas {
  const [aprovacao, reprovacao, trancamento] = normalizarParcelasCem([
    estatistica.taxa_aprovacao,
    (Number.isFinite(estatistica.taxa_reprovacao_nota)
      ? estatistica.taxa_reprovacao_nota
      : 0) +
      (Number.isFinite(estatistica.taxa_reprovacao_falta)
        ? estatistica.taxa_reprovacao_falta
        : 0),
    estatistica.taxa_trancamento,
  ]);

  return { aprovacao, reprovacao, trancamento };
}

/**
 * Versão estratificada em 4 parcelas (aprovação, reprovação por nota,
 * reprovação por falta e trancamento), preservando decimais e garantindo soma 100%.
 */
export function resumirTaxasTurmaDetalhadas(estatistica: {
  taxa_aprovacao: number;
  taxa_reprovacao_nota: number;
  taxa_reprovacao_falta: number;
  taxa_trancamento: number;
}): TurmaTaxasDetalhadas {
  const [aprovacao, reprovacaoNota, reprovacaoFalta, trancamento] =
    normalizarParcelasCem([
      estatistica.taxa_aprovacao,
      estatistica.taxa_reprovacao_nota,
      estatistica.taxa_reprovacao_falta,
      estatistica.taxa_trancamento,
    ]);

  return { aprovacao, reprovacaoNota, reprovacaoFalta, trancamento };
}
