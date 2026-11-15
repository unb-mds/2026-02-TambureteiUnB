"use client";
import { useEffect, useState } from "react";
import Button from "./Button";
import { ROTULOS_CATEGORIA_DENUNCIA } from "@/services/moderacaoService";
import type { AcaoDenuncia, DenunciaItemFila } from "@/types/moderacao";

interface ModerationActionModalProps {
  isOpen: boolean;
  denuncia: DenunciaItemFila | null;
  acao: AcaoDenuncia | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (denuncia: DenunciaItemFila, acao: AcaoDenuncia, justificativa?: string) => Promise<void>;
}

export default function ModerationActionModal({
  isOpen,
  denuncia,
  acao,
  busy,
  onClose,
  onConfirm,
}: ModerationActionModalProps) {
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, busy, onClose]);

  if (!isOpen || !denuncia || !acao) {
    return null;
  }

  const isExclusao = acao === "EXCLUIR_CONTEUDO";
  const tituloModal = isExclusao
    ? "Confirmar exclusão do conteúdo denunciado"
    : "Confirmar descarte de denúncia falsa";
  const descricaoModal = isExclusao
    ? "Esta ação ocultará definitivamente o conteúdo denunciado das listagens públicas da disciplina e encerrará todas as denúncias pendentes vinculadas como procedentes."
    : "Esta ação descartará a denúncia por improcedência, encerrará as sinalizações pendentes deste item e manterá ou restituirá a visibilidade pública do conteúdo.";

  async function confirmar() {
    if (!denuncia || !acao) return;
    const texto = justificativa.trim();
    if (texto.length > 1000) {
      setErro("A justificativa deve ter no máximo 1000 caracteres.");
      return;
    }
    setErro("");
    await onConfirm(denuncia, acao, texto || undefined);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-acao-moderacao-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                isExclusao
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-[#EDE9FD] text-[#5B4BDB]"
              }`}
            >
              {isExclusao ? "Exclusão de conteúdo" : "Descarte de denúncia"}
            </span>
            <h2 id="modal-acao-moderacao-titulo" className="mt-2 text-xl font-bold text-[#202124]">
              {tituloModal}
            </h2>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Fechar modal de confirmação"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{descricaoModal}</p>

        <div className="mt-4 rounded-xl border border-gray-200 bg-[#F7F7FA] p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span className="font-semibold text-[#5B4BDB]">{denuncia.alvo.disciplina.nome}</span>
            <span>Autor: {denuncia.alvo.autor_alias}</span>
          </div>
          <p className="mt-2 line-clamp-3 break-words text-[#202124]">{denuncia.alvo.conteudo}</p>
          <p className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-600">
            <strong>Motivo reportado ({ROTULOS_CATEGORIA_DENUNCIA[denuncia.categoria]}):</strong> {denuncia.motivo}
          </p>
        </div>

        <div className="mt-4">
          <label htmlFor="justificativa-decisao-denuncia" className="block text-sm font-medium text-[#202124]">
            Observação ou justificativa da decisão (opcional)
          </label>
          <textarea
            id="justificativa-decisao-denuncia"
            rows={3}
            maxLength={1000}
            disabled={busy}
            value={justificativa}
            onChange={(e) => {
              setJustificativa(e.target.value);
              setErro("");
            }}
            placeholder={
              isExclusao
                ? "Ex.: Relato contém ataque pessoal contra docente, violando a RN04."
                : "Ex.: Relato aborda apenas metodologia e bibliografia da disciplina, sem violar a RN04."
            }
            className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
          />
          {erro && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">
              {erro}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          {isExclusao ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmar()}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              {busy ? "Processando..." : "Confirmar exclusão"}
            </button>
          ) : (
            <Button disabled={busy} onClick={() => void confirmar()}>
              {busy ? "Processando..." : "Confirmar descarte"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
