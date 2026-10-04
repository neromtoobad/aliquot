"""Build the Aliquot ledger as NDJSON for `sanity dataset import`.

Inputs in seed/data/:
  proto_*.json    — sources, polymerases, recipes, protocols, reagents and claims,
                    each value quoted from a real manufacturer / protocol / guidance page
  lab_rules.json  — an example lab SOP (clearly labelled) that outranks outside sources

Document ids use hyphens, never dots: ids with dots are private in a public dataset.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
DATA = HERE / "data"
OUT = HERE / "ledger.ndjson"
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def slugify(s: str) -> str:
    s = s.lower().replace("µ", "u").replace("°", "").replace("&", "and")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:90]


def ref(_id: str) -> dict:
    return {"_type": "reference", "_ref": _id}


def slug(v: str) -> dict:
    return {"_type": "slug", "current": v}


def clean(d: dict) -> dict:
    return {k: v for k, v in d.items() if v not in (None, "", [], {})}


docs: dict[str, dict] = {}
by_key: dict[str, str] = {}  # data key -> document id (for subjects and sources)


def put(doc: dict):
    docs[doc["_id"]] = clean(doc)


def keyed(items: list, prefix: str) -> list:
    return [{**clean(x), "_key": f"{prefix}{i:02d}"} for i, x in enumerate(items)]


TECHNIQUES = {
    "pcr": ("PCR", "Polymerase chain reaction: amplify a DNA region with a thermostable polymerase."),
    "gel": ("Agarose gel electrophoresis", "Separate DNA fragments by size in an agarose matrix."),
    "dna-extraction": ("DNA extraction", "Purify genomic DNA from cells or tissue."),
    "quantification": ("Nucleic acid quantification", "Measure concentration and purity by UV absorbance."),
    "gram-stain": ("Gram stain", "Differential stain separating Gram-positive from Gram-negative bacteria."),
    "autoclave": ("Autoclaving", "Steam sterilisation of media, glassware and waste."),
    "disinfection": ("Disinfection", "Chemical inactivation of biological material on surfaces and in spills."),
    "transformation": ("Bacterial transformation", "Introduce plasmid DNA into competent E. coli."),
    "media": ("Media preparation", "Prepare growth media and buffers."),
}
for k, (name, summary) in TECHNIQUES.items():
    put({"_id": f"technique-{k}", "_type": "technique", "name": name, "slug": slug(k), "summary": summary})
    by_key[f"technique:{k}"] = f"technique-{k}"

files = sorted(DATA.glob("proto_*.json"))
blobs = [json.loads(f.read_text()) for f in files]

# sources first, so everything else can reference them
for b in blobs:
    for s in b.get("sources", []):
        sid = f"source-{slugify(s['key'])}"
        by_key[s["key"]] = sid
        put({
            "_id": sid, "_type": "source", "title": s.get("title") or s["key"], "url": s.get("url"),
            "kind": s.get("kind", "publishedProtocol"), "authority": int(s.get("authority", 3)),
            "publisher": s.get("publisher"), "version": s.get("version"), "retrievedAt": s.get("retrievedAt") or NOW,
            "excerpt": s.get("excerpt"),
        })


def src(key: str | None, where: str):
    if key and key in by_key:
        return ref(by_key[key])
    print(f"! {where}: unknown sourceKey {key!r}", file=sys.stderr)
    return None


def thermal(t):
    if not isinstance(t, dict):
        return None
    return clean({"_type": "thermalStep", "tempC": t.get("tempC"), "seconds": t.get("seconds"), "secondsMax": t.get("secondsMax")})


for b in blobs:
    for p in b.get("polymerases", []):
        pid = f"polymerase-{slugify(p['key'])}"
        by_key[p["key"]] = pid
        a, e, rx, cy = p.get("annealing") or {}, p.get("extension") or {}, p.get("reaction") or {}, p.get("cycles") or {}
        put({
            "_id": pid, "_type": "polymerase", "name": p["name"], "slug": slug(slugify(p["key"])),
            "manufacturer": p.get("manufacturer"), "catalog": p.get("catalog"),
            "initialDenaturation": thermal(p.get("initialDenaturation")), "denaturation": thermal(p.get("denaturation")),
            "annealing": clean({"rule": a.get("rule"), "offsetC": a.get("offsetC"), "tempCMin": a.get("tempCMin"), "tempCMax": a.get("tempCMax"),
                                "seconds": a.get("seconds"), "secondsMax": a.get("secondsMax")}),
            "extension": clean({"tempC": e.get("tempC"), "secondsPerKb": e.get("secondsPerKb"), "secondsPerKbMax": e.get("secondsPerKbMax")}),
            "finalExtension": thermal(p.get("finalExtension")),
            "cycles": clean({"min": cy.get("min"), "max": cy.get("max")}),
            "reaction": clean({"volumeUl": rx.get("volumeUl"), "components": keyed([
                {"_type": "reactionComponent", "name": c.get("name"), "volumeUl": c.get("volumeUl") if isinstance(c.get("volumeUl"), (int, float)) else None,
                 "finalConc": c.get("finalConc"), "toVolume": True if (c.get("toVolume") or (isinstance(c.get("volumeUl"), str) and "to" in c["volumeUl"].lower())) else None}
                for c in rx.get("components", [])], "c")}),
            "notes": p.get("notes"), "source": src(p.get("sourceKey"), f"polymerase {p['key']}"),
        })

    for r in b.get("recipes", []):
        rid = f"recipe-{slugify(r['key'])}"
        by_key[r["key"]] = rid
        y = r.get("yield") or {"value": 1, "unit": "L"}
        comps = []
        for c in r.get("components", []):
            if not isinstance(c.get("amount"), (int, float)):
                print(f"! recipe {r['key']}: non-numeric amount for {c.get('name')}: {c.get('amount')!r}", file=sys.stderr)
                continue
            comps.append({"_type": "component", "name": c["name"], "amount": {"_type": "quantity", "value": c["amount"], "unit": c.get("unit", "g")}})
        put({
            "_id": rid, "_type": "recipe", "name": r["name"], "slug": slug(slugify(r["key"])), "aliases": r.get("aliases"),
            "yield": {"_type": "quantity", "value": y["value"], "unit": y["unit"]}, "components": keyed(comps, "c"),
            "steps": r.get("steps"), "sterilization": r.get("sterilization"), "notes": r.get("notes"),
            "source": src(r.get("sourceKey"), f"recipe {r['key']}"),
        })

    for g in b.get("reagents", []):
        gid = f"reagent-{slugify(g['key'])}"
        by_key[g["key"]] = gid
        put({
            "_id": gid, "_type": "reagent", "name": g["name"], "slug": slug(slugify(g["key"])), "aliases": g.get("aliases"),
            "cas": g.get("cas"), "signalWord": g.get("signalWord"), "hazards": g.get("hazards"), "storage": g.get("storage"),
            "incompatibilities": g.get("incompatibilities"), "disposal": g.get("disposal"),
            "source": src(g.get("sourceKey"), f"reagent {g['key']}") if g.get("sourceKey") else None,
        })

    for p in b.get("protocols", []):
        pid = f"protocol-{slugify(p['key'])}"
        by_key[p["key"]] = pid
        tech = p.get("technique")
        steps = []
        for i, s in enumerate(p.get("steps", [])):
            steps.append(clean({
                "_type": "step", "order": s.get("order", i + 1), "action": s.get("action"),
                "tempC": s.get("tempC") if isinstance(s.get("tempC"), (int, float)) else None,
                "seconds": s.get("seconds") if isinstance(s.get("seconds"), (int, float)) else None,
                "parameters": keyed([{"_type": "parameter", "name": x.get("name"), "value": str(x.get("value")) if x.get("value") is not None else None,
                                      "unit": x.get("unit")} for x in (s.get("parameters") or [])], "p"),
                "caution": s.get("caution"),
            }))
        put({
            "_id": pid, "_type": "protocol", "title": p["title"], "slug": slug(slugify(p["key"])),
            "technique": ref(f"technique-{tech}") if tech in TECHNIQUES else None, "appliesTo": p.get("appliesTo"),
            "steps": keyed(steps, "s"), "source": src(p.get("sourceKey"), f"protocol {p['key']}"),
        })

# claims last: they point at subjects by key
n = 0
for f, b in zip(files, blobs):
    for i, c in enumerate(b.get("claims", [])):
        subj = by_key.get(c.get("subjectKey"))
        if not subj or subj.startswith("source-"):
            print(f"! {f.name} claim {i}: unknown subjectKey {c.get('subjectKey')!r}", file=sys.stderr)
            continue
        s = src(c.get("sourceKey"), f"{f.name} claim {i}")
        if not s:
            continue
        n += 1
        put({
            "_id": f"claim-{f.stem.replace('_', '-')}-{i:02d}", "_type": "claim", "subject": ref(subj),
            "parameter": c.get("parameter"), "statement": c.get("statement"),
            "value": None if c.get("value") is None else str(c["value"]), "unit": c.get("unit"),
            "source": s, "standing": c.get("standing") if c.get("standing") in ("current", "context", "disputed", "superseded") else "current",
            "appliesWhen": c.get("appliesWhen"), "ruling": c.get("ruling"),
        })

rules = json.loads((DATA / "lab_rules.json").read_text()) if (DATA / "lab_rules.json").exists() else []
for i, r in enumerate(rules):
    applies = [ref(by_key[k]) for k in r.get("appliesTo", []) if k in by_key]
    put({
        "_id": f"labrule-{slugify(r['title'])}", "_type": "labRule", "lab": r["lab"], "title": r["title"], "rule": r["rule"],
        "severity": r.get("severity", "must"),
        "appliesTo": [{**a, "_key": f"a{j:02d}"} for j, a in enumerate(applies)],
    })

with OUT.open("w") as fh:
    for d in docs.values():
        fh.write(json.dumps(d, ensure_ascii=False) + "\n")

counts: dict[str, int] = {}
for d in docs.values():
    counts[d["_type"]] = counts.get(d["_type"], 0) + 1
print(f"wrote {OUT.name} — {counts}")
