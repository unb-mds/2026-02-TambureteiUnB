"use client";

import React, { useState } from "react";
import Link from "next/link";

export interface GuestBannerProps {
  className?: string;
  onDismiss?: () => void;
}

export const GuestBanner: React.FC<GuestBannerProps> = ({
  className = "",
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  return (
    <aside
      role="region"
      aria-label="Aviso de modo visitante"
      className={`relative w-full rounded-2xl border border-[#F4C542]/40 bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7]/60 to-[#FFFBEB] p-4 sm:p-5 shadow-sm transition-all duration-300 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Ícone e Texto Informativo */}
        <div className="flex items-start gap-3.5 max-w-3xl">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4C542]/20 text-[#B45309] shadow-inner"
            aria-hidden="true"
          >
            {/* Ícone de Usuário Visitante com Destaque */}
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-[#F4C542]/30 px-2 py-0.5 text-xs font-bold text-[#854D0E] tracking-wider uppercase">
                Acesso Visitante
              </span>
              <span className="text-xs text-[#92400E] font-medium hidden sm:inline">
                • Navegação livre ativada
              </span>
            </div>

            <p className="text-sm font-medium text-[#78350F] leading-snug">
              Você está explorando o <strong className="text-[#202124]">Tamburetei UnB</strong> como visitante. 
              Você pode pesquisar cursos, matrizes e métricas livremente. Para registrar situação acadêmica, enviar resumos ou votar em materiais, acesse sua conta institucional.
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-[#5B4BDB] border border-[#5B4BDB]/20 shadow-xs hover:bg-[#F7F7FA] hover:border-[#5B4BDB] transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="inline-flex items-center justify-center rounded-xl bg-[#5B4BDB] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#4F3EC9] transition-colors"
          >
            Cadastrar
          </Link>

          {/* Botão Fechar */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar aviso de visitante"
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-[#F4C542]/20 hover:text-stone-800 transition-colors"
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

export default GuestBanner;
