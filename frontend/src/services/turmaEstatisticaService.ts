import { HistoricoImportacaoResponse } from "@/types/historico";
import {
  TurmaCursadaVerificada,
  TurmaEstatisticaStatusItem,
} from "@/types/turmaEstatisticaSubmissao";
import { request } from "@/services/httpClient";

export const STORAGE_TURMA_ESTATISTICAS_KEY = "tamburetei_turma_estatisticas_submissoes";

export function normalizarCodigoTurma(turmaBruta: string | null | undefined): string {
  const limpo = (turmaBruta ?? "").trim().toUpperCase();
  if (!limpo || limpo === "-" || limpo === "--" || limpo === "---") {
    return "";
  }
  if (/^\d+$/.test(limpo)) {
    return limpo.padStart(2, "0").slice(0, 10);
  }
  return limpo.slice(0, 10);
}

export function buildTurmaStatusKey(
  codigo: string,
  turma: string,
  semestre: string
): string {
  return `${codigo.trim().toUpperCase()}::${normalizarCodigoTurma(turma) || turma.trim().toUpperCase()}::${semestre.trim()}`;
}

export async function consultarStatusTurmasPizza(
  turmas: TurmaCursadaVerificada[]
): Promise<Record<string, TurmaEstatisticaStatusItem>> {
  if (!turmas || turmas.length === 0) {
    return {};
  }

  const resp = await request<{ itens: TurmaEstatisticaStatusItem[] }>(
    "/perfil/turmas-estatisticas/status",
    {
      method: "POST",
      body: JSON.stringify({
        itens: turmas.map((t) => ({
          codigo: t.codigo,
          turma: t.turma,
          semestre: t.semestre,
          professores: t.professores ?? [],
        })),
      }),
    }
  );

  const mapa: Record<string, TurmaEstatisticaStatusItem> = {};
  for (const item of resp?.itens ?? []) {
    mapa[buildTurmaStatusKey(item.codigo, item.turma, item.semestre)] = item;
  }
  return mapa;
}

const SITUACOES_CONCLUIDAS_PIZZA = new Set([
  "APR",
  "REP",
  "REPF",
  "REPMF",
]);

export function extrairTurmasCursadasDoHistorico(
  historico: HistoricoImportacaoResponse | null
): TurmaCursadaVerificada[] {
  if (!historico?.dados_academicos) {
    return [];
  }

  // Apenas turmas já finalizadas (exclui `historico.cursando` e situações em andamento como MATR),
  // pois turmas em curso ainda não possuem gráfico de pizza consolidado no SIGAA.
  const cursadas = historico.cursadas || [];

  return cursadas
    .filter((item): item is typeof item & { turma: string } => {
      const situacaoNorm = (item.situacao || "").trim().toUpperCase();
      return (
        Boolean(item.codigo && item.turma && item.turma.trim() !== "--") &&
        Boolean(item.semestre && /^\d{4}\.\d+$/.test(item.semestre.trim())) &&
        SITUACOES_CONCLUIDAS_PIZZA.has(situacaoNorm)
      );
    })
    .map((item) => ({
      codigo: item.codigo.trim().toUpperCase(),
      nome: item.nome.trim(),
      turma: item.turma.trim(),
      semestre: item.semestre.trim(),
      professores: item.professores || [],
      situacao: item.situacao,
      comprovado_pelo_historico: true,
    }));
}

export function validarVinculoEstudanteTurma(
  turmasValidadas: TurmaCursadaVerificada[],
  codigoDisciplina: string,
  codigoTurma: string,
  semestre: string
): { valido: boolean; motivo?: string } {
  if (!turmasValidadas || turmasValidadas.length === 0) {
    return {
      valido: false,
      motivo: "Nenhum histórico oficial do SIGAA foi importado para comprovar sua matrícula.",
    };
  }

  const encontrada = turmasValidadas.find(
    (t) =>
      t.codigo.toUpperCase() === codigoDisciplina.trim().toUpperCase() &&
      t.turma.toUpperCase() === codigoTurma.trim().toUpperCase() &&
      t.semestre === semestre.trim()
  );

  if (encontrada && (!encontrada.comprovado_pelo_historico || !SITUACOES_CONCLUIDAS_PIZZA.has(encontrada.situacao.trim().toUpperCase()))) {
    return {valido:false, motivo:"Envie estatísticas apenas de turmas concluídas; trancamentos e cancelamentos não são elegíveis."};
  }

  if (!encontrada) {
    return {
      valido: false,
      motivo: "Não foi encontrado registro de matrícula para esta disciplina/turma no histórico importado.",
    };
  }

  return { valido: true };
}
