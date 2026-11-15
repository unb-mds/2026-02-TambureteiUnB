"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import ModerationCard from "@/components/ModerationCard";
import DenunciaModerationCard from "@/components/DenunciaModerationCard";
import ModerationActionModal from "@/components/ModerationActionModal";
import { AUTH_CHANGE_EVENT } from "@/services/authService";
import { ApiError } from "@/services/httpClient";
import {
  ROTULOS_CATEGORIA_DENUNCIA,
  baixarParaAnalise,
  decidirCuradoria,
  decidirDenuncia,
  listarDenunciasPendentes,
  listarPendentes,
  verificarModerador,
} from "@/services/moderacaoService";
import type {
  AcaoDenuncia,
  DecisaoCuradoria,
  DenunciaItemFila,
  FilaCuradoria,
  FilaDenuncias,
  FiltroCategoriaDenuncia,
  FiltroTipoDenuncia,
  MaterialPendente,
} from "@/types/moderacao";

type Acesso = "loading" | "allowed" | "anonymous" | "denied" | "error";
type AbaPainel = "materiais" | "denuncias";

export default function ModeracaoPage() {
  const [acesso, setAcesso] = useState<Acesso>("loading");
  const [aba, setAba] = useState<AbaPainel>("materiais");
  const [fila, setFila] = useState<FilaCuradoria | null>(null);
  const [filaDenuncias, setFilaDenuncias] = useState<FilaDenuncias | null>(null);
  const [pagina, setPagina] = useState(1);
  const [paginaDenuncias, setPaginaDenuncias] = useState(1);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoDenuncia>("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoriaDenuncia>("TODAS");
  const [denunciaSelecionada, setDenunciaSelecionada] = useState<DenunciaItemFila | null>(null);
  const [acaoSelecionada, setAcaoSelecionada] = useState<AcaoDenuncia | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [busy, setBusy] = useState(false);
  const sequencia = useRef(0);

  const tratarErro = useCallback((error: unknown) => {
    const status = error instanceof ApiError ? error.status : 0;
    if (status === 401 || status === 403 || status === 400) {
      setFila(null);
      setFilaDenuncias(null);
      setAcesso(status === 401 ? "anonymous" : "denied");
    }
    setErro(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
  }, []);

  const carregar = useCallback(async () => {
    const atual = ++sequencia.current;
    try {
      await verificarModerador();
      const [resMateriais, resDenuncias] = await Promise.all([
        listarPendentes(pagina),
        listarDenunciasPendentes(paginaDenuncias, filtroTipo, filtroCategoria),
      ]);
      if (atual !== sequencia.current) return;
      if (!resMateriais.items.length && pagina > 1) {
        setPagina(pagina - 1);
        return;
      }
      if (!resDenuncias.items.length && paginaDenuncias > 1) {
        setPaginaDenuncias(paginaDenuncias - 1);
        return;
      }
      setFila(resMateriais);
      setFilaDenuncias(resDenuncias);
      setAcesso("allowed");
      setErro("");
    } catch (error) {
      if (atual !== sequencia.current) return;
      setFila(null);
      setFilaDenuncias(null);
      setAcesso("error");
      tratarErro(error);
    }
  }, [pagina, paginaDenuncias, filtroTipo, filtroCategoria, tratarErro]);

  const invalidarConsultas = useCallback(() => {
    sequencia.current++;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void carregar(), 0);
    const sessaoAlterada = () => {
      setFila(null);
      setFilaDenuncias(null);
      setAcesso("loading");
      void carregar();
    };
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
    setBusy(true);
    setErro("");
    setAviso("");
    try {
      await decidirCuradoria(material.id, status, motivo);
      setAviso(`Material ${status === "APROVADO" ? "aprovado" : "recusado"}. Decisão registrada no histórico.`);
      await carregar();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await carregar();
        setAviso("Outro moderador já avaliou este material. A fila foi atualizada.");
      } else tratarErro(error);
    } finally {
      setBusy(false);
    }
  }

  async function baixar(material: MaterialPendente) {
    setBusy(true);
    setErro("");
    try {
      const arquivo = await baixarParaAnalise(material.id);
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = `material-${material.id}.${material.formato}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      tratarErro(error);
    } finally {
      setBusy(false);
    }
  }

  function solicitarAcaoDenuncia(denuncia: DenunciaItemFila, acao: AcaoDenuncia) {
    setErro("");
    setAviso("");
    setDenunciaSelecionada(denuncia);
    setAcaoSelecionada(acao);
  }

  function fecharModalDenuncia() {
    if (busy) return;
    setDenunciaSelecionada(null);
    setAcaoSelecionada(null);
  }

  async function confirmarDecisaoDenuncia(
    denuncia: DenunciaItemFila,
    acao: AcaoDenuncia,
    justificativa?: string,
  ) {
    setBusy(true);
    setErro("");
    setAviso("");
    try {
      const resultado = await decidirDenuncia(denuncia.id, acao, justificativa);
      setDenunciaSelecionada(null);
      setAcaoSelecionada(null);
      setAviso(
        acao === "EXCLUIR_CONTEUDO"
          ? `Conteúdo denunciado ocultado com sucesso (${resultado.denuncias_atualizadas} sinalização(ões) encerrada(s)).`
          : `Denúncia descartada como improcedente (${resultado.denuncias_atualizadas} sinalização(ões) encerrada(s)). Conteúdo restituído.`,
      );
      await carregar();
    } catch (error) {
      setDenunciaSelecionada(null);
      setAcaoSelecionada(null);
      if (error instanceof ApiError && error.status === 409) {
        await carregar();
        setAviso("Outro moderador já avaliou esta denúncia. A fila foi atualizada.");
      } else {
        tratarErro(error);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7FA] text-[#202124]">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold text-[#5B4BDB]">Área da equipe</p>
        <h1 className="mt-2 text-3xl font-bold">Painel de Moderação e Curadoria</h1>
        <p className="mt-3 text-gray-600">
          Revise os arquivos enviados pelos alunos (RN06) e avalie relatos ou comentários sinalizados pela comunidade na Central de Denúncias (RN04).
        </p>

        {acesso === "loading" && (
          <p role="status" className="mt-8">
            Verificando acesso e carregando a fila...
          </p>
        )}
        {acesso === "anonymous" && (
          <p className="mt-8">
            Faça{" "}
            <Link className="text-[#5B4BDB] underline" href="/login">
              login
            </Link>{" "}
            com uma conta de moderador ou administrador.
          </p>
        )}
        {acesso === "denied" && (
          <p role="alert" className="mt-8">
            Acesso restrito a moderadores e administradores.
          </p>
        )}

        {erro && (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
            {erro}
          </p>
        )}
        <p role="status" aria-live="polite" className="mt-4 text-sm text-[#5B4BDB]">
          {aviso}
        </p>

        {(acesso === "error" || acesso === "allowed") && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filas de moderação">
              <button
                type="button"
                role="tab"
                aria-selected={aba === "materiais"}
                onClick={() => setAba("materiais")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  aba === "materiais"
                    ? "bg-[#5B4BDB] text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                Curadoria de Materiais (RN06)
                {fila && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      aba === "materiais" ? "bg-white/20 text-white" : "bg-[#EDE9FD] text-[#5B4BDB]"
                    }`}
                  >
                    {fila.total}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={aba === "denuncias"}
                onClick={() => setAba("denuncias")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  aba === "denuncias"
                    ? "bg-[#5B4BDB] text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                Central de Denúncias (RN04)
                {filaDenuncias && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      aba === "denuncias" ? "bg-white/20 text-white" : "bg-[#EDE9FD] text-[#5B4BDB]"
                    }`}
                  >
                    {filaDenuncias.total}
                  </span>
                )}
              </button>
            </div>

            <Button variant="outline" disabled={busy} onClick={() => void carregar()}>
              Atualizar fila
            </Button>
          </div>
        )}

        {acesso === "allowed" && aba === "materiais" && fila && (
          <>
            <p className="my-5 text-sm text-gray-600">{fila.total} material(is) aguardando análise</p>
            {!fila.items.length && (
              <section className="rounded-2xl border border-gray-200 bg-white p-8">
                <h2 className="text-xl font-semibold">Nenhum material pendente</h2>
                <p className="mt-2 text-gray-600">Os novos envios aparecerão aqui.</p>
              </section>
            )}
            <div className="space-y-5" aria-busy={busy}>
              {fila.items.map((material) => (
                <ModerationCard
                  key={material.id}
                  material={material}
                  disabled={busy}
                  onDecision={decidir}
                  onDownload={baixar}
                />
              ))}
            </div>
            {fila.total > 0 && (
              <nav aria-label="Paginação da fila" className="mt-6 flex items-center justify-between gap-3">
                <Button variant="outline" disabled={busy || pagina === 1} onClick={() => setPagina(pagina - 1)}>
                  Anterior
                </Button>
                <span>
                  Página {pagina} de {Math.max(1, Math.ceil(fila.total / fila.tamanho_pagina))}
                </span>
                <Button
                  variant="outline"
                  disabled={busy || pagina * fila.tamanho_pagina >= fila.total}
                  onClick={() => setPagina(pagina + 1)}
                >
                  Próxima
                </Button>
              </nav>
            )}
          </>
        )}

        {acesso === "allowed" && aba === "denuncias" && filaDenuncias && (
          <>
            <div className="mt-5 rounded-2xl border border-[#D8D1FA] bg-[#EDE9FD]/60 p-4 text-sm text-[#202124]">
              <p className="font-semibold text-[#5B4BDB]">
                Diretriz RN04 — Proteção a Docentes e Conduta Ética
              </p>
              <p className="mt-1 text-xs sm:text-sm text-gray-700">
                Relatos com ataques pessoais, juízos depreciativos contra professores ou gabaritos de atividades vigentes devem ser excluídos. Denúncias improcedentes sobre relatos estritamente pedagógicos devem ser descartadas para preservar a colaboração discente.
              </p>
            </div>

            <div className="my-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                {filaDenuncias.total} denúncia(s) pendente(s) de revisão
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                  <span>Tipo:</span>
                  <select
                    aria-label="Filtrar por tipo de conteúdo denunciado"
                    value={filtroTipo}
                    disabled={busy}
                    onChange={(e) => {
                      setFiltroTipo(e.target.value as FiltroTipoDenuncia);
                      setPaginaDenuncias(1);
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-[#202124]"
                  >
                    <option value="TODOS">Todos os conteúdos</option>
                    <option value="COMENTARIO">Comentários e relatos</option>
                    <option value="MATERIAL">Materiais</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                  <span>Motivo:</span>
                  <select
                    aria-label="Filtrar por categoria da denúncia"
                    value={filtroCategoria}
                    disabled={busy}
                    onChange={(e) => {
                      setFiltroCategoria(e.target.value as FiltroCategoriaDenuncia);
                      setPaginaDenuncias(1);
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-[#202124]"
                  >
                    <option value="TODAS">Todas as categorias</option>
                    {Object.entries(ROTULOS_CATEGORIA_DENUNCIA).map(([chave, rotulo]) => (
                      <option key={chave} value={chave}>
                        {rotulo}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {!filaDenuncias.items.length && (
              <section className="rounded-2xl border border-gray-200 bg-white p-8">
                <h2 className="text-xl font-semibold">Nenhuma denúncia pendente</h2>
                <p className="mt-2 text-gray-600">
                  Não há relatos ou materiais sinalizados aguardando análise para os filtros selecionados.
                </p>
              </section>
            )}

            <div className="space-y-5" aria-busy={busy}>
              {filaDenuncias.items.map((denuncia) => (
                <DenunciaModerationCard
                  key={denuncia.id}
                  denuncia={denuncia}
                  disabled={busy}
                  onRequestAction={solicitarAcaoDenuncia}
                />
              ))}
            </div>

            {filaDenuncias.total > 0 && (
              <nav aria-label="Paginação de denúncias" className="mt-6 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={busy || paginaDenuncias === 1}
                  onClick={() => setPaginaDenuncias(paginaDenuncias - 1)}
                >
                  Anterior
                </Button>
                <span>
                  Página {paginaDenuncias} de{" "}
                  {Math.max(1, Math.ceil(filaDenuncias.total / filaDenuncias.tamanho_pagina))}
                </span>
                <Button
                  variant="outline"
                  disabled={
                    busy || paginaDenuncias * filaDenuncias.tamanho_pagina >= filaDenuncias.total
                  }
                  onClick={() => setPaginaDenuncias(paginaDenuncias + 1)}
                >
                  Próxima
                </Button>
              </nav>
            )}
          </>
        )}

        <ModerationActionModal
          key={`${denunciaSelecionada?.id ?? "none"}-${acaoSelecionada ?? "none"}`}
          isOpen={Boolean(denunciaSelecionada && acaoSelecionada)}
          denuncia={denunciaSelecionada}
          acao={acaoSelecionada}
          busy={busy}
          onClose={fecharModalDenuncia}
          onConfirm={confirmarDecisaoDenuncia}
        />
      </main>
      <Footer />
    </div>
  );
}
