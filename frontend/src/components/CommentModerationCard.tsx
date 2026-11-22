"use client";
import { useState } from "react";
import Button from "./Button";
import type { ComentarioPendente, DecisaoComentarioCuradoria } from "@/types/moderacao";

interface Props {
  comentario: ComentarioPendente;
  disabled: boolean;
  onDecision: (comentario: ComentarioPendente, status: DecisaoComentarioCuradoria, motivo?: string) => Promise<void>;
}

export default function CommentModerationCard({ comentario, disabled, onDecision }: Props) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");

  async function ocultar() {
    if (!motivo.trim()) {
      setErro("Informe uma justificativa para ocultar o comentário.");
      return;
    }
    setErro("");
    await onDecision(comentario, "OCULTO", motivo);
  }

  return (
    <article
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      aria-labelledby={`comentario-titulo-${comentario.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#5B4BDB]">{comentario.disciplina.nome}</p>
          <h2 id={`comentario-titulo-${comentario.id}`} className="mt-1 text-lg font-semibold">
            Relato de {comentario.autor_alias}
          </h2>
          {comentario.topico_dificuldade && (
            <p className="mt-1 text-xs font-medium text-gray-500">
              Tópico: {comentario.topico_dificuldade}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-600">
            Enviado em {new Date(comentario.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
          Pendente
        </span>
      </div>

      <blockquote className="mt-4 rounded-xl border border-gray-200 bg-[#F7F7FA] p-4 text-sm text-gray-800 whitespace-pre-wrap break-words">
        {comentario.conteudo}
      </blockquote>

      {(comentario.motivo_moderacao || typeof comentario.confianca_ia === "number") && (
        <div className="mt-4 rounded-xl border border-[#EDE9FD] bg-[#FAF9FD] p-3 text-sm text-gray-700">
          <p className="font-semibold text-[#5B4BDB]">
            [PARECER DA TRIAGEM IA LOCAL]
            {typeof comentario.confianca_ia === "number" && (
              <span className="ml-2 text-xs font-medium text-gray-600">
                (Confiança: {(comentario.confianca_ia * 100).toFixed(0)}%)
              </span>
            )}
          </p>
          {comentario.motivo_moderacao && (
            <p className="mt-1 text-xs leading-relaxed">{comentario.motivo_moderacao}</p>
          )}
        </div>
      )}

      <label htmlFor={`motivo-comentario-${comentario.id}`} className="mt-4 block text-sm font-medium">
        Justificativa da ocultação
      </label>
      <textarea
        id={`motivo-comentario-${comentario.id}`}
        maxLength={1000}
        rows={2}
        value={motivo}
        disabled={disabled}
        onChange={(e) => {
          setMotivo(e.target.value);
          setErro("");
        }}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? `erro-comentario-${comentario.id}` : undefined}
        className="mt-2 w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
        placeholder="Obrigatória ao ocultar; até 1000 caracteres."
      />
      {erro && (
        <p id={`erro-comentario-${comentario.id}`} role="alert" className="mt-2 text-sm text-red-700">
          {erro}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button disabled={disabled} onClick={() => void onDecision(comentario, "PUBLICADO")}>
          Publicar comentário
        </Button>
        <Button variant="outline" disabled={disabled} onClick={() => void ocultar()}>
          Ocultar comentário
        </Button>
      </div>
    </article>
  );
}
