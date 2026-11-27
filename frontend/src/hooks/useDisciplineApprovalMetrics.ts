"use client";

import { hasApprovalData } from "@/utils/academicMetrics";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDisciplineBySlug } from "@/services/disciplineService";
import { ApiError } from "@/services/httpClient";
import type { Discipline } from "@/types/disciplina";

export interface DisciplineDetailedMetrics {
  approval: number | null;
  failedGrade?: number;
  failedAttendance?: number;
  withdrawn?: number;
  matriculados?: number;
}

const metricsCache = new Map<string, DisciplineDetailedMetrics>();

export function useDisciplineDetailedMetrics(
  disciplines: Discipline[]
): Record<string, DisciplineDetailedMetrics> {
  const [detailedMetrics, setDetailedMetrics] = useState<
    Record<string, DisciplineDetailedMetrics>
  >(() => Object.fromEntries(metricsCache.entries()));
  const requestedSlugs = useRef(new Set<string>(metricsCache.keys()));

  useEffect(() => {
    for (const discipline of disciplines) {
      const hasApproval = hasApprovalData(discipline.approval);
      const alreadyHasCatalogMetrics =
        discipline.metrica_consolidada !== undefined ||
        discipline.historicalPerformance !== undefined;

      if (
        hasApproval ||
        alreadyHasCatalogMetrics ||
        !discipline.slug ||
        requestedSlugs.current.has(discipline.slug)
      ) {
        continue;
      }

      requestedSlugs.current.add(discipline.slug);
      void getDisciplineBySlug(discipline.slug)
        .then((fetched) => {
          const entry: DisciplineDetailedMetrics = {
            approval: fetched.approval ?? null,
            failedGrade: fetched.failedGrade,
            failedAttendance: fetched.failedAttendance,
            withdrawn: fetched.withdrawn,
            matriculados: fetched.metrica_consolidada?.matriculados,
          };
          metricsCache.set(discipline.slug, entry);
          setDetailedMetrics((current) => ({
            ...current,
            [discipline.slug]: entry,
          }));
        })
        .catch((error: unknown) => {
          // Em 429 ou 404, nao entra em loop de novas tentativas nem dispara overlay de erro
          if (error instanceof ApiError && (error.status === 429 || error.status === 404)) {
            return;
          }
          requestedSlugs.current.delete(discipline.slug);
        });
    }
  }, [disciplines]);

  return detailedMetrics;
}

export default function useDisciplineApprovalMetrics(
  disciplines: Discipline[]
): Record<string, number | null> {
  const detailedMetrics = useDisciplineDetailedMetrics(disciplines);

  return useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const [slug, metrics] of Object.entries(detailedMetrics)) {
      map[slug] = metrics.approval;
    }
    return map;
  }, [detailedMetrics]);
}
