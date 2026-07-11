# -*- coding: utf-8 -*-
"""S.2 · prepara l'input di fusione per un segmento+lettera: per ogni lemma
assembla {id, lemma, pos, testa, lewis, whitaker} dalle fonti normalizzate,
così gli agenti di fusione lavorano su dati reali (non riscaricano nulla).
Uso: python fusion_prep.py LAT-N a
Output: _build/fusion_input/<SEG_FAMILY>-<lettera>.json + conteggi.
"""
import os, sys, json, glob
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import common as C
sys.stdout.reconfigure(encoding="utf-8")

FAMILY = sys.argv[1] if len(sys.argv) > 1 else "LAT-N"     # es. LAT-N
LETTER = sys.argv[2] if len(sys.argv) > 2 else "a"
DATA = C.DATA
WL = os.path.join(DATA, "latin", "_worklist")
NORM = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources", "normalized")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fusion_input")


def index_norm(fonte, merge=False):
    """id → senses (o senses unite se merge, per fonti con più record per id)."""
    out = {}
    path = os.path.join(NORM, f"{fonte}.jsonl")
    if not os.path.exists(path):
        return out
    for line in open(path, encoding="utf-8"):
        r = json.loads(line)
        rid = r.get("id")
        if not rid:
            continue
        if merge:
            out.setdefault(rid, [])
            for s in r.get("senses", []):
                if s not in out[rid]:
                    out[rid].append(s)
        else:
            out.setdefault(rid, r.get("senses", []))
    return out


def load_testa():
    testa = {}
    for f in glob.glob(os.path.join(DATA, "latin", "paradigms", "*.json")):
        if os.path.basename(f).startswith("_"):
            continue
        for k, p in json.load(open(f, encoding="utf-8")).get("paradigms", {}).items():
            testa.setdefault(k, p.get("testa"))
    return testa


def main():
    lewis = index_norm("lewis")
    whit = index_norm("whitaker", merge=True)
    testa = load_testa()
    idmap = C.load_id_map("lat")
    rev = {v: k for k, v in idmap.items()}   # id → chiave sorgente (per la testa)

    segs = [f"{FAMILY}-{s}" for s in ("1", "2", "3", "4", "5", "X")]
    seen, input_recs = set(), []
    for seg in segs:
        path = os.path.join(WL, f"{seg}.json")
        if not os.path.exists(path):
            continue
        for r in json.load(open(path, encoding="utf-8")).get("lemmi", []):
            if not C.norm_lat(r["lemma"]).startswith(LETTER):
                continue
            rid = r["id"]
            if rid in seen:
                continue
            seen.add(rid)
            key = rev.get(rid)
            input_recs.append({
                "id": rid, "lemma": r["lemma"], "pos": "sostantivo",
                "declinazione": seg, "marcatore": r.get("marcatore"),
                "genere": r.get("genere"),
                "testa": testa.get(key),
                "lewis": (lewis.get(rid) or [""])[0],
                "whitaker": whit.get(rid, []),
            })
    input_recs.sort(key=lambda x: (C.norm_lat(x["lemma"]), x["id"]))
    os.makedirs(OUT, exist_ok=True)
    outpath = os.path.join(OUT, f"{FAMILY}-{LETTER}.json")
    json.dump(input_recs, open(outpath, "w", encoding="utf-8"), ensure_ascii=False)

    n = len(input_recs)
    with_whit = sum(1 for r in input_recs if r["whitaker"])
    with_lewis = sum(1 for r in input_recs if r["lewis"])
    print(f"S.2 prep · {FAMILY} lettera '{LETTER}': {n} nomi → {outpath}")
    print(f"  con def L&S: {with_lewis} ({100*with_lewis//max(n,1)}%) · con sensi Whitaker: {with_whit} ({100*with_whit//max(n,1)}%)")
    print(f"  esempio: {json.dumps(input_recs[0], ensure_ascii=False)[:240] if input_recs else '—'}")
    print(f"  batch consigliati (10/agente): {(n + 9)//10} agenti")


if __name__ == "__main__":
    main()
