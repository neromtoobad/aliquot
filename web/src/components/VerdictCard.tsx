export type Verdict = {
  verdict: 'go' | 'caution' | 'stop' | 'info'
  headline: string
  assumes?: string
  values?: {label: string; value: string; note?: string}[]
  program?: {step: string; tempC: string; time: string; repeat: string}[]
  mix?: {component: string; perReaction: string; total: string}[]
  conflicts?: {
    parameter: string
    claims: {text: string; source: string; url?: string; authority?: number; appliesWhen?: string}[]
    ruling: string
  }[]
  safety?: {hazard: string; action: string; source?: string}[]
  labRules?: string[]
  sources?: {title: string; url?: string}[]
}

const TONE = {
  go: {label: 'Go', bg: 'bg-yes-soft', fg: 'text-yes', ring: 'border-yes/30'},
  caution: {label: 'Caution', bg: 'bg-risk-soft', fg: 'text-risk', ring: 'border-risk/30'},
  stop: {label: 'Stop', bg: 'bg-no-soft', fg: 'text-no', ring: 'border-no/30'},
  info: {label: 'Answer', bg: 'bg-info-soft', fg: 'text-info', ring: 'border-info/30'},
} as const

function Authority({n}: {n?: number}) {
  if (!n) return null
  return (
    <span className="inline-flex items-center gap-0.5" title={`Source authority ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-1.5 w-3 rounded-full ${i <= n ? 'bg-ink' : 'bg-line'}`} />
      ))}
    </span>
  )
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div className="border-b border-line px-5 py-4 last:border-b-0">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{title}</div>
      {children}
    </div>
  )
}

export function VerdictCard({v}: {v: Verdict}) {
  const tone = TONE[v.verdict] ?? TONE.info
  return (
    <div className={`overflow-hidden rounded-2xl border ${tone.ring} bg-card shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(40,60,50,0.2)]`}>
      <div className={`${tone.bg} flex items-start gap-3 px-5 py-4`}>
        <span className={`rounded-md bg-white/75 px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${tone.fg}`}>{tone.label}</span>
        <div className="min-w-0">
          <p className="font-serif text-[1.15rem] leading-snug text-ink">{v.headline}</p>
          {v.assumes && <div className="mt-1 text-xs text-muted">Assuming: {v.assumes}</div>}
        </div>
      </div>

      {v.safety && v.safety.length > 0 && (
        <Section title="Safety first">
          <ul className="space-y-2">
            {v.safety.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-no text-[11px] font-bold text-white">!</span>
                <div>
                  <div className="font-medium text-ink">{s.hazard}</div>
                  <div className="text-muted">{s.action}</div>
                  {s.source && <div className="text-xs text-faint">— {s.source}</div>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {v.labRules && v.labRules.length > 0 && (
        <Section title="Your lab's SOP overrides">
          <ul className="space-y-1.5">
            {v.labRules.map((r, i) => (
              <li key={i} className="rounded-lg bg-marker-soft px-3 py-2 text-sm text-ink">
                {r}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {v.values && v.values.length > 0 && (
        <Section title="Use these values">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {v.values.map((x, i) => (
              <div key={i} className="min-w-0">
                <dt className="text-xs text-muted">{x.label}</dt>
                <dd className="font-serif text-xl leading-tight text-ink">{x.value}</dd>
                {x.note && <dd className="text-xs text-faint">{x.note}</dd>}
              </div>
            ))}
          </dl>
        </Section>
      )}

      {v.program && v.program.length > 0 && (
        <Section title="Thermal program">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-faint">
                  <th className="pb-1.5 pr-3 font-medium">Step</th>
                  <th className="pb-1.5 pr-3 font-medium">°C</th>
                  <th className="pb-1.5 pr-3 font-medium">Time</th>
                  <th className="pb-1.5 font-medium">Cycles</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[13px]">
                {v.program.map((s, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1.5 pr-3 font-sans text-ink">{s.step}</td>
                    <td className="py-1.5 pr-3 tabular-nums text-ink">{s.tempC}</td>
                    <td className="py-1.5 pr-3 tabular-nums text-ink">{s.time}</td>
                    <td className="py-1.5 tabular-nums text-muted">{s.repeat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {v.mix && v.mix.length > 0 && (
        <Section title="Amounts">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-faint">
                  <th className="pb-1.5 pr-3 font-medium">Component</th>
                  <th className="pb-1.5 pr-3 text-right font-medium">Per unit</th>
                  <th className="pb-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {v.mix.map((m, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1.5 pr-3 text-ink">{m.component}</td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-muted">{m.perReaction}</td>
                    <td className="py-1.5 text-right font-mono font-semibold tabular-nums text-ink">{m.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {v.conflicts && v.conflicts.length > 0 && (
        <Section title="Sources disagree">
          <div className="space-y-4">
            {v.conflicts.map((c, i) => (
              <div key={i}>
                <div className="mb-2 text-sm font-semibold text-ink">{c.parameter}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {c.claims.map((cl, j) => (
                    <div key={j} className="rounded-xl border border-line bg-paper p-3">
                      <p className="text-sm leading-snug text-ink">“{cl.text}”</p>
                      {cl.appliesWhen && <p className="mt-1 text-xs text-muted">When: {cl.appliesWhen}</p>}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <span className="min-w-0 truncate">
                          {cl.url ? (
                            <a href={cl.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                              {cl.source}
                            </a>
                          ) : (
                            cl.source
                          )}
                        </span>
                        <Authority n={cl.authority} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 rounded-lg bg-marker-soft px-3 py-2 text-sm text-ink">
                  <span className="font-semibold">Ruling: </span>
                  {c.ruling}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {v.sources && v.sources.length > 0 && (
        <div className="px-5 py-3">
          <div className="flex flex-wrap gap-1.5">
            {v.sources.map((s, i) =>
              s.url ? (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-muted hover:border-line-strong hover:text-ink"
                >
                  {s.title} ↗
                </a>
              ) : (
                <span key={i} className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-muted">
                  {s.title}
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
