<p>
  <a href="https://unb-mds.github.io/2026-02-TambureteiUnB/">
    <img src="docs/assets/banner-readme.svg" alt="Tamburetei UnB" height="72" />
  </a>
</p>

[![CI](https://github.com/unb-mds/2026-02-TambureteiUnB/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/unb-mds/2026-02-TambureteiUnB/actions/workflows/ci.yml) [![Deploy](https://img.shields.io/badge/Deploy-tambureteiunb.com.br-2ECC71?style=flat&logo=vercel&logoColor=white)](https://tambureteiunb.com.br/disciplinas) [![Docs](https://img.shields.io/badge/Docs-Portal_MkDocs-6C5CE7?style=flat&logo=materialformkdocs&logoColor=white)](https://unb-mds.github.io/2026-02-TambureteiUnB/) [![Licença MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-9385F7?style=flat)](LICENSE) ![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.12-009688?style=flat&logo=fastapi&logoColor=white) ![Next.js](https://img.shields.io/badge/Next.js_16-React_19-111827?style=flat&logo=nextdotjs&logoColor=white) ![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat&logo=postgresql&logoColor=white)

O **Tamburetei UnB** é uma plataforma aberta para explorar indicadores de aprovação, evasão, matrizes curriculares e relatos colaborativos das disciplinas da Universidade de Brasília (UnB), com conformidade **LGPD (*Privacy by Design*)**.

[Aplicação em Produção](https://tambureteiunb.com.br/disciplinas) · [Sobre](#sobre-o-projeto) · [Documentação](https://unb-mds.github.io/2026-02-TambureteiUnB/) · [Como Executar](#como-executar-o-projeto-localmente) · [Testes](#como-rodar-os-testes) · [Como Contribuir](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

---

## Sobre o Projeto

O **Tamburetei UnB** é um projeto de análise de dados acadêmicos que tem como objetivo disponibilizar informações sobre o desempenho dos estudantes da Universidade de Brasília de forma **aberta, organizada e reprodutível**.

O projeto trabalha com um **dataset anonimizado**, obtido por meio da **Lei de Acesso à Informação (LAI)**, do **SIGAA** e do **DPO/UnB**, reunindo em uma única plataforma:

* Taxas históricas de aprovação, reprovação (por nota e por falta) e trancamento por disciplina, além de estatísticas consolidadas por quórum;
* Indicadores de evasão institucional por curso e campus, fluxos curriculares, taxa de formação e notas de corte do PAS (Cebraspe);
* Hub colaborativo de disciplinas com ementas, pré-requisitos navegáveis, dificuldades da ementa e repositório de **materiais de apoio** (upload de PDF, PNG e JPG, resumos e links úteis com curadoria humana e triagem por IA local);
* **Comentários e discussões em *threads* sob pseudônimo** (*Privacy by Design*), com votos úteis e Central de Denúncias (`RN04`);
* **Planejamento semanal de grade (`/minha-grade`)** com detecção de conflitos e exportação em PDF, além da importação de histórico escolar do SIGAA (PDF) no perfil do estudante.

<p align="center">
  <img src="docs/assets/showcase.png" alt="Interface do Tamburetei UnB: Materiais de Apoio e Comunidade, Minha Grade e Estatísticas Históricas" width="100%" />
  <br />
  <em>Interface do Tamburetei UnB: repositório colaborativo de materiais e discussões, planejamento semanal de grade e painel de desempenho histórico.</em>
</p>

A proposta é transformar esses dados em informações que possam ser exploradas e analisadas de maneira transparente, permitindo uma melhor compreensão do desempenho acadêmico na UnB.

O projeto é inspirado no **Tamburetei**, desenvolvido pela OpenDevUFCG, que utiliza dados acadêmicos para produzir análises reprodutíveis por meio de notebooks.

### Público-Alvo

* **Visitantes e calouros:** consultam livremente indicadores históricos, notas de corte do PAS, grades curriculares, ementas, materiais públicos e comentários sem necessidade de cadastro.
* **Estudantes da UnB (autenticados):** registram situação nas disciplinas ("Já cursei"), contribuem com estatísticas de turmas, enviam materiais e comentários sob pseudônimo, importam o histórico do SIGAA e montam sua grade semanal.
* **Moderadores e curadores:** revisam materiais, comentários e denúncias (`RN04`) na fila administrativa, com apoio da triagem híbrida por IA local.

### Arquitetura em Camadas

<p align="center">
  <img src="docs/assets/arquitetura-readme.png" alt="Arquitetura em Camadas do Tamburetei UnB: Frontend Next.js 16, Backend FastAPI, Pipeline ETL, PostgreSQL 17 e Ollama Local" width="100%" />
</p>

### Links Oficiais do Projeto:
* **Ambiente em Produção:** [tambureteiunb.com.br](https://tambureteiunb.com.br/disciplinas)
* **Portal de Documentação Oficial (MkDocs):** [unb-mds.github.io/2026-02-TambureteiUnB](https://unb-mds.github.io/2026-02-TambureteiUnB/)
* **Protótipo de Interface (Figma):** [Template MDS — Grupo 9](https://www.figma.com/board/coZ3FgGpd5amxJxaanwaTr/Template-MDS---Grupo-9?node-id=2128-1592)
* **Referência Conceitual:** [Tamburetei — OpenDevUFCG](https://github.com/OpenDevUFCG/Tamburetei)

---

### Papéis e Governança

* **Scrum Master:** Thamires Ellen Souza Araujo — [@thamiresellensa](https://github.com/thamiresellensa)
* **Product Owner:** Lucas Miranda Souza — [@lucasssmira](https://github.com/lucasssmira)

O projeto concluiu os entregáveis da **Release 1 (R1)** (Pipeline de ETL e anonimização LGPD, modelagem relacional PostgreSQL 17, autenticação JWT e catálogo curricular) e consolidou na **Release 2 (R2)** o portal web em Next.js, doações colaborativas por quórum, upload e curadoria de materiais, Central de Denúncias (RN04), triagem híbrida por IA local (Ollama) e dashboard institucional.

---

## Equipe

Projeto desenvolvido colaborativamente para a disciplina de **Métodos de Desenvolvimento de Software (MDS)** da **Universidade de Brasília — Faculdade de Ciências e Tecnologias em Engenharia (FCTE / Gama)**.

| Nome                                 | GitHub                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Bruno Cauê Souza Lopes Oliveira      | [@bcaueLPS](https://github.com/bcaueLPS)                                               |
| Gabriel Di Angellis Basilio Ferreira | [@diangellis](https://github.com/diangellis)                                           |
| Luis Guilherme de Almeida Costa      | [@Luis-Guilherme-de-Almeida-Costa](https://github.com/LuisGuilherme67) |
| Lucas Miranda Souza                  | [@lucasssmira](https://github.com/lucasssmira)                                         |
| Luiza Carneiro Carvalho              | [@LuizaCarvalho691](https://github.com/LuizaCarvalho691)                               |
| Maria Vitória Queiroz Lima           | [@mariav-07](https://github.com/mariav-07)                                             |
| Thamires Ellen Souza Araujo          | [@thamiresellensa](https://github.com/thamiresellensa)                                 |


## Como Executar o Projeto Localmente

Siga o passo a passo abaixo para rodar todos os serviços do **Tamburetei UnB** em seu ambiente local.

### Pré-requisitos

Certifique-se de ter instalado em sua máquina:
* [Git](https://git-scm.com/)
* [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/)
* [Node.js](https://nodejs.org/) (versão 20 LTS ou 22 LTS recomendada) e [npm](https://www.npmjs.com/)

---

### 1. Clonar o Repositório

```bash
git clone https://github.com/unb-mds/2026-02-TambureteiUnB.git
cd 2026-02-TambureteiUnB
```

---

### 2. Configurar as Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto a partir do modelo de exemplo:

```bash
cp .env.example .env
```

> **Nota:** As configurações padrão no `.env.example` já vêm preparadas para o ambiente de desenvolvimento local (credenciais do banco PostgreSQL e chave secreta para tokens JWT).

*(Opcional)* Caso deseje configurar variáveis customizadas no frontend:
```bash
cd frontend
cp .env.example .env.local
cd ..
```

---

### 3. Iniciar o Backend e Banco de Dados (Docker)

Com o Docker em execução em sua máquina, suba os serviços em segundo plano:

```bash
docker compose up -d --build
```

Para verificar se todos os containers estão saudáveis e em execução:
```bash
docker compose ps
```

#### Serviços do Backend disponíveis:
* **API FastAPI (Swagger UI / Documentação Interativa):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **API OpenAPI Spec (JSON):** [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)
* **Adminer (Interface Web de Gerenciamento do Banco):** [http://localhost:8085](http://localhost:8085)
* **PostgreSQL:** `localhost:5432`

---

### 4. Iniciar o Frontend (Next.js)

Abra um terminal na pasta raiz do projeto e execute:

```bash
# 1. Entrar na pasta do frontend
cd frontend

# 2. Instalar as dependências do projeto
npm install

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

Assim que a inicialização for concluída, acesse no navegador:
* **Aplicação Web (Frontend):** [http://localhost:3000](http://localhost:3000)

---

### 5. Execução em Produção via Docker Compose

Para provisionar a stack completa em ambiente de produção ou homologação utilizando os contêineres otimizados:

```bash
# Subir backend, frontend e banco com a configuração de produção
docker compose -f docker-compose.prod.yml up -d --build
```

---

### 6. Migrações de Banco de Dados com Alembic

O esquema inicial de tabelas é provisionado automaticamente via `init.sql`. Caso necessite gerenciar ou aplicar migrações manuais com o Alembic:

```bash
# Aplicar migrações pendentes
docker compose exec backend alembic upgrade head

# Gerar nova migração após alterar modelos SQLAlchemy
docker compose exec backend alembic revision --autogenerate -m "descricao_da_mudanca"
```

> **Povoamento do Banco de Dados:**  
> Caso deseje popular o banco com datasets históricos reais da UnB, consulte as instruções detalhadas em [`docs/engenharia/pipeline_etl.md`](docs/engenharia/pipeline_etl.md) e [`docs/comecando/popular_banco_de_dados.md`](docs/comecando/popular_banco_de_dados.md).

---

## Como Rodar os Testes

### Testes do Backend (Pytest no Docker)
```bash
# Executar a suíte completa de testes
docker compose exec backend pytest -v

# Executar testes unitários
docker compose exec backend pytest tests/unit -v

# Executar testes de integração (autenticação, cursos, disciplinas, turmas)
docker compose exec backend pytest tests/integration -v

# Executar testes com relatório de cobertura de código
docker compose exec backend pytest --cov=app --cov-report=term-missing
```

### Testes e Verificação do Frontend
```bash
cd frontend

# Executar suíte de testes automatizados
npm test

# Verificação estática de tipos TypeScript
npx tsc --noEmit

# Executar o linter
npm run lint
```

---

## Comandos Úteis do Docker

```bash
# Ver logs em tempo real de todos os serviços (backend, db, adminer)
docker compose logs -f

# Ver logs apenas do backend
docker compose logs -f backend

# Parar todos os containers mantendo os dados persistidos no volume
docker compose down

# Parar e remover todos os containers e volumes (reset completo)
docker compose down -v
```

---

## Documentação do Projeto com MkDocs

A documentação detalhada de arquitetura, requisitos, modelagem e guias está organizada em subpastas de domínio dentro de `docs/` e publicada em [unb-mds.github.io/2026-02-TambureteiUnB](https://unb-mds.github.io/2026-02-TambureteiUnB/).

### Principais Documentos e Guias:
* **[Documento de Visão](docs/index.md):** Contexto do problema, objetivos, valor entregue, fluxo de navegação e escopo.
* **[Guia de Contribuição](CONTRIBUTING.md), [Como Contribuir](docs/comecando/como_contribuir.md) & [Código de Conduta](CODE_OF_CONDUCT.md):** Fluxo de branches, TDD, Conventional Commits, portas de qualidade do CI e diretrizes da comunidade.
* **[Gestão Ágil, Sprints e Rastreabilidade](docs/produto/gestao_agil.md) & [Histórico de Versões](CHANGELOG.md):** Story Map no Figma, atas de reunião, milestones e evolução consolidada por release.
* **[Requisitos do Sistema](docs/produto/requisitos.md) & [Regras de Negócio](docs/produto/regras_negocio.md):** Requisitos funcionais, não funcionais e políticas de governança e anonimização.
* **[Arquitetura do Sistema & ADRs](docs/engenharia/arquitetura.md):** Visão arquitetural C4, Clean Architecture, diagramas de sequência de ponta a ponta e registros de decisões arquiteturais (ADRs 01 a 08).
* **[Dicionário de Dados Relacional](docs/engenharia/banco_de_dados.md):** Mapa de relacionamentos e detalhamento dos esquemas do PostgreSQL 17 (17 tabelas + 1 Materialized View).
* **[Dashboard Institucional](docs/engenharia/dashboard_institucional.md) & [Autenticação e Comunidade](docs/engenharia/autenticacao_comunidade.md):** Contratos e regras de domínio do painel institucional (Épico 6), segurança JWT/RBAC e relatos sob pseudônimo.
* **[Pipeline de Dados & ETL](docs/engenharia/pipeline_etl.md) e [Como Popular o Banco](docs/comecando/popular_banco_de_dados.md):** Passo a passo para ingestão, anonimização e carga de dados de turmas, docentes e históricos.
* **[Guia de Desenvolvimento e Smoke Test](docs/comecando/desenvolvimento.md):** Configuração de ambiente, comandos de execução, linter, testes e roteiro de validação de fumaça (*smoke test*).
* **[Uso de IA & Governança de Agentes](docs/ai/ai_usage.md):** Diretrizes do `AGENTS.md`, skills do projeto e fluxo de trabalho assistido por IA.

Para visualizá-la e editá-la localmente com live-reload:

```bash
# Instalar dependências da documentação
pip install mkdocs mkdocs-material pymdown-extensions

# Iniciar o servidor local da documentação na porta 8001 (evitando conflito com o backend na 8000)
mkdocs serve -a localhost:8001
```
Acesse no seu navegador: [http://localhost:8001](http://localhost:8001).


## Fontes DPO/Anuário
* [Anuário Estatístico UnB 2025 (DPO)](https://repositoriodpo.unb.br/anuarios/anuario-estatistico-2025/) — caso deseje buscar por outro ano, basta alterar o ano na URL.

## Licença
Distribuído sob a [Licença MIT](LICENSE).

