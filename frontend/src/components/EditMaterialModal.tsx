"use client";

import React, { useEffect, useState } from "react";
import Button from "./Button";
import { resubmitMaterial, updateMaterial } from "@/services/materialService";
import type { MaterialResponse, MaterialType } from "@/types/material";
import {
  formatFileSize,
  validateExternalUrl,
  validateFileFormat,
  validateFileSize,
  validateMaterialTitle,
} from "@/utils/fileValidation";

export interface EditMaterialTarget {
  id: number | string;
  titulo: string;
  tipo: string;
  url_origem?: string | null;
  status_curadoria?: "PENDENTE" | "APROVADO" | "RECUSADO";
  motivo_moderacao?: string | null;
  formato?: string | null;
  tamanho_bytes?: number | null;
  arquivo_disponivel?: boolean;
}

interface EditMaterialModalProps {
  isOpen: boolean;
  material: EditMaterialTarget | null;
  onClose: () => void;
  onSaved: (updated: MaterialResponse) => void | Promise<void>;
}

const FILE_TYPE_OPTIONS: Array<{ value: MaterialType; label: string }> = [
  { value: "PROVA_ANTIGA", label: "Prova Anterior" },
  { value: "RESUMO", label: "Resumo / Notas de Estudo" },
  { value: "DICA", label: "Dica / Guia" },
  { value: "ARQUIVO", label: "Arquivo Geral" },
];

const LINK_TYPE_OPTIONS: Array<{ value: MaterialType; label: string }> = [
  { value: "PROVA_ANTIGA", label: "Prova Anterior" },
  { value: "RESUMO", label: "Resumo / Notas de Estudo" },
  { value: "DICA", label: "Dica / Videoaula" },
  { value: "LINK_UTIL", label: "Link Útil" },
];

function EditMaterialDialog({
  material,
  onClose,
  onSaved,
}: Omit<EditMaterialModalProps, "isOpen"> & { material: EditMaterialTarget }) {
  const isLink = Boolean(material.url_origem);
  const isResubmit = material.status_curadoria === "RECUSADO";
  const fileRemovedOnReject = isResubmit && !isLink && material.arquivo_disponivel === false;
  const typeOptions = isLink ? LINK_TYPE_OPTIONS : FILE_TYPE_OPTIONS;
  const initialType = (
    typeOptions.some((opt) => opt.value === material.tipo)
      ? material.tipo
      : typeOptions[0].value
  ) as MaterialType;

  const [titulo, setTitulo] = useState(material.titulo);
  const [tipo, setTipo] = useState<MaterialType>(initialType);
  const [urlOrigem, setUrlOrigem] = useState(material.url_origem || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !salvando) {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [salvando, onClose]);

  const urlAlterada = isLink && urlOrigem.trim() !== (material.url_origem || "").trim();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const titleVal = validateMaterialTitle(titulo);
    if (!titleVal.isValid) {
      setErro(titleVal.error || "Título inválido.");
      return;
    }

    if (isLink) {
      const urlVal = validateExternalUrl(urlOrigem);
      if (!urlVal.isValid) {
        setErro(urlVal.error || "URL externa inválida.");
        return;
      }
    }

    if (fileRemovedOnReject && !selectedFile) {
      setErro("O arquivo original foi removido pela moderação. Selecione um novo arquivo para reenviar.");
      return;
    }

    if (selectedFile) {
      const fmtVal = validateFileFormat(selectedFile);
      if (!fmtVal.isValid) {
        setErro(fmtVal.error || "Formato de arquivo inválido.");
        return;
      }
      const sizeVal = validateFileSize(selectedFile);
      if (!sizeVal.isValid) {
        setErro(sizeVal.error || "Tamanho de arquivo inválido.");
        return;
      }
    }

    setSalvando(true);
    setErro("");
    try {
      const updated = isResubmit
        ? await resubmitMaterial(material.id, {
            titulo: titulo.trim(),
            tipo,
            ...(isLink ? { url_origem: urlOrigem.trim() } : {}),
            file: selectedFile,
          })
        : await updateMaterial(material.id, {
            titulo: titulo.trim(),
            tipo,
            ...(isLink ? { url_origem: urlOrigem.trim() } : {}),
          });
      await onSaved(updated);
      onClose();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : isResubmit
          ? "Não foi possível reenviar o material para moderação."
          : "Não foi possível salvar as alterações do material.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-material-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !salvando) {
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
            <h2 id="edit-material-modal-title" className="text-lg font-bold text-[#202124]">
              {isResubmit ? "Editar e reenviar para moderação" : "Editar material de apoio"}
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              {isResubmit
                ? "Ajuste as informações necessárias e reenvie o material para nova análise da moderação."
                : `Atualize o título ou a categoria do material${isLink ? " (ou a URL do link externo)" : ""}.`}
            </p>
          </div>
          <button
            type="button"
            disabled={salvando}
            onClick={onClose}
            aria-label="Fechar modal de edição"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {isResubmit && material.motivo_moderacao && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
            <strong>Motivo da recusa anterior:</strong> {material.motivo_moderacao}
          </div>
        )}

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-700">
          Título do material
          <input
            type="text"
            maxLength={200}
            disabled={salvando}
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              setErro("");
            }}
            className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
          />
        </label>

        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-700">
          Categoria
          <select
            disabled={salvando}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as MaterialType)}
            className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-[#202124]"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {isLink && (
          <div className="mt-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-700">
              URL externa
              <input
                type="url"
                maxLength={2000}
                disabled={salvando}
                value={urlOrigem}
                onChange={(e) => {
                  setUrlOrigem(e.target.value);
                  setErro("");
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
              />
            </label>
            {urlAlterada && material.status_curadoria === "APROVADO" && (
              <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Ao alterar a URL de um link já aprovado, ele voltará para a fila de moderação para nova conferência.
              </p>
            )}
          </div>
        )}

        {isResubmit && !isLink && (
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <label
              htmlFor="resubmit-file-input"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-700"
            >
              {fileRemovedOnReject
                ? "Novo arquivo (obrigatório)"
                : "Substituir arquivo (opcional)"}
            </label>
            <p className="mt-1 text-xs text-gray-600">
              {fileRemovedOnReject
                ? "O arquivo original foi removido pela moderação. Selecione um novo PDF, PNG ou JPG (até 5 MiB)."
                : `Arquivo atual mantido (${(material.formato || "ARQUIVO").toUpperCase()}${
                    typeof material.tamanho_bytes === "number"
                      ? ` • ${formatFileSize(material.tamanho_bytes)}`
                      : ""
                  }). Se preferir, selecione outro arquivo para substituí-lo.`}
            </p>
            <input
              id="resubmit-file-input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              disabled={salvando}
              onChange={(e) => {
                setSelectedFile(e.target.files?.[0] ?? null);
                setErro("");
              }}
              className="mt-2 block w-full text-xs text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#5B4BDB]/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#5B4BDB] hover:file:bg-[#5B4BDB]/20 cursor-pointer"
            />
            {selectedFile && (
              <p className="mt-1.5 text-xs font-medium text-[#5B4BDB]">
                Selecionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>
        )}

        {erro && (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {erro}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <Button type="button" variant="outline" disabled={salvando} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando
              ? isResubmit
                ? "Reenviando..."
                : "Salvando..."
              : isResubmit
              ? "Salvar e reenviar para moderação"
              : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditMaterialModal(props: EditMaterialModalProps) {
  if (!props.isOpen || !props.material) {
    return null;
  }

  return (
    <EditMaterialDialog
      key={String(props.material.id)}
      material={props.material}
      onClose={props.onClose}
      onSaved={props.onSaved}
    />
  );
}
