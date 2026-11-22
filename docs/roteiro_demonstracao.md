# Roteiro de Demonstração

## Objetivo

Apresentar a jornada central do Tamburetei UnB, conectando dados reais, colaboração acadêmica e moderação.

## Preparação

1. Subir os serviços com Docker Compose.
2. Confirmar que o frontend responde em `http://localhost:3000`.
3. Disponibilizar contas fictícias de estudante e moderador.
4. Selecionar uma disciplina com métricas e turmas carregadas.
5. Ter um arquivo PDF válido disponível para upload.

## Sequência Recomendada

1. **Página inicial**
   - Apresentar o propósito público da plataforma.
   - Navegar para cursos ou disciplinas.

2. **Catálogo e filtros**
   - Abrir uma disciplina.
   - Mostrar filtros por turno e ordenações por ocupação.
   - Demonstrar a atualização da contagem de turmas.

3. **Métricas da disciplina**
   - Mostrar taxas reais e base acumulada.
   - Explicar semestres suprimidos quando houver baixa amostragem.

4. **Envio de material**
   - Abrir o modal como usuário autenticado.
   - Mostrar validação de formato e tamanho.
   - Enviar um PDF válido e apresentar o estado de sucesso.

5. **Colaboração acadêmica**
   - Registrar uma dificuldade ou comentário associado à ementa.
   - Demonstrar anonimato/pseudônimo e validação do conteúdo.

6. **Moderação**
   - Entrar com uma conta moderadora.
   - Abrir `/moderacao`.
   - Pré-visualizar ou baixar o material pendente.
   - Aprovar ou recusar com justificativa.

7. **Encerramento**
   - Retornar à disciplina e confirmar o novo estado visível.
   - Ressaltar LGPD, curadoria e dados abertos.

## Evidências a Capturar

- Tela inicial.
- Catálogo e filtro ativo.
- Página da disciplina com dados reais.
- Modal de upload com sucesso.
- Registro colaborativo.
- Fila de moderação e decisão.
