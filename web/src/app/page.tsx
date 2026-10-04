import {Desk} from '@/components/Desk'
import {contextConfigured} from '@/lib/context'
import {getDisputes, projectId, dataset} from '@/lib/sanity'

export const revalidate = 120

const LEDGER_QUERY = encodeURIComponent(
  '*[_type=="claim"]{parameter, value, unit, standing, appliesWhen, ruling, "subject": coalesce(subject->name, subject->title), "source": source->{title, url, authority}}',
)

export default async function Home() {
  const disputes = await getDisputes()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 lg:px-6">
        <a href="/" className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
            <rect width="32" height="32" rx="8" fill="var(--ink)" />
            <path d="M16 6c3.6 5 6 8.2 6 11.4A6 6 0 0 1 10 17.4C10 14.2 12.4 11 16 6Z" fill="var(--marker)" />
          </svg>
          <span className="font-serif text-xl tracking-tight text-ink">Aliquot</span>
        </a>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <a href="/how" className="hover:text-ink">How it works</a>
          {projectId && (
            <a
              href={`https://${projectId}.api.sanity.io/v2026-10-01/data/query/${dataset}?query=${LEDGER_QUERY}`}
              target="_blank"
              rel="noreferrer"
              className="hidden hover:text-ink sm:inline"
            >
              Public ledger
            </a>
          )}
          <a href="https://github.com/neromtoobad/aliquot" target="_blank" rel="noreferrer" className="hover:text-ink">
            Code
          </a>
        </nav>
      </header>
      <Desk rail={disputes} configured={contextConfigured()} />
      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-xs text-faint lg:px-6">
        Aliquot cites manufacturer and published sources through Sanity Context. It does not replace your lab&rsquo;s
        safety officer or your PI &mdash; when the SOP and Aliquot disagree, the SOP wins.
      </footer>
    </div>
  )
}
