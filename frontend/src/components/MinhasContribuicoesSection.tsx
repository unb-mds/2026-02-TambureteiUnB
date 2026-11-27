"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import EditMaterialModal from "./EditMaterialModal";
import { deleteMaterial, listMyMaterials } from "@/services/materialService";
import type { MeuMaterialResponse } from "@/types/material";

type FiltroStatus = "TODOS" | "PENDENTE" | "APROVADO" | "RECUSADO";

const STATUS_BADGE: Record<
  MeuMaterialResponse["status_curadoria"],
  { label: string; bg: string; text: string; border: string }
> = {
  PENDENTE: {
    label: "Aguardando moderação",
    bg: "var(--status-warning-bg)",
    text: "var(--status-warning-text)",
    border: "var(--status-warning-border)",
  },
  APROVADO: {
    label: "Aprovado",
    bg: "var(--status-success-bg)",
    text: "var(--status-success-text)",
    border: "var(--status-success-border)",
  },
  RECUSADO: {
    label: "Recusado",
    bg: "var(--status-danger-bg)",
    text: "var(--status-danger-text)",
    border: "var(--status-danger-border)",
  },
};

export default function MinhasContribuicoesSection() {
  const [materiais, setMateriais] = useState<MeuMaterialResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("TODOS");
  const [reloadTick, setReloadTick] = useState(0);

  const [editing, setEditing] = useState<MeuMaterialResponse | null>(null);
  const [deleting, setDeleting] = useState<MeuMaterialResponse | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listMyMaterials()
      .then((items) => {
        if (!cancelled) {
          setMateriais(items);
          setErro("");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErro(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar suas contribuições.",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const counts = {
    TODOS: materiais.length,
    PENDENTE: materiais.filter((m) => m.status_curadoria === "PENDENTE").length,
    APROVADO: materiais.filter((m) => m.status_curadoria === "APROVADO").length,
    RECUSADO: materiais.filter((m) => m.status_curadoria === "RECUSADO").length,
  };

  const filtrados =
    filtro === "TODOS"
      ? materiais
      : materiais.filter((m) => m.status_curadoria === filtro);

  return (
    <section
      aria-labelledby="minhas-contribuicoes-titulo"
      className="rounded-3xl border border-[#E8E6F8] bg-white p-5 shadow-xs sm:p-6 lg:p-7"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5B4BDB]">
            Materiais enviados por você
          </p>
          <h2
            id="minhas-contribuicoes-titulo"
            className="mt-1 text-xl font-bold text-[#202124] sm:text-2xl"
          >
            Minhas contribuições
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Acompanhe o status da curadoria humana dos seus envios, edite informações ou cancele materiais enviados por engano.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setReloadTick((v) => v + 1)}
          className="w-fit rounded-xl border border-[#D8D4F5] px-3.5 py-2 text-xs font-semibold text-[#5B4BDB] transition-colors hover:bg-[#F7F7FA] cursor-pointer"
        >
          Atualizar lista
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            { key: "TODOS", label: "Todos" },
            { key: "PENDENTE", label: "Pendentes" },
            { key: "APROVADO", label: "Aprovados" },
            { key: "RECUSADO", label: "Recusados" },
          ] as Array<{ key: FiltroStatus; label: string }>
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFiltro(item.key)}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              filtro === item.key
                ? "bg-[#5B4BDB] text-white shadow-xs"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span>{item.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                filtro === item.key
                  ? "bg-white/20 text-white"
                  : "border border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]"
              }`}
            >
              {counts[item.key]}
            </span>
          </button>
        ))}
      </div>

      {aviso && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800"
        >
          {aviso}
        </p>
      )}

      {erro && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
        >
          {erro}
        </p>
      )}

      <div className="mt-5">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Carregando suas contribuições...
          </p>
        ) : filtrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DDD9F1] p-6 text-center">
            <p className="text-sm font-semibold text-[#202124]">
              {materiais.length === 0
                ? "Você ainda não enviou materiais de apoio."
                : "Nenhum material encontrado neste filtro."}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Ao enviar provas anteriores, resumos ou links em qualquer disciplina, você poderá acompanhá-los por aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtrados.map((item) => {
              const badge = STATUS_BADGE[item.status_curadoria];
              const isLink = Boolean(item.url_origem);
              return (
                <article
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#EDE9FD] bg-white p-4 transition-all hover:border-[#D8D1FA]"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {item.disciplina_slug ? (
                        <Link
                          href={`/disciplinas/${item.disciplina_slug}`}
                          className="text-xs font-semibold text-[#5B4BDB] hover:underline"
                        >
                          {item.disciplina_nome}
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold text-[#5B4BDB]">
                          {item.disciplina_nome}
                        </span>
                      )}
                      <span
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          borderColor: badge.border,
                        }}
                        className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                      >
                        {badge.label}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-[#202124] break-words">
                      {item.titulo}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      {item.tipo} • {isLink ? "LINK EXTERNO" : (item.formato || "ARQUIVO").toUpperCase()} •{" "}
                      Enviado em {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </p>

                    {item.status_curadoria === "RECUSADO" && item.motivo_moderacao && (
                      <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                        <strong>Motivo da recusa:</strong> {item.motivo_moderacao}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    {item.status_curadoria !== "RECUSADO" && (
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#5B4BDB] hover:text-[#5B4BDB] cursor-pointer"
                      >
                        Editar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleting(item)}
                      className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      {item.status_curadoria === "PENDENTE" ? "Cancelar envio" : "Apagar"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <EditMaterialModal
        isOpen={Boolean(editing)}
        material={
          editing
            ? {
                id: editing.id,
                titulo: editing.titulo,
                tipo: editing.tipo,
                url_origem: editing.url_origem,
                status_curadoria: editing.status_curadoria,
              }
            : null
        }
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setAviso(
            updated.status_curadoria === "PENDENTE"
              ? "Material atualizado. Se a URL foi alterada, ele aguardará nova aprovação da moderação."
              : "Material atualizado com sucesso.",
          );
          setReloadTick((v) => v + 1);
        }}
      />

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-apagar-contribuicao-titulo"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 id="modal-apagar-contribuicao-titulo" className="text-lg font-bold text-[#202124]">
              {deleting.status_curadoria === "PENDENTE" ? "Cancelar envio" : "Apagar material"}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Tem certeza de que deseja remover <strong className="text-[#202124]">{deleting.titulo}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleting(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={async () => {
                  setDeleteBusy(true);
                  try {
                    await deleteMaterial(deleting.id);
                    setDeleting(null);
                    setAviso("Envio removido com sucesso.");
                    setReloadTick((v) => v + 1);
                  } catch (err) {
                    setDeleting(null);
                    setErro(
                      err instanceof Error
                        ? err.message
                        : "Não foi possível remover o material.",
                    );
                  } finally {
                    setDeleteBusy(false);
                  }
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deleteBusy ? "Removendo..." : "Confirmar remoção"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
