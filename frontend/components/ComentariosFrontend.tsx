"use client";

import React, { useState, useEffect } from "react";

export interface Comment {
  id: string;
  authorAlias: string;
  isAnonymous: boolean;
  content: string;
  createdAt: string;
  upvotes: number;
  isLikedByMe: boolean;
}

interface ComentariosFrontendProps {
  disciplineName: string;
  disciplineCode?: string;
}

async function fetchCommentsFromApi(disciplineCode?: string): Promise<Comment[]> {
  if (!disciplineCode) return [];
  try {
    const response = await fetch(`/api/disciplinas/${disciplineCode}/comentarios`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao carregar comentários:", error);
    return [];
  }
}

export default function ComentariosFrontend({ disciplineName, disciplineCode }: ComentariosFrontendProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [customAlias, setCustomAlias] = useState("@estudante_fcte");

  const MAX_CHARS = 500;
  const MIN_CHARS = 10;
  const currentLength = newCommentText.length;
  const isLengthValid = currentLength >= MIN_CHARS && currentLength <= MAX_CHARS;

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      const data = await fetchCommentsFromApi(disciplineCode);
      if (isMounted) {
        setComments(data);
        setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [disciplineCode]);

  const handleToggleUpvote = (commentId: string) => {
    setComments((prevComments) =>
      prevComments.map((comment) => {
        if (comment.id === commentId) {
          const willLike = !comment.isLikedByMe;
          return {
            ...comment,
            isLikedByMe: willLike,
            upvotes: willLike ? comment.upvotes + 1 : comment.upvotes - 1,
          };
        }
        return comment;
      })
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLengthValid) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      authorAlias: isAnonymous ? "@estudante_anonimo" : customAlias,
      isAnonymous: isAnonymous,
      content: newCommentText.trim(),
      createdAt: "agora mesmo",
      upvotes: 0,
      isLikedByMe: false,
    };

    setComments((prev) => [newComment, ...prev]);
    setNewCommentText("");

    try {
      if (disciplineCode) {
        await fetch(`/api/disciplinas/${disciplineCode}/comentarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newComment),
        });
      }
    } catch (error) {
      console.error("Erro ao salvar comentário na API:", error);
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
              Dicas de estudo, relatos e dúvidas sobre {disciplineName}
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto rounded-full bg-[#EDE9FD] px-3 py-1 text-xs font-semibold text-[#5B4BDB]">
          {comments.length} relatos compartilhados
        </span>
      </div>

      <form onSubmit={handleFormSubmit} className="mb-8 rounded-2xl bg-[#FAFAFC] p-4 sm:p-5 border border-[#ECEAF5]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Deixar um relato ou dúvida
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
              Anônimo
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Compartilhe dicas sobre as provas, listas de exercícios ou tire uma dúvida sobre a matéria..."
          className="w-full resize-none rounded-xl bg-white border border-[#DDD9F1] p-3 text-xs sm:text-sm text-[#202124] placeholder-gray-400 outline-none focus:border-[#5B4BDB] focus:ring-1 focus:ring-[#5B4BDB]"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span
            className={`text-xs ${
              currentLength > MAX_CHARS
                ? "text-red-500 font-bold"
                : currentLength < MIN_CHARS && currentLength > 0
                ? "text-amber-500"
                : "text-gray-400"
            }`}
          >
            {currentLength} / {MAX_CHARS} caracteres
            {currentLength > 0 && currentLength < MIN_CHARS && " (mínimo de 10 caracteres)"}
          </span>

          <button
            type="submit"
            disabled={!isLengthValid}
            className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-xs ${
              isLengthValid
                ? "bg-[#5B4BDB] hover:brightness-110 active:scale-95 cursor-pointer"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Publicar Comentário
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
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex flex-col gap-3 rounded-2xl bg-white p-5 border border-[#EDE9FD] transition-all hover:border-[#D8D1FA]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDE9FD] text-[#5B4BDB] text-xs font-bold">
                    {comment.isAnonymous ? "🔒" : "👤"}
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-[#202124]">
                      {comment.authorAlias}
                    </span>
                    <span className="text-[11px] text-gray-400 ml-2">
                      • {comment.createdAt}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleUpvote(comment.id)}
                  aria-label={`Curtir comentário de ${comment.authorAlias}`}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    comment.isLikedByMe
                      ? "bg-[#FFF0F2] text-[#EF4444] border border-[#FCA5A5]"
                      : "bg-[#F7F7FA] text-gray-500 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {comment.isLikedByMe ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  )}
                  <span>{comment.upvotes}</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-[#545864] leading-relaxed pl-1">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}