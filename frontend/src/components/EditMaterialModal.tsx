"use client";

import React, { useEffect, useState } from "react";
import Button from "./Button";
import { updateMaterial } from "@/services/materialService";
import type { MaterialResponse, MaterialType } from "@/types/material";
import { validateExternalUrl, validateMaterialTitle } from "@/utils/fileValidation";

export interface EditMaterialTarget {
  id: number | string;
  titulo: string;
  tipo: string;
  url_origem?: string | null;
  status_curadoria?: "PENDENTE" | "APROVADO" | "RECUSADO";
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
  const typeOptions = isLink ? LINK_TYPE_OPTIONS : FILE_TYPE_OPTIONS;
  const initialType = (
    typeOptions.some((opt) => opt.value === material.tipo)
      ? material.tipo
      : typeOptions[0].value
  ) as MaterialType;

  const [titulo, setTitulo] = useState(material.titulo);
  const [tipo, setTipo] = useState<MaterialType>(initialType);
  const [urlOrigem, setUrlOrigem] = useState(material.url_origem || "");
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

    setSalvando(true);
    setErro("");
    try {
      const updated = await updateMaterial(material.id, {
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
              Editar material de apoio
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              Atualize o título ou a categoria do seu envio{isLink ? " (ou a URL do link externo)" : ""}.
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
            {salvando ? "Salvando..." : "Salvar alterações"}
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
