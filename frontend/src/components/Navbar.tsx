"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "./Button";
import StoolIllustration from "./StoolIllustration";

export interface NavbarProps {
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ className = "" }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-[#EDE9FD] bg-white/95 backdrop-blur-md transition-all shadow-[0_1px_8px_rgba(91,75,219,0.06)] ${className}`}
    >
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Tamburetei Original do Figma */}
        <Link
          href="/"
          className="group flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] rounded-xl p-1 transition-transform active:scale-95"
          aria-label="Tamburetei UnB - Ir para página inicial"
        >
          {/* Símbolo do banquinho com doodles originais do Figma */}
          <StoolIllustration size={36} className="transition-transform group-hover:scale-105" />

          <div className="flex flex-col leading-tight">
            <span
              className="font-bold text-xl tracking-tight text-[#5B4BDB]"
              style={{ fontFamily: "Poppins, sans-serif", letterSpacing: "-0.02em" }}
            >
              Tamburetei
            </span>
            <span
              className="text-[9px] font-semibold tracking-[0.12em] uppercase text-[#F4C542]"
            >
              INFORMAÇÃO QUE TE APOIA
            </span>
          </div>
        </Link>

        {/* Links Centrais (Desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isActive("/")
                ? "bg-[#5B4BDB]/10 text-[#5B4BDB]"
                : "text-gray-600 hover:text-[#5B4BDB] hover:bg-gray-50"
            }`}
          >
            Início
          </Link>
          <Link
            href="/cursos"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isActive("/cursos")
                ? "bg-[#5B4BDB]/10 text-[#5B4BDB]"
                : "text-gray-600 hover:text-[#5B4BDB] hover:bg-gray-50"
            }`}
          >
            Cursos
          </Link>
          <Link
            href="/disciplinas"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isActive("/disciplinas")
                ? "bg-[#5B4BDB]/10 text-[#5B4BDB]"
                : "text-gray-600 hover:text-[#5B4BDB] hover:bg-gray-50"
            }`}
          >
            Disciplinas
          </Link>
        </nav>

        {/* Botões de Autenticação (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-semibold text-gray-700 hover:text-[#5B4BDB]">
              Entrar
            </Button>
          </Link>
          <Link href="/cadastro">
            <Button variant="primary" size="sm" className="shadow-sm">
              Cadastrar
            </Button>
          </Link>
        </div>

        {/* Botão Mobile Hamburger */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center p-2 rounded-xl text-gray-700 hover:text-[#5B4BDB] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menu principal"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menu Dropdown Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E8E6F8] bg-white px-4 pt-3 pb-5 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col gap-1.5">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-base font-medium ${
                isActive("/")
                  ? "bg-[#5B4BDB]/10 text-[#5B4BDB]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Início
            </Link>
            <Link
              href="/cursos"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-base font-medium ${
                isActive("/cursos")
                  ? "bg-[#5B4BDB]/10 text-[#5B4BDB]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cursos
            </Link>
            <Link
              href="/disciplinas"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-base font-medium ${
                isActive("/disciplinas")
                  ? "bg-[#5B4BDB]/10 text-[#5B4BDB]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Disciplinas
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button variant="outline" fullWidth size="md">
                Entrar
              </Button>
            </Link>
            <Link href="/cadastro" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button variant="primary" fullWidth size="md">
                Cadastrar
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
