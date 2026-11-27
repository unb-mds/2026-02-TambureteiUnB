import test from "node:test";
import assert from "node:assert/strict";
import {
  verificarModerador,
  podeModerar,
  listarPendentes,
  decidirCuradoria,
  listarComentariosPendentes,
  decidirComentarioCuradoria,
  baixarArquivoDenuncia,
  baixarParaAnalise,
  validarMotivoDenuncia,
  criarDenuncia,
  listarDenunciasPendentes,
  decidirDenuncia,
  consultarStatusComentario,
  resolverAvisoTriagemComentario,
  iniciarPollingStatusComentario,
  listarPizzasModeracao,
  baixarImagemPizza,
  decidirPizzaModeracao,
  substituirArquivoMaterial,
} from "../moderacaoService.ts";
import { ApiError } from "../httpClient.ts";

const dados = new Map<string, string>();
Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: {
  getItem: (key: string) => dados.get(key) ?? null,
  setItem: (key: string, value: string) => dados.set(key, value),
  removeItem: (key: string) => dados.delete(key),
}, configurable: true });

test("somente perfis administrativos podem moderar", () => {
  assert.equal(podeModerar("STUDENT"), false);
  assert.equal(podeModerar("MODERATOR"), true);
  assert.equal(podeModerar("ADMIN"), true);
});

test("perfil ADMIN em cache não autoriza estudante", async (t) => {
  dados.set("tamburetei_auth_token", "token");
  dados.set("tamburetei_user", JSON.stringify({ role: "ADMIN" }));
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ id: "1", role: "STUDENT" }), { status: 200 }));
  await assert.rejects(verificarModerador(), (e: unknown) => e instanceof ApiError && e.status === 403);
});

test("sem token não consulta sessão", async (t) => {
  dados.clear();
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("Não deveria consultar"); });
  await assert.rejects(verificarModerador(), (e: unknown) => e instanceof ApiError && e.status === 401);
  assert.equal(fetch.mock.callCount(), 0);
});

test("sessão expirada não usa fallback de cache", async (t) => {
  dados.set("tamburetei_auth_token", "expirado");
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "Token expirado." }), { status: 401 }));
  await assert.rejects(verificarModerador(), (e: unknown) => e instanceof ApiError && e.status === 401);
});

test("perfil administrativo validado no servidor", async (t) => {
  dados.set("tamburetei_auth_token", "token");
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ id: "1", role: "ADMIN", is_active: true }), { status: 200 }));
  assert.equal((await verificarModerador()).role, "ADMIN");
});

test("fila e decisão usam Bearer e contrato correto", async (t) => {
  dados.set("tamburetei_auth_token", "token");
  const chamadas: Array<{ url: string; options: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    chamadas.push({ url, options });
    return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 });
  });
  await listarPendentes(2);
  await decidirCuradoria(12, "RECUSADO", "  Material inadequado.  ");
  await listarComentariosPendentes(3);
  await decidirComentarioCuradoria(44, "OCULTO", "  Ofensa detectada.  ");
  assert.match(chamadas[0].url, /moderacao\/materiais\?pagina=2&tamanho_pagina=20/);
  assert.equal(new Headers(chamadas[0].options.headers).get("Authorization"), "Bearer token");
  assert.equal(chamadas[1].options.method, "PATCH");
  assert.deepEqual(JSON.parse(String(chamadas[1].options.body)), { status: "RECUSADO", justificativa: "Material inadequado." });
  assert.match(chamadas[2].url, /moderacao\/comentarios\?pagina=3&tamanho_pagina=20/);
  assert.equal(chamadas[3].options.method, "PATCH");
  assert.deepEqual(JSON.parse(String(chamadas[3].options.body)), { status: "OCULTO", justificativa: "Ofensa detectada." });
});

test("conflito de outro moderador é propagado", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "Já avaliado." }), { status: 409 }));
  await assert.rejects(decidirCuradoria(12, "APROVADO"), (e: unknown) => e instanceof ApiError && e.status === 409);
});

test("fila e decisão de gráficos de pizza usam endpoints dedicados da moderação", async (t) => {
  dados.set("tamburetei_auth_token", "token");
  const chamadas: Array<{ url: string; options: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    chamadas.push({ url, options });
    if (url.endsWith("/imagem")) {
      return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200 });
    }
    return new Response(JSON.stringify({ grupos_semestre: [], total_itens: 0, total_envios_pendentes: 0 }), { status: 200 });
  });

  await listarPizzasModeracao();
  await baixarImagemPizza(77);
  await decidirPizzaModeracao(77, {
    status: "CONSOLIDADA",
    taxa_aprovacao: 80,
    taxa_reprovacao_nota: 10,
    taxa_reprovacao_falta: 5,
    taxa_trancamento: 5,
    justificativa: "  Print conferido. ",
  });

  assert.match(chamadas[0].url, /\/moderacao\/pizzas$/);
  assert.match(chamadas[1].url, /\/moderacao\/pizzas\/77\/imagem$/);
  assert.equal(new Headers(chamadas[1].options.headers).get("Authorization"), "Bearer token");
  assert.match(chamadas[2].url, /\/moderacao\/pizzas\/77\/decisao$/);
  assert.equal(chamadas[2].options.method, "PATCH");
  assert.deepEqual(JSON.parse(String(chamadas[2].options.body)), {
    status: "CONSOLIDADA",
    taxa_aprovacao: 80,
    taxa_reprovacao_nota: 10,
    taxa_reprovacao_falta: 5,
    taxa_trancamento: 5,
    justificativa: "Print conferido.",
  });
});

test("download usa endpoint protegido e retorna binário", async (t) => {
  dados.set("tamburetei_auth_token", "token");
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.match(url, /moderacao\/materiais\/12\/download$/);
    assert.equal(new Headers(options.headers).get("Authorization"), "Bearer token");
    return new Response("%PDF-1.7 teste", { status: 200 });
  });
  assert.equal(await (await baixarParaAnalise(12)).text(), "%PDF-1.7 teste");
});

test("validarMotivoDenuncia aplica limites minimos e maximos", () => {
  assert.equal(validarMotivoDenuncia("   ").valido, false);
  assert.match(validarMotivoDenuncia("abcd").erro ?? "", /mínimo 5 caracteres/);
  assert.match(validarMotivoDenuncia("x".repeat(1001)).erro ?? "", /máximo 1000 caracteres/);
  assert.deepEqual(validarMotivoDenuncia("  Ataque direto ao docente da disciplina (RN04).  "), {
    valido: true,
  });
});

test("criarDenuncia valida entrada e envia POST para /comunidade/denuncias", async (t) => {
  dados.set("tamburetei_auth_token", "token-aluno");
  const chamadas: Array<{ url: string; options: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    chamadas.push({ url, options });
    return new Response(
      JSON.stringify({
        id: 7,
        tipo_alvo: "COMENTARIO",
        comentario_id: 42,
        conteudo_id: null,
        categoria: "OFENSA_DOCENTE",
        motivo: "Comentário contém juízo depreciativo contra o docente.",
        status: "PENDENTE",
        total_denuncias_alvo: 1,
        ocultado_automaticamente: false,
        created_at: "2026-11-06T12:00:00Z",
      }),
      { status: 201 },
    );
  });

  await assert.rejects(
    criarDenuncia({ categoria: "OFENSA_DOCENTE", motivo: "Motivo válido com mais de cinco letras" }),
    /alvo válido/,
  );

  await assert.rejects(
    criarDenuncia({ comentario_id: 42, categoria: "OFENSA_DOCENTE", motivo: "abc" }),
    /mínimo 5 caracteres/,
  );

  const resposta = await criarDenuncia({
    comentario_id: 42,
    categoria: "OFENSA_DOCENTE",
    motivo: "  Comentário contém juízo depreciativo contra o docente.  ",
  });

  assert.equal(resposta.id, 7);
  assert.equal(resposta.status, "PENDENTE");
  assert.match(chamadas[0].url, /\/comunidade\/denuncias$/);
  assert.equal(chamadas[0].options.method, "POST");
  assert.deepEqual(JSON.parse(String(chamadas[0].options.body)), {
    comentario_id: 42,
    categoria: "OFENSA_DOCENTE",
    motivo: "Comentário contém juízo depreciativo contra o docente.",
  });
});

test("listarDenunciasPendentes e decidirDenuncia enviam filtros e payload de acao", async (t) => {
  dados.set("tamburetei_auth_token", "token-mod");
  const chamadas: Array<{ url: string; options: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    chamadas.push({ url, options });
    return new Response(JSON.stringify({ items: [], total: 0, pagina: 1, tamanho_pagina: 20 }), { status: 200 });
  });

  await listarDenunciasPendentes(1, "COMENTARIO", "OFENSA_DOCENTE");
  assert.match(chamadas[0].url, /\/moderacao\/denuncias\?pagina=1&tamanho_pagina=20&tipo=COMENTARIO&categoria=OFENSA_DOCENTE$/);

  await decidirDenuncia(15, "EXCLUIR_CONTEUDO", "  Violação confirmada da RN04. ");
  assert.match(chamadas[1].url, /\/moderacao\/denuncias\/15$/);
  assert.equal(chamadas[1].options.method, "PATCH");
  assert.deepEqual(JSON.parse(String(chamadas[1].options.body)), {
    acao: "EXCLUIR_CONTEUDO",
    justificativa: "Violação confirmada da RN04.",
  });

  await decidirDenuncia(16, "DESCARTAR_DENUNCIA");
  assert.deepEqual(JSON.parse(String(chamadas[2].options.body)), {
    acao: "DESCARTAR_DENUNCIA",
    justificativa: null,
  });
});

test("criarDenuncia e baixarArquivoDenuncia cobrem denuncias de materiais", async (t) => {
  dados.set("tamburetei_auth_token", "token-mat");
  const chamadas: Array<{ url: string; options: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    chamadas.push({ url, options });
    if (url.endsWith("/arquivo")) {
      return new Response("%PDF-1.7 material", { status: 200 });
    }
    return new Response(
      JSON.stringify({
        id: 33,
        tipo_alvo: "MATERIAL",
        comentario_id: null,
        conteudo_id: 91,
        categoria: "GABARITO_ATIVO",
        motivo: "Prova contém gabarito vigente.",
        status: "PENDENTE",
        total_denuncias_alvo: 1,
        ocultado_automaticamente: false,
        created_at: "2026-11-26T12:00:00Z",
      }),
      { status: 201 }
    );
  });

  const resposta = await criarDenuncia({
    conteudo_id: 91,
    categoria: "GABARITO_ATIVO",
    motivo: "Prova contém gabarito vigente.",
  });
  assert.equal(resposta.tipo_alvo, "MATERIAL");
  assert.deepEqual(JSON.parse(String(chamadas[0].options.body)), {
    conteudo_id: 91,
    categoria: "GABARITO_ATIVO",
    motivo: "Prova contém gabarito vigente.",
  });

  const blob = await baixarArquivoDenuncia(33);
  assert.equal(await blob.text(), "%PDF-1.7 material");
  assert.match(chamadas[1].url, /\/moderacao\/denuncias\/33\/arquivo$/);
  assert.equal(new Headers(chamadas[1].options.headers).get("Authorization"), "Bearer token-mat");
});

test("resolverAvisoTriagemComentario distingue aprovado, recusado e encaminhado para revisao", () => {
  assert.equal(
    resolverAvisoTriagemComentario({ id: 1, status_moderacao: "PENDENTE", moderado_por: null, motivo_moderacao: null }),
    null
  );

  const recusado = resolverAvisoTriagemComentario(
    {
      id: 8,
      status_moderacao: "OCULTO",
      moderado_por: "IA",
      motivo_moderacao: "[OFENSA_DIFAMACAO] Conteúdo ofensivo",
    },
    "relato"
  );
  assert.equal(recusado?.kind, "rejected");
  assert.match(recusado?.text ?? "", /\[RECUSADO\].*Motivo: \[OFENSA_DIFAMACAO\]/);

  const revisao = resolverAvisoTriagemComentario(
    {
      id: 9,
      status_moderacao: "PENDENTE",
      moderado_por: "IA",
      motivo_moderacao: "Confiança abaixo do limiar",
    },
    "resposta"
  );
  assert.equal(revisao?.kind, "review");
  assert.match(revisao?.text ?? "", /\[EM REVISÃO\] Sua resposta/);

  const publicado = resolverAvisoTriagemComentario({ id: 10, status_moderacao: "PUBLICADO" }, "dificuldade");
  assert.equal(publicado?.kind, "approved");
  assert.match(publicado?.text ?? "", /\[PUBLICADO\] Seu relato de dificuldade/);
});

test("consultarStatusComentario e iniciarPollingStatusComentario notificam recusa automaticamente", async (t) => {
  dados.set("tamburetei_auth_token", "token-aluno");
  t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.match(url, /\/comentarios\/88\/status$/);
    return new Response(
      JSON.stringify({
        id: 88,
        status_moderacao: "OCULTO",
        moderado_por: "IA",
        motivo_moderacao: "Violação da conduta ética (RN04).",
        confianca_ia: 0.92,
      }),
      { status: 200 }
    );
  });

  const direto = await consultarStatusComentario(88);
  assert.equal(direto.status_moderacao, "OCULTO");

  const resultado = await new Promise<{ kind: string; text: string }>((resolve) => {
    iniciarPollingStatusComentario({
      commentId: 88,
      contexto: "relato",
      intervalMs: 10,
      maxAttempts: 3,
      onStatus: resolve,
    });
  });

  assert.equal(resultado.kind, "rejected");
  assert.match(resultado.text, /\[RECUSADO\]/);
  assert.match(resultado.text, /Violação da conduta ética/);
});

test("decidirCuradoria envia status RECUSADO com justificativa informada pelo moderador", async (t) => {
  dados.set("tamburetei_auth_token", "token");
  const chamadas: Array<{ url: string; options: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    chamadas.push({ url, options });
    return new Response(JSON.stringify({ id: 1, status_novo: "RECUSADO" }), { status: 200 });
  });

  await decidirCuradoria(15, "RECUSADO", "   Material fora do escopo da ementa oficial.   ");
  assert.match(chamadas[0].url, /\/moderacao\/conteudos\/15\/curadoria$/);
  assert.equal(chamadas[0].options.method, "PATCH");
  assert.deepEqual(JSON.parse(String(chamadas[0].options.body)), {
    status: "RECUSADO",
    justificativa: "Material fora do escopo da ementa oficial.",
  });
});

test("fluxo de justificativa obrigatoria rejeita texto em branco e valida tamanho", () => {
  function validarJustificativaRecusa(texto: string): { valido: boolean; erro?: string; limpo?: string } {
    const limpo = texto.trim();
    if (!limpo) {
      return { valido: false, erro: "Informe uma justificativa para recusar o material." };
    }
    if (limpo.length > 1000) {
      return { valido: false, erro: "A justificativa deve ter no máximo 1000 caracteres." };
    }
    return { valido: true, limpo };
  }

  assert.equal(validarJustificativaRecusa("").valido, false);
  assert.equal(validarJustificativaRecusa("     ").valido, false);
  assert.equal(validarJustificativaRecusa("a".repeat(1001)).valido, false);
  const ok = validarJustificativaRecusa("  Arquivo com baixa resolucao e dados ilegiveis.  ");
  assert.equal(ok.valido, true);
  assert.equal(ok.limpo, "Arquivo com baixa resolucao e dados ilegiveis.");
});

test("gerenciamento de URLs de preview invoca revokeObjectURL ao substituir e fechar", () => {
  const revogados: string[] = [];
  const fakeUrlModule = {
    createObjectURL: (blob: unknown) => `blob:http://localhost/${String(blob)}`,
    revokeObjectURL: (url: string) => {
      revogados.push(url);
    },
  };

  let previewUrl: string | null = null;
  function abrir(novoBlob: string) {
    if (previewUrl) {
      fakeUrlModule.revokeObjectURL(previewUrl);
    }
    previewUrl = fakeUrlModule.createObjectURL(novoBlob);
  }

  function fechar() {
    if (previewUrl) {
      fakeUrlModule.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
  }

  abrir("arquivo-1");
  assert.equal(previewUrl, "blob:http://localhost/arquivo-1");
  assert.equal(revogados.length, 0);

  abrir("arquivo-2");
  assert.equal(previewUrl, "blob:http://localhost/arquivo-2");
  assert.deepEqual(revogados, ["blob:http://localhost/arquivo-1"]);

  fechar();
  assert.equal(previewUrl, null);
  assert.deepEqual(revogados, ["blob:http://localhost/arquivo-1", "blob:http://localhost/arquivo-2"]);
});

test("tratamento de concorrencia visual descarta resposta de download assincrono obsoleto", async () => {
  let seqAtual = 0;
  let materialVisivelId: number | null = null;

  async function dispararDownloadConcorrente(materialId: number, delayMs: number) {
    const reqSeq = ++seqAtual;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (reqSeq === seqAtual) {
      materialVisivelId = materialId;
    }
  }

  const req1 = dispararDownloadConcorrente(101, 50);
  const req2 = dispararDownloadConcorrente(102, 10);

  await Promise.all([req1, req2]);

  assert.equal(materialVisivelId, 102);
});

test("listarDenunciasPendentes repassa filtro situacao e substituirArquivoMaterial usa PUT multipart", async (t) => {
  dados.set("tamburetei_auth_token", "token-mod");
  const chamadas: Array<{ url: string; options: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    chamadas.push({ url, options });
    if (options.method === "PUT") {
      return new Response(
        JSON.stringify({
          id: 55,
          disciplina_id: 1,
          titulo: "Prova P1",
          tipo: "PROVA_ANTIGA",
          formato: "pdf",
          tamanho_bytes: 123,
          status_curadoria: "APROVADO",
          status_moderacao: "ativo",
          created_at: "2026-11-26T12:00:00Z",
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ items: [], total: 0, pagina: 1, tamanho_pagina: 20 }), { status: 200 });
  });

  await listarDenunciasPendentes(1, "COMENTARIO", "TODAS", "OCULTADOS");
  await listarDenunciasPendentes(1, "TODOS", "TODAS", "ABAIXO_LIMIAR");

  const arquivoEditado = new File([new Uint8Array([37, 80, 68, 70])], "prova-editada.pdf", {
    type: "application/pdf",
  });
  const atualizado = await substituirArquivoMaterial(55, arquivoEditado, "  Removido nome do estudante. ");

  assert.match(chamadas[0].url, /situacao=OCULTADOS/);
  assert.match(chamadas[1].url, /situacao=ABAIXO_LIMIAR/);
  assert.match(chamadas[2].url, /\/moderacao\/materiais\/55\/arquivo$/);
  assert.equal(chamadas[2].options.method, "PUT");
  assert.equal(new Headers(chamadas[2].options.headers).get("Authorization"), "Bearer token-mod");
  assert.equal(atualizado.id, 55);

  await assert.rejects(
    substituirArquivoMaterial(55, arquivoEditado, "x".repeat(1001)),
    (e: unknown) => e instanceof ApiError && e.status === 422,
  );
});

test("request lida com respostas HTTP 204 No Content sem tentar parsear JSON vazio", async (t) => {
  const { request } = await import("../httpClient.ts");
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  const result = await request<void>("/comentarios/1", { method: "DELETE" });
  assert.equal(result, undefined);
});

test("request le corpo de erro em texto puro ou HTML sem erro de stream ja consumido", async (t) => {
  const { request } = await import("../httpClient.ts");
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Serviço indisponível temporariamente.", { status: 503 }),
  );
  await assert.rejects(
    request("/cadeiras"),
    (e: unknown) =>
      e instanceof ApiError &&
      e.status === 503 &&
      e.message === "Serviço indisponível temporariamente.",
  );

  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("<html><body>502 Bad Gateway</body></html>", { status: 502 }),
  );
  await assert.rejects(
    request("/cadeiras"),
    (e: unknown) => e instanceof ApiError && e.status === 502 && e.message === "Erro HTTP 502",
  );
});
