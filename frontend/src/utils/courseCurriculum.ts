/**
 * Mapeamento e utilitários para resolução de link oficial da Grade Curricular da UnB.
 */

// Mapeamento com links oficiais comprovadamente validos de cursos da UnB no SIGAA
// IDs verificados no catalogo publico de graduacao da UnB (sigaa.unb.br/sigaa/public/curso/lista.jsf?nivel=G)
export const OFFICIAL_CURRICULUM_LINKS: Record<string, string> = {
  // Cursos FGA / FCTE (Gama)
  "engenharia-de-software":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=414924",
  "engenharia-aeroespacial":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=414921",
  "engenharia-automotiva":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=414922",
  "engenharia-eletronica":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=414923",
  "engenharia-de-energia":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=414925",
  "engenharias-fga":
    "https://sigaa.unb.br/sigaa/public/curso/portal.jsf?lc=pt_BR&id=414920",
};

// URL de consulta pública geral do SIGAA quando não houver ID direto
export const SIGAA_COURSES_CONSULTATION_URL =
  "https://sigaa.unb.br/sigaa/public/curso/lista.jsf?nivel=G";

/**
 * Retorna o link oficial da grade curricular do curso na UnB.
 * Se o curso possuir `link_grade_oficial` no payload ou bater no mapa de slugs, retorna a URL específica;
 * Caso contrário, retorna o portal público oficial de graduação da UnB (SIGAA).
 */
export function getOfficialCurriculumUrl(course?: {
  slug?: string;
  link_grade_oficial?: string | null;
}): string {
  if (course?.link_grade_oficial && course.link_grade_oficial.trim().length > 0) {
    return course.link_grade_oficial;
  }

  if (course?.slug) {
    const slugKey = course.slug.toLowerCase().trim();
    if (OFFICIAL_CURRICULUM_LINKS[slugKey]) {
      return OFFICIAL_CURRICULUM_LINKS[slugKey];
    }
  }

  return SIGAA_COURSES_CONSULTATION_URL;
}
