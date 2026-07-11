# -*- coding: utf-8 -*-
"""S.2 · assembla gli output dei batch di fusione (_build/fusion_output/<FAM>-<let>/
batch-*.json) in un unico store canonico data/latin/fused/<let>.json = {id: record}
(record = campi[]/gloss/applicazione/divergenze/prov). Valida lo schema minimo.
La fusione è output LLM NON riproducibile → fused/ va COMMITTATO.
Uso: python fusion_merge.py LAT-N a
Report: n. schede, con divergenze, campi/sensi totali, id mancanti dalla worklist.
"""
import os, sys, json, glob
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import common as C
sys.stdout.reconfigure(encoding="utf-8")

FAM = sys.argv[1] if len(sys.argv) > 1 else "LAT-N"
LET = sys.argv[2] if len(sys.argv) > 2 else "a"
DATA = C.DATA
INP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fusion_input", f"{FAM}-{LET}.json")
OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fusion_output", f"{FAM}-{LET}")
FUSED_DIR = os.path.join(DATA, "latin", "fused")


def valid(rec):
    if not rec.get("id") or not isinstance(rec.get("campi"), list) or not rec["campi"]:
        return False
    for c in rec["campi"]:
        for s in c.get("sensi", []):
            tr = s.get("tr", {})
            if not tr.get("it") or not tr.get("en"):
                return False
    return True


def main():
    expected = {r["id"] for r in json.load(open(INP, encoding="utf-8"))}
    fused, bad, seen = {}, [], set()
    for f in sorted(glob.glob(os.path.join(OUTDIR, "batch-*.json"))):
        try:
            recs = json.load(open(f, encoding="utf-8")).get("records", [])
        except Exception as e:
            bad.append(f"{os.path.basename(f)}: JSON illeggibile ({e})"); continue
        for r in recs:
            rid = r.get("id")
            if not valid(r):
                bad.append(f"{rid or os.path.basename(f)}: record non valido"); continue
            if rid in seen:
                continue
            seen.add(rid)
            fused[rid] = {
                "campi": r["campi"],
                "gloss": r.get("gloss", {"en": [], "it": []}),
                "applicazione": r.get("applicazione", []),
                "divergenze": r.get("divergenze", []),
                "prov": {"autorita": "L&S", "src": ["Lewis1890·PD", "open_words/Whitaker·MIT"], "lic": "CC BY-SA 4.0"},
            }
    os.makedirs(FUSED_DIR, exist_ok=True)
    json.dump(fused, open(os.path.join(FUSED_DIR, f"{LET}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)

    missing = sorted(expected - seen)
    ncampi = sum(len(v["campi"]) for v in fused.values())
    nsensi = sum(len(c.get("sensi", [])) for v in fused.values() for c in v["campi"])
    ndiv = sum(1 for v in fused.values() if v["divergenze"])
    multi = sum(1 for v in fused.values() if len(v["campi"]) > 1)
    print(f"S.2 merge · {FAM}-{LET}: schede fuse {len(fused)}/{len(expected)}")
    print(f"  campi semantici totali {ncampi} · sensi totali {nsensi} · schede multi-campo {multi} · con divergenze {ndiv}")
    print(f"  record non validi/scartati: {len(bad)}")
    for b in bad[:10]:
        print("    !", b)
    if missing:
        print(f"  ID MANCANTI (da rifondere): {len(missing)}  es. {missing[:8]}")
    print(f"  → data/latin/fused/{LET}.json")


if __name__ == "__main__":
    main()
