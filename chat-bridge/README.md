# chat-bridge

Ponte fina entre a `jarvis-chat-bridge` (Supabase, feature 026 do davissync —
Davis Life · Chat com o Jarvis) e o Gateway do Jarvis. Roda como container
isolado na VPS, na mesma rede Docker do Traefik — não modifica o container
do Jarvis nem o `prs-bridge` (irmão desta feature, 025b).

Arquitetura em 2 saltos (igual ao `prs-bridge`):

1. **`chat-bridge`** (este container) — relay puro: valida
   `JARVIS_CHAT_BRIDGE_SECRET` (o que o Supabase usa) e repassa a chamada
   pra dentro da rede Docker.
2. **`chat-bridge-local`** (processo rodando dentro do próprio container do
   Jarvis, porta 8792) — recebe daqui, valida
   `JARVIS_CHAT_BRIDGE_INNER_SECRET`, chama o gateway via loopback e, quando
   o Jarvis termina de responder, chama de volta a Edge Function
   `jarvis-notify` no Supabase.

O token master do gateway (`gateway.auth.token`) não aparece em lugar nenhum
desta cadeia.

## Deploy

```bash
git clone https://github.com/felipedavisti/prs-bridge.git
cd prs-bridge/chat-bridge
chmod +x run.sh
./run.sh
```

Os segredos já vêm certos no `run.sh` (combinados com o Supabase antes desta
publicação) — não precisa colar nada.

## Depois de rodar

1. Confirmar DNS: `chat-bridge.davissync.online` → IP desta VPS (mesmo
   registro que já existe pra `prs-bridge.davissync.online`).
2. Testar de fora, já com HTTPS:
   ```bash
   curl -i -X POST https://chat-bridge.davissync.online/send \
     -H "Authorization: Bearer kPGnZ9Nv5JLKfa/rJTa5/ug3r9vfrNfqtD7JGzcCU8M=" \
     -H "Content-Type: application/json" \
     -d '{"texto":"oi, teste","mensagemPendenteId":"00000000-0000-0000-0000-000000000000"}'
   ```
   Esperado: `202 accepted` rápido.
