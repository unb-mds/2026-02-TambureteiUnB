# Integridade do vínculo entre comentário, turma e disciplina

## Problema e comportamento esperado

A criação e a listagem verificavam se a turma existia, mas aceitavam uma turma de outra disciplina. O serviço agora verifica `turma.disciplina_id` antes de persistir ou consultar comentários.

Uma associação incompatível retorna 422 com mensagem em português. Disciplina ou turma inexistentes continuam retornando 404. Comentários sem turma e turmas compatíveis preservam o comportamento existente. A API continua delegando ao serviço.

## Validação local

- Sete cenários unitários: criação e listagem com turma válida, inexistente ou incompatível; criação sem turma.
- Três testes de endpoints com PostgreSQL: criação direta, criação pela cadeira e listagem. Verificam 422 e ausência de novos comentários.
- Suíte completa do backend: **539 testes aprovados**, em banco PostgreSQL dedicado com sufixo `_test`, sem alterações no banco da aplicação.
- Ruff aprovado nos arquivos alterados.

Os 28 testes selecionados de comentários atingiram **94,12% de cobertura de linhas do serviço alterado** (64 de 68 instruções). Esse percentual se refere ao serviço de comentários, não ao projeto inteiro.

## Rastreabilidade

Branch local: `fix/comentarios-vinculo-turma`. Sprint planejada: **Sprint 12**. A publicação da issue e da PR depende da revisão do conteúdo e dos commits.
