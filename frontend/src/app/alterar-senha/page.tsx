"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { changePassword, isAuthenticated, subscribeAuthChange } from "@/services/authService";
import { ApiError } from "@/services/httpClient";

function getAuthSnapshot(): boolean {
  return isAuthenticated();
}

function getServerSnapshot(): boolean {
  return false;
}

export default function AlterarSenhaPage() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const authenticated = useSyncExternalStore(subscribeAuthChange, getAuthSnapshot, getServerSnapshot);

  useEffect(() => {
    if (authenticated === false) {
      router.replace("/login?redirect=%2Falterar-senha");
    }
  }, [authenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senhaAtual) {
      setFeedback({ type: "error", message: "Informe sua senha atual." });
      return;
    }
    if (novaSenha.length < 8) {
      setFeedback({ type: "error", message: "A nova senha deve possuir no mínimo 8 caracteres." });
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setFeedback({ type: "error", message: "A confirmação da nova senha não coincide." });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await changePassword({ senha_atual: senhaAtual, nova_senha: novaSenha });
      setFeedback({ type: "success", message: res.message || "Senha alterada com sucesso!" });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Não foi possível alterar sua senha.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  if (authenticated !== true) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F7F7FA] font-sans">
        <Navbar />
        <main className="mx-auto flex flex-1 items-center justify-center px-4 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5B4BDB] border-t-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7FA] font-sans">
      <Navbar />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-3xl border border-[#E8E6F8] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5B4BDB]">
                Segurança da Conta
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-[#202124]">
                Alterar senha
              </h1>
            </div>
            <Link
              href="/perfil"
              className="text-xs font-semibold text-[#5B4BDB] hover:underline"
            >
              Voltar ao perfil
            </Link>
          </div>

          <p className="mb-6 text-sm text-gray-600">
            Para manter sua conta Tamburetei protegida, escolha uma senha forte com letras maiúsculas, minúsculas, números e caracteres especiais.
          </p>

          {feedback && (
            <div
              role="alert"
              className={`mb-6 rounded-xl border p-4 text-xs font-medium ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Senha atual"
              type="password"
              id="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder="Digite sua senha atual"
              required
            />
            <Input
              label="Nova senha"
              type="password"
              id="new-password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
              required
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              id="confirm-new-password"
              value={confirmarNovaSenha}
              onChange={(e) => setConfirmarNovaSenha(e.target.value)}
              placeholder="Repita a nova senha"
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={isLoading}
              >
                Salvar nova senha
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
