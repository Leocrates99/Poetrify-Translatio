# -*- coding: utf-8 -*-
"""S.2 (c) · INDICE INVERSO dell'analizzatore: da data/<lang>/<lettera>.json
(forms: forma → [{lemma,parsing}]) genera data/<lang>/forms/<lettera>.json
(forma → [{id,parsing}]) mappando lemma→id via _id_map. Deterministico,
rigenerabile → l'output va gitignorato; versionato lo script.
Uso: python build_forms_index.py latin a   (o senza lettera = tutte)
Report: forme indicizzate, % con id, round-trip.
"""
import os, sys, json, glob
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import common as C
sys.stdout.reconfigure(encoding="utf-8")

LANG = sys.argv[1] if len(sys.argv) > 1 else "latin"
LETTER = sys.argv[2] if len(sys.argv) > 2 else None   # None = tutte le lettere
LC = {"latin": "lat", "greek": "grc"}[LANG]
DATA = C.DATA
OUTDIR = os.path.join(DATA, LANG, "forms")


def main():
    idmap = C.load_id_map(LC)
    files = ([os.path.join(DATA, LANG, f"{LETTER}.json")] if LETTER
             else [f for f in glob.glob(os.path.join(DATA, LANG, "*.json")) if not os.path.basename(f).startswith("_")])
    os.makedirs(OUTDIR, exist_ok=True)
    tot_forms = tot_entries = hooked = 0
    for f in files:
        if not os.path.exists(f):
            print(f"  (shard assente: {f})"); continue
        letter = os.path.splitext(os.path.basename(f))[0]
        forms = json.load(open(f, encoding="utf-8")).get("forms", {})
        rev = {}
        for forma, cands in forms.items():
            out = []
            for c in cands:
                lemma = c.get("lemma")
                rid = idmap.get(lemma)
                if rid:
                    out.append({"id": rid, "parsing": c.get("parsing", "")})
                    hooked += 1
                tot_entries += 1
            if out:
                rev[forma] = out
        tot_forms += len(forms)
        json.dump({"forms": rev}, open(os.path.join(OUTDIR, f"{letter}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    pct = 100.0 * hooked / max(tot_entries, 1)
    print(f"S.2 (c) · indice inverso {LANG}{'/' + LETTER if LETTER else ' (tutte)'}:")
    print(f"  forme {tot_forms} · voci-forma {tot_entries} · agganciate a un id {hooked} ({pct:.1f}%)")
    print(f"  → data/{LANG}/forms/")


if __name__ == "__main__":
    main()
