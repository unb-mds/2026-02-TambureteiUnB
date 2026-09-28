"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Informe seu e-mail institucional ou cadastrado.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Formato de e-mail inválido.";
    }

    if (!password) {
      newErrors.password = "Informe sua senha de acesso.";
    } else if (password.length < 6) {
      newErrors.password = "A senha deve ter pelo menos 6 caracteres.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // Simulação de autenticação
      await new Promise((resolve) => setTimeout(resolve, 800));
      router.push("/cursos");
    } catch {
      setErrors({
        general: "Não foi possível autenticar. Verifique seus dados e tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestContinue = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Container Central */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Identidade Visual / Logo */}
        <div className="flex flex-col items-center">
          <Link
            href="/"
            className="group flex flex-col items-center gap-2 focus:outline-none"
            aria-label="Voltar para a página inicial"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5B4BDB]/10 text-[#5B4BDB] shadow-sm group-hover:scale-105 transition-transform">
              <svg
                width="36"
                height="36"
                viewBox="0 0 220 220"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
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
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-[#202124]">
                Tamburetei <span className="text-[#5B4BDB]">UnB</span>
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Hub acadêmico colaborativo da Universidade de Brasília
              </p>
            </div>
          </Link>
        </div>

        {/* Card de Login */}
        <div className="mt-8 bg-white py-8 px-6 sm:px-10 shadow-sm border border-[#E8E6F8] rounded-3xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#202124]">Acesse sua conta</h2>
            <p className="text-xs text-gray-500 mt-1">
              Entre para colaborar com dicas, resumos e vivências acadêmicas.
            </p>
          </div>

          {/* Erro Geral */}
          {errors.general && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Campo E-mail */}
            <Input
              label="E-mail"
              type="email"
              id="login-email"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="seu.nome@aluno.unb.br"
              error={errors.email}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              }
              autoComplete="email"
            />

            {/* Campo Senha */}
            <Input
              label="Senha"
              type={showPassword ? "text" : "password"}
              id="login-password"
              name="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="Digite sua senha"
              error={errors.password}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              }
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              }
              autoComplete="current-password"
            />

            {/* Botão Entrar */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                isLoading={isLoading}
              >
                Entrar
              </Button>
            </div>
          </form>

          {/* Divisor */}
          <div className="mt-6 flex items-center justify-center">
            <div className="border-t border-gray-200 flex-grow" />
            <span className="px-3 text-xs uppercase tracking-wider text-gray-400 font-medium">
              ou
            </span>
            <div className="border-t border-gray-200 flex-grow" />
          </div>

          {/* Botão Continuar como Visitante */}
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              fullWidth
              size="md"
              onClick={handleGuestContinue}
              className="border-gray-200 text-[#202124] hover:bg-gray-50 hover:border-[#5B4BDB]/40 font-semibold"
            >
              Continuar como visitante
            </Button>
          </div>

          {/* Link para Cadastro */}
          <p className="mt-6 text-center text-xs text-gray-500">
            Ainda não tem conta no Tamburetei?{" "}
            <Link
              href="/cadastro"
              className="font-semibold text-[#5B4BDB] hover:text-[#4F3EC9] underline underline-offset-2"
            >
              Cadastre-se agora
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
