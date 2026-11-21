"use client";
import React, { useEffect, useState } from "react";
import Button from "./Button";
import type { MaterialPendente } from "@/types/moderacao";
import { formatFileSize } from "@/utils/fileValidation";

interface MaterialPreviewModalProps {
  isOpen: boolean;
  material: MaterialPendente | null;
  blobUrl: string | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onApprove: (material: MaterialPendente) => Promise<void>;
  onReject: (material: MaterialPendente, motivo: string) => Promise<void>;
}

export default function MaterialPreviewModal({
  isOpen,
  material,
  blobUrl,
  loading,
  error,
  onClose,
  onApprove,
  onReject,
}: MaterialPreviewModalProps) {
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState("");
  const [exibirCampoMotivo, setExibirCampoMotivo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !enviando) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, enviando, onClose]);

  useEffect(() => {
    if (isOpen) {
      setMotivo("");
      setErroMotivo("");
      setExibirCampoMotivo(false);
      setEnviando(false);
    }
  }, [isOpen, material]);

  if (!isOpen || !material) {
    return null;
  }

  const isPdf = material.formato.toLowerCase() === "pdf";
  const isImage = ["png", "jpg", "jpeg"].includes(material.formato.toLowerCase());

  async function handleConfirmReject() {
    const textoLimpo = motivo.trim();
    if (!textoLimpo) {
      setExibirCampoMotivo(true);
      setErroMotivo("Informe uma justificativa para recusar o material.");
      return;
    }
    if (textoLimpo.length > 1000) {
      setErroMotivo("A justificativa deve ter no máximo 1000 caracteres.");
      return;
    }
    setErroMotivo("");
    setEnviando(true);
    try {
      if (material) {
        await onReject(material, textoLimpo);
        onClose();
      }
    } finally {
      setEnviando(false);
    }
  }

  async function handleConfirmApprove() {
    setEnviando(true);
    try {
      if (material) {
        await onApprove(material);
        onClose();
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-gray-200 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5B4BDB]">
              {material.disciplina.nome}
            </p>
            <h2 id="preview-modal-title" className="mt-1 text-xl font-bold text-[#202124]">
              {material.titulo}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {material.tipo} • {material.formato.toUpperCase()} • {formatFileSize(material.tamanho_bytes)}
            </p>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={onClose}
            aria-label="Fechar visualização"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
          >
            ✕
          </button>
        </header>

        <section className="relative flex min-h-[350px] flex-1 items-center justify-center overflow-auto bg-gray-50 p-4">
          {loading && (
            <p role="status" className="text-sm font-medium text-gray-600">
              Carregando arquivo para pré-visualização...
            </p>
          )}

          {error && !loading && (
            <div role="alert" className="max-w-md rounded-xl bg-red-50 p-4 text-center text-sm text-red-800">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <>
              {isPdf && (
                <iframe
                  src={blobUrl}
                  title={`Pré-visualização de ${material.titulo}`}
                  className="h-[500px] w-full rounded-xl border border-gray-200 bg-white"
                />
              )}
              {isImage && (
                <img
                  src={blobUrl}
                  alt={material.titulo}
                  className="max-h-[500px] max-w-full rounded-xl object-contain shadow-sm"
                />
              )}
              {!isPdf && !isImage && (
                <p className="text-sm text-gray-600">
                  Formato não compatível com visualização inline. Utilize o download para análise externa.
                </p>
              )}
            </>
          )}
        </section>

        {exibirCampoMotivo && (
          <div className="border-t border-gray-200 bg-amber-50/50 p-4 sm:px-6">
            <label htmlFor="preview-motivo-recusa" className="block text-xs font-semibold uppercase text-gray-700">
              Justificativa da recusa (obrigatória para rejeitar)
            </label>
            <textarea
              id="preview-motivo-recusa"
              maxLength={1000}
              rows={2}
              value={motivo}
              disabled={enviando}
              onChange={(e) => {
                setMotivo(e.target.value);
                setErroMotivo("");
              }}
              placeholder="Descreva o motivo da recusa (até 1000 caracteres)..."
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
            />
            {erroMotivo && (
              <p role="alert" className="mt-1 text-xs text-red-700">
                {erroMotivo}
              </p>
            )}
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white p-4 sm:p-5">
          <Button variant="outline" disabled={enviando} onClick={onClose}>
            Fechar
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={enviando || loading}
              onClick={() => {
                if (!exibirCampoMotivo) {
                  setExibirCampoMotivo(true);
                } else {
                  void handleConfirmReject();
                }
              }}
            >
              Rejeitar com Justificativa
            </Button>
            <Button
              disabled={enviando || loading}
              onClick={() => void handleConfirmApprove()}
            >
              Aprovar Material
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}