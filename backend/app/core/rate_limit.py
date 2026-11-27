"""Rate limiting em janela deslizante com memoria limitada para a API FastAPI."""

from __future__ import annotations

import math
import threading
import time
from collections import OrderedDict, deque
from dataclasses import dataclass
from typing import Callable

from fastapi import HTTPException, Request, status
from jose import JWTError, jwt
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    retry_after: int
    reset_at: int


class SlidingWindowRateLimiter:
    """Rate limiter em memoria (janela deslizante) com limite rigido de chaves (anti-OOM)."""

    def __init__(self, max_keys: int = 20_000):
        self._max_keys = max(100, max_keys)
        self._lock = threading.Lock()
        self._buckets: OrderedDict[str, tuple[deque[float], int]] = OrderedDict()

    def _evict_if_needed(self, now: float) -> None:
        if len(self._buckets) < self._max_keys:
            return
        expired_keys = [
            key
            for key, (timestamps, window) in self._buckets.items()
            if not timestamps or (now - timestamps[-1]) >= window
        ]
        for key in expired_keys:
            self._buckets.pop(key, None)

        while len(self._buckets) >= self._max_keys:
            self._buckets.popitem(last=False)

    def check(self, key: str, limit: int, window_seconds: int) -> RateLimitResult:
        now = time.monotonic()
        wall_now = int(time.time())
        cutoff = now - window_seconds

        with self._lock:
            entry = self._buckets.get(key)
            if entry is not None:
                timestamps, _ = entry
                while timestamps and timestamps[0] <= cutoff:
                    timestamps.popleft()
                self._buckets.move_to_end(key)
            else:
                self._evict_if_needed(now)
                timestamps = deque()
                self._buckets[key] = (timestamps, window_seconds)

            if len(timestamps) >= limit:
                oldest = timestamps[0] if timestamps else now
                retry_after = max(1, math.ceil((oldest + window_seconds) - now))
                return RateLimitResult(
                    allowed=False,
                    limit=limit,
                    remaining=0,
                    retry_after=retry_after,
                    reset_at=wall_now + retry_after,
                )

            timestamps.append(now)
            self._buckets[key] = (timestamps, window_seconds)
            remaining = max(0, limit - len(timestamps))
            oldest = timestamps[0]
            reset_delta = max(1, math.ceil((oldest + window_seconds) - now))
            return RateLimitResult(
                allowed=True,
                limit=limit,
                remaining=remaining,
                retry_after=0,
                reset_at=wall_now + reset_delta,
            )

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()

    def bucket_count(self) -> int:
        with self._lock:
            return len(self._buckets)


rate_limiter = SlidingWindowRateLimiter(max_keys=settings.RATE_LIMIT_MAX_BUCKETS)


def _extract_ip_from_headers(headers: list[tuple[bytes, bytes]], client_host: str | None) -> str:
    if settings.TRUST_PROXY_HEADERS:
        header_map: dict[str, str] = {}
        for raw_name, raw_value in headers:
            name = raw_name.decode("latin-1").lower()
            if name in ("cf-connecting-ip", "x-real-ip", "x-forwarded-for"):
                header_map[name] = raw_value.decode("latin-1").strip()

        cf_ip = header_map.get("cf-connecting-ip", "")
        if cf_ip:
            return cf_ip[:64]

        real_ip = header_map.get("x-real-ip", "")
        if real_ip:
            return real_ip[:64]

        xff = header_map.get("x-forwarded-for", "")
        if xff:
            # Usa o ultimo salto anexado pelo proxy reverso confiavel (nao o primeiro, que pode ser forjado)
            parts = [part.strip() for part in xff.split(",") if part.strip()]
            if parts:
                return parts[-1][:64]

    return (client_host or "unknown")[:64]


def get_client_ip(request: Request) -> str:
    client_host = request.client.host if request.client else None
    return _extract_ip_from_headers(request.headers.raw, client_host)


def _extract_user_subject(request: Request) -> str | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header[7:].strip()
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        subject = payload.get("sub")
        if isinstance(subject, str) and subject.strip():
            return subject.strip().lower()
    except JWTError:
        return None
    return None


def _build_rate_limit_headers(result: RateLimitResult) -> dict[str, str]:
    headers = {
        "X-RateLimit-Limit": str(result.limit),
        "X-RateLimit-Remaining": str(result.remaining),
        "X-RateLimit-Reset": str(result.reset_at),
    }
    if not result.allowed:
        headers["Retry-After"] = str(result.retry_after)
    return headers


def enforce_rate_limit(
    scope: str,
    key: str,
    limit: int,
    window_seconds: int,
    message: str | None = None,
) -> RateLimitResult:
    if not settings.RATE_LIMIT_ENABLED:
        return RateLimitResult(
            allowed=True,
            limit=limit,
            remaining=limit,
            retry_after=0,
            reset_at=int(time.time()) + window_seconds,
        )

    result = rate_limiter.check(f"{scope}:{key}", limit, window_seconds)
    if not result.allowed:
        detail = (
            message
            or f"Muitas requisições em sequência. Aguarde {result.retry_after} segundos e tente novamente."
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers=_build_rate_limit_headers(result),
        )
    return result


def rate_limit(
    scope: str,
    limit: int,
    window_seconds: int,
    *,
    by_user: bool = False,
    ip_ceiling: int | None = None,
    message: str | None = None,
) -> Callable[[Request], None]:
    """Dependencia FastAPI para rate limiting granular por rota (por IP e/ou usuario)."""

    def _dependency(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        client_ip = get_client_ip(request)
        if by_user:
            subject = _extract_user_subject(request)
            if subject:
                enforce_rate_limit(scope, f"user:{subject}", limit, window_seconds, message=message)
                ceiling = ip_ceiling if ip_ceiling is not None else max(limit * 3, 30)
                enforce_rate_limit(scope, f"ip:{client_ip}", ceiling, window_seconds, message=message)
                return
        enforce_rate_limit(scope, f"ip:{client_ip}", limit, window_seconds, message=message)

    return _dependency


class GlobalRateLimitMiddleware:
    """Middleware ASGI leve que aplica limite global por IP em toda a API sem interferir em streaming."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not settings.RATE_LIMIT_ENABLED:
            await self.app(scope, receive, send)
            return

        method = (scope.get("method") or "").upper()
        if method == "OPTIONS":
            await self.app(scope, receive, send)
            return

        path = scope.get("path") or "/"
        client = scope.get("client")
        client_host = client[0] if client else None
        client_ip = _extract_ip_from_headers(scope.get("headers") or [], client_host)

        if path in ("/", "/health"):
            limit = settings.RATE_LIMIT_HEALTH_PER_MINUTE
            bucket_scope = "global:health"
        else:
            limit = settings.RATE_LIMIT_GLOBAL_PER_MINUTE
            bucket_scope = "global:api"

        result = rate_limiter.check(f"{bucket_scope}:{client_ip}", limit, 60)
        if not result.allowed:
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": (
                        f"Muitas requisições em sequência. "
                        f"Aguarde {result.retry_after} segundos e tente novamente."
                    )
                },
                headers=_build_rate_limit_headers(result),
            )
            await response(scope, receive, send)
            return

        rl_headers = [
            (b"x-ratelimit-limit", str(result.limit).encode("ascii")),
            (b"x-ratelimit-remaining", str(result.remaining).encode("ascii")),
            (b"x-ratelimit-reset", str(result.reset_at).encode("ascii")),
        ]

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                existing = list(message.get("headers") or [])
                existing_names = {k.lower() for k, _ in existing}
                for header_name, header_val in rl_headers:
                    if header_name not in existing_names:
                        existing.append((header_name, header_val))
                message = {**message, "headers": existing}
            await send(message)

        await self.app(scope, receive, send_with_headers)
