"use client";

import React, { useState, useSyncExternalStore } from "react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import {
  changePassword,
  getStoredUser,
  subscribeAuthChange,
  updateUserName,
} from "@/services/authService";
import { ApiError } from "@/services/httpClient";

const NOME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;

export default function SecurityTabContent() {
  const storedName = useSyncExternalStore(
    subscribeAuthChange,
    () => getStoredUser()?.nome ?? "",
    () => ""
  );
  const [nomeEditado, setNomeEditado] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const nomeAtualInput = nomeEditado ?? storedName;

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizado = nomeAtualInput.trim().replace(/\s+/g, " ");
    if (normalizado.length < 3) {
      setNameFeedback({
        type: "error",
        message: "O nome deve ter no mínimo 3 caracteres.",
      });
      return;
    }
    if (normalizado.length > 100) {
      setNameFeedback({
        type: "error",
        message: "O nome deve ter no máximo 100 caracteres.",
      });
      return;
    }
    if (!NOME_REGEX.test(normalizado)) {
      setNameFeedback({
        type: "error",
        message: "O nome deve conter apenas letras e espaços.",
      });
      return;
    }
    if (normalizado === storedName.trim()) {
      setNameFeedback({
        type: "error",
        message: "Informe um nome diferente do atual para salvar.",
      });
      return;
    }

    setIsSavingName(true);
    setNameFeedback(null);
    try {
      const updated = await updateUserName(normalizado);
      setNomeEditado(updated.nome);
      setNameFeedback({
        type: "success",
        message: "Nome atualizado com sucesso!",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar seu nome.";
      setNameFeedback({ type: "error", message: msg });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senhaAtual) {
      setFeedback({ type: "error", message: "Informe sua senha atual." });
      return;
    }
    if (novaSenha.length < 8) {
      setFeedback({
        type: "error",
        message: "A nova senha deve possuir no mínimo 8 caracteres.",
      });
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setFeedback({
        type: "error",
        message: "A confirmação da nova senha não coincide.",
      });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await changePassword({
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
      });
      setFeedback({
        type: "success",
        message: res.message || "Senha alterada com sucesso!",
      });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Não foi possível alterar sua senha.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="max-w-xl">
        <h3 className="text-lg font-bold text-[#202124]">
          Nome de Exibição
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Altere o nome exibido no seu perfil e nos comentários que você publicar de forma identificada.
        </p>

        {nameFeedback && (
          <div
            role="alert"
            className={`mt-4 rounded-xl border p-4 text-xs font-medium ${
              nameFeedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {nameFeedback.message}
          </div>
        )}

        <form onSubmit={handleNameSubmit} className="mt-5 space-y-4">
          <Input
            label="Nome completo"
            type="text"
            id="profile-display-name"
            value={nomeAtualInput}
            onChange={(e) => {
              setNomeEditado(e.target.value);
              setNameFeedback(null);
            }}
            placeholder="Digite seu nome"
            maxLength={100}
            required
          />

          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSavingName}
            >
              Salvar novo nome
            </Button>
          </div>
        </form>
      </div>

      <hr className="border-gray-200" />

      <div className="max-w-xl">
        <h3 className="text-lg font-bold text-[#202124]">
          Alteração e Segurança de Senha
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Mantenha sua conta acadêmica segura definindo uma nova senha com pelo menos 8 caracteres, contendo maiúsculas, minúsculas, números e caracteres especiais.
        </p>

        {feedback && (
          <div
            role="alert"
            className={`mt-4 rounded-xl border p-4 text-xs font-medium ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Input
            label="Senha atual"
            type="password"
            id="current-password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            placeholder="Digite sua senha atual"
            required
          />
          <Input
            label="Nova senha"
            type="password"
            id="new-password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Mínimo de 8 caracteres"
            required
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            id="confirm-new-password"
            value={confirmarNovaSenha}
            onChange={(e) => setConfirmarNovaSenha(e.target.value)}
            placeholder="Repita a nova senha"
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
            >
              Salvar nova senha
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
