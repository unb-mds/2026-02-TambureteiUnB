import { Discipline, HistoricalPerformance } from "@/types/disciplina";

export const DEFAULT_HISTORICAL_PERFORMANCE: HistoricalPerformance[] = [
  { semester: "2023/1", approved: 72, failed: 18, absent: 7, withdrawn: 3 },
  { semester: "2023/2", approved: 76, failed: 16, absent: 5, withdrawn: 3 },
  { semester: "2024/1", approved: 74, failed: 17, absent: 6, withdrawn: 3 },
  { semester: "2024/2", approved: 81, failed: 12, absent: 4, withdrawn: 3 },
  { semester: "2025/1", approved: 79, failed: 14, absent: 5, withdrawn: 2 },
  { semester: "2025/2", approved: 84, failed: 10, absent: 4, withdrawn: 2 },
];

export const DISCIPLINES: Discipline[] = [
  {
    code: "FGA0138",
    name: "Métodos de Desenvolvimento de Software",
    slug: "fga0138-metodos-de-desenvolvimento-de-software",
    department: "FGA",
    departmentName: "Engenharias · Faculdade do Gama",
    campus: "FGA",
    campusFilter: "FGA (Gama)",
    area: "Tecnologia",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 78.4,
    failedGrade: 14.2,
    failedAttendance: 4.8,
    withdrawn: 2.6,
    resources: 31,
    popularity: 91,
    semester: "3º Semestre",
    type: "Obrigatória",
    ementa:
      "Processos de desenvolvimento de software e seus ciclos de vida. Métodos ágeis com ênfase em Scrum e Extreme Programming (XP). Planejamento iterativo e incremental, práticas colaborativas, gestão de requisitos, modelagem, integração contínua, testes de software e garantia da qualidade. Aplicação integrada dos métodos em um projeto prático desenvolvido em equipe.",
    objectives: [
      "Compreender e comparar ciclos de vida e processos de software.",
      "Planejar e conduzir projetos utilizando Scrum e práticas de XP.",
      "Elicitar requisitos e transformá-los em entregas incrementais.",
      "Aplicar testes, integração contínua e práticas de qualidade.",
      "Colaborar em equipes multidisciplinares com autonomia e responsabilidade.",
    ],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    preRequisitos: ["FGA0158 - Requisitos de Software", "CIC0004 - Algoritmos e Programação de Computadores"],
    equivalencias: ["CIC0201 - Engenharia de Software 1"],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "3º Semestre",
        type: "Obrigatória",
      },
    ],
  },
  {
    code: "FGA0158",
    name: "Requisitos de Software",
    slug: "fga0158-requisitos-de-software",
    department: "FGA",
    departmentName: "Engenharias · Faculdade do Gama",
    campus: "FGA",
    campusFilter: "FGA (Gama)",
    area: "Tecnologia",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 74,
    failedGrade: 17,
    failedAttendance: 6,
    withdrawn: 3,
    resources: 22,
    popularity: 88,
    semester: "3º Semestre",
    type: "Obrigatória",
    ementa:
      "Conceituação de requisitos. Tipos de requisitos. Engenharia de requisitos no ciclo de vida de desenvolvimento de software. Técnicas de elicitação, modelagem, especificação, verificação e validação de requisitos.",
    objectives: [
      "Compreender o papel dos requisitos no sucesso dos produtos de software.",
      "Dominar técnicas de elicitação (entrevistas, personas, questionários).",
      "Modelar requisitos tradicionais e histórias de usuário ágeis.",
      "Gerenciar rastreabilidade e mudanças de escopo durante o projeto.",
    ],
    historicalPerformance: [
      { semester: "2023/1", approved: 70, failed: 20, absent: 7, withdrawn: 3 },
      { semester: "2023/2", approved: 73, failed: 18, absent: 6, withdrawn: 3 },
      { semester: "2024/1", approved: 72, failed: 19, absent: 6, withdrawn: 3 },
      { semester: "2024/2", approved: 76, failed: 15, absent: 5, withdrawn: 4 },
      { semester: "2025/1", approved: 75, failed: 16, absent: 6, withdrawn: 3 },
      { semester: "2025/2", approved: 78, failed: 13, absent: 5, withdrawn: 4 },
    ],
    preRequisitos: ["CIC0004 - Algoritmos e Programação de Computadores"],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "3º Semestre",
        type: "Obrigatória",
      },
    ],
  },
  {
    code: "MAT0025",
    name: "Cálculo 1",
    slug: "mat0025-calculo-1",
    department: "MAT",
    departmentName: "Departamento de Matemática",
    campus: "Darcy Ribeiro",
    campusFilter: "Darcy Ribeiro",
    area: "Exatas",
    credits: "6 créditos • 90h",
    hours: 90,
    approval: 44,
    failedGrade: 37,
    failedAttendance: 12,
    withdrawn: 7,
    resources: 42,
    popularity: 98,
    semester: "1º Semestre",
    type: "Obrigatória",
    ementa:
      "Funções de uma variável real a valores reais. Limites e continuidade. A derivada e suas aplicações: taxas de variação, máximos e mínimos, esboço de gráficos e regra de L'Hôpital. A integral definida e o Teorema Fundamental do Cálculo. Aplicações da integral: áreas e volumes.",
    objectives: [
      "Calcular limites fundamentais e analisar continuidade.",
      "Determinar derivadas e aplicar regras de derivação.",
      "Resolver problemas de otimização e taxas relacionadas.",
      "Calcular integrais definidas e indefinidas.",
      "Aplicar o Teorema Fundamental do Cálculo na resolução de problemas práticos.",
    ],
    historicalPerformance: [
      { semester: "2023/1", approved: 42, failed: 40, absent: 11, withdrawn: 7 },
      { semester: "2023/2", approved: 45, failed: 36, absent: 12, withdrawn: 7 },
      { semester: "2024/1", approved: 43, failed: 38, absent: 12, withdrawn: 7 },
      { semester: "2024/2", approved: 46, failed: 35, absent: 11, withdrawn: 8 },
      { semester: "2025/1", approved: 44, failed: 37, absent: 12, withdrawn: 7 },
      { semester: "2025/2", approved: 47, failed: 34, absent: 11, withdrawn: 8 },
    ],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
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
  {
    code: "CIC0004",
    name: "Algoritmos e Programação de Computadores",
    slug: "cic0004-algoritmos-e-programacao-de-computadores",
    department: "CIC",
    departmentName: "Departamento de Ciência da Computação",
    campus: "Darcy Ribeiro",
    campusFilter: "Darcy Ribeiro",
    area: "Tecnologia",
    credits: "6 créditos • 90h",
    hours: 90,
    approval: 71,
    failedGrade: 18,
    failedAttendance: 7,
    withdrawn: 4,
    resources: 35,
    popularity: 96,
    semester: "1º Semestre",
    type: "Obrigatória",
    ementa:
      "Conceitos fundamentais de computação e algoritmos. Tipos de dados, variáveis, operadores e expressões. Estruturas de controle: seleção e repetição. Vetores e matrizes. Modularização e funções. Manipulação de arquivos e tipos estruturados.",
    objectives: [
      "Desenvolver raciocínio algorítmico estruturado.",
      "Implementar programas funcionais em linguagens estruturadas (C/Python).",
      "Manipular coleções e estruturas de dados básicas.",
      "Criar funções modulares e reutilizáveis.",
    ],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
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
  {
    code: "MAT0026",
    name: "Cálculo 2",
    slug: "mat0026-calculo-2",
    department: "MAT",
    departmentName: "Departamento de Matemática",
    campus: "Darcy Ribeiro",
    campusFilter: "Darcy Ribeiro",
    area: "Exatas",
    credits: "6 créditos • 90h",
    hours: 90,
    approval: 51,
    failedGrade: 33,
    failedAttendance: 10,
    withdrawn: 6,
    resources: 28,
    popularity: 94,
    semester: "2º Semestre",
    type: "Obrigatória",
    ementa:
      "Técnicas de integração. Sequências e séries numéricas. Séries de potências e séries de Taylor. Introdução às funções de várias variáveis reais e curvas no plano e no espaço.",
    objectives: [
      "Aplicar métodos avançados de integração por partes, frações parciais e substituição trigonométrica.",
      "Analisar convergência de sequências e séries.",
      "Representar funções analíticas em séries de potências.",
    ],
    historicalPerformance: [
      { semester: "2023/1", approved: 48, failed: 35, absent: 11, withdrawn: 6 },
      { semester: "2023/2", approved: 52, failed: 32, absent: 10, withdrawn: 6 },
      { semester: "2024/1", approved: 50, failed: 34, absent: 10, withdrawn: 6 },
      { semester: "2024/2", approved: 53, failed: 31, absent: 9, withdrawn: 7 },
      { semester: "2025/1", approved: 51, failed: 33, absent: 10, withdrawn: 6 },
      { semester: "2025/2", approved: 55, failed: 29, absent: 9, withdrawn: 7 },
    ],
    preRequisitos: ["MAT0025 - Cálculo 1"],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "2º Semestre",
        type: "Obrigatória",
      },
    ],
  },
  {
    code: "MAT0030",
    name: "Cálculo 3",
    slug: "mat0030-calculo-3",
    department: "MAT",
    departmentName: "Departamento de Matemática",
    campus: "Darcy Ribeiro",
    campusFilter: "Darcy Ribeiro",
    area: "Exatas",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 58,
    failedGrade: 27,
    failedAttendance: 9,
    withdrawn: 6,
    resources: 18,
    popularity: 87,
    semester: "3º Semestre",
    type: "Obrigatória",
    ementa:
      "Funções de várias variáveis: limites, continuidade, derivadas parciais, plano tangente e diferenciação. Regra da cadeia, derivadas direcionais e vetor gradiente. Máximos e mínimos e multiplicadores de Lagrange. Integrais múltiplas.",
    objectives: [
      "Calcular derivadas parciais e vetores gradientes.",
      "Determinar extremos locais e condicionados via multiplicadores de Lagrange.",
      "Calcular integrais duplas e triplas em diversos sistemas de coordenadas.",
    ],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    preRequisitos: ["MAT0026 - Cálculo 2"],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "3º Semestre",
        type: "Obrigatória",
      },
    ],
  },
  {
    code: "FGA0142",
    name: "Engenharia de Requisitos",
    slug: "fga0142-engenharia-de-requisitos",
    department: "FGA",
    departmentName: "Engenharias · Faculdade do Gama",
    campus: "FGA",
    campusFilter: "FGA (Gama)",
    area: "Tecnologia",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 78,
    failedGrade: 14,
    failedAttendance: 5,
    withdrawn: 3,
    resources: 19,
    popularity: 82,
    semester: "5º+",
    type: "Obrigatória",
    ementa:
      "Aprofundamento em processos e técnicas de engenharia de requisitos. Requisitos em contextos ágeis e dirigidos por modelos. Gerenciamento e ferramentas de rastreabilidade de requisitos em larga escala.",
    objectives: [
      "Conduzir negociação e priorização de requisitos complexos.",
      "Construir matrizes de rastreabilidade e verificar consistência de especificações.",
    ],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    preRequisitos: ["FGA0158 - Requisitos de Software"],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "5º+",
        type: "Obrigatória",
      },
    ],
  },
  {
    code: "MAT0031",
    name: "Probabilidade e Estatística Aplicada",
    slug: "mat0031-probabilidade-e-estatistica-aplicada",
    department: "MAT",
    departmentName: "Departamento de Matemática",
    campus: "Darcy Ribeiro",
    campusFilter: "Darcy Ribeiro",
    area: "Exatas",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 76,
    failedGrade: 16,
    failedAttendance: 5,
    withdrawn: 3,
    resources: 20,
    popularity: 85,
    semester: "3º Semestre",
    type: "Obrigatória",
    ementa:
      "Estatística descritiva. Probabilidade: definições, variáveis aleatórias discretas e contínuas. Distribuições teóricas. Inferência estatística: estimação por ponto e por intervalo, testes de hipóteses.",
    objectives: [
      "Calcular medidas resumo e interpretar dados estatísticos.",
      "Aplicar modelos de probabilidade para eventos do mundo real.",
      "Executar testes de hipóteses e intervalos de confiança.",
    ],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    preRequisitos: ["MAT0025 - Cálculo 1"],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "3º Semestre",
        type: "Obrigatória",
      },
    ],
  },
  {
    code: "FGA0164",
    name: "Qualidade de Software",
    slug: "fga0164-qualidade-de-software",
    department: "FGA",
    departmentName: "Engenharias · Faculdade do Gama",
    campus: "FGA",
    campusFilter: "FGA (Gama)",
    area: "Tecnologia",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 85,
    failedGrade: 9,
    failedAttendance: 4,
    withdrawn: 2,
    resources: 24,
    popularity: 86,
    semester: "5º+",
    type: "Obrigatória",
    ementa:
      "Modelos e normas de qualidade de software (ISO/IEC 25010, CMMI, MPS.BR). Métricas de produto e de processo. Revisões técnicas, inspeções e garantia da qualidade de software.",
    objectives: [
      "Avaliar a qualidade de software segundo métricas objetivas.",
      "Implementar processos de garantia da qualidade em projetos ágeis.",
    ],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    preRequisitos: ["FGA0138 - Métodos de Desenvolvimento de Software"],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "5º+",
        type: "Obrigatória",
      },
    ],
  },
  {
    code: "FGA0208",
    name: "Arquitetura e Desenho de Software",
    slug: "fga0208-arquitetura-e-desenho-de-software",
    department: "FGA",
    departmentName: "Engenharias · Faculdade do Gama",
    campus: "FGA",
    campusFilter: "FGA (Gama)",
    area: "Tecnologia",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 79,
    failedGrade: 14,
    failedAttendance: 4,
    withdrawn: 3,
    resources: 26,
    popularity: 89,
    semester: "4º Semestre",
    type: "Obrigatória",
    ementa:
      "Padrões de projeto (GoF, GRASP). Arquiteturas em camadas, microsserviços, hexagonal e orientada a eventos. Modelagem arquitetural com C4 Model e UML.",
    objectives: [
      "Projetar arquiteturas de software escaláveis e manuteníveis.",
      "Aplicar padrões de projeto de criação, estruturais e comportamentais.",
    ],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    preRequisitos: ["FGA0138 - Métodos de Desenvolvimento de Software"],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "4º Semestre",
        type: "Obrigatória",
      },
    ],
  },
  {
    code: "FIS0010",
    name: "Física 1",
    slug: "fis0010-fisica-1",
    department: "IF",
    departmentName: "Instituto de Física",
    campus: "Darcy Ribeiro",
    campusFilter: "Darcy Ribeiro",
    area: "Exatas",
    credits: "6 créditos • 90h",
    hours: 90,
    approval: 47,
    failedGrade: 35,
    failedAttendance: 11,
    withdrawn: 7,
    resources: 27,
    popularity: 89,
    semester: "2º Semestre",
    type: "Obrigatória",
    ementa:
      "Cinemática e dinâmica da partícula. Leis de Newton. Trabalho, energia e conservação da energia mecânica. Momento linear e colisões. Rotação de corpos rígidos e momento angular.",
    objectives: [
      "Aplicar as Leis de Newton para resolver problemas de movimento.",
      "Analisar sistemas conservativos e não-conservativos via princípios de energia.",
    ],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    preRequisitos: ["MAT0025 - Cálculo 1"],
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "2º Semestre",
        type: "Obrigatória",
      },
    ],
  },
  {
    code: "IF1001",
    name: "Fundamentos de Sistemas de Informação",
    slug: "if1001-fundamentos-de-sistemas-de-informacao",
    department: "IF",
    departmentName: "Instituto de Física / Informática",
    campus: "Darcy Ribeiro",
    campusFilter: "Darcy Ribeiro",
    area: "Tecnologia",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 88,
    failedGrade: 7,
    failedAttendance: 3,
    withdrawn: 2,
    resources: 15,
    popularity: 77,
    semester: "2º Semestre",
    type: "Optativa",
    ementa:
      "Visão geral dos sistemas de informação nas organizações. Tecnologias de hardware, software, bancos de dados e telecomunicações. Segurança da informação e governança de TI.",
    objectives: [
      "Compreender a integração entre estratégias organizacionais e sistemas computacionais.",
    ],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    courses: [
      {
        name: "Engenharia de Software",
        slug: "engenharia-de-software",
        semester: "2º Semestre",
        type: "Optativa",
      },
    ],
  },
  {
    code: "FCE0001",
    name: "Anatomia Humana Aplicada",
    slug: "fce0001-anatomia-humana-aplicada",
    department: "FCE",
    departmentName: "Faculdade de Ceilândia",
    campus: "FCE",
    campusFilter: "FCE (Ceilândia)",
    area: "Saúde",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 83,
    failedGrade: 11,
    failedAttendance: 4,
    withdrawn: 2,
    resources: 18,
    popularity: 84,
    semester: "1º Semestre",
    type: "Obrigatória",
    ementa:
      "Estudo dos sistemas do corpo humano: esquelético, articular, muscular, circulatório, respiratório, digestório, urogenital e nervoso. Correlações anatômicas e funcionais.",
    objectives: [
      "Identificar estruturas anatômicas macroscópicas do corpo humano.",
      "Correlacionar a anatomia com funções fisiológicas fundamentais.",
    ],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    courses: [
      {
        name: "Enfermagem",
        slug: "enfermagem",
        semester: "1º Semestre",
        type: "Obrigatória",
      },
    ],
  },
  {
    code: "FUP0001",
    name: "Agroecologia e Desenvolvimento Sustentável",
    slug: "fup0001-agroecologia-e-desenvolvimento-sustentavel",
    department: "FUP",
    departmentName: "Faculdade de Planaltina",
    campus: "FUP",
    campusFilter: "FUP (Planaltina)",
    area: "Humanas",
    credits: "4 créditos • 60h",
    hours: 60,
    approval: 92,
    failedGrade: 4,
    failedAttendance: 2,
    withdrawn: 2,
    resources: 14,
    popularity: 80,
    semester: "2º Semestre",
    type: "Obrigatória",
    ementa:
      "Princípios conceituais da agroecologia. Manejo ecológico do solo e da água. Soberania alimentar e cadeias produtivas locais no Centro-Oeste brasileiro.",
    objectives: [
      "Analisar práticas sustentáveis na agricultura familiar e comunitária.",
    ],
    historicalPerformance: DEFAULT_HISTORICAL_PERFORMANCE,
    courses: [
      {
        name: "Gestão Ambiental",
        slug: "gestao-ambiental",
        semester: "2º Semestre",
        type: "Obrigatória",
      },
    ],
  },
];

export const GLOBAL_CAMPUSES = [
  "Todos os Campi",
  "Darcy Ribeiro",
  "FGA (Gama)",
  "FCE (Ceilândia)",
  "FUP (Planaltina)",
];

export const GLOBAL_AREAS = [
  "Todas",
  "Exatas",
  "Tecnologia",
  "Saúde",
  "Humanas",
];

export const GLOBAL_DEPARTMENTS = [
  "Todos os Departamentos",
  "FGA",
  "MAT",
  "CIC",
  "IF",
  "FCE",
  "FUP",
  "IQ",
];

export const SEMESTER_FILTERS = [
  "Todos",
  "1º Semestre",
  "2º Semestre",
  "3º Semestre",
  "4º Semestre",
  "5º+",
  "Optativas",
];

export function getDisciplineBySlug(slug: string): Discipline | undefined {
  const normalized = slug.trim().toLowerCase();
  return DISCIPLINES.find(
    (d) =>
      d.slug.toLowerCase() === normalized ||
      d.code.toLowerCase() === normalized ||
      d.slug.toLowerCase().startsWith(normalized)
  );
}

export function getDisciplinesByCourse(courseSlug: string): Discipline[] {
  const normalizedCourse = courseSlug.trim().toLowerCase();
  return DISCIPLINES.filter(
    (d) =>
      d.courses?.some((c) => c.slug.toLowerCase() === normalizedCourse) ||
      (normalizedCourse.includes("software") && d.campus === "FGA") ||
      (normalizedCourse.includes("computacao") && (d.department === "CIC" || d.department === "MAT"))
  );
}

export function searchDisciplines(
  query: string,
  campus = "Todos os Campi",
  department = "Todos os Departamentos",
  area = "Todas"
): Discipline[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

  return DISCIPLINES.filter((discipline) => {
    const searchable = `${discipline.name} ${discipline.code} ${discipline.departmentName} ${discipline.department}`.toLocaleLowerCase(
      "pt-BR"
    );
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    const matchesCampus =
      campus === "Todos os Campi" ||
      discipline.campusFilter === campus ||
      discipline.campus === campus;
    const matchesDepartment =
      department === "Todos os Departamentos" ||
      discipline.department === department;
    const matchesArea = area === "Todas" || discipline.area === area;

    return matchesQuery && matchesCampus && matchesDepartment && matchesArea;
  });
}

export default DISCIPLINES;
