## 📌 Descrição da Pull Request

Descreva de forma clara e objetiva o propósito desta PR e quais alterações foram realizadas.

---

## 🛠️ Tipo de Mudança

- [ ] 🚀 Nova funcionalidade (`feat`)
- [ ] 🐛 Correção de bug (`fix`)
- [ ] ♻️ Refatoração de código (`refactor`)
- [ ] 🧪 Testes automatizados (`test`)
- [ ] 📝 Documentação (`docs`)
- [ ] 🔧 Configuração / Infraestrutura (`chore` ou `ci`)

---

## 📐 Checklist de Conformidade Arquitetural (specs/backend-architecture-spec.md)

Antes de solicitar a revisão, marque todos os itens que se aplicam ao código desta PR:

### 1. Camadas e Arquitetura Limpa
- [ ] **Routers Declarativos:** Os routers em `app/api/routers/` apenas recebem requisições HTTP, injetam dependências e delegam para a camada `app/services/`.
- [ ] **Sem SQL no Router:** Nenhum router executa `db.query(...)` ou instancia diretamente modelos do SQLAlchemy (`Turma(...)`, `Usuario(...)`).
- [ ] **Regras no Service:** Todas as validações de domínio (existência, duplicidade, cálculos) residem em `app/services/`.

### 2. Validação e Schemas (Pydantic)
- [ ] **Mensagens em Português:** As validações de schemas usam `PydanticCustomError` com mensagens claras, humanizadas e em português.
- [ ] **Formatos Institucionais:** Campos acadêmicos (como semestre no padrão UnB `YYYY.S`) foram devidamente validados.

### 3. Banco de Dados e Repositórios
- [ ] **Prevenção de Duplicatas N:N:** Consultas que carregam relacionamentos N:N (ex: turmas e professores) utilizam `selectinload` ou `.unique()`.
- [ ] **Migrations:** Nenhuma alteração de tabela foi feita sem a respectiva migração do Alembic.

### 4. Testes e Qualidade
- [ ] **Testes Automatizados:** Foram adicionados testes com `pytest` em `backend/tests/` para os novos fluxos e schemas.
- [ ] **Execução Verde:** A suíte de testes executa com 100% de sucesso via Docker:
  ```powershell
  docker exec 2026-02-tambureteiunb-backend-1 pytest -v
  ```

---

## 🧪 Como Testar

Descreva os passos para reproduzir e testar as alterações (endpoints, payloads, etc.):

1. 
2. 
3. 

---

## 🔗 Rastreabilidade de Issues

Closes #
