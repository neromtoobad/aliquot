import Link from 'next/link'

export const metadata = {title: 'How Aliquot works'}

const STEPS = [
  {
    n: '1',
    title: 'Every number is a claim, and every claim has a source',
    body: 'The ledger doesn’t store “the extension temperature for Taq”. It stores what each source says about it — NEB’s product protocol, a published protocol, a teaching handout — with the source’s authority (1 forum … 5 the manufacturer’s own manual or regulatory guidance), the condition it applies under, and a written ruling. Where reputable sources genuinely disagree, the claim is marked disputed or context-dependent instead of being flattened into one value.',
  },
  {
    n: '2',
    title: 'Parameters are data, not prose',
    body: 'Polymerases store their cycling parameters as numbers (extension °C, seconds per kb, annealing offset from Tm, reaction components in µL). Recipes store components as value + unit. That is what lets Aliquot compute a PCR program for your amplicon length, scale a master mix to 12 reactions with overage, or turn “1 L of LB Miller” into 500 mL — deterministically, in code, with the source attached.',
  },
  {
    n: '3',
    title: 'A Knowledge Base reconciles the prose',
    body: 'Sanity Context builds a Knowledge Base from manufacturer protocol pages, Addgene and ASM protocols and biosafety guidance (website sources) plus the ledger itself (a dataset source). When two sources disagree, the build raises an issue with both claims side by side; resolving it once becomes an instruction every future build keeps.',
  },
  {
    n: '4',
    title: 'Precedence is explicit',
    body: 'Your lab’s SOP (labRule documents) outranks everything for your lab. Then the manual for the exact product in your hand. Then regulatory guidance for safety, then published protocols, then textbooks. The agent applies that order every time and shows it — a kit manual binds that kit, not every PCR.',
  },
  {
    n: '5',
    title: 'Answers come back as structure',
    body: 'The agent reads both sources through two Context MCP endpoints (Knowledge Base mode and GROQ mode), calls the calculator tools for every number, and finishes with a typed verdict: go / caution / stop, the values to use, the program or amounts table, any conflicts with both sources and the ruling, safety notes and lab-rule overrides. The card you see is that object.',
  },
]

export default function How() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-6">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← Back to the bench
      </Link>
      <h1 className="mt-4 font-serif text-4xl tracking-tight text-ink">
        How <span className="marker">Aliquot</span> works
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Built for the DEV × Sanity Challenge. A keyword search finds the sentence “extend at 72 °C”. It doesn’t know
        that the manual for the polymerase you’re actually using says 68 °C, that your lab bans ethidium bromide, or
        how long a 1.2 kb product needs at 1 minute per kb.
      </p>
      <ol className="mt-8 space-y-5">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-4 rounded-2xl border border-line bg-card p-5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-marker font-serif text-ink">{s.n}</span>
            <div>
              <h2 className="font-serif text-xl text-ink">{s.title}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8 rounded-2xl border border-line bg-card p-5 font-mono text-[12.5px] leading-relaxed text-muted">
        <div className="mb-2 font-sans text-xs font-medium uppercase tracking-wide text-faint">The query behind “which value applies?”</div>
        <pre className="whitespace-pre-wrap">{`*[_type == "claim" && subject._ref == $id && parameter match $p]
  | order(source->authority desc){
    statement, value, unit, standing, appliesWhen, ruling,
    "source": source->{title, url, kind, authority}
  }`}</pre>
      </div>
    </div>
  )
}
