"use client";

import { useMemo, useState } from "react";
import type { Class } from "@/types/turma";

export interface ClassPerformancePieFormProps {
  classes: Class[];
}

interface ClassOccupancyPieProps {
  classData: Class;
  compact?: boolean;
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

export function ClassOccupancyPie({
  classData,
  compact = false,
}: ClassOccupancyPieProps) {
  const [activeSlice, setActiveSlice] = useState<PieSlice | null>(null);

  const slices = useMemo<PieSlice[]>(() => {
    const occupied = classData.vagasOcupadas;
    const total = classData.totalVagas;
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
      { label: "Ocupadas", value: occupiedCount, color: "var(--chart-occupied)" },
      { label: "Disponíveis", value: availableCount, color: "var(--chart-available)" },
    ].filter((slice) => slice.value > 0);
  }, [classData.vagasOcupadas, classData.totalVagas]);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const chartSize = compact ? "h-20 w-20" : "h-52 w-52";
  const center = 120;
  const radius = 112;
  let currentAngle = 0;

  return (
    <div
      className="relative shrink-0"
      onMouseLeave={() => setActiveSlice(null)}
    >
      <svg
        viewBox="0 0 240 240"
        role="img"
        aria-label={
          total > 0
            ? `Ocupação da ${classData.codigoTurma}: ${classData.occupancy?.percentage ?? 0}%`
            : `Ocupação da ${classData.codigoTurma} não informada`
        }
        className={chartSize}
      >
        {total === 0 ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="var(--chart-empty)"
            tabIndex={0}
            aria-label="Ocupação não informada"
            onMouseEnter={() =>
              setActiveSlice({
                label: "Ocupação não informada",
                value: 0,
                color: "var(--chart-empty)",
              })
            }
            onFocus={() =>
              setActiveSlice({
                label: "Ocupação não informada",
                value: 0,
                color: "var(--chart-empty)",
              })
            }
            onBlur={() => setActiveSlice(null)}
          />
        ) : (
          slices.map((slice) => {
            const startAngle = currentAngle;
            const endAngle = currentAngle + (slice.value / total) * 360;
            currentAngle = endAngle;
            const isFullCircle = slices.length === 1;

            return isFullCircle ? (
              <circle
                key={slice.label}
                cx={center}
                cy={center}
                r={radius}
                fill={slice.color}
                tabIndex={0}
                aria-label={`${slice.label}: ${slice.value} vagas, 100%`}
                className="cursor-pointer outline-none transition-opacity hover:opacity-80 focus:opacity-80"
                onMouseEnter={() => setActiveSlice(slice)}
                onFocus={() => setActiveSlice(slice)}
                onBlur={() => setActiveSlice(null)}
              />
            ) : (
              <path
                key={slice.label}
                d={describePieSlice(
                  center,
                  center,
                  radius,
                  startAngle,
                  endAngle
                )}
                fill={slice.color}
                stroke="var(--surface)"
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
          })
        )}

        <circle
          cx={center}
          cy={center}
          r="58"
          fill="var(--surface)"
          pointerEvents="none"
        />
        <text
          x={center}
          y={compact ? 126 : 116}
          textAnchor="middle"
          fill="var(--foreground)"
          fontSize={compact ? 38 : 24}
          fontWeight="800"
          pointerEvents="none"
        >
          {total > 0 ? `${classData.occupancy?.percentage ?? 0}%` : "—"}
        </text>
        {!compact && (
          <text
            x={center}
            y="138"
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="11"
            fontWeight="600"
            pointerEvents="none"
          >
            ocupação
          </text>
        )}
      </svg>

      {activeSlice && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute z-10 rounded-xl bg-[#202124] px-3 py-2 text-center text-xs text-white shadow-lg ${
            compact
              ? "bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap"
              : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          }`}
        >
          <strong className="block">{activeSlice.label}</strong>
          {activeSlice.value > 0 && (
            <span>
              {activeSlice.value} vaga{activeSlice.value === 1 ? "" : "s"} ·{" "}
              {Math.round((activeSlice.value / total) * 100)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClassPerformancePieForm({
  classes,
}: ClassPerformancePieFormProps) {
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const semCompare = (b.semestre || "").localeCompare(a.semestre || "", "pt-BR", {
        numeric: true,
        sensitivity: "base",
      });
      if (semCompare !== 0) return semCompare;
      return a.codigoTurma.localeCompare(b.codigoTurma, "pt-BR", {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [classes]);

  const hasMultipleSemesters = useMemo(() => {
    const semesters = new Set(
      sortedClasses.map((item) => item.semestre?.trim()).filter(Boolean)
    );
    return semesters.size > 1;
  }, [sortedClasses]);

  const [selectedClassId, setSelectedClassId] = useState(
    sortedClasses[0] ? String(sortedClasses[0].id) : ""
  );

  const effectiveClassId = sortedClasses.some(
    (item) => String(item.id) === selectedClassId
  )
    ? selectedClassId
    : sortedClasses[0]
    ? String(sortedClasses[0].id)
    : "";

  const selectedClass = sortedClasses.find(
    (item) => String(item.id) === effectiveClassId
  );

  return (
    <div className="mb-8 rounded-2xl border border-[#ECEAF5] bg-[#FAFAFC] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-[#202124] sm:text-lg">
            Ocupação por turma
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Passe o cursor sobre o gráfico para ver os detalhes.
          </p>
        </div>
        {sortedClasses.length > 1 && (
          <select
            aria-label="Selecionar turma para ver ocupação"
            value={effectiveClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="w-full max-w-xs rounded-xl border border-[#DDD9F1] bg-white px-4 py-2.5 text-sm font-semibold text-[#202124] outline-none focus:border-[#5B4BDB]"
          >
            {sortedClasses.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.semestre && (hasMultipleSemesters || sortedClasses.length > 0)
                  ? `${item.codigoTurma} (${item.semestre})`
                  : item.codigoTurma}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedClass ? (
        <div className="flex justify-center">
          <ClassOccupancyPie classData={selectedClass} />
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-gray-500">
          Não há turmas disponíveis para esta disciplina.
        </p>
      )}
    </div>
  );
}
