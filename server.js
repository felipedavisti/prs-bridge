// prs-bridge — ponte fina entre o pr-webhook (Supabase) e o Gateway do Jarvis.
//
// Único trabalho deste serviço: receber um POST autenticado por um segredo
// PRÓPRIO (JARVIS_BRIDGE_SECRET — nunca o token do Gateway/hooks), e então
// chamar o endpoint nativo /hooks/<path>/agent do OpenClaw pela rede interna
// do Docker (nunca pela internet), disparando um turno de agente isolado
// que faz a análise da PR.
//
// Propositalmente sem framework/dependências — só `http` nativo do Node.

const http = require('node:http')

const PORT = process.env.PORT || 8791
const BRIDGE_SECRET = process.env.JARVIS_BRIDGE_SECRET || ''
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://openclaw-kx5x-openclaw-1:48234'
const HOOKS_PATH = process.env.HOOKS_PATH || '/hooks-prs-abertas'
const HOOKS_TOKEN = process.env.HOOKS_TOKEN || ''

if (!BRIDGE_SECRET || !HOOKS_TOKEN) {
  console.error('JARVIS_BRIDGE_SECRET e HOOKS_TOKEN são obrigatórios. Abortando.')
  process.exit(1)
}

function comparacaoConstante(a, b) {
  const ea = Buffer.from(a)
  const eb = Buffer.from(b)
  if (ea.length !== eb.length) return false
  return require('node:crypto').timingSafeEqual(ea, eb)
}

function montarTarefa({ prId, owner, repo, numero }) {
  return [
    `Analise a Pull Request #${numero} do repositório github.com/${owner}/${repo} (pr_id=${prId}) para a feature "PRs Abertas" do davissync.`,
    '',
    'Passos:',
    `1. Leia a spec Spec-Kit do projeto (pasta specs/ do repo ${owner}/${repo}) mais relevante pra essa mudança.`,
    `2. Leia o diff da PR #${numero} (API do GitHub: /repos/${owner}/${repo}/pulls/${numero}/files).`,
    '3. Avalie aderência à spec (0-100) e escreva uma observação curta (1-3 frases, tom de parecer, não relatório).',
    '4. Grave o resultado chamando a RPC do Supabase `registrar_parecer_pr` (p_pr_id, p_pontuacao, p_observacao) usando o service_role key do davissync — NÃO retorne o diff bruto nem a spec inteira como resposta final, só confirme que gravou.',
    '5. Se não conseguir concluir (PR grande demais, rate limit, spec ausente), chame `registrar_erro_analise_pr` (p_pr_id, p_detalhe) em vez de registrar_parecer_pr.',
    '',
    'Não comente, aprove ou recuse a PR — isso é decisão humana (feature 025c), fora do seu escopo aqui.',
  ].join('\n')
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') { res.writeHead(405).end('method not allowed'); return }

  const auth = req.headers.authorization || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!comparacaoConstante(token, BRIDGE_SECRET)) { res.writeHead(401).end('unauthorized'); return }

  let body = ''
  for await (const chunk of req) body += chunk

  let payload
  try { payload = JSON.parse(body) } catch { res.writeHead(400).end('invalid json'); return }

  const { prId, owner, repo, numero } = payload
  if (!prId || !owner || !repo || !numero) { res.writeHead(400).end('missing fields'); return }

  res.writeHead(202).end('accepted')

  try {
    const r = await fetch(`${GATEWAY_URL}${HOOKS_PATH}/agent`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HOOKS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: montarTarefa({ prId, owner, repo, numero }),
        name: `pr-analise-${prId}`.slice(0, 60),
        deliver: false,
      }),
    })
    if (!r.ok) console.error('gateway respondeu', r.status, await r.text().catch(() => ''))
  } catch (e) {
    console.error('falha ao chamar o gateway:', e)
  }
})

server.listen(PORT, () => console.log(`prs-bridge ouvindo na porta ${PORT}`))
