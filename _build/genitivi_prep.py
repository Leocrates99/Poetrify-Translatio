# -*- coding: utf-8 -*-
"""S.3/④ · prepara i lotti per il GIUDIZIO FILOLOGICO sui genitivi.

Perimetro = i lemmi del segmento LAT-N per cui il paradigma manca o il genitivo
memorizzato diverge da quello ricostruito da L&S. Per ciascuno si mette sul
tavolo TUTTA l'evidenza (testo L&S, declinazione dal censimento, genitivo
memorizzato, proposta dell'algoritmo, forme attestate) perché l'agente giudichi.
Uso: python genitivi_prep.py [dimensione_lotto=10]
"""
import os, sys, json, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources"))
import extract_genitives as X
sys.stdout.reconfigure(encoding="utf-8")

BATCH = int(sys.argv[1]) if len(sys.argv) > 1 else 10
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "genitivi_input")


def j(c):
    return "".join(x[0] for x in c).lower()


def main():
    par = X.load_paradigms()
    defs = X.load_defs()
    seg = X.segmento()
    att = X.load_attested(seg.keys())

    casi = []
    for key, (decl, rid, lemma) in sorted(seg.items(), key=lambda kv: (X.norm(kv[1][2]), kv[0])):
        p = par.get(key)
        stored = j(p["nome"]["sg"]["gen"]) if (p and "nome" in p) else None
        tok, gen_g = X.parse_notation(lemma, defs.get(key, ""))
        prop = X.align_scan(lemma, tok, decl, att.get(key)) if tok else None
        if stored is not None and prop is not None and stored == prop:
            continue                                    # concorde: non si tocca
        forme = sorted(att.get(key, set()))
        casi.append({
            "key": key, "id": rid, "lemma": lemma,
            "caso": "senza_paradigma" if stored is None else "divergente",
            "declinazione_censimento": decl,
            "genere_ls": gen_g,
            "lewis_short": (defs.get(key, "") or "")[:400],
            "genitivo_memorizzato": stored,
            "genitivo_proposto": prop,
            "token_ls": tok,
            "forme_attestate": forme[:24],
        })

    os.makedirs(OUT, exist_ok=True)
    for f in glob.glob(os.path.join(OUT, "batch-*.json")):
        os.remove(f)
    n = 0
    for i in range(0, len(casi), BATCH):
        json.dump(casi[i:i + BATCH], open(os.path.join(OUT, f"batch-{i//BATCH:03d}.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        n += 1
    tipi = collections.Counter(c["caso"] for c in casi)
    perdecl = collections.Counter(c["declinazione_censimento"] for c in casi)
    print(f"casi da giudicare: {len(casi)} → {n} lotti da {BATCH}")
    print(f"  per tipo: {dict(tipi)}")
    print(f"  per declinazione: {dict(sorted(perdecl.items()))}")
    print(f"  senza forme attestate: {sum(1 for c in casi if not c['forme_attestate'])}")
    print(f"→ {OUT}")


if __name__ == "__main__":
    main()
