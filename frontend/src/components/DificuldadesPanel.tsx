"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
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
  deleteDifficultyAlert,
  listDifficultyAlerts,
  submitDifficultyAlert,
  toggleDifficultyVote,
  updateDifficultyAlert,
} from "../services/difficultyService";
import { getStoredToken } from "../services/httpClient";
import { getStoredUser, isAuthenticated, subscribeAuthChange } from "../services/authService";
import {
  ROTULOS_CATEGORIA_DENUNCIA,
  criarDenuncia,
  getTriageBannerClasses,
  iniciarPollingStatusComentario,
  podeModerar,
  validarMotivoDenuncia,
  type AvisoTriagemComentario,
} from "../services/moderacaoService";
import type { CategoriaDenuncia } from "../types/moderacao";

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
  authorDisplayName: string;
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
  authorDisplayName,
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
        <div className="flex flex-col gap-1">
          <label className="inline-flex items-center gap-2 text-sm text-[#5F6368] cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => onChangeAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-[#D8D1FA] text-[#5B4BDB] focus:ring-[#5B4BDB]"
            />
            Publicar como estudante anônimo
          </label>
          <span className="text-xs text-[#5F6368]">
            Autor exibido: <strong>{isAnonymous ? "Estudante Anônimo" : authorDisplayName}</strong>
          </span>
        </div>

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
  authenticated: boolean;
  isModerator: boolean;
  onToggleLike: (alertId: string) => void;
  onOpenReport: (alert: DifficultyAlert) => void;
  onOpenEdit: (alert: DifficultyAlert) => void;
  onRequestDelete: (alert: DifficultyAlert) => void;
}

function DifficultyAlertsList({
  isLoading,
  alerts,
  authenticated,
  isModerator,
  onToggleLike,
  onOpenReport,
  onOpenEdit,
  onRequestDelete,
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
        const canEdit = authenticated && Boolean(alert.isMine);
        const canDelete = authenticated && (Boolean(alert.isMine) || isModerator);
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

              <p className="text-sm text-[#3C4043] leading-relaxed mb-4 whitespace-pre-line break-words">
                {alert.content}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#F4F3FA] text-xs text-[#5F6368]">
              <span>
                Por <strong className="text-[#1E1B3A]">{alert.authorAlias}</strong> •{" "}
                {alert.createdAt}
                {alert.edited && (
                  <span className="ml-1.5 text-[11px] italic text-gray-400">(editado)</span>
                )}
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={!authenticated}
                  title={!authenticated ? "Faça login para concordar" : undefined}
                  onClick={() => onToggleLike(alert.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    !authenticated
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-70"
                      : alert.isLikedByMe
                      ? "bg-[#5B4BDB] text-white border-[#5B4BDB] cursor-pointer"
                      : "bg-[#F4F3FA] text-[#5B4BDB] border-[#E0DDF2] hover:bg-[#EDE9FD] cursor-pointer"
                  }`}
                >
                  <span>Concordo ({alert.upvotes})</span>
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onOpenEdit(alert)}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-[#5B4BDB] hover:text-[#5B4BDB] cursor-pointer transition-colors"
                  >
                    Editar
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onRequestDelete(alert)}
                    className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    Apagar
                  </button>
                )}

                <button
                  type="button"
                  disabled={!authenticated}
                  title={!authenticated ? "Faça login para denunciar dificuldades" : undefined}
                  onClick={() => onOpenReport(alert)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    authenticated
                      ? "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-70"
                  }`}
                >
                  Denunciar
                </button>
              </div>
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
  const authenticated = useSyncExternalStore(
    subscribeAuthChange,
    isAuthenticated,
    () => false
  );
  const isModerator = useSyncExternalStore(
    subscribeAuthChange,
    () => {
      const user = getStoredUser();
      return Boolean(user && podeModerar(user.role));
    },
    () => false
  );
  const storedUser = authenticated ? getStoredUser() : null;
  const authorDisplayName = storedUser?.nome?.trim() || "Estudante UnB";

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
  const [triageNotice, setTriageNotice] = useState<AvisoTriagemComentario | null>(null);

  const [reportingAlert, setReportingAlert] = useState<DifficultyAlert | null>(null);
  const [reportCategory, setReportCategory] = useState<CategoriaDenuncia>("OFENSA_DOCENTE");
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [editingAlert, setEditingAlert] = useState<DifficultyAlert | null>(null);
  const [editUnit, setEditUnit] = useState("");
  const [editCustomTopic, setEditCustomTopic] = useState("");
  const [editSeverity, setEditSeverity] = useState<DifficultyLevel>("ALTO");
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletingAlert, setDeletingAlert] = useState<DifficultyAlert | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const pollCancelRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  const syllabusUnits = useMemo(() => extractSyllabusUnits(ementa), [ementa]);
  const activeSelectedUnit = selectedUnit || syllabusUnits[0] || "";

  const loadAlerts = useCallback(async () => {
    const target = disciplineSlug || disciplineId || disciplineCode;
    try {
      const response = await listDifficultyAlerts(target, { size: 50 });
      if (isMountedRef.current) {
        setAlerts(response.items);
        setIsLoading(false);
      }
    } catch {
      if (isMountedRef.current) {
        setAlerts([]);
        setIsLoading(false);
      }
    }
  }, [disciplineSlug, disciplineId, disciplineCode]);

  useEffect(() => {
    isMountedRef.current = true;
    let active = true;
    const target = disciplineSlug || disciplineId || disciplineCode;

    listDifficultyAlerts(target, { size: 50 })
      .then((response) => {
        if (active && isMountedRef.current) {
          setAlerts(response.items);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active && isMountedRef.current) {
          setAlerts([]);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      isMountedRef.current = false;
      if (pollCancelRef.current) {
        pollCancelRef.current();
        pollCancelRef.current = null;
      }
    };
  }, [disciplineSlug, disciplineId, disciplineCode, authenticated]);

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

  const handleToggleLike = async (alertId: string) => {
    if (!authenticated || !isAuthenticated()) {
      return;
    }

    const previousItem = alerts.find((item) => item.id === alertId);
    if (!previousItem) return;

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

    const numericId = Number(alertId);
    if (!Number.isSafeInteger(numericId) || numericId <= 0) {
      return;
    }

    try {
      const synced = await toggleDifficultyVote(numericId);
      setAlerts((prev) =>
        prev.map((item) =>
          item.id === alertId
            ? {
                ...item,
                upvotes: synced.upvotes,
                isLikedByMe: synced.liked_by_me,
              }
            : item
        )
      );
    } catch {
      setAlerts((prev) =>
        prev.map((item) => (item.id === alertId ? previousItem : item))
      );
    }
  };

  const handleOpenForm = (preselectUnit?: string) => {
    if (!authenticated || !isAuthenticated()) {
      return;
    }
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

    if (!authenticated || (!token && !currentUser)) {
      setFormError(
        "Faça login com sua conta de estudante para registrar dificuldades na ementa."
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
    setTriageNotice(null);
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

      setContent("");
      setCustomTopic("");
      setIsFormOpen(false);

      const numericId = Number(created.id);
      if (created.statusModeracao === "PENDENTE" && Number.isSafeInteger(numericId) && numericId > 0) {
        setTriageNotice({
          kind: "pending",
          text: "[TRIAGEM AUTOMATICA] Seu relato de dificuldade foi recebido e submetido a moderacao automatica. Aguardando resultado...",
        });

        if (pollCancelRef.current) {
          pollCancelRef.current();
        }
        pollCancelRef.current = iniciarPollingStatusComentario({
          commentId: numericId,
          contexto: "dificuldade",
          onApproved: async () => {
            await loadAlerts();
          },
          onStatus: (aviso) => {
            if (!isMountedRef.current) return;
            setTriageNotice(aviso);
            pollCancelRef.current = null;
          },
        });
      } else {
        setAlerts((prev) => [created, ...prev]);
        setTriageNotice({
          kind: "approved",
          text: "[PUBLICADO] Seu relato de dificuldade foi publicado com sucesso.",
        });
      }
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
          disabled={!authenticated}
          title={!authenticated ? "Faça login para registrar dificuldades" : undefined}
          onClick={() =>
            isFormOpen ? setIsFormOpen(false) : handleOpenForm()
          }
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors shrink-0 ${
            authenticated
              ? "bg-[#5B4BDB] hover:bg-[#4938C4] cursor-pointer"
              : "bg-gray-300 cursor-not-allowed opacity-60"
          }`}
        >
          {authenticated
            ? isFormOpen
              ? "Fechar formulário"
              : "+ Registrar Dificuldade"
            : "Faça login para relatar"}
        </button>
      </div>

      {!authenticated && (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D8D1FA] bg-[#EDE9FD] px-4 py-3 text-xs sm:text-sm text-[#5B4BDB]"
        >
          <span>
            Apenas estudantes autenticados podem registrar dificuldades na ementa.
          </span>
          <Link
            href="/login"
            className="rounded-lg bg-[#5B4BDB] px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all"
          >
            Fazer login
          </Link>
        </div>
      )}

      {triageNotice && (
        <div
          role={triageNotice.kind === "rejected" || triageNotice.kind === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl border px-4 py-3 text-xs font-medium ${getTriageBannerClasses(triageNotice.kind)}`}
        >
          {triageNotice.text}
        </div>
      )}

      {authenticated && isFormOpen && (
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
          authorDisplayName={authorDisplayName}
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
          authenticated={authenticated}
          isModerator={isModerator}
          onToggleLike={handleToggleLike}
          onOpenReport={(alert) => {
            if (!authenticated || !isAuthenticated()) return;
            setReportingAlert(alert);
            setReportCategory("OFENSA_DOCENTE");
            setReportReason("");
            setReportError("");
          }}
          onOpenEdit={(alert) => {
            setEditingAlert(alert);
            const inUnits = syllabusUnits.includes(alert.topic);
            setEditUnit(inUnits ? alert.topic : "__OUTRO__");
            setEditCustomTopic(inUnits ? "" : alert.topic);
            setEditSeverity(alert.severity);
            setEditContent(alert.content);
            setEditError("");
          }}
          onRequestDelete={(alert) => {
            setDeletingAlert(alert);
          }}
        />
      </div>

      {reportingAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-denuncia-dificuldade-titulo"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const validacao = validarMotivoDenuncia(reportReason);
              if (!validacao.valido) {
                setReportError(validacao.erro || "Informe o motivo da denúncia.");
                return;
              }
              const numericId = Number(reportingAlert.id);
              if (!Number.isSafeInteger(numericId) || numericId <= 0) {
                setReportError("Este relato não pode ser denunciado.");
                return;
              }
              setReportSubmitting(true);
              setReportError("");
              try {
                const res = await criarDenuncia({
                  comentario_id: numericId,
                  categoria: reportCategory,
                  motivo: reportReason.trim(),
                });
                setReportingAlert(null);
                setReportReason("");
                setTriageNotice({
                  kind: "approved",
                  text: res.ocultado_automaticamente
                    ? "Denúncia registrada. O relato atingiu 3 denúncias e foi ocultado preventivamente para análise da moderação."
                    : "Denúncia registrada e encaminhada para análise da moderação.",
                });
                if (res.ocultado_automaticamente) {
                  await loadAlerts();
                }
              } catch (err) {
                setReportError(
                  err instanceof Error ? err.message : "Não foi possível enviar a denúncia."
                );
              } finally {
                setReportSubmitting(false);
              }
            }}
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
          >
            <h3 id="modal-denuncia-dificuldade-titulo" className="text-lg font-bold text-[#202124]">
              Denunciar relato de dificuldade
            </h3>
            <p className="mt-1 text-xs text-gray-600">
              Sinalize ofensas a docentes, exposição de dados pessoais ou conteúdo impróprio.
            </p>
            <p className="mt-2 rounded-lg bg-[#F7F7FA] px-3 py-2 text-xs text-[#202124] line-clamp-3">
              <strong>{reportingAlert.topic}:</strong> {reportingAlert.content}
            </p>

            <label className="mt-4 block text-xs font-semibold text-gray-700">
              Categoria da denúncia
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value as CategoriaDenuncia)}
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-[#202124]"
              >
                {Object.entries(ROTULOS_CATEGORIA_DENUNCIA).map(([chave, rotulo]) => (
                  <option key={chave} value={chave}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-xs font-semibold text-gray-700">
              Motivo da denúncia (mínimo 5 caracteres)
              <textarea
                rows={3}
                maxLength={1000}
                value={reportReason}
                onChange={(e) => {
                  setReportReason(e.target.value);
                  setReportError("");
                }}
                placeholder="Descreva o problema encontrado neste relato..."
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
              />
            </label>

            {reportError && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                {reportError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={reportSubmitting}
                onClick={() => setReportingAlert(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={reportSubmitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {reportSubmitting ? "Enviando..." : "Enviar denúncia"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-editar-dificuldade-titulo"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const resolvedTopic =
                editUnit === "__OUTRO__" ? editCustomTopic.trim() : editUnit.trim();
              if (!resolvedTopic) {
                setEditError("Selecione ou informe a unidade da ementa.");
                return;
              }
              const numericId = Number(editingAlert.id);
              if (!Number.isSafeInteger(numericId) || numericId <= 0) {
                setEditError("Este relato não pode ser editado.");
                return;
              }
              setEditSubmitting(true);
              setEditError("");
              try {
                const updated = await updateDifficultyAlert(numericId, {
                  topic: resolvedTopic,
                  severity: editSeverity,
                  content: editContent,
                });
                setAlerts((prev) =>
                  prev.map((item) => (item.id === editingAlert.id ? updated : item))
                );
                setEditingAlert(null);
                setTriageNotice({
                  kind: "approved",
                  text: "Relato de dificuldade atualizado com sucesso.",
                });
              } catch (err) {
                setEditError(
                  err instanceof Error ? err.message : "Não foi possível salvar a edição."
                );
              } finally {
                setEditSubmitting(false);
              }
            }}
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
          >
            <h3 id="modal-editar-dificuldade-titulo" className="text-lg font-bold text-[#202124]">
              Editar relato de dificuldade
            </h3>

            <label className="mt-4 block text-xs font-semibold text-gray-700">
              Unidade da ementa
              <select
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-[#202124]"
              >
                {syllabusUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
                <option value="__OUTRO__">Outro tópico específico</option>
              </select>
            </label>

            {editUnit === "__OUTRO__" && (
              <label className="mt-3 block text-xs font-semibold text-gray-700">
                Nome do tópico
                <input
                  type="text"
                  maxLength={120}
                  value={editCustomTopic}
                  onChange={(e) => setEditCustomTopic(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-[#202124]"
                />
              </label>
            )}

            <div className="mt-3">
              <span className="block text-xs font-semibold text-gray-700">Nível de dificuldade</span>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {(["CRITICO", "ALTO", "MODERADO"] as DifficultyLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEditSeverity(level)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                      editSeverity === level
                        ? "border-[#5B4BDB] bg-[#EDE9FD] text-[#5B4BDB]"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {DIFFICULTY_LEVEL_CONFIG[level].label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-3 block text-xs font-semibold text-gray-700">
              Relato / dica de estudo
              <textarea
                rows={4}
                maxLength={DIFFICULTY_MAX_CHARS}
                value={editContent}
                onChange={(e) => {
                  setEditContent(e.target.value);
                  setEditError("");
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#5B4BDB]"
              />
            </label>

            {editError && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                {editError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={editSubmitting}
                onClick={() => setEditingAlert(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="rounded-xl bg-[#5B4BDB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4938C4] disabled:opacity-50 cursor-pointer"
              >
                {editSubmitting ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>
      )}

      {deletingAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-apagar-dificuldade-titulo"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 id="modal-apagar-dificuldade-titulo" className="text-lg font-bold text-[#202124]">
              Apagar relato de dificuldade
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Tem certeza de que deseja apagar este relato permanentemente? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeletingAlert(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={async () => {
                  const numericId = Number(deletingAlert.id);
                  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
                    setDeletingAlert(null);
                    return;
                  }
                  setDeleteSubmitting(true);
                  try {
                    await deleteDifficultyAlert(numericId);
                    setAlerts((prev) => prev.filter((item) => item.id !== deletingAlert.id));
                    setDeletingAlert(null);
                    setTriageNotice({
                      kind: "approved",
                      text: "Relato de dificuldade apagado com sucesso.",
                    });
                  } catch (err) {
                    setTriageNotice({
                      kind: "error",
                      text:
                        err instanceof Error
                          ? err.message
                          : "Não foi possível apagar o relato.",
                    });
                    setDeletingAlert(null);
                  } finally {
                    setDeleteSubmitting(false);
                  }
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deleteSubmitting ? "Apagando..." : "Apagar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
