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
  return String(value);
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

function preservarParcelas(bruto: number[]): number[] {
  return bruto.map(valor => Number.isFinite(valor) ? Math.max(0, valor) : 0);
}

/**
 * Preserva as taxas recebidas; agrega somente as duas categorias de reprovação.
 * Não reescala as parcelas para compensar diferenças da soma exibida no SIGAA.
 */
export function resumirTaxasTurma(estatistica: {
  taxa_aprovacao: number;
  taxa_reprovacao_nota: number;
  taxa_reprovacao_falta: number;
  taxa_trancamento: number;
}): TurmaTaxasResumidas {
  const [aprovacao, reprovacao, trancamento] = preservarParcelas([
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
 * reprovação por falta e trancamento), sem normalizar nem alterar as parcelas.
 */
export function resumirTaxasTurmaDetalhadas(estatistica: {
  taxa_aprovacao: number;
  taxa_reprovacao_nota: number;
  taxa_reprovacao_falta: number;
  taxa_trancamento: number;
}): TurmaTaxasDetalhadas {
  const [aprovacao, reprovacaoNota, reprovacaoFalta, trancamento] =
    preservarParcelas([
      estatistica.taxa_aprovacao,
      estatistica.taxa_reprovacao_nota,
      estatistica.taxa_reprovacao_falta,
      estatistica.taxa_trancamento,
    ]);

  return { aprovacao, reprovacaoNota, reprovacaoFalta, trancamento };
}
