<p align="center">
  <a href="https://unb-mds.github.io/2026-02-TambureteiUnB/">
    <img src="docs/assets/banner-readme.svg" alt="Tamburetei UnB" height="72" />
  </a>
</p>

# Tamburetei UnB

Plataforma aberta e colaborativa de inteligência acadêmica para análise de indicadores de aprovação, evasão institucional, matrizes curriculares e repositório comunitário das disciplinas da **Universidade de Brasília (UnB)**, em estrita conformidade com a **LGPD (*Privacy by Design*)**.

---

## 1. Status do Projeto e Badges

[![CI](https://github.com/unb-mds/2026-02-TambureteiUnB/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/unb-mds/2026-02-TambureteiUnB/actions/workflows/ci.yml)
[![Deploy](https://img.shields.io/badge/Deploy-tambureteiunb.com.br-2ECC71?style=flat&logo=vercel&logoColor=white)](https://tambureteiunb.com.br/disciplinas)
[![Docs](https://img.shields.io/badge/Docs-Portal_MkDocs-6C5CE7?style=flat&logo=materialformkdocs&logoColor=white)](https://unb-mds.github.io/2026-02-TambureteiUnB/)
[![Licença MIT](https://img.shields.io/badge/Licença-MIT-9385F7?style=flat)](LICENSE)
![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.12-009688?style=flat&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-React_19-111827?style=flat&logo=nextdotjs&logoColor=white)
![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)

[Aplicação em Produção](https://tambureteiunb.com.br/disciplinas) · [Documentação Oficial](https://unb-mds.github.io/2026-02-TambureteiUnB/) · [Pré-requisitos e Instalação](#4-pré-requisitos-e-instalação) · [Como Usar](#5-como-usar) · [Como Contribuir](CONTRIBUTING.md) · [Licença](#7-licença)

---

## 2. Descrição e Propósito

O **Tamburetei UnB** é um projeto de análise de dados acadêmicos concebido para transformar registros dispersos da universidade em informações públicas, transparentes e reprodutíveis. 

Historicamente, estudantes da UnB enfrentavam dificuldades para planejar suas matrículas semestrais, desconhecendo taxas reais de aprovação por turma, históricos de retenção e ementas práticas das disciplinas. O Tamburetei consolida dados obtidos por meio da **Lei de Acesso à Informação (LAI)**, do **SIGAA** e do **DPO/UnB**, integrando indicadores objetivos a uma experiência comunitária colaborativa.

O projeto é inspirado no **Tamburetei**, concebido originalmente pela OpenDevUFCG, adaptando o conceito para o ecossistema e as normas acadêmicas da Universidade de Brasília.

### Módulos Principais
* **Indicadores Acadêmicos:** Taxas históricas de aprovação, reprovação por nota, reprovação por falta e trancamentos agregadas por quórum mínimo (LGPD).
* **Painel Institucional:** Indicadores de evasão anual por curso e campus, fluxos curriculares e notas de corte consolidadas do PAS (Cebraspe).
* **Planejamento Semanal (`/minha-grade`):** Montagem interativa de grade horária com detecção automática de choques de horário e exportação em PDF.
* **Hub Colaborativo de Materiais:** Compartilhamento e curadoria de materiais de apoio (PDF, PNG, JPG) com triagem por IA local e aprovação humana.
* **Comentários sob Pseudônimo:** Discussões e relatos de turmas sob pseudônimo seguro (*Privacy by Design*) e Central de Denúncias (`RN04`).

---

## 3. Demonstração

<p align="center">
  <img src="docs/assets/showcase.png" alt="Demonstração da Interface do Tamburetei UnB" width="100%" />
  <br />
  <em>Interface do Tamburetei UnB: catálogo de disciplinas, planejamento semanal de grade e painel de desempenho histórico.</em>
</p>

### Links Úteis de Navegação
* **Ambiente em Produção:** [tambureteiunb.com.br](https://tambureteiunb.com.br/disciplinas)
* **Portal de Documentação (MkDocs):** [unb-mds.github.io/2026-02-TambureteiUnB](https://unb-mds.github.io/2026-02-TambureteiUnB/)
* **Protótipo Interativo no Figma:** [Template MDS — Grupo 9](https://www.figma.com/board/coZ3FgGpd5amxJxaanwaTr/Template-MDS---Grupo-9?node-id=2128-1592)

---

## 4. Pré-requisitos e Instalação

### Pré-requisitos do Sistema
* **Docker & Docker Compose** (versão 24.0+ recomendada)
* **Git** (para versionamento e clonagem)
* *(Opcional para execução nativa)*: **Python 3.12+** e **Node.js 22+**

### Passo a Passo de Execução Rápida (Quickstart com Docker)

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/unb-mds/2026-02-TambureteiUnB.git
   cd 2026-02-TambureteiUnB
   ```

2. **Configurar as Variáveis de Ambiente:**
   ```bash
   cp .env.example .env
   ```

3. **Subir a Stack Completa via Docker Compose:**
   ```bash
   docker compose up --build
   ```

4. **Acessar os Serviços Locais:**
   * **Frontend (Next.js):** [http://localhost:3000](http://localhost:3000)
   * **Backend API (Swagger Docs):** [http://localhost:8000/docs](http://localhost:8000/docs)
   * **Gerenciador de Banco (Adminer):** [http://localhost:8080](http://localhost:8080)

---

## 5. Como Usar

### Execução em Produção
Para provisionar a stack com contêineres de produção otimizados:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Comandos de Teste e Qualidade

#### Testes do Backend (Pytest + Cobertura + Mutação)
```bash
# Executar a suíte completa de testes no Docker
docker compose exec backend pytest -v

# Executar testes unitários e de integração com cobertura de código
docker compose exec backend pytest --cov=app --cov-report=term-missing --cov-fail-under=70

# Executar testes de mutação com Mutmut
docker compose exec backend mutmut run
```

#### Testes e Verificação do Frontend
```bash
cd frontend

# Executar suíte de testes unitários automatizados
npm test

# Verificação estática de tipos TypeScript
npx tsc --noEmit

# Executar linter de código
npm run lint

# Gerar build de produção
npx next build --webpack
```

#### Migrações de Banco de Dados com Alembic
```bash
# Aplicar migrações pendentes no banco
docker compose exec backend alembic upgrade head

# Gerar nova migração após alterar modelos SQLAlchemy
docker compose exec backend alembic revision --autogenerate -m "nome_da_migracao"
```

#### Servidor Local de Documentação (MkDocs)
```bash
pip install mkdocs mkdocs-material pymdown-extensions
mkdocs serve -a localhost:8001
```

---

## 6. Como Contribuir

Contribuições da comunidade e de novos desenvolvedores são muito bem-vindas. Para manter a estabilidade arquitetural e a conformidade técnica do projeto:

1. Consulte o **[Guia de Contribuição (CONTRIBUTING.md)](CONTRIBUTING.md)** para conhecer o padrão arquitetural (Clean Architecture), fluxo de branches Gitflow (`develop` para novas features, `main` para releases estáveis) e portas de qualidade.
2. Respeite as diretrizes do **[Código de Conduta (CODE_OF_CONDUCT.md)](CODE_OF_CONDUCT.md)**.
3. Siga o padrão **Conventional Commits** e a política estrita de **ausência de emojis** em mensagens de commit, PRs e documentações (`AGENTS.md`).

### Governança do Projeto
* **Scrum Master:** Thamires Ellen Souza Araujo — [@thamiresellensa](https://github.com/thamiresellensa)
* **Product Owner:** Lucas Miranda Souza — [@lucasssmira](https://github.com/lucasssmira)
* **Contato Institucional:** FCTE / Universidade de Brasília (MDS 2026/2 — Grupo 9).

---

## 7. Licença

Este projeto é distribuído sob os termos da **[Licença MIT](LICENSE)**. Qualquer pessoa tem permissão para usar, modificar, copiar e redistribuir o software livremente, preservando os devidos créditos aos autores originais.
