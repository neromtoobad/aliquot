'use client'

import {useState} from 'react'

export type TraceStep = {
  name: string
  state: string
  input?: unknown
  output?: unknown
}

const LABEL: Record<string, string> = {
  knowledge_base_read: 'Read Knowledge Base entries',
  knowledge_base_search: 'Searched the Knowledge Base',
  groq_query: 'Queried the ledger (GROQ)',
  schema_explorer: 'Looked up the schema',
  array_field_reader: 'Read a long field',
  pcr_program: 'Computed the PCR program',
  scale_recipe: 'Scaled the recipe',
  dilute: 'Worked out the dilution',
  initial_context: 'Read the outline',
}

const SOURCE: Record<string, string> = {
  knowledge_base_read: 'Protocol KB',
  knowledge_base_search: 'Protocol KB',
  groq_query: 'Ledger',
  schema_explorer: 'Ledger',
  array_field_reader: 'Ledger',
  pcr_program: 'Calculator',
  scale_recipe: 'Calculator',
  dilute: 'Calculator',
}

function summary(step: TraceStep): string {
  const input = (step.input ?? {}) as Record<string, unknown>
  if (step.name === 'knowledge_base_read' && Array.isArray(input.paths)) return (input.paths as string[]).join(' · ')
  if (step.name === 'knowledge_base_search') return String(input.query ?? JSON.stringify(input))
  if (step.name === 'groq_query' && typeof input.query === 'string') return input.query
  if (step.name === 'schema_explorer') return String(input.type ?? '') + (input.path ? `.${input.path}` : '')
  if (step.name === 'pcr_program') return `${input.polymerase} · ${input.ampliconBp} bp${input.reactions ? ` · ${input.reactions} rxns` : ''}`
  if (step.name === 'scale_recipe') {
    const t = input.targetVolume as {value?: number; unit?: string} | undefined
    return `${input.recipe} → ${t?.value ?? ''} ${t?.unit ?? ''}`
  }
  if (step.name === 'dilute') return JSON.stringify(input)
  return ''
}

function resultCount(step: TraceStep): string | null {
  const out = step.output as {content?: {text?: string}[]} | undefined
  const text = out?.content?.[0]?.text
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    if (parsed?.meta?.resultCount !== undefined) return `${parsed.meta.resultCount} result${parsed.meta.resultCount === 1 ? '' : 's'}`
  } catch {}
  return `${Math.round(text.length / 100) / 10}k chars`
}

export function ToolTrace({steps, live}: {steps: TraceStep[]; live: boolean}) {
  const [open, setOpen] = useState(false)
  if (steps.length === 0) return null
  const kb = steps.filter((s) => s.name.startsWith('knowledge_base')).length
  const groq = steps.filter((s) => s.name === 'groq_query').length

  return (
    <div className="rounded-xl border border-line bg-card/70">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm"
      >
        <span className="flex items-center gap-2 text-muted">
          {live ? (
            <span className="dot-pulse inline-flex gap-0.5 text-ink">
              <span>•</span>
              <span>•</span>
              <span>•</span>
            </span>
          ) : (
            <span className="text-yes">✓</span>
          )}
          <span>
            <span className="font-medium text-ink">How I checked</span>
            {' — '}
            {kb > 0 && `${kb} Knowledge Base call${kb > 1 ? 's' : ''}`}
            {kb > 0 && groq > 0 && ', '}
            {groq > 0 && `${groq} GROQ quer${groq > 1 ? 'ies' : 'y'}`}
            {kb === 0 && groq === 0 && `${steps.length} step${steps.length > 1 ? 's' : ''}`}
          </span>
        </span>
        <span className="text-xs text-faint">{open ? 'hide' : 'show'}</span>
      </button>
      {open && (
        <ol className="space-y-2 border-t border-line px-3.5 py-3">
          {steps.map((s, i) => (
            <li key={i} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="rounded bg-paper px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                  {SOURCE[s.name] ?? 'Tool'}
                </span>
                <span className="font-medium text-ink">{LABEL[s.name] ?? s.name}</span>
                {s.state === 'output-available' && resultCount(s) && (
                  <span className="text-xs text-faint">{resultCount(s)}</span>
                )}
                {s.state === 'output-error' && <span className="text-xs text-no">error</span>}
              </div>
              {summary(s) && (
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-paper px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed text-muted">
                  {summary(s)}
                </pre>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
