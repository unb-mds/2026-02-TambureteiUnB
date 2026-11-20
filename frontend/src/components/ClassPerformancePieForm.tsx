"use client";

import { useMemo, useState } from "react";
import type { Class } from "@/types/turma";

export interface ClassPerformancePieFormProps {
  classes: Class[];
}

type PieSlice = {
  label: string;
  value: number;
  color: string;
};

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number
) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  };
}

function describePieSlice(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

export default function ClassPerformancePieForm({
  classes,
}: ClassPerformancePieFormProps) {
  const [selectedClassId, setSelectedClassId] = useState(
    classes[0] ? String(classes[0].id) : ""
  );
  const [activeSlice, setActiveSlice] = useState<PieSlice | null>(null);

  const selectedClass = classes.find(
    (item) => String(item.id) === selectedClassId
  );

  const slices = useMemo<PieSlice[]>(() => {
    if (!selectedClass) return [];

    const occupied = selectedClass.vagasOcupadas;
    const total = selectedClass.totalVagas;
    if (
      typeof occupied !== "number" ||
      typeof total !== "number" ||
      occupied < 0 ||
      total <= 0
    ) {
      return [];
    }

    const occupiedCount = Math.min(occupied, total);
    const availableCount = Math.max(0, total - occupiedCount);

    return [
      {
        label: "Ocupadas",
        value: occupiedCount,
        color: "#5B4BDB",
      },
      {
        label: "Disponíveis",
        value: availableCount,
        color: "#E8E6F8",
      },
    ].filter((slice) => slice.value > 0);
  }, [selectedClass]);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  let currentAngle = 0;

  return (
    <section
      aria-label="Ocupação da turma"
      className="mb-6 flex min-h-72 items-center justify-center rounded-3xl border border-[#E8E6F8] bg-white p-6 shadow-xs"
    >
      {classes.length === 0 ? (
        <p className="text-sm text-gray-500">
          Não há turmas disponíveis para esta disciplina.
        </p>
      ) : (
        <div className="flex w-full flex-col items-center gap-5">
          {classes.length > 1 && (
            <select
              aria-label="Selecionar turma"
              value={selectedClassId}
              onChange={(event) => {
                setSelectedClassId(event.target.value);
                setActiveSlice(null);
              }}
              className="w-full max-w-xs rounded-xl border border-[#DDD9F1] bg-[#F7F7FA] px-4 py-2.5 text-sm font-semibold text-[#202124] outline-none focus:border-[#5B4BDB]"
            >
              {classes.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.codigoTurma}
                </option>
              ))}
            </select>
          )}

          {total === 0 ? (
            <div
              role="img"
              aria-label="Dados de ocupação não informados"
              className="flex h-48 w-48 items-center justify-center rounded-full border-[24px] border-[#ECEAF5] bg-white text-center"
            >
              <span className="max-w-24 text-xs font-semibold text-gray-500">
                Dados não informados
              </span>
            </div>
          ) : (
            <div
              className="relative"
              onMouseLeave={() => setActiveSlice(null)}
            >
              <svg
                viewBox="0 0 240 240"
                role="img"
                aria-label={`Distribuição de ocupação da ${selectedClass?.codigoTurma ?? "turma"}`}
                className="h-52 w-52"
              >
                {slices.map((slice) => {
                  const startAngle = currentAngle;
                  const endAngle =
                    currentAngle + (slice.value / total) * 360;
                  currentAngle = endAngle;

                  return (
                    <path
                      key={slice.label}
                      d={describePieSlice(
                        120,
                        120,
                        112,
                        startAngle,
                        endAngle
                      )}
                      fill={slice.color}
                      stroke="#FFFFFF"
                      strokeWidth="3"
                      tabIndex={0}
                      aria-label={`${slice.label}: ${slice.value} vagas, ${Math.round(
                        (slice.value / total) * 100
                      )}%`}
                      className="cursor-pointer outline-none transition-opacity hover:opacity-80 focus:opacity-80"
                      onMouseEnter={() => setActiveSlice(slice)}
                      onFocus={() => setActiveSlice(slice)}
                      onBlur={() => setActiveSlice(null)}
                    />
                  );
                })}

                <circle
                  cx="120"
                  cy="120"
                  r="58"
                  fill="#FFFFFF"
                  pointerEvents="none"
                />
                <text
                  x="120"
                  y="116"
                  textAnchor="middle"
                  fill="#202124"
                  fontSize="24"
                  fontWeight="800"
                  pointerEvents="none"
                >
                  {selectedClass?.occupancy?.percentage ?? 0}%
                </text>
                <text
                  x="120"
                  y="138"
                  textAnchor="middle"
                  fill="#6B7280"
                  fontSize="11"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  ocupação
                </text>
              </svg>

              {activeSlice && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#202124] px-3 py-2 text-center text-xs text-white shadow-lg"
                >
                  <strong className="block">{activeSlice.label}</strong>
                  <span>
                    {activeSlice.value} vaga
                    {activeSlice.value === 1 ? "" : "s"} ·{" "}
                    {Math.round((activeSlice.value / total) * 100)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
