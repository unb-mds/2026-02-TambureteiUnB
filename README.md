<p align="center">
  <a href="https://unb-mds.github.io/2026-02-TambureteiUnB/">
    <img src="docs/assets/banner-readme.svg" alt="Tamburetei UnB" height="72" />
  </a>
</p>

# Tamburetei UnB

Plataforma aberta e colaborativa de inteligência acadêmica para análise de indicadores históricos de aprovação, fluxos curriculares, planejamento de grade e repositório comunitário de materiais da **Universidade de Brasília (UnB)**.

---

## Status e Links Rápidos

[![CI](https://github.com/unb-mds/2026-02-TambureteiUnB/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/unb-mds/2026-02-TambureteiUnB/actions/workflows/ci.yml)
[![Deploy](https://img.shields.io/badge/Deploy-tambureteiunb.com.br-2ECC71?style=flat&logo=cloudflare&logoColor=white)](https://tambureteiunb.com.br/)
[![Docs](https://img.shields.io/badge/Docs-Portal_MkDocs-6C5CE7?style=flat&logo=materialformkdocs&logoColor=white)](https://unb-mds.github.io/2026-02-TambureteiUnB/)
[![Licença MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-9385F7?style=flat)](./LICENSE)

* **Aplicação em Produção:** [https://tambureteiunb.com.br/](https://tambureteiunb.com.br/)
* **Portal de Documentação Completa:** [https://unb-mds.github.io/2026-02-TambureteiUnB/](https://unb-mds.github.io/2026-02-TambureteiUnB/)
* **Protótipo no Figma:** [Template MDS - Grupo 9](https://www.figma.com/board/coZ3FgGpd5amxJxaanwaTr/Template-MDS---Grupo-9?node-id=2128-1592)

---

## Como Executar o Projeto

### Pré-requisitos
* **Docker** (24+) e **Docker Compose**
* **Node.js** (20+ LTS) e **npm**
* *(Opcional)* Python 3.12+ para desenvolvimento local fora do container

### Passo a Passo Rápido (4 passos)

1. **Clonar e configurar o ambiente:**
   ```bash
   git clone https://github.com/unb-mds/2026-02-TambureteiUnB.git
   cd 2026-02-TambureteiUnB
   cp .env.example .env
   ```

2. **Subir os serviços de backend e banco (PostgreSQL 17, FastAPI e Adminer):**
   ```bash
   docker compose up -d --build
   ```

3. **Executar as migrações do banco:**
   ```bash
   docker compose exec backend alembic upgrade head
   ```

4. **Instalar dependências e iniciar o frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Endpoints e Serviços Locais

| Serviço | URL Local | Descrição |
| :--- | :--- | :--- |
| **Frontend** | [http://localhost:3000](http://localhost:3000) | Aplicação Next.js 16 em modo desenvolvimento |
| **API Backend** | [http://localhost:8000/docs](http://localhost:8000/docs) | Documentação interativa Swagger / OpenAPI |
| **Adminer** | [http://localhost:8085](http://localhost:8085) | Painel web para inspeção direta do PostgreSQL |
| **Portal MkDocs** | `mkdocs serve -a localhost:8001` | Documentação técnica local com live-reload |

> Para popular o banco com dados iniciais do SIGAA ou datasets da UnB, consulte o guia **[Como Popular o Banco de Dados](https://unb-mds.github.io/2026-02-TambureteiUnB/comecando/popular_banco_de_dados/)**.

---

## Testes e Validação de Qualidade

Antes de abrir Pull Requests, valide as alterações localmente:

### Backend
```bash
# Testes com cobertura mínima de 70%
docker compose exec backend pytest --cov=app --cov-report=term-missing --cov-fail-under=70

# Linter e segurança estática
docker compose exec backend ruff check app tests
docker compose exec backend bandit -r app -ll
```

### Frontend
```bash
cd frontend
npm test               # Testes unitários
npx tsc --noEmit       # Verificação estrita de tipos TypeScript
npm run lint           # Linter ESLint / Next.js
npm run build          # Validação de build de produção
```

---

## Stack Tecnológica

* **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
* **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2.
* **Banco de Dados:** PostgreSQL 17.
* **DevOps & Qualidade:** Docker Compose, GitHub Actions (CI/CD), Pytest, Mutmut, Ruff, Bandit, MkDocs Material.

---

## Documentação Aprofundada (MkDocs)

Toda a documentação técnica, teórica e de governança está centralizada no portal MkDocs:

* **[Guia Completo de Desenvolvimento](https://unb-mds.github.io/2026-02-TambureteiUnB/comecando/desenvolvimento/):** Setup detalhado, variáveis de ambiente e fluxo de trabalho.
* **[Como Contribuir](https://unb-mds.github.io/2026-02-TambureteiUnB/comecando/como_contribuir/):** Política de branches, padrão de commits e checklist de CI.
* **[Arquitetura do Sistema e ADRs](https://unb-mds.github.io/2026-02-TambureteiUnB/engenharia/arquitetura/):** Clean Architecture, visão C4 e decisões técnicas.
* **[Dicionário de Dados](https://unb-mds.github.io/2026-02-TambureteiUnB/engenharia/banco_de_dados/):** Modelagem relacional e tabelas do PostgreSQL 17.
* **[Pipeline ETL](https://unb-mds.github.io/2026-02-TambureteiUnB/engenharia/pipeline_etl/):** Ingestão e anonimização de dados da LAI, DPO e SIGAA.
* **[Segurança e LGPD](https://unb-mds.github.io/2026-02-TambureteiUnB/produto/regras_negocio/):** Anonimização com supressão para n < 5 e pseudônimos criptográficos.
* **[Relatório Final de Releases](https://unb-mds.github.io/2026-02-TambureteiUnB/produto/relatorio_final/):** Histórico consolidado de entregas da disciplina MDS.

---

## Equipe e Contribuidores

| Foto | Nome | GitHub |
| :---: | :--- | :---: |
| <img src="https://github.com/bcaueLPS.png" width="64" height="64" style="border-radius: 50%;" alt="Bruno Cauê" /> | **Bruno Cauê Souza Lopes Oliveira** | [@bcaueLPS](https://github.com/bcaueLPS) |
| <img src="https://github.com/diangellis.png" width="64" height="64" style="border-radius: 50%;" alt="Gabriel Di Angellis" /> | **Gabriel Di Angellis Basilio Ferreira** | [@diangellis](https://github.com/diangellis) |
| <img src="https://github.com/LuisGuilherme67.png" width="64" height="64" style="border-radius: 50%;" alt="Luis Guilherme" /> | **Luis Guilherme de Almeida Costa** | [@LuisGuilherme67](https://github.com/LuisGuilherme67) |
| <img src="https://github.com/lucasssmira.png" width="64" height="64" style="border-radius: 50%;" alt="Lucas Miranda" /> | **Lucas Miranda Souza** | [@lucasssmira](https://github.com/lucasssmira) |
| <img src="https://github.com/LuizaCarvalho691.png" width="64" height="64" style="border-radius: 50%;" alt="Luiza Carneiro" /> | **Luiza Carneiro Carvalho** | [@LuizaCarvalho691](https://github.com/LuizaCarvalho691) |
| <img src="https://github.com/mariav-07.png" width="64" height="64" style="border-radius: 50%;" alt="Maria Vitória" /> | **Maria Vitória Queiroz Lima** | [@mariav-07](https://github.com/mariav-07) |
| <img src="https://github.com/thamiresellensa.png" width="64" height="64" style="border-radius: 50%;" alt="Thamires Ellen" /> | **Thamires Ellen Souza Araújo** | [@thamiresellensa](https://github.com/thamiresellensa) |

---

## Licença e Créditos

Distribuído sob a licença **[MIT](./LICENSE)**. Inspirado no projeto pioneiro **[Tamburetei (OpenDevUFCG)](https://github.com/OpenDevUFCG/tamburetei)** e desenvolvido com base em dados públicos disponibilizados pela **Universidade de Brasília (UnB)**.
