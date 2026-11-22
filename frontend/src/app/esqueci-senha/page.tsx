"use client";

import React, { useState } from "react";
import Link from "next/link";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { requestPasswordReset } from "@/services/authService";
import { ApiError } from "@/services/httpClient";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setEmailError("Informe seu e-mail cadastrado.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError("Formato de e-mail inválido.");
      return;
    }

    setEmailError(undefined);
    setIsLoading(true);
    setFeedback(null);
    setResetToken(null);

    try {
      const res = await requestPasswordReset({ email: cleanEmail });
      setFeedback({
        type: "success",
        message: res.message,
      });
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Não foi possível processar a solicitação no momento.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center">
          <Link
            href="/"
            className="group flex flex-col items-center gap-2 focus:outline-none"
            aria-label="Voltar para a página inicial"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5B4BDB]/10 text-[#5B4BDB] shadow-sm group-hover:scale-105 transition-transform">
              <svg width="36" height="36" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="30" y="70" width="160" height="28" rx="14" fill="#5B4BDB" />
                <path d="M60 98 C55 140 48 165 42 190" stroke="#5B4BDB" strokeWidth="12" strokeLinecap="round" />
                <path d="M160 98 C165 140 172 165 178 190" stroke="#5B4BDB" strokeWidth="12" strokeLinecap="round" />
                <path d="M95 98 C93 138 88 162 82 192" stroke="#7C6CF0" strokeWidth="12" strokeLinecap="round" />
                <path d="M125 98 C127 138 132 162 138 192" stroke="#7C6CF0" strokeWidth="12" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#202124]">Tamburetei UnB</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#202124]">Recuperação de Senha</h1>
          <p className="mt-1 text-center text-xs text-gray-500 max-w-sm">
            Informe o e-mail cadastrado na plataforma para receber o link de redefinição de senha.
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-3xl sm:px-10">
          {feedback && (
            <div
              role="alert"
              className={`mb-6 rounded-xl border p-4 text-xs font-medium ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <p>{feedback.message}</p>
              {resetToken && (
                <div className="mt-3 border-t border-emerald-200 pt-3">
                  <p className="font-semibold text-emerald-900 mb-1">Link de redefinição de acesso:</p>
                  <Link
                    href={`/redefinir-senha?token=${resetToken}`}
                    className="text-[#5B4BDB] underline font-bold break-all hover:text-[#4F3EC9]"
                  >
                    Clique aqui para redefinir sua senha agora
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="E-mail"
              type="email"
              id="recovery-email"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(undefined);
              }}
              placeholder="seu.email@aluno.unb.br"
              error={emailError}
              autoComplete="email"
            />

            <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isLoading}>
              Enviar instruções
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            Lembrou sua senha?{" "}
            <Link href="/login" className="font-semibold text-[#5B4BDB] hover:text-[#4F3EC9] underline">
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
