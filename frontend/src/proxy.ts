import { NextRequest, NextResponse } from "next/server";
import {
  BoundedMemoryRateLimiter,
  extractClientIp,
} from "@/utils/serverRateLimit";

const ssrLimiter = new BoundedMemoryRateLimiter(5000);
const SSR_WINDOW_MS = 60 * 1000;
const SSR_MAX_REQUESTS_PER_MINUTE = 90;

export function proxy(request: NextRequest) {
  const ip = extractClientIp(request.headers);
  const result = ssrLimiter.check(
    `ssr:${ip}`,
    SSR_MAX_REQUESTS_PER_MINUTE,
    SSR_WINDOW_MS
  );

  if (result.limited) {
    return new NextResponse(
      "Muitas requisições em sequência. Aguarde alguns instantes e recarregue a página.",
      {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(SSR_MAX_REQUESTS_PER_MINUTE),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(SSR_MAX_REQUESTS_PER_MINUTE));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return response;
}

export const config = {
  matcher: ["/cursos/:path+", "/disciplinas/:path+"],
};
