# -*- coding: utf-8 -*-
"""Prepara i lotti per la SECONDA passata di datazione: tutto ciò che resta.

La prima passata ha coperto i 48 autori del canone liceale (617 opere). Qui si
prende tutto il resto — 549 opere, 99 autori — e lo si impacchetta in lotti
bilanciati per numero di opere, senza mai spezzare un autore fra due lotti:
chi data l'opera omnia di Luciano deve vederla intera, altrimenti la cronologia
relativa non la può nemmeno tentare.

I lotti escono come file numerati (lotto-01.txt …), così chi li consuma non ha
bisogno che gli si passi un elenco di nomi: gli bastano i numeri.
"""
import json
import os
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "_da_datare_resto")

# Quante opere al massimo per lotto. Un autore più grosso del tetto si prende
# comunque il suo lotto da solo.
TETTO = 60


def main():
    with open(os.path.join(ROOT, "data", "corpus", "_index.json"), encoding="utf-8") as fh:
        idx = json.load(fh)

    resta = [w for w in idx["works"] if w.get("year") is None]
    per_autore = collections.defaultdict(list)
    for w in resta:
        per_autore[w["author"]].append(w)

    # Ordine: prima i grossi, così i piccoli riempiono i buchi che restano.
    autori = sorted(per_autore.items(), key=lambda kv: -len(kv[1]))

    lotti = []
    for nome, opere in autori:
        posato = False
        if len(opere) < TETTO:
            for l in lotti:
                if l["n"] + len(opere) <= TETTO:
                    l["autori"].append((nome, opere)); l["n"] += len(opere)
                    posato = True
                    break
        if not posato:
            lotti.append({"autori": [(nome, opere)], "n": len(opere)})

    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))

    for i, l in enumerate(lotti, 1):
        righe = []
        for nome, opere in l["autori"]:
            opere.sort(key=lambda w: w["id"])
            w0 = opere[0]
            righe.append("")
            righe.append("### %s — %s, %s (%d oper%s)"
                         % (nome, "greco" if w0["lang"] == "grc" else "latino",
                            w0["epoch"], len(opere), "a" if len(opere) == 1 else "e"))
            for w in opere:
                righe.append("%s | %s | %s | %s" % (
                    w["id"], w["genre"], w["title"], w.get("titleOrig") or ""))
        testata = ["# LOTTO %02d — %d opere, %d autori"
                   % (i, l["n"], len(l["autori"])),
                   "# riga: id | genere | titolo italiano | titolo originale"]
        with open(os.path.join(OUT, "lotto-%02d.txt" % i), "w", encoding="utf-8") as fh:
            fh.write("\n".join(testata + righe) + "\n")

    print("lotti: %d · opere: %d · autori: %d" % (len(lotti), sum(l["n"] for l in lotti), len(per_autore)))
    for i, l in enumerate(lotti, 1):
        nomi = ", ".join(n for n, _ in l["autori"])
        print("  lotto-%02d  %3d opere  %s" % (i, l["n"], nomi[:96] + ("…" if len(nomi) > 96 else "")))


if __name__ == "__main__":
    main()
