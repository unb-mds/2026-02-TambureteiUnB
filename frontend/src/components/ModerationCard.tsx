"use client";

import React, { useEffect, useState } from "react";
import Button from "./Button";
import { baixarParaAnalise } from "@/services/moderacaoService";
import { formatFileSize, validateExternalUrl } from "@/utils/fileValidation";
import type { DecisaoCuradoria, MaterialPendente } from "@/types/moderacao";

interface Props {
  material: MaterialPendente;
  disabled: boolean;
  fileVersion?: number;
  onDecision: (
    material: MaterialPendente,
    status: DecisaoCuradoria,
    motivo?: string,
    excluirArquivo?: boolean,
  ) => Promise<void>;
  onDownload: (material: MaterialPendente) => Promise<void>;
  onPreview?: (material: MaterialPendente, preloadedUrl?: string) => Promise<void> | void;
  onReplaceFile?: (material: MaterialPendente) => void;
  onEdit?: (material: MaterialPendente) => void;
}

export default function ModerationCard({
  material,
  disabled,
  fileVersion = 0,
  onDecision,
  onDownload,
  onPreview,
  onReplaceFile,
  onEdit,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const [excluirArquivo, setExcluirArquivo] = useState(false);
  const [erro, setErro] = useState("");
  const [exibirCampoMotivo, setExibirCampoMotivo] = useState(false);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [erroImagem, setErroImagem] = useState("");

  const isExternalLink = Boolean(material.url_origem);
  const isImageMaterial =
    !isExternalLink &&
    ["png", "jpg", "jpeg", "webp"].includes((material.formato || "").toLowerCase());
  const safeExternalUrl =
    material.url_origem && validateExternalUrl(material.url_origem).isValid
      ? material.url_origem
      : null;

  useEffect(() => {
    if (!isImageMaterial) return;
    let cancelado = false;
    let urlGerada: string | null = null;

    baixarParaAnalise(material.id)
      .then((blob) => {
        if (cancelado) return;
        urlGerada = URL.createObjectURL(blob);
        setImagemUrl(urlGerada);
        setErroImagem("");
      })
      .catch((err) => {
        if (!cancelado) {
          setErroImagem(err instanceof Error ? err.message : "Erro ao carregar imagem.");
        }
      });

    return () => {
      cancelado = true;
      if (urlGerada) {
        URL.revokeObjectURL(urlGerada);
      }
    };
  }, [material.id, isImageMaterial, fileVersion]);

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
    await onDecision(material, "RECUSADO", texto, !isExternalLink && excluirArquivo);
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

      {isImageMaterial && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-600">
              Pré-visualização da imagem enviada
            </span>
            {imagemUrl && onPreview && (
              <button
                type="button"
                onClick={() => void onPreview(material, imagemUrl)}
                className="text-xs font-semibold text-[#5B4BDB] hover:underline cursor-pointer"
              >
                Abrir em tela cheia
              </button>
            )}
          </div>
          {erroImagem ? (
            <p className="text-xs text-red-700">{erroImagem}</p>
          ) : imagemUrl ? (
            <button
              type="button"
              onClick={() => onPreview && void onPreview(material, imagemUrl)}
              aria-label={`Abrir pré-visualização em tela cheia de ${material.titulo}`}
              className="group block w-full cursor-zoom-in rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagemUrl}
                alt={material.titulo}
                className="mx-auto max-h-64 rounded-lg border border-gray-200 bg-white object-contain transition-opacity group-hover:opacity-90"
              />
            </button>
          ) : (
            <p className="text-xs text-gray-500">Carregando imagem do material...</p>
          )}
        </div>
      )}

      {material.motivo_moderacao && (
        <div className="mt-4 rounded-xl border border-[#EDE9FD] bg-[#FAF9FD] p-3 text-sm text-gray-700">
          <p className="font-semibold text-[#5B4BDB]">[OBSERVAÇÃO DE MODERAÇÃO]</p>
          <p className="mt-1 text-xs leading-relaxed">{material.motivo_moderacao}</p>
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
          {!isExternalLink && (
            <label
              htmlFor={`excluir-arquivo-${material.id}`}
              className="mt-3 flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-700 cursor-pointer"
            >
              <input
                id={`excluir-arquivo-${material.id}`}
                type="checkbox"
                checked={excluirArquivo}
                disabled={disabled}
                onChange={(e) => setExcluirArquivo(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#5B4BDB]"
              />
              <span>
                <strong className="block text-gray-900">Excluir o arquivo do servidor junto</strong>
                Se ficar desmarcado, o arquivo é mantido para o estudante poder editar e reenviar pelo perfil. Se marcado, o arquivo é apagado imediatamente.
              </span>
            </label>
          )}
          {erro && (
            <p id={`erro-${material.id}`} role="alert" className="mt-2 text-sm text-red-700">
              {erro}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {!isExternalLink && onPreview && (
          <Button variant="outline" disabled={disabled} onClick={() => void onPreview(material, imagemUrl ?? undefined)}>
            Pré-visualizar
          </Button>
        )}
        {!isExternalLink && (
          <Button variant="outline" disabled={disabled} onClick={() => void onDownload(material)}>
            Baixar para análise
          </Button>
        )}
        {!isExternalLink && onReplaceFile && (
          <Button variant="outline" disabled={disabled} onClick={() => onReplaceFile(material)}>
            Substituir arquivo
          </Button>
        )}
        {onEdit && (
          <Button variant="outline" disabled={disabled} onClick={() => onEdit(material)}>
            Editar título / categoria
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
