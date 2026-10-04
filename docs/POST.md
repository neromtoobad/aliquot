---
title: "Aliquot: the kit says 68 °C, the textbook says 72. An agent that knows which one is your bench"
published: false
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path One: Ship an Agent That Queries Real Content](https://dev.to/challenges/sanity-2026-09-16)*

## What I Built

I'm an M.Tech Biology student. Most of my lab time isn't spent on the science. It goes on working out **which number to trust**.

The handout says extend at 72 °C. The NEB Taq page says 68 °C. Both are right, for different polymerases. "Make LB" means 10 g of NaCl per litre in one protocol, 5 g in another and 0.5 g in a third, and they all call it LB. One university biosafety office says a 1:10 bleach spill needs 30 minutes of contact, another says 20, a third says 15–20. A keyword search hands you whichever sentence it matched first. Getting it wrong costs you a week of PCR, a plate of dead cells, or a spill that wasn't actually decontaminated.

**Aliquot** is a bench-side protocol agent. You ask it what temperature, how long, how much, or whether something is safe. It answers from manufacturer manuals, published protocols and biosafety guidance, and it applies them in a fixed order:

1. **your lab's SOP** (it outranks everything for your lab),
2. **the manufacturer's manual for the exact product in your hand** (it binds that product only),
3. **regulatory guidance** (WHO, CDC) for safety,
4. **published protocols** (Addgene, CSH, ASM) and university SOPs,
5. textbooks and forums only as context.

When sources disagree, Aliquot shows every claim side by side with its source and authority. Then it gives the ruling: which value applies, under what condition, and why. It never computes a number itself. PCR programs, master mixes, recipe scaling and dilutions come out of code that reads typed fields from Sanity.

<!-- SCREENSHOT: the verdict card for the NEB Taq PCR question -->

## Demo

**Live:** https://aliquot-five.vercel.app (no login)

Try:
- *"Give me the PCR program and a master mix for 12 reactions: NEB Taq, 1,200 bp product, primer Tms 58 °C and 61 °C."*
- *"How do I make 500 mL of LB broth?"* (it should ask which LB, or apply the lab's default and say so)
- *"For heat-shock transformation, how long is the heat shock? I've seen 30 s and 45 s."*
- *"Can I autoclave liquid waste that I already treated with bleach?"*
- Paste a protocol into **Check my protocol** and it flags every value that disagrees with the source for that product.

<!-- VIDEO: 90-second walkthrough -->

## Code

https://github.com/neromtoobad/aliquot

## How I Used Sanity

### The content model: every number is a claim

The ledger doesn't store "the extension temperature for Taq". It stores what each source *says* about it:

```ts
claim {
  subject     -> polymerase | recipe | protocol | reagent
  parameter   "extension temperature"
  statement   "68°C"  (verbatim)
  value, unit
  source      -> { title, url, kind, authority 1–5 }
  standing    current | context | disputed | superseded
  appliesWhen "using NEB Taq with Standard Taq Buffer"
  ruling      "Manufacturer's own protocol for this enzyme; DreamTaq's 72 °C applies to DreamTaq."
}
```

Around it:
- `polymerase` stores **cycling parameters as numbers**: initial denaturation, the annealing rule *and* its offset from Tm, extension °C and seconds per kb, final extension, and the reaction setup in µL.
- `recipe` stores components as `quantity` objects (value + unit), with `aliases` (three recipes share the alias "LB").
- `protocol` holds ordered steps with temperatures, times and cautions, and an `appliesTo` field (a kit manual binds that kit).
- `reagent` holds GHS hazards, incompatibilities and disposal.
- `labRule` is the house SOP. It `overrides` outside claims.
- `source` carries an explicit `authority`, so precedence is data, not vibes.

The seed data has **46 real sources** (NEB, Thermo, Qiagen, Sigma, Hardy, Addgene, CSH, ASM, WHO, CDC and 9 university safety offices). Every value is quoted verbatim with its URL. There are **92 claims**, and about **30 parameters where reputable sources genuinely disagree**.

### Two Context MCP endpoints

| Endpoint | Mode | What it's for |
| --- | --- | --- |
| `aliquot-kb` | Knowledge Base | The prose: procedure wording, cautions, why a step exists. |
| `aliquot-ledger` | GROQ | The structure: find the subject, read every claim about it, apply lab rules, compare across products. |

**The Knowledge Base** ("Aliquot protocols") is built from:
- **a dataset source**: one document per subject with its claims and sources folded in by projection, so the build sees each disagreement in one place and stays far under the 150-document beta budget;
- **website sources**: NEB's Taq, Q5 and transformation protocols, Addgene's gel, transformation and LB-plate protocols, CDC's chemical disinfectants page and Stanford's autoclave guidance.

<!-- ISSUES: screenshot of a conflict the build raised + how I resolved it -->

Both endpoints' initial context (the KB outline and the compressed schema) is fetched over HTTP and inlined into the system prompt, so the agent never wastes a turn orienting itself.

### Code does the arithmetic

The agent gets three calculator tools alongside the Context tools. Each one **fetches the document from Sanity itself**, so the model can't mistype a number on the way in:

- `pcr_program(polymerase, ampliconBp, primerTms, reactions)`: reads the polymerase document and computes the annealing temperature (lower Tm + the manufacturer's offset, clamped to its range), the extension time (kb × s/kb) and a master mix with overage. Template stays out of the mix; water fills to volume.
- `scale_recipe(recipe, targetVolume)`
- `dilute(stock, target, finalVolume)` with unit conversion.

They're pure functions with tests (`npm test`).

### The answer is structure

The agent ends every turn by calling `verdict` with a typed object: go / caution / stop, the values to use, the thermal program, the amounts table, conflicts (with both sources and the ruling), safety notes, lab-rule overrides and sources. The card in the UI *is* that object. The "How I checked" panel shows every Knowledge Base read and every GROQ query the agent ran.

## Did structure actually matter?

<!-- EVAL: N questions with known answers, Aliquot vs keyword search over the same sources -->

## What it doesn't do

- It's a study aid, not a safety officer. The footer says so, and so does the precedence order: your lab's SOP wins.
- The lab rules in the demo are an **example SOP**, labelled as such. Replace them with your lab's.
- Primer Tm comes from you (or the manufacturer's calculator). Aliquot doesn't calculate Tm from sequence.
- The agent runs on GPT-5.2 through Vercel AI Gateway's free tier, because the free tier doesn't serve Claude. One env var switches it.

## Sanity Project Details

- **Project ID:** `4wvtii12`
- **Public dataset:** `production`. Try it: `https://4wvtii12.api.sanity.io/v2026-10-01/data/query/production?query=*[_type=="claim"]{parameter,value,unit,standing,appliesWhen,"source":source->title}`
- **Studio:** https://aliquot.sanity.studio
- Schema: [`studio/schemaTypes`](https://github.com/neromtoobad/aliquot/tree/main/studio/schemaTypes)

## Agent Session

<!-- Upload the Claude Code transcript at https://dev.to/agent_sessions/new, make it public, embed here -->

I built Aliquot with Claude Code in one sitting on the last day of the challenge. The session shows the part I'm least proud of and most want to show. My first concept was a hackathon-rules agent. Partway through, a survey of the existing entries showed someone had already shipped one with the same name, so I pivoted to the domain I actually work in.
