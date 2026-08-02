# -*- coding: utf-8 -*-
"""Prepara i lotti delle opere ancora senza titolo italiano d'uso.

Si prendono SOLO le opere in stato 'assente' — non curate. Quelle in stato
'orig' sono già state decise: dicono «l'uso italiano È il titolo originale»
(le commedie di Plauto, il Satyricon), e riaprirle significherebbe disfare una
scelta del docente.

I lotti escono come file numerati, bilanciati per numero di opere e senza mai
spezzare un autore: chi traduce i titoli di Elio Aristide deve vedere l'opera
omnia, altrimenti non riconosce le serie.
"""
import json
import os
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "_da_tradurre")
TETTO = 45


def main():
    with open(os.path.join(ROOT, "data", "corpus", "_index.json"), encoding="utf-8") as fh:
        idx = json.load(fh)

    resta = [w for w in idx["works"] if w.get("titleState") == "assente"]
    per_autore = collections.defaultdict(list)
    for w in resta:
        per_autore[w["author"]].append(w)

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
            righe.append("### %s — %s, %s, %s (%d oper%s)"
                         % (nome, "greco" if w0["lang"] == "grc" else "latino",
                            w0["genre"], w0["epoch"], len(opere),
                            "a" if len(opere) == 1 else "e"))
            for w in opere:
                righe.append("%s | %s" % (w["id"], w["title"]))
        testata = ["# LOTTO %02d — %d opere, %d autori" % (i, l["n"], len(l["autori"])),
                   "# riga: id | titolo così come sta oggi in catalogo"]
        with open(os.path.join(OUT, "lotto-%02d.txt" % i), "w", encoding="utf-8") as fh:
            fh.write("\n".join(testata + righe) + "\n")

    print("lotti: %d · opere: %d · autori: %d" % (len(lotti), sum(l["n"] for l in lotti), len(per_autore)))
    for i, l in enumerate(lotti, 1):
        nomi = ", ".join(n for n, _ in l["autori"])
        print("  lotto-%02d  %3d  %s" % (i, l["n"], nomi[:90] + ("…" if len(nomi) > 90 else "")))


if __name__ == "__main__":
    main()
