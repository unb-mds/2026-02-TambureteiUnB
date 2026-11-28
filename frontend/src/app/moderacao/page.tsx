"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import BugReportsPanel from "@/components/BugReportsPanel";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import ModerationCard from "@/components/ModerationCard";
import CommentModerationCard from "@/components/CommentModerationCard";
import DenunciaModerationCard from "@/components/DenunciaModerationCard";
import PizzaModerationCard from "@/components/PizzaModerationCard";
import ModerationActionModal from "@/components/ModerationActionModal";
import MaterialPreviewModal, { type PreviewMaterialItem } from "@/components/MaterialPreviewModal";
import EditMaterialModal, { type EditMaterialTarget } from "@/components/EditMaterialModal";
import ReplaceMaterialFileModal, { type ReplaceMaterialTarget } from "@/components/ReplaceMaterialFileModal";
import { subscribeAuthChange } from "@/services/authService";
import { ApiError } from "@/services/httpClient";
import {
  ROTULOS_CATEGORIA_DENUNCIA,
  baixarArquivoDenuncia,
  baixarParaAnalise,
  decidirComentarioCuradoria,
  decidirCuradoria,
  decidirDenuncia,
  decidirPizzaModeracao,
  listarComentariosPendentes,
  listarDenunciasPendentes,
  listarPendentes,
  listarPizzasModeracao,
  verificarModerador,
} from "@/services/moderacaoService";
import type {
  AcaoDenuncia,
  ComentarioPendente,
  DecisaoComentarioCuradoria,
  DecisaoCuradoria,
  DecisaoPizzaPayload,
  DenunciaItemFila,
  FilaComentariosCuradoria,
  FilaCuradoria,
  FilaDenuncias,
  FilaPizzasModeracao,
  FiltroCategoriaDenuncia,
  FiltroSituacaoDenuncia,
  FiltroTipoDenuncia,
  MaterialPendente,
  PizzaModeracaoItem,
} from "@/types/moderacao";

type Acesso = "loading" | "allowed" | "anonymous" | "denied" | "error";
type AbaPainel = "materiais" | "comentarios" | "denuncias" | "pizzas" | "bugs";

function isDenunciaOcultadaPorLimiar(denuncia: DenunciaItemFila): boolean {
  return (
    denuncia.total_denuncias >= 3 ||
    denuncia.alvo.status_moderacao === "PENDENTE" ||
    denuncia.alvo.status_moderacao === "em_analise"
  );
}

export default function ModeracaoPage() {
  const router = useRouter();
  const [acesso, setAcesso] = useState<Acesso>("loading");
  const [aba, setAba] = useState<AbaPainel>("denuncias");
  const [fila, setFila] = useState<FilaCuradoria | null>(null);
  const [filaComentarios, setFilaComentarios] = useState<FilaComentariosCuradoria | null>(null);
  const [filaDenuncias, setFilaDenuncias] = useState<FilaDenuncias | null>(null);
  const [filaPizzas, setFilaPizzas] = useState<FilaPizzasModeracao | null>(null);
  const [pagina, setPagina] = useState(1);
  const [paginaComentarios, setPaginaComentarios] = useState(1);
  const [paginaDenuncias, setPaginaDenuncias] = useState(1);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoDenuncia>("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoriaDenuncia>("TODAS");
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacaoDenuncia>("TODOS");

  const [denunciaSelecionada, setDenunciaSelecionada] = useState<DenunciaItemFila | null>(null);
  const [acaoSelecionada, setAcaoSelecionada] = useState<AcaoDenuncia | null>(null);

  const [previewMaterial, setPreviewMaterial] = useState<PreviewMaterialItem | null>(null);
  const [previewCuradoriaTarget, setPreviewCuradoriaTarget] = useState<MaterialPendente | null>(null);
  const [previewMode, setPreviewMode] = useState<"curadoria" | "readonly">("curadoria");
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const previewOwnsBlobRef = useRef(false);

  const [replaceTarget, setReplaceTarget] = useState<ReplaceMaterialTarget | null>(null);
  const [replaceDownloadAction, setReplaceDownloadAction] = useState<(() => Promise<void>) | null>(null);
  const [materialFileVersion, setMaterialFileVersion] = useState(0);
  const [editMaterialTarget, setEditMaterialTarget] = useState<EditMaterialTarget | null>(null);

  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [busy, setBusy] = useState(false);
  const [semestresRecolhidos, setSemestresRecolhidos] = useState<Record<string, boolean>>({});
  const [gruposDenunciaRecolhidos, setGruposDenunciaRecolhidos] = useState<Record<string, boolean>>({});
  const sequencia = useRef(0);
  const previewSequence = useRef(0);

  function alternarSemestre(semestre: string) {
    setSemestresRecolhidos((prev) => ({
      ...prev,
      [semestre]: !prev[semestre],
    }));
  }

  function alternarGrupoDenuncia(chave: string) {
    setGruposDenunciaRecolhidos((prev) => ({
      ...prev,
      [chave]: !prev[chave],
    }));
  }

  const tratarErro = useCallback((error: unknown) => {
    const status = error instanceof ApiError ? error.status : 0;
    if (status === 401 || status === 403 || status === 400) {
      setFila(null);
      setFilaComentarios(null);
      setFilaDenuncias(null);
      setFilaPizzas(null);
      setAcesso(status === 401 ? "anonymous" : "denied");
    }
    setErro(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
  }, []);

  const carregar = useCallback(async () => {
    const atual = ++sequencia.current;
    try {
      await verificarModerador();
      const [resMateriais, resComentarios, resDenuncias, resPizzas] = await Promise.all([
        listarPendentes(pagina),
        listarComentariosPendentes(paginaComentarios),
        listarDenunciasPendentes(paginaDenuncias, filtroTipo, filtroCategoria, filtroSituacao),
        listarPizzasModeracao(),
      ]);
      if (atual !== sequencia.current) return;
      if (!resMateriais.items.length && pagina > 1) {
        setPagina(pagina - 1);
        return;
      }
      if (!resComentarios.items.length && paginaComentarios > 1) {
        setPaginaComentarios(paginaComentarios - 1);
        return;
      }
      if (!resDenuncias.items.length && paginaDenuncias > 1) {
        setPaginaDenuncias(paginaDenuncias - 1);
        return;
      }
      setFila(resMateriais);
      setFilaComentarios(resComentarios);
      setFilaDenuncias(resDenuncias);
      setFilaPizzas(resPizzas);
      setAcesso("allowed");
      setErro("");
    } catch (error) {
      if (atual !== sequencia.current) return;
      setFila(null);
      setFilaComentarios(null);
      setFilaDenuncias(null);
      setFilaPizzas(null);
      setAcesso("error");
      tratarErro(error);
    }
  }, [pagina, paginaComentarios, paginaDenuncias, filtroTipo, filtroCategoria, filtroSituacao, tratarErro]);

  const invalidarConsultas = useCallback(() => {
    sequencia.current++;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void carregar(), 0);
    const unsubscribe = subscribeAuthChange(() => {
      setFila(null);
      setFilaComentarios(null);
      setFilaDenuncias(null);
      setFilaPizzas(null);
      setAcesso("loading");
      void carregar();
    });
    return () => {
      window.clearTimeout(timer);
      invalidarConsultas();
      unsubscribe();
    };
  }, [carregar, invalidarConsultas]);

  useEffect(() => {
    if (acesso === "anonymous") {
      const timer = setTimeout(() => {
        router.push("/login?redirect=/moderacao");
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (acesso === "denied") {
      const timer = setTimeout(() => {
        router.push("/");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [acesso, router]);

  async function decidir(
    material: MaterialPendente,
    status: DecisaoCuradoria,
    motivo?: string,
    excluirArquivo = false,
  ) {
    setBusy(true);
    setErro("");
    setAviso("");
    try {
      await decidirCuradoria(material.id, status, motivo, excluirArquivo);
      if (status === "APROVADO") {
        setAviso("Material aprovado e estudante notificado. Decisão registrada no histórico.");
      } else if (excluirArquivo) {
        setAviso("Material recusado, arquivo removido do servidor e estudante notificado.");
      } else {
        setAviso("Material recusado e estudante notificado. O arquivo foi mantido para possível reenvio.");
      }
      await carregar();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await carregar();
        setAviso("Outro moderador já avaliou este material. A fila foi atualizada.");
      } else {
        tratarErro(error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function decidirComentario(
    comentario: ComentarioPendente,
    status: DecisaoComentarioCuradoria,
    motivo?: string,
  ) {
    setBusy(true);
    setErro("");
    setAviso("");
    try {
      await decidirComentarioCuradoria(comentario.id, status, motivo);
      setAviso(`Comentário ${status === "PUBLICADO" ? "publicado" : "ocultado"} com sucesso.`);
      await carregar();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await carregar();
        setAviso("Outro moderador já avaliou este comentário. A fila foi atualizada.");
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

  async function baixarDenuncia(denuncia: DenunciaItemFila) {
    if (denuncia.tipo_alvo !== "MATERIAL") return;
    setBusy(true);
    setErro("");
    try {
      const arquivo = await baixarArquivoDenuncia(denuncia.id);
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      const ext = denuncia.alvo.formato || "bin";
      link.download = `material-${denuncia.alvo.id}.${ext}`;
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

  function limparBlobPreview() {
    if (previewBlobUrl && previewOwnsBlobRef.current) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    previewOwnsBlobRef.current = false;
    setPreviewBlobUrl(null);
  }

  async function abrirPreview(material: MaterialPendente, preloadedUrl?: string) {
    const reqSeq = ++previewSequence.current;
    limparBlobPreview();
    setPreviewMode("curadoria");
    setPreviewCuradoriaTarget(material);
    setPreviewMaterial(material);
    setPreviewError("");

    if (preloadedUrl) {
      previewOwnsBlobRef.current = false;
      setPreviewBlobUrl(preloadedUrl);
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);
    try {
      const arquivo = await baixarParaAnalise(material.id);
      if (reqSeq !== previewSequence.current) {
        return;
      }
      const url = URL.createObjectURL(arquivo);
      previewOwnsBlobRef.current = true;
      setPreviewBlobUrl(url);
    } catch (error) {
      if (reqSeq !== previewSequence.current) {
        return;
      }
      setPreviewError(error instanceof Error ? error.message : "Falha ao carregar arquivo.");
    } finally {
      if (reqSeq === previewSequence.current) {
        setPreviewLoading(false);
      }
    }
  }

  async function abrirPreviewDenuncia(denuncia: DenunciaItemFila, preloadedUrl?: string) {
    if (denuncia.tipo_alvo !== "MATERIAL") return;
    const reqSeq = ++previewSequence.current;
    limparBlobPreview();
    setPreviewMode("readonly");
    setPreviewCuradoriaTarget(null);
    setPreviewMaterial({
      id: denuncia.alvo.id,
      titulo: denuncia.alvo.titulo || "Material denunciado",
      tipo: denuncia.alvo.topico_dificuldade || "ARQUIVO",
      formato: denuncia.alvo.formato ?? null,
      tamanho_bytes: null,
      disciplina: denuncia.alvo.disciplina,
    });
    setPreviewError("");

    if (preloadedUrl) {
      previewOwnsBlobRef.current = false;
      setPreviewBlobUrl(preloadedUrl);
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);
    try {
      const arquivo = await baixarArquivoDenuncia(denuncia.id);
      if (reqSeq !== previewSequence.current) {
        return;
      }
      const url = URL.createObjectURL(arquivo);
      previewOwnsBlobRef.current = true;
      setPreviewBlobUrl(url);
    } catch (error) {
      if (reqSeq !== previewSequence.current) {
        return;
      }
      setPreviewError(error instanceof Error ? error.message : "Falha ao carregar arquivo.");
    } finally {
      if (reqSeq === previewSequence.current) {
        setPreviewLoading(false);
      }
    }
  }

  function abrirPreviewPizza(item: PizzaModeracaoItem, imageUrl: string) {
    previewSequence.current++;
    limparBlobPreview();
    setPreviewMode("readonly");
    setPreviewCuradoriaTarget(null);
    const codigoTurmaFormatado = item.codigo_turma.toLowerCase().startsWith("turma")
      ? item.codigo_turma
      : `Turma ${item.codigo_turma}`;
    setPreviewMaterial({
      id: `pizza-${item.id}`,
      titulo: `Gráfico de Pizza — ${codigoTurmaFormatado} (${item.semestre_referencia})`,
      tipo: "PRINT DO SIGAA",
      formato: "png",
      disciplinaNome: `${item.disciplina_codigo} - ${item.disciplina_nome}`,
    });
    previewOwnsBlobRef.current = false;
    setPreviewBlobUrl(imageUrl);
    setPreviewLoading(false);
    setPreviewError("");
  }

  function fecharPreview() {
    previewSequence.current++;
    limparBlobPreview();
    setPreviewMaterial(null);
    setPreviewCuradoriaTarget(null);
  }

  function abrirSubstituirMaterialPendente(material: MaterialPendente) {
    setReplaceTarget({
      id: material.id,
      titulo: material.titulo,
      disciplinaNome: material.disciplina.nome,
      formato: material.formato,
    });
    setReplaceDownloadAction(() => () => baixar(material));
  }

  function abrirSubstituirMaterialDenuncia(denuncia: DenunciaItemFila) {
    if (denuncia.tipo_alvo !== "MATERIAL") return;
    setReplaceTarget({
      id: denuncia.alvo.id,
      titulo: denuncia.alvo.titulo || "Material denunciado",
      disciplinaNome: denuncia.alvo.disciplina.nome,
      formato: denuncia.alvo.formato,
    });
    setReplaceDownloadAction(() => () => baixarDenuncia(denuncia));
  }

  async function aoSubstituirArquivo() {
    setMaterialFileVersion((v) => v + 1);
    setAviso("Arquivo substituído com sucesso. O arquivo original foi removido do servidor.");
    await carregar();
  }

  function solicitarAcaoDenuncia(denuncia: DenunciaItemFila, acao: AcaoDenuncia) {
    setDenunciaSelecionada(denuncia);
    setAcaoSelecionada(acao);
  }

  function fecharModalDenuncia() {
    setDenunciaSelecionada(null);
    setAcaoSelecionada(null);
  }

  async function confirmarDecisaoDenuncia(
    denuncia: DenunciaItemFila,
    acao: AcaoDenuncia,
    justificativa?: string
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
      if (error instanceof ApiError && error.status === 409) {
        fecharModalDenuncia();
        await carregar();
        setAviso("Outro moderador já avaliou esta denúncia. A fila foi atualizada.");
      } else {
        tratarErro(error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function decidirPizza(id: number, payload: DecisaoPizzaPayload) {
    setBusy(true);
    setErro("");
    setAviso("");
    try {
      const resultado = await decidirPizzaModeracao(id, payload);
      setAviso(
        resultado.status === "CONSOLIDADA"
          ? `Estatísticas da turma consolidadas e publicadas (${resultado.doacoes_atualizadas} submissão(ões) confirmada(s)).`
          : `Submissão descartada (${resultado.doacoes_atualizadas} registro(s) encerrado(s)).`,
      );
      await carregar();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await carregar();
        setAviso(error.message || "A fila foi atualizada.");
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
        <h1 className="mt-2 text-3xl font-bold">Painel de Moderação Híbrida e Curadoria</h1>
        <p className="mt-3 text-gray-600">
          Revise os materiais e gráficos de pizza que aguardam inspeção humana e avalie conteúdos sinalizados na Central de Denúncias.
        </p>

        {acesso === "loading" && (
          <p role="status" className="mt-8 text-gray-600">
            Verificando acesso e carregando a fila...
          </p>
        )}
        {acesso === "anonymous" && (
          <div role="status" className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-lg font-bold">Autenticação necessária</h2>
            <p className="mt-1 text-sm">
              Você não está logado. Redirecionando para a página de login em instantes... ou clique em{" "}
              <Link className="font-semibold text-[#5B4BDB] underline" href="/login?redirect=/moderacao">
                fazer login agora
              </Link>.
            </p>
          </div>
        )}
        {acesso === "denied" && (
          <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
            <h2 className="text-lg font-bold">Acesso Restrito</h2>
            <p className="mt-1 text-sm">
              Esta área é exclusiva para moderadores e administradores. Redirecionando para a página inicial...
            </p>
          </div>
        )}

        {erro && (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
            {erro}
          </p>
        )}
        <p role="status" aria-live="polite" className="mt-4 text-sm font-semibold text-[#5B4BDB]">
          {aviso}
        </p>

        {(acesso === "error" || acesso === "allowed") && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filas de moderação">
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
                Central de Denúncias
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

              <button
                type="button"
                role="tab"
                aria-selected={aba === "pizzas"}
                onClick={() => setAba("pizzas")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  aba === "pizzas"
                    ? "bg-[#5B4BDB] text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                Gráficos de Pizza
                {filaPizzas && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      aba === "pizzas" ? "bg-white/20 text-white" : "bg-[#EDE9FD] text-[#5B4BDB]"
                    }`}
                  >
                    {filaPizzas.total_itens}
                  </span>
                )}
              </button>

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
                Curadoria de Materiais
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
                aria-selected={aba === "comentarios"}
                onClick={() => setAba("comentarios")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  aba === "comentarios"
                    ? "bg-[#5B4BDB] text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                Comentários Pendentes
                {filaComentarios && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      aba === "comentarios" ? "bg-white/20 text-white" : "bg-[#EDE9FD] text-[#5B4BDB]"
                    }`}
                  >
                    {filaComentarios.total}
                  </span>
                )}
              </button>
              <button type="button" role="tab" aria-selected={aba === "bugs"} onClick={() => setAba("bugs")} className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-semibold ${aba === "bugs" ? "bg-[#5B4BDB] text-white" : "border-gray-200 bg-white text-gray-700"}`}>Problemas do site</button>
            </div>

            {aba !== "bugs" && <Button variant="outline" disabled={busy} onClick={() => void carregar()}>
              Atualizar fila
            </Button>}
          </div>
        )}

        {acesso === "allowed" && aba === "bugs" && <BugReportsPanel />}

        {acesso === "allowed" && aba === "materiais" && fila && (
          <>
            <p className="my-5 text-sm text-gray-600">{fila.total} material(is) aguardando análise</p>
            {!fila.items.length && (
              <section className="rounded-2xl border border-gray-200 bg-white p-8">
                <h2 className="text-xl font-semibold">Nenhum material pendente</h2>
                <p className="mt-2 text-gray-600">Os novos envios escalonados para curadoria humana aparecerão aqui.</p>
              </section>
            )}
            <div className="space-y-5" aria-busy={busy}>
              {fila.items.map((material) => (
                <ModerationCard
                  key={material.id}
                  material={material}
                  disabled={busy}
                  fileVersion={materialFileVersion}
                  onDecision={decidir}
                  onDownload={baixar}
                  onPreview={abrirPreview}
                  onReplaceFile={abrirSubstituirMaterialPendente}
                  onEdit={(item) =>
                    setEditMaterialTarget({
                      id: item.id,
                      titulo: item.titulo,
                      tipo: item.tipo,
                      url_origem: item.url_origem,
                      status_curadoria: "PENDENTE",
                    })
                  }
                />
              ))}
            </div>

            {fila.total > 0 && (
              <nav aria-label="Paginação da fila de materiais" className="mt-6 flex items-center justify-between gap-3">
                <Button variant="outline" disabled={busy || pagina === 1} onClick={() => setPagina(pagina - 1)}>
                  Anterior
                </Button>
                <span className="text-sm font-medium">
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

        {acesso === "allowed" && aba === "comentarios" && filaComentarios && (
          <>
            <p className="my-5 text-sm text-gray-600">{filaComentarios.total} comentário(s) aguardando análise</p>
            {!filaComentarios.items.length && (
              <section className="rounded-2xl border border-gray-200 bg-white p-8">
                <h2 className="text-xl font-semibold">Nenhum comentário pendente</h2>
                <p className="mt-2 text-gray-600">Os comentários retidos pela triagem automática aparecerão aqui.</p>
              </section>
            )}
            <div className="space-y-5" aria-busy={busy}>
              {filaComentarios.items.map((comentario) => (
                <CommentModerationCard
                  key={comentario.id}
                  comentario={comentario}
                  disabled={busy}
                  onDecision={decidirComentario}
                />
              ))}
            </div>
            {filaComentarios.total > 0 && (
              <nav aria-label="Paginação da fila de comentários" className="mt-6 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={busy || paginaComentarios === 1}
                  onClick={() => setPaginaComentarios(paginaComentarios - 1)}
                >
                  Anterior
                </Button>
                <span>
                  Página {paginaComentarios} de{" "}
                  {Math.max(1, Math.ceil(filaComentarios.total / filaComentarios.tamanho_pagina))}
                </span>
                <Button
                  variant="outline"
                  disabled={busy || paginaComentarios * filaComentarios.tamanho_pagina >= filaComentarios.total}
                  onClick={() => setPaginaComentarios(paginaComentarios + 1)}
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
                Proteção a Docentes e Conduta Ética
              </p>
              <p className="mt-1 text-xs sm:text-sm text-gray-700">
                Relatos com ataques pessoais, juízos depreciativos contra professores ou gabaritos de atividades vigentes devem ser excluídos. Denúncias improcedentes sobre relatos estritamente pedagógicos devem ser descartadas para preservar a colaboração discente.
              </p>
            </div>
            
            <div className="my-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-gray-600">{filaDenuncias.total} denúncia(s) pendente(s) de revisão</p>

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

                <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                  <span>Situação:</span>
                  <select
                    aria-label="Filtrar por situação da denúncia"
                    value={filtroSituacao}
                    disabled={busy}
                    onChange={(e) => {
                      setFiltroSituacao(e.target.value as FiltroSituacaoDenuncia);
                      setPaginaDenuncias(1);
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-[#202124]"
                  >
                    <option value="TODOS">Todas as situações</option>
                    <option value="OCULTADOS">Ocultados por denúncias (3+)</option>
                    <option value="ABAIXO_LIMIAR">Denúncias únicas ou abaixo de 3</option>
                  </select>
                </label>
              </div>
            </div>

            {!filaDenuncias.items.length && (
              <section className="rounded-2xl border border-gray-200 bg-white p-8">
                <h2 className="text-xl font-semibold">Nenhuma denúncia pendente</h2>
                <p className="mt-2 text-gray-600">Não há denúncias aguardando análise para os filtros selecionados.</p>
              </section>
            )}

            {filaDenuncias.items.length > 0 && (() => {
              const denunciasOcultadas = filaDenuncias.items.filter(isDenunciaOcultadaPorLimiar);
              const denunciasAbaixoLimiar = filaDenuncias.items.filter((d) => !isDenunciaOcultadaPorLimiar(d));
              const grupos = [
                {
                  chave: "ocultados",
                  titulo: "Ocultados por denúncias (3 ou mais)",
                  subtitulo: "Conteúdos retidos preventivamente após atingir o limiar de 3 denúncias.",
                  itens: denunciasOcultadas,
                  badgeClass: "bg-red-50 text-red-800 border border-red-200",
                },
                {
                  chave: "abaixo_limiar",
                  titulo: "Denúncias únicas ou abaixo de 3",
                  subtitulo: "Conteúdos ainda visíveis com 1 ou 2 sinalizações da comunidade.",
                  itens: denunciasAbaixoLimiar,
                  badgeClass: "bg-amber-50 text-amber-800 border border-amber-200",
                },
              ].filter((grupo) => grupo.itens.length > 0);

              return (
                <div className="space-y-6" aria-busy={busy}>
                  {grupos.map((grupo) => {
                    const recolhido = Boolean(gruposDenunciaRecolhidos[grupo.chave]);
                    return (
                      <section
                        key={grupo.chave}
                        aria-label={grupo.titulo}
                        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4"
                      >
                        <button
                          type="button"
                          aria-expanded={!recolhido}
                          onClick={() => alternarGrupoDenuncia(grupo.chave)}
                          className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <svg
                              className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${
                                recolhido ? "-rotate-90" : "rotate-0"
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                            <div>
                              <h2 className="text-lg font-bold text-[var(--foreground)]">
                                {grupo.titulo}
                              </h2>
                              <p className="text-xs text-[var(--text-muted)]">{grupo.subtitulo}</p>
                            </div>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${grupo.badgeClass}`}>
                            {grupo.itens.length} denúncia(s)
                          </span>
                        </button>

                        {!recolhido && (
                          <div className="mt-4 space-y-4 border-t border-[var(--border-subtle)] pt-4">
                            {grupo.itens.map((denuncia) => (
                              <DenunciaModerationCard
                                key={denuncia.id}
                                denuncia={denuncia}
                                disabled={busy}
                                fileVersion={materialFileVersion}
                                onRequestAction={solicitarAcaoDenuncia}
                                onPreviewMaterial={abrirPreviewDenuncia}
                                onDownloadMaterial={baixarDenuncia}
                                onReplaceMaterialFile={abrirSubstituirMaterialDenuncia}
                              />
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              );
            })()}

            {filaDenuncias.total > 0 && (
              <nav aria-label="Paginação de denúncias" className="mt-6 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={busy || paginaDenuncias === 1}
                  onClick={() => setPaginaDenuncias(paginaDenuncias - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm font-medium">
                  Página {paginaDenuncias} de{" "}
                  {Math.max(1, Math.ceil(filaDenuncias.total / filaDenuncias.tamanho_pagina))}
                </span>
                <Button
                  variant="outline"
                  disabled={busy || paginaDenuncias * filaDenuncias.tamanho_pagina >= filaDenuncias.total}
                  onClick={() => setPaginaDenuncias(paginaDenuncias + 1)}
                >
                  Próxima
                </Button>
              </nav>
            )}
          </>
        )}

        {acesso === "allowed" && aba === "pizzas" && filaPizzas && (
          <>
            <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--primary-soft)] p-4 text-sm text-[var(--foreground)]">
              <p className="font-semibold text-[var(--primary-text)]">
                Curadoria Humana de Gráficos de Pizza (Sem LLM)
              </p>
              <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
                Submissões com print do SIGAA e formulários manuais agrupados por semestre podem ser aprovados ou recusados diretamente pela moderação. Envios manuais sem imagem recebem selo verde visual ao atingir pelo menos 5 outros formulários idênticos.
              </p>
            </div>

            <p className="my-5 text-sm text-[var(--text-muted)]">
              {filaPizzas.total_itens} item(ns) para revisão ({filaPizzas.total_envios_pendentes} envio(s) pendente(s) no total), agrupados por semestre
            </p>

            {!filaPizzas.grupos_semestre.length && (
              <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-8">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Nenhum gráfico de pizza pendente</h2>
                <p className="mt-2 text-[var(--text-muted)]">
                  Novas submissões com print ou formulários manuais enviados pelos estudantes aparecerão aqui agrupados por semestre.
                </p>
              </section>
            )}

            <div className="space-y-6" aria-busy={busy}>
              {filaPizzas.grupos_semestre.map((grupo) => {
                const recolhido = Boolean(semestresRecolhidos[grupo.semestre]);
                return (
                  <section
                    key={grupo.semestre}
                    aria-label={`Semestre ${grupo.semestre}`}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4"
                  >
                    <button
                      type="button"
                      aria-expanded={!recolhido}
                      onClick={() => alternarSemestre(grupo.semestre)}
                      className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <svg
                          className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${
                            recolhido ? "-rotate-90" : "rotate-0"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        <h2 className="text-lg font-bold text-[var(--foreground)]">
                          Semestre {grupo.semestre}
                        </h2>
                      </div>
                      <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary-text)]">
                        {grupo.total} solicitação(ões)
                      </span>
                    </button>

                    {!recolhido && (
                      <div className="mt-4 space-y-4 border-t border-[var(--border-subtle)] pt-4">
                        {grupo.itens.map((item) => (
                          <PizzaModerationCard
                            key={item.id}
                            item={item}
                            disabled={busy}
                            onDecision={decidirPizza}
                            onPreviewImage={abrirPreviewPizza}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}

        <MaterialPreviewModal
          isOpen={Boolean(previewMaterial)}
          material={previewMaterial}
          blobUrl={previewBlobUrl}
          loading={previewLoading}
          error={previewError}
          onClose={fecharPreview}
          onApprove={
            previewMode === "curadoria" && previewCuradoriaTarget
              ? () => decidir(previewCuradoriaTarget, "APROVADO")
              : undefined
          }
          onReject={
            previewMode === "curadoria" && previewCuradoriaTarget
              ? (_m, motivo, excluirArquivo) =>
                  decidir(previewCuradoriaTarget, "RECUSADO", motivo, Boolean(excluirArquivo))
              : undefined
          }
        />

        <ReplaceMaterialFileModal
          isOpen={Boolean(replaceTarget)}
          material={replaceTarget}
          onClose={() => {
            setReplaceTarget(null);
            setReplaceDownloadAction(null);
          }}
          onDownloadCurrent={replaceDownloadAction ?? undefined}
          onReplaced={aoSubstituirArquivo}
        />

        <EditMaterialModal
          isOpen={Boolean(editMaterialTarget)}
          material={editMaterialTarget}
          onClose={() => setEditMaterialTarget(null)}
          onSaved={async () => {
            setAviso("Título e categoria do material atualizados com sucesso.");
            await carregar();
          }}
        />

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