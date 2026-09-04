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
* **Adminer (Interface do Banco de Dados):** [http://localhost:8080](http://localhost:8080)
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

---

## 🧪 Testes Automatizados e Qualidade

### Executar a suíte completa de testes:
```bash
docker compose exec backend pytest -v
```

### Executar testes de domínio com verificação de cobertura (mínimo de 70%):
```bash
docker compose exec backend pytest tests/unit -v --cov=app/domain --cov-report=term-missing
```

### Executar testes de mutação (Mutmut):
```bash
docker compose exec backend mutmut run
```

---

## 📖 Visualizar e Construir a Documentação (MkDocs)

### Visualizar localmente em tempo real:
```bash
mkdocs serve
```
Acesse no seu navegador: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

### Gerar arquivos estáticos para deploy (HTML):
```bash
mkdocs build
```
> 💡 A pasta `site/` gerada pelo comando de build já deve constar no `.gitignore` para não poluir o repositório.
