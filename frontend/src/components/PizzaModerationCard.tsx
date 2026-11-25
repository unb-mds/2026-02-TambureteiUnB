"use client";
import { useEffect, useState } from "react";
import Button from "./Button";
import { baixarImagemPizza } from "@/services/moderacaoService";
import type { DecisaoPizzaPayload, PizzaModeracaoItem } from "@/types/moderacao";

interface PizzaModerationCardProps {
  item: PizzaModeracaoItem;
  disabled: boolean;
  onDecision: (id: number, payload: DecisaoPizzaPayload) => Promise<void>;
}

export default function PizzaModerationCard({
  item,
  disabled,
  onDecision,
}: PizzaModerationCardProps) {
  const [taxaAprovacao, setTaxaAprovacao] = useState(
    item.taxa_aprovacao !== null ? String(item.taxa_aprovacao) : "",
  );
  const [taxaReprovacaoNota, setTaxaReprovacaoNota] = useState(
    item.taxa_reprovacao_nota !== null ? String(item.taxa_reprovacao_nota) : "",
  );
  const [taxaReprovacaoFalta, setTaxaReprovacaoFalta] = useState(
    item.taxa_reprovacao_falta !== null ? String(item.taxa_reprovacao_falta) : "",
  );
  const [taxaTrancamento, setTaxaTrancamento] = useState(
    item.taxa_trancamento !== null ? String(item.taxa_trancamento) : "",
  );
  const [justificativa, setJustificativa] = useState("");
  const [erroLocal, setErroLocal] = useState("");
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [erroImagem, setErroImagem] = useState("");
  const [ampliada, setAmpliada] = useState(false);

  useEffect(() => {
    if (!item.possui_imagem) return;
    let cancelado = false;
    let urlGerada: string | null = null;

    baixarImagemPizza(item.id)
      .then((blob) => {
        if (cancelado) return;
        urlGerada = URL.createObjectURL(blob);
        setImagemUrl(urlGerada);
      })
      .catch((err) => {
        if (!cancelado) {
          setErroImagem(err instanceof Error ? err.message : "Erro ao carregar print.");
        }
      });

    return () => {
      cancelado = true;
      if (urlGerada) {
        URL.revokeObjectURL(urlGerada);
      }
    };
  }, [item.id, item.possui_imagem]);

  const faltamOutros = Math.max(0, item.minimo_outros_iguais - item.outros_iguais);
  const codigoTurmaFormatado = item.codigo_turma.toLowerCase().startsWith("turma")
    ? item.codigo_turma
    : `Turma ${item.codigo_turma}`;

  async function aprovar() {
    setErroLocal("");

    const apr = parseFloat(taxaAprovacao);
    const rep = parseFloat(taxaReprovacaoNota);
    const repFalta = parseFloat(taxaReprovacaoFalta);
    const tranc = parseFloat(taxaTrancamento);

    if ([apr, rep, repFalta, tranc].some((n) => Number.isNaN(n))) {
      setErroLocal(
        "Preencha os 4 percentuais do gráfico (Aprovação, Reprovação, Por Falta e Trancamento) antes de aprovar.",
      );
      return;
    }

    if ([apr, rep, repFalta, tranc].some((n) => n < 0 || n > 100)) {
      setErroLocal("Cada percentual deve estar entre 0% e 100%.");
      return;
    }

    const soma = Math.round((apr + rep + repFalta + tranc) * 100) / 100;
    if (Math.abs(100 - soma) > 0.2) {
      setErroLocal(
        `A soma dos 4 percentuais deve fechar 100% (tolerância de ±0.2% para arredondamento do SIGAA; soma atual: ${soma}%).`,
      );
      return;
    }

    await onDecision(item.id, {
      status: "CONSOLIDADA",
      taxa_aprovacao: apr,
      taxa_reprovacao_nota: rep,
      taxa_reprovacao_falta: repFalta,
      taxa_trancamento: tranc,
      justificativa: justificativa.trim() || null,
    });
  }

  async function recusar() {
    setErroLocal("");
    await onDecision(item.id, {
      status: "DESCARTADA",
      justificativa: justificativa.trim() || null,
    });
  }

  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xs text-[var(--foreground)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--primary-text)]">
            {item.disciplina_codigo} - {item.disciplina_nome} ({codigoTurmaFormatado})
          </p>
          <h3 className="mt-1 text-base font-bold text-[var(--foreground)]">
            {item.professores.length > 0
              ? `Docente(s): ${item.professores.join(", ")}`
              : "Docente não informado no histórico"}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Enviado em {new Date(item.created_at).toLocaleString("pt-BR")} · Semestre{" "}
            {item.semestre_referencia}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.tipo_envio === "IMAGEM" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-3 py-1 text-xs font-semibold text-[var(--status-success-text)]">
              Selo Verde: Print do SIGAA anexado (aprovação direta)
            </span>
          ) : item.selo_verde ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-3 py-1 text-xs font-semibold text-[var(--status-success-text)]">
              Selo Verde de Aprovação · {item.quantidade_envios} envios idênticos ({item.outros_iguais} outros iguais)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-1 text-xs font-semibold text-[var(--status-warning-text)]">
              Aguardando consenso manual · {item.quantidade_envios} envio(s) (faltam {faltamOutros} outros iguais)
            </span>
          )}
        </div>
      </div>

      {item.possui_imagem && (
        <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              Imagem do gráfico enviada pelo estudante
            </span>
            {imagemUrl && (
              <button
                type="button"
                onClick={() => setAmpliada((prev) => !prev)}
                className="text-xs font-semibold text-[var(--primary-text)] hover:underline cursor-pointer"
              >
                {ampliada ? "Reduzir imagem" : "Ampliar imagem"}
              </button>
            )}
          </div>
          {erroImagem ? (
            <p className="text-xs text-[var(--status-danger-text)]">{erroImagem}</p>
          ) : imagemUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imagemUrl}
              alt={`Gráfico de pizza de ${item.disciplina_codigo} (${codigoTurmaFormatado})`}
              className={`mx-auto rounded-lg border border-[var(--border-subtle)] bg-white object-contain ${
                ampliada ? "max-h-[540px] w-full" : "max-h-64"
              }`}
            />
          ) : (
            <p className="text-xs text-[var(--text-muted)]">Carregando print anexado...</p>
          )}
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
          {item.tipo_envio === "IMAGEM"
            ? "Percentuais do gráfico para consolidação (soma 100%)"
            : "Percentuais informados no grupo de formulários"}
        </p>

        {item.tipo_envio === "IMAGEM" ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Aprovação (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                disabled={disabled}
                value={taxaAprovacao}
                onChange={(e) => setTaxaAprovacao(e.target.value)}
                placeholder="Ex: 96.4"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Reprovação (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                disabled={disabled}
                value={taxaReprovacaoNota}
                onChange={(e) => setTaxaReprovacaoNota(e.target.value)}
                placeholder="Ex: 3.6"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Por Falta (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                disabled={disabled}
                value={taxaReprovacaoFalta}
                onChange={(e) => setTaxaReprovacaoFalta(e.target.value)}
                placeholder="Ex: 0"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Trancamento (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                disabled={disabled}
                value={taxaTrancamento}
                onChange={(e) => setTaxaTrancamento(e.target.value)}
                placeholder="Ex: 0"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2">
              <span className="block text-[11px] text-[var(--text-muted)]">Aprovação</span>
              <strong className="text-sm text-[var(--status-success-text)]">{item.taxa_aprovacao ?? 0}%</strong>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2">
              <span className="block text-[11px] text-[var(--text-muted)]">Reprovação (Nota)</span>
              <strong className="text-sm text-[var(--status-danger-text)]">{item.taxa_reprovacao_nota ?? 0}%</strong>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2">
              <span className="block text-[11px] text-[var(--text-muted)]">Por Falta</span>
              <strong className="text-sm text-[var(--status-danger-text)]">{item.taxa_reprovacao_falta ?? 0}%</strong>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2">
              <span className="block text-[11px] text-[var(--text-muted)]">Trancamento</span>
              <strong className="text-sm text-[var(--status-warning-text)]">{item.taxa_trancamento ?? 0}%</strong>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
          Observação da moderação (opcional)
        </label>
        <textarea
          rows={2}
          maxLength={1000}
          disabled={disabled}
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          placeholder="Ex.: Valores conferidos com o print oficial do SIGAA."
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-2.5 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)]"
        />
      </div>

      {erroLocal && (
        <p role="alert" className="mt-3 rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--status-danger-text)]">
          {erroLocal}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => void recusar()}>
          Recusar / Descartar
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={disabled}
          onClick={() => void aprovar()}
        >
          Aprovar e Publicar
        </Button>
      </div>
    </article>
  );
}
