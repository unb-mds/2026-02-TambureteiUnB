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
  const bruto = [
    Number.isFinite(estatistica.taxa_aprovacao)
      ? Math.max(0, estatistica.taxa_aprovacao)
      : 0,
    Math.max(
      0,
      (Number.isFinite(estatistica.taxa_reprovacao_nota)
        ? estatistica.taxa_reprovacao_nota
        : 0) +
        (Number.isFinite(estatistica.taxa_reprovacao_falta)
          ? estatistica.taxa_reprovacao_falta
          : 0),
    ),
    Number.isFinite(estatistica.taxa_trancamento)
      ? Math.max(0, estatistica.taxa_trancamento)
      : 0,
  ];

  const somaBruta = bruto[0] + bruto[1] + bruto[2];
  if (somaBruta <= 0) {
    return { aprovacao: 0, reprovacao: 0, trancamento: 0 };
  }

  const escalados = bruto.map((valor) => (valor / somaBruta) * 10000);
  const inteiros = escalados.map((valor) => Math.floor(valor));
  const restante = 10000 - (inteiros[0] + inteiros[1] + inteiros[2]);

  if (restante > 0) {
    const indicesOrdenados = [0, 1, 2].sort(
      (i, j) => escalados[j] - inteiros[j] - (escalados[i] - inteiros[i]),
    );
    for (let k = 0; k < restante; k += 1) {
      inteiros[indicesOrdenados[k % 3]] += 1;
    }
  }

  return {
    aprovacao: inteiros[0] / 100,
    reprovacao: inteiros[1] / 100,
    trancamento: inteiros[2] / 100,
  };
}
