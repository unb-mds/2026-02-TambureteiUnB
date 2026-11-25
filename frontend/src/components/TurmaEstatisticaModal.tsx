"use client";

import React, { useState, useEffect, useId, useMemo } from "react";
import Button from "@/components/Button";
import {
  TurmaCursadaVerificada,
  TurmaEstatisticaStatusItem,
} from "@/types/turmaEstatisticaSubmissao";
import {
  buildTurmaStatusKey,
  consultarStatusTurmasPizza,
  normalizarCodigoTurma,
  validarVinculoEstudanteTurma,
} from "@/services/turmaEstatisticaService";
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [taxaAprovacao, setTaxaAprovacao] = useState<string>("");
  const [taxaReprovacao, setTaxaReprovacao] = useState<string>("");
  const [taxaReprovacaoFalta, setTaxaReprovacaoFalta] = useState<string>("");
  const [taxaTrancamento, setTaxaTrancamento] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const statusRequestKey = useMemo(
    () =>
      isOpen && turmasCursadas.length > 0
        ? turmasCursadas
            .map((t) => buildTurmaStatusKey(t.codigo, t.turma, t.semestre))
            .join("|")
        : "",
    [isOpen, turmasCursadas]
  );
  const [loadedRequestKey, setLoadedRequestKey] = useState<string>("");
  const loadingStatus = Boolean(statusRequestKey) && loadedRequestKey !== statusRequestKey;
  const [statusPorChave, setStatusPorChave] = useState<
    Record<string, TurmaEstatisticaStatusItem>
  >({});
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const fileInputId = useId();

  useEffect(() => {
    if (!statusRequestKey) {
      return;
    }

    let cancelado = false;

    consultarStatusTurmasPizza(turmasCursadas)
      .then((mapa) => {
        if (cancelado) return;
        setStatusPorChave(mapa);

        const primeiroDisponivel = turmasCursadas.findIndex((t) => {
          const st = mapa[buildTurmaStatusKey(t.codigo, t.turma, t.semestre)];
          return !st?.ja_possui_pizza && !st?.ja_enviada_usuario;
        });

        if (primeiroDisponivel !== -1) {
          setSelectedTurmaIndex(primeiroDisponivel);
        }
      })
      .catch(() => {
        if (!cancelado) {
          setStatusPorChave({});
        }
      })
      .finally(() => {
        if (!cancelado) {
          setLoadedRequestKey(statusRequestKey);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [statusRequestKey, turmasCursadas]);

  const statusLista = useMemo(
    () =>
      turmasCursadas.map(
        (t) => statusPorChave[buildTurmaStatusKey(t.codigo, t.turma, t.semestre)] ?? null
      ),
    [turmasCursadas, statusPorChave]
  );

  const todasTurmasIndisponiveis =
    turmasCursadas.length > 0 &&
    statusLista.every((st) => Boolean(st?.ja_possui_pizza || st?.ja_enviada_usuario));

  if (!isOpen) return null;

  const turmaSelecionada = turmasCursadas[selectedTurmaIndex] || null;
  const statusSelecionado = statusLista[selectedTurmaIndex] || null;
  const isTurmaSelecionadaIndisponivel = Boolean(
    statusSelecionado?.ja_possui_pizza || statusSelecionado?.ja_enviada_usuario
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedbackError("Por favor, selecione um arquivo de imagem (PNG ou JPG) com o gráfico de pizza do SIGAA.");
      return;
    }

    setImageFile(file);
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

    if (isTurmaSelecionadaIndisponivel) {
      setFeedbackError(
        statusSelecionado?.ja_possui_pizza
          ? "Esta turma e semestre já possuem estatísticas oficiais do gráfico de pizza."
          : "Você já enviou estatísticas para esta turma neste semestre."
      );
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

    const camposBrutos = [
      taxaAprovacao.trim(),
      taxaReprovacao.trim(),
      taxaReprovacaoFalta.trim(),
      taxaTrancamento.trim(),
    ];
    const algumCampoPreenchido = camposBrutos.some((c) => c !== "");
    const todosCamposPreenchidos = camposBrutos.every((c) => c !== "");

    if (!imageFile && !todosCamposPreenchidos) {
      setFeedbackError(
        "Anexe o print do gráfico do SIGAA ou preencha os 4 percentuais manualmente (Aprovação, Reprovação, Falta e Trancamento)."
      );
      return;
    }

    if (imageFile && algumCampoPreenchido && !todosCamposPreenchidos) {
      setFeedbackError(
        "Ao informar os percentuais junto com o print, preencha todos os 4 campos (ou deixe os 4 em branco para o moderador extrair da imagem)."
      );
      return;
    }

    let valoresParaEnvio: { apr: number; rep: number; repFalta: number; tranc: number } | null = null;
    if (todosCamposPreenchidos) {
      const apr = parseFloat(taxaAprovacao);
      const rep = parseFloat(taxaReprovacao);
      const repFalta = parseFloat(taxaReprovacaoFalta);
      const tranc = parseFloat(taxaTrancamento);

      if (isNaN(apr) || isNaN(rep) || isNaN(repFalta) || isNaN(tranc)) {
        setFeedbackError("Informe números válidos nos 4 percentuais do gráfico do SIGAA.");
        return;
      }

      if (apr < 0 || rep < 0 || repFalta < 0 || tranc < 0 || apr > 100 || rep > 100 || repFalta > 100 || tranc > 100) {
        setFeedbackError("Cada percentual deve estar entre 0% e 100%.");
        return;
      }

      const soma = Math.round((apr + rep + repFalta + tranc) * 100) / 100;
      if (Math.abs(100 - soma) > 0.2) {
        setFeedbackError(
          `A soma dos 4 percentuais deve fechar 100% (tolerância de ±0.2% para arredondamento do SIGAA; soma atual: ${soma}%).`
        );
        return;
      }
      valoresParaEnvio = { apr, rep, repFalta, tranc };
    }

    setSubmitting(true);

    const resolverTurmaId = async (): Promise<number> => {
      const idResolvido = statusSelecionado?.turma_id || turmaSelecionada.turma_id;
      if (idResolvido) {
        return idResolvido;
      }

      const disciplinas = await request<Array<{ id: number; slug: string; codigo: string }>>(
        `/cadeiras?codigo=${encodeURIComponent(turmaSelecionada.codigo)}`
      );
      const discEncontrada = disciplinas.find(
        (d) => d.codigo.toUpperCase() === turmaSelecionada.codigo.toUpperCase()
      );

      if (!discEncontrada) {
        throw new ApiError(
          `A disciplina ${turmaSelecionada.codigo} não foi encontrada no catálogo da plataforma.`,
          404
        );
      }

      const turmasApi = await request<
        Array<{ id: number; codigo_turma: string; semestre: string; professores?: Array<{ nome: string }> }>
      >(
        `/turmas?disciplina_id=${discEncontrada.id}&semestre=${encodeURIComponent(
          turmaSelecionada.semestre
        )}`
      );

      const codigoNorm = normalizarCodigoTurma(turmaSelecionada.turma);
      const turmaEncontrada = turmasApi.find(
        (t) =>
          t.codigo_turma.toUpperCase() === turmaSelecionada.turma.trim().toUpperCase() ||
          normalizarCodigoTurma(t.codigo_turma) === codigoNorm
      );

      if (!turmaEncontrada?.id) {
        throw new ApiError(
          `A turma ${turmaSelecionada.turma} da disciplina ${turmaSelecionada.codigo} no semestre ${turmaSelecionada.semestre} ainda não possui registro cadastrado. Reimporte seu histórico para cadastrar os vínculos de todas as turmas e tente novamente.`,
          404
        );
      }

      return turmaEncontrada.id;
    };

    resolverTurmaId()
      .then((turmaIdReal) => {
        const formData = new FormData();
        formData.append("semestre_referencia", turmaSelecionada.semestre);
        if (imageFile) {
          formData.append("arquivo", imageFile);
        }
        if (valoresParaEnvio) {
          formData.append("taxa_aprovacao", String(valoresParaEnvio.apr));
          formData.append("taxa_reprovacao_nota", String(valoresParaEnvio.rep));
          formData.append("taxa_reprovacao_falta", String(valoresParaEnvio.repFalta));
          formData.append("taxa_trancamento", String(valoresParaEnvio.tranc));
        }

        return request(`/turmas/${turmaIdReal}/doacoes/upload`, {
          method: "POST",
          body: formData,
        });
      })
      .then(() => {
        setSubmitting(false);
        const chave = buildTurmaStatusKey(
          turmaSelecionada.codigo,
          turmaSelecionada.turma,
          turmaSelecionada.semestre
        );
        setStatusPorChave((prev) => ({
          ...prev,
          [chave]: {
            codigo: turmaSelecionada.codigo,
            turma: turmaSelecionada.turma,
            semestre: turmaSelecionada.semestre,
            turma_id: statusSelecionado?.turma_id ?? null,
            ja_possui_pizza: statusSelecionado?.ja_possui_pizza ?? false,
            ja_possui_historico: statusSelecionado?.ja_possui_historico ?? false,
            ja_enviada_usuario: true,
          },
        }));
        setTaxaAprovacao("");
        setTaxaReprovacao("");
        setTaxaReprovacaoFalta("");
        setTaxaTrancamento("");
        setImageFile(null);
        setImagePreview(null);
        setFeedbackSuccess("Estatísticas enviadas para a fila de moderação humana!");
        if (onSuccess) {
          onSuccess("Estatísticas da turma enviadas para a fila de moderação com sucesso!");
        }
      })
      .catch((err) => {
        setSubmitting(false);
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setFeedbackError("Você precisa estar autenticado como estudante para enviar estatísticas.");
            return;
          }
          if (err.status === 403 || err.status === 404 || err.status === 409 || err.status === 422) {
            setFeedbackError(err.message || "Não foi possível enviar as estatísticas desta turma.");
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
      <div className="relative w-full max-w-xl rounded-3xl bg-[var(--surface)] text-[var(--foreground)] p-6 sm:p-8 shadow-2xl border border-[var(--border-subtle)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary-text)]">
              Colaboração Verificada
            </span>
            <h2 id="modal-turma-estatistica-title" className="text-xl font-bold text-[var(--foreground)]">
              Enviar Gráfico de Pizza & Estatísticas da Turma
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="rounded-xl p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Aviso de Comprovacao */}
        <div className="mt-4 rounded-2xl border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-4 text-xs text-[var(--status-success-text)] leading-relaxed">
          <p className="font-semibold text-[var(--status-success-text)]">
            Comprovação Obrigatória de Vínculo:
          </p>
          <p className="mt-0.5">
            Para garantir a veracidade dos dados, você só pode submeter gráficos de turmas em que esteve efetivamente matriculado(a), comprovadas pelo seu Histórico Escolar importado. Turmas trancadas, canceladas ou ainda em andamento não entram na seleção.
          </p>
        </div>

        {turmasCursadas.length === 0 ? (
          <div className="mt-6 text-center py-6">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Nenhuma turma concluída encontrada.
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Importe o seu Histórico Escolar oficial do SIGAA (PDF) com disciplinas já finalizadas antes de enviar os gráficos. Turmas trancadas, canceladas ou ainda em andamento não entram na seleção.
            </p>
            <Button variant="outline" size="sm" onClick={onClose} className="mt-4">
              Entendido
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            {/* Seletor de Turma Comprovada */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor="select-turma" className="block text-xs font-bold text-[var(--foreground)] uppercase">
                  1. Selecione a Turma Cursada (Verificada pelo Histórico)
                </label>
                {loadingStatus && (
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">
                    Verificando turmas...
                  </span>
                )}
              </div>
              <select
                id="select-turma"
                value={selectedTurmaIndex}
                onChange={(e) => {
                  setSelectedTurmaIndex(Number(e.target.value));
                  setFeedbackError(null);
                  setFeedbackSuccess(null);
                }}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3.5 py-2.5 text-sm font-semibold text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)] focus:bg-[var(--surface)]"
              >
                {turmasCursadas.map((t, idx) => {
                  const st = statusLista[idx];
                  const indisponivel = Boolean(st?.ja_possui_pizza || st?.ja_enviada_usuario);
                  const sufixoStatus = st?.ja_possui_pizza
                    ? " — Indisponível (já possui dados da pizza)"
                    : st?.ja_enviada_usuario
                    ? " — Já enviada por você"
                    : "";
                  return (
                    <option
                      key={`${t.codigo}-${t.turma}-${t.semestre}-${idx}`}
                      value={idx}
                      disabled={indisponivel}
                    >
                      {t.codigo} - {t.nome} (Turma {t.turma} • {t.semestre}){sufixoStatus}
                    </option>
                  );
                })}
              </select>

              {todasTurmasIndisponiveis && (
                <p className="mt-2 rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-xs font-medium text-[var(--status-warning-text)]">
                  Todas as turmas do seu histórico já possuem estatísticas consolidadas via gráfico de pizza ou já foram enviadas por você.
                </p>
              )}
            </div>

            {/* Informacoes de Docente e situacao atual */}
            {turmaSelecionada && (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-muted)] space-y-1">
                <div>
                  <span className="font-semibold text-[var(--foreground)]">Docente(s) no histórico: </span>
                  {turmaSelecionada.professores.length > 0
                    ? turmaSelecionada.professores.join(", ")
                    : "Docente não informado no histórico"}
                </div>
                {statusSelecionado?.ja_possui_historico && !statusSelecionado.ja_possui_pizza && (
                  <p className="text-[11px] text-[var(--primary-text)] font-medium">
                    Esta turma exibe estimativa baseada em históricos; ao validar o gráfico de pizza, ele substituirá esses valores.
                  </p>
                )}
              </div>
            )}

            {/* Anexo do print do SIGAA (permite envio apenas com imagem) */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 space-y-3">
              <div>
                <label htmlFor={fileInputId} className="block text-xs font-bold text-[var(--foreground)] uppercase mb-1">
                  2. Print do Gráfico do SIGAA (Opcional)
                </label>
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  Com o print anexado, a moderação aprova diretamente por inspeção visual e os percentuais abaixo tornam-se opcionais. Sem imagem, o envio manual exige consenso de pelo menos 5 outros formulários iguais para receber o selo verde.
                </p>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleImageChange}
                  className="block w-full text-xs text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-[var(--border-subtle)] file:text-xs file:font-semibold file:bg-[var(--primary-soft)] file:text-[var(--primary-text)] hover:file:opacity-90 cursor-pointer"
                />
              </div>

              {/* Pre-visualizacao da imagem do grafico */}
              {imagePreview && (
                <div className="rounded-xl border border-[var(--border-subtle)] p-2.5 bg-[var(--surface)] flex flex-col items-center gap-2">
                  <div className="flex w-full items-center justify-between px-1">
                    <p className="text-[11px] font-semibold text-[var(--text-muted)]">Print do Gráfico do SIGAA Anexado</p>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="text-[11px] font-semibold text-[var(--status-danger-text)] hover:underline"
                    >
                      Remover print
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Pré-visualização do gráfico de pizza do SIGAA"
                    className="max-h-40 rounded-lg object-contain shadow-xs"
                  />
                </div>
              )}
            </div>

            {/* Campos de percentuais lidos */}
            <div className="border-t border-[var(--border-subtle)] pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold text-[var(--foreground)] uppercase">
                  3. Valores Registrados no Gráfico ({imageFile ? "Opcional com imagem" : "Obrigatório sem imagem, soma 100%"})
                </p>
                <span className="text-[10px] text-[var(--text-muted)] font-medium">
                  Extraia os 4 valores do gráfico de pizza
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label htmlFor="taxa-apr" className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Aprovação (%)
                  </label>
                  <input
                    id="taxa-apr"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 62.6"
                    value={taxaAprovacao}
                    onChange={(e) => setTaxaAprovacao(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--primary)] focus:bg-[var(--surface)]"
                  />
                </div>
                <div>
                  <label htmlFor="taxa-rep" className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Reprovação (%)
                  </label>
                  <input
                    id="taxa-rep"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 24.3"
                    value={taxaReprovacao}
                    onChange={(e) => setTaxaReprovacao(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--primary)] focus:bg-[var(--surface)]"
                  />
                </div>
                <div>
                  <label htmlFor="taxa-falta" className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Por Falta (%)
                  </label>
                  <input
                    id="taxa-falta"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 6.5"
                    value={taxaReprovacaoFalta}
                    onChange={(e) => setTaxaReprovacaoFalta(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--primary)] focus:bg-[var(--surface)]"
                  />
                </div>
                <div>
                  <label htmlFor="taxa-tranc" className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Trancamento (%)
                  </label>
                  <input
                    id="taxa-tranc"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 6.5"
                    value={taxaTrancamento}
                    onChange={(e) => setTaxaTrancamento(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--primary)] focus:bg-[var(--surface)]"
                  />
                </div>
              </div>
            </div>

            {feedbackError && (
              <p role="alert" className="text-xs font-semibold text-[var(--status-danger-text)] bg-[var(--status-danger-bg)] p-3 rounded-xl border border-[var(--status-danger-border)]">
                {feedbackError}
              </p>
            )}

            {feedbackSuccess && (
              <p role="status" className="text-xs font-semibold text-[var(--status-success-text)] bg-[var(--status-success-bg)] p-3 rounded-xl border border-[var(--status-success-border)]">
                {feedbackSuccess}
              </p>
            )}

            <div className="mt-2 flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting || loadingStatus || !turmaSelecionada || isTurmaSelecionadaIndisponivel}
              >
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
