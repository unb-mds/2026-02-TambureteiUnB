"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { MaterialType, SelectedFileItem, UploadProgressInfo, UploadStatus } from "@/types/material";
import {
  validateFileFormat,
  validateFileSize,
  validateMaterialTitle,
  validateExternalUrl,
  formatFileSize,
  MAX_FILES_PER_BATCH,
} from "@/utils/fileValidation";
import { uploadMaterialsBatch } from "@/services/materialService";
import { isAuthenticated } from "@/services/authService";

export interface MaterialModalProps {
  isOpen: boolean;
  disciplineId?: number;
  disciplineSlug?: string;
  disciplineName: string;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

const TIPO_LABELS: Record<MaterialType, string> = {
  ARQUIVO: "Arquivo Geral",
  RESUMO: "Resumo / Notas de Estudo",
  PROVA_ANTIGA: "Enunciado de Prova Publica",
  DICA: "Dica de Estudo",
};

export default function MaterialModal({
  isOpen,
  disciplineId,
  disciplineSlug,
  disciplineName,
  onClose,
  onUploadSuccess,
}: MaterialModalProps) {
  const [activeTab, setActiveTab] = useState<"files" | "link">("files");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Estados de upload e progresso
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [progressInfo, setProgressInfo] = useState<UploadProgressInfo>({
    currentFileIndex: 0,
    totalFiles: 0,
    percent: 0,
    loadedBytes: 0,
    totalBytes: 0,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados da aba de Link Externo
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkType, setLinkType] = useState<MaterialType>("RESUMO");
  const [linkError, setLinkError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Resetar estados ao abrir/fechar modal
  const handleResetForm = useCallback(() => {
    setSelectedFiles([]);
    setGeneralError(null);
    setUploadStatus("idle");
    setProgressInfo({
      currentFileIndex: 0,
      totalFiles: 0,
      percent: 0,
      loadedBytes: 0,
      totalBytes: 0,
    });
    setSuccessMessage(null);
    setLinkUrl("");
    setLinkTitle("");
    setLinkError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClose = useCallback(() => {
    if (uploadStatus === "uploading") {
      if (confirm("O envio esta em andamento. Deseja realmente cancelar o upload?")) {
        abortControllerRef.current?.abort();
        setUploadStatus("idle");
        onClose();
      }
      return;
    }
    handleResetForm();
    onClose();
  }, [uploadStatus, handleResetForm, onClose]);

  // Fechar com tecla ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Processa novos arquivos selecionados ou soltos no dropzone
  const processIncomingFiles = (incomingList: FileList | File[]) => {
    setGeneralError(null);
    const filesArray = Array.from(incomingList);

    if (selectedFiles.length + filesArray.length > MAX_FILES_PER_BATCH) {
      setGeneralError(
        `Limite maximo de ${MAX_FILES_PER_BATCH} arquivos por envio atingido. Remova arquivos para adicionar novos.`
      );
      return;
    }

    const newItems: SelectedFileItem[] = [];

    for (const file of filesArray) {
      // Impede selecao duplicada do mesmo arquivo (mesmo nome e tamanho)
      const isDuplicate = selectedFiles.some(
        (item) => item.file.name === file.name && item.file.size === file.size
      );
      if (isDuplicate) {
        continue;
      }

      // Validação de formato (extensao e MIME)
      const formatValidation = validateFileFormat(file);
      // Validação de tamanho (0 a 5 MiB)
      const sizeValidation = validateFileSize(file);

      let itemError: string | undefined = undefined;
      if (!formatValidation.isValid) {
        itemError = formatValidation.error;
      } else if (!sizeValidation.isValid) {
        itemError = sizeValidation.error;
      }

      // Sugere título inicial a partir do nome do arquivo sem extensão
      const defaultTitle = file.name.replace(/\.[^/.]+$/, "").substring(0, 200);

      newItems.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        title: defaultTitle,
        type: "ARQUIVO",
        error: itemError,
      });
    }

    if (newItems.length === 0 && filesArray.length > 0) {
      setGeneralError("Os arquivos selecionados ja estavam na lista.");
      return;
    }

    setSelectedFiles((prev) => [...prev, ...newItems]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(e.target.files);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(e.dataTransfer.files);
    }
  };

  // Remover arquivo individualmente
  const handleRemoveFile = (idToRemove: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== idToRemove));
    setGeneralError(null);
  };

  // Atualizar título do arquivo individual
  const handleUpdateTitle = (id: string, newTitle: string) => {
    setSelectedFiles((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        // Se o erro for de título, revalida
        const titleValidation = validateMaterialTitle(newTitle);
        let error = item.error;
        if (!titleValidation.isValid) {
          error = titleValidation.error;
        } else {
          // Reconfere tamanho e formato
          const fv = validateFileFormat(item.file);
          const sv = validateFileSize(item.file);
          error = !fv.isValid ? fv.error : !sv.isValid ? sv.error : undefined;
        }

        return { ...item, title: newTitle, error };
      })
    );
  };

  // Atualizar tipo/categoria do arquivo individual
  const handleUpdateType = (id: string, newType: MaterialType) => {
    setSelectedFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, type: newType } : item))
    );
  };

  // Envio de arquivos
  const handleSubmitFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (uploadStatus === "uploading") return;

    if (!isAuthenticated()) {
      setGeneralError(
        "Acesso restrito: E necessario estar autenticado como estudante para compartilhar materiais. Faca login na sua conta."
      );
      return;
    }

    if (selectedFiles.length === 0) {
      setGeneralError("Selecione pelo menos um arquivo para realizar o envio.");
      return;
    }

    // Valida todos os arquivos antes de iniciar o envio
    let hasInvalid = false;
    const validatedFiles = selectedFiles.map((item) => {
      const formatVal = validateFileFormat(item.file);
      const sizeVal = validateFileSize(item.file);
      const titleVal = validateMaterialTitle(item.title);

      let error: string | undefined = undefined;
      if (!formatVal.isValid) {
        error = formatVal.error;
        hasInvalid = true;
      } else if (!sizeVal.isValid) {
        error = sizeVal.error;
        hasInvalid = true;
      } else if (!titleVal.isValid) {
        error = titleVal.error;
        hasInvalid = true;
      }

      return { ...item, error };
    });

    if (hasInvalid) {
      setSelectedFiles(validatedFiles);
      setGeneralError("Corrija os erros indicados nos arquivos antes de submeter o formulario.");
      return;
    }

    const disciplineTarget = disciplineId || disciplineSlug;
    if (!disciplineTarget) {
      setGeneralError("Identificador da disciplina nao localizado.");
      return;
    }

    setUploadStatus("uploading");
    setProgressInfo({
      currentFileIndex: 1,
      totalFiles: selectedFiles.length,
      percent: 0,
      loadedBytes: 0,
      totalBytes: selectedFiles.reduce((acc, it) => acc + it.file.size, 0),
    });

    abortControllerRef.current = new AbortController();

    try {
      await uploadMaterialsBatch({
        disciplineIdOrSlug: disciplineTarget,
        items: selectedFiles.map((it) => ({
          title: it.title,
          file: it.file,
          type: it.type,
        })),
        signal: abortControllerRef.current.signal,
        onProgress: (info) => {
          setProgressInfo(info);
        },
      });

      setUploadStatus("success");
      setSuccessMessage(
        `${selectedFiles.length} ${
          selectedFiles.length === 1 ? "material compartilhado" : "materiais compartilhados"
        } com sucesso! O conteúdo foi enviado para moderação e ficará disponível após aprovação.`
      );

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err: unknown) {
      setUploadStatus("error");
      const message =
        err instanceof Error ? err.message : "Ocorreu uma falha inesperada durante o upload.";
      setGeneralError(message);
    }
  };

  // Validação e submissão da aba de link externo
  const handleValidateLink = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);

    const titleVal = validateMaterialTitle(linkTitle);
    if (!titleVal.isValid) {
      setLinkError(titleVal.error || "Titulo invalido.");
      return;
    }

    const urlVal = validateExternalUrl(linkUrl);
    if (!urlVal.isValid) {
      setLinkError(urlVal.error || "URL invalida.");
      return;
    }

    // Alerta informativo: no backend atual (Feature 5.2), o endpoint implementado
    // atende estritamente a arquivos físicos via POST /cadeiras/{id}/materiais.
    setLinkError(
      "[PENDENCIA DE BACKEND] A API atual do backend disponibiliza apenas o endpoint multipart de arquivos fisicos (POST /cadeiras/{id}/materiais). A submissao de URLs externas estara disponivel assim que a rota correspondente de links for liberada no backend."
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-modal-title"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-[#EDE9FD] overflow-hidden my-auto">
        {/* Cabeçalho do modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FAF9FD]">
          <div>
            <h3 id="material-modal-title" className="font-bold text-lg text-[#202124]">
              Compartilhar Material de Apoio
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Disciplina: <strong className="text-[#5B4BDB]">{disciplineName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar modal"
            disabled={uploadStatus === "uploading"}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Abas: Arquivos / Link Externo */}
        <div className="flex border-b border-gray-100 px-6 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("files")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "files"
                ? "border-[#5B4BDB] text-[#5B4BDB]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Arquivos (PDF e Imagens)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("link")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "link"
                ? "border-[#5B4BDB] text-[#5B4BDB]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Adicionar Link Externo
          </button>
        </div>

        {/* Corpo do modal com scroll */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Mensagem geral de erro */}
          {generalError && (
            <div
              role="alert"
              className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium leading-relaxed"
            >
              <strong className="block mb-0.5">[ERRO]</strong>
              {generalError}
            </div>
          )}

          {/* Estado de Sucesso */}
          {uploadStatus === "success" ? (
            <div className="py-6 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-[#E9F9F3] text-[#067A59] flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 13L9 17L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h4 className="text-base font-bold text-[#202124] mb-2">[SUCESSO] Upload Concluido!</h4>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mb-6 leading-relaxed">
                {successMessage}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="rounded-xl border border-[#EDE9FD] px-4 py-2.5 text-xs font-semibold text-[#5B4BDB] hover:bg-[#EDE9FD]/40 cursor-pointer"
                >
                  Enviar outros materiais
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl bg-[#5B4BDB] px-5 py-2.5 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
                >
                  Concluir e fechar
                </button>
              </div>
            </div>
          ) : activeTab === "files" ? (
            /* Formulário da Aba de Arquivos */
            <form onSubmit={handleSubmitFiles} noValidate>
              {/* Dropzone / Área de seleção de arquivos */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (uploadStatus !== "uploading") {
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#5B4BDB] bg-[#EDE9FD]/30 scale-[0.99]"
                    : "border-gray-200 hover:border-[#5B4BDB]/60 bg-[#FBFBFE]"
                } ${uploadStatus === "uploading" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={handleFileInputChange}
                  disabled={uploadStatus === "uploading"}
                  className="hidden"
                  id="material-file-input"
                  aria-label="Selecionar arquivos para upload"
                />

                <div className="h-10 w-10 rounded-xl bg-[#EDE9FD] text-[#5B4BDB] flex items-center justify-center mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 16V4M12 4L8 8M12 4L16 8M4 20H20"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-[#202124] text-center">
                  Clique para selecionar ou arraste seus arquivos aqui
                </p>
                <p className="mt-1 text-[11px] text-gray-500 text-center">
                  Formatos aceitos: <strong>PDF, PNG, JPG ou JPEG</strong> (maximo de{" "}
                  <strong>5 MiB</strong> por arquivo, ate {MAX_FILES_PER_BATCH} arquivos por envio)
                </p>
              </div>

              {/* Lista de arquivos selecionados */}
              {selectedFiles.length > 0 && (
                <div className="mt-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                    <span>
                      Arquivos selecionados ({selectedFiles.length}/{MAX_FILES_PER_BATCH}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      disabled={uploadStatus === "uploading"}
                      className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Remover todos
                    </button>
                  </div>

                  {selectedFiles.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        item.error
                          ? "bg-red-50/50 border-red-200"
                          : "bg-white border-[#E8E6F8] shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-[#EDE9FD] text-[#5B4BDB]">
                              {item.file.name.split(".").pop() || "ARQ"}
                            </span>
                            <span className="text-xs font-semibold text-gray-800 truncate block">
                              {item.file.name}
                            </span>
                            <span className="text-[11px] text-gray-400 shrink-0">
                              ({formatFileSize(item.file.size)})
                            </span>
                          </div>

                          {/* Campo de título do arquivo */}
                          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-2">
                              <label
                                htmlFor={`title-${item.id}`}
                                className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1"
                              >
                                Titulo do material *
                              </label>
                              <input
                                id={`title-${item.id}`}
                                type="text"
                                value={item.title}
                                maxLength={200}
                                disabled={uploadStatus === "uploading"}
                                onChange={(e) => handleUpdateTitle(item.id, e.target.value)}
                                placeholder="Informe o título (1 a 200 caracteres)"
                                className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 focus:border-[#5B4BDB] focus:outline-none"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`type-${item.id}`}
                                className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1"
                              >
                                Categoria
                              </label>
                              <select
                                id={`type-${item.id}`}
                                value={item.type}
                                disabled={uploadStatus === "uploading"}
                                onChange={(e) =>
                                  handleUpdateType(item.id, e.target.value as MaterialType)
                                }
                                className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1.5 bg-white focus:border-[#5B4BDB] focus:outline-none"
                              >
                                <option value="ARQUIVO">Arquivo Geral</option>
                                <option value="RESUMO">Resumo</option>
                                <option value="PROVA_ANTIGA">Prova Antiga</option>
                                <option value="DICA">Dica</option>
                              </select>
                            </div>
                          </div>

                          {/* Mensagem de erro específica do arquivo */}
                          {item.error && (
                            <p
                              role="alert"
                              className="mt-2 text-[11px] text-red-600 font-medium flex items-center gap-1"
                            >
                              <span>[INVALIDO] {item.error}</span>
                            </p>
                          )}
                        </div>

                        {/* Botão de remoção individual */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(item.id)}
                          disabled={uploadStatus === "uploading"}
                          aria-label={`Remover arquivo ${item.file.name}`}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 4L12 12M12 4L4 12"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Barra de progresso real via XMLHttpRequest */}
              {uploadStatus === "uploading" && (
                <div className="mt-5 rounded-2xl bg-[#FAF9FD] border border-[#EDE9FD] p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#5B4BDB] animate-pulse" />
                      Enviando material {progressInfo.currentFileIndex} de {progressInfo.totalFiles}...
                    </span>
                    <span className="text-[#5B4BDB] font-bold">{progressInfo.percent}%</span>
                  </div>

                  {/* Elemento de acessibilidade role="progressbar" */}
                  <div
                    role="progressbar"
                    aria-valuenow={progressInfo.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progresso de upload dos materiais"
                    className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden"
                  >
                    <div
                      className="bg-[#5B4BDB] h-full transition-all duration-150 ease-out rounded-full"
                      style={{ width: `${progressInfo.percent}%` }}
                    />
                  </div>

                  <p className="mt-2 text-[11px] text-gray-500 text-right">
                    {formatFileSize(progressInfo.loadedBytes)} de{" "}
                    {formatFileSize(progressInfo.totalBytes)} transferidos
                  </p>
                </div>
              )}

              {/* Nota de Conduta Ética */}
              <div className="mt-5 rounded-xl bg-[#F7F7FA] border border-gray-100 p-3 text-[11px] text-gray-600 leading-relaxed">
                <span className="font-bold text-[#514A64] block mb-0.5">
                  [CONDUTA ETICA E REGRAS DA COMUNIDADE]
                </span>
                E terminantemente proibida a publicacao de gabaritos e resolucoes de atividades
                ativas vigentes (como testes ou relatorios semanais). Compartilhe apenas resumos
                conceituais e enunciados de avaliacoes anteriores.
              </div>

              {/* Botões de Ação */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={uploadStatus === "uploading"}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    uploadStatus === "uploading" ||
                    selectedFiles.length === 0 ||
                    selectedFiles.some((f) => !!f.error)
                  }
                  className="rounded-xl bg-[#5B4BDB] px-5 py-2.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                >
                  {uploadStatus === "uploading"
                    ? `Enviando (${progressInfo.percent}%)...`
                    : selectedFiles.length > 1
                    ? `Enviar ${selectedFiles.length} materiais`
                    : "Enviar Material"}
                </button>
              </div>
            </form>
          ) : (
            /* Formulário da Aba de Links Externos */
            <form onSubmit={handleValidateLink} noValidate>
              <div className="flex flex-col gap-3.5">
                <div>
                  <label
                    htmlFor="link-title"
                    className="block text-xs font-semibold text-[#202124] mb-1"
                  >
                    Titulo do Link *
                  </label>
                  <input
                    id="link-title"
                    type="text"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    maxLength={200}
                    placeholder="Exemplo: Playlist de Videoaulas de Derivadas"
                    className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2 focus:border-[#5B4BDB] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="link-url"
                    className="block text-xs font-semibold text-[#202124] mb-1"
                  >
                    URL do Link Externo *
                  </label>
                  <input
                    id="link-url"
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://exemplo.unb.br/recurso"
                    className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2 focus:border-[#5B4BDB] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    O link deve comecar com http:// ou https://
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="link-category"
                    className="block text-xs font-semibold text-[#202124] mb-1"
                  >
                    Categoria do Link
                  </label>
                  <select
                    id="link-category"
                    value={linkType}
                    onChange={(e) => setLinkType(e.target.value as MaterialType)}
                    className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2 bg-white focus:border-[#5B4BDB] focus:outline-none"
                  >
                    <option value="RESUMO">{TIPO_LABELS.RESUMO}</option>
                    <option value="DICA">{TIPO_LABELS.DICA}</option>
                    <option value="PROVA_ANTIGA">{TIPO_LABELS.PROVA_ANTIGA}</option>
                  </select>
                </div>

                {linkError && (
                  <div
                    role="alert"
                    className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed font-medium"
                  >
                    {linkError}
                  </div>
                )}

                <div className="rounded-xl bg-[#F7F7FA] border border-gray-100 p-3 text-[11px] text-gray-500 leading-relaxed">
                  [AVISO] Links compartilhados direcionam para repositorios e materiais abertos na
                  web e devem respeitar os direitos autorais.
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5B4BDB] px-5 py-2.5 text-xs font-semibold text-white hover:brightness-110 cursor-pointer shadow-xs"
                >
                  Adicionar Link
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export { MaterialModal };
