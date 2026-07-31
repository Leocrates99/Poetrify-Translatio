#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_corpus_index.py · Poetrify — ramo CORPUS, fase C3
========================================================
Costruisce l'INDICE INVERSO che permette di cercare in tutto il corpus senza
scaricarlo. È il cardine dell'architettura: si smette di scandire e si comincia
a indicizzare — lo stesso salto che il dizionario ha già fatto con gli shard
alfabetici.

COSA CONTIENE L'INDICE
----------------------
Per ogni forma normalizzata (senza accenti né spiriti): **in quali opere compare**.
NON dove: solo in quali. La posizione esatta la trova il browser scandendo le
poche opere candidate — il costo smette di dipendere dalla taglia del corpus e
dipende da quanto è rara la parola cercata.

COME SI INTERROGA (lato browser)
--------------------------------
1. La ricerca si normalizza e si spezza in parole.
2. Per ogni parola si carica UN solo spicchio (quello della sua prima lettera) e
   si prendono le opere di tutte le forme che COMINCIANO per quella parola —
   così «virtut» continua a trovare «virtute», come nella ricerca a scansione.
3. Con più parole si intersecano gli insiemi, partendo dalla più RARA: «Gallia est
   omnis» → «est» sta ovunque, «Gallia» in poche opere; partire dalla rara riduce
   i candidati di ordini di grandezza.
4. Si aprono solo le opere superstiti e si cerca la sottostringa esatta.

FORMA DEI FILE
--------------
    data/corpus/_idx/_manifest.json   { works: [id…], shards: {hex: n}, … }
    data/corpus/_idx/<hex>.json       { "<forma>": [indici di opera…], … }

`<hex>` è il codepoint della prima lettera (α → 03b1): un nome di file
inequivocabile su ogni sistema, senza URL-encoding né grane di normalizzazione.
Gli indici di opera sono posizioni nell'array `works` del manifesto.

USO
    PYTHONIOENCODING=utf-8 python _build/build_corpus_index.py
"""

import json
import os
import re
import shutil
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CORPUS = os.path.join(ROOT, "data", "corpus")
IDX = os.path.join(CORPUS, "_idx")

WORD = re.compile(r"[^\W\d_]+", re.UNICODE)


# L'apostrofo di elisione è per Unicode una LETTERA modificatrice: `\w` lo tiene
# dentro la parola, e «μυρίʼ» non combacia mai con «μυρι». Va tolto qui e nello
# stesso punto di corpus.html (costante ELISION), o indice e ricerca divergono.
ELISION = "ʼ’ʹ᾽᾿῾´'"


def fold(s):
    """Stessa normalizzazione della ricerca nel browser: via i diacritici e gli
    apostrofi d'elisione, minuscole, sigma finale unificato, u/v e i/j unificati."""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c) and c not in ELISION)
    return s.lower().replace("ς", "σ").replace("v", "u").replace("j", "i")


def human(n):
    for u in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {u}"
        n /= 1024
    return f"{n:.1f} TB"


def main():
    index_path = os.path.join(CORPUS, "_index.json")
    if not os.path.exists(index_path):
        print("ERRORE · manca data/corpus/_index.json — esegui prima l'import (C2).")
        return 2
    catalog = json.load(open(index_path, encoding="utf-8"))
    works = catalog["works"]
    print(f"Indicizzo {len(works)} opere…\n")

    postings = {}          # forma → [indice di opera, …]  (crescente per costruzione)
    total_tokens = 0
    for wi, w in enumerate(works):
        path = os.path.join(CORPUS, w["lang"], w["id"] + ".json")
        try:
            doc = json.load(open(path, encoding="utf-8"))
        except FileNotFoundError:
            print(f"   ! manca {path}")
            continue
        seen = set()
        for u in doc["units"]:
            for m in WORD.findall(u["t"]):
                t = fold(m)
                if t:          # una «parola» fatta del solo apostrofo si annulla
                    seen.add(t)
        total_tokens += len(seen)
        for tok in seen:
            postings.setdefault(tok, []).append(wi)
        if (wi + 1) % 200 == 0:
            print(f"   … {wi+1}/{len(works)} opere · {len(postings):,} forme distinte"
                  .replace(",", "."))

    # ── scrittura a spicchi ───────────────────────────────────────────────
    if os.path.isdir(IDX):
        shutil.rmtree(IDX)
    os.makedirs(IDX, exist_ok=True)

    shards = {}
    for tok, wl in postings.items():
        key = f"{ord(tok[0]):04x}"
        shards.setdefault(key, {})[tok] = wl

    sizes = {}
    for key, d in shards.items():
        p = os.path.join(IDX, key + ".json")
        with open(p, "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, separators=(",", ":"))
        sizes[key] = os.path.getsize(p)

    manifest = {
        "schema": "poetrify-corpus-index/1",
        "works": [w["id"] for w in works],
        "langs": [w["lang"] for w in works],
        "shards": {k: len(d) for k, d in sorted(shards.items())},
        "counts": {
            "works": len(works),
            "forms": len(postings),
            "postings": sum(len(v) for v in postings.values()),
        },
    }
    with open(os.path.join(IDX, "_manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, separators=(",", ":"))

    tot = sum(sizes.values()) + os.path.getsize(os.path.join(IDX, "_manifest.json"))
    print("\n" + "═" * 62)
    print(f"  forme distinte : {len(postings):,}".replace(",", "."))
    print(f"  coppie forma-opera: {manifest['counts']['postings']:,}".replace(",", "."))
    print(f"  spicchi        : {len(shards)}")
    print(f"  peso indice    : {human(tot)}")
    big = sorted(sizes.items(), key=lambda x: -x[1])[:8]
    print("  spicchi maggiori:")
    for k, s in big:
        print(f"      {k} ({chr(int(k,16))})  {human(s):>9}  {len(shards[k]):>7} forme")
    print(f"\n  → data/corpus/_idx/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
