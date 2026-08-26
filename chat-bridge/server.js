// chat-bridge — relay público (feature 026, Davis Life · Chat com o Jarvis).
// Não fala com o gateway, só valida o segredo externo
// (JARVIS_CHAT_BRIDGE_SECRET, o que o Supabase usa) e repassa pro
// chat-bridge-local (rede Docker interna), que é quem de fato alcança o
// Jarvis via loopback. Mesmo desenho do prs-bridge (025b).
const http = require('node:http')

const PORT = process.env.PORT || 8792
const EXTERNAL_SECRET = process.env.JARVIS_CHAT_BRIDGE_SECRET || ''
const INNER_SECRET = process.env.JARVIS_CHAT_BRIDGE_INNER_SECRET || ''
const LOCAL_URL = process.env.CHAT_BRIDGE_LOCAL_URL || 'http://openclaw-kx5x-openclaw-1:8792'

function comparacaoConstante(a, b) {
  const ea = Buffer.from(a)
  const eb = Buffer.from(b)
  if (ea.length !== eb.length) return false
  return require('node:crypto').timingSafeEqual(ea, eb)
}

const server = http.createServer(async (req, res) => {
  if (req.url !== '/send' || req.method !== 'POST') {
    res.writeHead(404).end('not found')
    return
  }

  const auth = req.headers.authorization || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!EXTERNAL_SECRET || !comparacaoConstante(token, EXTERNAL_SECRET)) {
    res.writeHead(401).end('unauthorized')
    return
  }

  let body = ''
  for await (const chunk of req) body += chunk

  try {
    const r = await fetch(`${LOCAL_URL}/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${INNER_SECRET}`, 'Content-Type': 'application/json' },
      body,
    })
    res.writeHead(r.status).end(await r.text().catch(() => ''))
  } catch (e) {
    console.error('chat-bridge: falha ao repassar pro chat-bridge-local', e)
    res.writeHead(502).end('bad gateway')
  }
})

server.listen(PORT, '0.0.0.0', () => console.log(`chat-bridge ouvindo na porta ${PORT}`))
