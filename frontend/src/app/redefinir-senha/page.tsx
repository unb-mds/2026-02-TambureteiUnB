"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { resetPassword } from "@/services/authService";
import { ApiError } from "@/services/httpClient";

function RedefinirSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Token de redefinição não encontrado ou link inválido.");
      return;
    }
    if (novaSenha.length < 8) {
      setError("A senha deve possuir pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await resetPassword({ token, nova_senha: novaSenha });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Não foi possível redefinir sua senha. Solicite um novo link.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center">
          <Link href="/" className="group flex flex-col items-center gap-2 focus:outline-none" aria-label="Página inicial">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5B4BDB]/10 text-[#5B4BDB] shadow-sm">
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
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#202124]">Criar Nova Senha</h1>
          <p className="mt-1 text-center text-xs text-gray-500 max-w-sm">
            Defina uma senha forte com pelo menos 8 caracteres, maiúscula, minúscula, número e caractere especial.
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-3xl sm:px-10">
          {success ? (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-sm font-bold text-emerald-900">Senha alterada com sucesso!</p>
              <p className="mt-1 text-xs text-emerald-700">Redirecionando para a tela de login...</p>
              <div className="mt-4">
                <Link href="/login" className="text-xs font-semibold text-[#5B4BDB] underline">
                  Ir para o login agora
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              <Input
                label="Nova senha"
                type={showPassword ? "text" : "password"}
                id="reset-password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />

              <Input
                label="Confirmar nova senha"
                type={showPassword ? "text" : "password"}
                id="reset-confirm-password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
                required
              />

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded border-gray-300 text-[#5B4BDB]"
                  />
                  Visualizar senha
                </label>
              </div>

              <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isLoading}>
                Salvar nova senha
              </Button>
            </form>
          )}

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

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F7FA] flex items-center justify-center text-xs text-gray-500">Carregando...</div>}>
      <RedefinirSenhaContent />
    </Suspense>
  );
}
