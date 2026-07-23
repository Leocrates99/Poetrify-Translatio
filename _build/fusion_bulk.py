# -*- coding: utf-8 -*-
"""S.2 in blocco · fusione filologica dei sostantivi latini lettere b→z.

Come per la lettera «a» ma su tutto il resto del segmento LAT-N e con un
MIGLIORAMENTO: l'autorità non è più Lewis *Elementary* (troncato) ma il L&S
INTEGRALE ingerito in S.3/⑥ (campo "ls"), collazionato con Whitaker.

Due modalità:
  prep   → assembla i record, li ordina, li spezza in lotti da 10 in
           fusion_input/LAT-N-b2z/batch-NNNN.json (piatti, tutte le lettere).
  merge  → raccoglie fusion_output/LAT-N-b2z/batch-*.json, valida, e distribuisce
           per lettera in data/latin/fused/<lettera>.json (la «a» non si tocca).

Uso: python fusion_bulk.py prep [batch=10]
     python fusion_bulk.py merge
"""
import os, sys, re, json, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import common as C
sys.stdout.reconfigure(encoding="utf-8")

MODE = sys.argv[1] if len(sys.argv) > 1 else "prep"
BATCH = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 10
DATA = C.DATA
BUILD = os.path.dirname(os.path.abspath(__file__))
WL = os.path.join(DATA, "latin", "_worklist")
NORM = os.path.join(BUILD, "sources", "normalized")
IN = os.path.join(BUILD, "fusion_input", "LAT-N-b2z")
OUT = os.path.join(BUILD, "fusion_output", "LAT-N-b2z")
FUSED = os.path.join(DATA, "latin", "fused")
LS_CAP = 4500
SEGS = ("1", "2", "3", "4", "5", "X")


def cap_sentence(txt, cap=LS_CAP):
    """taglia a un confine di frase entro `cap` (mai a metà parola)."""
    if not txt or len(txt) <= cap:
        return txt
    cut = txt[:cap]
    m = max(cut.rfind(". "), cut.rfind("; "), cut.rfind(".—"))
    return (cut[:m + 1] if m > cap * 0.5 else cut.rsplit(" ", 1)[0]) + " […]"


def load_norm(fonte, field="senses", merge=False):
    out = {}
    p = os.path.join(NORM, f"{fonte}.jsonl")
    if not os.path.exists(p):
        return out
    for line in open(p, encoding="utf-8"):
        r = json.loads(line)
        rid = r.get("id")
        if not rid:
            continue
        val = r.get(field)
        if merge:
            out.setdefault(rid, [])
            for s in (val or []):
                if s not in out[rid]:
                    out[rid].append(s)
        else:
            out.setdefault(rid, val)
    return out


def load_testa():
    testa = {}
    for f in glob.glob(os.path.join(DATA, "latin", "paradigms", "*.json")):
        if not os.path.basename(f).startswith("_"):
            for k, p in json.load(open(f, encoding="utf-8")).get("paradigms", {}).items():
                testa.setdefault(k, p.get("testa"))
    return testa


def seg_records():
    """tutti i nomi b→z, con lettera d'appartenenza, ordinati."""
    idmap = C.load_id_map("lat")
    rev = {v: k for k, v in idmap.items()}
    recs, seen = [], set()
    for s in SEGS:
        p = os.path.join(WL, f"LAT-N-{s}.json")
        if not os.path.exists(p):
            continue
        for r in json.load(open(p, encoding="utf-8")).get("lemmi", []):
            let = C.norm_lat(r["lemma"])[:1]
            if let == "a" or not let.isalpha():
                continue
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            recs.append((let, s, r, rev.get(r["id"])))
    recs.sort(key=lambda x: (C.norm_lat(x[2]["lemma"]), x[2]["id"]))
    return recs


def prep():
    ls_full = load_norm("lewis_short", "definition_full")
    lewis_elem = load_norm("lewis", "senses")
    whit = load_norm("whitaker", "senses", merge=True)
    testa = load_testa()
    recs = seg_records()

    items = []
    for let, seg, r, key in recs:
        rid = r["id"]
        ls = ls_full.get(rid)
        items.append({
            "id": rid, "lemma": r["lemma"], "pos": "sostantivo",
            "declinazione": f"LAT-N-{seg}", "genere": r.get("genere"),
            "testa": testa.get(key),
            "ls": cap_sentence(ls) if ls else "",
            "lewis_elem": "" if ls else (lewis_elem.get(rid) or [""])[0],
            "whitaker": whit.get(rid, []),
        })

    os.makedirs(IN, exist_ok=True)
    for f in glob.glob(os.path.join(IN, "batch-*.json")):
        os.remove(f)
    n = len(items)
    nb = 0
    for i in range(0, n, BATCH):
        json.dump(items[i:i + BATCH], open(os.path.join(IN, f"batch-{i//BATCH:04d}.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        nb += 1
    with_ls = sum(1 for x in items if x["ls"])
    with_w = sum(1 for x in items if x["whitaker"])
    perlet = collections.Counter(C.norm_lat(x["lemma"])[:1] for x in items)
    print(f"S.2 bulk prep · nomi b→z: {n} → {nb} lotti da {BATCH}")
    print(f"  con L&S integrale: {with_ls} ({100*with_ls//max(n,1)}%) · con Whitaker: {with_w} ({100*with_w//max(n,1)}%)")
    print(f"  per lettera: {dict(sorted(perlet.items()))}")
    print(f"  → {IN}")
    json.dump({"batches": nb, "items": n}, open(os.path.join(IN, "_manifest.json"), "w", encoding="utf-8"))


def valid(rec):
    if not rec.get("id") or not isinstance(rec.get("campi"), list) or not rec["campi"]:
        return False
    for c in rec["campi"]:
        if not c.get("sensi"):
            return False
        for s in c["sensi"]:
            tr = s.get("tr", {})
            if not tr.get("it") or not tr.get("en"):
                return False
    return True


def merge():
    idmap = C.load_id_map("lat")
    letter_of = {}
    for _l, _s, r, _k in seg_records():
        letter_of[r["id"]] = C.norm_lat(r["lemma"])[:1]
    expected = set(letter_of)

    fused_by_letter = collections.defaultdict(dict)
    seen, bad = set(), []
    for f in sorted(glob.glob(os.path.join(OUT, "batch-*.json"))):
        try:
            recs = json.load(open(f, encoding="utf-8")).get("records", [])
        except Exception as e:
            bad.append(f"{os.path.basename(f)}: JSON illeggibile ({e})"); continue
        for r in recs:
            rid = r.get("id")
            if rid in seen:
                continue
            if not valid(r):
                bad.append(f"{rid or os.path.basename(f)}: record non valido"); continue
            let = letter_of.get(rid)
            if not let:
                bad.append(f"{rid}: fuori segmento b→z"); continue
            seen.add(rid)
            fused_by_letter[let][rid] = {
                "campi": r["campi"], "gloss": r.get("gloss", {"en": [], "it": []}),
                "applicazione": r.get("applicazione", []), "divergenze": r.get("divergenze", []),
                "prov": {"autorita": "L&S integrale", "src": ["Lewis&Short1879·PD/Perseus·CC BY-SA 4.0", "open_words/Whitaker·MIT"], "lic": "CC BY-SA 4.0"},
            }

    os.makedirs(FUSED, exist_ok=True)
    ncampi = nsensi = ndiv = multi = 0
    for let, d in fused_by_letter.items():
        json.dump(d, open(os.path.join(FUSED, f"{let}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
        for v in d.values():
            ncampi += len(v["campi"]); nsensi += sum(len(c["sensi"]) for c in v["campi"])
            ndiv += 1 if v["divergenze"] else 0; multi += 1 if len(v["campi"]) > 1 else 0
    tot = sum(len(d) for d in fused_by_letter.values())
    missing = sorted(expected - seen)
    print(f"S.2 bulk merge · schede fuse {tot}/{len(expected)} in {len(fused_by_letter)} lettere")
    print(f"  campi {ncampi} · sensi {nsensi} · multi-campo {multi} · con divergenze {ndiv} · scartati {len(bad)}")
    for b in bad[:8]:
        print("    !", b)
    if missing:
        print(f"  MANCANTI (da rifondere): {len(missing)}  es. {missing[:8]}")
    print(f"  per lettera: {dict(sorted((l, len(d)) for l, d in fused_by_letter.items()))}")


if __name__ == "__main__":
    (prep if MODE == "prep" else merge)()
