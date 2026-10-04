// Pure bench arithmetic. No I/O, no model: given structured documents from the
// ledger, return the numbers. Tested in calc.test.ts.

export type Thermal = {tempC?: number; seconds?: number; secondsMax?: number}
export type PolymeraseDoc = {
  name: string
  manufacturer?: string
  initialDenaturation?: Thermal
  denaturation?: Thermal
  annealing?: {rule?: string; offsetC?: number; tempCMin?: number; tempCMax?: number; seconds?: number; secondsMax?: number}
  extension?: {tempC?: number; secondsPerKb?: number; secondsPerKbMax?: number}
  finalExtension?: Thermal
  cycles?: {min?: number; max?: number}
  reaction?: {volumeUl?: number; components?: {name: string; volumeUl?: number; finalConc?: string; toVolume?: boolean}[]}
  source?: {title: string; url?: string}
}

export const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp

export function fmtTime(s?: number): string {
  if (s === undefined) return '—'
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r === 0 ? `${m} min` : `${m} min ${r} s`
}

const range = (a?: number, b?: number) => (a === undefined ? '—' : b !== undefined && b !== a ? `${fmtTime(a)}–${fmtTime(b)}` : fmtTime(a))

/** Extension time for a product, never below 10 s. */
export function extensionSeconds(ampliconBp: number, secondsPerKb: number): number {
  return Math.max(Math.ceil((ampliconBp / 1000) * secondsPerKb), 10)
}

/** Annealing temperature from the lower primer Tm and the manufacturer's offset, clamped to its range. */
export function annealingTemp(p: PolymeraseDoc, primerTmC?: number[]): {tempC?: number; basis: string} {
  const a = p.annealing
  if (!a) return {basis: 'not specified by the manufacturer'}
  if (!primerTmC?.length || a.offsetC === undefined) return {basis: a.rule ?? 'see manufacturer rule'}
  const lower = Math.min(...primerTmC)
  let t = lower + a.offsetC
  const notes: string[] = []
  if (a.tempCMin !== undefined && t < a.tempCMin) {
    t = a.tempCMin
    notes.push('raised to the manufacturer minimum')
  }
  if (a.tempCMax !== undefined && t > a.tempCMax) {
    t = a.tempCMax
    notes.push('capped at the manufacturer maximum')
  }
  const sign = a.offsetC >= 0 ? '+' : '−'
  return {
    tempC: round(t),
    basis: `${a.rule ? `${a.rule} → ` : ''}lower primer Tm ${lower} °C ${sign} ${Math.abs(a.offsetC)} °C${notes.length ? ` (${notes.join(', ')})` : ''}`,
  }
}

export function pcrProgram(
  p: PolymeraseDoc,
  {ampliconBp, primerTmC, reactions = 1, overagePct = 10}: {ampliconBp: number; primerTmC?: number[]; reactions?: number; overagePct?: number},
) {
  const rate = p.extension?.secondsPerKb
  const ext = rate ? extensionSeconds(ampliconBp, rate) : undefined
  const extMax = p.extension?.secondsPerKbMax ? extensionSeconds(ampliconBp, p.extension.secondsPerKbMax) : undefined
  const anneal = annealingTemp(p, primerTmC)
  const cycles = p.cycles?.min && p.cycles?.max ? `${p.cycles.min}–${p.cycles.max}` : String(p.cycles?.min ?? p.cycles?.max ?? '25–35')
  const annealRange = p.annealing?.tempCMin !== undefined && p.annealing?.tempCMax !== undefined ? `${p.annealing.tempCMin}–${p.annealing.tempCMax}` : 'see rule'

  const program = [
    {step: 'Initial denaturation', tempC: String(p.initialDenaturation?.tempC ?? '—'), time: range(p.initialDenaturation?.seconds, p.initialDenaturation?.secondsMax), repeat: '1×'},
    {step: 'Denaturation', tempC: String(p.denaturation?.tempC ?? '—'), time: range(p.denaturation?.seconds, p.denaturation?.secondsMax), repeat: `${cycles}×`},
    {step: 'Annealing', tempC: anneal.tempC !== undefined ? String(anneal.tempC) : annealRange, time: range(p.annealing?.seconds, p.annealing?.secondsMax), repeat: `${cycles}×`},
    {step: 'Extension', tempC: String(p.extension?.tempC ?? '—'), time: range(ext, extMax), repeat: `${cycles}×`},
    {step: 'Final extension', tempC: String(p.finalExtension?.tempC ?? '—'), time: range(p.finalExtension?.seconds, p.finalExtension?.secondsMax), repeat: '1×'},
    {step: 'Hold', tempC: '4–10', time: '∞', repeat: ''},
  ]

  const factor = reactions * (1 + overagePct / 100)
  const comps = p.reaction?.components ?? []
  const isWater = (name: string) => /water|h2o/i.test(name)
  const isOptional = (name: string) => /optional/i.test(name)
  const fixed = comps.filter((c) => !isWater(c.name) && c.volumeUl !== undefined && !isOptional(c.name))
  const variable = comps.filter((c) => !isWater(c.name) && c.volumeUl === undefined)
  const fixedSum = fixed.reduce((sum, c) => sum + (c.volumeUl ?? 0), 0)

  const rows = comps.map((c) => {
    if (isWater(c.name)) {
      // Water brings each tube to volume. Only computable when nothing else is variable.
      const per = p.reaction?.volumeUl !== undefined && variable.length === 0 ? round(p.reaction.volumeUl - fixedSum, 2) : undefined
      return per !== undefined
        ? {component: c.name, perReaction: `${per} µL`, total: `${round(per * factor, 1)} µL`, finalConc: c.finalConc ?? '', inMix: true}
        : {component: c.name, perReaction: `to ${p.reaction?.volumeUl ?? '?'} µL`, total: `to volume, after ${variable.map((v) => v.name).join(', ')}`, finalConc: c.finalConc ?? '', inMix: false}
    }
    if (c.volumeUl === undefined) return {component: c.name, perReaction: 'variable', total: 'add to each tube', finalConc: c.finalConc ?? '', inMix: false}
    if (isOptional(c.name)) return {component: c.name, perReaction: `${c.volumeUl} µL`, total: `${round(c.volumeUl * factor, 1)} µL if used`, finalConc: c.finalConc ?? '', inMix: false}
    return {component: c.name, perReaction: `${c.volumeUl} µL`, total: `${round(c.volumeUl * factor, 1)} µL`, finalConc: c.finalConc ?? '', inMix: true}
  })

  return {
    polymerase: `${p.name}${p.manufacturer ? ` (${p.manufacturer})` : ''}`,
    ampliconBp,
    extensionMath: rate ? `${round(ampliconBp / 1000, 2)} kb × ${rate} s/kb = ${fmtTime(ext)} at ${p.extension?.tempC} °C` : 'no extension rate stored',
    annealing: anneal,
    program,
    masterMix: {reactions, overagePct, multiplier: round(factor, 2), reactionVolumeUl: p.reaction?.volumeUl, fixedPerReactionUl: round(fixedSum, 2), rows},
    source: p.source,
  }
}

// ---------------------------------------------------------------- recipes
export const VOLUME_L: Record<string, number> = {L: 1, mL: 1e-3, 'µL': 1e-6}

export type RecipeDoc = {
  name: string
  aliases?: string[]
  yield: {value: number; unit: string}
  components: {name: string; amount: {value: number; unit: string}}[]
  steps?: string
  sterilization?: string
  source?: {title: string; url?: string}
}

export function scaleRecipe(r: RecipeDoc, target: {value: number; unit: 'L' | 'mL' | 'µL'}) {
  const from = r.yield.value * (VOLUME_L[r.yield.unit] ?? NaN)
  if (!Number.isFinite(from)) return {error: `Recipe yield unit "${r.yield.unit}" is not a volume.`}
  const k = (target.value * VOLUME_L[target.unit]) / from
  return {
    recipe: r.name,
    aliases: r.aliases,
    scaledFrom: `${r.yield.value} ${r.yield.unit}`,
    scaledTo: `${target.value} ${target.unit}`,
    factor: round(k, 4),
    components: r.components.map((c) => {
      const v = c.amount.value * k
      return {component: c.name, original: `${c.amount.value} ${c.amount.unit}`, scaled: `${round(v, v < 1 ? 3 : 2)} ${c.amount.unit}`}
    }),
    steps: r.steps,
    sterilization: r.sterilization,
    source: r.source,
  }
}

// ---------------------------------------------------------------- dilutions
export const CONC: Record<string, {dim: string; f: number}> = {
  M: {dim: 'molar', f: 1},
  mM: {dim: 'molar', f: 1e-3},
  'µM': {dim: 'molar', f: 1e-6},
  nM: {dim: 'molar', f: 1e-9},
  X: {dim: 'x', f: 1},
  '%': {dim: 'percent', f: 1},
  'g/L': {dim: 'mass', f: 1},
  'mg/mL': {dim: 'mass', f: 1},
  'µg/µL': {dim: 'mass', f: 1},
  'µg/mL': {dim: 'mass', f: 1e-3},
  'ng/µL': {dim: 'mass', f: 1e-3},
}

export function dilution(
  stock: {value: number; unit: string},
  target: {value: number; unit: string},
  finalVolume: {value: number; unit: string},
) {
  const a = CONC[stock.unit]
  const b = CONC[target.unit]
  if (!a || !b) return {error: `Unknown unit ${!a ? stock.unit : target.unit}.`}
  if (a.dim !== b.dim) return {error: `Can't convert ${stock.unit} to ${target.unit} without a molecular weight.`}
  const c1 = stock.value * a.f
  const c2 = target.value * b.f
  if (c2 > c1) return {error: 'Target is more concentrated than the stock.'}
  const v2 = finalVolume.value
  const v1 = (c2 * v2) / c1
  const fmt = (x: number) => round(x, x < 1 ? 3 : 2)
  return {
    takeStock: `${fmt(v1)} ${finalVolume.unit}`,
    addDiluent: `${fmt(v2 - v1)} ${finalVolume.unit}`,
    math: `${stock.value} ${stock.unit} × V1 = ${target.value} ${target.unit} × ${v2} ${finalVolume.unit}`,
    dilutionFactor: `1:${round(c1 / c2, 2)}`,
  }
}
