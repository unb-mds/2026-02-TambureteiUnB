"use client";

import React, { useState } from "react";
import Button from "./Button";
import { formatFileSize, validateExternalUrl } from "@/utils/fileValidation";
import type { DecisaoCuradoria, MaterialPendente } from "@/types/moderacao";

interface Props {
  material: MaterialPendente;
  disabled: boolean;
  onDecision: (material: MaterialPendente, status: DecisaoCuradoria, motivo?: string) => Promise<void>;
  onDownload: (material: MaterialPendente) => Promise<void>;
  onPreview?: (material: MaterialPendente) => Promise<void>;
}

export default function ModerationCard({ material, disabled, onDecision, onDownload, onPreview }: Props) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [exibirCampoMotivo, setExibirCampoMotivo] = useState(false);

  const isExternalLink = Boolean(material.url_origem);
  const safeExternalUrl =
    material.url_origem && validateExternalUrl(material.url_origem).isValid
      ? material.url_origem
      : null;

  async function recusar() {
    const texto = motivo.trim();
    if (!texto) {
      setErro("Informe uma justificativa para recusar o material.");
      return;
    }
    if (texto.length > 1000) {
      setErro("A justificativa deve ter no máximo 1000 caracteres.");
      return;
    }
    await onDecision(material, "RECUSADO", texto);
  }

  return (
    <article aria-labelledby={`titulo-${material.id}`} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#5B4BDB]">{material.disciplina.nome}</p>
          <h2 id={`titulo-${material.id}`} className="mt-1 break-words text-xl font-semibold text-[#202124]">
            {material.titulo}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isExternalLink
              ? `${material.tipo} • LINK EXTERNO`
              : `${material.tipo} • ${(material.formato || "ARQUIVO").toUpperCase()}${
                  typeof material.tamanho_bytes === "number"
                    ? ` • ${formatFileSize(material.tamanho_bytes)}`
                    : ""
                }`}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Enviado em {new Date(material.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
          Pendente
        </span>
      </div>

      {isExternalLink && (
        <div className="mt-4 rounded-xl border border-[#DDD9F1] bg-[#FAF9FD] p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5B4BDB]">
            URL Externa Submetida
          </p>
          {safeExternalUrl ? (
            <a
              href={safeExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block break-all font-medium text-[#5B4BDB] underline hover:brightness-110"
            >
              {safeExternalUrl}
            </a>
          ) : (
            <p className="mt-1 break-all text-xs text-red-700">{material.url_origem}</p>
          )}
        </div>
      )}

      {(material.motivo_moderacao || typeof material.confianca_ia === "number") && (
        <div className="mt-4 rounded-xl border border-[#EDE9FD] bg-[#FAF9FD] p-3 text-sm text-gray-700">
          <p className="font-semibold text-[#5B4BDB]">
            [PARECER DA TRIAGEM IA LOCAL]
            {typeof material.confianca_ia === "number" && (
              <span className="ml-2 text-xs font-medium text-gray-600">
                (Confiança: {(material.confianca_ia * 100).toFixed(0)}%)
              </span>
            )}
          </p>
          {material.motivo_moderacao && <p className="mt-1 text-xs leading-relaxed">{material.motivo_moderacao}</p>}
        </div>
      )}

      <p className="mt-4 text-sm text-gray-600">
        {isExternalLink
          ? "Confira a URL externa antes de decidir. Verifique se o destino e pertinente e seguro para os estudantes."
          : "Analise o arquivo antes de decidir. Verifique a pertinência e se o conteúdo respeita as regras de compartilhamento."}
      </p>

      {exibirCampoMotivo && (
        <div className="mt-4">
          <label htmlFor={`motivo-${material.id}`} className="block text-sm font-medium text-gray-700">
            Justificativa da recusa (obrigatória)
          </label>
          <textarea
            id={`motivo-${material.id}`}
            maxLength={1000}
            rows={3}
            value={motivo}
            disabled={disabled}
            onChange={(e) => {
              setMotivo(e.target.value);
              setErro("");
            }}
            aria-invalid={Boolean(erro)}
            aria-describedby={erro ? `erro-${material.id}` : undefined}
            className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
            placeholder="Descreva o motivo da recusa (até 1000 caracteres)..."
          />
          {erro && (
            <p id={`erro-${material.id}`} role="alert" className="mt-2 text-sm text-red-700">
              {erro}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {!isExternalLink && onPreview && (
          <Button variant="outline" disabled={disabled} onClick={() => void onPreview(material)}>
            Pré-visualizar
          </Button>
        )}
        {!isExternalLink && (
          <Button variant="outline" disabled={disabled} onClick={() => void onDownload(material)}>
            Baixar para análise
          </Button>
        )}
        {safeExternalUrl && (
          <a
            href={safeExternalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-[#202124] transition-colors hover:bg-gray-50"
          >
            Abrir link externo
          </a>
        )}
        <Button disabled={disabled} onClick={() => void onDecision(material, "APROVADO")}>
          Aprovar
        </Button>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => {
            if (!exibirCampoMotivo) {
              setExibirCampoMotivo(true);
            } else {
              void recusar();
            }
          }}
        >
          Rejeitar
        </Button>
      </div>
    </article>
  );
}
