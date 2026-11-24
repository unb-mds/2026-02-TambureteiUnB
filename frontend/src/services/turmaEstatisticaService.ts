import { HistoricoImportacaoResponse } from "@/types/historico";
import { TurmaCursadaVerificada } from "@/types/turmaEstatisticaSubmissao";

export const STORAGE_TURMA_ESTATISTICAS_KEY = "tamburetei_turma_estatisticas_submissoes";

export function extrairTurmasCursadasDoHistorico(
  historico: HistoricoImportacaoResponse | null
): TurmaCursadaVerificada[] {
  if (!historico?.dados_academicos) {
    return [];
  }

  const cursadas = historico.cursadas || [];
  const cursando = historico.cursando || [];
  const todas = [...cursadas, ...cursando];

  return todas
    .filter((item): item is typeof item & { turma: string } => Boolean(item.codigo && item.turma && item.turma !== "--"))
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

  if (!encontrada) {
    return {
      valido: false,
      motivo: "Não foi encontrado registro de matrícula para esta disciplina/turma no histórico importado.",
    };
  }

  return { valido: true };
}
