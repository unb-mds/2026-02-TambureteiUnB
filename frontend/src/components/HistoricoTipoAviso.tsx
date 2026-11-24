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
            {expandido ? "Ocultar orientações do SIGAA ↑" : "Como emitir o histórico e onde encontrar as estatísticas no SIGAA? ↓"}
          </button>

          {expandido && (
            <div className="mt-2.5 space-y-3 bg-amber-100/60 p-3 rounded-xl border border-amber-200/60 text-amber-950 font-medium">
              <div>
                <p className="font-bold text-xs uppercase tracking-wide text-amber-900 mb-1">
                  Passo a Passo 1: Como emitir o Histórico Escolar correto no SIGAA
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Acesse o portal do <strong>SIGAA UnB</strong> com seu login e senha institucional.</li>
                  <li>No menu superior do discente, navegue até <strong>Ensino &gt; Histórico Escolar</strong>.</li>
                  <li>Selecione <strong>Emitir Histórico Escolar</strong> (formato simplificado com autenticação no rodapé).</li>
                  <li>Faça o upload do arquivo PDF gerado pelo botão <strong>Selecionar Histórico (PDF)</strong> abaixo para comprovar as turmas que você cursou.</li>
                </ol>
              </div>

              <div className="border-t border-amber-200/70 pt-2">
                <p className="font-bold text-xs uppercase tracking-wide text-amber-900 mb-1">
                  Passo a Passo 2: Onde encontrar as Estatísticas da Turma (Gráfico de Pizza) no SIGAA
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>No menu do SIGAA, acesse <strong>Ensino &gt; Consultar Minhas Turmas Anteriores</strong> ou acesse a turma pelo histórico.</li>
                  <li>Na turma cursada, clique no ícone de <strong>Estatísticas da Turma</strong> ou <strong>Relatório de Desempenho</strong>.</li>
                  <li>O SIGAA exibirá o <strong>gráfico de pizza de rendimento</strong> com as taxas percentuais de aprovação, reprovação por nota, falta e trancamento.</li>
                  <li>Capture a imagem (print) do gráfico ou anote o <strong>nome do professor</strong> e o <strong>número da turma</strong> para enviar pelo botão <strong>Enviar Gráfico de Pizza da Turma</strong>.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoricoTipoAviso;
