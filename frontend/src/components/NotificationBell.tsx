"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  listarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
} from "@/services/notificacaoService";
import type { NotificacaoItem } from "@/types/notificacao";

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `há ${diffDays} d`;
  return date.toLocaleDateString("pt-BR");
}

function getStatusAccent(tipo: string): { label: string; bg: string; text: string; border: string } {
  if (tipo.includes("APROVAD")) {
    return {
      label: "Aprovado",
      bg: "var(--status-success-bg)",
      text: "var(--status-success-text)",
      border: "var(--status-success-border)",
    };
  }
  if (tipo.includes("RECUSAD") || tipo.includes("OCULTAD")) {
    return {
      label: "Recusado",
      bg: "var(--status-danger-bg)",
      text: "var(--status-danger-text)",
      border: "var(--status-danger-border)",
    };
  }
  return {
    label: "Aviso",
    bg: "var(--status-neutral-bg)",
    text: "var(--status-neutral-text)",
    border: "var(--status-neutral-border)",
  };
}

export interface NotificationBellProps {
  initialItems?: NotificacaoItem[];
  initialUnread?: number;
  initialOpen?: boolean;
}

export default function NotificationBell({
  initialItems,
  initialUnread,
  initialOpen = false,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [items, setItems] = useState<NotificacaoItem[]>(initialItems ?? []);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnread ?? 0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchNotifications = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 15000) return;
    lastFetchRef.current = now;
    try {
      const data = await listarNotificacoes(30);
      setItems(data.items);
      setUnreadCount(data.nao_lidas);
    } catch {
      // Ignora falha silenciosa para nao interromper navegacao
    }
  }, []);

  useEffect(() => {
    if (initialItems !== undefined) return;
    const initialTimer = window.setTimeout(() => {
      void fetchNotifications(true);
    }, 0);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchNotifications(false);
      }
    }, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchNotifications(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchNotifications, initialItems]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleToggle() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && initialItems === undefined) {
      setLoading(true);
      await fetchNotifications(true);
      setLoading(false);
    }
  }

  function handleItemRead(item: NotificacaoItem) {
    if (!item.lida) {
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, lida: true } : it)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      void marcarNotificacaoLida(item.id).catch(() => {
        // Mantem navegacao fluida mesmo em erro transitorio
      });
    }
    setIsOpen(false);
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await marcarTodasNotificacoesLidas();
      setItems((prev) => prev.map((it) => ({ ...it, lida: true })));
      setUnreadCount(0);
    } catch {
      // Ignora erro transitorio
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => void handleToggle()}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={
          unreadCount > 0
            ? `Notificações (${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"})`
            : "Notificações"
        }
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-gray-600 transition-colors hover:border-[#EDE9FD] hover:bg-[#5B4BDB]/8 hover:text-[#5B4BDB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] cursor-pointer"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Central de notificações"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--color-text)",
          }}
          className="absolute right-0 z-50 mt-2 w-80 sm:w-96 origin-top-right overflow-hidden rounded-2xl border shadow-2xl"
        >
          <div
            style={{ borderColor: "var(--border)" }}
            className="flex items-center justify-between border-b px-4 py-3"
          >
            <div>
              <h3 className="text-sm font-bold">Notificações</h3>
              <p style={{ color: "var(--color-muted)" }} className="text-[11px]">
                {unreadCount > 0
                  ? `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`
                  : "Tudo lido por aqui"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markingAll}
                onClick={() => void handleMarkAllRead()}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-[#5B4BDB] hover:bg-[#5B4BDB]/10 disabled:opacity-50 cursor-pointer"
              >
                {markingAll ? "Marcando..." : "Marcar todas como lidas"}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p style={{ color: "var(--color-muted)" }} className="px-4 py-8 text-center text-xs">
                Carregando notificações...
              </p>
            ) : items.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-semibold">Nenhuma notificação ainda</p>
                <p style={{ color: "var(--color-muted)" }} className="mt-1 text-xs leading-relaxed">
                  Quando seus materiais, comentários ou gráficos forem aceitos ou recusados pela moderação, você será avisado aqui.
                </p>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {items.map((item) => {
                  const accent = getStatusAccent(item.tipo);
                  const safeHref = item.link && item.link.startsWith("/") ? item.link : null;
                  const content = (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          style={{
                            backgroundColor: accent.bg,
                            color: accent.text,
                            borderColor: accent.border,
                          }}
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                        >
                          {accent.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: "var(--color-muted)" }} className="text-[11px]">
                            {formatRelativeDate(item.created_at)}
                          </span>
                          {!item.lida && (
                            <span
                              aria-label="Não lida"
                              className="h-2 w-2 rounded-full bg-[#5B4BDB]"
                            />
                          )}
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs font-bold leading-snug">{item.titulo}</p>
                      <p
                        style={{ color: "var(--color-muted)" }}
                        className="mt-1 text-xs leading-relaxed break-words"
                      >
                        {item.mensagem}
                      </p>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {safeHref ? (
                        <Link
                          href={safeHref}
                          onClick={() => handleItemRead(item)}
                          style={{
                            backgroundColor: item.lida ? "transparent" : "var(--primary-soft)",
                          }}
                          className="block w-full px-4 py-3 text-left transition-opacity hover:opacity-90"
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleItemRead(item)}
                          style={{
                            backgroundColor: item.lida ? "transparent" : "var(--primary-soft)",
                          }}
                          className="block w-full px-4 py-3 text-left transition-opacity hover:opacity-90 cursor-pointer"
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
