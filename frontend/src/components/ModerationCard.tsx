"use client";
import { useState } from "react";
import Button from "./Button";
import { formatFileSize } from "@/utils/fileValidation";
import type { DecisaoCuradoria, MaterialPendente } from "@/types/moderacao";

interface Props {
  material: MaterialPendente;
  disabled: boolean;
  onDecision: (material: MaterialPendente, status: DecisaoCuradoria, motivo?: string) => Promise<void>;
  onDownload: (material: MaterialPendente) => Promise<void>;
}

export default function ModerationCard({ material, disabled, onDecision, onDownload }: Props) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  async function recusar() {
    if (!motivo.trim()) { setErro("Informe uma justificativa para recusar o material."); return; }
    setErro("");
    await onDecision(material, "RECUSADO", motivo);
  }
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby={`titulo-${material.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#5B4BDB]">{material.disciplina.nome}</p>
          <h2 id={`titulo-${material.id}`} className="mt-1 break-words text-xl font-semibold">{material.titulo}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {material.tipo} · {material.formato.toUpperCase()} · {formatFileSize(material.tamanho_bytes)}
          </p>
          <p className="mt-1 text-sm text-gray-600">Enviado em {new Date(material.created_at).toLocaleString("pt-BR")}</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">Pendente</span>
      </div>
      <p className="mt-4 text-sm text-gray-600">Analise o arquivo antes de decidir. Verifique a pertinência e se o conteúdo respeita as regras de compartilhamento.</p>
      <label htmlFor={`motivo-${material.id}`} className="mt-4 block text-sm font-medium">Justificativa da recusa</label>
      <textarea id={`motivo-${material.id}`} maxLength={1000} rows={3} value={motivo} disabled={disabled}
        onChange={(e) => { setMotivo(e.target.value); setErro(""); }}
        aria-invalid={Boolean(erro)} aria-describedby={erro ? `erro-${material.id}` : undefined}
        className="mt-2 w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
        placeholder="Obrigatória ao recusar; até 1000 caracteres." />
      {erro && <p id={`erro-${material.id}`} role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="outline" disabled={disabled} onClick={() => void onDownload(material)}>Baixar para análise</Button>
        <Button disabled={disabled} onClick={() => void onDecision(material, "APROVADO")}>Aprovar</Button>
        <Button variant="outline" disabled={disabled} onClick={() => void recusar()}>Recusar</Button>
      </div>
    </article>
  );
}
