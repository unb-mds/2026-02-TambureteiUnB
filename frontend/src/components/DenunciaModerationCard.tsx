"use client";
import { useEffect, useState } from "react";
import Button from "./Button";
import { ROTULOS_CATEGORIA_DENUNCIA, baixarArquivoDenuncia } from "@/services/moderacaoService";
import type { AcaoDenuncia, DenunciaItemFila } from "@/types/moderacao";
import { validateExternalUrl } from "@/utils/fileValidation";

interface DenunciaModerationCardProps {
  denuncia: DenunciaItemFila;
  disabled: boolean;
  fileVersion?: number;
  onRequestAction: (denuncia: DenunciaItemFila, acao: AcaoDenuncia) => void;
  onPreviewMaterial?: (denuncia: DenunciaItemFila, preloadedUrl?: string) => Promise<void> | void;
  onDownloadMaterial?: (denuncia: DenunciaItemFila) => Promise<void>;
  onReplaceMaterialFile?: (denuncia: DenunciaItemFila) => void;
}

export default function DenunciaModerationCard({
  denuncia,
  disabled,
  fileVersion = 0,
  onRequestAction,
  onPreviewMaterial,
  onDownloadMaterial,
  onReplaceMaterialFile,
}: DenunciaModerationCardProps) {
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [erroImagem, setErroImagem] = useState("");
  const { alvo } = denuncia;
  const retidoAutomaticamente =
    denuncia.total_denuncias >= 3 ||
    alvo.status_moderacao === "PENDENTE" ||
    alvo.status_moderacao === "em_analise";
  const isMaterial = denuncia.tipo_alvo === "MATERIAL";
  const safeExternalUrl =
    isMaterial && alvo.url_origem && validateExternalUrl(alvo.url_origem).isValid
      ? alvo.url_origem
      : null;
  const formatoNorm = (alvo.formato || "").toLowerCase();
  const isFileMaterial = isMaterial && !safeExternalUrl && Boolean(alvo.formato);
  const isImageMaterial = isFileMaterial && ["png", "jpg", "jpeg", "webp"].includes(formatoNorm);
  const canPreviewFile =
    isMaterial &&
    !safeExternalUrl &&
    Boolean(onPreviewMaterial) &&
    ["pdf", "png", "jpg", "jpeg", "webp"].includes(formatoNorm);

  useEffect(() => {
    if (!isImageMaterial) return;
    let cancelado = false;
    let urlGerada: string | null = null;

    baixarArquivoDenuncia(denuncia.id)
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
  }, [denuncia.id, isImageMaterial, fileVersion]);

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
              {denuncia.tipo_alvo === "COMENTARIO"
                ? "Comentário / Relato"
                : safeExternalUrl
                ? "Material · LINK EXTERNO"
                : `Material · ${(alvo.formato || "ARQUIVO").toUpperCase()}`}
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

      {isImageMaterial && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-600">
              Pré-visualização da imagem denunciada
            </span>
            {imagemUrl && onPreviewMaterial && (
              <button
                type="button"
                onClick={() => void onPreviewMaterial(denuncia, imagemUrl)}
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
              onClick={() => onPreviewMaterial && void onPreviewMaterial(denuncia, imagemUrl)}
              aria-label={`Abrir pré-visualização em tela cheia de ${alvo.titulo || "material denunciado"}`}
              className="group block w-full cursor-zoom-in rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagemUrl}
                alt={alvo.titulo || "Imagem do material denunciado"}
                className="mx-auto max-h-64 rounded-lg border border-gray-200 bg-white object-contain transition-opacity group-hover:opacity-90"
              />
            </button>
          ) : (
            <p className="text-xs text-gray-500">Carregando imagem do material...</p>
          )}
        </div>
      )}

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
          {canPreviewFile && onPreviewMaterial && (
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => void onPreviewMaterial(denuncia, imagemUrl ?? undefined)}
            >
              Pré-visualizar arquivo
            </Button>
          )}
          {isFileMaterial && onDownloadMaterial && (
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => void onDownloadMaterial(denuncia)}
            >
              Baixar arquivo
            </Button>
          )}
          {isFileMaterial && onReplaceMaterialFile && (
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => onReplaceMaterialFile(denuncia)}
            >
              Substituir arquivo
            </Button>
          )}
          {safeExternalUrl && (
            <a
              href={safeExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#202124] transition-colors hover:bg-gray-50"
            >
              Abrir link externo
            </a>
          )}
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
