# 🏗️ Arquitetura Geral do Sistema — Tamburetei UnB

> **Documento Oficial de Engenharia de Software, Arquitetura e Decisões Técnicas (ADRs)**  
> **Disciplina:** Métodos de Desenvolvimento de Software (MDS 2026/2) — FCTE / Universidade de Brasília (UnB)  
> **Organização:** OpenDevUnB  
> **Versão:** 2.0 (Consolidada — Release 1 / Release 2)

---

## 1. Visão Geral e Macroarquitetura

O **Tamburetei UnB** adota uma arquitetura em camadas baseada no modelo **Cliente-Servidor desacoplado**, totalmente conteinerizado via **Docker**. A solução é dividida em quatro pilares fundamentais:

1. **Frontend (SPA / SSR)**: Desenvolvido em **Next.js 16** com **TypeScript** e **Tailwind CSS**, consumindo a API RESTful de forma assíncrona na porta `3000`.
2. **Backend (API RESTful)**: Construído com **FastAPI** (Python 3.12) na porta `8000`, estruturado segundo os princípios da **Clean Architecture** (*Separação Estrita de Responsabilidades*).
3. **Banco de Dados (Relacional)**: **PostgreSQL 17** na porta `5432`, gerenciado com migrações versionadas via **Alembic** e ORM **SQLAlchemy 2.0**.
4. **Pipeline de Dados (ETL & Anonimização)**: Módulos dedicados à extração, higienização ativa conforme a **LGPD** (*Privacy by Design*) e carga consolidada de indicadores acadêmicos oficiais (DPO/UnB, INEP e SIGAA).

### Diagrama Arquitetural Geral

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CAMADA DO CLIENTE (NAVEGADOR)                                  │
│                                                                                                  │
│   [ Usuário / Discente ]                                                                         │
│           │                                                                                      │
│           ▼ (Requisições HTTP / HTML / CSS / JS na porta 3000)                                   │
│   [ Frontend — Next.js 16 + React 19 + TypeScript ]                                              │
│       ├── App Router (src/app/: rotas de páginas /cursos, /disciplinas, /login)                  │
│       ├── Componentes Reutilizáveis (src/components/: Navbar, Pagination, FilterBar)             │
│       └── Cliente HTTP Desacoplado (src/services/: authService, disciplineService, courseService)│
└────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │
                                                 │ Chamadas Assíncronas RESTful / JSON
                                                 │ Cabeçalho: Authorization: Bearer <Token JWT>
                                                 │ Porta :8000
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           CAMADA DE APLICAÇÃO & API (BACKEND FASTAPI)                            │
│                                                                                                  │
│   1. Routers Declarativos (app/api/routers/): Validação de contratos via Pydantic Schemas        │
│          │                                                                                       │
│          ▼                                                                                       │
│   2. Segurança & Injeção de Dependências (app/api/deps.py): Verificação JWT e RBAC               │
│          │                                                                                       │
│          ▼                                                                                       │
│   3. Serviços de Domínio e Regras de Negócio (app/services/): Lógica pura (Clean Architecture)   │
│          │                                                                                       │
│          ▼                                                                                       │
│   4. Repositórios & Camada de Acesso a Dados (app/repositories/): Consultas SQLAlchemy 2.0       │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │
                                                 │ Conexões Pooladas / Sessões Transacionais
                                                 │ Porta :5432
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               CAMADA DE PERSISTÊNCIA & STORAGE                                   │
│                                                                                                  │
│   [ PostgreSQL 17 Oficial ] ◄────────────── [ Pipeline ETL & Anonimização (DPO / SIGAA) ]        │
│       ├── 14 Tabelas de Domínio                  ├── Extratores de Dados Oficiais                │
│       └── Controle Alembic (Revisão 007)         ├── Sanitizador LGPD (Privacy by Design)        │
│                                                  └── Carga em Lote (app.pipeline.cli)            │
│                                                                                                  │
│   [ Adminer Web UI (:8085) ] ──(Inspeção Local)──► [ PostgreSQL 17 ]                             │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Princípios Norteadores da Arquitetura:

1. **Clean Architecture e Baixo Acoplamento:** As regras de negócio e validações essenciais residem em camadas isoladas (`services/` e `domain/`), desprovidas de qualquer dependência direta de transporte web ou detalhes de infraestrutura.
2. **Anti-Sobre-Engenharia (*Keep It Simple*):** Rejeição explícita de componentes que elevem a complexidade de infraestrutura e manutenção sem ganho comprovado na escala da UnB, como caches externos (Redis) ou filas complexas (RabbitMQ/Celery) (ADR 01).
3. **Privacidade por Padrão (*Privacy by Design*):** Conformidade rigorosa com a LGPD, garantindo que nenhum dado institucional discente sensível (matrícula, CPF, IRA, e-mail pessoal) seja armazenado ou exibido na plataforma pública (ADR 05).
4. **Database-as-Code:** Nenhuma alteração estrutural direta no banco de dados; toda modificação de esquema é versionada através de migrações automáticas do Alembic (ADR 02).

---

## 2. Tecnologias Utilizadas (Tech Stack)

A seleção tecnológica priorizou maturidade, desempenho assíncrono, tipagem estática e reprodutibilidade:

### 🌐 Frontend
| Tecnologia | Versão | Propósito no Projeto |
| :--- | :--- | :--- |
| **Next.js** | 16.x | Framework React com App Router, renderização híbrida e rotas otimizadas |
| **React** | 19.x | Biblioteca de interfaces reativas baseadas em componentes |
| **TypeScript** | 5.x | Tipagem estática rigorosa para garantir consistência dos contratos de dados |
| **Tailwind CSS** | 4.x | Estilização utilitária de alto desempenho aderente ao Design System do Figma |
| **Fetch API / HttpClient** | Nativo | Cliente HTTP desacoplado com tratamento de erros de rede e injeção de tokens |

### ⚙️ Backend
| Tecnologia | Versão | Propósito no Projeto |
| :--- | :--- | :--- |
| **Python** | 3.12 | Linguagem principal do ecossistema de dados e backend |
| **FastAPI** | 0.115+ | Framework web assíncrono moderno com documentação OpenAPI/Swagger nativa |
| **SQLAlchemy** | 2.0+ | ORM de alta performance para mapeamento objeto-relacional com `selectinload` |
| **Pydantic** | 2.x | Validação robusta de schemas, tipagem e mensagens de erro em português |
| **Alembic** | 1.14+ | Controle e versionamento declarativo das migrações do banco de dados |
| **Python-Jose / Passlib** | 3.x / 1.7+ | Criptografia de senhas (bcrypt) e emissão de tokens JWT assinados |
| **Pytest** | 9.x | Framework de testes unitários e de integração com isolamento de fixtures |

### 🗄️ Dados e Infraestrutura
| Tecnologia | Versão | Propósito no Projeto |
| :--- | :--- | :--- |
| **PostgreSQL** | 17 | Sistema de gerenciamento de banco de dados relacional de missão crítica |
| **Adminer** | Latest | Interface gráfica web leve para gerenciamento e depuração do banco local (:8085) |
| **Docker & Docker Compose** | 3.8+ | Isolamento de contêineres e padronização do ambiente local e de produção |
| **MkDocs & ReadTheDocs** | Latest | Geração da documentação técnica e arquitetural estática via GitHub Pages |

---

## 3. Padrões de Projeto e Camadas de Software

O backend adota o padrão **Clean Architecture**, onde cada camada possui um contrato claro e inviolável:

```text
[Requisição HTTP] 
        ↓
1. Routers Declarativos (app/api/routers/)
        ↓ (Validação com Pydantic Schemas)
2. Serviços de Negócio (app/services/)
        ↓ (Entidades de Domínio e Regras)
3. Repositórios de Dados (app/repositories/)
        ↓ (Sessões SQLAlchemy 2.0)
4. Modelos e Tabelas (app/models/ & PostgreSQL)
```

1. **Camada de Transporte / API (`app/api/`):**
   * Routers divididos por domínio funcional (`auth.py`, `cursos.py`, `disciplinas.py`, `conteudos.py`, `comentarios.py`, `moderacao.py`).
   * Injeção de dependência via `FastAPI Depends` para sessões de banco e usuário autenticado (`deps.py`).
   * Schemas Pydantic em `app/schemas/` que validam os dados de entrada e formatam as saídas JSON.

2. **Camada de Serviços / Casos de Uso (`app/services/`):**
   * Orquestra a execução das regras de negócio (cálculo de taxas de aprovação, validação de quórum, moderação).
   * Totalmente desacoplada dos detalhes do protocolo HTTP ou da biblioteca de banco de dados.

3. **Camada de Domínio / Regras Puras (`app/domain/`):**
   * Funções matemáticas e algorítmicas puras (ex.: cálculo da taxa de evasão, verificação de conformidade ética).
   * Alvo prioritário de testes de mutação com o Mutmut.

4. **Camada de Acesso a Dados / Repositórios (`app/repositories/`):**
   * Encapsula as consultas SQL e interações com o ORM SQLAlchemy.
   * Utiliza carregamento prévio (`selectinload`) para evitar consultas N+1 ao acessar turmas e métricas de disciplinas.

5. **Camada de Modelos de Dados (`app/models/`):**
   * Declaração das tabelas e relacionamentos utilizando SQLAlchemy 2.0 Declarative Base.

---

## 4. Estrutura de Pastas do Repositório

```text
2026-02-TambureteiUnB/
├── docs/                      # Documentação técnica e arquitetural (MkDocs)
│   ├── arquitetura.md         # Arquitetura oficial, Clean Architecture e ADRs
│   ├── banco_de_dados.md      # Dicionário de dados relacional e esquemas
│   ├── desenvolvimento.md     # Guia do desenvolvedor e roteiro de smoke test
│   ├── pipeline_etl.md        # Documentação da pipeline de ingestão e LGPD
│   └── ...
├── backend/                   # API RESTful (FastAPI + Clean Architecture)
│   ├── app/
│   │   ├── api/               # Routers REST, dependências de autenticação
│   │   ├── core/              # Configurações de ambiente, segurança (JWT)
│   │   ├── domain/            # Regras de negócio puras (sem dependências externas)
│   │   ├── models/            # Modelos ORM do SQLAlchemy 2.0
│   │   ├── pipeline/          # Extratores e scripts de carga (DPO, SIGAA)
│   │   ├── repositories/      # Camada de abstração de dados (SQLAlchemy)
│   │   ├── schemas/           # Schemas de validação e serialização Pydantic
│   │   └── services/          # Serviços da aplicação e orquestração
│   ├── alembic/               # Migrações versionadas (Database-as-Code)
│   └── tests/                 # Suíte de testes automatizados com Pytest
│       ├── unit/              # Testes unitários (schemas, transformers, LGPD)
│       └── integration/       # Testes de integração de endpoints e autenticação
├── frontend/                  # Aplicação Web (Next.js 16 + React 19 + TypeScript)
│   ├── src/
│   │   ├── app/               # Rotas e páginas (App Router: /, /login, /cursos, /disciplinas)
│   │   ├── components/        # Componentes reutilizáveis (Navbar, Pagination, Button, Input)
│   │   ├── services/          # Serviços modulares de API (httpClient, auth, course, discipline)
│   │   └── types/             # Definições de tipos TypeScript do domínio
├── docker-compose.yml         # Orquestração local dos contêineres (db, backend, adminer)
├── init.sql                   # Esquema DDL inicial do PostgreSQL (baseline 007)
├── mkdocs.yml                 # Configuração do portal de documentação MkDocs
└── README.md                  # Apresentação do projeto e guia passo a passo
```

---

## 5. Comunicação entre Camadas e Fluxos de Integração

A integração entre Frontend, Backend e Banco de Dados segue contratos estritos RESTful sobre JSON com autenticação via cabeçalho HTTP:

```text
Frontend (Next.js :3000)
    │  HTTP REST / JSON (Header: Authorization: Bearer <JWT>)
    ▼
FastAPI Backend (:8000)
    │  SQLAlchemy 2.0 Pool de Conexões
    ▼
PostgreSQL 17 (:5432)
```

---

### Fluxo 1: Autenticação Stateless (JWT) e Controle de Acesso Baseado em Perfis (RBAC)

Demonstra o login do usuário, emissão de token assinado e acesso subsequente a rotas protegidas:

```text
[Usuário / Discente]
       │
       │ 1. Submete e-mail e senha no formulário (/login)
       ▼
[Frontend (Next.js)] ── 2. POST /auth/login { email, password } ──► [Backend API (FastAPI)]
                                                                           │
                                                                           │ 3. buscar_por_email(email)
                                                                           ▼
                                                                  [UsuarioRepository]
                                                                           │
                                                                           │ 4. SELECT * FROM usuarios WHERE email = ?
                                                                           ▼
                                                                  [PostgreSQL 17]
                                                                           │
                                                                           │ 5. Retorna registro (com password_hash e role)
                                                                           ▼
                                                                  [UsuarioRepository]
                                                                           │
                                                                           │ 6. Instância de Usuario
                                                                           ▼
[Backend API] ◄── 7. Valida hash bcrypt e gera Token JWT assinado ────────┘
       │
       │ 8. HTTP 200 OK { access_token, token_type: "bearer" }
       ▼
[Frontend (Next.js)]
       │
       │ 9. Armazena token em localStorage (tamburetei_auth_token)
       │
       ├── 10. GET /auth/me [Header: Authorization: Bearer <JWT>] ──► [Backend API]
       │                                                                    │
       │                                                                    │ 11. Valida assinatura e expiração
       │                                                                    ▼
       │ ◄── 12. HTTP 200 OK { id, nome, email, role } ─────────────────────┘
       │
       ▼
[Frontend: Atualiza Navbar e ativa sessão do usuário]
```

#### Detalhamento das Etapas:

| Passo | Origem | Destino | Ação / Carga de Dados | Resposta / Garantia |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Usuário | Frontend | Preenche credenciais na rota `/login` | Validação de campos obrigatórios no cliente |
| **2** | Frontend | Backend API | `POST /auth/login` com corpo JSON `{ email, password }` | Requisição assíncrona com `Content-Type: application/json` |
| **3-5** | Backend API | PostgreSQL | Consulta registro discente no banco por e-mail | Busca indexada via índice único `ix_usuarios_email` |
| **6-7** | Backend API | Core Security | Compara senha com hash `bcrypt` e gera token JWT | Token assinado com chave secreta contendo claims `sub` e `role` |
| **8-9** | Backend API | Frontend | Resposta HTTP `200 OK` com `access_token` | Token persistido sob a chave `tamburetei_auth_token` |
| **10-12**| Frontend | Backend API | `GET /auth/me` com `Authorization: Bearer <token>` | Injeção de dependência `get_current_user` valida e retorna perfil |

---

### Fluxo 2: Navegação Curricular e Consulta de Séries Históricas Analíticas

Ilustra a consulta de uma disciplina por slug com resolução de ementa, pré-requisitos navegáveis e métricas de aprovação:

```text
[Visitante / Estudante]
       │
       │ 1. Acessa página da disciplina por slug (/disciplinas/metodos-de-desenvolvimento-de-software)
       ▼
[Frontend (Next.js)] ── 2. GET /cadeiras/:slug ──► [Backend API (FastAPI)]
                                                          │
                                                          │ 3. obter_por_slug(slug)
                                                          ▼
                                                   [DisciplinaService]
                                                          │
                                                          │ 4. get_by_slug(slug) com selectinload
                                                          ▼
                                                   [DisciplinaRepository]
                                                          │
                                                          │ 5. SELECT * FROM disciplinas WHERE slug = ?
                                                          ▼
                                                   [PostgreSQL 17]
                                                          │
                                                          │ 6. Retorna disciplina, turmas e métricas históricas
                                                          ▼
                                                   [DisciplinaRepository]
                                                          │
                                                          │ 7. Monta resposta com pré-requisitos navegáveis
                                                          ▼
[Backend API] ◄── 8. DisciplinaResponse estruturado ──────┘
       │
       │ 9. HTTP 200 OK (Dados da disciplina, ementa, créditos e histórico)
       ▼
[Frontend (Next.js)]
       │
       │ 10. Renderiza banner oficial, taxas de aprovação e grade de pré-requisitos
       ▼
[Interface do Usuário]
```

#### Detalhamento das Etapas:

| Passo | Origem | Destino | Ação / Carga de Dados | Resposta / Garantia |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Visitante | Frontend | Acessa URL canônica da matéria | Roteamento dinâmico do App Router `[slug]` |
| **2** | Frontend | Backend API | `GET /cadeiras/{slug}` | Chamada RESTful desacoplada através do `disciplineService` |
| **3-5** | Backend API | PostgreSQL | Busca por slug via índice único `idx_disciplinas_slug` | Utiliza `selectinload` para evitar problema de N+1 queries |
| **6-7** | Repositório | Service | Carrega dados de turmas, docentes e indicadores | Resolve códigos de pré-requisitos para links navegáveis |
| **8-9** | Backend API | Frontend | HTTP `200 OK` serializado via Pydantic | Contrato de dados validado com tipos TypeScript |
| **10**| Frontend | Visitante | Exibição visual dos componentes na página | Renderização de estatísticas com proteção LGPD |

---

### Fluxo 3: Doação Colaborativa Discente e Motor de Consenso (Quórum)

Demonstra a submissão de índices extraídos do SIGAA por um estudante e o processamento de quórum para consolidação estatística:

```text
[Estudante Autenticado]
       │
       │ 1. Preenche índices da turma no modal de doação (Aprovados + Reprovados + Trancados = 100%)
       ▼
[Frontend (Next.js)] ── 2. POST /turmas/{id}/doacoes [Bearer JWT] ──► [Backend API (FastAPI)]
                                                                             │
                                                                             │ 3. Pydantic valida consistência matemática
                                                                             ▼
                                                                     [DoacaoRepository]
                                                                             │
                                                                             │ 4. INSERT INTO doacoes_estatisticas (...)
                                                                             ▼
                                                                     [PostgreSQL 17]
                                                                             │
                                                                             │ 5. Avaliação do Motor de Consenso (Domínio)
                                                                             ▼
                                                                     [Motor de Consenso]
                                                                             │
               ┌─────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────┐
               │                                                                                                                       │
               ▼ (Quórum mínimo atingido com valores concordantes)                                                                     ▼ (Quórum pendente)
     [Grava Estatística Consolidada]                                                                                          [Registra doação individual]
     INSERT INTO metricas_consolidadas (...) ON CONFLICT DO UPDATE                                                            Aguardando novos envios
               │                                                                                                                       │
               └─────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                                                             ▼
[Frontend (Next.js)] ◄── 6. HTTP 201 Created { "status": "Doação registrada com sucesso" } ───────────────────────────────────────────┘
       │
       │ 7. Exibe modal de confirmação e atualiza badge de colaboração
       ▼
[Interface do Estudante]
```

#### Detalhamento das Etapas:

| Passo | Origem | Destino | Ação / Carga de Dados | Resposta / Garantia |
| :---: | :--- | :--- | :--- | :--- |
| **1-2** | Estudante | Backend API | `POST /turmas/{id}/doacoes` com token JWT discente | Validação de autenticação obrigatória via `get_current_user` |
| **3** | Backend API | Backend API | Valida percentuais com Pydantic | Garante que $\sum (\text{taxas}) = 100\%$ |
| **4** | Backend API | PostgreSQL | Persiste a contribuição associada ao usuário | Tabela protegida contra manipulação direta |
| **5** | Service | Domínio Puro | Avalia se a turma atingiu quórum de $N$ doações idênticas | Regra pura auditável e testada contra mutantes (Mutmut) |
| **6-7** | Backend API | Frontend | HTTP `201 Created` | Feedback imediato ao discente sem expor identidade de outros |

---

### Fluxo 4: Submissão Multipart, Curadoria e Download Seguro de Materiais

Apresenta o ciclo de vida completo de um material de apoio acadêmico (resumos, provas anteriores):

```text
[Estudante] ── 1. Envia formulário com PDF (< 5 MB) ──► [Frontend] ── 2. POST /disciplinas/{id}/materiais ──► [Backend API]
                                                                                                                   │
                                                                                                                   │ 3. Valida MIME, extensão e tamanho
                                                                                                                   ▼
                                                                                                          [Volume Docker /storage]
                                                                                                          Grava /storage/materiais/{uuid}.pdf
                                                                                                                   │
                                                                                                                   │ 4. INSERT com status 'PENDENTE'
                                                                                                                   ▼
                                                                                                          [PostgreSQL 17]
                                                                                                                   │
[Estudante] ◄── 5. HTTP 201 Created (Notifica envio e status em análise) ─────────────────────────────────────────┘

[Moderador] ── 6. Acessa fila de curadoria (/moderacao) ──► [Backend API] ── 7. Lista materiais com status 'PENDENTE'
                                                                  │
                                                                  │ 8. PATCH /moderacao/materiais/{id} status='APROVADO'
                                                                  ▼
                                                          [PostgreSQL 17] (Atualiza status para 'APROVADO')

[Usuário] ── 9. Solicita download do material ──► [Backend API: GET /materiais/{id}/download] ──► [Volume Docker]
                                                        │
                                                        │ 10. FileResponse com stream binário
                                                        ▼
[Navegador do Usuário: Inicia download direto do PDF sanitizado]
```

#### Detalhamento das Etapas:

| Passo | Origem | Destino | Ação / Carga de Dados | Resposta / Garantia |
| :---: | :--- | :--- | :--- | :--- |
| **1-2** | Estudante | Backend API | Envio `multipart/form-data` do arquivo | Exige token JWT e valida limite de 5 MB |
| **3** | Backend API | Volume Local | Sanitização do nome e geração de UUID seguro | Impede ataques de *Path Traversal* e injeção de arquivos |
| **4-5** | Backend API | PostgreSQL | Cria registro com `status_curadoria = 'PENDENTE'` | Material não é retornado em buscas públicas até aprovação |
| **6-8** | Moderador | Backend API | Curadoria por usuário com perfil `MODERATOR` ou `ADMIN` | Atualiza status via RBAC para `APROVADO` |
| **9-10**| Usuário | Backend API | Endpoint autenticado de download seguro | API entrega stream com tipo MIME correspondente |

---

### Fluxo 5: Relatos Comunitários sob Pseudônimo (*Alias*), Threads Aninhadas e Denúncias

Ilustra a publicação de comentários em árvore respeitando a regra de anonimato discente (RN01), com gatilho de moderação reativa por denúncias:

```text
[Estudante Autor] ── 1. Publica comentário (/comentarios) ──► [Backend API]
                                                                     │
                                                                     │ 2. Valida filtros éticos (palavras proibidas)
                                                                     ▼
                                                             [Domain / Ética]
                                                                     │
                                                                     │ 3. INSERT com autor_alias público
                                                                     ▼
                                                             [PostgreSQL 17]
                                                                     │
[Frontend] ◄── 4. HTTP 201 Created (Retorna relato com alias e oculta ID real) ─┘

[Estudante Denunciante] ── 5. Clica em "Denunciar Comentário" ──► [Backend API: POST /comentarios/{id}/denuncias]
                                                                        │
                                                                        │ 6. INSERT INTO denuncias
                                                                        │ 7. SELECT COUNT(*) FROM denuncias
                                                                        ▼
                                                                [PostgreSQL 17]
                                                                        │
        ┌───────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┐
        │                                                                                                                       │
        ▼ (Total de denúncias >= 3)                                                                                             ▼ (Total < 3)
[Oculta comentário automaticamente]                                                                                    [Mantém visível para análise]
UPDATE comentarios SET status_moderacao = 'OCULTO'                                                                     Registra notificação para moderador
        │                                                                                                                       │
        └───────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                                                        ▼
[Frontend: Confirma recebimento da denúncia e remove da visualização se ocultado]
```

#### Detalhamento das Etapas:

| Passo | Origem | Destino | Ação / Carga de Dados | Resposta / Garantia |
| :---: | :--- | :--- | :--- | :--- |
| **1-2** | Autor | Backend API | Submissão de texto com vínculo opcional a comentário pai | Validação ética e impedimento de identificação nominal |
| **3-4** | Backend API | PostgreSQL | Armazena autor interno para moderação e gera pseudônimo | Proteção por padrão (*Privacy by Design* / RN01) |
| **5-7** | Denunciante | Backend API | Submissão de denúncia fundamentada | Registro individual impedindo votos duplicados de denúncia |
| **8** | Backend API | PostgreSQL | Se limite $\ge 3$ for atingido, oculta imediatamente | Moderação reativa automática protegendo a comunidade |

---

## 6. Modelagem de Dados

A camada de persistência é estruturada no PostgreSQL 17 em torno de 14 tabelas canônicas e migrações versionadas via Alembic.

### Visão Estrutural por Módulos

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  MÓDULO DE ACESSO E SEGURANÇA:                                                           │
│  • usuarios                     (Contas, credenciais bcrypt e perfis RBAC)               │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  MÓDULO DE ESTRUTURA ACADÊMICA:                                                          │
│  • cursos                       (Metadados de graduação, campus e turnos)                │
│  • disciplinas                  (Cadastro canônico, ementas e pré-requisitos)            │
│  • cursos_disciplinas           (Matriz curricular N:N com natureza e semestres)        │
│  • professores                  (Cadastro do corpo docente)                              │
│  • turmas                       (Ofertas semestrais com horários e capacidades)          │
│  • turmas_professores           (Associação N:N entre turmas e múltiplos docentes)       │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  MÓDULO ANALÍTICO E ESTATÍSTICO:                                                         │
│  • metricas_academicas          (Séries históricas de aprovação/reprovação DPO/LAI)      │
│  • metricas_consolidadas        (Acumulado por matéria com supressão LGPD RN07)          │
│  • metricas_cursos              (Indicadores de fluxo, vagas e evasão do Censo INEP)     │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  MÓDULO COLABORATIVO E COMUNIDADE:                                                       │
│  • situacoes_disciplinas        (Crowdsourcing "Já cursei essa matéria")                 │
│  • conteudos                    (Materiais de estudo, provas e links úteis)              │
│  • comentarios                  (Discussões com pseudônimo e respostas aninhadas)        │
│  • votos_uteis                  (Upvotes de relevância da comunidade acadêmica)          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

> 📖 **Dicionário de Dados Completo e Detalhado:**  
> A especificação exaustiva de colunas, tipos, chaves estrangeiras, restrições de integridade e índices de cada tabela está documentada em [**Dicionário de Dados — Modelo Relacional**](banco_de_dados.md).

---

## 7. Matriz de Rastreabilidade Arquitetural (Histórias de Usuário $\leftrightarrow$ Componentes)

Mapeamento explícito entre os épicos de negócio e os componentes arquiteturais responsáveis por atendê-los:

| Épico de Negócio | Histórias de Usuário Relacionadas | Componentes Frontend (Next.js) | Componentes Backend (FastAPI) | Componentes Database (PostgreSQL 17) |
| :--- | :--- | :--- | :--- | :--- |
| **Épico 1: Autenticação e Segurança** | Backend: US 1.1.1, 1.1.2, 1.1.3<br>Frontend: US 1.1.1, 1.1.2<br>Database: US 1.1.1 | `/cadastro`, `/login`, `AuthContext`, `httpClient` | `api/routers/auth.py`, `core/security.py`, `services/auth_service.py` | Tabela `usuarios`, índice único `ix_usuarios_email` |
| **Épico 2: Gestão Curricular e Catálogo** | Backend: US 2.1.1, 2.2.1, 4.1.1, 4.1.2<br>Frontend: US 2.1.1, 2.1.2, 3.1.1<br>Database: US 2.1.1, 2.1.2 | `/disciplinas`, `/disciplinas/[slug]`, `Pagination`, cards de matérias | `api/routers/disciplinas.py`, `services/disciplina_service.py`, `repositories/disciplina_repo.py` | Tabelas `cursos`, `disciplinas`, `cursos_disciplinas`, `professores`, `turmas`, índices em `slug` e `codigo` |
| **Épico 3: Séries Históricas e Métricas** | Backend: US 3.1.1, 3.2.1, 3.2.2<br>Frontend: US 3.1.2, 4.1.1<br>Database: US 3.1.1, 4.1.1 | Seção de estatísticas em `/disciplinas/[slug]`, badges de aprovação | `api/routers/catalogo.py`, `services/disciplina_service.py`, `repositories/disciplina_repo.py` | Tabelas `metricas_academicas`, `metricas_consolidadas`, índice composto `(disciplina_id, ano)` |
| **Épico 4: Crowdsourcing ("Já cursei")** | Backend: RF06, RN02<br>Frontend: US 4.1.1<br>Database: US 4.1.1 | Componente de registro acadêmico em `/disciplinas/[slug]` | `api/routers/catalogo.py`, `services/situacao_service.py` | Tabela `situacoes_disciplinas` com constraint `UNIQUE(usuario_id, disciplina_id)` |
| **Épico 5: Conteúdos e Materiais** | Backend: US 5.2.1, 5.2.2, 5.2.3<br>Frontend: US 4.2.1, 4.2.2<br>Database: US 5.1.1 | Seção de materiais, botão de envio, listagem de recursos | `api/routers/conteudos.py`, `services/conteudo_service.py` | Tabelas `conteudos`, `votos_uteis`, volume Docker `/storage` |
| **Épico 6: Comunidade e Relatos** | Backend: US 5.1.1, 5.1.2, 5.1.3<br>Frontend: US 5.1.1<br>Database: US 5.1.2 | Seção de comentários aninhados sob pseudônimo (*alias*) | `api/routers/comentarios.py`, `services/comentario_service.py` | Tabela `comentarios` (auto-relacionamento `parent_id`) e `votos_uteis` |
| **Épico 7: Catálogo de Cursos e Métricas** | Backend: US 6.1.1, 6.2.1<br>Frontend: US 6.1.1<br>Database: RN08 | `/cursos`, `/cursos/[slug]`, filtros por campus (FGA, Darcy, FCE, FUP) | `api/routers/cursos.py`, `services/curso_service.py` | Tabelas `cursos`, `metricas_cursos`, índices por `campus` e `slug` |

---

## 8. Decisões Arquiteturais Registradas (ADRs)

### ADR 01: Rejeição de Redis e Bancos NoSQL
* **Status:** Aprovado / Ativo.
* **Contexto:** A plataforma exige respostas analíticas com tempo de resposta $< 300\text{ ms}$ e alta confiabilidade, sem sobrecarregar a infraestrutura local dos desenvolvedores ou a pipeline de CI/CD.
* **Decisão:** Não utilizar Redis, MongoDB nem filas complexas (RabbitMQ/Celery).
* **Justificativa:** O PostgreSQL 17 atende com folga aos requisitos de latência através de índices adequados `B-Tree` compostos e consultas indexadas. Evita sobre-engenharia (*over-engineering*) na disciplina.

### ADR 02: Database-as-Code com Alembic
* **Status:** Aprovado / Ativo.
* **Contexto:** Garantir a reprodutibilidade integral do esquema relacional entre todos os membros do time e nos ambientes automatizados de teste e integração contínua.
* **Decisão:** Toda e qualquer evolução do esquema do banco de dados deve ser executada exclusivamente por migrações versionadas do Alembic (`alembic revision --autogenerate`).
* **Justificativa:** É estritamente vedada a aplicação manual de comandos DDL ou scripts isolados fora do controle de versão.

### ADR 03: PostgreSQL 17 Oficial em Docker como SGBD Padrão
* **Status:** Aprovado / Ativo.
* **Contexto:** Necessidade de um SGBD relacional maduro, compatível com transações ACID, suporte nativo a UUID v4 e compressão de textos longos.
* **Decisão:** Adotar o contêiner oficial do PostgreSQL 17 orquestrado via Docker Compose.
* **Justificativa:** Estabilidade, tipagem estrita, compressão TOAST nativa para ementas longas e suporte assíncrono integral.

### ADR 04: Separação Estrita em Camadas (Clean Architecture) com Domínio Puro
* **Status:** Aprovado / Ativo.
* **Contexto:** As diretrizes da disciplina MDS 2026/2 exigem cobertura mínima de 70% de linhas no módulo de regras de negócio e escore mínimo de 50% de mutantes mortos no Mutmut.
* **Decisão:** As camadas de serviços e repositórios operam de forma isolada; funções puras de regras de negócio (cálculos de taxas, evasão, moderação) permanecem desvinculadas de transporte web.
* **Justificativa:** Permite testes unitários ultrarrápidos em milissegundos, viabiliza alta taxa de mutação com Mutmut e impede vazamento de lógica de negócio para a camada de transporte HTTP.

### ADR 05: Autenticação Stateless via JWT e Privacidade por Padrão (*Privacy by Design* / LGPD)
* **Status:** Aprovado / Ativo.
* **Contexto:** Proteção integral aos direitos de privacidade discente e cumprimento estrito da LGPD.
* **Decisão:** Não coletar nem armazenar matrícula, CPF ou histórico acadêmico nominal de estudantes. Autenticação puramente stateless baseada em tokens JWT. Exibição pública de relatos sob pseudônimo (`autor_alias`) e votos desvinculados de identidade nominal.
* **Justificativa:** Minimização radical de dados pessoais coletados e mitigação completa do risco de vazamento de dados discentes.

### ADR 06: Armazenamento Local Seguro de Arquivos com Streaming Controlado
* **Status:** Aprovado / Ativo.
* **Contexto:** Disponibilizar download de materiais de estudo em PDF/PNG/JPG sem depender de serviços externos de nuvem pagos (AWS S3, GCP Storage).
* **Decisão:** Armazenar os binários em volume Docker dedicado, validando tipo MIME e tamanho máximo (5 MB), e disponibilizar downloads através de endpoints autenticados da API com `FileResponse`.
* **Justificativa:** Mantém a aplicação 100% autossuficiente e reprodutível localmente via Docker, protegendo arquivos sob moderação contra acessos públicos diretos.

### ADR 07: Motor de Consenso e Quórum Colaborativo para Doações do SIGAA
* **Status:** Aprovado / Ativo.
* **Contexto:** A plataforma recebe doações de índices acadêmicos diretamente de estudantes e necessita consolidar dados confiáveis sem validação manual humana sobrecarregada.
* **Decisão:** Implementar um motor de consenso no domínio que agrupa doações idênticas por turma e semestre, consolidando a estatística oficial assim que um quórum mínimo parametrizado for alcançado.
* **Justificativa:** Permite curadoria algorítmica transparente, autônoma e à prova de fraudes para as estatísticas colaborativas.

---

## 9. Diretrizes de Qualidade e Próximas Etapas

1. **Reprodutibilidade em Contêineres:**
   * Qualquer funcionalidade deve subir e ser testável integralmente via:
     ```bash
     docker compose up -d --build
     ```
2. **Evolução do Banco de Dados:**
   * Sempre que novos modelos SQLAlchemy forem criados em `app/models/`, gerar a respectiva migração do Alembic:
     ```bash
     docker compose exec backend alembic revision --autogenerate -m "nome_da_migracao"
     docker compose exec backend alembic upgrade head
     ```
3. **Portas de Qualidade da Disciplina (MDS 2026/2):**
   * **Cobertura de Código:** Mínimo de **70% de cobertura** de linhas na camada de domínio e regras de negócio:
     ```bash
     docker compose exec backend pytest tests/unit -v --cov=app --cov-report=term-missing
     ```
   * **Escore de Mutação (Mutmut):** Mínimo de **50% de mutantes mortos** nas funções de regras de negócio:
     ```bash
     docker compose exec backend mutmut run
     ```
   * **Padrão de Commits:** Seguir rigorosamente a convenção *Conventional Commits* (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
