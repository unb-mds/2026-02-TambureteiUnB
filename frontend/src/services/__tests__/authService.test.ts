import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ThemeProvider } from "../../components/ThemeProvider.tsx";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "../../app/page.tsx";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  isAuthenticated,
  login,
  logout,
  shouldShowGuestBanner,
  subscribeAuthChange,
} from "../authService.ts";

const storageData = new Map<string, string>();
const listeners = new Map<string, Set<EventListener>>();

const mockWindow = {
  addEventListener: (type: string, listener: EventListener) => {
    if (!listeners.has(type)) {
      listeners.set(type, new Set());
    }
    listeners.get(type)!.add(listener);
  },
  removeEventListener: (type: string, listener: EventListener) => {
    listeners.get(type)?.delete(listener);
  },
  dispatchEvent: (event: Event) => {
    const type = event.type;
    listeners.get(type)?.forEach((listener) => listener(event));
    return true;
  },
};

Object.defineProperty(globalThis, "window", {
  value: mockWindow,
  configurable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storageData.get(key) ?? null,
    setItem: (key: string, value: string) => storageData.set(key, value),
    removeItem: (key: string) => storageData.delete(key),
  },
  configurable: true,
});

test("shouldShowGuestBanner oculta o banner quando usuario esta autenticado", () => {
  storageData.set("tamburetei_auth_token", "jwt-token-valido");
  assert.equal(isAuthenticated(), true);
  assert.equal(shouldShowGuestBanner(), false);
  assert.equal(shouldShowGuestBanner(true, false), false);
});

test("shouldShowGuestBanner exibe o banner para visitante anonimo e respeita dispensa no botao fechar", () => {
  storageData.clear();
  assert.equal(isAuthenticated(), false);
  assert.equal(shouldShowGuestBanner(), true);
  assert.equal(shouldShowGuestBanner(false, false), true);
  assert.equal(shouldShowGuestBanner(false, true), false);
});

test("login e logout sincronizam imediatamente a visibilidade do GuestBanner via AUTH_CHANGE_EVENT", async (t) => {
  storageData.clear();
  listeners.clear();

  let bannerVisivel = shouldShowGuestBanner(isAuthenticated(), false);
  assert.equal(bannerVisivel, true);

  const unsubscribe = subscribeAuthChange(() => {
    bannerVisivel = shouldShowGuestBanner(isAuthenticated(), false);
  });

  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("/auth/login")) {
      return new Response(
        JSON.stringify({ access_token: "token-sessao-ativa", token_type: "bearer" }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        id: "user-1",
        nome: "Estudante UnB",
        email: "estudante@unb.br",
        role: "STUDENT",
        is_active: true,
      }),
      { status: 200 }
    );
  });

  await login({ email: "estudante@unb.br", senha: "Password123" });
  assert.equal(isAuthenticated(), true);
  assert.equal(bannerVisivel, false);

  logout();
  assert.equal(isAuthenticated(), false);
  assert.equal(bannerVisivel, true);

  unsubscribe();
});

test("GuestBanner.tsx e page.tsx condicionam a renderizacao ao estado de autenticacao", () => {
  const guestBannerPath = path.resolve(
    process.cwd(),
    "src/components/GuestBanner.tsx"
  );

  const guestBannerSource = fs.readFileSync(guestBannerPath, "utf-8");

  assert.match(guestBannerSource, /authService\.isAuthenticated\(\)/);
  assert.match(guestBannerSource, /authService\.AUTH_CHANGE_EVENT/);
  assert.match(guestBannerSource, /authService\.shouldShowGuestBanner/);

  const router: AppRouterInstance = {
    back() {}, forward() {}, refresh() {}, bfcacheId: "teste-renderizacao", push() {}, replace() {}, prefetch() {},
  };
  const markup = renderToStaticMarkup(
    createElement(AppRouterContext.Provider, { value: router },
      createElement(ThemeProvider, null, createElement(HomePage))),
  );
  assert.match(markup, /O hub colaborativo/);
  assert.match(markup, /guest-banner/);
});

test("logout limpa o snapshot ativo de historico mas preserva chave isolada do usuario", () => {
  storageData.clear();
  storageData.set("tamburetei_auth_token", "token-1");
  storageData.set(
    "tamburetei_user",
    JSON.stringify({ id: "user-1", nome: "Usuario A", email: "a@unb.br", role: "STUDENT", is_active: true })
  );
  storageData.set("tamburetei_historico_sigaa", JSON.stringify({ dados_academicos: { ira: 4.1 } }));
  storageData.set("tamburetei_historico_sigaa_user_user-1", JSON.stringify({ dados_academicos: { ira: 4.1 } }));

  logout();

  assert.equal(storageData.has("tamburetei_auth_token"), false);
  assert.equal(storageData.has("tamburetei_user"), false);
  assert.equal(storageData.has("tamburetei_historico_sigaa"), false);
  assert.equal(storageData.has("tamburetei_historico_sigaa_user_user-1"), true);
});

test("login com mesmo usuario restaura o historico previamente salvo apos logout", async (t) => {
  storageData.clear();
  storageData.set(
    "tamburetei_historico_sigaa_user_user-1",
    JSON.stringify({ dados_academicos: { ira: 4.5 } })
  );

  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("/auth/login")) {
      return new Response(
        JSON.stringify({ access_token: "token-user-1", token_type: "bearer" }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        id: "user-1",
        nome: "Usuario A",
        email: "a@unb.br",
        role: "STUDENT",
        is_active: true,
      }),
      { status: 200 }
    );
  });

  await login({ email: "a@unb.br", senha: "Password123" });

  assert.equal(storageData.has("tamburetei_historico_sigaa"), true);
  const restored = JSON.parse(storageData.get("tamburetei_historico_sigaa")!);
  assert.equal(restored.dados_academicos.ira, 4.5);
});

test("login com usuario diferente limpa o historico SIGAA da conta anterior", async (t) => {
  storageData.clear();
  storageData.set(
    "tamburetei_user",
    JSON.stringify({ id: "user-1", nome: "Usuario A", email: "a@unb.br", role: "STUDENT", is_active: true })
  );
  storageData.set("tamburetei_historico_sigaa", JSON.stringify({ dados_academicos: { ira: 4.1 } }));

  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("/auth/login")) {
      return new Response(
        JSON.stringify({ access_token: "token-user-2", token_type: "bearer" }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        id: "user-2",
        nome: "Usuario B",
        email: "b@unb.br",
        role: "STUDENT",
        is_active: true,
      }),
      { status: 200 }
    );
  });

  await login({ email: "b@unb.br", senha: "Password123" });

  assert.equal(storageData.has("tamburetei_historico_sigaa"), false);
});

test("requestPasswordReset, resetPassword e changePassword executam chamadas corretas", async (t) => {
  const calls: { url: string; method?: string; body?: string }[] = [];

  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method,
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    return new Response(JSON.stringify({ message: "Operação realizada com sucesso." }), {
      status: 200,
    });
  });

  const { requestPasswordReset, resetPassword, changePassword } = await import("../authService.ts");

  await requestPasswordReset({ email: "aluno@unb.br" });
  assert.equal(calls[0].url.endsWith("/auth/esqueci-senha"), true);
  assert.equal(calls[0].method, "POST");
  assert.match(calls[0].body || "", /aluno@unb\.br/);

  await resetPassword({ token: "token-reset-123", nova_senha: "NovaSenhaForte123!" });
  assert.equal(calls[1].url.endsWith("/auth/redefinir-senha"), true);
  assert.match(calls[1].body || "", /token-reset-123/);

  await changePassword({ senha_atual: "SenhaVelha123!", nova_senha: "SenhaNova456!" });
  assert.equal(calls[2].url.endsWith("/auth/alterar-senha"), true);
  assert.match(calls[2].body || "", /SenhaNova456!/);
});

