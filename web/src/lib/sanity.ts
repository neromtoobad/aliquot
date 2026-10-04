import {createClient} from '@sanity/client'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ''
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

// The ledger dataset is public: anyone (including judges) can read it with GROQ.
export const client = createClient({projectId: projectId || 'missing', dataset, apiVersion: '2026-10-01', useCdn: true})

export type Dispute = {
  subject: string
  subjectType: string
  parameter: string
  values: {value: string; source: string; authority: number; standing: string}[]
}

// Every parameter where two sources in the ledger give different values.
export const DISPUTE_QUERY = `*[_type == "claim" && defined(value)]{
  parameter, value, unit, standing,
  "subject": coalesce(subject->name, subject->title),
  "subjectType": subject->_type,
  "source": source->title,
  "authority": source->authority
} | order(subject asc, parameter asc)`

export async function getDisputes(): Promise<Dispute[]> {
  if (!projectId) return []
  try {
    const rows = await client.fetch<
      {parameter: string; value: string; unit?: string; standing: string; subject: string; subjectType: string; source: string; authority: number}[]
    >(DISPUTE_QUERY, {}, {next: {revalidate: 120}})
    const groups = new Map<string, Dispute>()
    for (const r of rows) {
      if (!r.subject) continue
      const k = `${r.subject}::${r.parameter.toLowerCase()}`
      const g = groups.get(k) ?? {subject: r.subject, subjectType: r.subjectType, parameter: r.parameter, values: []}
      g.values.push({value: `${r.value}${r.unit ? ` ${r.unit}` : ''}`, source: r.source, authority: r.authority, standing: r.standing})
      groups.set(k, g)
    }
    // Numbers people actually set on a machine, not long lists of exceptions.
    return [...groups.values()]
      .map((g) => ({...g, values: g.values.filter((v) => v.value.length <= 32)}))
      .filter((g) => new Set(g.values.map((v) => v.value)).size > 1)
      .sort((a, b) => new Set(b.values.map((v) => v.value)).size - new Set(a.values.map((v) => v.value)).size)
      .slice(0, 9)
  } catch {
    return []
  }
}
