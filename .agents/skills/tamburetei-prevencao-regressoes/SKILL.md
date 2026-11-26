---
name: tamburetei-prevencao-regressoes
description: Licoes aprendidas e armadilhas historicas do Tamburetei UnB para evitar regressoes em banco de dados, migracoes Alembic, moderacao, denuncias, links externos, historico SIGAA, ordenacao de catalogos, tema claro/escuro, revisao de PRs e deploy em producao. Consulte antes de alterar fluxos criticos ou revisar PRs.
---

# Skill: Prevencao de Regressoes e Licoes Aprendidas — Tamburetei UnB

Esta skill consolida falhas reais e bugs diagnosticados anteriormente no repositorio para impedir que voltem a ocorrer em novas alteracoes, revisoes de PR ou deploys.

Regra absoluta do repositorio (`AGENTS.md`): nunca utilizar emojis, emoticons ou pictogramas em arquivos, commits, PRs ou respostas.

---

## 1. Banco de Dados, Constraints e Migracoes Alembic

1. **Preservacao rigorosa de dados e volumes em producao:**
   * Nunca executar `docker compose down -v` ou remover volumes em producao (`57.156.64.76`, `/opt/tamburetei`).
   * Em deploys de producao, executar `docker compose -f docker-compose.prod.yml up -d --build` e conferir contagens antes/depois nas tabelas com dados acumulados (`estatisticas_consolidadas`, `doacoes_estatisticas`, `conteudos`, `relatos_bugs`).
2. **Encadeamento linear do Alembic e testes de revisao `head`:**
   * Toda nova migracao em `backend/alembic/versions/` deve possuir apenas um `down_revision` (sem branches paralelos). Conferir com `alembic heads`.
   * Ao criar nova migracao, atualizar imediatamente as assercoes da revisao esperada em `backend/tests/integration/test_conteudos_arquivos.py` e `backend/tests/integration/test_migracao_material.py` (evitando quebra no CI mesmo quando toda a feature passar).
   * Ao remover ou recriar `CHECK` constraints antigas no PostgreSQL, usar bloco idempotente (`DROP CONSTRAINT IF EXISTS` e inspecao em `pg_constraint` quando o nome possa ter sido autogerado pelo `init.sql`), e antes de migrar producao verificar se existem linhas incompativeis.
3. **Constraint polimorfica de `conteudos` (`chk_origem_conteudo`):**
   * **Arquivos fisicos:** `caminho_arquivo IS NOT NULL`, `url_origem IS NULL`, `formato IS NOT NULL`, `tamanho_bytes IS NOT NULL`, `status_moderacao IS NOT NULL`.
   * **Links externos:** `tipo <> 'ARQUIVO'`, `url_origem IS NOT NULL`, `caminho_arquivo IS NULL`, `formato IS NULL`, `tamanho_bytes IS NULL` e **`status_moderacao IS NULL`**.
   * **Armadilha critica:** em curadoria (`CuradoriaService.decidir`), listagem (`MaterialRepo.listar_ativos` / `CuradoriaRepo.listar_pendentes`) e denuncias (`DenunciaService.criar` / `DenunciaService.decidir`), **nunca** atribuir `"ativo"`, `"em_analise"` ou `"excluido"` a `status_moderacao` de um link externo, sob risco de violar `chk_origem_conteudo` com erro 503. Controlar visibilidade e ocultacao de links exclusivamente via `status_curadoria` (`PENDENTE`, `APROVADO`, `RECUSADO`).

---

## 2. Materiais de Apoio, Links Externos, Denuncias e Moderacao

1. **Nada de placeholders bloqueantes (`[PENDENCIA DE BACKEND]`):**
   * Toda categoria selecionavel pelo usuario na UI (como `RESUMO`, `DICA` e `PROVA_ANTIGA` na aba `Adicionar Link Externo` do `MaterialModal`) deve ter rota real no backend (`POST /cadeiras/{id}/links`), entrar com `status_curadoria = "PENDENTE"` na fila de curadoria e aparecer na listagem publica apos aprovacao.
2. **Seguranca de URLs externas e previews:**
   * Validar URLs com protocolo estrito `http://` ou `https://` e hostname valido tanto no frontend (`validateExternalUrl`) quanto no schema Pydantic (`validar_url_externa`). Bloquear `javascript:`, `data:` e `file:`.
   * Renderizar links externos sempre com `target="_blank" rel="noopener noreferrer"`.
   * Garantir pre-visualizacao inline (`MaterialPreviewModal`) em modo somente leitura nos Materiais de Apoio e na aba de Denuncias (`GET /moderacao/denuncias/{id}/arquivo`), revogando `ObjectURL` ao fechar/desmontar e protegendo contra race conditions com contador de sequencia.
3. **Triagem automatica e LGPD (`RN01`) em comentarios e respostas:**
   * Nunca aplicar regex de deteccao de dados pessoais (`detectar_dados_pessoais_rn01`) sobre `autor_alias`, pois nomes publicos de contas autenticadas geram falsos positivos. Avaliar somente `topico` e `conteudo`.
   * Orientar explicitamente no prompt da IA que `Apelido do autor` e o nome publico permitido da conta e que casos duvidosos devem ir para `REVISAO_HUMANA`.
   * Em respostas (`parent_id`), validar existencia do comentario pai (`404`) e pertencimento a mesma disciplina (`422`).
4. **Paridade de denuncias:**
   * Comentarios (`ComentariosFrontend`) e materiais de apoio (`MateriaisApoio` — arquivos e links) devem permitir denuncia autenticada (`POST /comunidade/denuncias`), ocultacao preventiva automatica ao atingir o limiar (3 sinalizacoes) e revisao completa em `/moderacao`.

---

## 3. Historico Escolar SIGAA, Turmas e Graficos de Pizza

1. **Filtragem estrita de turmas elegiveis para envio de pizza:**
   * Nunca exibir turmas em andamento (`cursando` / `MATR`) nem turmas trancadas/canceladas (`TRANC` / `CANC`) no seletor de envio de graficos de pizza (`extrairTurmasCursadasDoHistorico` e `validarVinculoEstudanteTurma`). Permitir apenas turmas concluidas com desfecho academico (`APR`, `REP`, `REPF`, `REPMF`).
2. **Identificacao de turma sem colisao por docente:**
   * Nao utilizar fallback por nome de professor para identificar ou bloquear turmas (`doacao_service.py` / `TurmaEstatisticaModal.tsx`), pois o mesmo docente pode ministrar mais de uma turma da mesma disciplina no mesmo semestre (ex.: uma trancada e outra aprovada).
   * Ao importar historico (`historico_importacao_service.py`), cadastrar/vincular cada `Turma` antes da deduplicacao de amostras (`dedup_hash`) para nao perder o vinculo quando houver multiplas tentativas no mesmo semestre.
3. **Preservacao exata de percentuais decimais:**
   * Nunca usar `Math.round()` inteiro em cards de turma (`ClassCard.tsx`), o que fazia somas como `97% + 1% + 3% = 101%`.
   * Preservar as parcelas exatas enviadas dentro da tolerancia SIGAA (`BETWEEN 99.80 AND 100.20` em `022_preservar_taxas_pizza` e `academicMetrics.ts`) sem reescalar nem alterar valores individuais.
4. **Reenvio apos recusa com auditoria:**
   * Manter registros `DESCARTADA` em `doacoes_estatisticas` para trilha de auditoria utilizando indice unico parcial (`WHERE status <> 'DESCARTADA'`), bloqueando reenvio apenas se ja houver envio ativo ou pizza consolidada (`DOACAO_QUORUM`).

---

## 4. Ordenacao, UI e Compatibilidade de Tema

1. **Priorizar entidades com dados reais nas listagens:**
   * Catalogo de disciplinas (`/disciplinas`): ordenar primeiro disciplinas com dados de pizza (`DOACAO_QUORUM`), depois apenas dados de historico (`HISTORICO_SIGAA`), e por ultimo sem dados.
   * Aba `Turmas anteriores` (`/disciplinas/[slug]`): ordenar primeiro turmas que ja possuem estatisticas ou amostras consolidadas antes das turmas sem dados.
2. **Compatibilidade com tema claro e escuro (`globals.css`):**
   * Utilizar preferencialmente variaveis CSS do tema (`--surface`, `--surface-muted`, `--foreground`, `--border-subtle`, `--primary-text`, `--text-muted`) ou classes mapeadas em `frontend/src/app/globals.css`, garantindo contraste WCAG AA em modais, alertas e dialogos nos dois temas.
   * Nao usar `alert()`/`confirm()` para fluxos comuns de autenticacao ou validacao; usar avisos inline com `role="status"` ou `role="alert"`.

---

## 5. Fluxo de Revisao de PRs, Automacao e Comandos

1. **Verificacao real de PRs antes de aprovar:**
   * Simular o merge real de 3 vias contra a `develop` atual usando `git merge-tree --write-tree develop <head-pr>` em vez de confiar apenas no `gh pr diff` quando a PR estiver desatualizada em relacao a base.
   * Verificar se a PR remove ou regride correcoes recentes da `develop` (ex.: validacoes de turma, arredondamento, constraints ou migrations) e inspecionar falhas de CI com `gh run view <run-id> --log-failed`.
2. **Armadilhas de shell (Windows PowerShell e SSH):**
   * Em Windows PowerShell com rotas Next.js que contem colchetes (ex.: `disciplinas/[slug]/page.tsx`), usar `-LiteralPath` em `Select-String`/`Get-Content`.
   * Em scripts SSH enviados por pipe (`bash -s`), redirecionar `< /dev/null` em comandos `docker compose exec -T` para nao consumir o restante do script da entrada padrao.
3. **Verificacao antes de concluir ou subir:**
   * Rodar testes unitarios/integracao do backend (`pytest`), testes do frontend (`node --import tsx --test`), `npx tsc --noEmit`, `npm run lint` e `npm run build` apos a ultima edicao relevante, reportando exatamente o escopo executado e eventuais servicos indisponiveis (ex.: daemon Docker desligado).
