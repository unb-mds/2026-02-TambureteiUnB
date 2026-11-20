"use client";
import React, { useEffect } from "react";
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
  onRejectRequest: (material: MaterialPendente) => void;
}

export default function MaterialPreviewModal({
  isOpen,
  material,
  blobUrl,
  loading,
  error,
  onClose,
  onApprove,
  onRejectRequest,
}: MaterialPreviewModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
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
  }, [isOpen, onClose]);

  if (!isOpen || !material) {
    return null;
  }

  const isPdf = material.formato.toLowerCase() === "pdf";
  const isImage = ["png", "jpg", "jpeg"].includes(material.formato.toLowerCase());

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
            onClick={onClose}
            aria-label="Fechar visualização"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
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
                  className="h-[550px] w-full rounded-xl border border-gray-200 bg-white"
                />
              )}
              {isImage && (
                <img
                  src={blobUrl}
                  alt={material.titulo}
                  className="max-h-[550px] max-w-full rounded-xl object-contain shadow-sm"
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

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white p-4 sm:p-5">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                onRejectRequest(material);
              }}
            >
              Rejeitar com Justificativa
            </Button>
            <Button
              onClick={() => {
                onClose();
                void onApprove(material);
              }}
            >
              Aprovar Material
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}