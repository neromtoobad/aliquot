// Runs each question against an Aliquot deployment and checks the answer card.
// Usage: node eval/run.mjs [baseUrl]   (default http://localhost:3330)
import {readFileSync, writeFileSync} from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:3330'
const only = process.argv[3] && process.argv[3] !== 'all' ? process.argv[3].split(',') : null
const model = process.argv[4]
const questions = JSON.parse(readFileSync(new URL('./questions.json', import.meta.url))).filter((q) => !only || only.includes(q.id))

async function ask(q) {
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({model, messages: [{id: 'u1', role: 'user', parts: [{type: 'text', text: q}]}]}),
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  // UI message stream: SSE lines "data: {...}"
  const text = await res.text()
  const events = text
    .split('\n')
    .filter((l) => l.startsWith('data: ') && l !== 'data: [DONE]')
    .map((l) => {
      try {
        return JSON.parse(l.slice(6))
      } catch {
        return null
      }
    })
    .filter(Boolean)
  const tools = events.filter((e) => e.type === 'tool-input-available')
  const verdict = tools.find((e) => e.toolName === 'verdict')?.input ?? null
  const prose = events.filter((e) => e.type === 'text-delta').map((e) => e.delta).join('')
  return {verdict, prose, toolCalls: tools.map((t) => t.toolName)}
}

const results = []
for (const item of questions) {
  const t0 = Date.now()
  let r
  try {
    r = await ask(item.q)
  } catch (e) {
    results.push({id: item.id, ok: false, error: String(e)})
    console.log('ERR ', item.id, String(e).slice(0, 120))
    continue
  }
  const haystack = `${r.prose}\n${JSON.stringify(r.verdict ?? {})}`
  const hits = item.expect.map((p) => new RegExp(p, 'i').test(haystack))
  const verdictOk = !item.verdict || (r.verdict && item.verdict.includes(r.verdict.verdict))
  const ok = hits.every(Boolean) && verdictOk && Boolean(r.verdict)
  results.push({id: item.id, kind: item.kind, ok, hits, verdict: r.verdict?.verdict, headline: r.verdict?.headline, tools: r.toolCalls, seconds: Math.round((Date.now() - t0) / 1000)})
  console.log(ok ? 'PASS' : 'FAIL', item.id.padEnd(22), `${Math.round((Date.now() - t0) / 1000)}s`, r.toolCalls.join(','), '|', r.verdict?.headline?.slice(0, 90) ?? '(no verdict)')
}
const passed = results.filter((r) => r.ok).length
console.log(`\n${passed}/${results.length} passed`)
writeFileSync(new URL(`./results-${Date.now()}.json`, import.meta.url), JSON.stringify(results, null, 2))
