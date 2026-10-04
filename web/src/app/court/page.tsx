import Link from 'next/link'
import {client, projectId} from '@/lib/sanity'

export const revalidate = 60
export const metadata = {title: 'Bench Court record — Aliquot'}

type Ruling = {
  _id: string
  title: string
  rule: string
  caseName?: string
  verdict?: string
  brief?: string
  ruledAt?: string
  claim?: {statement: string; value?: string; unit?: string; source?: {title: string; url?: string}}
}

const VERDICT_TONE: Record<string, string> = {
  sustained: 'text-yes border-yes',
  overruled: 'text-no border-no',
  'both-apply': 'text-info border-info',
}

export default async function CourtRecord() {
  const rulings: Ruling[] = projectId
    ? await client.fetch(
        `*[_type == "labRule" && origin == "court"] | order(ruledAt desc){
          _id, title, rule, caseName, verdict, brief, ruledAt,
          "claim": caseClaim->{statement, value, unit, "source": source->{title, url}}
        }`,
        {},
        {next: {revalidate: 60}},
      )
    : []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-6">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← Back to the bench
      </Link>
      <h1 className="mt-4 font-serif text-4xl tracking-tight text-ink">
        Bench Court <span className="marker">record</span>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        When reputable sources disagree on a value, the dispute goes on trial. An agent (the clerk) opens a case through
        Sanity Workflows and files a brief from every claim in the ledger; a person rules in the Bench Court app, an App
        SDK app in the Sanity Dashboard. A ruling is written back as a lab rule, and Aliquot applies it before any outside source.
        These are the rulings so far, read live from the public dataset.
      </p>

      {rulings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-card p-6 text-sm text-muted">
          No rulings yet — the cases are in session.
        </div>
      ) : (
        <ol className="mt-8 space-y-5">
          {rulings.map((r) => (
            <li key={r._id} className="rounded-2xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-faint">{r.title}</div>
                  <h2 className="font-serif text-xl leading-snug text-ink">{r.caseName}</h2>
                </div>
                {r.verdict && (
                  <span className={`-rotate-3 rounded-md border-2 px-2.5 py-0.5 font-serif text-sm font-semibold uppercase tracking-widest ${VERDICT_TONE[r.verdict] ?? 'text-muted border-line'}`}>
                    {r.verdict.replace('-', ' ')}
                  </span>
                )}
              </div>
              <p className="mt-3 rounded-lg bg-marker-soft px-3 py-2 font-serif text-[17px] leading-snug text-ink">“{r.rule}”</p>
              {r.claim && (
                <p className="mt-3 text-sm text-muted">
                  Claim on trial: “{r.claim.statement}”{' '}
                  {r.claim.source?.url ? (
                    <a href={r.claim.source.url} className="underline underline-offset-2" target="_blank" rel="noreferrer">
                      {r.claim.source.title}
                    </a>
                  ) : (
                    r.claim.source?.title
                  )}
                </p>
              )}
              {r.brief && (
                <details className="mt-3 text-sm text-muted">
                  <summary className="cursor-pointer text-ink">Clerk’s brief (written by the agent)</summary>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">{r.brief}</p>
                </details>
              )}
              {r.ruledAt && <div className="mt-3 text-xs text-faint">Ruled {new Date(r.ruledAt).toUTCString().slice(0, 22)} UTC</div>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
