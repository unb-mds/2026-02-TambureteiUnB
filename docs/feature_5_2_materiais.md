# Feature 5.2 — Compartilhamento e upload de materiais

Implementação das US 5.2.1, 5.2.2 e 5.2.3 de [Histórias de Usuário do Backend](historias_usuario_backend.md), integrada à `develop` de referência `f38c67c`, na branch `feat/integracao-materiais`.

## 1. Escopo e decisões de integração

- Upload de arquivos PDF, PNG e JPG/JPEG por alunos autenticados (`STUDENT`).
- Listagem pública de materiais ativos, paginada e filtrada por título.
- Download protegido por JWT e perfil `STUDENT`.
- Arquivos físicos em diretório privado; somente o caminho relativo é persistido.
- Nova tabela `materiais`, independente dos links e resumos já representados por `conteudos`.

O status inicial é **`ativo`**, como determina expressamente a US 5.2.1. Essa decisão aplica-se aos arquivos desta feature; a curadoria `PENDENTE` dos registros em `conteudos` não foi alterada. O tratamento de denúncias e as ações de moderação pertencem à Feature 5.3. O download já respeita estados `em_analise`, `bloqueado` e `excluido`.

A integração utiliza as sessões SQLAlchemy síncronas e as dependências de autenticação existentes na branch base. As rotas são funções síncronas, executadas pelo FastAPI fora do event loop. Uma migração global para persistência assíncrona não faz parte desta entrega.

## 2. Estrutura da implementação

| Camada | Arquivo | Responsabilidade |
| --- | --- | --- |
| Modelo | `backend/app/models/material.py` | Metadados, vínculos, estados e restrições. |
| Migração | `backend/alembic/versions/002_materiais.py` | Evolução reversível de `001` para `002_materiais`. |
| Domínio | `backend/app/domain/materiais.py` | Validação de formato e tamanho, sem dependência de HTTP ou ORM. |
| Repositório | `backend/app/repositories/material_repo.py` | Persistência, busca, paginação e filtros. |
| Serviço | `backend/app/services/material_service.py` | Orquestração, transação e estados de disponibilidade. |
| Armazenamento | `backend/app/services/armazenamento_material.py` | Escrita em blocos, nomes aleatórios e acesso restrito ao diretório. |
| Schemas | `backend/app/api/schemas/material.py` | Contratos de metadados e paginação. |
| Rotas | `backend/app/api/routers/materiais.py` | Multipart, autenticação, parâmetros e resposta binária. |

O banco mantém `id`, `usuario_id`, `disciplina_id`, `titulo`, `caminho_arquivo`, `formato`, `tamanho_bytes`, `status_moderacao` e `created_at`. A API não expõe caminho interno nem identidade do autor nas respostas de materiais. A exclusão lógica da conta, já existente na autenticação, preserva as contribuições. Se houver exclusão física de usuário, a FK aplica `SET NULL`.

## 3. Preparar o ambiente

Na raiz do projeto:

```bash
cp .env.example .env
docker compose up -d --build
```

O Compose mantém o bootstrap `init.sql` da base atual, que cria o esquema de referência e registra a revisão `007` em volumes novos. O backend aguarda o PostgreSQL e aplica as migrações pendentes pelo Alembic antes de iniciar a API; falhas interrompem a inicialização. O volume privado `materiais_data` preserva os arquivos entre recriações do backend. O bootstrap não é reaplicado a volumes existentes.

**Banco existente:** as revisões `001`, `006`, `007`, `002_materiais` e `007_merge_materiais_pipeline` convergem para `008_materiais_cursos`. As migrações já publicadas são preservadas. A revisão `008` une os históricos sem criar novas colunas; a tabela de materiais é criada por `002_materiais`. Não executar `stamp` em uma base sem histórico sem conferir a correspondência real do esquema. Não apagar volumes para contornar conflitos.

Os testes verificam atualização a partir dos históricos de métricas de cursos e materiais, preservando registros acadêmicos, métricas e materiais existentes.

| Variável | Valor padrão | Uso |
| --- | --- | --- |
| `MATERIAL_MAX_BYTES` | `5242880` | Limite de 5 MiB por arquivo; deve ser maior que zero. |
| `MATERIALS_DIR` | `backend/storage/materiais` fora do Docker | Diretório privado; no Compose, `/app/storage/materiais`. |

Swagger: `http://localhost:8000/docs`. OpenAPI: `http://localhost:8000/api/v1/openapi.json`.

## 4. Autenticar

Reutilize o cadastro e o login da branch de integração:

```bash
curl -X POST http://localhost:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Aluno Exemplo","email":"aluno@example.com","senha":"UmaSenhaForte123!"}'

curl -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"aluno@example.com","senha":"UmaSenhaForte123!"}'
```

Use `access_token` no header `Authorization: Bearer <TOKEN>`. Os exemplos de comandos usam sintaxe Bash; no PowerShell, utilize `curl.exe` e adapte a continuação de linhas. A cadeira precisa estar previamente cadastrada pela funcionalidade de disciplinas existente.

## 5. US 5.2.1 — Enviar um material

```bash
curl -X POST http://localhost:8000/cadeiras/1/materiais \
  -H 'Authorization: Bearer <TOKEN>' \
  -F 'titulo=Resumo de cálculo' \
  -F 'arquivo=@resumo.pdf;type=application/pdf'
```

O formulário contém `titulo` (1 a 200 caracteres após remover espaços nas extremidades) e `arquivo`. O servidor verifica extensão, MIME e assinatura inicial. `.jpeg` também é aceito, normalizado para `jpg`. Os MIME aceitos são `application/pdf`, `image/png` e `image/jpeg`.

Resposta `201` com metadados, por exemplo:

```json
{
  "id": 1,
  "disciplina_id": 1,
  "titulo": "Resumo de cálculo",
  "formato": "pdf",
  "tamanho_bytes": 1024,
  "status_moderacao": "ativo",
  "created_at": "2026-09-23T18:00:00Z"
}
```

O nome original nunca é usado como caminho: cada arquivo recebe um UUID. A escrita ocorre em blocos e os arquivos parciais são removidos em caso de falha. Se a persistência dos metadados falhar, a transação é revertida e o arquivo é removido. Falhas de limpeza são registradas em log para intervenção operacional.

## 6. US 5.2.2 — Listar materiais

```bash
curl 'http://localhost:8000/cadeiras/1/materiais?titulo=resumo&pagina=1&tamanho_pagina=20'
```

- Acesso público, sem token.
- Apenas `status_moderacao = ativo`.
- Busca por trecho do título sem diferenciar maiúsculas e minúsculas; `%` e `_` são tratados como caracteres literais.
- `pagina` começa em 1; `tamanho_pagina` vai de 1 a 100, com padrão 20.
- Ordenação estável por ID decrescente (mais recentes primeiro).

Cadeira existente sem materiais, filtro sem resultados ou página além do final retorna `200`, com `items: []`. O campo `total` corresponde a todos os resultados do filtro, antes da paginação:

```json
{"items": [], "total": 0, "pagina": 1, "tamanho_pagina": 20}
```

## 7. US 5.2.3 — Baixar material

```bash
curl http://localhost:8000/materiais/1/download \
  -H 'Authorization: Bearer <TOKEN>' \
  -o material.pdf
```

A resposta usa `FileResponse`, MIME correspondente ao formato, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` e `Cache-Control: private, no-store`. A API verifica o estado de moderação e se o caminho permanece dentro do diretório privado, inclusive após resolução de links simbólicos.

## 8. Respostas de erro

| HTTP | Situação |
| --- | --- |
| 400 | Arquivo vazio; conta inativa ainda localizada pelo fluxo de autenticação da base. |
| 401 | Token ausente, inválido, expirado ou cujo usuário não foi encontrado. |
| 403 | Perfil diferente de `STUDENT` em upload/download, ou material bloqueado/em análise no download. |
| 404 | Cadeira inexistente, material inexistente/excluído ou arquivo indisponível/caminho inválido. |
| 413 | Arquivo maior que o limite configurado; exatamente 5 MiB é aceito no padrão. |
| 415 | Formato, extensão, MIME ou assinatura não permitido/incompatível. |
| 422 | Título, ID, formulário ou paginação inválidos. |
| 503 | Falha de armazenamento ou persistência durante o upload. |

## 9. Executar os testes

Em `backend/`, com Python 3.12+ e um ambiente virtual:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest tests/unit -q
```

Os testes de integração exigem `TEST_DATABASE_URL` apontando para um PostgreSQL 17 exclusivo de testes, cujo nome termine em `_test`. As migrações do pipeline usam alterações de tipos não suportadas pelo SQLite. Sem banco configurado, execute apenas `python -m pytest tests/unit -q`. Use collation com suporte a caracteres acentuados (por exemplo, ICU `pt-BR`) para validar as buscas em português:

```bash
export TEST_DATABASE_URL='postgresql://postgres:postgres@localhost:5432/materiais_test'
python -m pytest -q \
  --cov=app.domain --cov=app.services.material_service \
  --cov=app.services.armazenamento_material --cov=app.repositories.material_repo \
  --cov-report=term-missing --cov-fail-under=90
python -m bandit -r app -ll
```

As tabelas de teste são criadas pelas migrações reais; cada caso usa uma transação isolada. O teste de migração verifica os pontos `001`, `006`, `007`, `002_materiais` e `007_merge_materiais_pipeline` e retorna para `head`, portanto nunca use uma base de desenvolvimento compartilhada ou produção em `TEST_DATABASE_URL`.

No Windows, se houver erro de inicialização PyO3/bcrypt ao medir cobertura, carregue a biblioteca antes do pytest (`python -c "import bcrypt, pytest; raise SystemExit(pytest.main(['-q', '--cov=app.domain']))"`). Erros de permissão em temporários podem ser isolados com `--basetemp` apontando para uma pasta nova dedicada e `-p no:cacheprovider`.

O workflow `Backend - Materiais` executa os testes com PostgreSQL 17, cobertura mínima de 90% nos módulos da feature, Bandit e mutação de domínio com Mutmut (mínimo de 50% de mutantes mortos). Para reproduzir a mutação em Linux/WSL:

```bash
mutmut run --max-children 2
mutmut results
```

## 10. Limites e operação

- A verificação de assinatura não equivale a antivírus nem comprova que o documento inteiro esteja íntegro. Os arquivos são oferecidos como anexos, sem execução ou exibição inline pelo backend.
- O limite é aplicado ao conteúdo do arquivo. Em publicação com proxy, configurar também limite de corpo HTTP compatível com o overhead multipart para evitar requisições excessivas antes do processamento.
- O diretório de uploads não deve ser publicado como arquivos estáticos, pois isso contornaria autenticação e moderação.
- A Feature 5.3 deverá gerenciar a moderação e a remoção física dos arquivos. Não foram adicionados endpoints administrativos fora do escopo 5.2.
- Banco e diretório de arquivos não compartilham uma transação distribuída: erros capturados são compensados, mas interrupções abruptas do processo podem exigir reconciliação operacional de arquivos órfãos.

A revisão final `008_materiais_cursos` converge o histórico `007` de métricas de cursos e o histórico `007_merge_materiais_pipeline`, preservando ambos.


## 11. Rastreabilidade e integração

- Implementação original: issue #33 e PR #30.
- Migrações e isolamento: issue #52.
- Validação e persistência: issue #55.
- Containers e execução: issue #57.
- Esta atualização parte da `develop` atual e preserva cursos, comentários e métricas de cursos. A revisão ampla de configuração (#53, sobreposta à #78) e os ajustes de catálogo (#56) não foram incorporados nesta entrega.

A validação da assinatura inicial não é antivírus. A exclusão de metadados por cascata não remove arquivos físicos automaticamente; a reconciliação e as ações administrativas continuam fora da Feature 5.2.


## 12. Smoke HTTP e persistência no Docker

Execute somente em um projeto Compose isolado, sem usar volumes do ambiente de desenvolvimento:

```bash
docker compose --env-file .env.example -p materiais-validacao up -d --build backend
docker compose --env-file .env.example -p materiais-validacao exec -T -e MATERIAIS_SMOKE_TEST=1 -e PYTHONPATH=. backend python tests/smoke/materiais.py enviar
docker compose --env-file .env.example -p materiais-validacao up -d --force-recreate --no-deps backend
docker compose --env-file .env.example -p materiais-validacao exec -T -e MATERIAIS_SMOKE_TEST=1 -e PYTHONPATH=. backend python tests/smoke/materiais.py conferir
```

Aguarde `/health` responder após cada inicialização. O script cria uma conta e disciplina de teste no ambiente isolado, envia um PDF e verifica listagem pública, autenticação e conteúdo baixado. A etapa `conferir` repete a leitura após a recriação do serviço, verificando a persistência dos metadados e do arquivo. Ao encerrar, `docker compose --env-file .env.example -p materiais-validacao down` preserva os volumes para inspeção.
