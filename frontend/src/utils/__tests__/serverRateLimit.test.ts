import assert from "node:assert/strict";
import test from "node:test";
import {
  BoundedMemoryRateLimiter,
  extractClientIp,
} from "../serverRateLimit.ts";

test("BoundedMemoryRateLimiter bloqueia apos atingir o limite e libera apos expirar a janela", () => {
  const limiter = new BoundedMemoryRateLimiter(100);
  const t0 = 1_700_000_000_000;

  assert.equal(limiter.check("ip:1.2.3.4", 2, 10_000, t0).limited, false);
  assert.equal(limiter.check("ip:1.2.3.4", 2, 10_000, t0 + 100).limited, false);

  const blocked = limiter.check("ip:1.2.3.4", 2, 10_000, t0 + 200);
  assert.equal(blocked.limited, true);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSeconds >= 9);

  // Apos a janela expirar, volta a permitir
  const afterWindow = limiter.check("ip:1.2.3.4", 2, 10_000, t0 + 10_001);
  assert.equal(afterWindow.limited, false);
  assert.equal(afterWindow.remaining, 1);
});

test("BoundedMemoryRateLimiter respeita teto maximo de chaves sob flood de IPs", () => {
  const limiter = new BoundedMemoryRateLimiter(50);
  const now = 1_700_000_000_000;

  for (let i = 0; i < 300; i += 1) {
    limiter.check(`ip:10.0.0.${i}`, 5, 60_000, now + i);
  }

  assert.ok(limiter.size() <= 50);
});

test("extractClientIp prioriza cf-connecting-ip, x-real-ip e ultimo salto de x-forwarded-for", () => {
  const headersCf = new Headers({
    "x-forwarded-for": "1.1.1.1, 2.2.2.2",
    "x-real-ip": "3.3.3.3",
    "cf-connecting-ip": "203.0.113.5",
  });
  assert.equal(extractClientIp(headersCf), "203.0.113.5");

  const headersReal = new Headers({
    "x-forwarded-for": "1.1.1.1, 2.2.2.2",
    "x-real-ip": "198.51.100.12",
  });
  assert.equal(extractClientIp(headersReal), "198.51.100.12");

  const headersXff = new Headers({
    "x-forwarded-for": "1.1.1.1, 198.51.100.99",
  });
  assert.equal(extractClientIp(headersXff), "198.51.100.99");

  assert.equal(extractClientIp(new Headers()), "127.0.0.1");
});
