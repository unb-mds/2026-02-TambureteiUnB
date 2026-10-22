# Revisão da integração de materiais — 12/10/2026

> Registro histórico da preparação inicial. As alterações solicitadas em 19/10/2026 estão em [Resposta à revisão da PR #95](revisao_pr95.md) e substituem as decisões de migração descritas abaixo.

## Escopo preparado para aprovação

Branch local: `feat/integracao-materiais`, baseada em `develop` (`f38c67c`). Implementação de upload, listagem pública e download autenticado, preservando cursos, comentários, métricas e frontend da base. Nenhum push, issue ou PR foi publicado nesta etapa.

## Alterações

- Modelo Material e migração `002_materiais`, preservada do histórico publicado.
- Históricos `007` e `007_merge_materiais_pipeline` convergem em `008_materiais_cursos`. A convergência não altera colunas nem reescreve revisões anteriores.
- Validação do título, formato, MIME, assinatura inicial e limite de tamanho.
- Armazenamento privado, nomes gerados pelo servidor e compensação em falhas de banco.
- API em camadas; repositório usa flush e o serviço controla a transação.
- Testes usam PostgreSQL exclusivo com sufixo `_test`, migrações reais e savepoints; cursos reutilizam as fixtures comuns.
- Volume persistente de arquivos; falhas de migração interrompem a inicialização.
- CI com testes, cobertura, Bandit, mutação e smoke HTTP antes/depois de recriar o backend.

## Evidências executadas

| Verificação | Resultado |
| --- | --- |
| Suíte completa em Docker / PostgreSQL 17 | 203 testes aprovados |
| Cobertura dos módulos selecionados de materiais | 96,62% |
| Domínio de materiais | 100% de cobertura |
| Workflow de cursos reproduzido localmente | 4 testes; 97,92% nos módulos selecionados |
| Migrações e integridade | 15 testes; históricos anteriores e preservação de registros |
| Mutmut no domínio de materiais | 34 mortos / 46 mutantes = 73,91%; 12 sobreviventes |
| Bandit no backend | 0 médios/altos; 4 baixos |
| Compose e smoke HTTP | Cadastro, login, envio, listagem e download aprovados |
| Persistência após recriação do backend | Arquivo e metadados preservados |
| Falha de Alembic simulada em banco exclusivo | API não iniciou |
| MkDocs | `build --strict` aprovado |

Os resultados são locais. O CI remoto só poderá ser confirmado após o envio autorizado. A cobertura não representa todo o backend. SonarQube e integrações externas do SIGAA não foram executados nesta entrega.

## Organização proposta no GitHub

Uma issue de integração será suficiente para acompanhar esta atualização, referenciando #33, #52, #55 e #57. As demais issues da revisão ampla continuam independentes. Proposta de PR para `develop`, com referência à PR #30 como implementação original. A PR antiga não será encerrada nem integrada automaticamente.

A milestone será confirmada com a sprint vigente antes da publicação; não reutilizar Sprint 4 automaticamente.

## Rascunho da issue

Título: `feat(materiais): integrar compartilhamento de arquivos ao backend atual`

### Contexto

A implementação original de materiais precisa acompanhar a evolução de develop, incluindo comentários e métricas de cursos, com um histórico Alembic convergente e validação reproduzível.

### Trabalho preparado

- [x] Integrar modelo, armazenamento e endpoints à base atual.
- [x] Preservar migrações publicadas e testar a convergência para `008_materiais_cursos`.
- [x] Validar restrições reais e preservação de registros no PostgreSQL.
- [x] Isolar o banco de testes e recuperar as fixtures compartilhadas.
- [x] Testar persistência dos arquivos após recriar o backend.
- [x] Executar testes, cobertura, mutação, Bandit e build da documentação.
- [ ] Revisar e aprovar o envio.
- [ ] Confirmar CI remoto e concluir revisão da PR.

Referências: #33, #52, #55 e #57; implementação anterior na PR #30.

## Rascunho da PR

Título: `feat(materiais): integra arquivos de apoio e migrações à develop`

### Descrição

Adiciona upload de PDF/PNG/JPG por estudante autenticado, listagem pública paginada e download protegido ao backend atual. Converge os históricos Alembic de materiais e métricas de cursos sem alterar revisões publicadas. Preserva o bootstrap existente e acrescenta volume privado persistente.

### Validação

203 testes em Docker com PostgreSQL 17; 96,62% nos módulos selecionados de materiais; domínio com 100%; Mutmut 73,91%; Bandit sem achados médios/altos; MkDocs estrito aprovado. Smoke HTTP aprovado antes e depois da recriação do backend. Falha de migração impede a inicialização.

### Rastreabilidade

Relacionar a issue de integração após sua criação. Complementa #33, #52, #55 e #57. Implementação original: #30.

### Limitações

Moderação administrativa da Feature 5.3 não incluída. Assinatura inicial não substitui antivírus. Interrupções abruptas podem gerar arquivos órfãos que exigem reconciliação. Permanecem os avisos de depreciação e as pendências globais de configuração/autenticação já existentes; #78 está atribuída a outra integrante.
