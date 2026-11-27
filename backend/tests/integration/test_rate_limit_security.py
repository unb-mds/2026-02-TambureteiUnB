"""Testes de integracao e seguranca para rate limiting, limites de payload e memoria."""

from app.core.config import settings
from app.core.rate_limit import SlidingWindowRateLimiter, _extract_ip_from_headers, rate_limiter
from app.core.security import (
    _USED_RESET_TOKENS,
    create_password_reset_token,
    invalidate_password_reset_token,
    verify_password_reset_token,
)


def test_sliding_window_limiter_respeita_teto_de_memoria():
    limiter = SlidingWindowRateLimiter(max_keys=100)
    for i in range(500):
        result = limiter.check(f"ip:10.0.{i // 256}.{i % 256}", limit=5, window_seconds=60)
        assert result.allowed is True
    assert limiter.bucket_count() <= 100


def test_extracao_ip_prioriza_headers_confiaveis_de_proxy(monkeypatch):
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", True)

    # CF-Connecting-IP tem precedencia sobre qualquer header forjavel
    ip_cf = _extract_ip_from_headers(
        [
            (b"x-forwarded-for", b"1.2.3.4, 5.6.7.8"),
            (b"x-real-ip", b"9.9.9.9"),
            (b"cf-connecting-ip", b"203.0.113.10"),
        ],
        "127.0.0.1",
    )
    assert ip_cf == "203.0.113.10"

    # Sem CF-Connecting-IP, usa X-Real-IP
    ip_real = _extract_ip_from_headers(
        [
            (b"x-forwarded-for", b"1.2.3.4, 5.6.7.8"),
            (b"x-real-ip", b"198.51.100.22"),
        ],
        "127.0.0.1",
    )
    assert ip_real == "198.51.100.22"

    # Sem CF/X-Real-IP, usa o ultimo salto de X-Forwarded-For (nao o primeiro forjavel)
    ip_xff = _extract_ip_from_headers(
        [(b"x-forwarded-for", b"1.1.1.1, 198.51.100.77")],
        "127.0.0.1",
    )
    assert ip_xff == "198.51.100.77"

    # Quando TRUST_PROXY_HEADERS=False, ignora todos os headers e usa client_host
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", False)
    assert (
        _extract_ip_from_headers([(b"cf-connecting-ip", b"203.0.113.10")], "127.0.0.1")
        == "127.0.0.1"
    )


def test_esqueci_senha_aplica_rate_limit_por_email_e_por_ip_no_backend(client, monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    rate_limiter.reset()

    # 3 requisicoes para o mesmo email passam mesmo vindo de IPs diferentes; a 4a bloqueia
    for idx in range(3):
        res = client.post(
            "/auth/esqueci-senha",
            json={"email": "alvo.limite@unb.br"},
            headers={"CF-Connecting-IP": f"198.51.100.{idx + 1}"},
        )
        assert res.status_code == 200

    res_bloqueado_email = client.post(
        "/auth/esqueci-senha",
        json={"email": "ALVO.LIMITE@unb.br"},
        headers={"CF-Connecting-IP": "198.51.100.99"},
    )
    assert res_bloqueado_email.status_code == 429
    assert "Retry-After" in res_bloqueado_email.headers

    # 5 requisicoes do mesmo IP para emails diferentes passam; a 6a bloqueia por IP
    for idx in range(5):
        res = client.post(
            "/auth/esqueci-senha",
            json={"email": f"outro{idx}@unb.br"},
            headers={"CF-Connecting-IP": "203.0.113.55"},
        )
        assert res.status_code == 200

    res_bloqueado_ip = client.post(
        "/auth/esqueci-senha",
        json={"email": "outro99@unb.br"},
        headers={"CF-Connecting-IP": "203.0.113.55"},
    )
    assert res_bloqueado_ip.status_code == 429


def test_login_aplica_rate_limit_por_email(client, monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    rate_limiter.reset()

    for idx in range(10):
        res = client.post(
            "/auth/login",
            json={"email": "forca.bruta@unb.br", "senha": f"Errada{idx}!"},
            headers={"CF-Connecting-IP": f"198.51.101.{idx + 1}"},
        )
        assert res.status_code == 401

    res_bloqueado = client.post(
        "/auth/login",
        json={"email": "forca.bruta@unb.br", "senha": "ErradaFinal1!"},
        headers={"CF-Connecting-IP": "198.51.101.200"},
    )
    assert res_bloqueado.status_code == 429
    assert "Retry-After" in res_bloqueado.headers


def test_middleware_global_bloqueia_rajada_e_expoe_headers(client, monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(settings, "RATE_LIMIT_HEALTH_PER_MINUTE", 5)
    rate_limiter.reset()

    for idx in range(5):
        res = client.get("/health", headers={"CF-Connecting-IP": "203.0.113.88"})
        assert res.status_code == 200
        assert res.headers.get("X-RateLimit-Limit") == "5"
        assert res.headers.get("X-RateLimit-Remaining") == str(4 - idx)

    res_429 = client.get("/health", headers={"CF-Connecting-IP": "203.0.113.88"})
    assert res_429.status_code == 429
    assert res_429.headers.get("X-RateLimit-Remaining") == "0"
    assert int(res_429.headers["Retry-After"]) >= 1


def test_importar_historico_rejeita_pdf_acima_do_limite_em_blocos(
    client, student_headers, monkeypatch
):
    monkeypatch.setattr(settings, "HISTORICO_MAX_BYTES", 1024)
    payload_grande = b"%PDF-1.4\n" + (b"A" * 2048)

    res = client.post(
        "/perfil/importar-historico",
        headers=student_headers,
        files={"arquivo": ("historico.pdf", payload_grande, "application/pdf")},
    )
    assert res.status_code == 413


def test_turmas_status_rejeita_lote_acima_de_250_itens(client, student_headers):
    itens = [
        {"codigo": f"FGA{i:04d}", "turma": "01", "semestre": "2026.1", "professores": []}
        for i in range(251)
    ]
    res = client.post(
        "/perfil/turmas-estatisticas/status",
        headers=student_headers,
        json={"itens": itens},
    )
    assert res.status_code == 422


def test_cadeiras_valida_teto_de_limit_e_retorna_cache_control(client):
    res_invalido = client.get("/cadeiras?limit=10001")
    assert res_invalido.status_code == 422

    res_ok = client.get("/cadeiras?limit=5")
    assert res_ok.status_code == 200
    assert "max-age=60" in res_ok.headers.get("Cache-Control", "")


def test_reset_token_invalidation_limpa_entradas_expiradas():
    _USED_RESET_TOKENS.clear()
    _USED_RESET_TOKENS["token-expirado-antigo"] = 1.0

    token = create_password_reset_token("aluno@unb.br")
    assert verify_password_reset_token(token) == "aluno@unb.br"
    invalidate_password_reset_token(token)
    assert verify_password_reset_token(token) is None
    assert "token-expirado-antigo" not in _USED_RESET_TOKENS
