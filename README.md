# prs-bridge

Ponte fina entre o `pr-webhook` (Supabase, feature 025-prs-abertas do davissync)
e o Gateway do Jarvis. Roda como container isolado na VPS, na mesma rede
Docker do Traefik — não modifica o container do Jarvis.

## Deploy

```bash
git clone https://github.com/felipedavisti/prs-bridge.git
cd prs-bridge
docker build -t prs-bridge .
docker rm -f prs-bridge 2>/dev/null || true
docker run -d \
  --name prs-bridge \
  --restart unless-stopped \
  --network openclaw-kx5x_default \
  -e JARVIS_BRIDGE_SECRET="COLE_O_SEGREDO" \
  -e GATEWAY_TOKEN="COLE_O_OPENCLAW_GATEWAY_TOKEN" \
  -e GATEWAY_URL="http://openclaw-kx5x-openclaw-1:18789" \
  --label "traefik.enable=true" \
  --label "traefik.http.routers.prs-bridge.rule=Host(\`prs-bridge.davissync.com\`)" \
  --label "traefik.http.routers.prs-bridge.entrypoints=websecure" \
  --label "traefik.http.routers.prs-bridge.tls.certresolver=letsencrypt" \
  --label "traefik.http.services.prs-bridge.loadbalancer.server.port=8791" \
  prs-bridge
docker logs -f prs-bridge
```
