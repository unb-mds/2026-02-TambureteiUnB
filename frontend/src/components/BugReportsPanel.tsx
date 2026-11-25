"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "./Button";
import { ApiError } from "@/services/httpClient";
import { decidirRelatoBug, listarRelatosBugs, type FilaRelatosBugs } from "@/services/relatoBugService";

export default function BugReportsPanel() {
  const [fila, setFila] = useState<FilaRelatosBugs | null>(null);
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [busy, setBusy] = useState(false);
  const [notas, setNotas] = useState<Record<number, string>>({});
  const sequence = useRef(0);
  const carregar = useCallback(async () => {
    const atual = ++sequence.current;
    try {
      const result = await listarRelatosBugs(pagina);
      if (atual !== sequence.current) return;
      if (!result.items.length && pagina > 1) { setPagina(pagina - 1); return; }
      setFila(result);
      setErro("");
    } catch (error) {
      if (atual !== sequence.current) return;
      setFila(null);
      setErro(error instanceof Error ? error.message : "Não foi possível carregar os relatos.");
    }
  }, [pagina]);
  useEffect(() => {
    const timer = window.setTimeout(() => void carregar(), 0);
    const consulta = sequence;
    return () => { window.clearTimeout(timer); consulta.current++; };
  }, [carregar]);
  async function decidir(id: number, status: "RESOLVIDO" | "DESCARTADO") {
    if (busy) return;
    setBusy(true);
    setAviso("");
    try {
      await decidirRelatoBug(id, status, notas[id] || "");
      await carregar();
      setAviso(status === "RESOLVIDO" ? "Problema marcado como resolvido." : "Relato descartado.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) await carregar();
      setErro(error instanceof Error ? error.message : "Não foi possível registrar a decisão.");
    } finally { setBusy(false); }
  }
  return <section aria-label="Relatos de problemas" className="mt-6 space-y-4">
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Problemas relatados {fila && `(${fila.total})`}</h2><Button variant="outline" onClick={() => void carregar()} disabled={busy}>Atualizar relatos</Button></div>
    {erro && <p role="alert" className="text-[var(--status-danger-text)]">{erro}</p>}
    {aviso && <p role="status" className="text-[var(--status-success-text)]">{aviso}</p>}
    {!fila && !erro && <p role="status">Carregando relatos...</p>}
    {fila?.total === 0 && <p className="text-[var(--text-muted)]">Nenhum problema aguardando análise.</p>}
    {fila?.items.map(item => <article key={item.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
      <h3 className="font-bold break-words">{item.titulo}</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Enviado em {new Date(item.created_at).toLocaleString("pt-BR")}</p>
      <Link href={item.pagina} className="mt-2 inline-block break-all text-sm text-[var(--primary-text)] underline">Página: {item.pagina}</Link>
      <p className="my-4 whitespace-pre-wrap break-words text-sm">{item.descricao}</p>
      <label className="block text-sm">Observação da equipe (opcional)<textarea rows={2} maxLength={1000} value={notas[item.id] || ""} onChange={e => setNotas(prev => ({ ...prev, [item.id]: e.target.value }))} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3" /></label>
      <div className="mt-4 flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => void decidir(item.id, "DESCARTADO")}>Descartar relato</Button><Button disabled={busy} onClick={() => void decidir(item.id, "RESOLVIDO")}>Marcar como resolvido</Button></div>
    </article>)}
    {fila && fila.total > fila.tamanho_pagina && <nav aria-label="Páginas de relatos" className="flex items-center gap-4"><Button variant="outline" disabled={busy || pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</Button><span>Página {pagina}</span><Button variant="outline" disabled={busy || pagina * fila.tamanho_pagina >= fila.total} onClick={() => setPagina(pagina + 1)}>Próxima</Button></nav>}
  </section>;
}
