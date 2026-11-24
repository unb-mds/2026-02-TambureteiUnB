/**
 * Estrutura representativa de um item de pré-requisito normalizado.
 */
export interface PreRequisitoItem {
  codigo: string;
  nome: string;
  slug?: string;
  textoCompleto: string;
}

/**
 * Normaliza e formata itens de pré-requisitos para exibição rica e links de navegação.
 * Extrai o código da matéria (ex: 'MAT0025', 'FGA0158') a partir de strings formatadas
 * ou utiliza os dados estruturados de `pre_requisitos_itens`.
 */
export function formatPreRequisitos(
  preRequisitosItens?: Array<{ codigo: string; nome: string; slug?: string }>,
  preRequisitosStrings?: string[]
): PreRequisitoItem[] {
  const result: PreRequisitoItem[] = [];
  const seenCodes = new Set<string>();

  // 1. Itens estruturados vindos do backend
  if (preRequisitosItens && preRequisitosItens.length > 0) {
    for (const item of preRequisitosItens) {
      const code = item.codigo?.trim().toUpperCase();
      if (code && !seenCodes.has(code)) {
        seenCodes.add(code);
        result.push({
          codigo: code,
          nome: item.nome?.trim() || code,
          slug: item.slug || item.nome?.toLowerCase().replace(/\s+/g, "-"),
          textoCompleto: `${code} - ${item.nome?.trim() || code}`,
        });
      }
    }
  }

  // 2. Fallback de strings brutas (ex: "MAT0025 - CÁLCULO 1" ou apenas códigos)
  if (preRequisitosStrings && preRequisitosStrings.length > 0) {
    for (const raw of preRequisitosStrings) {
      if (!raw || typeof raw !== "string") continue;

      // Padrão de código de disciplina da UnB (ex: MAT0025, FGA0138, CIC0004)
      const codeMatch = raw.match(/\b([A-Z]{3}\d{4})\b/i);
      const code = codeMatch ? codeMatch[1].toUpperCase() : "";

      if (code && !seenCodes.has(code)) {
        seenCodes.add(code);
        const parts = raw.split("-");
        const nome = parts.length > 1 ? parts.slice(1).join("-").trim() : raw.trim();
        result.push({
          codigo: code,
          nome: nome || code,
          slug: code.toLowerCase(),
          textoCompleto: raw.trim(),
        });
      } else if (!code && !seenCodes.has(raw.trim())) {
        seenCodes.add(raw.trim());
        result.push({
          codigo: "",
          nome: raw.trim(),
          slug: undefined,
          textoCompleto: raw.trim(),
        });
      }
    }
  }

  return result;
}
