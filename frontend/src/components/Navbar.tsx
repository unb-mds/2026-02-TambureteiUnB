"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "./Button";

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
      className={`sticky top-0 z-40 w-full border-b border-[#E8E6F8] bg-white/95 backdrop-blur-md transition-all ${className}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Tamburetei UnB */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] rounded-xl p-1 -ml-1 transition-transform active:scale-95"
          aria-label="Tamburetei UnB - Ir para página inicial"
        >
          {/* Símbolo do banquinho */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B4BDB]/10 text-[#5B4BDB] group-hover:bg-[#5B4BDB]/15 transition-colors">
            <svg
              width="26"
              height="26"
              viewBox="0 0 220 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect x="30" y="70" width="160" height="28" rx="14" fill="#5B4BDB" />
              <path
                d="M60 98 C55 140 48 165 42 190"
                stroke="#5B4BDB"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M160 98 C165 140 172 165 178 190"
                stroke="#5B4BDB"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M95 98 C93 138 88 162 82 192"
                stroke="#7C6CF0"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M125 98 C127 138 132 162 138 192"
                stroke="#7C6CF0"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M50 155 C90 148 130 148 170 155"
                stroke="#F4C542"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <rect x="50" y="75" width="120" height="8" rx="4" fill="#7C6CF0" opacity="0.6" />
            </svg>
          </div>

          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight text-[#202124] group-hover:text-[#5B4BDB] transition-colors">
              Tamburetei
            </span>
            <div className="flex items-center gap-1.5 -mt-0.5">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#5B4BDB] bg-[#5B4BDB]/10 px-1.5 py-0.2 rounded">
                UnB
              </span>
              <span className="text-[10px] text-gray-400 font-medium">comunidade</span>
            </div>
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
