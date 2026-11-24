/**
 * Mapeamento e utilitários para resolução de link oficial da Grade Curricular da UnB.
 */

// Mapeamento com links oficiais conhecidos de cursos da UnB (SIGAA / Guia de Cursos / Portais Oficiais)
export const OFFICIAL_CURRICULUM_LINKS: Record<string, string> = {
  // Cursos FGA / FCTE
  "engenharia-de-software":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=414",
  "engenharia-aeroespacial":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=411",
  "engenharia-automotiva":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=412",
  "engenharia-eletronica":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=413",
  "engenharia-de-energia":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=415",
  "engenharias-fga":
    "https://sigaa.unb.br/sigaa/public/curso/portal.jsf?lc=pt_BR&id=410",

  // Darcy Ribeiro / Exatas & Tecnologia
  "ciencia-da-computacao":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=325",
  "computacao-licenciatura":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=326",
  "engenharia-de-computacao":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=327",
  "engenharia-eletrica":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=328",
  "engenharia-mecanica":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=330",
  "engenharia-civil":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=324",
  "engenharia-quimica":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=332",
  "engenharia-de-redes-de-comunicacao":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=331",
  "estatistica":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=333",
  "matematica":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=334",
  "fisica":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=335",
  "quimica":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=336",

  // Cursos FCE / Saúde
  "enfermagem":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=501",
  "fisioterapia":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=502",
  "farmacia":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=503",
  "terapia-ocupacional":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=504",
  "saude-coletiva":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=505",

  // FUP / Planaltina
  "gestao-ambiental":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=601",
  "ciencias-naturais":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=602",
  "licenciatura-em-educacao-do-campo":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=603",
  "gestao-do-agronegocio":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=604",

  // Darcy Ribeiro / Humanas & Sociais Aplicadas
  "administracao":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=101",
  "ciencias-economicas":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=102",
  "comunicacao-social":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=103",
  "direito":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=104",
  "psicologia":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=105",
  "relacoes-internacionais":
    "https://sigaa.unb.br/sigaa/public/curso/curriculo.jsf?lc=pt_BR&id=106",
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
