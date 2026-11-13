# Tamburetei UnB — Frontend

Interface web desenvolvida em Next.js 16 (App Router), React 19, TypeScript 5 e Tailwind CSS 4 para visualizacao de metricas academicas, catalogo de cursos e disciplinas, turmas ofertadas, colaboracao discente, curadoria/moderacao e exportacao de Dados Abertos da Universidade de Brasilia (UnB).

---

## Como Rodar o Projeto

### Pre-requisitos
- Node.js 18+ (recomendado Node.js 20+ para execucao nativa da suite de testes)
- npm

### 1. Instalar dependencias
```bash
npm install
```

### 2. Rodar em desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no navegador.

### 3. Scripts disponiveis
- `npm run dev`: Inicia o servidor de desenvolvimento Next.js
- `npm run build`: Gera o build de producao otimizado
- `npm run start`: Inicia a aplicacao em modo producao
- `npm run lint`: Executa a analise estatica com ESLint
- `npx tsc --noEmit`: Executa a verificacao estatica de tipos do TypeScript
- `npm test`: Executa a suite de testes unitarios de servicos, utilitarios e acessibilidade (`node --test`)

---

## Arquitetura de Pastas (`src/`)

```text
src/
├── app/                  # Rotas e paginas do Next.js (App Router)
│   ├── page.tsx          # Pagina inicial institucional e busca rapida
│   ├── login/            # Autenticacao discente e gestao de sessao JWT
│   ├── cadastro/         # Criacao de conta (Privacy by Design / RN01)
│   ├── cursos/           # Catalogo de cursos de graduacao e matriz curricular ([slug])
│   ├── disciplinas/      # Catalogo de disciplinas e Hub Modular da materia ([slug])
│   └── moderacao/        # Fila de Curadoria (RN06) e Central de Denuncias (RN04)
├── components/           # Componentes visuais modulares e acessiveis
├── services/             # Clientes HTTP desacoplados, regras de integracao e testes
│   └── __tests__/        # Testes unitarios da camada de servicos
├── types/                # Contratos e tipagens estaticas TypeScript do dominio
└── utils/                # Utilitarios de validacao de arquivos e acessibilidade (WCAG)
    └── __tests__/        # Testes unitarios de utilitarios e auditoria a11y
```

---

## Rotas da Aplicacao (`src/app/`)

- **`/` (`src/app/page.tsx`)**: Pagina inicial institucional com indicadores agregados, busca de disciplinas e atalhos para o catalogo.
- **`/login` e `/cadastro`**: Fluxos de autenticacao stateless via JWT com persistencia de sessao e conformidade com a LGPD (sem coleta de matricula ou CPF).
- **`/cursos` e `/cursos/[slug]`**: Listagem de cursos da UnB com filtro por campus (FCTE, Darcy Ribeiro, FCE, FUP) e visualizacao da matriz curricular por periodo.
- **`/disciplinas` (`src/app/disciplinas/page.tsx`)**: Catalogo paginado de disciplinas com busca textual, filtros por departamento/campus e barra de exportacao em Dados Abertos (`OpenDataExportBar`).
- **`/disciplinas/[slug]` (`src/app/disciplinas/[slug]/page.tsx`)**: Hub modular da disciplina reunindo:
  - Ementa oficial, creditos, carga horaria e pre-requisitos navegaveis;
  - Series historicas de aprovacao, reprovacao por nota, reprovacao por falta e trancamento com exportacao em CSV e JSON;
  - Listagem de turmas reais com filtros por turno e ordenacao;
  - Crowdsourcing discente ("Ja cursei" e doacao estatistica de turmas);
  - Painel de Dificuldades e Topicos Criticos (`DificuldadesPanel`);
  - Repositorio de Materiais de Apoio com upload multipart (`MaterialModal`), download autenticado e votos uteis;
  - Mural de relatos e comentarios sob pseudonimo (`autor_alias`) com suporte a respostas aninhadas e denuncias.
- **`/moderacao` (`src/app/moderacao/page.tsx`)**: Painel administrativo protegido por perfil (`MODERATOR` e `ADMIN`), dividido entre a Fila de Curadoria de Materiais (RN06) e a Central de Denuncias e Painel de Acoes (RN04).

---

## Componentes de Interface (`src/components/`)

### Turmas e Catalogo
- **`ClassCard` (`src/components/ClassCard.tsx`)**: Exibe os dados consolidados de cada turma ofertada (codigo, docente, horarios, local e ocupacao de vagas). Inclui badges semanticos por turno (Matutino/Diurno, Vespertino, Noturno), barra de progresso acessivel (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`) e alerta visual para turmas com vagas esgotadas.
- **`ClassCardSkeleton` (`src/components/ClassCardSkeleton.tsx`)**: Skeleton loader com dimensoes equivalentes ao `ClassCard` para prevencao de Cumulative Layout Shift (CLS).
- **`ClassFilters` (`src/components/ClassFilters.tsx`)**: Barra de filtros reativos por turno e ordenacao por codigo ou ocupacao.
- **`ClassEmptyState` (`src/components/ClassEmptyState.tsx`)**: Estado vazio para listagem de turmas sem oferta ou sem resultados para o filtro ativo.
- **`OpenDataExportBar` (`src/components/OpenDataExportBar.tsx`)**: Barra interativa para exportacao publica de conjuntos de dados analiticos em formatos CSV (UTF-8 com BOM) e JSON estruturado com metadados de proveniencia, com feedback de status via `aria-live="polite"`.

### Colaboracao, Conteudos e Dificuldades
- **`DificuldadesPanel` (`src/components/DificuldadesPanel.tsx`)**: Painel de topicos conceituais criticos da disciplina, exibindo nivel de incidencia, dicas de estudo, votacao de relevancia e submissao colaborativa.
- **`MaterialModal` (`src/components/MaterialModal.tsx`)**: Modal para submissao de materiais de apoio (links uteis, resumos, provas antigas, dicas e upload de arquivos PDF/PNG/JPG ate 5 MB), com validacao previa no cliente e aviso de curadoria (RN05 e RN06).
- **`GuestBanner` (`src/components/GuestBanner.tsx`)**: Banner contextual que orienta visitantes nao autenticados sobre como participar das funcionalidades colaborativas.

### Moderacao e Governanca (RN04 e RN06)
- **`ModerationCard` (`src/components/ModerationCard.tsx`)**: Card da fila de curadoria de arquivos pendentes, permitindo download privado para analise, aprovacao ou recusa com justificativa obrigatoria.
- **`DenunciaModerationCard` (`src/components/DenunciaModerationCard.tsx`)**: Card da Central de Denuncias com destaque de prioridade etica RN04 (protecao a docentes), exibicao de status de retencao preventiva e acionamento de decisao administrativa.
- **`ModerationActionModal` (`src/components/ModerationActionModal.tsx`)**: Modal de confirmacao para decisoes de moderacao (`EXCLUIR_CONTEUDO` ou `DESCARTAR_DENUNCIA`), com foco acessivel (`role="dialog"`, `aria-modal="true"`) e registro de justificativa.

### Navegacao e Design System Base
- **`Navbar` (`src/components/Navbar.tsx`)**: Barra de navegacao global responsiva com controle de sessao JWT e atalho condicional para `/moderacao` conforme perfil RBAC.
- **`Footer` (`src/components/Footer.tsx`)**: Rodape institucional com informacoes do projeto e links oficiais.
- **`Pagination` (`src/components/Pagination.tsx`)**: Controle de paginacao acessivel com calculo dinamico de paginas.
- **`Button` (`src/components/Button.tsx`)** e **`Input` (`src/components/Input.tsx`)**: Componentes atomicos de formulario com suporte a estados de carregamento, erro, rotulos semanticos e navegacao por teclado.
- **`StoolIllustration` (`src/components/StoolIllustration.tsx`)**: Ilustracao SVG tematica da identidade visual do Tamburetei UnB.

---

## Camada de Servicos e Utilitarios (`src/services/` e `src/utils/`)

### Servicos de Integracao e Dominio (`src/services/`)
- **`httpClient.ts`**: Cliente HTTP centralizado com injecao automatica de token JWT (`Authorization: Bearer`) e tratamento padronizado de erros da API FastAPI.
- **`authService.ts`**: Login, cadastro, consulta de perfil autenticado (`GET /auth/me`) e encerramento de sessao.
- **`courseService.ts`** e **`disciplineService.ts`**: Consulta de cursos, matrizes curriculares, catalogo de disciplinas, detalhes por slug, turmas e series historicas.
- **`materialService.ts`**: Listagem, envio multipart (`POST /cadeiras/{id}/materiais`), download protegido (`GET /materiais/{id}/download`) e controle de votos uteis.
- **`difficultyService.ts`**: Agregacao, ordenacao, submissao e votacao de topicos criticos e dificuldades da disciplina.
- **`moderacaoService.ts`**: Operacoes da fila de curadoria de materiais (`GET /moderacao/materiais`, `PATCH /moderacao/conteudos/{id}/curadoria`) e da Central de Denuncias (`POST /comunidade/denuncias`, `GET /moderacao/denuncias`, `PATCH /moderacao/denuncias/{id}`).
- **`openDataService.ts`**: Serializacao, escapamento RFC 4180 (CSV com BOM UTF-8), estruturacao de metadados de transparencia (JSON) e disparo de download de Dados Abertos de disciplinas e metricas historicas.

### Utilitarios (`src/utils/`)
- **`fileValidation.ts`**: Validacao no cliente de extensao, tipo MIME (`application/pdf`, `image/png`, `image/jpeg`) e limite de tamanho (5 MB) antes do upload.
- **`accessibilityValidator.ts`**: Validador de conformidade de acessibilidade (WCAG 2.1 AA / eMAG) para auditoria de formularios (associacao de `label`, `aria-invalid`, `aria-describedby`, prevencao de duplo envio), tabelas de dados (`caption`/`aria-label`, `th scope="col"`, estados vazios) e navegacao por teclado.

---

## Testes Automatizados

A suite de testes unitarios executa via runner nativo do Node.js com suporte a TypeScript (`npm test`) e cobre:
- `src/services/__tests__/difficultyService.test.ts`: Regras de ordenacao, filtragem e votacao de dificuldades;
- `src/services/__tests__/materialService.test.ts`: Contratos e listagem de materiais de apoio;
- `src/services/__tests__/moderacaoService.test.ts`: Fluxos de curadoria RN06, retencao preventiva e decisoes da Central de Denuncias RN04;
- `src/services/__tests__/openDataService.test.ts`: Geracao de CSV/JSON, escapamento de caracteres especiais e nomes canonicos de arquivos de Dados Abertos;
- `src/utils/__tests__/fileValidation.test.ts`: Regras de tamanho e tipos de arquivo permitidos;
- `src/utils/__tests__/accessibilityValidator.test.ts`: Auditoria de contratos de acessibilidade para formularios, tabelas e controles interativos.
