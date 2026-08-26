#!/bin/sh
# chat-bridge — deploy (feature 026, Davis Life · Chat com o Jarvis).
#
# Mesmo padrão comprovado do prs-bridge (run.sh deste mesmo repo): docker
# run direto, sem docker-compose, na mesma rede que o Jarvis/Traefik já
# usam (openclaw-kx5x_default).
#
# Diferença: os segredos aqui NÃO são gerados na hora — já foram
# combinados com o Jarvis e configurados como secrets no Supabase
# (OWNER_USER_ID, JARVIS_CHAT_BRIDGE_URL, JARVIS_CHAT_BRIDGE_SECRET,
# JARVIS_CHAT_NOTIFY_SECRET). Se rodar isto de novo, os valores continuam
# os mesmos — não regenera nada.
set -e

cd "$(dirname "$0")"

EXTERNAL_SECRET="kPGnZ9Nv5JLKfa/rJTa5/ug3r9vfrNfqtD7JGzcCU8M="
INNER_SECRET="D659/OJMMJHueUe6chy3FZ2xq0rkTA6ZBzDZtap7bSM="

docker build -t chat-bridge .
docker rm -f chat-bridge 2>/dev/null || true
docker run -d \
  --name chat-bridge \
  --restart unless-stopped \
  --network openclaw-kx5x_default \
  -e JARVIS_CHAT_BRIDGE_SECRET="$EXTERNAL_SECRET" \
  -e JARVIS_CHAT_BRIDGE_INNER_SECRET="$INNER_SECRET" \
  -e CHAT_BRIDGE_LOCAL_URL="http://openclaw-kx5x-openclaw-1:8792" \
  --label "traefik.enable=true" \
  --label "traefik.http.routers.chat-bridge.rule=Host(\`chat-bridge.davissync.online\`)" \
  --label "traefik.http.routers.chat-bridge.entrypoints=websecure" \
  --label "traefik.http.routers.chat-bridge.tls.certresolver=letsencrypt" \
  --label "traefik.http.services.chat-bridge.loadbalancer.server.port=8792" \
  chat-bridge

echo ""
echo "=== verificação (deve bater com o segredo combinado) ==="
docker exec chat-bridge printenv JARVIS_CHAT_BRIDGE_SECRET

echo ""
echo "=== logs ==="
docker logs -f chat-bridge
