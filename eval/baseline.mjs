// Keyword-search baseline over the same text Aliquot reads: every claim statement,
// source excerpt and protocol step in the ledger. For each question it returns the
// top 3 passages by term overlap (BM25-lite) and checks them against the same
// expectations the agent is graded on. No model, no structure — just retrieval.
// Usage: node eval/baseline.mjs
import {readFileSync} from 'node:fs'

const PROJECT = '4wvtii12'
const query = encodeURIComponent(`{
  "claims": *[_type == "claim"]{statement, "s": coalesce(subject->name, subject->title)},
  "sources": *[_type == "source"]{title, excerpt},
  "steps": *[_type == "protocol"]{title, "steps": steps[].action},
  "recipes": *[_type == "recipe"]{name, steps}
}`)
const res = await fetch(`https://${PROJECT}.api.sanity.io/v2026-10-01/data/query/production?query=${query}`)
const {result} = await res.json()

const passages = [
  ...result.claims.map((c) => `${c.s}: ${c.statement}`),
  ...result.sources.filter((s) => s.excerpt).map((s) => `${s.title}: ${s.excerpt}`),
  ...result.steps.flatMap((p) => (p.steps ?? []).map((a) => `${p.title}: ${a}`)),
  ...result.recipes.filter((r) => r.steps).map((r) => `${r.name}: ${r.steps}`),
]

const STOP = new Set('a an the of for to in on at is are what how much many do i my with and or should use can it be this that which from by as'.split(' '))
const tokens = (s) => s.toLowerCase().replace(/[^a-z0-9.%µ°/ -]/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t))
const docs = passages.map((p) => ({p, t: tokens(p)}))
const df = new Map()
for (const d of docs) for (const t of new Set(d.t)) df.set(t, (df.get(t) ?? 0) + 1)
const avg = docs.reduce((s, d) => s + d.t.length, 0) / docs.length
const idf = (t) => Math.log(1 + (docs.length - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5))

function search(q, k = 3) {
  const qt = tokens(q)
  return docs
    .map((d) => {
      let score = 0
      for (const t of qt) {
        const f = d.t.filter((x) => x === t).length
        if (f) score += idf(t) * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (d.t.length / avg))))
      }
      return {score, p: d.p}
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

const questions = JSON.parse(readFileSync(new URL('./questions.json', import.meta.url)))
let passed = 0
for (const item of questions) {
  const top = search(item.q)
  const hay = top.map((x) => x.p).join('\n')
  const hits = item.expect.map((p) => new RegExp(p, 'i').test(hay))
  // A yes/no safety verdict can't come out of retrieval; count it only if the passage says it outright.
  const ok = hits.every(Boolean)
  if (ok) passed++
  console.log(ok ? 'PASS' : 'FAIL', item.id.padEnd(22), item.kind.padEnd(14), '|', top[0]?.p.slice(0, 110).replace(/\n/g, ' '))
}
console.log(`\n${passed}/${questions.length} passed (keyword top-3)`)
