export const MATERIAL_MAX_BYTES = 5 * 1024 * 1024; // 5.242.880 bytes (5 MiB)
export const MAX_FILES_PER_BATCH = 5;

export const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg"] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const EXTENSION_TO_MIME: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function getFileExtension(filename: string): string {
  if (!filename || !filename.includes(".")) return "";
  const parts = filename.split(".");
  return (parts.pop() || "").trim().toLowerCase();
}

/**
 * Validação client-side de formato do arquivo.
 * Realiza checagem dupla: verifica tanto a extensão quanto o tipo MIME declarado,
 * garantindo coerência entre ambos.
 */
export function validateFileFormat(file: { name: string; type?: string }): ValidationResult {
  const extension = getFileExtension(file.name);

  if (!extension) {
    return {
      isValid: false,
      error: "O arquivo nao possui extensao identificavel.",
    };
  }

  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return {
      isValid: false,
      error: `Formato .${extension} nao permitido. Envie apenas arquivos PDF, PNG ou JPG/JPEG.`,
    };
  }

  const mime = (file.type || "").trim().toLowerCase();
  if (mime) {
    if (!ALLOWED_MIME_TYPES.includes(mime as AllowedMimeType)) {
      return {
        isValid: false,
        error: `Tipo MIME (${mime}) nao suportado. Envie apenas PDF, PNG ou JPG/JPEG.`,
      };
    }

    const expectedMimes = EXTENSION_TO_MIME[extension] || [];
    if (!expectedMimes.includes(mime)) {
      return {
        isValid: false,
        error: `Inconsistencia entre a extensao .${extension} e o tipo MIME declarado (${mime}).`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validação client-side de tamanho do arquivo.
 * Rejeita arquivos vazios (0 bytes) e arquivos que excedam 5 MiB (5.242.880 bytes).
 */
export function validateFileSize(file: { size: number }): ValidationResult {
  if (file.size <= 0) {
    return {
      isValid: false,
      error: "O arquivo esta vazio (0 bytes). Selecione um arquivo com conteudo valido.",
    };
  }

  if (file.size > MATERIAL_MAX_BYTES) {
    const formattedSize = formatFileSize(file.size);
    const formattedLimit = formatFileSize(MATERIAL_MAX_BYTES);
    return {
      isValid: false,
      error: `O arquivo tem ${formattedSize}, excedendo o limite permitido de ${formattedLimit} (5 MiB).`,
    };
  }

  return { isValid: true };
}

/**
 * Validação client-side do título do material.
 * Exige entre 1 e 200 caracteres apos remocao de espacos nas extremidades.
 */
export function validateMaterialTitle(title: string): ValidationResult {
  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: "O titulo e obrigatorio e nao pode conter apenas espacos em branco.",
    };
  }

  if (trimmed.length > 200) {
    return {
      isValid: false,
      error: `O titulo possui ${trimmed.length} caracteres, excedendo o limite de 200 caracteres.`,
    };
  }

  return { isValid: true };
}

/**
 * Validação client-side de links externos.
 * Exige formato valido com protocolo HTTP ou HTTPS.
 */
export function validateExternalUrl(url: string): ValidationResult {
  const trimmed = url.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: "Informe a URL do link externo.",
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        isValid: false,
        error: "A URL deve utilizar o protocolo http:// ou https://.",
      };
    }
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return {
        isValid: false,
        error: "Informe um endereco de dominio valido (exemplo: https://unb.br).",
      };
    }
  } catch {
    return {
      isValid: false,
      error: "Formato de URL invalido. Exemplo: https://repositorio.unb.br/documento.pdf",
    };
  }

  return { isValid: true };
}

/**
 * Utilitário para formatar tamanho em bytes para leitura humana (B, KB, MB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
