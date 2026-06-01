#!/usr/bin/env bash
# =============================================================================
# Setup do Piston numa VPS Ubuntu (testado no Oracle Cloud Always Free / ARM).
# Roda como root (ou com sudo). Idempotente: pode rodar de novo sem quebrar.
#
#   curl -fsSL .../setup-server.sh | sudo bash
# ou copie este arquivo pra VPS e:  sudo bash setup-server.sh
#
# Guia passo a passo: docs/DEPLOY_PISTON_ORACLE.md
# =============================================================================
set -euo pipefail

PISTON_DIR=/opt/piston
DOTNET_VERSION="5.0.201"

echo "==> 1/5 Instalando Docker + Nginx..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
apt-get update -y
apt-get install -y nginx

echo "==> 2/5 Subindo o Piston..."
mkdir -p "$PISTON_DIR"
# docker-compose.yml é copiado pra cá pelo guia (scp) ou cole o conteúdo aqui.
if [ ! -f "$PISTON_DIR/docker-compose.yml" ]; then
  echo "ERRO: $PISTON_DIR/docker-compose.yml não encontrado."
  echo "Copie infra/piston/docker-compose.yml pra essa pasta antes de rodar."
  exit 1
fi
cd "$PISTON_DIR"

ARCH="$(uname -m)"
echo "    Arquitetura detectada: $ARCH"
# A imagem oficial é multi-arch nas tags recentes; se o pull falhar no ARM,
# o passo abaixo avisa e você builda do fonte (instruções no guia).
if ! docker compose pull; then
  echo "AVISO: pull da imagem falhou (provável incompatibilidade de arch)."
  echo "Veja a seção 'Fallback ARM' em docs/DEPLOY_PISTON_ORACLE.md."
  exit 1
fi
docker compose up -d

echo "==> 3/5 Aguardando a API responder..."
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:2000/api/v2/runtimes >/dev/null 2>&1; then
    echo "    Piston no ar."
    break
  fi
  sleep 2
done

echo "==> 4/5 Instalando runtime dotnet ($DOTNET_VERSION)..."
curl -fsS -X POST http://127.0.0.1:2000/api/v2/packages \
  -H "Content-Type: application/json" \
  -d "{\"language\":\"dotnet\",\"version\":\"$DOTNET_VERSION\"}" || true

echo "==> 5/5 Configurando Nginx (proxy reverso na porta 80)..."
cat >/etc/nginx/sites-available/piston <<'NGINX'
server {
    listen 80;
    server_name _;

    location /api/v2/ {
        # Bloqueia o endpoint de instalar pacotes vindo de fora.
        location /api/v2/packages { deny all; }

        proxy_pass http://127.0.0.1:2000;
        proxy_set_header Host $host;
        proxy_read_timeout 30s;
        client_max_body_size 1m;
    }

    location = /healthz { return 200 "ok\n"; }
}
NGINX
ln -sf /etc/nginx/sites-available/piston /etc/nginx/sites-enabled/piston
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo
echo "============================================================"
echo "PRONTO. Teste local:"
echo "  curl http://127.0.0.1:2000/api/v2/runtimes"
echo
echo "PISTON_API_URL (use no Vercel, com o IP público da VPS):"
echo "  http://SEU_IP_PUBLICO/api/v2"
echo "============================================================"
