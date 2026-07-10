# -*- coding: utf-8 -*-
"""P1.1 — Assembla il RECORD UNIFICATO per ogni id (schema BUILD_SPEC.md §2)
a partire dagli alberi esistenti: core (dict+forms), archive/, paradigms/,
glosses_it/ + gli id/uid di P0.0. NON tocca i dati sorgente; scrive solo
data/<lang>/unified/<lettera>.json = { id: record }.

Scaffold: i campi che nascono da fasi successive restano predisposti a null/[]:
  - campi[] / applicazione[]  -> fusione filologica (F2)
  - quantita / reggenza / temi -> morfologia (F3)
  - gloss.en                   -> fusione (F2); gloss.it dall'auto-glossa esistente
  - freq.rank                  -> ordinamento (wiring frequency.js, dopo)
  - uri                        -> LiLa/LSJ (P1.2)
senses_raw copia le definizioni VERBATIM (build_unified NON tronca mai). La
troncatura «…» eventuale è del sorgente: viene SEGNALATA (prov.def_troncata)
perche' P1.2 (re-ingest Lewis/LSJ integrali) la ripari.
"""
import os, sys, glob, json, re, unicodedata
from collections import defaultdict
sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
LANGS = {"latin": "lat", "greek": "grc"}
AUTHORITY = {"lat": "Lewis", "grc": "LSJ"}
_DIGIT = re.compile(r"^(.*?)(\d+)$")
_GK_ART = {"ὁ": "m", "ἡ": "f", "τό": "n", "οἱ": "m", "αἱ": "f", "τά": "n"}


def base_lemma(key, lc):
    if lc == "lat":
        m = _DIGIT.match(key)
        if m and m.group(1):
            return m.group(1)
    return key


def parse_genere(testa, lc):
    if not testa:
        return None
    toks = [t.strip(" .,;:·") for t in re.split(r"[\s,]+", testa) if t.strip(" .,;:·")]
    if not toks:
        return None
    last = toks[-1]
    if lc == "lat":
        return last if last in ("m", "f", "n") else None
    return _GK_ART.get(last)


def split_gloss(it):
    if not it:
        return []
    parts = re.split(r"\s*[·;,]\s*", it)
    return [p.strip() for p in parts if p.strip()]


def load_json(path):
    return json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}


def build_record(key, entry, lc, letter, paradigms, glosses, id_map, ledger, origin):
    rid = id_map.get(key)
    if not rid:
        return None, None
    uid = ledger.get(rid)
    pdata = paradigms.get(key)
    morph, paradigma = None, None
    if pdata:
        morph = {
            "genere": parse_genere(pdata.get("testa", ""), lc),
            "flessione": pdata.get("cat"),
            "classe": pdata.get("classe"),
            "testa": pdata.get("testa"),
        }
        paradigma = f"{letter}#{rid}"
    gdata = glosses.get(key)
    gloss_it = split_gloss(gdata.get("it")) if gdata else []
    definition = (entry.get("definition") or "").strip()
    troncata = "…" in definition or definition.endswith("...")
    senses_raw = {AUTHORITY[lc]: definition} if definition else {}
    src = [s for s in [f"{AUTHORITY[lc]}·{origin}", entry.get("src")] if s]
    rec = {
        "id": rid, "uid": uid, "uri": None,
        "lemma": base_lemma(key, lc), "lang": lc, "pos": entry.get("pos", ""),
        "morph": morph,
        "temi": None, "quantita": None, "reggenza": None,     # F3
        "paradigma": paradigma,
        "freq": {"rank": None},                                # wiring dopo
        "gloss": {"en": [], "it": gloss_it},                   # gloss.en <- fusione F2
        "campi": [], "applicazione": [],                       # F2
        "senses_raw": senses_raw,
        "prov": {"autorita": AUTHORITY[lc], "src": src, "lic": "CC BY-SA 4.0",
                 "def_troncata": troncata},
    }
    return rid, rec


def main():
    stats = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))  # lc -> pos -> field -> count
    for lang, lc in LANGS.items():
        id_map = load_json(os.path.join(DATA, f"_id_map.{lc}.json"))
        ledger = load_json(os.path.join(DATA, "_uid_ledger.json"))
        outdir = os.path.join(DATA, lang, "unified")
        os.makedirs(outdir, exist_ok=True)
        core_letters = [os.path.splitext(os.path.basename(f))[0] for f in glob.glob(os.path.join(DATA, lang, "*.json")) if not os.path.basename(f).startswith("_")]
        arch_letters = [os.path.splitext(os.path.basename(f))[0] for f in glob.glob(os.path.join(DATA, lang, "archive", "*.json")) if not os.path.basename(f).startswith("_")]
        letters = sorted(set(core_letters) | set(arch_letters))
        total = 0
        for letter in letters:
            coredict = load_json(os.path.join(DATA, lang, f"{letter}.json")).get("dict", {})
            archdict = load_json(os.path.join(DATA, lang, "archive", f"{letter}.json")).get("dict", {})
            paradigms = load_json(os.path.join(DATA, lang, "paradigms", f"{letter}.json")).get("paradigms", {})
            glosses = load_json(os.path.join(DATA, lang, "glosses_it", f"{letter}.json")).get("glosses", {})
            unified, seen = {}, set()
            for source, origin in ((coredict, "core"), (archdict, "archive")):
                for key, entry in source.items():
                    if key in seen:
                        continue
                    seen.add(key)
                    rid, rec = build_record(key, entry, lc, letter, paradigms, glosses, id_map, ledger, origin)
                    if not rec:
                        continue
                    unified[rid] = rec
                    total += 1
                    p = rec["pos"] or "(vuota)"
                    s = stats[lc][p]
                    s["count"] += 1
                    if rec["morph"]: s["morph"] += 1
                    if rec["paradigma"]: s["paradigma"] += 1
                    if rec["gloss"]["it"]: s["gloss_it"] += 1
                    if rec["senses_raw"]: s["definizione"] += 1
                    if rec["prov"]["def_troncata"]: s["def_troncata"] += 1
                    if rec["morph"] and rec["morph"].get("genere"): s["genere"] += 1
            json.dump(unified, open(os.path.join(outdir, f"{letter}.json"), "w", encoding="utf-8"), ensure_ascii=False)
        print(f"[{lc}] record unificati scritti: {total}  in {os.path.join('data', lang, 'unified')}/")

    # --- test: i 4 record richiesti ---
    tests = [("latin", "lat", "a", "lat:amor"), ("latin", "lat", "v", "lat:virtus"),
             ("greek", "grc", "λ", "grc:λόγος"), ("greek", "grc", "λ", "grc:λύω")]
    print("\n=== 4 RECORD DI TEST ===")
    for lang, lc, letter, rid in tests:
        u = load_json(os.path.join(DATA, lang, "unified", f"{letter}.json"))
        rec = u.get(rid)
        print(f"\n--- {rid} ---")
        print(json.dumps(rec, ensure_ascii=False, indent=2) if rec else "  NON TROVATO")

    # --- report copertura per PoS ---
    print("\n=== COPERTURA CAMPI PER PoS (popolati / totali) ===")
    fields = ["morph", "paradigma", "genere", "gloss_it", "definizione", "def_troncata"]
    for lc in ("lat", "grc"):
        print(f"\n[{lc}]  (campi sempre vuoti in P1.1: campi/applicazione→F2 · temi/quantita/reggenza→F3 · gloss.en→F2 · freq.rank/uri→dopo)")
        head = f"  {'PoS':<14}{'tot':>7}" + "".join(f"{f:>13}" for f in fields)
        print(head)
        for pos in sorted(stats[lc], key=lambda p: -stats[lc][p]["count"]):
            s = stats[lc][pos]
            row = f"  {pos:<14}{s['count']:>7}"
            for f in fields:
                row += f"{s.get(f,0):>13}"
            print(row)


if __name__ == "__main__":
    main()
