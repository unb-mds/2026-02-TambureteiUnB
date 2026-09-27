import React from "react";
import Link from "next/link";
import StoolIllustration from "./StoolIllustration";

export default function Footer() {
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
          <Link href="/login" className="transition-colors hover:text-[#5B4BDB]">
            Entrar
          </Link>
          <Link href="/cadastro" className="transition-colors hover:text-[#5B4BDB]">
            Cadastrar
          </Link>
        </div>
      </div>
    </footer>
  );
}
