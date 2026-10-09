import { Discipline, DEFAULT_HISTORICAL_PERFORMANCE } from "@/types/disciplina";

export const MOCK_DISCIPLINAS: Record<string, Discipline> = {
  "calculo-1": {
    code: "MAT0025",
    name: "Cálculo 1",
    slug: "calculo-1",
    department: "MAT",
    departmentName: "Departamento de Matemática",
    campus: "Darcy Ribeiro",
    campusFilter: "Darcy Ribeiro",
    area: "Exatas",
    credits: "6 créditos • 90h",
    hours: 90,
    approval: 58.2,
    failedGrade: 26.5,
    failedAttendance: 8.3,
    withdrawn: 7.0,
    resources: 42,
    popularity: 98,
    semester: "1º Semestre",
    type: "Obrigatória",
    ementa:
      "Funções de uma variável real. Limites e continuidade. A derivada: definição, interpretação geométrica e regras de derivação. Aplicações da derivada: taxas de variação, máximos e mínimos. A integral: integral definida e Teorema Fundamental do Cálculo. Métodos de integração e aplicações ao cálculo de áreas.",
    objectives: [
      "Compreender os conceitos fundamentais de limites, continuidade e diferenciabilidade de funções.",
      "Aplicar regras de derivação na resolução de problemas práticos de otimização e taxas de variação.",
      "Dominar o Teorema Fundamental do Cálculo e as técnicas elementares de integração.",
      "Desenvolver rigor analítico e raciocínio matemático aplicados às ciências exatas e engenharias.",
    ],
    preRequisitos: ["Sem pré-requisitos"],
    equivalencias: ["FGA0123 - Cálculo 1 para Engenharia"],
    historicalPerformance: [
      { semester: "2023/1", approved: 55, failed: 28, absent: 10, withdrawn: 7 },
      { semester: "2023/2", approved: 59, failed: 25, absent: 9, withdrawn: 7 },
      { semester: "2024/1", approved: 57, failed: 27, absent: 9, withdrawn: 7 },
      { semester: "2024/2", approved: 63, failed: 22, absent: 8, withdrawn: 7 },
      { semester: "2025/1", approved: 58, failed: 26, absent: 9, withdrawn: 7 },
      { semester: "2025/2", approved: 64, failed: 21, absent: 8, withdrawn: 7 },
    ],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "1º Semestre",
        type: "Obrigatória",
      },
      {
        name: "Engenharia Aeroespacial",
        slug: "engenharia-aeroespacial",
        semester: "1º Semestre",
        type: "Obrigatória",
      },
      {
        name: "Ciência da Computação",
        slug: "ciencia-da-computacao",
        semester: "1º Semestre",
        type: "Obrigatória",
      },
    ],
  },
  "algoritmos-e-programacao-de-computadores": {
    code: "CIC0004",
    name: "Algoritmos e Programação de Computadores",
    slug: "algoritmos-e-programacao-de-computadores",
    department: "CIC",
    departmentName: "Departamento de Ciência da Computação",
    campus: "Darcy Ribeiro",
    campusFilter: "Darcy Ribeiro",
    area: "Tecnologia",
    credits: "6 créditos • 90h",
    hours: 90,
    approval: 68.4,
    failedGrade: 20.1,
    failedAttendance: 6.5,
    withdrawn: 5.0,
    resources: 56,
    popularity: 95,
    semester: "1º Semestre",
    type: "Obrigatória",
    ementa:
      "Introdução à computação e conceitos básicos de algoritmos. Estruturas sequenciais, condicionais e de repetição. Funções e passagem de parâmetros. Estruturas de dados homogêneas e heterogêneas: vetores, matrizes e registros. Noções de complexidade e testes de programas.",
    objectives: [
      "Aprender os conceitos estruturantes do pensamento algorítmico e resolução computacional de problemas.",
      "Implementar rotinas eficientes em linguagens de programação estruturadas (C e Python).",
      "Trabalhar com estruturas de dados básicas, vetores e matrizes para manipular informações.",
      "Desenvolver código legível, testável e com boas práticas de documentação de software.",
    ],
    preRequisitos: ["Sem pré-requisitos"],
    equivalencias: ["FGA0158 - Orientação a Objetos"],
    historicalPerformance: [
      { semester: "2023/1", approved: 65, failed: 22, absent: 8, withdrawn: 5 },
      { semester: "2023/2", approved: 68, failed: 20, absent: 7, withdrawn: 5 },
      { semester: "2024/1", approved: 66, failed: 21, absent: 8, withdrawn: 5 },
      { semester: "2024/2", approved: 72, failed: 17, absent: 6, withdrawn: 5 },
      { semester: "2025/1", approved: 70, failed: 18, absent: 7, withdrawn: 5 },
      { semester: "2025/2", approved: 75, failed: 15, absent: 6, withdrawn: 4 },
    ],
    courses: [
      {
        name: "Ciência da Computação",
        slug: "ciencia-da-computacao",
        semester: "1º Semestre",
        type: "Obrigatória",
      },
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "1º Semestre",
        type: "Obrigatória",
      },
    ],
  },
  "metodos-de-desenvolvimento-de-software": {
    code: "FGA0138",
    name: "Métodos de Desenvolvimento de Software",
    slug: "metodos-de-desenvolvimento-de-software",
    department: "FCTE",
    departmentName: "Faculdade de Ciência e Tecnologia em Engenharia",
    campus: "FCTE",
    campusFilter: "FCTE (Gama)",
    area: "Tecnologia",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 82.5,
    failedGrade: 11.2,
    failedAttendance: 3.8,
    withdrawn: 2.5,
    resources: 78,
    popularity: 99,
    semester: "3º Semestre",
    type: "Obrigatória",
    ementa:
      "Processos de desenvolvimento de software: ágeis (Scrum, Kanban, XP) e dirigidos por planos. Ciclo de vida de software. Engenharia de requisitos básica, modelagem ágil, desenvolvimento orientado a testes (TDD), integração contínua (CI/CD) e trabalho em equipe colaborativo.",
    objectives: [
      "Vivenciar a dinâmica real de desenvolvimento ágil de um produto de software em equipe.",
      "Aplicar práticas ágeis como Scrum, refinamentos, revisões e retrospectivas.",
      "Configurar pipelines automatizados de integração contínua e garantia da qualidade de código.",
      "Desenvolver habilidades de comunicação, liderança técnica e entrega contínua de valor discente.",
    ],
    preRequisitos: ["FGA0158 - Orientação a Objetos"],
    equivalencias: ["FGA0083 - Engenharia de Software"],
    historicalPerformance: [
      { semester: "2023/1", approved: 78, failed: 14, absent: 5, withdrawn: 3 },
      { semester: "2023/2", approved: 82, failed: 11, absent: 4, withdrawn: 3 },
      { semester: "2024/1", approved: 80, failed: 13, absent: 4, withdrawn: 3 },
      { semester: "2024/2", approved: 85, failed: 9, absent: 3, withdrawn: 3 },
      { semester: "2025/1", approved: 83, failed: 10, absent: 4, withdrawn: 3 },
      { semester: "2025/2", approved: 87, failed: 8, absent: 3, withdrawn: 2 },
    ],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "3º Semestre",
        type: "Obrigatória",
      },
    ],
  },
};

/**
 * Retorna uma disciplina simulada a partir do slug informado.
 * Se o slug for conhecido em MOCK_DISCIPLINAS, retorna seus dados pré-configurados.
 * Caso contrário, gera dinamicamente uma estrutura válida de disciplina compatível com a UI.
 */
export function getFallbackDiscipline(slug: string): Discipline {
  const normalizedSlug = slug.toLowerCase().trim();

  if (MOCK_DISCIPLINAS[normalizedSlug]) {
    return MOCK_DISCIPLINAS[normalizedSlug];
  }

  // Gera nome formatado caso o slug seja novo ou desconhecido
  const formattedName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    code: "DISC" + Math.floor(1000 + Math.random() * 9000),
    name: formattedName || "Disciplina Acadêmica",
    slug: normalizedSlug,
    department: "FCTE",
    departmentName: "Faculdade de Ciência e Tecnologia em Engenharia",
    campus: "FCTE",
    campusFilter: "FCTE (Gama)",
    area: "Tecnologia",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 76.8,
    failedGrade: 14.2,
    failedAttendance: 5.0,
    withdrawn: 4.0,
    resources: 18,
    popularity: 88,
    semester: "Período Regular",
    type: "Obrigatória",
    ementa: `Ementa oficial e matriz curricular referente à matéria ${formattedName}. Apresenta os conceitos estruturais, fundamentação teórica e aplicações práticas na formação do estudante da Universidade de Brasília.`,
    objectives: [
      "Compreender e consolidar conceitos fundamentais e teorias estruturantes da disciplina.",
      "Desenvolver raciocínio analítico e capacidade de aplicação em problemas do contexto acadêmico.",
      "Trabalhar com técnicas modernas e metodologias alinhadas às diretrizes do curso.",
      "Estimular a autonomia acadêmica e o pensamento crítico na Universidade de Brasília.",
    ],
    preRequisitos: ["Sem pré-requisitos"],
    equivalencias: [],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "Fluxo Sugerido",
        type: "Obrigatória",
      },
    ],
  };
}
