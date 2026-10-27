export type MaterialType = "ARQUIVO" | "RESUMO" | "PROVA_ANTIGA" | "DICA";

export type MaterialFormat = "pdf" | "png" | "jpg";

export interface MaterialResponse {
  id: number;
  disciplina_id: number;
  titulo: string;
  tipo: MaterialType;
  formato: MaterialFormat;
  tamanho_bytes: number;
  status_moderacao: string;
  created_at: string;
}

export interface MaterialPageResponse {
  items: MaterialResponse[];
  total: number;
  pagina: number;
  tamanho_pagina: number;
}

export interface SelectedFileItem {
  id: string;
  file: File;
  title: string;
  type: MaterialType;
  error?: string;
}

export interface UploadProgressInfo {
  currentFileIndex: number;
  totalFiles: number;
  percent: number;
  loadedBytes: number;
  totalBytes: number;
}

export type UploadStatus = "idle" | "uploading" | "success" | "error";
