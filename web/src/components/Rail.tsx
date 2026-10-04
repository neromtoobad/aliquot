'use client'

import type {Dispute} from '@/lib/sanity'

export function Rail({items, onAsk}: {items: Dispute[]; onAsk: (q: string) => void}) {
  return (
    <div className="rounded-2xl border border-line bg-card">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-serif text-lg text-ink">Where sources disagree</h2>
        <p className="text-xs text-faint">Live from the ledger: same parameter, different numbers.</p>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">The ledger is empty.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((d) => (
            <li key={`${d.subject}-${d.parameter}`}>
              <button
                onClick={() => onAsk(`${d.subject}: which ${d.parameter} should I use? My sources disagree.`)}
                className="group block w-full px-4 py-3 text-left hover:bg-paper"
              >
                <div className="text-sm font-medium leading-snug text-ink group-hover:underline group-hover:underline-offset-2">
                  {d.subject}
                </div>
                <div className="text-xs text-muted">{d.parameter}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {[...new Map(d.values.map((v) => [v.value, v])).values()].slice(0, 4).map((v) => (
                    <span
                      key={v.value}
                      title={`${v.source} · authority ${v.authority}`}
                      className="rounded-md border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink"
                    >
                      {v.value}
                    </span>
                  ))}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
