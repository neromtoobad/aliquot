# Sanity Context setup

Everything below is configured in the Context app in the Sanity Dashboard.

## Knowledge Base: "Aliquot protocols"

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

**Website sources** (the most specific URLs, all public):
- https://www.neb.com/en/protocols/taq-dna-polymerase-with-standard-taq-buffer-m0273
- https://www.neb.com/en/protocols/pcr-using-q5-high-fidelity-dna-polymerase-m0491
- https://www.neb.com/en/protocols/high-efficiency-transformation-protocol-c2987
- https://www.addgene.org/protocols/gel-electrophoresis/
- https://www.addgene.org/protocols/bacterial-transformation/
- https://www.addgene.org/protocols/pouring-lb-agar-plates/
- https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/chemical-disinfectants.html
- https://ehs.stanford.edu/manual/biosafety-manual/autoclaves

## MCP endpoints

| name | sources | mode |
| --- | --- | --- |
| `aliquot-kb` | the Knowledge Base above | Knowledge Base |
| `aliquot-ledger` | dataset `PROJECT_ID.production` | GROQ |

**Instructions (both endpoints):**

> You serve a bench-side protocol assistant. Apply sources in this order: the lab's own SOP (labRule documents), then the manufacturer's manual for the exact product in use, then regulatory guidance (WHO, CDC) for safety, then published protocols (Addgene, CSH, ASM) and university SOPs, then textbooks. A kit manual binds only that kit. When sources disagree, report every claim with its source and the stated condition (appliesWhen) and ruling. Never merge two values into one. Never state a number the content does not contain; computed values come from the application's calculator tools.
