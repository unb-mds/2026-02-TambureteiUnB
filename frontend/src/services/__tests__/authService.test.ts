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
  const homePagePath = path.resolve(process.cwd(), "src/app/page.tsx");

  const guestBannerSource = fs.readFileSync(guestBannerPath, "utf-8");
  const homePageSource = fs.readFileSync(homePagePath, "utf-8");

  assert.match(guestBannerSource, /authService\.isAuthenticated\(\)/);
  assert.match(guestBannerSource, /authService\.AUTH_CHANGE_EVENT/);
  assert.match(guestBannerSource, /authService\.shouldShowGuestBanner/);

  assert.match(homePageSource, /authService\.isAuthenticated\(\)/);
  assert.match(homePageSource, /authService\.AUTH_CHANGE_EVENT/);
  assert.match(homePageSource, /\{!isLoggedIn && <GuestBanner \/>\}/);
});
