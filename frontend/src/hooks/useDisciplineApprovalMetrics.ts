"use client";

import { useEffect, useRef, useState } from "react";
import { getDisciplineBySlug } from "@/services/disciplineService";
import type { Discipline } from "@/types/disciplina";

export default function useDisciplineApprovalMetrics(
  disciplines: Discipline[]
): Record<string, number | null> {
  const [approvalMetrics, setApprovalMetrics] = useState<
    Record<string, number | null>
  >({});
  const requestedSlugs = useRef(new Set<string>());

  useEffect(() => {
    for (const discipline of disciplines) {
      const hasApprovalData =
        typeof discipline.approval === "number" &&
        Number.isFinite(discipline.approval) &&
        discipline.approval > 0;

      if (
        hasApprovalData ||
        !discipline.slug ||
        requestedSlugs.current.has(discipline.slug)
      ) {
        continue;
      }

      requestedSlugs.current.add(discipline.slug);
      void getDisciplineBySlug(discipline.slug)
        .then(({ approval }) => {
          setApprovalMetrics((current) => ({
            ...current,
            [discipline.slug]: approval ?? null,
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

  return approvalMetrics;
}
