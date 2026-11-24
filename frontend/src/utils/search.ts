/**
 * Normaliza um termo de busca removendo acentos (diacríticos),
 * convertendo para minúsculas e removendo espaços excedentes nas extremidades.
 *
 * Permite que buscas como "calculo" correspondam a "Cálculo",
 * "quimica" a "Química", "fisica" a "Física", "algebra" a "Álgebra", etc.
 */
export function normalizeSearchTerm(term?: string | null): string {
  if (!term) return "";
  return term
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
