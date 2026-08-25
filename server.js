// prs-bridge — relay puro entre o pr-webhook (Supabase, internet) e o
// processo bridge que roda DENTRO do container do Jarvis (que já alcança o
// gateway via loopback). Este container só existe pra ter um endereço HTTPS
// público (Traefik + DNS já configurados); toda a lógica real mora do outro
// lado.
const http = require('node:http')

const PORT = process.env.PORT || 8791
const BRIDGE_SECRET = process.env.JARVIS_BRIDGE_SECRET || ''
const INNER_URL = process.env.INNER_URL || 'http://openclaw-kx5x-openclaw-1:8791'
const INNER_SECRET = process.env.INNER_SECRET || ''

if (!BRIDGE_SECRET || !INNER_SECRET) {
  console.error('JARVIS_BRIDGE_SECRET e INNER_SECRET são obrigatórios. Abortando.')
  process.exit(1)
}

function comparacaoConstante(a, b) {
  const ea = Buffer.from(a)
  const eb = Buffer.from(b)
  if (ea.length !== eb.length) return false
  return require('node:crypto').timingSafeEqual(ea, eb)
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') { res.writeHead(405).end('method not allowed'); return }

  const auth = req.headers.authorization || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!comparacaoConstante(token, BRIDGE_SECRET)) { res.writeHead(401).end('unauthorized'); return }

  let body = ''
  for await (const chunk of req) body += chunk

  res.writeHead(202).end('accepted')

  try {
    const r = await fetch(INNER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${INNER_SECRET}`, 'Content-Type': 'application/json' },
      body,
    })
    console.log('inner respondeu', r.status, (await r.text().catch(() => '')).slice(0, 200))
  } catch (e) {
    console.error('falha ao chamar o bridge interno:', e)
  }
})

server.listen(PORT, () => console.log(`prs-bridge (relay) ouvindo na porta ${PORT}`))
