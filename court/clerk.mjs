// The court clerk: an agent that finds disputed protocol values in the ledger,
// opens a Bench Court case for each one, writes the brief, and files it, moving
// the workflow from `filed` to `hearing`, where a person rules.
//
//   node --env-file=../web/.env.local clerk.mjs [--limit 6] [--dry-run]
//
// Workflow moves go through the Workflows CLI (it uses your `sanity login`
// session); the brief is written by a model through the AI Gateway.
import {execFileSync} from 'node:child_process'
import {generateText} from 'ai'

const PROJECT = '4wvtii12'
const DATASET = 'production'
const MODEL = process.env.CLERK_MODEL ?? 'openai/gpt-5.2'
const args = process.argv.slice(2)
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || 6
const DRY = args.includes('--dry-run')

async function groq(query, params = {}) {
  const url = new URL(`https://${PROJECT}.api.sanity.io/v2026-10-01/data/query/${DATASET}`)
  url.searchParams.set('query', query)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GROQ ${res.status}: ${await res.text()}`)
  return (await res.json()).result
}

function cli(...argv) {
  const out = execFileSync('npx', ['sanity-workflows', ...argv, '--json'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']})
  return JSON.parse(out)
}

// Every claim, grouped by subject + parameter; a case is any group whose
// sources give different values.
const claims = await groq(`*[_type == "claim" && defined(value)]{
  _id, parameter, value, unit, standing, appliesWhen, ruling, statement,
  "subject": coalesce(subject->name, subject->title), "subjectId": subject._ref,
  "source": source->{title, url, kind, authority, publisher}
}`)
const groups = new Map()
for (const c of claims) {
  if (c.value.length > 40) continue // long lists of exceptions are not one number
  const key = `${c.subjectId}::${c.parameter.toLowerCase()}`
  groups.set(key, [...(groups.get(key) ?? []), c])
}
const disputes = [...groups.values()]
  .filter((g) => new Set(g.map((c) => `${c.value} ${c.unit ?? ''}`)).size > 1)
  .sort((a, b) => b.length - a.length)

// Skip parameters that already have a case open or decided.
const lawAlready = await groq(`*[_type == "labRule" && defined(caseClaim)].caseClaim._ref`)
const open = cli('list', '--tag', 'court', '--definition', 'bench-court', '--include-completed').instances ?? []
const onTrial = new Set([...lawAlready, ...open.map((i) => i.subject?.id?.split(':').pop()).filter(Boolean)])

let filed = 0
for (const group of disputes) {
  if (filed >= LIMIT) break
  // The claim on trial is the lowest-authority one; its rivals are the rest.
  const sorted = [...group].sort((a, b) => (a.source?.authority ?? 0) - (b.source?.authority ?? 0))
  const accused = sorted[0]
  if (onTrial.has(accused._id)) continue
  const rival = sorted[sorted.length - 1]
  // "University of Washington Environmental Health & Safety" → "University of Washington"
  const party = (s) => {
    const p = (s?.publisher ?? s?.title ?? 'Unknown').replace(/\(.*?\)/g, '').replace(/\b(Environment(al)?,? Health (&|and) Safety|EH&S|EHS|Office of .*|Company|Corporation|Press|College of .*)\b.*$/i, '').trim()
    return p.replace(/\s*[/,]\s*$/, '') || s?.title
  }
  let plaintiff = party(rival.source), defendant = party(accused.source)
  if (plaintiff === defendant) [plaintiff, defendant] = [rival.source?.title?.slice(0, 40), accused.source?.title?.slice(0, 40)]
  const caseName = `${plaintiff} v. ${defendant} (${accused.parameter})`

  const evidence = group
    .map((c) => `- "${c.statement}" (value ${c.value}${c.unit ? ` ${c.unit}` : ''}; source: ${c.source?.title}, authority ${c.source?.authority}/5; applies when: ${c.appliesWhen ?? 'not stated'}; current note: ${c.ruling ?? 'none'})`)
    .join('\n')
  const {text: brief} = await generateText({
    model: MODEL,
    providerOptions: {openai: {reasoningEffort: 'low'}},
    system:
      'You are the clerk of Bench Court, where disputed lab-protocol values are tried. Write a brief for the bench (a PI or lab manager). ' +
      'Plain prose, no markdown headings, under 140 words. State the question, summarise each side with its source and authority, ' +
      'say whether the values truly conflict or apply under different conditions, and end with "Clerk recommends:" and one of: sustain, overrule, both apply, dismiss — with a one-line reason. ' +
      'Use only the evidence given. Never invent a value.',
    prompt: `Subject: ${accused.subject}\nParameter: ${accused.parameter}\nClaim on trial: "${accused.statement}" (${accused.source?.title})\n\nAll evidence:\n${evidence}`,
  })

  console.log(`\n§ ${caseName}\n${brief}\n`)
  if (DRY) {
    filed++
    continue
  }
  const started = cli(
    'start', 'bench-court', '--tag', 'court',
    '--field', `subject=${JSON.stringify({id: `dataset:${PROJECT}:${DATASET}:${accused._id}`, type: 'claim'})}`,
    '--field', `caseName=${JSON.stringify(caseName)}`,
  )
  const fired = cli('fire-action', started.instanceId, '--tag', 'court', '--activity', 'file-brief', '--action', 'submit-brief', '--param', `brief=${brief}`)
  console.log(`  filed ${started.instanceId} → ${fired.currentStage}`)
  filed++
}
console.log(`\n${filed} case(s) ${DRY ? 'drafted (dry run)' : 'filed'}.`)
