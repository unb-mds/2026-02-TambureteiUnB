"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DIFFICULTY_LEVEL_CONFIG,
  type DifficultyAlert,
  type DifficultyLevel,
  type SyllabusUnitMetric,
  computeDifficultySummary,
  extractSyllabusUnits,
} from "../types/dificuldade";
import {
  DIFFICULTY_MAX_CHARS,
  DIFFICULTY_MIN_CHARS,
  listDifficultyAlerts,
  submitDifficultyAlert,
} from "../services/difficultyService";
import { getStoredToken } from "../services/httpClient";
import { getStoredUser } from "../services/authService";

export interface DificuldadesPanelProps {
  disciplineId?: number;
  disciplineSlug: string;
  disciplineCode: string;
  disciplineName: string;
  ementa?: string | null;
  historicalFailureRate?: number;
}

interface DifficultyFormProps {
  syllabusUnits: string[];
  activeSelectedUnit: string;
  onSelectUnit: (unit: string) => void;
  customTopic: string;
  onChangeCustomTopic: (val: string) => void;
  severity: DifficultyLevel;
  onChangeSeverity: (level: DifficultyLevel) => void;
  content: string;
  onChangeContent: (val: string) => void;
  isAnonymous: boolean;
  onChangeAnonymous: (val: boolean) => void;
  isSubmitting: boolean;
  formError: string | null;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function DifficultyForm({
  syllabusUnits,
  activeSelectedUnit,
  onSelectUnit,
  customTopic,
  onChangeCustomTopic,
  severity,
  onChangeSeverity,
  content,
  onChangeContent,
  isAnonymous,
  onChangeAnonymous,
  isSubmitting,
  formError,
  onCancel,
  onSubmit,
}: DifficultyFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 rounded-2xl bg-[#F7F7FA] border border-[#ECEAF6] p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-base font-bold text-[#1E1B3A]"
          style={{ fontFamily: "var(--font-poppins), sans-serif" }}
        >
          Compartilhar Dificuldade ou Dica
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-[#5F6368] hover:text-[#1E1B3A] cursor-pointer"
        >
          Cancelar
        </button>
      </div>

      {formError && (
        <div
          role="alert"
          className="rounded-xl bg-[#FFF0F0] border border-[#FCA5A5] px-4 py-2.5 text-xs font-semibold text-[#C52C2C]"
        >
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="syllabus-unit-select"
            className="block text-xs font-semibold text-[#5F6368] mb-1.5"
          >
            Unidade da Ementa
          </label>
          <select
            id="syllabus-unit-select"
            value={activeSelectedUnit}
            onChange={(e) => onSelectUnit(e.target.value)}
            className="w-full rounded-xl border border-[#E0DDF2] bg-white px-3.5 py-2.5 text-sm text-[#1E1B3A] focus:border-[#5B4BDB] focus:outline-none"
          >
            {syllabusUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
            <option value="__OUTRO__">Outro tópico da disciplina...</option>
          </select>
        </div>

        <div>
          <span className="block text-xs font-semibold text-[#5F6368] mb-1.5">
            Nível de Dificuldade
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(["MODERADO", "ALTO", "CRITICO"] as DifficultyLevel[]).map(
              (level) => {
                const cfg = DIFFICULTY_LEVEL_CONFIG[level];
                const active = severity === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onChangeSeverity(level)}
                    style={
                      active
                        ? {
                            backgroundColor: cfg.badgeBg,
                            color: cfg.badgeText,
                            borderColor: cfg.badgeBorder,
                          }
                        : undefined
                    }
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "ring-2 ring-[#5B4BDB]/15"
                        : "border-[#E0DDF2] bg-white text-[#5F6368] hover:bg-[#F4F3FA]"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {activeSelectedUnit === "__OUTRO__" && (
        <div>
          <label
            htmlFor="custom-topic-input"
            className="block text-xs font-semibold text-[#5F6368] mb-1.5"
          >
            Informe o tópico específico
          </label>
          <input
            id="custom-topic-input"
            type="text"
            maxLength={120}
            value={customTopic}
            onChange={(e) => onChangeCustomTopic(e.target.value)}
            placeholder="Ex: Árvores Balanceadas, Integrais Triplas..."
            className="w-full rounded-xl border border-[#E0DDF2] bg-white px-3.5 py-2.5 text-sm text-[#1E1B3A] focus:border-[#5B4BDB] focus:outline-none"
          />
        </div>
      )}

      <div>
        <label
          htmlFor="difficulty-content-textarea"
          className="block text-xs font-semibold text-[#5F6368] mb-1.5"
        >
          Relato e dica de estudo
        </label>
        <textarea
          id="difficulty-content-textarea"
          rows={3}
          maxLength={DIFFICULTY_MAX_CHARS}
          value={content}
          onChange={(e) => onChangeContent(e.target.value)}
          placeholder="Explique o que exige mais atenção neste tópico e como se preparar melhor..."
          className="w-full rounded-xl border border-[#E0DDF2] bg-white p-3.5 text-sm text-[#1E1B3A] focus:border-[#5B4BDB] focus:outline-none"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <label className="inline-flex items-center gap-2 text-sm text-[#5F6368] cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => onChangeAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-[#D8D1FA] text-[#5B4BDB] focus:ring-[#5B4BDB]"
          />
          Publicar como estudante anônimo
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl bg-[#5B4BDB] text-white text-sm font-semibold hover:bg-[#4938C4] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "Publicando..." : "Publicar Alerta"}
        </button>
      </div>
    </form>
  );
}

interface SyllabusUnitsGridProps {
  unitMetrics: SyllabusUnitMetric[];
  selectedUnitFilter: string;
  totalAlerts: number;
  onSelectFilter: (unit: string) => void;
}

function SyllabusUnitsGrid({
  unitMetrics,
  selectedUnitFilter,
  totalAlerts,
  onSelectFilter,
}: SyllabusUnitsGridProps) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#5F6368]">
          Unidades da Ementa (clique para filtrar)
        </h3>
        {selectedUnitFilter !== "TODOS" && (
          <button
            type="button"
            onClick={() => onSelectFilter("TODOS")}
            className="text-xs font-semibold text-[#5B4BDB] hover:underline cursor-pointer"
          >
            Mostrar todas ({totalAlerts})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {unitMetrics.slice(0, 6).map((metric) => {
          const cfg = DIFFICULTY_LEVEL_CONFIG[metric.dominantSeverity];
          const isSelected =
            selectedUnitFilter.toLowerCase() === metric.unit.toLowerCase();

          return (
            <button
              key={metric.unit}
              type="button"
              onClick={() =>
                onSelectFilter(isSelected ? "TODOS" : metric.unit)
              }
              className={`text-left rounded-xl border p-3.5 transition-all cursor-pointer ${
                isSelected
                  ? "border-[#5B4BDB] bg-[#EDE9FD]/50"
                  : "border-[#ECEAF6] bg-[#F9F9FC] hover:border-[#D8D1FA]"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold text-[#5F6368]">
                  {metric.alertCount}{" "}
                  {metric.alertCount === 1 ? "relato" : "relatos"}
                </span>
                {metric.alertCount > 0 && (
                  <span
                    style={{
                      backgroundColor: cfg.badgeBg,
                      color: cfg.badgeText,
                      borderColor: cfg.badgeBorder,
                    }}
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                  >
                    {cfg.label}
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-[#1E1B3A] line-clamp-1 mb-2">
                {metric.unit}
              </p>

              <div className="w-full h-1.5 rounded-full bg-[#ECEAF6] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${metric.intensityPercentage}%`,
                    backgroundColor:
                      metric.alertCount > 0 ? cfg.barColor : "transparent",
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DifficultyAlertsListProps {
  isLoading: boolean;
  alerts: DifficultyAlert[];
  onToggleLike: (alertId: string) => void;
}

function DifficultyAlertsList({
  isLoading,
  alerts,
  onToggleLike,
}: DifficultyAlertsListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 rounded-xl bg-[#F4F3FA] animate-pulse" />
        <div className="h-32 rounded-xl bg-[#F4F3FA] animate-pulse" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#D8D1FA] bg-[#F9F9FC] p-6 text-center">
        <p className="text-sm font-semibold text-[#1E1B3A]">
          Nenhum relato encontrado para esta unidade.
        </p>
        <p className="text-xs text-[#5F6368] mt-1">
          Seja o primeiro a registrar uma dica de estudo sobre este tópico.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {alerts.map((alert) => {
        const cfg = DIFFICULTY_LEVEL_CONFIG[alert.severity];
        return (
          <article
            key={alert.id}
            className="rounded-xl border border-[#ECEAF6] bg-white p-5 flex flex-col justify-between hover:border-[#D8D1FA] transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-[#5B4BDB] line-clamp-1">
                  {alert.topic}
                </span>
                <span
                  style={{
                    backgroundColor: cfg.badgeBg,
                    color: cfg.badgeText,
                    borderColor: cfg.badgeBorder,
                  }}
                  className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                >
                  {cfg.label}
                </span>
              </div>

              <p className="text-sm text-[#3C4043] leading-relaxed mb-4">
                {alert.content}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#F4F3FA] text-xs text-[#5F6368]">
              <span>
                Por <strong className="text-[#1E1B3A]">{alert.authorAlias}</strong> •{" "}
                {alert.createdAt}
              </span>

              <button
                type="button"
                onClick={() => onToggleLike(alert.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  alert.isLikedByMe
                    ? "bg-[#5B4BDB] text-white border-[#5B4BDB]"
                    : "bg-[#F4F3FA] text-[#5B4BDB] border-[#E0DDF2] hover:bg-[#EDE9FD]"
                }`}
              >
                <span>Concordo ({alert.upvotes})</span>
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function DificuldadesPanel({
  disciplineId,
  disciplineSlug,
  disciplineCode,
  disciplineName,
  ementa,
  historicalFailureRate = 0,
}: DificuldadesPanelProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<DifficultyAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>("TODOS");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [severity, setSeverity] = useState<DifficultyLevel>("ALTO");
  const [content, setContent] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const syllabusUnits = useMemo(() => extractSyllabusUnits(ementa), [ementa]);
  const activeSelectedUnit = selectedUnit || syllabusUnits[0] || "";

  useEffect(() => {
    let active = true;
    const target = disciplineSlug || disciplineId || disciplineCode;

    listDifficultyAlerts(target, { size: 50 })
      .then((response) => {
        if (active) {
          setAlerts(response.items);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setAlerts([]);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [disciplineSlug, disciplineId, disciplineCode]);

  const summary = useMemo(
    () =>
      computeDifficultySummary(alerts, syllabusUnits, historicalFailureRate),
    [alerts, syllabusUnits, historicalFailureRate]
  );

  const filteredAlerts = useMemo(() => {
    const filtered = alerts.filter((alert) => {
      if (
        selectedUnitFilter !== "TODOS" &&
        alert.topic.toLowerCase() !== selectedUnitFilter.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => b.upvotes - a.upvotes);
  }, [alerts, selectedUnitFilter]);

  const handleToggleLike = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((item) => {
        if (item.id !== alertId) return item;
        const nextLiked = !item.isLikedByMe;
        return {
          ...item,
          isLikedByMe: nextLiked,
          upvotes: Math.max(0, item.upvotes + (nextLiked ? 1 : -1)),
        };
      })
    );
  };

  const handleOpenForm = (preselectUnit?: string) => {
    setFormError(null);
    if (preselectUnit) {
      setSelectedUnit(preselectUnit);
    } else if (!selectedUnit && syllabusUnits.length > 0) {
      setSelectedUnit(syllabusUnits[0]);
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const token = getStoredToken();
    const currentUser = getStoredUser();

    if (!token && !currentUser) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/disciplinas/${disciplineSlug}`)}`
      );
      return;
    }

    const resolvedTopic =
      activeSelectedUnit === "__OUTRO__"
        ? customTopic.trim()
        : activeSelectedUnit.trim();

    if (!resolvedTopic) {
      setFormError("Selecione ou digite a unidade da ementa.");
      return;
    }

    const cleanContent = content.trim();
    if (cleanContent.length < DIFFICULTY_MIN_CHARS) {
      setFormError(
        `Descreva a dificuldade com pelo menos ${DIFFICULTY_MIN_CHARS} caracteres.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const authorAlias = isAnonymous
        ? "Estudante Anônimo"
        : currentUser?.nome || "Estudante UnB";

      const created = await submitDifficultyAlert({
        disciplineId,
        disciplineSlugOrCode: disciplineSlug || disciplineCode,
        authorAlias,
        isAnonymous,
        topic: resolvedTopic,
        severity,
        content: cleanContent,
      });

      setAlerts((prev) => [created, ...prev]);
      setContent("");
      setCustomTopic("");
      setIsFormOpen(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível publicar o alerta.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="dificuldades-title"
      className="bg-white rounded-2xl border border-[#ECEAF6] p-6 sm:p-8 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#ECEAF6]">
        <div>
          <h2
            id="dificuldades-title"
            className="text-xl font-bold text-[#1E1B3A]"
            style={{ fontFamily: "var(--font-poppins), sans-serif" }}
          >
            Dificuldades na Ementa
          </h2>
          <p className="text-sm text-[#5F6368] mt-1">
            Confira as unidades de {disciplineName} com mais relatos e dicas de estudo.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            isFormOpen ? setIsFormOpen(false) : handleOpenForm()
          }
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B4BDB] text-white text-sm font-semibold hover:bg-[#4938C4] transition-colors shrink-0 cursor-pointer"
        >
          {isFormOpen ? "Fechar formulário" : "+ Registrar Dificuldade"}
        </button>
      </div>

      {isFormOpen && (
        <DifficultyForm
          syllabusUnits={syllabusUnits}
          activeSelectedUnit={activeSelectedUnit}
          onSelectUnit={setSelectedUnit}
          customTopic={customTopic}
          onChangeCustomTopic={setCustomTopic}
          severity={severity}
          onChangeSeverity={setSeverity}
          content={content}
          onChangeContent={setContent}
          isAnonymous={isAnonymous}
          onChangeAnonymous={setIsAnonymous}
          isSubmitting={isSubmitting}
          formError={formError}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
        />
      )}

      <SyllabusUnitsGrid
        unitMetrics={summary.unitMetrics}
        selectedUnitFilter={selectedUnitFilter}
        totalAlerts={alerts.length}
        onSelectFilter={setSelectedUnitFilter}
      />

      <div className="mt-6 pt-6 border-t border-[#ECEAF6]">
        <DifficultyAlertsList
          isLoading={isLoading}
          alerts={filteredAlerts}
          onToggleLike={handleToggleLike}
        />
      </div>
    </section>
  );
}
