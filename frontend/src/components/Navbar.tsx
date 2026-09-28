"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Button from "./Button";
import StoolIllustration from "./StoolIllustration";
import { authService } from "@/services/authService";
import { UserResponse } from "@/types/auth";

export interface NavbarProps {
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ className = "" }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserResponse | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  useEffect(() => {
    const syncAuth = () => {
      const hasToken = authService.isAuthenticated();
      setIsLoggedIn(hasToken);

      if (hasToken) {
        const cached = authService.getStoredUser();
        if (cached) setUser(cached);

        authService
          .getCurrentUser()
          .then((currentUser) => {
            if (currentUser) {
              setUser(currentUser);
            } else if (!authService.isAuthenticated()) {
              setIsLoggedIn(false);
              setUser(null);
            }
          })
          .catch(() => {
            // Mantém usuário em cache se houver falha de rede
          });
      } else {
        setUser(null);
      }
    };

    syncAuth();

    window.addEventListener(authService.AUTH_CHANGE_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener(authService.AUTH_CHANGE_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setUser(null);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "TU";
  };

  const getShortName = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0]} ${parts[parts.length - 1][0]}.`;
      }
      return parts[0];
    }
    if (email) {
      return email.split("@")[0];
    }
    return "Estudante";
  };

  const getRoleLabel = (role?: string) => {
    if (role === "ADMIN") return "Administrador";
    if (role === "MODERATOR") return "Moderador";
    return "Estudante";
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

        {/* Canto Superior Direito: Perfil (Figma) se logado, ou Botões se deslogado */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-2xl px-2.5 py-1.5 transition-all hover:bg-purple-50/80 border border-transparent hover:border-[#EDE9FD] focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]/30"
                aria-expanded={userMenuOpen}
                aria-label={`Abrir menu de ${user?.nome || "usuário"}`}
              >
                {/* Avatar circular com iniciais no padrão Figma */}
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs select-none"
                  style={{ background: "#5B4BDB", fontFamily: "Poppins, sans-serif" }}
                >
                  {getInitials(user?.nome, user?.email)}
                </span>

                {/* Nome e Papel (Figma) */}
                <span className="text-left hidden lg:block">
                  <span className="block text-xs font-semibold text-[#202124] leading-tight">
                    {getShortName(user?.nome, user?.email)}
                  </span>
                  <span className="block text-[11px] text-[#6B7280] font-medium leading-tight">
                    {getRoleLabel(user?.role)}
                  </span>
                </span>

                {/* Seta Chevron */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                  className={`transition-transform duration-200 text-[#6B7280] ${
                    userMenuOpen ? "rotate-180 text-[#5B4BDB]" : ""
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

              {/* Menu Suspenso (Dropdown) */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#EDE9FD] bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100 z-50">
                  {/* Informações do Usuário */}
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
                        style={{ background: "#5B4BDB", fontFamily: "Poppins, sans-serif" }}
                      >
                        {getInitials(user?.nome, user?.email)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#202124] truncate">
                          {user?.nome || "Discente da UnB"}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {user?.email || ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 inline-flex items-center rounded-md bg-[#5B4BDB]/10 px-2 py-0.5 text-[10px] font-bold text-[#5B4BDB] tracking-wide uppercase">
                      {getRoleLabel(user?.role)}
                    </div>
                  </div>

                  {/* Ação de Logout */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
                    >
                      <svg
                        className="w-4 h-4 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
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
          ) : (
            <>
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
            </>
          )}
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
            {isLoggedIn ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-2xl bg-[#F7F7FA] p-3 border border-[#E8E6F8]">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
                    style={{ background: "#5B4BDB", fontFamily: "Poppins, sans-serif" }}
                  >
                    {getInitials(user?.nome, user?.email)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#202124] truncate">
                      {user?.nome || "Discente da UnB"}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {user?.email || ""}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  fullWidth
                  size="md"
                  onClick={handleLogout}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold"
                >
                  Sair da conta
                </Button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
