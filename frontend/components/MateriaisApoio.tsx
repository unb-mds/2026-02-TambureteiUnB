"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/authService";
import { listMaterials } from "@/services/materialService";

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
  usuario?: { nome?: string };
  authorAlias?: string;
  professor?: string;
}

interface MateriaisApoioProps {
  disciplineName: string;
  disciplineIdOrSlug?: string;
  refreshTrigger?: number;
  onOpenUploadModal?: () => void;
}

export default function MateriaisApoio({
  disciplineName,
  disciplineIdOrSlug,
  refreshTrigger = 0,
  onOpenUploadModal,
}: MateriaisApoioProps) {
  const router = useRouter();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"resumos" | "links" | "provas">("resumos");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!disciplineIdOrSlug) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await listMaterials(disciplineIdOrSlug);
        if (isMounted) {
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
            url: item.url || item.arquivo_url || "#",
            upvotes: item.upvotes || 0,
            isLikedByMe: false,
            authorAlias: item.usuario?.nome || item.authorAlias || "Estudante",
            professor: item.professor || undefined,
          }));
          setMaterials(mappedItems);
        }
      } catch (error) {
        console.error("Erro ao carregar materiais da disciplina:", error);
        if (isMounted) {
          setMaterials([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [disciplineIdOrSlug, refreshTrigger]);

  const handleShareClick = () => {
    if (!isAuthenticated()) {
      alert("Apenas estudantes cadastrados podem compartilhar materiais. Faça login na sua conta para colaborar!");
      router.push("/login");
      return;
    }

    if (onOpenUploadModal) {
      onOpenUploadModal();
    }
  };

  const handleToggleUpvote = (materialId: string) => {
    setMaterials((prev) =>
      prev.map((item) => {
        if (item.id === materialId) {
          const willLike = !item.isLikedByMe;
          return {
            ...item,
            isLikedByMe: willLike,
            upvotes: willLike ? item.upvotes + 1 : item.upvotes - 1,
          };
        }
        return item;
      })
    );
  };

  const filteredMaterials = materials.filter((item) => {
    const matchesTab = (() => {
      if (activeTab === "resumos") {
        return item.tipo === "RESUMO" || item.tipo === "DICA";
      }
      if (activeTab === "provas") {
        return item.tipo === "PROVA_ANTIGA";
      }
      if (activeTab === "links") {
        return item.tipo === "ARQUIVO" || item.formato.toLowerCase() === "link";
      }
      return true;
    })();

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      item.titulo.toLowerCase().includes(searchLower) ||
      (item.professor && item.professor.toLowerCase().includes(searchLower)) ||
      item.authorAlias.toLowerCase().includes(searchLower);

    return matchesTab && matchesSearch;
  });

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
          onClick={handleShareClick}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B4BDB] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:brightness-110 active:scale-95 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Compartilhar Material
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 rounded-2xl bg-[#F4F3FA] p-1.5 border border-[#ECEAF5]">
          <button
            type="button"
            onClick={() => setActiveTab("resumos")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "resumos"
                ? "bg-white text-[#5B4BDB] shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            📄 Resumos & Dicas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("links")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "links"
                ? "bg-white text-[#5B4BDB] shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            🔗 Links & Arquivos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("provas")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "provas"
                ? "bg-white text-[#5B4BDB] shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            📝 Provas Anteriores
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título ou professor..."
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

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Carregando materiais de apoio...
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
                <a
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B4BDB] hover:underline"
                >
                  Acessar material
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>

                <button
                  type="button"
                  onClick={() => handleToggleUpvote(material.id)}
                  aria-label={`Curtir material ${material.titulo}`}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    material.isLikedByMe
                      ? "bg-[#FFF0F2] text-[#EF4444] border border-[#FCA5A5]"
                      : "bg-[#F7F7FA] text-gray-500 border border-gray-200 hover:bg-gray-100"
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
    </section>
  );
}