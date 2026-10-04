---
title: "Aliquot: the kit says 68 °C, the textbook says 72. An agent that knows which one is your bench"
published: false
tags: devchallenge, sanitychallenge, sanity, ai
cover_image: https://raw.githubusercontent.com/neromtoobad/aliquot/main/docs/img/landing.jpg
---

*This is a submission for the [Sanity Challenge, Path One: Ship an Agent That Queries Real Content](https://dev.to/challenges/sanity-2026-09-16)*

## What I Built

I'm an M.Tech Biology student. A surprising share of my bench time doesn't go on the experiment. It goes on deciding **which number to trust**.

- The handout says extend at **72 °C**. NEB's Taq protocol says **68 °C**. Both are right, for different polymerases.
- "Make LB" means **10 g** of NaCl per litre in one protocol, **5 g** in another and **0.5 g** in a third. All three are called "LB", and Sigma even lists "Miller's Modification" as a synonym on its *low-salt* product.
- One university says a 1:10 bleach spill needs **30 minutes** of contact, another says **20**, a third says **15–20**.
- NEB says heat-shock its 5-alpha cells for **exactly 30 s**. Addgene says **30–60 s, 45 s ideal**.

A keyword search hands you whichever sentence matched first. Get it wrong and you lose a week of PCR, a plate of cells, or a spill that wasn't actually decontaminated.

**Aliquot** is a bench-side protocol agent. Ask it what temperature, how long, how much, or whether something is safe. It answers from manufacturer manuals, published protocols and biosafety guidance, and it applies them in a fixed order:

1. **your lab's SOP**, which outranks everything for your lab,
2. **the manufacturer's manual for the exact product in your hand**, which binds that product only,
3. **regulatory guidance** (WHO, CDC) for safety,
4. **published protocols** (Addgene, CSH, ASM) and university SOPs,
5. textbooks and forums, as context only.

When sources disagree, Aliquot shows the claims side by side, with their sources, and gives a ruling: which value applies, under what condition, and why. **It never computes a number itself.** PCR programs, master mixes, recipe scaling and dilutions come out of code that reads typed fields from Sanity.

![Aliquot answering a PCR question: a GO verdict, the lab's pre-PCR rule applied, annealing at 53 °C and extension 68 °C for 1 min 12 s, both computed by a tool](https://raw.githubusercontent.com/neromtoobad/aliquot/main/docs/img/pcr-card.jpg)

## Demo

**Live:** https://aliquot-five.vercel.app (no login)

Try these. Each one shows a different reason the content has to be structured:

| Ask | What should happen |
| --- | --- |
| *PCR program for a 1.2 kb product with NEB Taq* (a suggestion chip) | The thermal program is computed from NEB's stored parameters: Tm − 5 → 53 °C, 1.2 kb × 60 s/kb → 1 min 12 s at 68 °C. The master mix for 12 reactions + 10% is computed too (template stays out of the mix). The lab's "pre-PCR and post-PCR stay apart" rule is applied. |
| *Heat shock: 30 s or 45 s?* | Both claims (NEB 30 s, Addgene 30–60 s) appear side by side, with the ruling "follow your cell vendor". |
| *Make 500 mL of LB* | Three recipes share the alias "LB". The lab rule says LB means Miller here, so it scales Miller and says so. |
| *Can I autoclave bleach-treated waste?* | **Stop.** WHO and the university EHS pages both say never. |
| *Can I stain my gel with ethidium bromide?* | **Stop.** The (example) lab SOP bans EtBr and says use SYBR Safe, even though Addgene's protocol offers EtBr. |

Or paste a protocol into **Check my protocol** and it flags every value that disagrees with the source for that product.

![The thermal program and master-mix tables. Template DNA is marked "add to each tube"; water fills to volume](https://raw.githubusercontent.com/neromtoobad/aliquot/main/docs/img/pcr-tables.jpg)

## Code

https://github.com/neromtoobad/aliquot

- `web/`: Next.js 16, AI SDK 7, `@ai-sdk/mcp`, Vercel AI Gateway. The calculators in `src/lib/calc.ts` are pure functions with tests (`npm test`).
- `studio/`: Sanity Studio v6. The schema is in `studio/schemaTypes`; the seed builder and the sourced data are in `studio/seed`.
- `eval/`: 12 bench questions, the runner, and a keyword-search baseline.

## How I Used Sanity

### 1. The content model: every number is a claim

The ledger doesn't store "the extension temperature for Taq". It stores what each source **says** about it:

```ts
claim {
  subject     -> polymerase | recipe | protocol | reagent
  parameter   "extension temperature"
  statement   "68°C"                       // verbatim from the source
  value, unit
  source      -> { title, url, kind, authority 1–5 }
  standing    current | context | disputed | superseded
  appliesWhen "using NEB Taq with Standard Taq Buffer"
  ruling      "Manufacturer's own protocol for this enzyme; DreamTaq's 72 °C applies to DreamTaq."
}
```

Around it:

- **`polymerase`** stores cycling parameters **as numbers**: initial denaturation, the annealing rule *and* its offset from Tm, the allowed annealing range, extension °C and seconds per kb, final extension, and the reaction setup in µL.
- **`recipe`** stores components as `quantity` objects (value + unit), with `aliases`. Three recipes share the alias "LB", and that's deliberate.
- **`protocol`** holds ordered steps with temperatures, times, parameters and cautions, plus `appliesTo` (a kit manual binds that kit, not every PCR).
- **`reagent`** holds GHS hazards, the signal word, incompatibilities and disposal.
- **`labRule`** is the house SOP. It outranks outside sources for that lab. (The demo uses a clearly labelled **example** SOP.)
- **`source`** carries an explicit `authority` (1 forum … 5 manufacturer manual / regulatory guidance), so precedence is data rather than guesswork.

The seed data is **46 real sources**: NEB, Thermo, Qiagen, Sigma, Hardy, Addgene, CSH, ASM, WHO, CDC and 9 university safety offices. Every value is quoted verbatim, with its URL. That gives **92 claims**, and about **30 parameters where reputable sources genuinely disagree**. The "Where sources disagree" rail on the home page is a live GROQ query over them.

### 2. A Knowledge Base for the prose

The **"Aliquot protocols"** Knowledge Base is built from:

- **a dataset source**: one document per subject (protocol, polymerase, recipe, reagent, lab rule), with its claims, sources and lab rules folded in by projection. The build sees every disagreement about a subject in one place, and it stays far under the 150-document beta budget (33 documents).
- **website sources**: Addgene's gel-electrophoresis and transformation protocols, and CDC's chemical-disinfectants guidance. One page each (max depth 1, page limit 1). NEB's pages crawled to zero documents (bot protection), so NEB's values come in through the dataset instead.

The build turned 36 documents into **13 cited entries**: gels and running buffers, autoclaving, transformation, buffers, bleach disinfection, NanoDrop, spin-column extraction, gel stains, Gram staining, LB media variants, PCR contamination control, and enzyme-specific PCR protocols.

![The Knowledge Base entries, with citations back to the sources](https://raw.githubusercontent.com/neromtoobad/aliquot/main/docs/img/kb-entries.jpg)

**The best moment of the build was a conflict it got wrong.** The Knowledge Base raised a **Critical** issue: Sigma's LB broth is autoclaved for **15 minutes**, while Virginia Tech's EHS table says the minimum cycle is **30 minutes**.

![The Critical conflict the build raised: LB broth 15 min vs biohazardous waste 30 min](https://raw.githubusercontent.com/neromtoobad/aliquot/main/docs/img/kb-issue.jpg)

Neither source is wrong. One is **sterilising a medium**; the other is **decontaminating biohazardous waste**. Sanity's docs say a conflict has no third answer, so I didn't resolve it. I **dismissed** it and wrote a standing **instruction**, anchored to both sources:

> *Sterilising media and decontaminating biohazardous waste are different autoclave jobs, not conflicting values. … Always name which job a time is for and never replace one with the other.*

When I saved it, Context checked the entries citing those sources, found one that had blurred the two, and rebuilt it. That decision now survives every future build. That's the part a keyword index can't do.

### 3. Two Context MCP endpoints

| Endpoint | Mode | Tools the agent uses |
| --- | --- | --- |
| `aliquot-kb` | Knowledge Base | `knowledge_base_read`, `knowledge_base_search` |
| `aliquot-ledger` | GROQ (with a `groqFilter` scoped to the Aliquot types) | `groq_query`, `schema_explorer`, `array_field_reader` |

Both endpoints' **initial context** (the KB outline and the compressed schema) is fetched over HTTP and inlined into the system prompt, alongside a small catalog of every subject's `_id`. A typical answer is then **one GROQ query + one Knowledge Base read + a calculator + the verdict**. The GROQ query pulls every claim about the subject *and* the lab rules that touch it:

```groq
*[_type == "claim" && subject._ref in $ids]{
  parameter, statement, value, unit, standing, appliesWhen, ruling,
  "source": source->{title, url, kind, authority}
}
```

### 4. Code does the arithmetic

Three calculator tools sit alongside the Context tools. Each one **fetches the document from Sanity itself**, so the model can't mistype a number on the way in:

- `pcr_program(polymerase, ampliconBp, primerTms, reactions)`: the annealing temperature is the lower Tm + the manufacturer's offset, clamped to its range. The extension time is kb × s/kb, never under 10 s. The master mix includes overage; template stays out and water fills to volume.
- `scale_recipe(recipe, targetVolume)`
- `dilute(stock, target, finalVolume)`, with unit conversion. It refuses impossible requests, like molar → % without a molecular weight.

### 5. The answer is structure

Every turn ends with the agent calling `verdict` with a typed object: go / caution / stop, the values to use, the thermal program, the amounts table, conflicts (with both sources and the ruling), safety notes, lab-rule overrides, and sources. The card in the UI **is** that object. A "How I checked" panel shows every Knowledge Base read and GROQ query the agent ran.

## Did structure actually matter?

I wrote 12 bench questions whose answers I can check against the sources ([`eval/RESULTS.md`](https://github.com/neromtoobad/aliquot/blob/main/eval/RESULTS.md)). Then I ran them through Aliquot and through a plain keyword search (BM25-style, top 3 passages) over **the same text**: every claim, source excerpt and protocol step.

| Kind | Aliquot | Keyword search |
| --- | --- | --- |
| Lookups (5) | 5/5 | 5/5 |
| Computed: PCR program, master mix, recipe scaling (3) | 3/3 | 0/3 (its one "pass" matched yeast extract's "5 g", not NaCl's) |
| Conflict: heat shock 30 s vs 45 s | ✅ both claims + ruling | ❌ only Addgene's line |
| Lab rule: EtBr in our lab | ✅ stop, use SYBR Safe | ❌ top hit: *"Optional: add ethidium bromide"* |
| Safety: autoclave bleach waste | ✅ stop | ✅ |
| Disambiguation: "make LB" | ✅ | ✅ |
| **Total** | **12/12** | **7/12** (8 by regex, minus the false positive) |

Honest notes: Aliquot's first full run was 11/12. The one failure was a connect timeout to Sanity's API from my laptop, not a wrong answer. I added a retry around the Context connection and it passed on the re-run. Keyword search is genuinely fine at single-value lookups, which is exactly where structure isn't needed. It fails on the questions that cost you an experiment: arithmetic, disagreements, and rules that are specific to *your* lab.

## What it doesn't do

- It's a study aid, not a safety officer. The footer says so, and so does the precedence order: your lab's SOP wins.
- The lab rules in the demo are an **example SOP**, labelled as such in the dataset. Replace them with your own.
- It doesn't calculate primer Tm from sequence; you give it the Tm, or use the manufacturer's calculator. For Q5 and Phusion it points you to their calculators, because that's what their manuals say.
- It runs on **GPT-5.2 through Vercel AI Gateway's free tier**, because the free tier doesn't serve Claude. One env var switches it. Answers take 15–60 s.
- The data covers molecular-biology and microbiology basics (5 polymerases, 9 recipes, 10 protocols). It's a real, sourced slice, not the whole field.

## Sanity Project Details

- **Project ID:** `4wvtii12`
- **Public dataset:** `production`. Try a query: [every claim with its source](https://4wvtii12.api.sanity.io/v2026-10-01/data/query/production?query=*%5B_type%3D%3D%22claim%22%5D%7Bparameter%2Cvalue%2Cunit%2Cstanding%2CappliesWhen%2C%22source%22%3Asource-%3Etitle%7D)
- **Studio:** https://aliquot.sanity.studio
- **Context:** Knowledge Base `kbpYrfrMZRvi`; MCP endpoints `aliquot-kb` and `aliquot-ledger` in organization `oszqultgn`
- **Schema:** [`studio/schemaTypes`](https://github.com/neromtoobad/aliquot/tree/main/studio/schemaTypes)

## Agent Session

<!-- AGENT SESSION EMBED GOES HERE -->

I built Aliquot with Claude Code in one sitting on the last day of the challenge. The session includes the part I'd normally cut. My first concept was a hackathon-rules agent, but a survey of the existing entries showed someone had already shipped one with the same name. So I pivoted to the domain I actually work in, and the research for the second idea is the dataset you can query above. It also shows the bugs: the AI Gateway free tier refusing Claude, a verdict schema that rejected OpenAI's `null`s, and a master-mix calculator that first treated template DNA as "fill to volume".
