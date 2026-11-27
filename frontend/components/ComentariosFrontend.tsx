"use client";

import React, { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { getStoredUser, isAuthenticated, subscribeAuthChange } from "@/services/authService";
import { request } from "@/services/httpClient";
import {
  criarDenuncia,
  getTriageBannerClasses,
  iniciarPollingStatusComentario,
  podeModerar,
  ROTULOS_CATEGORIA_DENUNCIA,
  validarMotivoDenuncia,
  type AvisoTriagemComentario,
} from "@/services/moderacaoService";
import type { CategoriaDenuncia } from "@/types/moderacao";

export interface CommentItem {
  id: string;
  authorAlias: string;
  isAnonymous: boolean;
  content: string;
  createdAt: string;
  upvotes: number;
  isLikedByMe: boolean;
  isMine?: boolean;
  edited?: boolean;
  parentId?: string | null;
  replies?: CommentItem[];
}

export type Comment = CommentItem;

interface BackendCommentItem {
  id: number | string;
  autor_alias?: string;
  conteudo: string;
  created_at?: string;
  updated_at?: string | null;
  editado?: boolean;
  is_mine?: boolean;
  parent_id?: number | string | null;
  upvotes?: number;
  liked_by_me?: boolean;
}

interface BackendCommentResponse {
  items?: BackendCommentItem[];
  total?: number;
}

interface ComentariosFrontendProps {
  disciplineName: string;
  disciplineCode?: string;
  disciplineId?: number;
}

export default function ComentariosFrontend({
  disciplineName,
  disciplineCode,
  disciplineId,
}: ComentariosFrontendProps) {
  const authenticated = useSyncExternalStore(
    subscribeAuthChange,
    isAuthenticated,
    () => false
  );
  const isModerator = useSyncExternalStore(
    subscribeAuthChange,
    () => {
      const user = getStoredUser();
      return Boolean(user && podeModerar(user.role));
    },
    () => false
  );
  const storedUser = authenticated ? getStoredUser() : null;
  const displayAuthorName = storedUser?.nome?.trim() || "Estudante UnB";

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [triageNotice, setTriageNotice] = useState<AvisoTriagemComentario | null>(null);
  const [replyNotice, setReplyNotice] = useState<(AvisoTriagemComentario & { parentId: string }) | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editCommentError, setEditCommentError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletingComment, setDeletingComment] = useState<CommentItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [reportingComment, setReportingComment] = useState<CommentItem | null>(null);
  const [reportCategory, setReportCategory] = useState<CategoriaDenuncia>("OFENSA_DOCENTE");
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportFeedback, setReportFeedback] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const MAX_CHARS = 500;
  const MIN_CHARS = 10;
  const isMainLengthValid = newCommentText.length >= MIN_CHARS && newCommentText.length <= MAX_CHARS;
  const isReplyLengthValid = replyText.length >= MIN_CHARS && replyText.length <= MAX_CHARS;

  const pollCancelRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  const fetchComments = useCallback(async (): Promise<CommentItem[]> => {
    const identifier = disciplineId || disciplineCode;
    if (!identifier) {
      return [];
    }

    try {
      const response = await request<BackendCommentResponse | BackendCommentItem[]>(
        `/cadeiras/${identifier}/comentarios?excluir_dificuldades=true&size=100`,
        { cache: "no-store" }
      );

      const rawItems: BackendCommentItem[] = Array.isArray(response)
        ? response
        : response?.items || [];

      const mapped: CommentItem[] = rawItems.map((item) => ({
        id: String(item.id),
        authorAlias: item.autor_alias || "Estudante Anônimo",
        isAnonymous:
          !item.autor_alias ||
          item.autor_alias.toLowerCase().includes("anonim") ||
          item.autor_alias.toLowerCase().includes("anônim"),
        content: item.conteudo,
        createdAt: item.created_at
          ? new Date(item.created_at).toLocaleDateString("pt-BR")
          : "Recente",
        upvotes: item.upvotes || 0,
        isLikedByMe: Boolean(item.liked_by_me),
        isMine: Boolean(item.is_mine),
        edited: Boolean(item.editado || item.updated_at),
        parentId: item.parent_id ? String(item.parent_id) : null,
        replies: [],
      }));

      const roots: CommentItem[] = [];
      const lookup = new Map<string, CommentItem>();

      mapped.forEach((c) => lookup.set(c.id, { ...c, replies: [] }));

      mapped.forEach((c) => {
        if (c.parentId && lookup.has(c.parentId)) {
          lookup.get(c.parentId)!.replies!.push(lookup.get(c.id)!);
        } else {
          roots.push(lookup.get(c.id)!);
        }
      });

      if (isMountedRef.current) {
        setComments(roots);
      }
      return mapped;
    } catch (err) {
      console.error("Erro ao carregar comentarios:", err);
      return [];
    }
  }, [disciplineId, disciplineCode]);

  useEffect(() => {
    isMountedRef.current = true;

    async function loadInitial() {
      await fetchComments();
      if (isMountedRef.current) {
        setLoading(false);
      }
    }

    void loadInitial();

    return () => {
      isMountedRef.current = false;
      if (pollCancelRef.current) {
        pollCancelRef.current();
        pollCancelRef.current = null;
      }
    };
  }, [fetchComments, authenticated]);

  const toggleExpand = (commentId: string) => {
    setExpandedThreads((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const findCommentById = (
    list: CommentItem[],
    commentId: string
  ): CommentItem | null => {
    for (const item of list) {
      if (item.id === commentId) return item;
      if (item.replies && item.replies.length > 0) {
        const nested = findCommentById(item.replies, commentId);
        if (nested) return nested;
      }
    }
    return null;
  };

  const handleToggleUpvote = async (commentId: string) => {
    if (!authenticated || !isAuthenticated()) {
      return;
    }

    const previous = findCommentById(comments, commentId);
    if (!previous) return;

    const updateRecursive = (
      list: CommentItem[],
      nextState?: { upvotes: number; isLikedByMe: boolean }
    ): CommentItem[] => {
      return list.map((item) => {
        if (item.id === commentId) {
          if (nextState) {
            return { ...item, ...nextState };
          }
          const willLike = !item.isLikedByMe;
          return {
            ...item,
            isLikedByMe: willLike,
            upvotes: Math.max(0, willLike ? item.upvotes + 1 : item.upvotes - 1),
          };
        }
        if (item.replies && item.replies.length > 0) {
          return { ...item, replies: updateRecursive(item.replies, nextState) };
        }
        return item;
      });
    };

    setComments((prev) => updateRecursive(prev));

    const numericId = Number(commentId);
    if (!Number.isSafeInteger(numericId) || numericId <= 0) {
      return;
    }

    try {
      const synced = await request<{
        comentario_id: number;
        upvotes: number;
        liked_by_me: boolean;
      }>(`/comentarios/${numericId}/voto`, {
        method: "POST",
      });
      if (!isMountedRef.current) return;
      setComments((prev) =>
        updateRecursive(prev, {
          upvotes: synced.upvotes,
          isLikedByMe: synced.liked_by_me,
        })
      );
    } catch {
      if (!isMountedRef.current) return;
      setComments((prev) =>
        updateRecursive(prev, {
          upvotes: previous.upvotes,
          isLikedByMe: previous.isLikedByMe,
        })
      );
    }
  };

  const startTriagePolling = useCallback(
    (createdId: string, contexto: "relato" | "resposta", replyParentId?: string) => {
      if (pollCancelRef.current) {
        pollCancelRef.current();
        pollCancelRef.current = null;
      }

      const aplicarAviso = (aviso: AvisoTriagemComentario) => {
        if (!isMountedRef.current) return;
        setTriageNotice(aviso);
        if (replyParentId) {
          setReplyNotice({ ...aviso, parentId: replyParentId });
        }
        pollCancelRef.current = null;
      };

      const numericId = Number(createdId);
      if (Number.isSafeInteger(numericId) && numericId > 0) {
        pollCancelRef.current = iniciarPollingStatusComentario({
          commentId: numericId,
          contexto,
          onApproved: async () => {
            await fetchComments();
          },
          onFallbackCheckPublished: async () => {
            const items = await fetchComments();
            return items.some((item) => item.id === createdId);
          },
          onStatus: aplicarAviso,
        });
      }
    },
    [fetchComments]
  );

  const handleMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReplyNotice(null);
    if (!authenticated || !isAuthenticated()) {
      setTriageNotice({
        kind: "error",
        text: "Faça login com sua conta de estudante para publicar comentários.",
      });
      return;
    }
    if (!isMainLengthValid) return;

    const currentUser = getStoredUser();
    const authorName = currentUser?.nome?.trim() || "Estudante UnB";

    const newComment: CommentItem = {
      id: Date.now().toString(),
      authorAlias: isAnonymous ? "Estudante Anônimo" : authorName,
      isAnonymous,
      content: newCommentText.trim(),
      createdAt: "agora mesmo",
      upvotes: 0,
      isLikedByMe: false,
      replies: [],
    };

    setNewCommentText("");
    setTriageNotice(null);

    try {
      const targetId = disciplineId || 1;
      const created = await request<{ id?: number | string; status_moderacao?: string }>("/comentarios", {
        method: "POST",
        body: JSON.stringify({
          disciplina_id: targetId,
          conteudo: newComment.content,
          autor_alias: newComment.authorAlias,
        }),
      });

      const createdId = created?.id != null ? String(created.id) : null;
      if (created?.status_moderacao === "PUBLICADO") {
        await fetchComments();
        if (!isMountedRef.current) return;
        setTriageNotice({
          kind: "approved",
          text: "[PUBLICADO] Seu relato foi publicado e já está visível abaixo.",
        });
      } else if (createdId) {
        setTriageNotice({
          kind: "pending",
          text: "[AGUARDANDO REVISAO] Seu relato foi enviado para análise da moderação.",
        });
        startTriagePolling(createdId, "relato");
      }
    } catch (err) {
      setNewCommentText(newComment.content);
      setTriageNotice({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Não foi possível publicar o comentário. Verifique se sua sessão está ativa.",
      });
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!authenticated || !isAuthenticated()) {
      const aviso: AvisoTriagemComentario = {
        kind: "error",
        text: "Faça login com sua conta de estudante para responder comentários.",
      };
      setTriageNotice(aviso);
      setReplyNotice({ ...aviso, parentId });
      return;
    }
    if (!isReplyLengthValid) return;

    const currentUser = getStoredUser();
    const authorName = currentUser?.nome?.trim() || "Estudante UnB";

    const newReply: CommentItem = {
      id: Date.now().toString(),
      authorAlias: isAnonymous ? "Estudante Anônimo" : authorName,
      isAnonymous,
      content: replyText.trim(),
      createdAt: "agora mesmo",
      upvotes: 0,
      isLikedByMe: false,
      parentId,
      replies: [],
    };

    try {
      const targetId = disciplineId || 1;
      const created = await request<{ id?: number | string; status_moderacao?: string }>("/comentarios", {
        method: "POST",
        body: JSON.stringify({
          disciplina_id: targetId,
          conteudo: newReply.content,
          autor_alias: newReply.authorAlias,
          parent_id: Number(parentId) || null,
        }),
      });

      setExpandedThreads((prev) => ({ ...prev, [parentId]: true }));
      setReplyingToId(null);
      setReplyText("");

      const createdId = created?.id != null ? String(created.id) : null;
      if (created?.status_moderacao === "PUBLICADO") {
        await fetchComments();
        if (!isMountedRef.current) return;
        const approvedNotice: AvisoTriagemComentario = {
          kind: "approved",
          text: "[PUBLICADO] Sua resposta foi publicada e já está visível abaixo.",
        };
        setTriageNotice(approvedNotice);
        setReplyNotice({ ...approvedNotice, parentId });
      } else if (createdId) {
        const pendingNotice: AvisoTriagemComentario = {
          kind: "pending",
          text: "[AGUARDANDO REVISAO] Sua resposta foi enviada para análise da moderação.",
        };
        setTriageNotice(pendingNotice);
        setReplyNotice({ ...pendingNotice, parentId });
        startTriagePolling(createdId, "resposta", parentId);
      }
    } catch (err) {
      const errorNotice: AvisoTriagemComentario = {
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Não foi possível enviar a resposta. Verifique se sua sessão está ativa.",
      };
      setTriageNotice(errorNotice);
      setReplyNotice({ ...errorNotice, parentId });
    }
  };

  const handleStartEdit = (target: CommentItem) => {
    setEditingCommentId(target.id);
    setEditCommentText(target.content);
    setEditCommentError("");
  };

  const handleSaveEdit = async (targetId: string) => {
    const clean = editCommentText.trim();
    if (clean.length < MIN_CHARS || clean.length > MAX_CHARS) {
      setEditCommentError(`O texto deve ter entre ${MIN_CHARS} e ${MAX_CHARS} caracteres.`);
      return;
    }
    const numericId = Number(targetId);
    if (!Number.isSafeInteger(numericId) || numericId <= 0) return;

    setEditSubmitting(true);
    setEditCommentError("");
    try {
      await request<BackendCommentItem>(`/comentarios/${numericId}`, {
        method: "PATCH",
        body: JSON.stringify({ conteudo: clean }),
      });
      setEditingCommentId(null);
      setEditCommentText("");
      await fetchComments();
      if (isMountedRef.current) {
        setTriageNotice({
          kind: "approved",
          text: "Comentário atualizado com sucesso.",
        });
      }
    } catch (err) {
      setEditCommentError(
        err instanceof Error ? err.message : "Não foi possível salvar a edição."
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingComment) return;
    const numericId = Number(deletingComment.id);
    if (!Number.isSafeInteger(numericId) || numericId <= 0) {
      setDeletingComment(null);
      return;
    }
    setDeleteSubmitting(true);
    try {
      await request<void>(`/comentarios/${numericId}`, { method: "DELETE" });
      setDeletingComment(null);
      await fetchComments();
      if (isMountedRef.current) {
        setTriageNotice({
          kind: "approved",
          text: "Comentário apagado com sucesso.",
        });
      }
    } catch (err) {
      setDeletingComment(null);
      setTriageNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Não foi possível apagar o comentário.",
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleOpenReportModal = (comment: Comment) => {
    if (!authenticated || !isAuthenticated()) {
      return;
    }
    setReportingComment(comment);
    setReportCategory("OFENSA_DOCENTE");
    setReportReason("");
    setReportError("");
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingComment) return;
    if (!authenticated || !isAuthenticated()) {
      setReportError("Faça login com sua conta de estudante para enviar denúncias.");
      return;
    }

    const validacao = validarMotivoDenuncia(reportReason);
    if (!validacao.valido) {
      setReportError(validacao.erro || "Informe um motivo válido.");
      return;
    }

    setReportSubmitting(true);
    setReportError("");
    try {
      const numericId = Number(reportingComment.id);
      if (Number.isFinite(numericId) && numericId > 0) {
        const res = await criarDenuncia({
          comentario_id: numericId,
          categoria: reportCategory,
          motivo: reportReason,
        });
        if (res.ocultado_automaticamente) {
          setComments((prev) => prev.filter((item) => item.id !== reportingComment.id));
        }
      }
      setReportingComment(null);
      setReportFeedback("Denúncia registrada e encaminhada para revisão da equipe de moderação.");
    } catch (error) {
      setReportError(
        error instanceof Error ? error.message : "Não foi possível enviar a denúncia no momento."
      );
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <section className="mt-8 rounded-3xl bg-white p-6 sm:p-8 border border-[#E8E6F8] shadow-xs">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDE9FD] text-[#5B4BDB]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M17 9.5a6.5 6.5 0 0 1-9.5 5.7L3.5 16.5l1.3-4A6.5 6.5 0 1 1 17 9.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#202124]">
              Comunidade & Discussões
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Dicas de estudo, relatos e duvidas sobre {disciplineName}
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto rounded-full bg-[#EDE9FD] px-3 py-1 text-xs font-semibold text-[#5B4BDB]">
          {comments.length} relatos compartilhados
        </span>
      </div>

      {reportFeedback && (
        <div role="status" className="mb-6 rounded-2xl border border-[#D8D1FA] bg-[#EDE9FD] px-4 py-3 text-xs sm:text-sm text-[#5B4BDB]">
          {reportFeedback}
        </div>
      )}

      <form
        onSubmit={handleMainSubmit}
        aria-label={`Publicar relato ou duvida sobre ${disciplineName}`}
        className="mb-8 rounded-2xl bg-[#FAFAFC] p-4 sm:p-5 border border-[#ECEAF5]"
      >
        {!authenticated && (
          <div
            role="status"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D8D1FA] bg-[#EDE9FD] px-4 py-3 text-xs sm:text-sm text-[#5B4BDB]"
          >
            <span>
              Apenas estudantes autenticados podem publicar ou responder comentários.
            </span>
            <Link
              href="/login"
              className="rounded-lg bg-[#5B4BDB] px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all"
            >
              Fazer login
            </Link>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <label
            htmlFor="novo-relato-disciplina"
            className="text-xs font-bold uppercase tracking-wider text-gray-500"
          >
            Deixar um relato ou duvida
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!authenticated}
              onClick={() => setIsAnonymous(false)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                !authenticated
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-70"
                  : !isAnonymous
                  ? "bg-[#5B4BDB] text-white shadow-2xs cursor-pointer"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
              }`}
            >
              Postar como {authenticated ? displayAuthorName : "seu usuário"}
            </button>
            <button
              type="button"
              disabled={!authenticated}
              onClick={() => setIsAnonymous(true)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                !authenticated
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-70"
                  : isAnonymous
                  ? "bg-[#5B4BDB] text-white shadow-2xs cursor-pointer"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
              }`}
            >
              Anonimo
            </button>
          </div>
        </div>

        <textarea
          id="novo-relato-disciplina"
          rows={3}
          disabled={!authenticated}
          value={newCommentText}
          onChange={(e) => {
            setNewCommentText(e.target.value);
            if (triageNotice) setTriageNotice(null);
          }}
          aria-label={`Relato ou duvida sobre ${disciplineName}`}
          aria-describedby="conduta-etica-rn04 contador-caracteres-relato"
          placeholder={
            authenticated
              ? "Compartilhe dicas sobre as provas, listas de exercicios ou tire uma duvida sobre a materia..."
              : "Faça login para compartilhar dicas, relatos ou dúvidas sobre esta disciplina..."
          }
          className={`w-full resize-none rounded-xl bg-white border border-[#DDD9F1] p-3 text-xs sm:text-sm text-[#202124] placeholder-gray-400 outline-none focus:border-[#5B4BDB] focus:ring-1 focus:ring-[#5B4BDB] ${
            !authenticated ? "cursor-not-allowed opacity-70" : ""
          }`}
        />

        <p id="conduta-etica-rn04" className="mt-2 text-[11px] text-gray-500">
          Conduta ética: concentre seu relato na ementa, metodologia e dificuldades técnicas da matéria. Ataques pessoais a docentes são vedados.
        </p>

        {triageNotice && (
          <p
            role={triageNotice.kind === "rejected" || triageNotice.kind === "error" ? "alert" : "status"}
            className={`mt-3 rounded-xl border p-3 text-xs font-medium ${getTriageBannerClasses(triageNotice.kind)}`}
          >
            {triageNotice.text}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span
            id="contador-caracteres-relato"
            aria-live="polite"
            className={`text-xs ${
              newCommentText.length > MAX_CHARS
                ? "text-red-500 font-bold"
                : newCommentText.length < MIN_CHARS && newCommentText.length > 0
                ? "text-amber-500"
                : "text-gray-400"
            }`}
          >
            {newCommentText.length} / {MAX_CHARS} caracteres
            {newCommentText.length > 0 && newCommentText.length < MIN_CHARS && " (minimo de 10 caracteres)"}
          </span>

          <button
            type="submit"
            disabled={!authenticated || !isMainLengthValid}
            className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-xs ${
              authenticated && isMainLengthValid
                ? "bg-[#5B4BDB] hover:brightness-110 active:scale-95 cursor-pointer"
                : "bg-gray-300 cursor-not-allowed opacity-60"
            }`}
          >
            {authenticated ? "Publicar Comentario" : "Faça login para comentar"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">
          Carregando relatos da comunidade...
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          Nenhum relato compartilhado ainda. Seja o primeiro a enviar!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((comment) => {
            const hasReplies = comment.replies && comment.replies.length > 0;
            const isExpanded = expandedThreads[comment.id] ?? true;

            return (
              <div
                key={comment.id}
                className="flex flex-col gap-3 rounded-2xl bg-white p-5 border border-[#EDE9FD] transition-all hover:border-[#D8D1FA]"
              >
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDE9FD] text-[#5B4BDB] text-xs font-bold">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-[#202124]">
                        {comment.authorAlias}
                      </span>
                      <span className="text-[11px] text-gray-400 ml-2">
                        - {comment.createdAt}
                      </span>
                      {comment.edited && (
                        <span className="ml-1.5 text-[11px] italic text-gray-400">
                          (editado)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!authenticated}
                      title={!authenticated ? "Faça login para responder comentários" : undefined}
                      onClick={() => {
                        if (!authenticated) return;
                        setReplyingToId(replyingToId === comment.id ? null : comment.id);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                        authenticated
                          ? "text-[#5B4BDB] hover:bg-[#EDE9FD] cursor-pointer"
                          : "text-gray-400 cursor-not-allowed opacity-60"
                      }`}
                    >
                      Responder
                    </button>

                    {authenticated && comment.isMine && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(comment)}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-[#5B4BDB] hover:text-[#5B4BDB] cursor-pointer transition-colors"
                      >
                        Editar
                      </button>
                    )}

                    {authenticated && (comment.isMine || isModerator) && (
                      <button
                        type="button"
                        onClick={() => setDeletingComment(comment)}
                        className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer transition-colors"
                      >
                        Apagar
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!authenticated}
                      title={!authenticated ? "Faça login para curtir comentários" : undefined}
                      onClick={() => void handleToggleUpvote(comment.id)}
                      aria-label={`Apoiar comentario de ${comment.authorAlias}`}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                        !authenticated
                          ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
                          : comment.isLikedByMe
                          ? "bg-[#FFF0F2] text-[#EF4444] border border-[#FCA5A5] active:scale-95 cursor-pointer"
                          : "bg-[#F7F7FA] text-gray-500 border border-gray-200 hover:bg-gray-100 active:scale-95 cursor-pointer"
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={comment.isLikedByMe ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span>{comment.upvotes}</span>
                    </button>

                    <button
                      type="button"
                      disabled={!authenticated}
                      title={!authenticated ? "Faça login para denunciar comentários" : undefined}
                      onClick={() => handleOpenReportModal(comment)}
                      aria-label={`Denunciar comentário de ${comment.authorAlias}`}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        authenticated
                          ? "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                          : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                      }`}
                    >
                      Denunciar
                    </button>
                  </div>
                </div>

                {editingCommentId === comment.id ? (
                  <div className="flex flex-col gap-2 pl-1">
                    <textarea
                      rows={3}
                      maxLength={MAX_CHARS}
                      aria-label="Editar comentário"
                      value={editCommentText}
                      disabled={editSubmitting}
                      onChange={(e) => {
                        setEditCommentText(e.target.value);
                        setEditCommentError("");
                      }}
                      className="w-full resize-none rounded-xl bg-[#FAFAFC] border border-[#DDD9F1] p-2.5 text-xs sm:text-sm text-[#202124] outline-none focus:border-[#5B4BDB]"
                    />
                    {editCommentError && (
                      <p role="alert" className="text-xs font-medium text-red-700">
                        {editCommentError}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        {editCommentText.length}/{MAX_CHARS}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={editSubmitting}
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditCommentError("");
                          }}
                          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={editSubmitting}
                          onClick={() => void handleSaveEdit(comment.id)}
                          className="rounded-lg bg-[#5B4BDB] px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50 cursor-pointer"
                        >
                          {editSubmitting ? "Salvando..." : "Salvar"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-[#545864] leading-relaxed pl-1 whitespace-pre-line break-words">
                    {comment.content}
                  </p>
                )}

                {replyNotice && replyNotice.parentId === comment.id && (
                  <p
                    role={replyNotice.kind === "rejected" || replyNotice.kind === "error" ? "alert" : "status"}
                    className={`mt-1 rounded-xl border p-3 text-xs font-medium ${getTriageBannerClasses(replyNotice.kind)}`}
                  >
                    {replyNotice.text}
                  </p>
                )}

                {replyingToId === comment.id && (
                  <div className="mt-2 ml-4 pl-4 border-l-2 border-[#DDD9F1] flex flex-col gap-2">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      aria-label={`Responder ao relato de ${comment.authorAlias}`}
                      placeholder="Escreva uma resposta para este comentario..."
                      className="w-full resize-none rounded-xl bg-[#FAFAFC] border border-[#DDD9F1] p-2.5 text-xs text-[#202124] placeholder-gray-400 outline-none focus:border-[#5B4BDB]"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        {replyText.length}/{MAX_CHARS}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyText("");
                          }}
                          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={!authenticated || !isReplyLengthValid}
                          onClick={() => handleReplySubmit(comment.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all ${
                            authenticated && isReplyLengthValid
                              ? "bg-[#5B4BDB] hover:brightness-110 cursor-pointer"
                              : "bg-gray-300 cursor-not-allowed opacity-60"
                          }`}
                        >
                          Enviar Resposta
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {hasReplies && (
                  <div className="mt-2 pt-2 border-t border-gray-50">
                    <button
                      type="button"
                      onClick={() => toggleExpand(comment.id)}
                      className="text-xs font-semibold text-[#5B4BDB] hover:underline cursor-pointer"
                    >
                      {isExpanded
                        ? `Ocultar respostas (${comment.replies!.length})`
                        : `Ver respostas (${comment.replies!.length})`}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 ml-3 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-[#EDE9FD] flex flex-col gap-3">
                        {comment.replies!.map((reply) => (
                          <div
                            key={reply.id}
                            className="rounded-xl bg-[#FAFAFC] p-3.5 border border-[#F0EFF8] flex flex-col gap-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#202124]">
                                {reply.authorAlias}
                                <span className="text-[11px] text-gray-400 font-normal ml-2">
                                  - {reply.createdAt}
                                </span>
                                {reply.edited && (
                                  <span className="ml-1.5 text-[11px] font-normal italic text-gray-400">
                                    (editado)
                                  </span>
                                )}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {authenticated && reply.isMine && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(reply)}
                                    className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-600 hover:border-[#5B4BDB] hover:text-[#5B4BDB] cursor-pointer"
                                  >
                                    Editar
                                  </button>
                                )}
                                {authenticated && (reply.isMine || isModerator) && (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingComment(reply)}
                                    className="rounded-md border border-red-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                                  >
                                    Apagar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={!authenticated}
                                  title={!authenticated ? "Faça login para denunciar comentários" : undefined}
                                  onClick={() => handleOpenReportModal(reply)}
                                  className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                                    authenticated
                                      ? "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-700 cursor-pointer"
                                      : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                                  }`}
                                >
                                  Denunciar
                                </button>
                                <button
                                  type="button"
                                  disabled={!authenticated}
                                  title={!authenticated ? "Faça login para curtir comentários" : undefined}
                                  onClick={() => void handleToggleUpvote(reply.id)}
                                  className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    !authenticated
                                      ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                                      : reply.isLikedByMe
                                      ? "bg-[#FFF0F2] text-[#EF4444] cursor-pointer"
                                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer"
                                  }`}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill={reply.isLikedByMe ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                  </svg>
                                  <span>{reply.upvotes}</span>
                                </button>
                              </div>
                            </div>
                            {editingCommentId === reply.id ? (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  rows={2}
                                  maxLength={MAX_CHARS}
                                  aria-label="Editar resposta"
                                  value={editCommentText}
                                  disabled={editSubmitting}
                                  onChange={(e) => {
                                    setEditCommentText(e.target.value);
                                    setEditCommentError("");
                                  }}
                                  className="w-full resize-none rounded-xl bg-white border border-[#DDD9F1] p-2 text-xs text-[#202124] outline-none focus:border-[#5B4BDB]"
                                />
                                {editCommentError && (
                                  <p role="alert" className="text-xs font-medium text-red-700">
                                    {editCommentError}
                                  </p>
                                )}
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    disabled={editSubmitting}
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditCommentError("");
                                    }}
                                    className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    disabled={editSubmitting}
                                    onClick={() => void handleSaveEdit(reply.id)}
                                    className="rounded-lg bg-[#5B4BDB] px-3 py-1 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50 cursor-pointer"
                                  >
                                    {editSubmitting ? "Salvando..." : "Salvar"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-[#545864] leading-relaxed whitespace-pre-line break-words">
                                {reply.content}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reportingComment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-denuncia-comentario-titulo"
        >
          <form
            onSubmit={handleSubmitReport}
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
          >
            <h3 id="modal-denuncia-comentario-titulo" className="text-lg font-bold text-[#202124]">
              Denunciar relato à moderação
            </h3>
            <p className="mt-1 text-xs text-gray-600">
              Sinalize conteúdos que violem a proteção a docentes ou as diretrizes da comunidade.
            </p>

            <label className="mt-4 block text-xs font-semibold text-gray-700">
              Categoria da denúncia
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value as CategoriaDenuncia)}
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-[#202124]"
              >
                {Object.entries(ROTULOS_CATEGORIA_DENUNCIA).map(([chave, rotulo]) => (
                  <option key={chave} value={chave}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-xs font-semibold text-gray-700">
              Motivo detalhado
              <textarea
                rows={3}
                maxLength={1000}
                value={reportReason}
                onChange={(e) => {
                  setReportReason(e.target.value);
                  setReportError("");
                }}
                placeholder="Descreva objetivamente por que este relato viola as regras (mínimo 5 caracteres)."
                className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 text-sm text-[#202124]"
              />
            </label>

            {reportError && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                {reportError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={reportSubmitting}
                onClick={() => setReportingComment(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={reportSubmitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {reportSubmitting ? "Enviando..." : "Enviar denúncia"}
              </button>
            </div>
          </form>
        </div>
      )}
      {deletingComment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-apagar-comentario-titulo"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 id="modal-apagar-comentario-titulo" className="text-lg font-bold text-[#202124]">
              Apagar comentário
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Tem certeza de que deseja apagar este comentário permanentemente?
              {deletingComment.replies && deletingComment.replies.length > 0
                ? " As respostas vinculadas a ele também serão removidas."
                : ""}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeletingComment(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => void handleConfirmDelete()}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deleteSubmitting ? "Apagando..." : "Apagar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
