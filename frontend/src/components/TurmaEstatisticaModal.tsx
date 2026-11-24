"use client";

import React, { useState, useId } from "react";
import Button from "@/components/Button";
import { TurmaCursadaVerificada } from "@/types/turmaEstatisticaSubmissao";
import { validarVinculoEstudanteTurma } from "@/services/turmaEstatisticaService";
import { request, ApiError } from "@/services/httpClient";

export interface TurmaEstatisticaModalProps {
  isOpen: boolean;
  turmasCursadas: TurmaCursadaVerificada[];
  onClose: () => void;
  onSuccess?: (mensagem: string) => void;
}

export const TurmaEstatisticaModal: React.FC<TurmaEstatisticaModalProps> = ({
  isOpen,
  turmasCursadas,
  onClose,
  onSuccess,
}) => {
  const [selectedTurmaIndex, setSelectedTurmaIndex] = useState<number>(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [taxaAprovacao, setTaxaAprovacao] = useState<string>("");
  const [taxaReprovacao, setTaxaReprovacao] = useState<string>("");
  const [taxaReprovacaoFalta, setTaxaReprovacaoFalta] = useState<string>("");
  const [taxaTrancamento, setTaxaTrancamento] = useState<string>("");
  const [professorDigitado, setProfessorDigitado] = useState<string>("");
  const [turmaDigitada, setTurmaDigitada] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const fileInputId = useId();

  if (!isOpen) return null;

  const turmaSelecionada = turmasCursadas[selectedTurmaIndex] || null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedbackError("Por favor, selecione um arquivo de imagem (PNG ou JPG) com o gráfico de pizza do SIGAA.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      setFeedbackError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);

    if (!turmaSelecionada) {
      setFeedbackError("Selecione uma turma válida que você cursou para enviar as estatísticas.");
      return;
    }

    // Valida comprovacao pelo historico
    const validacao = validarVinculoEstudanteTurma(
      turmasCursadas,
      turmaSelecionada.codigo,
      turmaSelecionada.turma,
      turmaSelecionada.semestre
    );

    if (!validacao.valido) {
      setFeedbackError(validacao.motivo || "Erro de validação de vínculo.");
      return;
    }

    if (!imagePreview && (!professorDigitado.trim() || !turmaDigitada.trim())) {
      setFeedbackError("Anexe a imagem/print do gráfico do SIGAA ou informe o nome do professor e o número da turma comprovada.");
      return;
    }

    const apr = parseFloat(taxaAprovacao);
    const rep = parseFloat(taxaReprovacao);
    const repFalta = parseFloat(taxaReprovacaoFalta);
    const tranc = parseFloat(taxaTrancamento);

    if (isNaN(apr) || isNaN(rep) || isNaN(repFalta) || isNaN(tranc)) {
      setFeedbackError("Informe todos os 4 percentuais registrados no gráfico do SIGAA (Aprovação, Reprovação, Falta e Trancamento).");
      return;
    }

    const soma = Math.round((apr + rep + repFalta + tranc) * 100) / 100;
    if (soma !== 100) {
      setFeedbackError(`A soma dos 4 percentuais informados deve ser exatamente 100% (soma atual: ${soma}%).`);
      return;
    }

    setSubmitting(true);

    // 1. Busca a disciplina pelo código exato via /cadeiras?codigo=...
    request<Array<{ id: number; slug: string; codigo: string }>>(
      `/cadeiras?codigo=${encodeURIComponent(turmaSelecionada.codigo)}`
    )
      .then(async (disciplinas) => {
        const discEncontrada = disciplinas.find(
          (d) => d.codigo.toUpperCase() === turmaSelecionada.codigo.toUpperCase()
        );

        if (!discEncontrada) {
          throw new ApiError(
            `A disciplina ${turmaSelecionada.codigo} não foi encontrada no catálogo da plataforma.`,
            404
          );
        }

        // 2. Consulta as turmas da disciplina pelo ID e semestre
        const turmasApi = await request<
          Array<{ id: number; codigo_turma: string; semestre: string }>
        >(
          `/turmas?disciplina_id=${discEncontrada.id}&semestre=${encodeURIComponent(
            turmaSelecionada.semestre
          )}`
        );

        const codigoTurmaFinal = turmaDigitada.trim() || turmaSelecionada.turma;
        const turmaEncontrada = turmasApi.find(
          (t) =>
            t.codigo_turma.toUpperCase() === codigoTurmaFinal.toUpperCase()
        );

        const turmaIdReal = turmaEncontrada?.id || turmaSelecionada.turma_id;

        if (!turmaIdReal) {
          throw new ApiError(
            `A turma ${turmaSelecionada.turma} da disciplina ${turmaSelecionada.codigo} no semestre ${turmaSelecionada.semestre} ainda não possui registro cadastrado na base de turmas do Tamburetei para receber estatísticas consolidadas.`,
            404
          );
        }

        const payload = {
          semestre_referencia: turmaSelecionada.semestre,
          taxa_aprovacao: apr,
          taxa_reprovacao_nota: rep,
          taxa_reprovacao_falta: repFalta,
          taxa_trancamento: tranc,
        };

        return request(`/turmas/${turmaIdReal}/doacoes`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      })
      .then(() => {
        setSubmitting(false);
        setFeedbackSuccess("Estatísticas da turma enviadas com sucesso para moderação e validação!");
        if (onSuccess) {
          onSuccess("Estatísticas da turma enviadas para moderação com sucesso!");
        }
      })
      .catch((err) => {
        setSubmitting(false);
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setFeedbackError("Você precisa estar autenticado como estudante para enviar estatísticas.");
            return;
          }
          if (err.status === 404) {
            setFeedbackError(err.message || "Turma não encontrada para o semestre indicado.");
            return;
          }
        }
        setFeedbackError("Erro ao enviar dados. Verifique os valores informados e tente novamente.");
      });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-turma-estatistica-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B4BDB]">
              Colaboração Verificada
            </span>
            <h2 id="modal-turma-estatistica-title" className="text-xl font-bold text-[#202124]">
              Enviar Gráfico de Pizza & Estatísticas da Turma
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Aviso de Comprovacao */}
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 leading-relaxed">
          <p className="font-semibold text-emerald-950">
            Comprovação Obrigatória de Vínculo:
          </p>
          <p className="mt-0.5">
            Para garantir a veracidade dos dados, você só pode submeter gráficos de turmas em que esteve efetivamente matriculado(a), comprovadas pelo seu Histórico Escolar importado.
          </p>
        </div>

        {turmasCursadas.length === 0 ? (
          <div className="mt-6 text-center py-6">
            <p className="text-sm font-semibold text-gray-700">
              Nenhuma turma comprovada encontrada.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Importe primeiro o seu Histórico Escolar oficial do SIGAA (PDF) na seção acima antes de enviar os gráficos de turmas.
            </p>
            <Button variant="outline" size="sm" onClick={onClose} className="mt-4">
              Entendido
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            {/* Seletor de Turma Comprovada */}
            <div>
              <label htmlFor="select-turma" className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                1. Selecione a Turma Cursada (Verificada pelo Histórico)
              </label>
              <select
                id="select-turma"
                value={selectedTurmaIndex}
                onChange={(e) => setSelectedTurmaIndex(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 bg-[#F7F7FA] px-3.5 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-[#5B4BDB] focus:bg-white"
              >
                {turmasCursadas.map((t, idx) => (
                  <option key={`${t.codigo}-${t.turma}-${t.semestre}`} value={idx}>
                    {t.codigo} - {t.nome} (Turma {t.turma} • {t.semestre})
                  </option>
                ))}
              </select>
            </div>

            {/* Informacoes de Docente e Complemento Escrito */}
            {turmaSelecionada && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                <span className="font-semibold text-gray-800">Docente(s) no histórico: </span>
                {turmaSelecionada.professores.length > 0
                  ? turmaSelecionada.professores.join(", ")
                  : "Docente não informado no histórico"}
              </div>
            )}

            {/* Opção de Envio: Print do Gráfico ou Dados Escritos (Professor e Turma) */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-3">
              <div>
                <label htmlFor={fileInputId} className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  2. Anexe o Print do Gráfico do SIGAA (ou preencha os dados abaixo)
                </label>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleImageChange}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#5B4BDB]/10 file:text-[#5B4BDB] hover:file:bg-[#5B4BDB]/20 cursor-pointer"
                />
              </div>

              {/* Pre-visualizacao da imagem do grafico */}
              {imagePreview && (
                <div className="rounded-xl border border-gray-200 p-2 bg-white flex flex-col items-center">
                  <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Print do Gráfico do SIGAA Anexado</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Pré-visualização do gráfico de pizza do SIGAA"
                    className="max-h-40 rounded-lg object-contain shadow-xs"
                  />
                </div>
              )}

              {/* Identificação escrita do Professor e Turma */}
              <div className="border-t border-indigo-100/80 pt-2.5">
                <p className="text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Ou confirme/escreva os dados da turma:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="input-prof" className="block text-[11px] font-medium text-gray-600 mb-0.5">
                      Nome do Professor / Docente
                    </label>
                    <input
                      id="input-prof"
                      type="text"
                      placeholder={turmaSelecionada?.professores.join(", ") || "Ex: Prof. João da Silva"}
                      value={professorDigitado}
                      onChange={(e) => setProfessorDigitado(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-turma-num" className="block text-[11px] font-medium text-gray-600 mb-0.5">
                      Número / Código da Turma
                    </label>
                    <input
                      id="input-turma-num"
                      type="text"
                      placeholder={`Turma ${turmaSelecionada?.turma || "01"}`}
                      value={turmaDigitada}
                      onChange={(e) => setTurmaDigitada(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Campos de percentuais lidos */}
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-700 uppercase">
                  3. Valores Registrados no Gráfico (Obrigatório, soma 100%)
                </p>
                <span className="text-[10px] text-gray-500 font-medium">
                  Extraia os 4 valores do gráfico de pizza
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label htmlFor="taxa-apr" className="block text-[11px] font-medium text-gray-600 mb-1">
                    Aprovação (%)
                  </label>
                  <input
                    id="taxa-apr"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="Ex: 62.6"
                    value={taxaAprovacao}
                    onChange={(e) => setTaxaAprovacao(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="taxa-rep" className="block text-[11px] font-medium text-gray-600 mb-1">
                    Reprovação (%)
                  </label>
                  <input
                    id="taxa-rep"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="Ex: 24.3"
                    value={taxaReprovacao}
                    onChange={(e) => setTaxaReprovacao(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="taxa-falta" className="block text-[11px] font-medium text-gray-600 mb-1">
                    Por Falta (%)
                  </label>
                  <input
                    id="taxa-falta"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="Ex: 6.5"
                    value={taxaReprovacaoFalta}
                    onChange={(e) => setTaxaReprovacaoFalta(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="taxa-tranc" className="block text-[11px] font-medium text-gray-600 mb-1">
                    Trancamento (%)
                  </label>
                  <input
                    id="taxa-tranc"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="Ex: 6.5"
                    value={taxaTrancamento}
                    onChange={(e) => setTaxaTrancamento(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs"
                  />
                </div>
              </div>
            </div>

            {feedbackError && (
              <p role="alert" className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
                {feedbackError}
              </p>
            )}

            {feedbackSuccess && (
              <p role="status" className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                {feedbackSuccess}
              </p>
            )}

            <div className="mt-2 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting || !imagePreview}>
                {submitting ? "Enviando..." : "Submeter Estatísticas"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TurmaEstatisticaModal;
