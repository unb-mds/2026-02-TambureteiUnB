"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";

export default function RegisterPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [errors, setErrors] = useState<{
    nome?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: {
      nome?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!nome.trim()) {
      newErrors.nome = "O nome completo é obrigatório.";
    } else if (nome.trim().length < 3) {
      newErrors.nome = "O nome deve ter no mínimo 3 caracteres.";
    }

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      newErrors.email = "O e-mail institucional é obrigatório.";
    } else if (
      !emailTrimmed.endsWith("@aluno.unb.br") &&
      !emailTrimmed.endsWith("@unb.br")
    ) {
      newErrors.email =
        "Utilize o e-mail institucional da UnB (exemplo: usuario@aluno.unb.br).";
    }

    if (!password) {
      newErrors.password = "A senha é obrigatória.";
    } else if (password.length < 6) {
      newErrors.password = "A senha deve ter no mínimo 6 caracteres.";
    }

    if (password && confirmPassword !== password) {
      newErrors.confirmPassword = "As senhas não coincidem.";
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
      // Simulação de cadastro
      await new Promise((resolve) => setTimeout(resolve, 900));
      setIsSuccess(true);

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setErrors({
        general: "Não foi possível concluir o cadastro. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
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
                Comunidade universitária aberta e colaborativa
              </p>
            </div>
          </Link>
        </div>

        {/* Card do Formulário */}
        <div className="mt-8 bg-white py-8 px-6 sm:px-10 shadow-sm border border-[#E8E6F8] rounded-3xl">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#202124]">Crie sua conta</h2>
            <p className="text-xs text-gray-500 mt-1">
              Cadastre-se com seu e-mail institucional para ter voz ativa na plataforma.
            </p>
          </div>

          {/* Banner de Sucesso */}
          {isSuccess && (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center gap-3 animate-in fade-in"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-emerald-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold">Conta criada com sucesso!</p>
                <p className="text-emerald-700">Redirecionando para o login em instantes...</p>
              </div>
            </div>
          )}

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
            {/* Campo Nome */}
            <Input
              label="Nome Completo"
              type="text"
              id="register-nome"
              name="nome"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (errors.nome) setErrors((prev) => ({ ...prev, nome: undefined }));
              }}
              placeholder="Ex: Darcy Ribeiro"
              error={errors.nome}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              }
              autoComplete="name"
            />

            {/* Campo E-mail Institucional */}
            <Input
              label="E-mail Institucional (@aluno.unb.br)"
              type="email"
              id="register-email"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="matricula@aluno.unb.br"
              helperText="Utilizado para validação de vínculo acadêmico com a UnB."
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
              id="register-password"
              name="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="Crie uma senha segura (mín. 6 dígitos)"
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
              autoComplete="new-password"
            />

            {/* Campo Confirmar Senha */}
            <Input
              label="Confirmar Senha"
              type={showPassword ? "text" : "password"}
              id="register-confirm-password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword)
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              placeholder="Repita sua senha"
              error={errors.confirmPassword}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              }
              autoComplete="new-password"
            />

            {/* Selo LGPD / Privacy By Design */}
            <div className="rounded-xl bg-[#F7F7FA] p-3 text-[11px] text-gray-500 border border-[#E8E6F8] leading-relaxed">
              <span className="font-semibold text-[#202124]">Privacidade Garantida (RF01):</span> Não
              solicitamos nem armazenamos matrícula, CPF ou histórico individual.
              Seus comentários na comunidade utilizam apelido anônimo.
            </div>

            {/* Botão Cadastrar */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                isLoading={isLoading}
              >
                Criar Conta
              </Button>
            </div>
          </form>

          {/* Link para Login */}
          <div className="mt-6 text-center text-xs text-gray-500">
            Já possui cadastro no Tamburetei?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#5B4BDB] hover:text-[#4F3EC9] underline underline-offset-2"
            >
              Fazer login
            </Link>
          </div>

          {/* Continuar como Visitante */}
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="inline-block text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Ou continuar navegando como visitante →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
