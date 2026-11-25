## Descricao da Pull Request

Descreva de forma clara e objetiva o proposito desta PR e quais alteracoes foram realizadas.

---

## Tipo de Mudanca

- [ ] Nova funcionalidade (`feat`)
- [ ] Correcao de bug (`fix`)
- [ ] Refatoracao de codigo (`refactor`)
- [ ] Testes automatizados (`test`)
- [ ] Documentacao (`docs`)
- [ ] Configuracao / Infraestrutura (`chore` ou `ci`)

---

## Checklist de Conformidade Arquitetural (`specs/backend-architecture-spec.md`)

Antes de solicitar a revisao, marque todos os itens que se aplicam ao codigo desta PR:

### 1. Camadas e Arquitetura Limpa (Backend)
- [ ] **Routers Declarativos:** os routers em `backend/app/api/routers/` apenas recebem requisicoes HTTP, injetam dependencias e delegam para `backend/app/services/`.
- [ ] **Sem SQL no Router:** nenhum router executa `db.query(...)` ou instancia diretamente modelos do SQLAlchemy (`Turma(...)`, `Usuario(...)`).
- [ ] **Regras no Service e Domain:** validacoes de negocio puras residem em `backend/app/domain/` e a orquestracao em `backend/app/services/`.

### 2. Validacao e Schemas (Pydantic)
- [ ] **Mensagens em Portugues:** as validacoes de schemas usam `PydanticCustomError` com mensagens claras, humanizadas e em portugues.
- [ ] **Formatos Institucionais:** campos academicos (como semestre no padrao UnB `YYYY.S`) foram devidamente validados.

### 3. Banco de Dados e Repositorios
- [ ] **Prevencao de Duplicatas N:N:** consultas que carregam relacionamentos N:N (ex.: turmas e professores) utilizam `selectinload` ou `.unique()`.
- [ ] **Migrations:** nenhuma alteracao de tabela foi feita sem a respectiva migracao linear do Alembic.

### 4. Testes, Qualidade e Comunicacao
- [ ] **Backend:** testes unitarios e de integracao aprovados (`docker compose exec backend pytest -v`), `ruff` e `bandit` sem pendencias.
- [ ] **Frontend:** verificacoes aprovadas (`npm test`, `npm run lint`, `npx tsc --noEmit` e `npm run build`).
- [ ] **Comunicacao Limpa (`AGENTS.md`):** codigo, documentacao, commits e PR sem emojis.

---

## Como Testar

Descreva os passos para reproduzir e testar as alteracoes (endpoints, rotas ou comandos):

1.
2.
3.

---

## Rastreabilidade de Issues

Closes #
