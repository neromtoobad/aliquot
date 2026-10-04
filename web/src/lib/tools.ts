import {tool} from 'ai'
import {z} from 'zod'
import {CONC, dilution, pcrProgram as computePcr, scaleRecipe as computeScale, type PolymeraseDoc, type RecipeDoc} from './calc'
import {client} from './sanity'

// The numbers an experiment lives or dies by are computed here, from structured
// fields in the ledger, never by the model. The model decides *which* polymerase
// or recipe applies; these tools fetch it and hand the arithmetic to calc.ts.

export const pcrProgram = tool({
  description:
    'Build a PCR cycling program and master-mix table from a polymerase stored in the ledger. ' +
    'Reads the manufacturer\'s cycling parameters from the polymerase document and computes annealing temperature and extension time. ' +
    'Use it for any question about PCR temperatures, times or reaction volumes.',
  inputSchema: z.object({
    polymerase: z.string().describe('slug of the polymerase document, e.g. "neb-taq"'),
    ampliconBp: z.number().int().positive().describe('Product length in base pairs'),
    primerTmC: z.array(z.number()).min(1).max(2).optional().describe('Primer melting temperatures in °C, if known'),
    reactions: z.number().int().min(1).max(384).optional().describe('Number of reactions for the master mix'),
    overagePct: z.number().min(0).max(50).optional().describe('Extra volume for pipetting loss, default 10%'),
  }),
  execute: async ({polymerase, ampliconBp, primerTmC, reactions, overagePct}) => {
    const p = await client.fetch<PolymeraseDoc | null>(
      `*[_type == "polymerase" && slug.current == $slug][0]{..., "source": source->{title, url}}`,
      {slug: polymerase},
    )
    if (!p) return {error: `No polymerase "${polymerase}" in the ledger. Query *[_type=="polymerase"]{name, "slug": slug.current} to find the right slug.`}
    return computePcr(p, {ampliconBp, primerTmC, reactions, overagePct})
  },
})

// ---------------------------------------------------------------- recipes
export const scaleRecipe = tool({
  description:
    'Scale a buffer or medium recipe stored in the ledger to a target volume. Reads the structured component list; never estimate amounts yourself. ' +
    'If the asker names an ambiguous recipe (e.g. "LB"), first find every recipe with that alias and say which one you are scaling.',
  inputSchema: z.object({
    recipe: z.string().describe('slug of the recipe document, e.g. "lb-miller"'),
    targetVolume: z.object({value: z.number().positive(), unit: z.enum(['L', 'mL', 'µL'])}),
  }),
  execute: async ({recipe, targetVolume}) => {
    const r = await client.fetch<RecipeDoc | null>(
      `*[_type == "recipe" && slug.current == $slug][0]{name, aliases, yield, components[]{name, amount}, steps, sterilization, "source": source->{title, url}}`,
      {slug: recipe},
    )
    if (!r) return {error: `No recipe "${recipe}". Query *[_type=="recipe"]{name, aliases, "slug": slug.current}.`}
    return computeScale(r, targetVolume)
  },
})

// ---------------------------------------------------------------- dilutions
export const dilute = tool({
  description: 'C1·V1 = C2·V2 with unit conversion. Use for every dilution or stock-to-working calculation.',
  inputSchema: z.object({
    stock: z.object({value: z.number().positive(), unit: z.enum(Object.keys(CONC) as [string, ...string[]])}),
    target: z.object({value: z.number().positive(), unit: z.enum(Object.keys(CONC) as [string, ...string[]])}),
    finalVolume: z.object({value: z.number().positive(), unit: z.enum(['L', 'mL', 'µL'])}),
  }),
  execute: async ({stock, target, finalVolume}) => dilution(stock, target, finalVolume),
})

// ---------------------------------------------------------------- answer card
const claimRef = z.object({
  text: z.string().describe('What the source says, quoted or closely paraphrased'),
  source: z.string().describe('Source title'),
  url: z.string().optional(),
  authority: z.number().min(1).max(5).optional().describe('Source authority 1–5 from the ledger'),
  appliesWhen: z.string().optional(),
})

export const verdict = tool({
  description:
    'Deliver the final answer card. Call exactly once, last. Every value must come from the Context tools or a calculator tool result.',
  inputSchema: z.object({
    verdict: z
      .enum(['go', 'caution', 'stop', 'info'])
      .describe('go = do it this way; caution = fine with a condition or the sources disagree; stop = unsafe or wrong, do not; info = a factual answer'),
    headline: z.string().describe('One plain sentence answering the question.'),
    assumes: z.string().optional().describe('The context the answer assumes, e.g. "NEB Taq, 1.2 kb product, Tm 58/60 °C"'),
    values: z
      .array(z.object({label: z.string(), value: z.string(), note: z.string().optional()}))
      .optional()
      .describe('The numbers to use (from calculator tools or the ledger)'),
    program: z
      .array(z.object({step: z.string(), tempC: z.string(), time: z.string(), repeat: z.string()}))
      .optional()
      .describe('A thermal program, copied from pcr_program'),
    mix: z
      .array(z.object({component: z.string(), perReaction: z.string(), total: z.string()}))
      .optional()
      .describe('A master mix or scaled recipe table, copied from the calculator'),
    conflicts: z
      .array(z.object({parameter: z.string(), claims: z.array(claimRef).min(2), ruling: z.string()}))
      .optional(),
    safety: z.array(z.object({hazard: z.string(), action: z.string(), source: z.string().optional()})).optional(),
    labRules: z.array(z.string()).optional().describe('House SOP rules that changed the answer'),
    sources: z.array(z.object({title: z.string(), url: z.string().optional()})),
  }),
  execute: async () => ({delivered: true}),
})
