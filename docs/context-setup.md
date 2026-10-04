# Sanity Context setup

Everything below is configured in the Context app in the Sanity Dashboard.

## Knowledge Base: "Aliquot protocols" (`kbpYrfrMZRvi`)

**Purpose:** Bench-side protocol reference for students and researchers in molecular biology and microbiology teaching labs. Covers PCR polymerases and cycling, agarose gels and running buffers, DNA extraction and quantification, LB media variants, Gram staining, bacterial transformation, autoclaving and bleach disinfection, and says which source applies when sources disagree.

**Dataset source.** One document per subject, with its claims and sources folded in, so the build sees each disagreement in one place and the KB stays well under the 150-document beta budget:

```groq
*[_type in ["protocol", "polymerase", "recipe", "reagent", "labRule"]]{
  ...,
  "source": source->{title, url, kind, authority, version},
  "claims": *[_type == "claim" && subject._ref == ^._id]{
    parameter, statement, value, unit, standing, appliesWhen, ruling,
    "source": source->{title, url, kind, authority}
  }
}
```

**Website sources** (one page each: max depth 1, page limit 1):
- https://www.addgene.org/protocols/gel-electrophoresis/
- https://www.addgene.org/protocols/bacterial-transformation/
- https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/chemical-disinfectants.html

NEB's protocol pages crawled to 0 documents (bot protection), so they were removed. NEB's values are still in the KB through the dataset source, quoted from those pages.

**What the build produced.** 36 source documents became 13 entries: agarose gels and running buffers, autoclaving, transformation, common buffers, bleach disinfection, NanoDrop, spin-column extraction, gel stains, Gram staining, LB media variants, PCR contamination control and enzyme-specific PCR protocols. Each entry cites its sources.

**The issue it raised.** The build raised one *Critical* conflict: LB broth autoclaved 15 min (Sigma L3522) vs a 30-minute minimum cycle (Virginia Tech EHS). That isn't a contradiction. One is sterilising a medium, the other is decontaminating biohazardous waste. A conflict has no third answer, so I dismissed it. Then I wrote a standing instruction anchored to both sources: *"Sterilising media and decontaminating biohazardous waste are different autoclave jobs, not conflicting values … Always name which job a time is for and never replace one with the other."* Saving it rebuilt the one entry that had blurred the two.

## MCP endpoints

| name | sources | mode |
| --- | --- | --- |
| `aliquot-kb` | the Knowledge Base above | Knowledge Base |
| `aliquot-ledger` | dataset `PROJECT_ID.production` | GROQ |

**Instructions (both endpoints):**

> You serve a bench-side protocol assistant. Apply sources in this order: the lab's own SOP (labRule documents), then the manufacturer's manual for the exact product in use, then regulatory guidance (WHO, CDC) for safety, then published protocols (Addgene, CSH, ASM) and university SOPs, then textbooks. A kit manual binds only that kit. When sources disagree, report every claim with its source and the stated condition (appliesWhen) and ruling. Never merge two values into one. Never state a number the content does not contain; computed values come from the application's calculator tools.
