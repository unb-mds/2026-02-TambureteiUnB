"use client";

import React, { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { isAuthenticated, subscribeAuthChange } from "@/services/authService";
import Pagination from "@/components/Pagination";
import { ApiError } from "@/services/httpClient";
import type { MaterialType } from "@/types/material";
import { listMaterials, downloadMaterial, toggleMaterialVote } from "@/services/materialService";

export interface MaterialItem {
  id: string;
  titulo: string;
  tipo: "ARQUIVO" | "RESUMO" | "PROVA_ANTIGA" | "DICA" | string;
  formato: string;
  tamanho_bytes?: number;
  created_at: string;
  url?: string;
  upvotes: number;
  isLikedByMe: boolean;
  authorAlias: string;
  professor?: string;
}

interface BackendMaterialItem {
  id: string | number;
  titulo?: string;
  tipo: string;
  formato?: string;
  tamanho_bytes?: number;
  created_at?: string;
  url?: string;
  arquivo_url?: string;
  upvotes?: number;
  liked_by_me?: boolean;
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
  resumos: ["RESUMO", "DICA"], links: ["ARQUIVO"], provas: ["PROVA_ANTIGA"],
};

export default function MateriaisApoio({
  disciplineName,
  disciplineIdOrSlug,
  refreshTrigger = 0,
  pendingMaterialIds = [],
  onOpenUploadModal,
}: MateriaisApoioProps) {
  const authenticated = useSyncExternalStore(
    subscribeAuthChange,
    isAuthenticated,
    () => false
  );
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"resumos" | "links" | "provas">("resumos");
  const [searchQuery, setSearchQuery] = useState("");
  const [triageState, setTriageState] = useState<{ trigger: number; message: string } | null>(null);

  const displayedTriageNotice =
    triageState && triageState.trigger === refreshTrigger
      ? triageState.message
      : refreshTrigger > 0
      ? "[TRIAGEM EM ANDAMENTO] Seu material foi enviado para verificacao automatica. A lista sera atualizada assim que for aprovado."
      : null;

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [listError, setListError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const requestSequence = useRef(0);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        formato: item.formato ? String(item.formato).toUpperCase() : "ARQUIVO",
        tamanho_bytes: item.tamanho_bytes,
        created_at: item.created_at
          ? new Date(item.created_at).toLocaleDateString("pt-BR")
          : "Recente",
        upvotes: item.upvotes || 0,
        isLikedByMe: Boolean(item.liked_by_me),
        authorAlias: item.usuario?.nome || item.authorAlias || "Estudante",
        professor: item.professor || undefined,
      }));

      if (isMountedRef.current && currentRequest === requestSequence.current) {
        setListError(null);
        setTotal(response.total);
        setMaterials(mappedItems);
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
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [fetchMaterials, retryCount, authenticated]);

  useEffect(() => {
    if (refreshTrigger <= 0 || !disciplineIdOrSlug) {
      return;
    }

    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    const currentTrigger = refreshTrigger;
    const targetIds = pendingMaterialIds.filter(Boolean);
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;

    const pollForPublication = async () => {
      if (!isMountedRef.current || cancelled) return;
      attempts += 1;
      const response = await listMaterials(disciplineIdOrSlug, { pagina: 1, tamanho_pagina: 100 }).catch(() => null);
      const items = response?.items ?? [];
      if (!isMountedRef.current || cancelled) return;

      const published =
        targetIds.length > 0
          ? items.find((item) => targetIds.includes(String(item.id)))
          : undefined;

      if (published) {
        setPage(1);
        setSearchQuery("");
        setRetryCount(value => value + 1);
        if (published.tipo === "PROVA_ANTIGA") {
          setActiveTab("provas");
        } else if (published.tipo === "ARQUIVO") {
          setActiveTab("links");
        } else {
          setActiveTab("resumos");
        }
        setTriageState({
          trigger: currentTrigger,
          message:
            "[PUBLICADO] Seu material foi aprovado pela moderacao automatica e ja esta disponivel abaixo.",
        });
        pollTimerRef.current = null;
        return;
      }

      if (attempts < maxAttempts) {
        pollTimerRef.current = setTimeout(() => {
          void pollForPublication();
        }, 3000);
      } else {
        setTriageState({
          trigger: currentTrigger,
          message:
            "[AGUARDANDO REVISAO] Seu material segue em analise ou foi encaminhado para curadoria humana.",
        });
        pollTimerRef.current = null;
      }
    };

    pollTimerRef.current = setTimeout(() => {
      void pollForPublication();
    }, 3000);

    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [refreshTrigger, pendingMaterialIds, disciplineIdOrSlug, fetchMaterials]);

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
          role="status"
          className="mb-6 rounded-2xl border border-[#DDD9F1] bg-[#FAF9FD] px-4 py-3 text-xs sm:text-sm text-[#3F3A60]"
        >
          {displayedTriageNotice}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-[#F4F3FA] p-1.5 border border-[#ECEAF5]">
          <button
            type="button"
            onClick={() => { setActiveTab("resumos"); setPage(1); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "resumos"
                ? "bg-white text-[#5B4BDB] shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Resumos & Dicas
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("links"); setPage(1); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "links"
                ? "bg-white text-[#5B4BDB] shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Links & Arquivos
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("provas"); setPage(1); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "provas"
                ? "bg-white text-[#5B4BDB] shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Provas Anteriores
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
          {filteredMaterials.map((material) => (
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
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
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
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && !listError && (
        <Pagination currentPage={page} totalPages={Math.ceil(total / MATERIALS_PER_PAGE)} onPageChange={setPage} totalItems={total} itemsPerPage={MATERIALS_PER_PAGE} itemName="materiais" />
      )}
    </section>
  );
}