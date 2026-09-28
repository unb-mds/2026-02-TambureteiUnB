# G9-2026-2
Grupo G9 - Metodos de Desenvolvimento de Software 2026/2
# 📈 Tamburetei UnB

> **Dados para entender o desempenho acadêmico da Universidade de Brasília.**
> Um projeto de análise de dados acadêmicos baseado em dados abertos e anonimizados obtidos por meio da Lei de Acesso à Informação (LAI).

---

## 📖 Sobre o Projeto

O **Tamburetei UnB** é um projeto de análise de dados acadêmicos que tem como objetivo disponibilizar informações sobre o desempenho dos estudantes da Universidade de Brasília de forma **aberta, organizada e reprodutível**.

O projeto trabalha com um **dataset anonimizado**, obtido por meio da **Lei de Acesso à Informação (LAI)**, contendo indicadores relacionados ao desempenho acadêmico, como:

* Taxas de aprovação;
* Taxas de evasão;
* Tempo médio de formação;
* Outros indicadores acadêmicos presentes nos dados disponibilizados.

A proposta é transformar esses dados em informações que possam ser exploradas e analisadas de maneira transparente, permitindo uma melhor compreensão do desempenho acadêmico na UnB.

O projeto é inspirado no **Tamburetei**, desenvolvido pela OpenDevUFCG, que utiliza dados acadêmicos para produzir análises reprodutíveis por meio de notebooks.

🔗 **Referência:** [Tamburetei — OpenDevUFCG](https://github.com/OpenDevUFCG/Tamburetei)

*Figma do nosso projeto*: https://www.figma.com/board/coZ3FgGpd5amxJxaanwaTr/Template-MDS---Grupo-9?node-id=2128-1592&t=FLYotQksvnPU1YJJ-0

*Documentação do nosso projeto*: https://unb-mds.github.io/2026-02-TambureteiUnB/
---


### 👥 Papéis

* **Scrum Master:** Thamires Ellen Souza Araujo — [@thamiresellensa](https://github.com/thamiresellensa)
* **Product Owner:** Lucas Miranda Souza — [@lucasssmira](https://github.com/lucasssmira)

A **Sprint 0** foi destinada principalmente ao estudo e alinhamento das tecnologias, metodologias e conceitos necessários para o desenvolvimento do projeto. A equipe atualmente está na **Sprint 1**, iniciando a organização das atividades e dos requisitos.

---

## 👥 Equipe

Projeto desenvolvido colaborativamente para a disciplina de **Métodos de Desenvolvimento de Software (MDS)** da **Universidade de Brasília — Faculdade do Gama (FGA)**.

| Nome                                 | GitHub                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Bruno Cauê Souza Lopes Oliveira      | [@bcaueLPS](https://github.com/bcaueLPS)                                               |
| Gabriel Di Angellis Basilio Ferreira | [@diangellis](https://github.com/diangellis)                                           |
| Luis Guilherme de Almeida Costa      | [@Luis-Guilherme-de-Almeida-Costa](https://github.com/LuisGuilherme67) |
| Lucas Miranda Souza                  | [@lucasssmira](https://github.com/lucasssmira)                                         |
| Luiza Carneiro Carvalho              | [@LuizaCarvalho691](https://github.com/LuizaCarvalho691)                               |
| Maria Vitória Queiroz Lima           | [@mariav-07](https://github.com/mariav-07)                                             |
| Thamires Ellen Souza Araujo          | [@thamiresellensa](https://github.com/thamiresellensa)                                 |


## 🚀 Como Executar o Projeto Localmente

Siga o passo a passo abaixo para rodar todos os serviços do **Tamburetei UnB** em seu ambiente local.

### 📋 Pré-requisitos

Certifique-se de ter instalado em sua máquina:
* [Git](https://git-scm.com/)
* [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/)
* [Node.js](https://nodejs.org/) (versão 18 LTS ou superior recomendada) e [npm](https://www.npmjs.com/)

---

### 1️⃣ Clonar o Repositório

```bash
git clone https://github.com/unb-mds/2026-02-TambureteiUnB.git
cd 2026-02-TambureteiUnB
```

---

### 2️⃣ Configurar as Variáveis de Ambiente

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

### 3️⃣ Iniciar o Backend e Banco de Dados (Docker)

Com o Docker em execução em sua máquina, suba os serviços em segundo plano:

```bash
docker compose up -d --build
```

Para verificar se todos os containers estão saudáveis e em execução:
```bash
docker compose ps
```

#### 🌐 Serviços do Backend disponíveis:
* **API FastAPI (Swagger UI / Documentação Interativa):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **API OpenAPI Spec (JSON):** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)
* **Adminer (Interface Web de Gerenciamento do Banco):** [http://localhost:8085](http://localhost:8085)
* **PostgreSQL:** `localhost:5432`

---

### 4️⃣ Iniciar o Frontend (Next.js)

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
* 🌐 **Aplicação Web (Frontend):** [http://localhost:3000](http://localhost:3000)

---

### 5️⃣ Migrações de Banco de Dados com Alembic

O esquema inicial de tabelas é provisionado automaticamente via `init.sql`. Caso necessite gerenciar ou aplicar migrações manuais com o Alembic:

```bash
# Aplicar migrações pendentes
docker compose exec backend alembic upgrade head

# Gerar nova migração após alterar modelos SQLAlchemy
docker compose exec backend alembic revision --autogenerate -m "descricao_da_mudanca"
```

> 💡 **Povoamento do Banco de Dados:**  
> Caso deseje popular o banco com datasets históricos reais da UnB, consulte as instruções detalhadas em [`docs/pipeline_etl.md`](docs/pipeline_etl.md).

---

## 🧪 Como Rodar os Testes

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

# Verificação estática de tipos TypeScript
npx tsc --noEmit

# Executar o linter
npm run lint
```

---

## 🛑 Comandos Úteis do Docker

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

## 📚 Documentação do Projeto com MkDocs

A documentação detalhada de arquitetura, requisitos e visão está disponível na pasta `docs/` e publicada em [unb-mds.github.io/2026-02-TambureteiUnB](https://unb-mds.github.io/2026-02-TambureteiUnB/).

Para visualizá-la e editá-la localmente:

```bash
# Instalar dependências da documentação
pip install mkdocs pymdown-extensions

# Iniciar o servidor local da documentação
mkdocs serve
```
Acesse: [http://127.0.0.1:8000](http://127.0.0.1:8000) *(ou a porta informada no terminal se o backend estiver usando a 8000)*.

---
