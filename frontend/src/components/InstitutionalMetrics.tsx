import React from "react";

export interface MetricItem {
  id: string;
  valor: string;
  rotulo: string;
  descricao: string;
}

export const METRICAS_UNB: MetricItem[] = [
  {
    id: "campi",
    valor: "4 Campi",
    rotulo: "Presença Integrada",
    descricao: "Darcy Ribeiro, FGA Gama, FCE Ceilândia e FUP Planaltina conectados.",
  },
  {
    id: "cursos",
    valor: "140+",
    rotulo: "Cursos de Graduação",
    descricao: "Matrizes curriculares e fluxos pedagógicos catalogados.",
  },
  {
    id: "disciplinas",
    valor: "3.000+",
    rotulo: "Disciplinas Mapeadas",
    descricao: "Histórico de turmas, ementas e índices acadêmicos consolidados.",
  },
  {
    id: "comunidade",
    valor: "100%",
    rotulo: "Dados Abertos",
    descricao: "Transparência pública e colaboração discente com exportação direta.",
  },
];

interface InstitutionalMetricsProps {
  className?: string;
}

export default function InstitutionalMetrics({ className = "" }: InstitutionalMetricsProps) {
  return (
    <section
      aria-labelledby="metricas-unb-titulo"
      className={`rounded-3xl border border-[#E8E6F8] bg-white p-6 sm:p-8 shadow-xs ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#F0EEFB] pb-6 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5B4BDB]/10 px-3 py-1 text-xs font-bold text-[#5B4BDB] uppercase tracking-wider">
            Panorama Institucional
          </span>
          <h2
            id="metricas-unb-titulo"
            className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#202124] tracking-tight"
          >
            Métricas Consolidadas da UnB
          </h2>
        </div>
        <p className="max-w-md text-sm text-gray-700 leading-relaxed font-medium">
          Acompanhamento estatístico contínuo das matrizes curriculares, indicadores de aprovação e colaboração estudantil em toda a universidade.
        </p>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {METRICAS_UNB.map((metrica) => (
          <div
            key={metrica.id}
            className="rounded-2xl border border-[#E8E6F8] bg-[#F7F7FA] p-5 transition-all hover:border-[#5B4BDB]/40 hover:bg-white hover:shadow-xs flex flex-col justify-between"
          >
            <dt className="order-2 mt-2">
              <span className="block text-sm font-bold text-[#202124]">
                {metrica.rotulo}
              </span>
              <span className="mt-1 block text-xs text-gray-700 leading-relaxed font-normal">
                {metrica.descricao}
              </span>
            </dt>
            <dd className="order-1 text-3xl sm:text-4xl font-extrabold text-[#5B4BDB] tracking-tight">
              {metrica.valor}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}