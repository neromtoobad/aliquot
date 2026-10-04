'use client'

import {useChat} from '@ai-sdk/react'
import {DefaultChatTransport, getToolName, isToolUIPart, type UIMessage} from 'ai'
import {useEffect, useMemo, useRef, useState} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type {Dispute} from '@/lib/sanity'
import {Rail} from './Rail'
import {ToolTrace, type TraceStep} from './ToolTrace'
import {VerdictCard, type Verdict} from './VerdictCard'

const SUGGESTIONS = [
  {label: 'PCR program for a 1.2 kb product with NEB Taq', q: 'Give me the PCR program and a master mix for 12 reactions: NEB Taq, 1,200 bp product, primer Tms 58 °C and 61 °C.'},
  {label: 'Make 500 mL of LB', q: 'How do I make 500 mL of LB broth?'},
  {label: 'Heat shock: 30 s or 45 s?', q: 'For heat-shock transformation of chemically competent E. coli, how long is the heat shock? I\'ve seen 30 s and 45 s.'},
  {label: 'Can I autoclave bleach-treated waste?', q: 'Can I autoclave liquid waste that I already treated with bleach?'},
]

function splitParts(message: UIMessage) {
  const text: string[] = []
  const steps: TraceStep[] = []
  let verdict: Verdict | null = null
  for (const part of message.parts) {
    if (part.type === 'text') text.push(part.text)
    else if (isToolUIPart(part)) {
      const name = getToolName(part)
      if (name === 'verdict') {
        if (part.state === 'input-available' || part.state === 'output-available') verdict = part.input as Verdict
      } else {
        steps.push({name, state: part.state, input: part.input, output: 'output' in part ? part.output : undefined})
      }
    }
  }
  return {text: text.join('\n\n').trim(), steps, verdict}
}

export function Desk({rail, configured}: {rail: Dispute[]; configured: boolean}) {
  const transport = useMemo(() => new DefaultChatTransport({api: '/api/chat'}), [])
  const {messages, sendMessage, status, error, stop} = useChat({transport})
  const [input, setInput] = useState('')
  const [draftOpen, setDraftOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'smooth', block: 'end'})
  }, [messages, status])

  function ask(q: string) {
    if (!q.trim() || busy) return
    sendMessage({text: q.trim()})
    setInput('')
  }

  function checkDraft() {
    if (!draft.trim() || busy) return
    const which = input.trim() || 'the kit or method it is for (work it out from the text)'
    sendMessage({
      text: `Check my protocol for ${which} against the ledger and the Knowledge Base. Flag every value that disagrees with the source for that product, and every safety issue.\n\n--- PROTOCOL ---\n${draft.trim()}`,
    })
    setDraftOpen(false)
    setDraft('')
    setInput('')
  }

  const empty = messages.length === 0

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 pb-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
      <main className="min-w-0">
        {empty && (
          <section className="pb-6 pt-8 sm:pt-14">
            <h1 className="font-serif text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl">
              The kit says 68&nbsp;°C. The textbook says 72.
              <br className="hidden sm:block" /> <span className="marker">Which one is your bench?</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              Aliquot reads manufacturer manuals, published protocols and biosafety guidance through a Sanity
              Knowledge Base, keeps every value as a sourced claim in a structured ledger, and applies them in order:
              your lab&rsquo;s SOP, then the manual for the product in your hand, then everything else. The numbers
              &mdash; PCR programs, master mixes, recipes, dilutions &mdash; are computed from the data, not
              remembered by a model.
            </p>
          </section>
        )}

        <div className="space-y-6">
          {messages.map((m) => {
            if (m.role === 'user') {
              const t = m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('')
              const [q, d] = t.split('\n\n--- PROTOCOL ---\n')
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[15px] text-white">
                    {d ? (
                      <>
                        <div>{q.replace(/ against the ledger and the Knowledge Base\..*$/, '.')}</div>
                        <div className="mt-1.5 line-clamp-3 rounded-lg bg-white/10 px-2.5 py-1.5 font-mono text-xs text-white/80">
                          {d}
                        </div>
                      </>
                    ) : (
                      q
                    )}
                  </div>
                </div>
              )
            }
            const {text, steps, verdict} = splitParts(m)
            const isLast = m.id === messages[messages.length - 1]?.id
            return (
              <div key={m.id} className="space-y-3">
                <ToolTrace steps={steps} live={isLast && busy && !verdict} />
                {text && (
                  <div className="prose-fp text-[15px] text-ink">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                  </div>
                )}
                {verdict && <VerdictCard v={verdict} />}
              </div>
            )
          })}
          {status === 'submitted' && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="dot-pulse inline-flex gap-0.5 text-ink">
                <span>•</span>
                <span>•</span>
                <span>•</span>
              </span>
              Opening the protocols…
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-no/30 bg-no-soft px-4 py-3 text-sm text-no">
              Something went wrong reading the protocols: {error.message}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className={`${empty ? '' : 'sticky bottom-0 bg-gradient-to-t from-paper via-paper to-transparent pt-6'} pb-2`}>
          {!configured && (
            <div className="mb-3 rounded-xl border border-risk/30 bg-risk-soft px-4 py-3 text-sm text-risk">
              The agent isn&rsquo;t connected to Sanity Context on this deployment yet.
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="rounded-2xl border border-line-strong bg-card p-2 shadow-[0_8px_30px_-16px_rgba(60,50,20,0.35)] focus-within:border-ink"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  ask(input)
                }
              }}
              rows={empty ? 2 : 1}
              placeholder="Ask what temperature, how long, how much, or whether it's safe…"
              className="w-full resize-none bg-transparent px-2.5 py-2 text-[15px] text-ink outline-none placeholder:text-faint"
            />
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 text-xs text-faint">
                <button
                  type="button"
                  onClick={() => setDraftOpen((o) => !o)}
                  className="rounded-full border border-line px-2.5 py-1 text-muted hover:border-line-strong hover:text-ink"
                >
                  {draftOpen ? 'Close' : 'Check my protocol'}
                </button>
                <span className="hidden sm:inline">Answers cite their sources</span>
              </div>
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="rounded-xl border border-line-strong px-4 py-2 text-sm font-medium text-ink"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.35)] disabled:opacity-30"
                >
                  Ask
                </button>
              )}
            </div>
            {draftOpen && (
              <div className="mt-2 border-t border-line px-1 pt-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={7}
                  placeholder="Paste the protocol you're about to run (a handout, a lab-book page). Name the kit in the box above if it isn't in the text."
                  className="w-full resize-y rounded-xl border border-line bg-paper px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-line-strong"
                />
                <div className="flex justify-end pb-1">
                  <button
                    type="button"
                    onClick={checkDraft}
                    disabled={!draft.trim() || busy}
                    className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-30"
                  >
                    Check it against the sources
                  </button>
                </div>
              </div>
            )}
          </form>
          {empty && (
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => ask(s.q)}
                  className="rounded-full border border-line bg-card px-3.5 py-1.5 text-sm text-muted hover:border-line-strong hover:text-ink"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <aside className="lg:pt-14">
        <Rail items={rail} onAsk={(q) => ask(q)} />
      </aside>
    </div>
  )
}
