"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import AcademicProfileDashboard from "@/components/AcademicProfileDashboard";
import {
  getStoredUser,
  isAuthenticated,
  subscribeAuthChange,
} from "@/services/authService";
import {
  clearImportedHistorico,
  loadImportedHistorico,
  saveImportedHistorico,
  uploadHistoricoPdf,
  type HistoricoImportacaoResponse,
} from "@/services/historicoService";

const HISTORICO_CHANGE_EVENT = "tamburetei-historico-change";

let cachedHistoricoRaw: string | null | undefined;
let cachedHistoricoParsed: HistoricoImportacaoResponse | null = null;

function subscribeHistorico(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(HISTORICO_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(HISTORICO_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getHistoricoSnapshot(): HistoricoImportacaoResponse | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("tamburetei_historico_sigaa");
  if (raw !== cachedHistoricoRaw) {
    cachedHistoricoRaw = raw;
    cachedHistoricoParsed = loadImportedHistorico();
  }
  return cachedHistoricoParsed;
}

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
      className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-200" />
      <div className="mt-6 h-48 animate-pulse rounded-3xl bg-white" />
      <div className="mt-6 h-80 animate-pulse rounded-3xl bg-white" />
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-[#F7F7FA] font-sans">
          <Navbar />
          <ProfileLoading />
          <Footer />
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("aba") === "seguranca" ? "security" : "overview";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const authenticated = useSyncExternalStore(
    subscribeAuthChange,
    isAuthenticated,
    () => null
  );
  const importedHistorico = useSyncExternalStore(
    subscribeHistorico,
    getHistoricoSnapshot,
    () => null
  );
  const [hasAcademicConsent, setHasAcademicConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated === false) {
      router.replace("/login?redirect=%2Fperfil");
    }
  }, [authenticated, router]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const result = await uploadHistoricoPdf(file);
      saveImportedHistorico(result);
      window.dispatchEvent(new Event(HISTORICO_CHANGE_EVENT));
      setHasAcademicConsent(true);
      setUploadSuccess(
        `Histórico importado com sucesso! ${result.contribuicao.novas_contribuicoes} novas amostras adicionadas às estatísticas da comunidade (${result.contribuicao.duplicadas_ignoradas} já contabilizadas anteriormente).`
      );
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Não foi possível importar o Histórico Escolar."
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleClearHistorico() {
    clearImportedHistorico();
    window.dispatchEvent(new Event(HISTORICO_CHANGE_EVENT));
    setUploadSuccess(null);
    setUploadError(null);
  }

  if (authenticated !== true) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F7F7FA] font-sans">
        <Navbar />
        <ProfileLoading />
        <Footer />
      </div>
    );
  }

  const storedUser = getStoredUser();
  const dadosReais = importedHistorico?.dados_academicos;
  const isRealProfile = Boolean(dadosReais);
  const displayName = isRealProfile
    ? storedUser?.nome || "Estudante UnB"
    : profileDemo.name;
  const displayInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "EU";
  const displayCourse = dadosReais?.curso || profileDemo.course;
  const displayStatus = dadosReais?.status || profileDemo.status;
  const displayPeriod = dadosReais?.periodo_atual
    ? `${dadosReais.periodo_atual}º período`
    : profileDemo.currentSemester;
  const displayEmail = isRealProfile
    ? storedUser?.email || "Conta autenticada"
    : profileDemo.email;

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7FA] font-sans">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
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
            {isRealProfile ? "Histórico SIGAA importado" : "Painel demonstrativo"}
          </span>
        </header>

        <section
          aria-labelledby="import-historico-title"
          className="rounded-3xl border border-[#D8D4F5] bg-white p-5 shadow-xs sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5B4BDB]">
                Integração via PDF Oficial (SIGAA)
              </p>
              <h2
                id="import-historico-title"
                className="mt-1 text-lg font-bold text-[#202124]"
              >
                Importar meu Histórico Escolar da UnB
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-gray-600">
                Preencha automaticamente seu painel com seu IRA, carga horária e
                disciplinas e ajude a comunidade a construir estatísticas reais
                de aprovação por turma. Dados pessoais (nome, matrícula e CPF)
                são descartados no servidor após a leitura em memória.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                id="historico-pdf-input"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="sr-only"
                disabled={uploading}
              />
              <label
                htmlFor="historico-pdf-input"
                className={`inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                  uploading
                    ? "bg-[#5B4BDB]/60 cursor-wait"
                    : "bg-[#5B4BDB] hover:bg-[#4F3EC9]"
                }`}
              >
                {uploading ? "Processando PDF..." : "Selecionar Histórico (PDF)"}
              </label>
              {isRealProfile && (
                <button
                  type="button"
                  onClick={handleClearHistorico}
                  className="rounded-xl border border-[#D8D4F5] px-3 py-2.5 text-sm font-semibold text-[#5B4BDB] transition-colors hover:bg-[#F7F7FA]"
                >
                  Limpar dados locais
                </button>
              )}
            </div>
          </div>

          {uploadError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {uploadError}
            </p>
          )}
          {uploadSuccess && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
            >
              {uploadSuccess}
            </p>
          )}
        </section>

        {!isRealProfile && (
          <div
            role="note"
            className="rounded-2xl border border-[#D8D4F5] bg-white px-4 py-3 text-sm leading-6 text-gray-600"
          >
            Os dados apresentados abaixo são fictícios até que você importe seu
            Histórico Escolar em PDF acima.
          </div>
        )}

        <section
          aria-labelledby="academic-identity-title"
          className="rounded-3xl border border-[#E8E6F8] bg-white p-5 shadow-xs sm:p-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              role="img"
              aria-label={`Avatar de ${displayName}`}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#EDE9FD] text-2xl font-extrabold text-[#5B4BDB]"
            >
              {displayInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5B4BDB]">
                Identificação acadêmica
              </p>
              <h2
                id="academic-identity-title"
                className="mt-1 text-2xl font-bold text-[#202124]"
              >
                {displayName}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {displayCourse} · {displayPeriod}
              </p>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:ml-auto">
              {displayStatus}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-gray-500">
                {isRealProfile ? "Currículo" : "Matrícula (demonstração)"}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {isRealProfile
                  ? dadosReais?.curriculo || "—"
                  : profileDemo.registrationNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">Curso</dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {displayCourse}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">
                {isRealProfile ? "Código de verificação" : "Nível"}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {isRealProfile
                  ? dadosReais?.codigo_verificacao || "Verificado"
                  : profileDemo.educationLevel}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">Status</dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {displayStatus}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">
                {isRealProfile ? "Prazo para conclusão" : "Turno"}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {isRealProfile
                  ? dadosReais?.prazo_conclusao || "—"
                  : profileDemo.shift}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">E-mail</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-[#202124]">
                {displayEmail}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500">
                Período de ingresso
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#202124]">
                {dadosReais?.periodo_inicial || profileDemo.admissionPeriod}
              </dd>
            </div>
            {isRealProfile && (
              <div>
                <dt className="text-xs font-semibold text-gray-500">
                  Emissão do histórico
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#202124]">
                  {dadosReais?.data_emissao || "—"}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <AcademicProfileDashboard
          consented={hasAcademicConsent}
          onConsent={() => setHasAcademicConsent(true)}
          onRevokeConsent={() => setHasAcademicConsent(false)}
          importedData={importedHistorico}
          initialSection={initialTab}
        />
      </main>
      <Footer />
    </div>
  );
}
