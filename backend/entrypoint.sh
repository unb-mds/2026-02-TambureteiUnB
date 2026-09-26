#!/bin/sh
set -e

echo "Verificando disponibilidade do PostgreSQL..."
python - << 'EOF'
import socket
import os
import time

host = os.environ.get("POSTGRES_SERVER", "db")
port = int(os.environ.get("POSTGRES_PORT", 5432))
timeout = 30
start = time.time()

while True:
    try:
        with socket.create_connection((host, port), timeout=2):
            print(f"PostgreSQL acessível em {host}:{port}!")
            break
    except Exception:
        if time.time() - start > timeout:
            print(f"Aviso: Timeout aguardando {host}:{port}. Prosseguindo...")
            break
        time.sleep(1)
EOF

echo "Aplicando migrações Alembic pendentes (alembic upgrade head)..."
alembic upgrade head

exec "$@"
