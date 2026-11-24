"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";

export interface DataCollectionBannerProps {
  className?: string;
  storageKey?: string;
  onDismiss?: () => void;
}

export const DATA_COLLECTION_BANNER_STORAGE_KEY = "tamburetei_hide_data_collection_banner";

const subscribeStorage = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
};

export const DataCollectionBanner: React.FC<DataCollectionBannerProps> = ({
  className = "",
  storageKey = DATA_COLLECTION_BANNER_STORAGE_KEY,
  onDismiss,
}) => {
  const [manualDismissed, setManualDismissed] = useState(false);

  const isStorageDismissed = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem(storageKey) === "true";
      } catch {
        return false;
      }
    },
    () => false
  );

  const isDismissed = manualDismissed || isStorageDismissed;

  if (isDismissed) {
    return null;
  }

  const handleClose = () => {
    setManualDismissed(true);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // Ignora falhas de acesso ao storage
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <aside
      role="region"
      aria-label="Aviso sobre coleta colaborativa de dados"
      className={`relative w-full rounded-2xl border border-[#5B4BDB]/20 bg-gradient-to-r from-[#F5F3FF] via-[#EDE9FD]/70 to-[#F5F3FF] p-4 sm:p-5 shadow-xs transition-all duration-300 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Ícone e Texto Informativo */}
        <div className="flex items-start gap-3.5 max-w-3xl">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5B4BDB]/15 text-[#5B4BDB] shadow-inner"
            aria-hidden="true"
          >
            {/* Ícone de Gráfico / Dados Colaborativos */}
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-[#5B4BDB]/20 px-2 py-0.5 text-xs font-bold text-[#5B4BDB] tracking-wider uppercase">
                Fase de Coleta Colaborativa
              </span>
              <span className="text-xs text-[#5B4BDB]/90 font-medium hidden sm:inline">
                • Dados em construcao pela comunidade UnB
              </span>
            </div>

            <p className="text-sm font-medium text-[#202124] leading-snug">
              Ainda estamos coletando e consolidando as estatisticas das disciplinas. Voce pode colaborar importando seu <strong className="text-[#5B4BDB]">historico escolar do SIGAA</strong> no seu perfil e compartilhando os graficos de aprovacao das turmas que ja cursou.
            </p>
          </div>
        </div>

        {/* Botoes de Acao */}
        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
          <Link
            href="/perfil"
            className="inline-flex items-center justify-center rounded-xl bg-[#5B4BDB] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#4F3EC9] transition-colors"
          >
            Contribuir no Perfil
          </Link>

          {/* Botao Fechar */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar aviso de coleta de dados"
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-[#5B4BDB]/15 hover:text-gray-800 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DataCollectionBanner;
