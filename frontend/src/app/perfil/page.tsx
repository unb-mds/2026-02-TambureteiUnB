"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import AcademicProfileDashboard from "@/components/AcademicProfileDashboard";
import { isAuthenticated, subscribeAuthChange } from "@/services/authService";

const profileDemo = {
  name: "Marina Oliveira",
  registrationNumber: "DEMO-000000",
  course: "Engenharia de Software",
  campus: "FCTE - Campus UnB Gama",
  educationLevel: "Graduação",
  status: "Ativo",
  shift: "Noturno",
  email: "estudante.demo@example.com",
  admissionPeriod: "2023/1",
  currentSemester: "7º semestre",
};

function ProfileLoading() {
  return (
    <main
      aria-label="Carregando perfil"
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-200" />
      <div className="mt-6 h-48 animate-pulse rounded-3xl bg-white" />
      <div className="mt-6 h-80 animate-pulse rounded-3xl bg-white" />
    </main>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const authenticated = useSyncExternalStore(
    subscribeAuthChange,
    isAuthenticated,
    () => null
  );
  const [hasAcademicConsent, setHasAcademicConsent] = useState(false);

  useEffect(() => {
    if (authenticated === false) {
      router.replace("/login?redirect=%2Fperfil");
    }
  }, [authenticated, router]);

  if (authenticated !== true) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F7F7FA] font-sans">
        <Navbar />
        <ProfileLoading />
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7FA] font-sans">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#5B4BDB]">
              Espaço do estudante
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#202124]">
              Meu perfil
            </h1>
          </div>
          <span className="w-fit rounded-full border border-[#D8D4F5] bg-white px-3 py-1.5 text-xs font-semibold text-[#5142C5]">
            Painel demonstrativo
          </span>
        </header>

        <div
          role="note"
          className="rounded-2xl border border-[#D8D4F5] bg-white px-4 py-3 text-sm leading-6 text-gray-600"
        >
          Os dados apresentados nesta página são fictícios. Não há consulta ao
          SIGAA, nem informações reais vinculadas à sua conta.
        </div>

        <section
          aria-labelledby="academic-identity-title"
          className="rounded-3xl border border-[#E8E6F8] bg-white p-5 shadow-xs sm:p-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              role="img"
              aria-label={`Avatar demonstrativo de ${profileDemo.name}`}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#EDE9FD] text-2xl font-extrabold text-[#5B4BDB]"
            >
              MO
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5B4BDB]">
                Identificação acadêmica
              </p>
              <h2
                id="academic-identity-title"
                className="mt-1 text-2xl font-bold text-[#202124]"
              >
                {profileDemo.name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {profileDemo.course} · {profileDemo.currentSemester}
              </p>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:ml-auto">
              {profileDemo.status}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-gray-500">
                Matrícula (demonstração)
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {profileDemo.registrationNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">Curso</dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {profileDemo.course}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">Nível</dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {profileDemo.educationLevel}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">Status</dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {profileDemo.status}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">Turno</dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {profileDemo.shift}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">E-mail</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-[#202124]">
                {profileDemo.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">
                Faculdade e campus
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {profileDemo.campus}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">
                Período de ingresso
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {profileDemo.admissionPeriod}
              </dd>
            </div>
          </dl>
        </section>

        <AcademicProfileDashboard
          consented={hasAcademicConsent}
          onConsent={() => setHasAcademicConsent(true)}
          onRevokeConsent={() => setHasAcademicConsent(false)}
        />
      </main>
      <Footer />
    </div>
  );
}
