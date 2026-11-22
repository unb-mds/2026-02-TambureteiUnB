"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserResponse } from "@/types/auth";

export interface UserMenuDropdownProps {
  user: UserResponse;
  onLogout: () => void;
  className?: string;
}

export const getRoleBadgeLabel = (role?: string): string => {
  if (!role) return "ESTUDANTE";
  const upper = role.toUpperCase();
  if (upper === "ADMIN") return "ADMINISTRADOR";
  if (upper === "MODERATOR") return "MODERADOR";
  return "ESTUDANTE";
};

export const getUserInitials = (name?: string, email?: string): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().slice(0, 2).toUpperCase();
  }
  return "TU";
};

export const getShortUserName = (name?: string, email?: string): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }
    return parts[0];
  }
  if (email && email.trim()) {
    return email.split("@")[0];
  }
  return "Estudante";
};

export default function UserMenuDropdown({
  user,
  onLogout,
  className = "",
}: UserMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initials = getUserInitials(user.nome, user.email);
  const shortName = getShortUserName(user.nome, user.email);
  const roleLabel = getRoleBadgeLabel(user.role);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fechar com tecla Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Botão de disparo no Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Menu de conta de ${user.nome || "usuário"}`}
        className="flex items-center gap-2 rounded-2xl border border-transparent p-1.5 transition-all hover:border-[#EDE9FD] hover:bg-purple-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB]"
      >
        {/* Avatar Circular com gradiente suave */}
        <span
          className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
          style={{ background: "#5B4BDB", fontFamily: "Poppins, sans-serif" }}
        >
          {initials}
        </span>

        {/* Nome curto e cargo no desktop */}
        <span className="hidden text-left lg:block">
          <span className="block text-xs font-semibold leading-tight text-[#202124]">
            {shortName}
          </span>
          <span className="block text-[11px] font-medium leading-tight text-[#6B7280]">
            {user.role === "ADMIN" ? "Administrador" : user.role === "MODERATOR" ? "Moderador" : "Estudante"}
          </span>
        </span>

        {/* Ícone de chevron animado */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          className={`text-[#6B7280] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#5B4BDB]" : ""
          }`}
        >
          <path
            d="M3.5 5.5L7 9l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Menu Dropdown Flutuante */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Opções da conta"
          className="user-dropdown-menu absolute right-0 mt-2 w-72 origin-top-right rounded-3xl border border-[#303036] bg-[#18181B] p-3 text-white shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150 z-50"
        >
          {/* Cabeçalho do Usuário */}
          <div className="flex items-start gap-3 p-2">
            {/* Avatar em Destaque */}
            <span
              className="flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-full text-sm font-bold text-white shadow-md"
              style={{ background: "#5B4BDB", fontFamily: "Poppins, sans-serif" }}
            >
              {initials}
            </span>

            {/* Informações de Nome e E-mail */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#F4F4F5]">
                {user.nome || "Discente da UnB"}
              </p>
              <p className="truncate text-xs text-[#A1A1AA]">
                {user.email || ""}
              </p>

              {/* Badge de Cargo/Perfil */}
              <div className="mt-2">
                <span className="inline-flex items-center rounded-md bg-[#27272A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#A89BFF] border border-[#3F3F46]">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Separador fino */}
          <div className="my-2 border-t border-[#27272A]" />

          {/* Links e Ações */}
          <div className="space-y-1">
            {/* Opção: Meu perfil */}
            <Link
              href="/perfil"
              role="menuitem"
              onClick={handleClose}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-[#E4E4E7] transition-colors hover:bg-[#27272A] hover:text-white"
            >
              <span className="text-xs font-semibold">Meu perfil</span>
            </Link>

            {/* Opção: Segurança da conta */}
            <Link
              href="/alterar-senha"
              role="menuitem"
              onClick={handleClose}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#E4E4E7] transition-colors hover:bg-[#27272A] hover:text-white"
            >
              <svg
                className="h-4 w-4 text-[#A1A1AA]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Segurança da conta</span>
            </Link>

            {/* Opção: Sair da conta */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                handleClose();
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#F87171] transition-colors hover:bg-[#3F2023] hover:text-[#FCA5A5] text-left"
            >
              <svg
                className="h-4 w-4 text-[#F87171]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
