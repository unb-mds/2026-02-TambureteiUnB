"use client";

import { hasApprovalData } from "@/utils/academicMetrics";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDisciplineBySlug } from "@/services/disciplineService";
import type { Discipline } from "@/types/disciplina";

export interface DisciplineDetailedMetrics {
  approval: number | null;
  failedGrade?: number;
  failedAttendance?: number;
  withdrawn?: number;
  matriculados?: number;
}

export function useDisciplineDetailedMetrics(
  disciplines: Discipline[]
): Record<string, DisciplineDetailedMetrics> {
  const [detailedMetrics, setDetailedMetrics] = useState<
    Record<string, DisciplineDetailedMetrics>
  >({});
  const requestedSlugs = useRef(new Set<string>());

  useEffect(() => {
    for (const discipline of disciplines) {
      const hasApproval = hasApprovalData(discipline.approval);

      if (
        hasApproval ||
        !discipline.slug ||
        requestedSlugs.current.has(discipline.slug)
      ) {
        continue;
      }

      requestedSlugs.current.add(discipline.slug);
      void getDisciplineBySlug(discipline.slug)
        .then((fetched) => {
          setDetailedMetrics((current) => ({
            ...current,
            [discipline.slug]: {
              approval: fetched.approval ?? null,
              failedGrade: fetched.failedGrade,
              failedAttendance: fetched.failedAttendance,
              withdrawn: fetched.withdrawn,
              matriculados: fetched.metrica_consolidada?.matriculados,
            },
          }));
        })
        .catch((error: unknown) => {
          requestedSlugs.current.delete(discipline.slug);
          console.error(
            `Erro ao carregar métricas de aprovação da disciplina ${discipline.slug}:`,
            error
          );
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
