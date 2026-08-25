#!/bin/sh
set -e
SECRET=$(openssl rand -base64 32 | tr -d '\n=' )
TOKEN=$(docker exec openclaw-kx5x-openclaw-1 printenv OPENCLAW_GATEWAY_TOKEN)

docker rm -f prs-bridge 2>/dev/null || true

docker run -d --name prs-bridge --restart unless-stopped --network openclaw-kx5x_default -e JARVIS_BRIDGE_SECRET="$SECRET" -e GATEWAY_TOKEN="$TOKEN" -e GATEWAY_URL="http://openclaw-kx5x-openclaw-1:18789" --label "traefik.enable=true" --label "traefik.http.routers.prs-bridge.rule=Host(\`prs-bridge.davissync.com\`)" --label "traefik.http.routers.prs-bridge.entrypoints=websecure" --label "traefik.http.routers.prs-bridge.tls.certresolver=letsencrypt" --label "traefik.http.services.prs-bridge.loadbalancer.server.port=8791" prs-bridge

echo "$SECRET" > ~/.prs_bridge_secret
chmod 600 ~/.prs_bridge_secret

echo ""
echo "=== verificacao (deve ser o mesmo numero nas duas linhas) ==="
docker exec prs-bridge printenv JARVIS_BRIDGE_SECRET | wc -c
wc -c < ~/.prs_bridge_secret

echo ""
echo "=== segredo em blocos de 8 (copie e junte tudo, sem espacos) ==="
fold -w8 ~/.prs_bridge_secret
