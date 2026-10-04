# Aliquot

**The bench-side protocol agent.** Ask what temperature, how long, how much, or whether it's safe. Aliquot answers from manufacturer manuals, published protocols and biosafety guidance, reconciled in a Sanity Knowledge Base. It applies them in a fixed order: your lab's SOP first, then the manual for the product in your hand, then everything else. The numbers (PCR programs, master mixes, recipes, dilutions) are computed from structured data, never recalled by a model.

Built for the [DEV × Sanity Challenge](https://dev.to/challenges/sanity-2026-09-16), Path One: *Ship an agent that queries real content*.

## Why it needs structured content

Lab protocols disagree, and the disagreements are usually *conditional*, not wrong:

| Parameter | Source A | Source B | What actually decides it |
| --- | --- | --- | --- |
| Taq extension temperature | NEB Taq: 68 °C | Thermo DreamTaq: 72 °C | Which polymerase is in the tube |
| "LB" | Miller: 10 g/L NaCl | Lennox: 5 g/L · Luria: 0.5 g/L | Which variant the protocol means (or your lab's default) |
| Heat-shock time | NEB (5-alpha cells): 30 s | Addgene: 30–60 s, 45 s ideal | The competent cells you're using |

A keyword search returns whichever sentence matched. Aliquot keeps every value as a **claim** with its source, the source's authority, the condition it applies under and a written ruling. It works out which one applies to *your* bench, then computes the numbers from typed fields.

## How it works

```
                 ┌──────────────────── Sanity Context ────────────────────┐
 browser ──► /api/chat ──► Context MCP "kb"     (Knowledge Base mode)
   │            │             └─ KB from manufacturer pages, Addgene/ASM, WHO/CDC + the ledger
   │            │          ──► Context MCP "ledger" (GROQ mode)
   │            │             └─ polymerase · recipe · protocol · reagent · claim · labRule · source
   │            └─ pcr_program · scale_recipe · dilute  (code does the arithmetic)  ·  verdict (typed answer)
   └─ "Where sources disagree" rail ◄── public GROQ over the same dataset
```

- **Every value is a claim.** `claim` stores what a source said about one parameter of a subject (polymerase, recipe, protocol, reagent). It carries its standing (`current`, `context`, `disputed`, `superseded`), the condition it `appliesWhen`, and a `ruling`.
- **Parameters are data.** Polymerases store cycling parameters as numbers: extension °C, seconds per kb, annealing offset from Tm, reaction components in µL. Recipes store `quantity` objects (value + unit). That's what makes `pcr_program` and `scale_recipe` possible.
- **Precedence is explicit.** `labRule` documents (a house SOP) outrank everything. Then the product's own manual, then regulatory guidance, published protocols and textbooks. Source `authority` (1–5) is stored, not inferred.
- **The Knowledge Base reconciles prose.** It's built from website sources (product protocol pages, Addgene, ASM, biosafety guidance) plus a dataset source (the ledger). Conflicts surface as issues, and resolving one becomes an instruction that future builds keep.
- **The agent reads both** through two Context MCP endpoints, with both initial contexts inlined into the system prompt. It ends by calling `verdict` with a typed object (go / caution / stop, values, program, amounts, conflicts, safety, lab-rule overrides, sources) that the UI renders as a card.

## Layout

- `web/`: Next.js 16, AI SDK 7, `@ai-sdk/mcp`, Vercel AI Gateway. The calculators in `src/lib/calc.ts` are pure and covered by `npm test`.
- `studio/`: Sanity Studio v6. The schema is in `studio/schemaTypes` and the seed builder in `studio/seed`.

## Run it

```bash
cd studio && npm i && python3 seed/build.py && npx sanity dataset import seed/ledger.ndjson production
cd ../web && npm i && cp .env.example .env.local   # fill in the values
npm test && npm run dev
```

Env (`web/.env.local`): `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_ORG_ID`, `SANITY_ORGANIZATION_TOKEN` (an org token with Context Viewer), `CONTEXT_KB_ENDPOINT`, `CONTEXT_LEDGER_ENDPOINT`, plus AI Gateway auth (automatic on Vercel; `vercel env pull` locally).

*Aliquot is a study aid, not a safety officer. When your lab's SOP and Aliquot disagree, the SOP wins.*
