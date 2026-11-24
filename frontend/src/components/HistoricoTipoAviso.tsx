"use client";

import React, { useState } from "react";

export interface HistoricoTipoAvisoProps {
  className?: string;
}

export const HistoricoTipoAviso: React.FC<HistoricoTipoAvisoProps> = ({
  className = "",
}) => {
  const [expandido, setExpandido] = useState(false);

  return (
    <div
      role="region"
      aria-label="Orientação sobre documento correto do histórico SIGAA"
      className={`rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold" aria-hidden="true">
          i
        </div>
        <div className="flex-1">
          <p className="font-bold text-amber-950 text-sm">
            Atenção ao tipo de Histórico do SIGAA (Não envie o Histórico Completo)
          </p>
          <p className="mt-1 leading-relaxed text-amber-900">
            O documento aceito é o <strong>Histórico Escolar Simplificado</strong> emitido no portal do SIGAA (com as colunas de Código, Componente Curricular, CH, Turma e Situação). O relatório de <em>Histórico Completo com Autenticação de Ementa</em> possui estrutura visual incompatível com o leitor automático.
          </p>

          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="mt-2 text-xs font-bold text-[#5B4BDB] hover:underline focus:outline-none"
          >
            {expandido ? "Ocultar passo a passo no SIGAA ↑" : "Como emitir o histórico correto no SIGAA? ↓"}
          </button>

          {expandido && (
            <ol className="mt-2.5 list-decimal list-inside space-y-1 text-amber-950 font-medium bg-amber-100/60 p-3 rounded-xl border border-amber-200/60">
              <li>Acesse o portal do <strong>SIGAA UnB</strong> com seu login institucional.</li>
              <li>No menu principal do discente, vá em <strong>Ensino &gt; Histórico Escolar</strong>.</li>
              <li>Selecione a opção <strong>Emitir Histórico Escolar</strong> (formato padrão com código de autenticação no rodapé).</li>
              <li>Salve o arquivo PDF gerado e faça o upload pelo botão abaixo.</li>
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoricoTipoAviso;
