# Rascunhos de issues — revisão de arquitetura

**Não publicados.** Revisar títulos, conteúdo, labels e milestone antes de criar no GitHub. Milestone proposta: **Sprint 4**. As marcações abaixo descrevem a implementação local; merge e validações remotas não são presumidos. Cursos têm PR própria (#51).

## R01 — migrações e isolamento dos testes

Labels sugeridas: `backend, architecture`.

### 📋 Contexto

As linhas de migração do pipeline e de materiais precisam convergir, e os testes devem usar uma base exclusiva.

### 🛠️ O que foi feito

Revisão 007 que une as duas linhas; fixtures com savepoints, uploads temporários e exigência de TEST_DATABASE_URL.

### ✅ Critérios de Aceitação

- [x] Alterações preparadas e verificadas localmente.
- [ ] Revisar: Upgrade a partir de 006 e 002_materiais; testes sem usar a base de desenvolvimento.
- [ ] Aprovar publicação e relacionar os commits/PR.
- [ ] Concluir revisão e integração antes de encerrar a issue.

## R02 — configuração segura do backend

Labels sugeridas: `backend, security`.

### 📋 Contexto

A configuração deve representar a spec e preservar credenciais com caracteres especiais.

### 🛠️ O que foi feito

URL construída pelo SQLAlchemy; segredos obrigatórios; CORS local; Pydantic v2; documentação de ambiente.

### ✅ Critérios de Aceitação

- [x] Alterações preparadas e verificadas localmente.
- [ ] Revisar: Testes de URL e chave obrigatória; nenhum segredo fixo no código da aplicação.
- [ ] Aprovar publicação e relacionar os commits/PR.
- [ ] Concluir revisão e integração antes de encerrar a issue.

## R03 — registro dos endpoints da aplicação

Labels sugeridas: `backend`.

### 📋 Contexto

Materiais, turmas, professores e catálogo precisam estar presentes na API integrada.

### 🛠️ O que foi feito

Registro dos quatro roteadores em app/main.py.

### ✅ Critérios de Aceitação

- [x] Alterações preparadas e verificadas localmente.
- [ ] Revisar: Rotas acessíveis e cobertas pela suíte de integração.
- [ ] Aprovar publicação e relacionar os commits/PR.
- [ ] Concluir revisão e integração antes de encerrar a issue.

## R04 — validação e persistência de materiais

Labels sugeridas: `backend, refactor`.

### 📋 Contexto

O upload deve respeitar a separação entre schema, serviço e repositório.

### 🛠️ O que foi feito

Título normalizado em schema com erro em português; MaterialRepository segue BaseRepository mantendo flush sem commit antecipado.

### ✅ Critérios de Aceitação

- [x] Alterações preparadas e verificadas localmente.
- [ ] Revisar: HTTP 422 para título inválido; compensação de arquivo/banco preservada.
- [ ] Aprovar publicação e relacionar os commits/PR.
- [ ] Concluir revisão e integração antes de encerrar a issue.

## R05 — utilitários compartilhados e consultas de disciplinas

Labels sugeridas: `backend, refactor, architecture`.

### 📋 Contexto

Serviços HTTP não devem importar o pipeline nem consultar uma disciplina por código repetidamente.

### 🛠️ O que foi feito

Slug em core/texto.py; resolução de códigos em lote; carregamento antecipado de vínculos com cursos; teste de fronteiras de importação.

### ✅ Critérios de Aceitação

- [x] Alterações preparadas e verificadas localmente.
- [ ] Revisar: Testes de catálogo e pipeline aprovados; serviços independentes de app.pipeline.
- [ ] Aprovar publicação e relacionar os commits/PR.
- [ ] Concluir revisão e integração antes de encerrar a issue.

## R06 — execução confiável do pipeline e dos containers

Labels sugeridas: `backend`.

### 📋 Contexto

Falhas de migração devem interromper a execução; arquivos privados não podem entrar no Git.

### 🛠️ O que foi feito

ETL propaga falhas de Alembic; entrypoint executa migrações uma vez; Compose e CI usam destino unificado; uploads e artefatos ignorados.

### ✅ Critérios de Aceitação

- [x] Alterações preparadas e verificadas localmente.
- [ ] Revisar: Teste de propagação de erro aprovado; execução Docker e Mutmut deve ser validada após aprovação de publicação.
- [ ] Aprovar publicação e relacionar os commits/PR.
- [ ] Concluir revisão e integração antes de encerrar a issue.

## R07 — dependências e compatibilidade do backend

Labels sugeridas: `backend`.

### 📋 Contexto

As bibliotecas declaradas devem corresponder às APIs efetivamente usadas.

### 🛠️ O que foi feito

bcrypt direto em lugar de passlib; SQLAlchemy limitado à série 2.0; configuração do pipeline em Pydantic v2.

### ✅ Critérios de Aceitação

- [x] Alterações preparadas e verificadas localmente.
- [ ] Revisar: Suíte local aprovada; CI deve instalar as mesmas famílias de dependências.
- [ ] Aprovar publicação e relacionar os commits/PR.
- [ ] Concluir revisão e integração antes de encerrar a issue.

## R08 — documentação e fonte canônica de arquitetura

Labels sugeridas: `documentation, architecture`.

### 📋 Contexto

Contexto, spec e skills descreviam persistência e moderação de formas diferentes.

### 🛠️ O que foi feito

Sessões síncronas documentadas; conteúdos com curadoria prévia e arquivos com moderação reativa; fluxos planejados identificados; skill canônica referenciada pelo ponto de entrada.

### ✅ Critérios de Aceitação

- [x] Alterações preparadas e verificadas localmente.
- [ ] Revisar: Documentação compila em modo estrito e não impõe regras conflitantes para a mesma entidade.
- [ ] Aprovar publicação e relacionar os commits/PR.
- [ ] Concluir revisão e integração antes de encerrar a issue.

## R09 — catálogo de cursos integrado ao banco

Labels sugeridas: `backend, enhancement`.

### 📋 Contexto

Os endpoints de cursos retornavam dados fixos e aceitavam slugs inexistentes.

### 🛠️ O que foi feito

Implementação isolada na PR #51, branch feat/catalogo-cursos, com serviço, repositório, schemas, testes e CI.

### ✅ Critérios de Aceitação

- [x] Alterações preparadas e verificadas localmente.
- [ ] Revisar: Lista e detalhe reais, 404 para inexistente, metadados ausentes como null; dois testes com 100% de cobertura dos módulos de cursos e CI aprovado.
- [ ] Aprovar publicação e relacionar os commits/PR.
- [ ] Concluir revisão e integração antes de encerrar a issue.

## P01 — Limite de senha bcrypt em bytes UTF-8

Labels sugeridas: `backend, security`.

### 📋 Contexto

O cadastro legado valida caracteres, enquanto bcrypt limita bytes. Senhas com acentos podem ser truncadas silenciosamente. Esta pendência não foi implementada nesta revisão.

### 🛠️ Trabalho proposto

Definir limite em bytes para novos cadastros e política de compatibilidade/recuperação para contas existentes, evitando bloqueio silencioso de usuários.

### ✅ Critérios de Aceitação

- [ ] Documentar a política de compatibilidade.
- [ ] Testar senhas ASCII e multibyte nos limites de 72 bytes.
- [ ] Testar cadastro e login sem equivalência indevida por truncamento.

## P02 — Mensagens estruturais de validação em português

Labels sugeridas: `backend, enhancement`.

### 📋 Contexto

Validações explícitas usam português, mas erros nativos de tipo, campos ausentes e limites de query ainda podem aparecer em inglês. Esta melhoria não foi implementada nesta revisão.

### 🛠️ Trabalho proposto

Definir tradução centralizada preservando status HTTP e estrutura dos erros; evitar validadores repetidos em cada rota.

### ✅ Critérios de Aceitação

- [ ] Cobrir campos ausentes, tipos incorretos e limites de query.
- [ ] Preservar os contratos de resposta e não expor dados sensíveis.
- [ ] Validar mensagens com testes de integração.
