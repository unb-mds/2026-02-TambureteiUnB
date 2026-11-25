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
      className={`rounded-2xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4 text-xs text-[var(--status-warning-text)] ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--status-warning-border)] bg-[var(--surface)] text-[var(--status-warning-text)] font-bold" aria-hidden="true">
          i
        </div>
        <div className="flex-1">
          <p className="font-bold text-[var(--status-warning-text)] text-sm">
            Atenção ao tipo de Histórico do SIGAA (Não envie o Histórico Completo)
          </p>
          <p className="mt-1 leading-relaxed text-[var(--status-warning-text)]">
            O documento aceito é o <strong>Histórico Escolar Simplificado</strong> emitido no portal do SIGAA (com as colunas de Código, Componente Curricular, CH, Turma e Situação). O relatório de <em>Histórico Completo com Autenticação de Ementa</em> possui estrutura visual incompatível com o leitor automático.
          </p>

          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="mt-2 text-xs font-bold text-[var(--primary-text)] hover:underline focus:outline-none"
          >
            {expandido ? "Ocultar orientações do SIGAA ↑" : "Como emitir o histórico e onde encontrar as estatísticas no SIGAA? ↓"}
          </button>

          {expandido && (
            <div className="mt-2.5 space-y-3 bg-[var(--surface)] p-3 rounded-xl border border-[var(--status-warning-border)] text-[var(--foreground)] font-medium">
              <div>
                <p className="font-bold text-xs uppercase tracking-wide text-[var(--status-warning-text)] mb-1">
                  Passo a Passo 1: Como emitir o Histórico Escolar correto no SIGAA
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[var(--text-muted)]">
                  <li>Acesse o portal do <strong className="text-[var(--foreground)]">SIGAA UnB</strong> com seu login e senha institucional.</li>
                  <li>No menu superior do discente, navegue até <strong className="text-[var(--foreground)]">Ensino &gt; Histórico Escolar</strong>.</li>
                  <li>Selecione <strong className="text-[var(--foreground)]">Emitir Histórico Escolar</strong> (formato simplificado com autenticação no rodapé).</li>
                  <li>Faça o upload do arquivo PDF gerado pelo botão <strong className="text-[var(--foreground)]">Selecionar Histórico (PDF)</strong> abaixo para comprovar as turmas que você cursou.</li>
                </ol>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-2">
                <p className="font-bold text-xs uppercase tracking-wide text-[var(--status-warning-text)] mb-1">
                  Passo a Passo 2: Onde encontrar as Estatísticas da Turma (Gráfico de Pizza) no SIGAA
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[var(--text-muted)]">
                  <li>No menu do SIGAA, acesse <strong className="text-[var(--foreground)]">Ensino &gt; Consultar Minhas Turmas Anteriores</strong> ou acesse a turma pelo histórico.</li>
                  <li>Na turma cursada, clique no ícone de <strong className="text-[var(--foreground)]">Estatísticas da Turma</strong> ou <strong className="text-[var(--foreground)]">Relatório de Desempenho</strong>.</li>
                  <li>O SIGAA exibirá o <strong className="text-[var(--foreground)]">gráfico de pizza de rendimento</strong> com as taxas percentuais de aprovação, reprovação por nota, falta e trancamento.</li>
                  <li>Confira os valores percentuais exibidos no gráfico (e, se desejar, capture um print para consulta) e envie diretamente pelo botão <strong className="text-[var(--foreground)]">Enviar Gráfico de Pizza da Turma</strong> — o semestre, turma e docente já vêm do seu histórico.</li>
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
