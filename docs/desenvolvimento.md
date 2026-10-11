# 💻 Guia de Desenvolvimento

Este guia orienta o time de desenvolvimento sobre a inicialização do ambiente, fluxo de versionamento Git, migrações de banco de dados e testes automatizados.

---

## 🚀 Como Subir o Projeto com Docker

### 1. Configurar variáveis de ambiente
Copie o modelo de variáveis de ambiente na raiz do projeto:
```bash
cp .env.example .env
```
> ⚠️ **Atenção:** O arquivo `.env` contém credenciais locais e nunca deve ser versionado no Git. Apenas o `.env.example` é público.

### 2. Construir e iniciar os contêineres
```bash
docker compose up -d --build
```

Serviços disponibilizados:
* **API FastAPI (Swagger Docs):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **OpenAPI JSON:** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)
* **Adminer (Interface do Banco de Dados):** [http://localhost:8085](http://localhost:8085)
* **PostgreSQL 17:** `localhost:5432`

---

## 🌿 Fluxo de Trabalho Git e Branches

Para manter o repositório organizado e em conformidade com as boas práticas de MDS:

### Convenção de Nomes de Branches:
* `feat/<nome-da-tarefa>`: Implementação de nova funcionalidade (ex.: `feat/login-jwt`).
* `docs/<nome-da-tarefa>`: Criação ou atualização de documentação (ex.: `docs/setup-mkdocs`).
* `fix/<nome-do-bug>`: Correção de defeito/bug (ex.: `fix/calculo-taxa-evasao`).
* `chore/<nome-da-tarefa>`: Tarefas de infraestrutura ou configuração (ex.: `chore/docker-compose`).

### Padrão de Commits (Conventional Commits):
* `feat:` Adiciona nova funcionalidade.
* `fix:` Corrige um erro ou defeito.
* `docs:` Altera exclusivamente documentação.
* `test:` Adiciona ou corrige testes automatizados.
* `refactor:` Refatoração de código sem alterar comportamento.

---

## 🗄️ Migrações de Banco com Alembic (Database-as-Code)

Toda evolução do banco de dados é versionada via Alembic:

### Aplicar todas as migrações no banco:
```bash
docker compose exec backend alembic upgrade head
```

### Gerar uma nova revisão automática após alterar modelos em `app/models/`:
```bash
docker compose exec backend alembic revision --autogenerate -m "descricao_da_alteracao"
```

### Popular o banco de dados com dados do SIGAA:
```bash
docker compose exec backend python -m app.pipeline.cli --source sigaa --departamento 673 --semestre 2026.2
```
> 📖 Para opções avançadas (toda a UnB, métricas históricas, etc.), consulte o documento **[Como Popular o Banco de Dados](popular_banco_de_dados.md)**.

---

## 🧪 Testes Automatizados e Qualidade

O projeto organiza os testes automatizados em duas categorias principais:

* **Testes Unitários (`tests/unit/`)**: Focados em regras de negócio puras, schemas Pydantic, transformers do pipeline ETL e sanitização LGPD. Executam em memória de forma isolada e ultrarrápida, sem dependência de banco de dados ativo.
* **Testes de Integração (`tests/integration/`)**: Focados no ciclo de vida dos serviços e endpoints da API FastAPI, interagindo com o banco de dados PostgreSQL e validando respostas HTTP, transações e autenticação.

### Executar a suíte completa de testes:
```bash
docker compose exec backend pytest -v
```

### Executar apenas os testes unitários:
```bash
docker compose exec backend pytest tests/unit -v
```

### Executar apenas os testes de integração:
```bash
docker compose exec backend pytest tests/integration -v
```

### Executar testes com verificação de cobertura de código:
```bash
docker compose exec backend pytest --cov=app --cov-report=term-missing
```

### Executar testes de mutação (Mutmut):
```bash
docker compose exec backend mutmut run
```

## 🧪 Roteiro de Validação Rápida (Smoke Test)

Este roteiro homologado permite que novos desenvolvedores e avaliadores validem a saúde operacional e a integração ponta a ponta de toda a stack em **menos de 5 minutos**:

### Passo 1: Subida e Integridade dos Contêineres
Certifique-se de que o Docker está em execução e inicie os serviços:
```bash
docker compose up -d --build
docker compose ps
```
* **Critério de Aceite:** Os serviços `db` (PostgreSQL 17), `backend` (FastAPI) e `adminer` devem estar com status `Up`. Teste a resposta rápida da API:
  ```bash
  curl http://localhost:8000/health
  ```
  *(Deve retornar `{"status":"ok"}`)*

### Passo 2: Aplicação de Migrações e Carga Inicial Rápida
Garanta que as tabelas estão atualizadas e popule o catálogo com dados do campus Gama (FGA):
```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.pipeline.cli --source sigaa --departamento 673 --semestre 2026.2
```
* **Critério de Aceite:** O terminal reporta sucesso com cadastro dos cursos da FGA e mais de 350 disciplinas com pré-requisitos e turmas.

### Passo 3: Inicialização do Frontend (Next.js)
Em outro terminal, acesse o diretório do frontend e suba o servidor de desenvolvimento:
```bash
cd frontend
npm install
npm run dev
```
* **Critério de Aceite:** Servidor web disponível em **[http://localhost:3000](http://localhost:3000)**.

### Passo 4: Auditoria dos Fluxos Ponta a Ponta
Abra o navegador em `http://localhost:3000` e valide os fluxos ativos da aplicação:

1. **Fluxo 1 — Autenticação Discente:**
   - Acesse `/cadastro` e registre uma nova conta com e-mail e senha.
   - Acesse `/login`, preencha as credenciais e envie o formulário.
   - *Verificação:* O usuário é redirecionado para a página inicial, o token JWT é persistido em `localStorage` e a Navbar exibe a sessão do usuário.
2. **Fluxo 2 — Catálogo de Disciplinas e Detalhes:**
   - Acesse `/disciplinas`.
   - Teste a busca textual (ex.: "Métodos", "Cálculo"), filtre por campus ou departamento e navegue pelas páginas pelo seletor de paginação (25 disciplinas por página).
   - Clique em um card (ex.: `/disciplinas/metodos-de-desenvolvimento-de-software`) e confirme a exibição de código, ementa oficial, créditos e grade de pré-requisitos navegáveis.
3. **Fluxo 3 — Catálogo de Cursos:**
   - Acesse `/cursos` e filtre pelos botões de campus (FGA, Darcy Ribeiro, FCE, FUP).
   - Clique em "Ver disciplinas" em um curso para abrir sua matriz curricular.

### Passo 5: Auditoria de Rede e Logs
- Abra o painel de desenvolvedor do navegador (**F12 -> aba Rede / Network**): confirme que as requisições assíncronas para `http://localhost:8000` retornam status `200 OK` (ou `201 Created`), sem alertas de CORS.
- No terminal, verifique os logs do backend:
  ```bash
  docker compose logs --tail=50 backend
  ```
  *(Não deve conter exceções não tratadas ou status HTTP 500)*

---

## 📖 Visualizar e Construir a Documentação (MkDocs)

### Visualizar localmente em tempo real:
Para evitar colisão de portas com a API FastAPI (que roda na porta 8000), execute o servidor de documentação especificando a porta **8001**:
```bash
mkdocs serve -a localhost:8001
```
Acesse no seu navegador: **[http://localhost:8001](http://localhost:8001)**

### Gerar arquivos estáticos para deploy (HTML):
```bash
mkdocs build
```
> 💡 A pasta `site/` gerada pelo comando de build deve constar no `.gitignore` para não poluir o repositório (se ainda não constar, adicione `site/`).
