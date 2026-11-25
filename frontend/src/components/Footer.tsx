"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { isAuthenticated, subscribeAuthChange } from "@/services/authService";
import BugReportButton from "./BugReportButton";
import StoolIllustration from "./StoolIllustration";

export default function Footer() {
  const isLoggedIn = useSyncExternalStore(
    subscribeAuthChange,
    () => isAuthenticated(),
    () => false
  );

  return (
    <footer className="border-t border-[#EDE9FD] bg-white mt-auto">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
        <div className="flex items-center gap-3">
          <StoolIllustration size={32} />
          <div>
            <span
              className="font-bold text-[#5B4BDB] text-base leading-tight block"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Tamburetei
            </span>
            <span className="block text-[10px] font-medium tracking-wider text-gray-400 uppercase">
              Informação que te apoia • UnB
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500">
          Feito com 💜 por e para estudantes da Universidade de Brasília
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-600">
          <Link href="/" className="transition-colors hover:text-[#5B4BDB]">
            Início
          </Link>
          <Link href="/cursos" className="transition-colors hover:text-[#5B4BDB]">
            Cursos
          </Link>
          <Link href="/disciplinas" className="transition-colors hover:text-[#5B4BDB]">
            Disciplinas
          </Link>
          <a
            href="https://github.com/unb-mds/2026-02-TambureteiUnB"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Repositório do Tamburetei UnB no GitHub"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[#5B4BDB]"
          >
            <svg
              className="h-3.5 w-3.5 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>GitHub</span>
          </a>
          <BugReportButton />
          {!isLoggedIn && (
            <>
              <Link href="/login" className="transition-colors hover:text-[#5B4BDB]">
                Entrar
              </Link>
              <Link href="/cadastro" className="transition-colors hover:text-[#5B4BDB]">
                Cadastrar
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
