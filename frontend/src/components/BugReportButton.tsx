"use client";
import React, { useRef, useState } from "react";
import Link from "next/link";
import { isAuthenticated } from "@/services/authService";
import { enviarRelatoBug } from "@/services/relatoBugService";
import Button from "./Button";

export default function BugReportButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [autenticado, setAutenticado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  function abrir() {
    setAutenticado(isAuthenticated());
    setErro("");
    setEnviado(false);
    dialog.current?.showModal();
  }
  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErro("");
    try {
      await enviarRelatoBug({ titulo: titulo.trim(), descricao: descricao.trim(), pagina: window.location.pathname });
      setEnviado(true);
      setTitulo("");
      setDescricao("");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível enviar o relato. Tente novamente.");
    } finally { setBusy(false); }
  }
  const campo = "mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-[var(--foreground)]";
  return <>
    <button type="button" onClick={abrir} className="inline-flex cursor-pointer items-center gap-1.5 transition-colors hover:text-[#5B4BDB]">
      <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 2 1.5 3M16 2l-1.5 3M7 9H3M21 9h-4M7 14H2M22 14h-5M8 19l-3 3M16 19l3 3M12 11v9" />
        <path d="M8 7a4 4 0 0 1 8 0v2H8V7Z" />
        <rect x="7" y="9" width="10" height="12" rx="5" />
      </svg>
      <span>Relatar problema</span>
    </button>
    <dialog ref={dialog} aria-labelledby="relato-bug-titulo" className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-[var(--foreground)] backdrop:bg-black/60">
      <div className="flex items-center justify-between gap-4">
        <h2 id="relato-bug-titulo" className="text-lg font-bold">Relatar problema no site</h2>
        <button type="button" onClick={() => dialog.current?.close()} className="cursor-pointer text-sm text-[var(--text-muted)]">Fechar</button>
      </div>
      {!autenticado ? <p className="mt-5">Entre na sua conta para enviar um relato. <Link className="font-semibold text-[var(--primary-text)] underline" href="/login" onClick={() => dialog.current?.close()}>Entrar</Link></p>
        : enviado ? <p role="status" className="mt-5 text-[var(--status-success-text)]">Relato enviado. A equipe poderá analisá-lo no painel de moderação.</p>
        : <form onSubmit={enviar} className="mt-5 space-y-4">
          <p className="text-sm text-[var(--text-muted)]">Descreva como reproduzir o problema e o que deveria acontecer. Não inclua senha, matrícula ou dados do histórico. O relato será visível apenas à equipe de moderação.</p>
          <label className="block text-sm font-semibold">Título<input autoFocus required minLength={5} maxLength={120} value={titulo} onChange={e => setTitulo(e.target.value)} className={campo} /></label>
          <label className="block text-sm font-semibold">Descrição<textarea required minLength={10} maxLength={3000} rows={5} value={descricao} onChange={e => setDescricao(e.target.value)} className={campo} /></label>
          {erro && <p role="alert" className="text-sm text-[var(--status-danger-text)]">{erro}</p>}
          <Button type="submit" isLoading={busy} disabled={titulo.trim().length < 5 || descricao.trim().length < 10}>Enviar relato</Button>
        </form>}
    </dialog>
  </>;
}
