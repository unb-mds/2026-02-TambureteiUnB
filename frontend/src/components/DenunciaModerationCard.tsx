"use client";
import Button from "./Button";
import { ROTULOS_CATEGORIA_DENUNCIA } from "@/services/moderacaoService";
import type { AcaoDenuncia, DenunciaItemFila } from "@/types/moderacao";

interface DenunciaModerationCardProps {
  denuncia: DenunciaItemFila;
  disabled: boolean;
  onRequestAction: (denuncia: DenunciaItemFila, acao: AcaoDenuncia) => void;
}

export default function DenunciaModerationCard({
  denuncia,
  disabled,
  onRequestAction,
}: DenunciaModerationCardProps) {
  const { alvo } = denuncia;
  const retidoAutomaticamente =
    alvo.status_moderacao === "PENDENTE" || alvo.status_moderacao === "em_analise";

  return (
    <article
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      aria-labelledby={`denuncia-titulo-${denuncia.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#5B4BDB]">{alvo.disciplina.nome}</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              {denuncia.tipo_alvo === "COMENTARIO" ? "Comentário / Relato" : "Material"}
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              {ROTULOS_CATEGORIA_DENUNCIA[denuncia.categoria]}
            </span>
            {denuncia.prioridade_rn04 && (
              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                Prioridade RN04 — Proteção a Docentes
              </span>
            )}
          </div>
          <h2 id={`denuncia-titulo-${denuncia.id}`} className="mt-2 text-lg font-bold text-[#202124]">
            {alvo.titulo ? alvo.titulo : `Relato publicado por ${alvo.autor_alias}`}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Denúncia registrada em {new Date(denuncia.created_at).toLocaleString("pt-BR")}
            {alvo.topico_dificuldade ? ` · Tópico: ${alvo.topico_dificuldade}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#EDE9FD] px-3 py-1 text-xs font-semibold text-[#5B4BDB]">
            {denuncia.total_denuncias}{" "}
            {denuncia.total_denuncias === 1 ? "sinalização" : "sinalizações"}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              retidoAutomaticamente
                ? "bg-red-50 text-red-800"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {retidoAutomaticamente ? "Retido preventivamente" : "Em análise"}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#E8E6F8] bg-[#FAFAFC] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-700">Conteúdo sinalizado ({alvo.autor_alias})</span>
          <span>Publicado em {new Date(alvo.created_at).toLocaleDateString("pt-BR")}</span>
        </div>
        <p className="mt-2 whitespace-pre-line break-words text-sm text-[#202124] leading-relaxed">
          {alvo.conteudo}
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
          Motivo informado na denúncia
        </p>
        <p className="mt-1 break-words text-sm text-amber-950">{denuncia.motivo}</p>
        {denuncia.sinalizacoes_rn04.length > 0 && (
          <p className="mt-2 text-xs text-red-800">
            <strong>Alerta de triagem ética (RN04):</strong> Verifique se o relato contém juízo depreciativo ou ataque pessoal contra docente.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <span className="text-xs text-gray-500">
          Painel de Ações: toda decisão exige confirmação explícita em modal.
        </span>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => onRequestAction(denuncia, "DESCARTAR_DENUNCIA")}
          >
            Descartar denúncia falsa
          </Button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRequestAction(denuncia, "EXCLUIR_CONTEUDO")}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50 cursor-pointer"
          >
            Excluir conteúdo denunciado
          </button>
        </div>
      </div>
    </article>
  );
}
