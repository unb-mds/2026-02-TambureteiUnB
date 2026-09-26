# Acompanhamento de issues — revisão de arquitetura

As issues R01–R09 foram publicadas na **Sprint 4**. As alterações R01–R08 estão em commits locais na branch `feat/revisao-backend`, aguardando revisão e autorização de envio. Cursos (R09) estão publicados na PR #51. As propostas P01 e P02 continuam sem implementação e sem issues publicadas. Nenhum merge desta revisão foi realizado.

## Rastreabilidade

| Escopo | Issue | Commits da implementação |
| --- | --- | --- |
| R01 — Migrações e testes | [#52](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/52) | `362ba55` |
| R02 — Configuração | [#53](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/53) | `35959f6` |
| R03 — Endpoints | [#54](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/54) | `a223669` |
| R04 — Materiais | [#55](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/55) | `42eda02` |
| R05 — Disciplinas | [#56](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/56) | `b3cbeb5` |
| R06 — Pipeline e containers | [#57](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/57) | `027a4fd`, `0b0ff9c`, `7cf435e` |
| R07 — Dependências | [#58](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/58) | `6673125` |
| R08 — Documentação | [#59](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/59) | `d5d53df`, `3497352`, `ee68bbe`, `f30a634` |
| R09 — Cursos (PR #51) | [#60](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/60) | `cd5e760`, `43ca228`, `04565de`, `660f457`, `6d53b77` |

## R01 — migrações e isolamento dos testes

Labels sugeridas: `backend, architecture`.

### 📋 Contexto

As linhas de migração do pipeline e de materiais precisam convergir, e os testes devem usar uma base exclusiva.

### 🛠️ O que foi feito

Revisão 007 que une as duas linhas; fixtures com savepoints, uploads temporários e exigência de TEST_DATABASE_URL.

### ✅ Critérios de Aceitação

- [x] Alterações preparadas e verificadas localmente.
- [ ] Revisar: Upgrade a partir de 006 e 002_materiais; testes sem usar a base de desenvolvimento.
- [x] Publicar a issue e registrar os commits relacionados.
- [ ] Revisar e aprovar a integração pela PR.
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
- [x] Publicar a issue e registrar os commits relacionados.
- [ ] Revisar e aprovar a integração pela PR.
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
- [x] Publicar a issue e registrar os commits relacionados.
- [ ] Revisar e aprovar a integração pela PR.
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
- [x] Publicar a issue e registrar os commits relacionados.
- [ ] Revisar e aprovar a integração pela PR.
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
- [x] Publicar a issue e registrar os commits relacionados.
- [ ] Revisar e aprovar a integração pela PR.
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
- [x] Publicar a issue e registrar os commits relacionados.
- [ ] Revisar e aprovar a integração pela PR.
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
- [x] Publicar a issue e registrar os commits relacionados.
- [ ] Revisar e aprovar a integração pela PR.
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
- [x] Publicar a issue e registrar os commits relacionados.
- [ ] Revisar e aprovar a integração pela PR.
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
- [x] Publicar a issue e registrar os commits relacionados.
- [ ] Revisar e aprovar a integração pela PR.
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
