"use client";

import React from "react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  itemName?: string;
  className?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 25,
  itemName = "itens",
  className = "",
}: PaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= itemsPerPage)) {
    return null;
  }

  const pages = getPageNumbers(currentPage, totalPages);

  const startItem = totalItems !== undefined ? Math.min((currentPage - 1) * itemsPerPage + 1, totalItems) : null;
  const endItem = totalItems !== undefined ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Paginação"
      className={`mt-10 pt-6 border-t border-[#EDE9FD] flex flex-col sm:flex-row items-center justify-between gap-4 select-none ${className}`}
    >
      {/* Contador de itens */}
      <div className="text-xs sm:text-sm text-gray-600">
        {totalItems !== undefined && startItem !== null && endItem !== null ? (
          <span>
            Mostrando <strong className="font-semibold text-gray-800">{startItem}</strong> a{" "}
            <strong className="font-semibold text-gray-800">{endItem}</strong> de{" "}
            <strong className="font-semibold text-gray-800">{totalItems}</strong> {itemName}
          </span>
        ) : (
          <span>
            Página <strong className="font-semibold text-gray-800">{currentPage}</strong> de{" "}
            <strong className="font-semibold text-gray-800">{totalPages}</strong>
          </span>
        )}
      </div>

      {/* Controles de página */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Botão Anterior */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Página anterior"
          className="inline-flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white bg-white text-gray-700 border-[#E8E6F8] hover:border-[#5B4BDB] hover:text-[#5B4BDB] hover:bg-[#EDE9FD]/40 active:scale-95"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Números das páginas */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-xs text-gray-400 font-semibold"
                  aria-hidden="true"
                >
                  •••
                </span>
              );
            }

            const isCurrent = p === currentPage;

            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePageClick(p)}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={`Ir para a página ${p}`}
                className={`min-w-[34px] sm:min-w-[38px] h-8 sm:h-9 px-2 flex items-center justify-center rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 active:scale-95 ${
                  isCurrent
                    ? "bg-[#5B4BDB] text-white border border-[#5B4BDB] shadow-xs"
                    : "bg-white text-gray-700 border border-[#E8E6F8] hover:border-[#5B4BDB] hover:text-[#5B4BDB] hover:bg-[#EDE9FD]/40"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Botão Próximo */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Próxima página"
          className="inline-flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white bg-white text-gray-700 border-[#E8E6F8] hover:border-[#5B4BDB] hover:text-[#5B4BDB] hover:bg-[#EDE9FD]/40 active:scale-95"
        >
          <span className="hidden sm:inline">Próximo</span>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
