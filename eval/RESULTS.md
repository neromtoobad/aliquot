# Eval: 12 bench questions with checkable answers

Run on 2026-10-04 against the local app (GPT-5.2 via AI Gateway, both Context MCP endpoints live). Graded by `eval/run.mjs`: each answer card must contain the expected values (regex), and safety questions must come back as `stop` or `caution`.

| Question | Kind | Aliquot | Keyword top-3 |
| --- | --- | --- | --- |
| NEB Taq extension temperature | lookup | ✅ 68 °C | ✅ |
| DreamTaq extension temperature | lookup | ✅ 72 °C | ✅ |
| PCR program, 1.2 kb, Tm 58/61 | computed | ✅ 53 °C anneal, 1 min 12 s extension | ❌ can't compute |
| 10X buffer for 12 rxns + 10 % | computed | ✅ 66 µL | ❌ can't compute |
| NaCl for 500 mL LB Miller | computed | ✅ 5 g | ⚠️ "pass" is a false positive: the "5 g" it matched is yeast extract |
| "How do I make LB?" | disambiguation | ✅ names Miller (lab default), Lennox, Luria | ✅ (matched "Luria-Bertani") |
| NEB 5-alpha heat shock | lookup | ✅ 30 s | ✅ |
| Heat shock: 30 s or 45 s? | conflict | ✅ both claims + ruling by cell vendor | ❌ shows only Addgene's 45 s |
| Autoclave bleach-treated waste? | safety | ✅ stop | ✅ (top passage says never) |
| EtBr in our lab? | lab rule | ✅ stop, use SYBR Safe | ❌ top hit: "Optional: add ethidium bromide" |
| Q5 extension rate, gDNA | lookup | ✅ 20–30 s/kb at 72 °C | ✅ |
| Pure DNA A260/A280 | lookup | ✅ ~1.8 | ✅ |

**Aliquot: 12/12.** The first run scored 11/12: the Q5 question failed on a connect timeout to api.sanity.io. After a retry was added around the Context connection, the re-run passed. Answers took 18–61 s locally (mean ≈ 37 s); on Vercel, a safety question took 15 s.

**Keyword search over the same text: 8/12 by the same regex, really 7** (one false positive). It wins exactly where structure isn't needed (single-value lookups). It fails the computed, conflicting and lab-specific questions, which are the ones that cost you an experiment.
