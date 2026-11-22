# Materiais públicos: download, paginação e erros

## Correções

A ação Baixar material consulta a rota de arquivo com JWT, recebe um Blob e inicia o download. O endereço temporário é liberado após o uso. Visitantes recebem orientação de login; as falhas retornadas pela API são apresentadas na própria seção.

A listagem envia título, página e tipos ao servidor. O filtro `tipos` permite agrupar RESUMO e DICA; o filtro singular `tipo` continua disponível, mas não pode ser combinado com `tipos`. Tipos inválidos retornam 422. As condições existentes de curadoria e moderação são preservadas.

A interface usa 20 itens por página e o total informado pela API. Busca e categoria reiniciam a página. Respostas de consultas anteriores não sobrescrevem a consulta atual. Uma falha da API tem estado próprio e botão Tentar novamente; resposta vazia continua tendo mensagem de ausência de resultados.

O acompanhamento pós-upload continua consultando os materiais recentes para identificar a publicação, independentemente do filtro da lista que estava aberto.

## Validação local

- Suíte completa do backend: **535 testes aprovados**, com PostgreSQL em banco isolado `_test`.
- **125 testes do frontend aprovados na entrega conjunta**, incluindo token e conteúdo binário, respostas 401/403/404/503 e parâmetros de consulta.
- Ruff, ESLint dos arquivos alterados, TypeScript e build aprovados.
- Navegador com API simulada: páginas de 20/20/3 itens; pesquisa de material fora da primeira página; download com JWT e conteúdo PDF conferido; resposta antiga descartada; erro 503 e nova tentativa; filtro de provas.
- Testes reais de API confirmam busca global, páginas sem duplicação, categoria RESUMO/DICA, preservação do filtro singular e exclusão de arquivos pendentes.

![Materiais com download e categoria filtrada](assets/diagnostico-bugs/materiais-corrigidos.png)

## Relação com o diagnóstico

O [diagnóstico inicial](diagnostico_bugs_funcionais.md) e suas capturas registram a revisão anterior às correções. A PR #220 reúne as correções de materiais, métricas e Início/Cursos. O vínculo de comentários permanece acompanhado separadamente na PR #218.

Branch: `fix/materiais-publicos`. **Sprint 12**. Acompanhamento: [issue #216](https://github.com/unb-mds/2026-02-TambureteiUnB/issues/216) e [PR #220](https://github.com/unb-mds/2026-02-TambureteiUnB/pull/220).
