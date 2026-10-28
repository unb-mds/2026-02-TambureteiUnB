"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import ModerationCard from "@/components/ModerationCard";
import { AUTH_CHANGE_EVENT } from "@/services/authService";
import { ApiError } from "@/services/httpClient";
import { baixarParaAnalise, decidirCuradoria, listarPendentes, verificarModerador } from "@/services/moderacaoService";
import type { DecisaoCuradoria, FilaCuradoria, MaterialPendente } from "@/types/moderacao";

type Acesso = "loading" | "allowed" | "anonymous" | "denied" | "error";

export default function ModeracaoPage() {
  const [acesso, setAcesso] = useState<Acesso>("loading");
  const [fila, setFila] = useState<FilaCuradoria | null>(null);
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [busy, setBusy] = useState(false);
  const sequencia = useRef(0);

  const tratarErro = useCallback((error: unknown) => {
    const status = error instanceof ApiError ? error.status : 0;
    if (status === 401 || status === 403 || status === 400) {
      setFila(null); setAcesso(status === 401 ? "anonymous" : "denied");
    }
    setErro(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
  }, []);

  const carregar = useCallback(async () => {
    const atual = ++sequencia.current;
    try {
      await verificarModerador();
      const resultado = await listarPendentes(pagina);
      if (atual !== sequencia.current) return;
      if (!resultado.items.length && pagina > 1) { setPagina(pagina - 1); return; }
      setFila(resultado); setAcesso("allowed"); setErro("");
    } catch (error) {
      if (atual !== sequencia.current) return;
      setFila(null); setAcesso("error"); tratarErro(error);
    }
  }, [pagina, tratarErro]);

  const invalidarConsultas = useCallback(() => { sequencia.current++; }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void carregar(), 0);
    const sessaoAlterada = () => { setFila(null); setAcesso("loading"); void carregar(); };
    window.addEventListener(AUTH_CHANGE_EVENT, sessaoAlterada);
    window.addEventListener("storage", sessaoAlterada);
    return () => {
      window.clearTimeout(timer);
      invalidarConsultas();
      window.removeEventListener(AUTH_CHANGE_EVENT, sessaoAlterada);
      window.removeEventListener("storage", sessaoAlterada);
    };
  }, [carregar, invalidarConsultas]);

  async function decidir(material: MaterialPendente, status: DecisaoCuradoria, motivo?: string) {
    setBusy(true); setErro(""); setAviso("");
    try {
      await decidirCuradoria(material.id, status, motivo);
      setAviso(`Material ${status === "APROVADO" ? "aprovado" : "recusado"}. Decisão registrada no histórico.`);
      await carregar();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await carregar(); setAviso("Outro moderador já avaliou este material. A fila foi atualizada.");
      } else tratarErro(error);
    } finally { setBusy(false); }
  }

  async function baixar(material: MaterialPendente) {
    setBusy(true); setErro("");
    try {
      const arquivo = await baixarParaAnalise(material.id);
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url; link.download = `material-${material.id}.${material.formato}`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { tratarErro(error); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7FA] text-[#202124]">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold text-[#5B4BDB]">Área da equipe</p>
        <h1 className="mt-2 text-3xl font-bold">Moderação de materiais</h1>
        <p className="mt-3 text-gray-600">Revise os arquivos enviados pelos alunos antes da publicação. Cada decisão fica registrada para auditoria.</p>
        {acesso === "loading" && <p role="status" className="mt-8">Verificando acesso e carregando a fila...</p>}
        {acesso === "anonymous" && <p className="mt-8">Faça <Link className="text-[#5B4BDB] underline" href="/login">login</Link> com uma conta de moderador ou administrador.</p>}
        {acesso === "denied" && <p role="alert" className="mt-8">Acesso restrito a moderadores e administradores.</p>}
        {erro && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">{erro}</p>}
        <p role="status" aria-live="polite" className="mt-4 text-sm text-[#5B4BDB]">{aviso}</p>
        {(acesso === "error" || acesso === "allowed") && <Button className="mt-4" variant="outline" disabled={busy} onClick={() => void carregar()}>Atualizar fila</Button>}
        {acesso === "allowed" && fila && <>
          <p className="my-5 text-sm text-gray-600">{fila.total} material(is) aguardando análise</p>
          {!fila.items.length && <section className="rounded-2xl border border-gray-200 bg-white p-8"><h2 className="text-xl font-semibold">Nenhum material pendente</h2><p className="mt-2 text-gray-600">Os novos envios aparecerão aqui.</p></section>}
          <div className="space-y-5" aria-busy={busy}>{fila.items.map((material) => <ModerationCard key={material.id} material={material} disabled={busy} onDecision={decidir} onDownload={baixar} />)}</div>
          {fila.total > 0 && <nav aria-label="Paginação da fila" className="mt-6 flex items-center justify-between gap-3">
            <Button variant="outline" disabled={busy || pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</Button>
            <span>Página {pagina} de {Math.max(1, Math.ceil(fila.total / fila.tamanho_pagina))}</span>
            <Button variant="outline" disabled={busy || pagina * fila.tamanho_pagina >= fila.total} onClick={() => setPagina(pagina + 1)}>Próxima</Button>
          </nav>}
        </>}
      </main>
      <Footer />
    </div>
  );
}
