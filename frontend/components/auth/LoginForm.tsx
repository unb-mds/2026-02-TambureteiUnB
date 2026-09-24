"use client";

import { useState } from "react";
import Link from "next/link";

export interface LoginFormProps {
  onSubmit?: (data: { email: string; password: string }) => void | Promise<void>;
  onSuccess?: (email: string) => void;
  className?: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginForm({
  onSubmit,
  onSuccess,
  className = "",
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = "O e-mail é obrigatório.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Insira um endereço de e-mail válido.";
    }

    if (!password) {
      newErrors.password = "A senha é obrigatória.";
    } else if (password.length < 6) {
      newErrors.password = "A senha deve conter pelo menos 6 caracteres.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (onSubmit) {
        await onSubmit({ email, password });
      } else {
        // Feedback simulado padrão de requisição
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      if (onSuccess) {
        onSuccess(email);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Falha na autenticação. Verifique suas credenciais e tente novamente.";
      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Card do formulário */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 24,
          padding: "36px 40px",
          boxShadow: "0 4px 32px rgba(91,75,219,0.10)",
          border: "1px solid #EDE9FD",
        }}
        className="w-full"
      >
        <form onSubmit={handleSubmit} noValidate>
          {/* Feedback de erro geral */}
          {errors.general && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="mt-0.5 shrink-0 text-red-500"
                aria-hidden="true"
              >
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v4M8 11.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>{errors.general}</span>
            </div>
          )}

          {/* Campo E-mail */}
          <div className="mb-5">
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 8,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              E-mail
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: `2px solid ${
                  errors.email
                    ? "#EF4444"
                    : focusedField === "email"
                    ? "#5B4BDB"
                    : "#E5E7EB"
                }`,
                borderRadius: 12,
                padding: "12px 16px",
                background: "#FFFFFF",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                boxShadow:
                  focusedField === "email" && !errors.email
                    ? "0 0 0 3px rgba(91,75,219,0.12)"
                    : "none",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                className="shrink-0"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="3"
                  width="16"
                  height="12"
                  rx="2.5"
                  stroke={errors.email ? "#EF4444" : focusedField === "email" ? "#5B4BDB" : "#9CA3AF"}
                  strokeWidth="1.6"
                />
                <path
                  d="M1 6l8 5 8-5"
                  stroke={errors.email ? "#EF4444" : focusedField === "email" ? "#5B4BDB" : "#9CA3AF"}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="seu@email.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                style={{
                  flex: 1,
                  outline: "none",
                  border: "none",
                  fontSize: 14,
                  color: "#202124",
                  fontFamily: "'Inter', sans-serif",
                  background: "transparent",
                }}
              />
            </div>
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6 3.5v3M6 8.5h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {errors.email}
              </p>
            )}
          </div>

          {/* Campo Senha */}
          <div className="mb-2">
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 8,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Senha
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: `2px solid ${
                  errors.password
                    ? "#EF4444"
                    : focusedField === "password"
                    ? "#5B4BDB"
                    : "#E5E7EB"
                }`,
                borderRadius: 12,
                padding: "12px 16px",
                background: "#FFFFFF",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                boxShadow:
                  focusedField === "password" && !errors.password
                    ? "0 0 0 3px rgba(91,75,219,0.12)"
                    : "none",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                className="shrink-0"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="8"
                  width="12"
                  height="9"
                  rx="2"
                  stroke={errors.password ? "#EF4444" : focusedField === "password" ? "#5B4BDB" : "#9CA3AF"}
                  strokeWidth="1.6"
                />
                <path
                  d="M6 8V6a3 3 0 116 0v2"
                  stroke={errors.password ? "#EF4444" : focusedField === "password" ? "#5B4BDB" : "#9CA3AF"}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle
                  cx="9"
                  cy="12.5"
                  r="1.2"
                  fill={errors.password ? "#EF4444" : focusedField === "password" ? "#5B4BDB" : "#9CA3AF"}
                />
              </svg>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                style={{
                  flex: 1,
                  outline: "none",
                  border: "none",
                  fontSize: 14,
                  color: "#202124",
                  fontFamily: "'Inter', sans-serif",
                  background: "transparent",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "#9CA3AF",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"
                      stroke="#9CA3AF"
                      strokeWidth="1.6"
                    />
                    <circle cx="9" cy="9" r="2.5" stroke="#9CA3AF" strokeWidth="1.6" />
                    <path
                      d="M2 2l14 14"
                      stroke="#9CA3AF"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"
                      stroke="#9CA3AF"
                      strokeWidth="1.6"
                    />
                    <circle cx="9" cy="9" r="2.5" stroke="#9CA3AF" strokeWidth="1.6" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6 3.5v3M6 8.5h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {errors.password}
              </p>
            )}
          </div>

          {/* Link para recuperação de senha */}
          <div style={{ textAlign: "right", marginBottom: 24 }}>
            <Link
              href="/recuperar-senha"
              style={{
                background: "none",
                border: "none",
                color: "#5B4BDB",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                textDecoration: "none",
              }}
              className="hover:underline transition-all"
            >
              Esqueceu a senha?
            </Link>
          </div>

          {/* Botão principal Entrar */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 12,
              background: "#5B4BDB",
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              border: "none",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              letterSpacing: "-0.01em",
              boxShadow: "0 4px 16px rgba(91,75,219,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: isSubmitting ? 0.85 : 1,
              transition: "filter 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1)";
            }}
            className="active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Entrando...</span>
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        {/* Divisor */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "24px 0",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          <span
            style={{
              color: "#9CA3AF",
              fontSize: 13,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            ou continue com
          </span>
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
        </div>

        {/* Botão Google SSO */}
        <button
          type="button"
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 12,
            background: "#FFFFFF",
            color: "#374151",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            border: "1.5px solid #E5E7EB",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "border-color 0.15s ease, background-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#5B4BDB";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#E5E7EB";
          }}
          className="active:scale-[0.99]"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          Entrar com Google
        </button>
      </div>

      {/* Link de direcionamento para cadastro */}
      <p
        style={{
          textAlign: "center",
          marginTop: 24,
          color: "#6B7280",
          fontSize: 14,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Não tem conta?{" "}
        <Link
          href="/register"
          style={{
            color: "#5B4BDB",
            fontWeight: 600,
            textDecoration: "none",
            fontFamily: "'Inter', sans-serif",
          }}
          className="hover:underline ml-1"
        >
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
