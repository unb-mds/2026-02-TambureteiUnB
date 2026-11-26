"use client";

import React, { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { getStoredUser, isAuthenticated, subscribeAuthChange } from "@/services/authService";
import Pagination from "@/components/Pagination";
import MaterialPreviewModal from "@/components/MaterialPreviewModal";
import EditMaterialModal from "@/components/EditMaterialModal";
import ReplaceMaterialFileModal from "@/components/ReplaceMaterialFileModal";
import { ApiError } from "@/services/httpClient";
import type { MaterialType } from "@/types/material";
import { deleteMaterial, listMaterials, downloadMaterial, toggleMaterialVote } from "@/services/materialService";
import {
  ROTULOS_CATEGORIA_DENUNCIA,
  criarDenuncia,
  getTriageBannerClasses,
  podeModerar,
  validarMotivoDenuncia,
  type TipoAvisoTriagem,
} from "@/services/moderacaoService";
import type { CategoriaDenuncia } from "@/types/moderacao";
import { formatFileSize, validateExternalUrl } from "@/utils/fileValidation";

export interface MaterialItem {
  id: string;
  titulo: string;
  tipo: "ARQUIVO" | "RESUMO" | "PROVA_ANTIGA" | "DICA" | "LINK_UTIL" | string;
  formato: string;
  tamanho_bytes?: number;
  url_origem?: string;
  created_at: string;
  url?: string;
  upvotes: number;
  isLikedByMe: boolean;
  isMine?: boolean;
  authorAlias: string;
  professor?: string;
}

interface BackendMaterialItem {
  id: string | number;
  titulo?: string;
  tipo: string;
  formato?: string | null;
  tamanho_bytes?: number | null;
  url_origem?: string | null;
  created_at?: string;
  url?: string;
  arquivo_url?: string;
  upvotes?: number;
  liked_by_me?: boolean;
  is_mine?: boolean;
  usuario?: { nome?: string };
  authorAlias?: string;
  professor?: string;
}

interface MateriaisApoioProps {
  disciplineName: string;
  disciplineIdOrSlug?: string;
  refreshTrigger?: number;
  pendingMaterialIds?: string[];
  onOpenUploadModal?: () => void;
}

const MATERIALS_PER_PAGE = 20;
const CATEGORY_TYPES: Record<"resumos" | "links" | "provas", MaterialType[]> = {
  resumos: ["RESUMO", "DICA"], links: ["ARQUIVO", "LINK_UTIL"], provas: ["PROVA_ANTIGA"],
};

export default function MateriaisApoio({
  disciplineName,
  disciplineIdOrSlug,
  refreshTrigger = 0,
  onOpenUploadModal,
}: MateriaisApoioProps) {
  const authenticated = useSyncExternalStore(
    subscribeAuthChange,
    isAuthenticated,
    () => false
  );
  const isModerator = useSyncExternalStore(
    subscribeAuthChange,
    () => {
      const user = getStoredUser();
      return Boolean(user && podeModerar(user.role));
    },
    () => false
  );
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"provas" | "resumos" | "links">("provas");
  const [tabCounts, setTabCounts] = useState<Record<"provas" | "resumos" | "links", number | null>>({
    provas: null,
    resumos: null,
    links: null,
  });
  const [searchQuery, setSearchQuery] = useState("");

  const displayedTriageNotice =
    refreshTrigger > 0
      ? {
          kind: "review" as TipoAvisoTriagem,
          message:
            "[AGUARDANDO MODERAÇÃO] Seu material foi enviado para a curadoria humana e ficará disponível na disciplina assim que aprovado pela equipe.",
        }
      : null;

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [listError, setListError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [previewMaterial, setPreviewMaterial] = useState<MaterialItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [replacingMaterial, setReplacingMaterial] = useState<MaterialItem | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [reportingMaterial, setReportingMaterial] = useState<MaterialItem | null>(null);
  const [reportCategory, setReportCategory] = useState<CategoriaDenuncia>("GABARITO_ATIVO");
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportFeedback, setReportFeedback] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const previewBlobUrlRef = useRef<string | null>(null);
  const previewSequence = useRef(0);
  const requestSequence = useRef(0);
  const isMountedRef = useRef(true);

  const fetchMaterials = useCallback(async (): Promise<MaterialItem[]> => {
    if (!disciplineIdOrSlug) {
      return [];
    }

    const currentRequest = ++requestSequence.current;
    try {
      const response = await listMaterials(disciplineIdOrSlug, {
        titulo: searchQuery.trim(), tipos: CATEGORY_TYPES[activeTab],
        pagina: page, tamanho_pagina: MATERIALS_PER_PAGE,
      });
      const rawItems: BackendMaterialItem[] = response?.items || [];
      const mappedItems: MaterialItem[] = rawItems.map((item) => ({
        id: String(item.id),
        titulo: item.titulo || "Material sem título",
        tipo: item.tipo,
        formato: item.url_origem
          ? "LINK"
          : item.formato
          ? String(item.formato).toUpperCase()
          : "ARQUIVO",
        tamanho_bytes: typeof item.tamanho_bytes === "number" ? item.tamanho_bytes : undefined,
        url_origem: item.url_origem || undefined,
        created_at: item.created_at
          ? new Date(item.created_at).toLocaleDateString("pt-BR")
          : "Recente",
        upvotes: item.upvotes || 0,
        isLikedByMe: Boolean(item.liked_by_me),
        isMine: Boolean(item.is_mine),
        authorAlias: item.usuario?.nome || item.authorAlias || "Estudante",
        professor: item.professor || undefined,
      }));

      if (isMountedRef.current && currentRequest === requestSequence.current) {
        setListError(null);
        setTotal(response.total);
        setMaterials(mappedItems);
        setTabCounts((prev) => ({ ...prev, [activeTab]: response.total }));
      }
      return mappedItems;
    } catch (error) {
      if (isMountedRef.current && currentRequest === requestSequence.current) {
        setListError(error instanceof ApiError ? error.message : "Não foi possível carregar os materiais. Tente novamente.");
      }
      return [];
    }
  }, [disciplineIdOrSlug, searchQuery, activeTab, page]);

  useEffect(() => {
    isMountedRef.current = true;

    let cancelled = false;
    async function loadInitial() {
      setLoading(true);
      await fetchMaterials();
      if (isMountedRef.current && !cancelled) {
        setLoading(false);
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      requestSequence.current += 1;
      previewSequence.current += 1;
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
    };
  }, [fetchMaterials, retryCount, authenticated]);

  useEffect(() => {
    if (!disciplineIdOrSlug) return;
    let cancelled = false;
    const trimmed = searchQuery.trim();

    Promise.all([
      listMaterials(disciplineIdOrSlug, { titulo: trimmed, tipos: CATEGORY_TYPES.provas, pagina: 1, tamanho_pagina: 1 }),
      listMaterials(disciplineIdOrSlug, { titulo: trimmed, tipos: CATEGORY_TYPES.resumos, pagina: 1, tamanho_pagina: 1 }),
      listMaterials(disciplineIdOrSlug, { titulo: trimmed, tipos: CATEGORY_TYPES.links, pagina: 1, tamanho_pagina: 1 }),
    ])
      .then(([provasRes, resumosRes, linksRes]) => {
        if (!cancelled && isMountedRef.current) {
          setTabCounts({
            provas: provasRes.total,
            resumos: resumosRes.total,
            links: linksRes.total,
          });
        }
      })
      .catch(() => {
        // Falha silenciosa nas contagens das abas; a lista principal exibe erro se necessário.
      });

    return () => {
      cancelled = true;
    };
  }, [disciplineIdOrSlug, searchQuery, retryCount, authenticated]);

  const handleShareClick = () => {
    if (!authenticated || !isAuthenticated()) {
      return;
    }

    if (onOpenUploadModal) {
      onOpenUploadModal();
    }
  };

  const handleToggleUpvote = async (materialId: string) => {
    if (!authenticated || !isAuthenticated()) {
      return;
    }

    const previousItem = materials.find((item) => item.id === materialId);
    if (!previousItem) return;

    setMaterials((prev) =>
      prev.map((item) => {
        if (item.id === materialId) {
          const willLike = !item.isLikedByMe;
          return {
            ...item,
            isLikedByMe: willLike,
            upvotes: Math.max(0, willLike ? item.upvotes + 1 : item.upvotes - 1),
          };
        }
        return item;
      })
    );

    const numericId = Number(materialId);
    if (!Number.isSafeInteger(numericId) || numericId <= 0) {
      return;
    }

    try {
      const synced = await toggleMaterialVote(numericId);
      if (!isMountedRef.current) return;
      setMaterials((prev) =>
        prev.map((item) =>
          item.id === materialId
            ? {
                ...item,
                upvotes: synced.upvotes,
                isLikedByMe: synced.liked_by_me,
              }
            : item
        )
      );
    } catch {
      if (!isMountedRef.current) return;
      setMaterials((prev) =>
        prev.map((item) => (item.id === materialId ? previousItem : item))
      );
    }
  };

  const filteredMaterials = materials;
  const handlePreview = async (material: MaterialItem) => {
    const reqSeq = ++previewSequence.current;
    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
      setPreviewBlobUrl(null);
    }
    setDownloadError(null);
    setPreviewMaterial(material);
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const blob = await downloadMaterial(Number(material.id));
      if (!isMountedRef.current || reqSeq !== previewSequence.current) {
        return;
      }
      const url = URL.createObjectURL(blob);
      previewBlobUrlRef.current = url;
      setPreviewBlobUrl(url);
    } catch (error) {
      if (!isMountedRef.current || reqSeq !== previewSequence.current) {
        return;
      }
      setPreviewError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível carregar o arquivo para pré-visualização."
      );
    } finally {
      if (isMountedRef.current && reqSeq === previewSequence.current) {
        setPreviewLoading(false);
      }
    }
  };

  const handleClosePreview = () => {
    previewSequence.current += 1;
    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
      setPreviewBlobUrl(null);
    }
    setPreviewMaterial(null);
    setPreviewError("");
    setPreviewLoading(false);
  };

  const handleOpenReportModal = (material: MaterialItem) => {
    if (!authenticated || !isAuthenticated()) {
      return;
    }
    setReportingMaterial(material);
    setReportCategory("GABARITO_ATIVO");
    setReportReason("");
    setReportError("");
    setReportFeedback("");
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingMaterial) return;
    if (!authenticated || !isAuthenticated()) {
      setReportError("Faça login com sua conta de estudante para enviar denúncias.");
      return;
    }

    const validacao = validarMotivoDenuncia(reportReason);
    if (!validacao.valido) {
      setReportError(validacao.erro || "Informe um motivo válido.");
      return;
    }

    const numericId = Number(reportingMaterial.id);
    if (!Number.isSafeInteger(numericId) || numericId <= 0) {
      setReportError("Material inválido para denúncia.");
      return;
    }

    setReportSubmitting(true);
    setReportError("");
    try {
      const res = await criarDenuncia({
        conteudo_id: numericId,
        categoria: reportCategory,
        motivo: reportReason,
      });
      if (res.ocultado_automaticamente) {
        setMaterials((prev) => prev.filter((item) => item.id !== reportingMaterial.id));
        setTotal((prev) => Math.max(0, prev - 1));
      }
      setReportingMaterial(null);
      setReportFeedback("Denúncia registrada e encaminhada para revisão da equipe de moderação.");
    } catch (error) {
      setReportError(
        error instanceof Error ? error.message : "Não foi possível enviar a denúncia no momento."
      );
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleDownload = async (material: MaterialItem) => {
    setDownloadError(null);
    setDownloadingId(material.id);
    try {
      const blob = await downloadMaterial(Number(material.id));
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `material-${material.id}.${material.formato.toLowerCase()}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      setDownloadError(error instanceof ApiError ? error.message : "Não foi possível baixar o material. Tente novamente.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="mt-8 rounded-3xl bg-white p-6 sm:p-8 border border-[#E8E6F8] shadow-xs">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDE9FD] text-[#5B4BDB]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#202124]">
              Materiais de Apoio
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Resumos, links e provas anteriores de {disciplineName}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!authenticated}
          title={!authenticated ? "Faça login para compartilhar materiais" : undefined}
          onClick={handleShareClick}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all ${
            authenticated
              ? "bg-[#5B4BDB] hover:brightness-110 active:scale-95 cursor-pointer"
              : "bg-gray-300 cursor-not-allowed opacity-60"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {authenticated ? "Compartilhar Material" : "Faça login para compartilhar"}
        </button>
      </div>

      {!authenticated && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D8D1FA] bg-[#EDE9FD] px-4 py-3 text-xs sm:text-sm text-[#5B4BDB]"
        >
          <span>
            Apenas estudantes autenticados podem compartilhar materiais.
          </span>
          <Link
            href="/login"
            className="rounded-lg bg-[#5B4BDB] px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all"
          >
            Fazer login
          </Link>
        </div>
      )}

      {displayedTriageNotice && (
        <div
          role={displayedTriageNotice.kind === "rejected" ? "alert" : "status"}
          className={`mb-6 rounded-2xl border px-4 py-3 text-xs sm:text-sm font-medium ${getTriageBannerClasses(
            displayedTriageNotice.kind
          )}`}
        >
          {displayedTriageNotice.message}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-[#F4F3FA] p-1.5 border border-[#ECEAF5]">
          <button
            type="button"
            onClick={() => { setActiveTab("provas"); setPage(1); }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "provas"
                ? "bg-white text-[#5B4BDB] shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Provas Anteriores
            {tabCounts.provas !== null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  activeTab === "provas"
                    ? "bg-[var(--primary-soft)] text-[var(--primary-text)]"
                    : "border border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]"
                }`}
              >
                {tabCounts.provas}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("resumos"); setPage(1); }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "resumos"
                ? "bg-white text-[#5B4BDB] shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Resumos & Dicas
            {tabCounts.resumos !== null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  activeTab === "resumos"
                    ? "bg-[var(--primary-soft)] text-[var(--primary-text)]"
                    : "border border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]"
                }`}
              >
                {tabCounts.resumos}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("links"); setPage(1); }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "links"
                ? "bg-white text-[#5B4BDB] shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Links & Arquivos
            {tabCounts.links !== null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  activeTab === "links"
                    ? "bg-[var(--primary-soft)] text-[var(--primary-text)]"
                    : "border border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]"
                }`}
              >
                {tabCounts.links}
              </span>
            )}
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Buscar material por título..."
            aria-label="Buscar material por título"
            className="w-full rounded-xl bg-[#FAFAFC] border border-[#DDD9F1] py-2 pl-9 pr-3 text-xs sm:text-sm text-[#202124] placeholder-gray-400 outline-none focus:border-[#5B4BDB] focus:ring-1 focus:ring-[#5B4BDB]"
          />
          <svg
            className="absolute left-3 top-2.5 text-gray-400"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      </div>

      {downloadError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{downloadError}</p>}
      {reportFeedback && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm font-medium text-emerald-800"
        >
          {reportFeedback}
        </div>
      )}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Carregando materiais de apoio...
        </div>
      ) : listError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p>{listError}</p>
          <button type="button" onClick={() => setRetryCount(value => value + 1)} className="mt-3 font-semibold underline">Tentar novamente</button>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DDD9F1] p-8 text-center">
          <p className="text-sm font-semibold text-[#202124]">
            {searchQuery
              ? "Nenhum material encontrado para essa busca."
              : "Ainda não há materiais cadastrados nesta categoria."}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {searchQuery
              ? "Tente buscar por outro termo ou limpe a pesquisa."
              : "Se você tiver anotações ou provas passadas, compartilhe com a turma!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((material) => {
            const safeExternalUrl =
              material.url_origem && validateExternalUrl(material.url_origem).isValid
                ? material.url_origem
                : null;
            const canPreview =
              !safeExternalUrl &&
              ["pdf", "png", "jpg", "jpeg"].includes(material.formato.toLowerCase());

            return (
              <div
                key={material.id}
                className="flex flex-col justify-between rounded-2xl bg-white p-5 border border-[#EDE9FD] transition-all hover:border-[#D8D1FA] hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#EDE9FD] px-2 py-0.5 text-[11px] font-bold uppercase text-[#5B4BDB]">
                      {material.formato}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {material.created_at}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#202124] line-clamp-2">
                    {material.titulo}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>Por {material.authorAlias}</span>
                    {material.professor && (
                      <span>• Prof: <strong className="text-gray-700">{material.professor}</strong></span>
                    )}
                    {!safeExternalUrl && typeof material.tamanho_bytes === "number" && (
                      <span>• {formatFileSize(material.tamanho_bytes)}</span>
                    )}
                  </div>

                  {safeExternalUrl && (
                    <p className="mt-2 truncate text-xs text-gray-500" title={safeExternalUrl}>
                      {safeExternalUrl}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                  {safeExternalUrl ? (
                    <a
                      href={safeExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B4BDB] hover:underline"
                    >
                      Abrir link externo
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      {canPreview && (
                        <button
                          type="button"
                          onClick={() => void handlePreview(material)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1FA] bg-[#FAF9FD] px-2.5 py-1 text-xs font-bold text-[#5B4BDB] hover:bg-[#EDE9FD] cursor-pointer transition-colors"
                        >
                          Pré-visualizar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDownload(material)}
                        disabled={downloadingId !== null}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B4BDB] hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {downloadingId === material.id ? "Baixando..." : "Baixar material"}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </button>
                      {isModerator && (
                        <button
                          type="button"
                          onClick={() => setReplacingMaterial(material)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 cursor-pointer transition-colors"
                        >
                          Substituir arquivo
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!authenticated}
                      title={!authenticated ? "Faça login para curtir materiais" : undefined}
                      onClick={() => void handleToggleUpvote(material.id)}
                      aria-label={`Curtir material ${material.titulo}`}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                        !authenticated
                          ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
                          : material.isLikedByMe
                          ? "bg-[#FFF0F2] text-[#EF4444] border border-[#FCA5A5] active:scale-95 cursor-pointer"
                          : "bg-[#F7F7FA] text-gray-500 border border-gray-200 hover:bg-gray-100 active:scale-95 cursor-pointer"
                      }`}
                    >
                      {material.isLikedByMe ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      )}
                      <span>{material.upvotes}</span>
                    </button>

                    {authenticated && material.isMine && (
                      <button
                        type="button"
                        onClick={() => setEditingMaterial(material)}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-[#5B4BDB] hover:text-[#5B4BDB] cursor-pointer transition-all"
                      >
                        Editar
                      </button>
                    )}

                    {authenticated && (material.isMine || isModerator) && (
                      <button
                        type="button"
                        onClick={() => setDeletingMaterial(material)}
                        className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer transition-all"
                      >
                        Apagar
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!authenticated}
                      title={!authenticated ? "Faça login para denunciar materiais" : undefined}
                      onClick={() => handleOpenReportModal(material)}
                      aria-label={`Denunciar material ${material.titulo}`}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        authenticated
                          ? "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                          : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                      }`}
                    >
                      Denunciar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && !listError && (
        <Pagination currentPage={page} totalPages={Math.ceil(total / MATERIALS_PER_PAGE)} onPageChange={setPage} totalItems={total} itemsPerPage={MATERIALS_PER_PAGE} itemName="materiais" />
      )}
      <MaterialPreviewModal
        isOpen={Boolean(previewMaterial)}
        material={previewMaterial ? { ...previewMaterial, disciplinaNome: disciplineName } : null}
        blobUrl={previewBlobUrl}
        loading={previewLoading}
        error={previewError}
        downloading={Boolean(previewMaterial && downloadingId === previewMaterial.id)}
        onClose={handleClosePreview}
        onDownload={(item) => void handleDownload(item)}
      />

      <ReplaceMaterialFileModal
        isOpen={Boolean(replacingMaterial)}
        material={
          replacingMaterial
            ? {
                id: replacingMaterial.id,
                titulo: replacingMaterial.titulo,
                disciplinaNome: disciplineName,
                formato: replacingMaterial.formato,
              }
            : null
        }
        onClose={() => setReplacingMaterial(null)}
        onDownloadCurrent={
          replacingMaterial ? () => handleDownload(replacingMaterial) : undefined
        }
        onReplaced={async () => {
          setReportFeedback("Arquivo substituído com sucesso. O arquivo anterior foi removido do servidor.");
          await fetchMaterials();
        }}
      />

      <EditMaterialModal
        isOpen={Boolean(editingMaterial)}
        material={
          editingMaterial
            ? {
                id: editingMaterial.id,
                titulo: editingMaterial.titulo,
                tipo: editingMaterial.tipo,
                url_origem: editingMaterial.url_origem,
                status_curadoria: "APROVADO",
              }
            : null
        }
        onClose={() => setEditingMaterial(null)}
        onSaved={async (updated) => {
          setReportFeedback(
            updated.status_curadoria === "PENDENTE"
              ? "Material atualizado. Como a URL foi alterada, ele voltou para a fila de moderação."
              : "Material atualizado com sucesso."
          );
          setRetryCount((v) => v + 1);
        }}
      />

      {deletingMaterial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-apagar-material-titulo"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 id="modal-apagar-material-titulo" className="text-lg font-bold text-[#202124]">
              Apagar material de apoio
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Tem certeza de que deseja apagar <strong className="text-[#202124]">{deletingMaterial.titulo}</strong>? Esta ação remove o material permanentemente.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeletingMaterial(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={async () => {
                  setDeleteSubmitting(true);
                  try {
                    await deleteMaterial(deletingMaterial.id);
                    setDeletingMaterial(null);
                    setReportFeedback("Material apagado com sucesso.");
                    setRetryCount((v) => v + 1);
                  } catch (err) {
                    setDeletingMaterial(null);
                    setDownloadError(
                      err instanceof Error ? err.message : "Não foi possível apagar o material."
                    );
                  } finally {
                    setDeleteSubmitting(false);
                  }
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deleteSubmitting ? "Apagando..." : "Apagar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportingMaterial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-denuncia-material-titulo"
        >
          <form
            onSubmit={handleSubmitReport}
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
          >
            <h3 id="modal-denuncia-material-titulo" className="text-lg font-bold text-[#202124]">
              Denunciar material à moderação
            </h3>
            <p className="mt-1 text-xs text-gray-600">
              Sinalize arquivos ou links que contenham gabaritos vigentes (RN05), dados pessoais (RN01) ou conteúdo impróprio.
            </p>
            <p className="mt-2 rounded-lg bg-[#F7F7FA] px-3 py-2 text-xs font-semibold text-[#202124]">
              {reportingMaterial.titulo} ({reportingMaterial.formato})
            </p>

            <label className="mt-4 block text-xs font-semibold text-gray-700">
              Categoria da denúncia
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value as CategoriaDenuncia)}
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-[#202124]"
              >
                {Object.entries(ROTULOS_CATEGORIA_DENUNCIA).map(([chave, rotulo]) => (
                  <option key={chave} value={chave}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-xs font-semibold text-gray-700">
              Motivo detalhado
              <textarea
                rows={3}
                maxLength={1000}
                value={reportReason}
                onChange={(e) => {
                  setReportReason(e.target.value);
                  setReportError("");
                }}
                placeholder="Descreva objetivamente por que este material viola as regras (mínimo 5 caracteres)."
                className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 text-sm text-[#202124]"
              />
            </label>

            {reportError && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                {reportError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={reportSubmitting}
                onClick={() => setReportingMaterial(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={reportSubmitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {reportSubmitting ? "Enviando..." : "Enviar denúncia"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}