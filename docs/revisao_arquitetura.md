# Revisão de arquitetura e integração

## Base e escopo

Revisão de `feat/materiais-apoio` após integrar `develop` em `217da67`. A referência remota consultada foi `30fa811`. As mudanças preservam as migrações já publicadas e os contratos dos endpoints de materiais. O histórico remoto não foi alterado por esta revisão.

Foram consultados `PROJECT_CONTEXT.md`, `specs/backend-architecture-spec.md`, as skills de desenvolvimento em `skills/` e `.gemini/skills/`, a skill de revisão em `.github/skills/`, os requisitos, as regras de negócio e os guias de desenvolvimento e ETL. Não existe uma skill separada chamada spec: a especificação está em `specs/`.

## Revisão por pasta

| Pasta ou arquivo | Avaliação e tratamento |
| --- | --- |
| `backend/app/api/routers` | Rotas de materiais, turmas, professores e catálogo registradas. A implementação de cursos foi separada na PR #51, baseada em develop; não integra os commits locais desta revisão. |
| `backend/app/api/schemas` | Título de material validado e normalizado no schema, com mensagem em português. Schemas de curso com `from_attributes` e metadados ausentes foram separados na PR #51. |
| `backend/app/services` | Consultas delegadas aos repositórios. Serviço de disciplina não importa mais o pipeline. A coordenação entre transação e arquivo permanece no serviço de materiais. |
| `backend/app/repositories` | Repositórios de materiais e cursos (este último separado na PR #51) seguem `BaseRepository`. Códigos de pré-requisitos são buscados em lote e vínculos disciplina/curso usam carregamento antecipado. Turmas e professores já usam `selectinload` nas coleções N:N. |
| `backend/app/domain` | Validação de formato e tamanho permanece pura, independente de HTTP e SQLAlchemy. |
| `backend/app/core` | Removida propriedade duplicada da URL do banco; credenciais especiais são codificadas corretamente. Segredos obrigatórios por ambiente; CORS local sem wildcard padrão; configuração Pydantic v2. Normalização de slug compartilhada em módulo independente do ETL. |
| `backend/app/models` | Modelos de materiais e pipeline preservados; não houve mudança de schema nesta refatoração. |
| `backend/app/pipeline/extractors` | Coleta preservada. Importação da normalização de slug desacoplada dos transformadores. Integrações externas não foram executadas nesta revisão. |
| `backend/app/pipeline/transformers` | Normalização reutilizada pelo módulo comum; testes existentes de transformação e sanitização mantidos. |
| `backend/app/pipeline/loaders` | Erros de migração deixam de ser silenciosamente ignorados; carga transacional interrompe e propaga a falha. |
| `backend/app/pipeline/schemas` e `data` | Contratos e exemplos preservados. Diretórios de dados brutos/processados continuam ignorados pelo Git. |
| `backend/alembic` | Nova revisão `007_merge_materiais_pipeline` converge `006` e `002_materiais`. Não altera as revisões anteriores. |
| `backend/tests` | Fixtures comuns recuperam usuários, banco dedicado, savepoints e uploads temporários. Testes cobrem as duas linhas de migração, cursos reais, configuração, validação em português e limites de importação. |
| `docs` | Atualizados os comandos de testes e a exigência de PostgreSQL dedicado. Registradas as divergências documentais abaixo. |
| `specs` | A nova spec é a referência para o fluxo Router → Service → Repository e schemas. Os exemplos usam sessões síncronas, refletindo a implementação atual. |
| `skills` e `.gemini/skills` | A fonte canônica é `skills/tamburetei-dev/SKILL.md`; o ponto de entrada em `.gemini/skills/` referencia essa fonte. |
| `.github` | CI de materiais atualizado para o destino único de migração. Template de PR e skill de revisão preservados. |
| Infraestrutura na raiz | Migrações executadas uma vez no entrypoint e falhas interrompem a API. Uploads, ambientes virtuais e artefatos de mutação ignorados pelo Git. |
| `init.sql` | Referência legada; não é executado pelo Compose. Alembic permanece responsável pelo schema. Não aplicar os dois mecanismos sobre a mesma base. |
| Frontend | Não existe pasta de frontend nesta checkout; não foi possível revisar implementação de interface. |

## Alinhamentos documentais e pendências

1. **Persistência alinhada.** Contexto, spec, skills e guia arquitetural descrevem `Session` síncrona com psycopg2. Async fica como possível evolução separada.
2. **Moderação alinhada.** RN06 e histórias distinguem curadoria prévia de `conteudos` e moderação reativa dos arquivos de `materiais`. Diagramas da Feature 5.2 refletem o fluxo implementado; ações da Feature 5.3 permanecem planejadas.
3. **Transações.** O repositório base faz commit em `create`; materiais usam flush e deixam commit/rollback no serviço para compensar a gravação do arquivo. Não substituir esse fluxo pelo `create` genérico sem preservar a compensação.
4. **Credenciais bcrypt.** O cadastro legado valida 72 caracteres, enquanto o hashing limita 72 bytes UTF-8. Senhas longas com acentos podem ser truncadas. A correção deve definir compatibilidade e recuperação das contas existentes; não foi alterado o comportamento de autenticação nesta revisão.
5. **Mensagens de validação.** As regras explícitas de título foram traduzidas. Erros estruturais nativos de FastAPI/Pydantic (tipos, campos ausentes e limites de query) ainda precisam de uma política global de tradução para cumprir literalmente a spec.

## Resultados locais

- 164 testes aprovados na revisão geral com PostgreSQL 17, após separar os dois testes de cursos; migrações e pipeline cobertos em cenários simulados.
- Cobertura de 96,62% nos módulos selecionados de materiais; domínio com 100%.
- Bandit: nenhum achado médio ou alto; três achados de severidade baixa permanecem.
- Documentação compilada com `mkdocs build --strict` e diferenças verificadas com `git diff --check`.
- Confirmado que uploads e artefatos de mutação são ignorados pelo Git.

## Limites de validação

A suíte usa PostgreSQL 17 dedicado, com suporte a comparação de caracteres acentuados. A configuração recusa nomes de banco sem sufixo `_test` e não reutiliza automaticamente a base de desenvolvimento. Os testes de migração fazem downgrade e upgrade nesse banco exclusivo.

A cobertura informada para materiais se refere aos módulos selecionados, não a todo o backend. Os testes locais não substituem Docker Compose, Mutmut em Linux nem a coleta real no SIGAA. Esses itens não devem ser declarados aprovados sem execução correspondente. O projeto ainda não possui execução SonarQube neste workflow.

A implementação de cursos foi separada na PR #51, com dois testes e CI aprovados. As demais alterações são organizadas em commits locais na branch `feat/alinhamento-arquitetura`; publicação e issues dependem da revisão do responsável.
