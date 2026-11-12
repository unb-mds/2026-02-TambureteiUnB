"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/authService";
import { request } from "@/services/httpClient";
import { criarDenuncia, ROTULOS_CATEGORIA_DENUNCIA, validarMotivoDenuncia } from "@/services/moderacaoService";
import type { CategoriaDenuncia } from "@/types/moderacao";

export interface CommentItem {
  id: string;
  authorAlias: string;
  isAnonymous: boolean;
  content: string;
  createdAt: string;
  upvotes: number;
  isLikedByMe: boolean;
  parentId?: string | null;
  replies?: CommentItem[];
}

export type Comment = CommentItem;

interface BackendCommentItem {
  id: number | string;
  autor_alias?: string;
  conteudo: string;
  created_at?: string;
  parent_id?: number | string | null;
  upvotes?: number;
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
  const router = useRouter();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [customAlias] = useState("@estudante_fcte");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    let isMounted = true;

    async function loadComments() {
      const identifier = disciplineId || disciplineCode;
      if (!identifier) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await request<BackendCommentResponse | BackendCommentItem[]>(
          `/cadeiras/${identifier}/comentarios`
        );

        if (isMounted) {
          const rawItems: BackendCommentItem[] = Array.isArray(response)
            ? response
            : response?.items || [];

          const mapped: CommentItem[] = rawItems.map((item) => ({
            id: String(item.id),
            authorAlias: item.autor_alias || "@estudante_fcte",
            isAnonymous: !item.autor_alias || item.autor_alias.includes("Anonimo"),
            content: item.conteudo,
            createdAt: item.created_at
              ? new Date(item.created_at).toLocaleDateString("pt-BR")
              : "Recente",
            upvotes: item.upvotes || 0,
            isLikedByMe: false,
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

          setComments(roots);
        }
      } catch (err) {
        console.error("Erro ao carregar comentarios:", err);
        if (isMounted) {
          setComments([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadComments();

    return () => {
      isMounted = false;
    };
  }, [disciplineId, disciplineCode]);

  const toggleExpand = (commentId: string) => {
    setExpandedThreads((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleToggleUpvote = (commentId: string) => {
    const updateRecursive = (list: CommentItem[]): CommentItem[] => {
      return list.map((item) => {
        if (item.id === commentId) {
          const willLike = !item.isLikedByMe;
          return {
            ...item,
            isLikedByMe: willLike,
            upvotes: willLike ? item.upvotes + 1 : item.upvotes - 1,
          };
        }
        if (item.replies && item.replies.length > 0) {
          return { ...item, replies: updateRecursive(item.replies) };
        }
        return item;
      });
    };
    setComments((prev) => updateRecursive(prev));
  };

  const handleMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMainLengthValid) return;

    if (!isAuthenticated()) {
      alert("Apenas estudantes cadastrados podem publicar comentarios.");
      router.push("/login");
      return;
    }

    const newComment: CommentItem = {
      id: Date.now().toString(),
      authorAlias: isAnonymous ? "@estudante_anonimo" : customAlias,
      isAnonymous,
      content: newCommentText.trim(),
      createdAt: "agora mesmo",
      upvotes: 0,
      isLikedByMe: false,
      replies: [],
    };

    setComments((prev) => [newComment, ...prev]);
    setNewCommentText("");

    try {
      const targetId = disciplineId || 1;
      await request("/comentarios", {
        method: "POST",
        body: JSON.stringify({
          disciplina_id: targetId,
          conteudo: newComment.content,
          autor_alias: newComment.authorAlias,
        }),
      });
    } catch (err) {
      console.error("Erro ao registrar comentario no backend:", err);
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!isReplyLengthValid) return;

    if (!isAuthenticated()) {
      alert("Apenas estudantes cadastrados podem responder comentarios.");
      router.push("/login");
      return;
    }

    const newReply: CommentItem = {
      id: Date.now().toString(),
      authorAlias: isAnonymous ? "@estudante_anonimo" : customAlias,
      isAnonymous,
      content: replyText.trim(),
      createdAt: "agora mesmo",
      upvotes: 0,
      isLikedByMe: false,
      parentId,
      replies: [],
    };

    setComments((prev) =>
      prev.map((parent) => {
        if (parent.id === parentId) {
          return {
            ...parent,
            replies: [...(parent.replies || []), newReply],
          };
        }
        return parent;
      })
    );

    setExpandedThreads((prev) => ({ ...prev, [parentId]: true }));
    setReplyingToId(null);
    setReplyText("");

    try {
      const targetId = disciplineId || 1;
      await request("/comentarios", {
        method: "POST",
        body: JSON.stringify({
          disciplina_id: targetId,
          conteudo: newReply.content,
          autor_alias: newReply.authorAlias,
          parent_id: Number(parentId) || null,
        }),
      });
    } catch (err) {
      console.error("Erro ao registrar resposta no backend:", err);
    }
  };

  const handleOpenReportModal = (comment: Comment) => {
    setReportingComment(comment);
    setReportCategory("OFENSA_DOCENTE");
    setReportReason("");
    setReportError("");
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingComment) return;

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
      setReportFeedback("Denúncia registrada e encaminhada para revisão da equipe de moderação (RN04).");
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

      <form onSubmit={handleMainSubmit} className="mb-8 rounded-2xl bg-[#FAFAFC] p-4 sm:p-5 border border-[#ECEAF5]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Deixar um relato ou duvida
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAnonymous(false)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                !isAnonymous
                  ? "bg-[#5B4BDB] text-white shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Postar como {customAlias}
            </button>
            <button
              type="button"
              onClick={() => setIsAnonymous(true)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                isAnonymous
                  ? "bg-[#5B4BDB] text-white shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Anonimo
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Compartilhe dicas sobre as provas, listas de exercicios ou tire uma duvida sobre a materia..."
          className="w-full resize-none rounded-xl bg-white border border-[#DDD9F1] p-3 text-xs sm:text-sm text-[#202124] placeholder-gray-400 outline-none focus:border-[#5B4BDB] focus:ring-1 focus:ring-[#5B4BDB]"
        />

        <p className="mt-2 text-[11px] text-gray-500">
          Conduta ética (RN04): concentre seu relato na ementa, metodologia e dificuldades técnicas da matéria. Ataques pessoais a docentes são vedados.
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span
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
            disabled={!isMainLengthValid}
            className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-xs ${
              isMainLengthValid
                ? "bg-[#5B4BDB] hover:brightness-110 active:scale-95 cursor-pointer"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Publicar Comentario
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
                <div className="flex items-center justify-between gap-2">
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
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-[#5B4BDB] hover:bg-[#EDE9FD] transition-colors cursor-pointer"
                    >
                      Responder
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleUpvote(comment.id)}
                      aria-label={`Apoiar comentario de ${comment.authorAlias}`}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                        comment.isLikedByMe
                          ? "bg-[#FFF0F2] text-[#EF4444] border border-[#FCA5A5]"
                          : "bg-[#F7F7FA] text-gray-500 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={comment.isLikedByMe ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span>{comment.upvotes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenReportModal(comment)}
                      aria-label={`Denunciar comentário de ${comment.authorAlias}`}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                    >
                      Denunciar
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#545864] leading-relaxed pl-1">
                  {comment.content}
                </p>

                {replyingToId === comment.id && (
                  <div className="mt-2 ml-4 pl-4 border-l-2 border-[#DDD9F1] flex flex-col gap-2">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
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
                          disabled={!isReplyLengthValid}
                          onClick={() => handleReplySubmit(comment.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all ${
                            isReplyLengthValid
                              ? "bg-[#5B4BDB] hover:brightness-110 cursor-pointer"
                              : "bg-gray-300 cursor-not-allowed"
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
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#202124]">
                                {reply.authorAlias}
                                <span className="text-[11px] text-gray-400 font-normal ml-2">
                                  - {reply.createdAt}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleUpvote(reply.id)}
                                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                                  reply.isLikedByMe
                                    ? "bg-[#FFF0F2] text-[#EF4444]"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill={reply.isLikedByMe ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                                <span>{reply.upvotes}</span>
                              </button>
                            </div>
                            <p className="text-xs text-[#545864] leading-relaxed">
                              {reply.content}
                            </p>
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
              Sinalize conteúdos que violem a proteção a docentes (RN04) ou as diretrizes da comunidade.
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
    </section>
  );
}
