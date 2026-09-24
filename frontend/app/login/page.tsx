import type { Metadata } from "next";
import StoolLogo from "@/components/StoolLogo";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Acesse o Tamburetei | Login",
  description: "Acesse sua conta no Tamburetei - Plataforma acadêmica da Universidade de Brasília",
};

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#F7F7FA",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      className="px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="w-full max-w-[420px] flex flex-col items-center">
        {/* Cabeçalho */}
        <header className="flex flex-col items-center text-center mb-8">
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: "#EDE9FD",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <StoolLogo size={48} />
          </div>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: "#202124",
              letterSpacing: "-0.02em",
              marginBottom: 6,
            }}
          >
            Acesse o Tamburetei
          </h1>
          <p
            style={{
              color: "#6B7280",
              fontSize: 15,
              margin: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Entre na sua conta para continuar
          </p>
        </header>

        {/* Formulário */}
        <LoginForm />
      </div>
    </main>
  );
}
