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

Antes dos testes de integração, crie um PostgreSQL 17 exclusivo para testes (nome terminado em `_test`) e defina `TEST_DATABASE_URL`. Nunca use a base de desenvolvimento ou produção: a suíte aplica migrações e testa downgrade/upgrade. Consulte [o roteiro de testes](feature_5_2_materiais.md#9-executar-os-testes). Os testes unitários não exigem essa variável.

Exemplo no terminal do host, usando as credenciais do seu banco dedicado:

```bash
export TEST_DATABASE_URL='postgresql://postgres:postgres@db:5432/materiais_test'
```

### Executar a suíte completa de testes:
```bash
docker compose exec -e TEST_DATABASE_URL="$TEST_DATABASE_URL" backend pytest -v
```

### Executar apenas os testes unitários:
```bash
docker compose exec backend pytest tests/unit -v
```

### Executar apenas os testes de integração:
```bash
docker compose exec -e TEST_DATABASE_URL="$TEST_DATABASE_URL" backend pytest tests/integration -v
```

### Executar testes com verificação de cobertura de código:
```bash
docker compose exec -e TEST_DATABASE_URL="$TEST_DATABASE_URL" backend pytest --cov=app --cov-report=term-missing
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
> 💡 A pasta `site/` gerada pelo comando de build deve constar no `.gitignore` para não poluir o repositório (se ainda não constar, adicione `site/`).

## Configuração de segurança

`SECRET_KEY` (mínimo de 32 caracteres) e `POSTGRES_PASSWORD` são obrigatórias no ambiente ou `.env`. Não use os exemplos em produção. `BACKEND_CORS_ORIGINS` aceita uma lista JSON de origens autorizadas; o padrão permite apenas os endereços locais de desenvolvimento.

Consulte a [revisão de arquitetura](revisao_arquitetura.md) para o estado das camadas e divergências entre a spec e os documentos anteriores.
