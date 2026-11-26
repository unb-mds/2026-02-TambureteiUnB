"use client";

import React, { useEffect, useState } from "react";
import Button from "./Button";
import { substituirArquivoMaterial } from "@/services/moderacaoService";
import type { MaterialResponse } from "@/types/material";
import { formatFileSize, validateFileFormat, validateFileSize } from "@/utils/fileValidation";

export interface ReplaceMaterialTarget {
  id: number | string;
  titulo: string;
  disciplinaNome?: string;
  formato?: string | null;
}

interface ReplaceMaterialFileModalProps {
  isOpen: boolean;
  material: ReplaceMaterialTarget | null;
  onClose: () => void;
  onDownloadCurrent?: () => void | Promise<void>;
  onReplaced: (updated: MaterialResponse) => void | Promise<void>;
}

function ReplaceMaterialFileDialog({
  material,
  onClose,
  onDownloadCurrent,
  onReplaced,
}: Omit<ReplaceMaterialFileModalProps, "isOpen"> & { material: ReplaceMaterialTarget }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !enviando) {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enviando, onClose]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setErro("");
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const formatVal = validateFileFormat(file);
    if (!formatVal.isValid) {
      setSelectedFile(null);
      setErro(formatVal.error || "Formato de arquivo inválido.");
      return;
    }

    const sizeVal = validateFileSize(file);
    if (!sizeVal.isValid) {
      setSelectedFile(null);
      setErro(sizeVal.error || "Arquivo excede o tamanho máximo permitido.");
      return;
    }

    setSelectedFile(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedFile) {
      setErro("Selecione o arquivo editado (PDF, PNG ou JPG) para substituir o original.");
      return;
    }
    const nota = justificativa.trim();
    if (nota.length > 1000) {
      setErro("A observação deve ter no máximo 1000 caracteres.");
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      const updated = await substituirArquivoMaterial(
        material.id,
        selectedFile,
        nota || "Arquivo substituído pela moderação (remoção de dados pessoais ou ajuste editorial).",
      );
      await onReplaced(updated);
      onClose();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível substituir o arquivo. Tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="replace-file-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !enviando) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            {material.disciplinaNome && (
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5B4BDB]">
                {material.disciplinaNome}
              </p>
            )}
            <h2 id="replace-file-modal-title" className="mt-1 text-lg font-bold text-[#202124]">
              Substituir arquivo do material
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              Material: <strong className="text-[#202124]">{material.titulo}</strong>
              {material.formato ? ` (${material.formato.toUpperCase()})` : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={onClose}
            aria-label="Fechar modal de substituição"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-[#DDD9F1] bg-[#FAF9FD] p-3.5 text-xs text-gray-700 leading-relaxed">
          <p>
            O arquivo original enviado pelo usuário será removido definitivamente do servidor e substituído pelo arquivo editado abaixo, mantendo o título, a disciplina e as curtidas do material.
          </p>
          {onDownloadCurrent && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => void onDownloadCurrent()}
              className="mt-2 inline-flex items-center font-semibold text-[#5B4BDB] underline hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              Baixar arquivo atual para editar no computador
            </button>
          )}
        </div>

        <div className="mt-4">
          <label
            htmlFor="replace-material-file-input"
            className="block text-xs font-semibold uppercase tracking-wide text-gray-700"
          >
            Novo arquivo editado (PDF, PNG ou JPG até 5 MiB)
          </label>
          <input
            id="replace-material-file-input"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            disabled={enviando}
            onChange={handleFileChange}
            className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#EDE9FD] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#5B4BDB] hover:file:bg-[#E0D9FB]"
          />
          {selectedFile && (
            <p className="mt-1.5 text-xs text-emerald-700 font-medium">
              Selecionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}
        </div>

        <div className="mt-4">
          <label
            htmlFor="replace-material-note"
            className="block text-xs font-semibold uppercase tracking-wide text-gray-700"
          >
            Observação da edição (opcional)
          </label>
          <textarea
            id="replace-material-note"
            rows={2}
            maxLength={1000}
            disabled={enviando}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Ex: Removido nome e matrícula do aluno no cabeçalho da prova."
            className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
          />
        </div>

        {erro && (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {erro}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button type="button" variant="outline" disabled={enviando} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando || !selectedFile}>
            {enviando ? "Substituindo..." : "Substituir arquivo"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ReplaceMaterialFileModal(props: ReplaceMaterialFileModalProps) {
  if (!props.isOpen || !props.material) {
    return null;
  }

  return (
    <ReplaceMaterialFileDialog
      key={String(props.material.id)}
      material={props.material}
      onClose={props.onClose}
      onDownloadCurrent={props.onDownloadCurrent}
      onReplaced={props.onReplaced}
    />
  );
}
