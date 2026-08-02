# -*- coding: utf-8 -*-
"""Genera _build/corpus_titles_resto.py — i titoli italiani degli autori minori.

    python _build/_gen_titoli_resto.py <percorso-output.json>

Le correzioni del controllo avversariale si applicano SOPRA la prima passata: se
il controllo ha smentito un titolo italiano, vince il controllo. Un titolo
riportato a stringa vuota significa «in italiano si usa l'originale», e diventa
un `None` nella tabella — il valore che l'interfaccia rende come fascia unica.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
GREZZI = os.path.join(HERE, "_titoli_grezzi.json")


def carica(percorso):
    with open(percorso, encoding="utf-8") as fh:
        raw = fh.read()
    d = json.loads(raw[raw.find("{"):])
    return d.get("result", d)


def pulisci(s):
    return " ".join((s or "").split()).strip()


def main():
    d = {"opere": [], "correzioni": []}
    if os.path.exists(GREZZI):
        with open(GREZZI, encoding="utf-8") as fh:
            d = json.load(fh)

    for percorso in sys.argv[1:]:
        nuovo = carica(percorso)
        visti = {o["id"] for o in nuovo.get("opere", [])}
        d["opere"] = [o for o in d["opere"] if o["id"] not in visti] + nuovo.get("opere", [])
        idc = {c["id"] for c in nuovo.get("correzioni", [])}
        d["correzioni"] = [c for c in d["correzioni"] if c["id"] not in idc] + nuovo.get("correzioni", [])

    if len(sys.argv) > 1:
        with open(GREZZI, "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, indent=1)

    titoli, originali, motivi = {}, {}, {}
    for o in d.get("opere", []):
        it, org = pulisci(o.get("italiano")), pulisci(o.get("originale"))
        titoli[o["id"]] = it or None            # None = l'uso italiano È l'originale
        motivi[o["id"]] = pulisci(o.get("motivo"))
        if org:
            originali[o["id"]] = org

    corrette = 0
    for c in d.get("correzioni", []):
        if c["id"] in titoli:
            titoli[c["id"]] = pulisci(c.get("italiano_corretto")) or None
            motivi[c["id"]] = pulisci(c.get("prova")) or motivi.get(c["id"], "")
            corrette += 1

    con_it = sum(1 for v in titoli.values() if v)
    all_orig = len(titoli) - con_it

    def riga(k, v, nota):
        nota = nota.replace('"', "'").replace("\\", "")
        if len(nota) > 74:
            nota = nota[:71] + "…"
        val = '"%s",' % v if v else "None,"
        return '    %-22s %-46s # %s' % ('"%s":' % k, val, nota)

    righe = [riga(k, titoli[k], motivi.get(k, "")) for k in sorted(titoli)]
    righe_o = ['    %-22s "%s",' % ('"%s":' % k, originali[k]) for k in sorted(originali)]

    testo = '''# -*- coding: utf-8 -*-
"""Titoli italiani degli autori minori — GENERATO, non modificare a mano.

Lo genera _gen_titoli_resto.py; le scelte fatte a mano stanno in
corpus_titles.py e VINCONO su queste (vedi la coda di quel file).

Vale la stessa regola del resto del catalogo: se la traduzione italiana del
titolo esiste nell'uso, va in testa e l'originale scende in seconda fascia.
`None` non vuol dire «non tradotto»: vuol dire che in italiano l'opera si cita
con il suo titolo originale, e allora la scheda ne stampa una fascia sola.

%d opere · %d con titolo italiano · %d lasciate all'originale.
"""

# id opera → titolo italiano d'uso, oppure None se l'uso È l'originale
TITOLI_RESTO = {
%s
}

# Originali da correggere: il catalogo della fonte porta spesso il titolo
# convenzionale LATINO su un'opera greca (Arriano «Anabasis», Ippocrate
# «Iusiurandum»), che promette l'originale e dà una traduzione.
ORIG_RESTO = {
%s
}
''' % (len(titoli), con_it, all_orig,
       "\n".join(righe) if righe else "    # (vuota)",
       "\n".join(righe_o) if righe_o else "    # (vuota)")

    with open(os.path.join(HERE, "corpus_titles_resto.py"), "w", encoding="utf-8") as fh:
        fh.write(testo)

    print("scritto corpus_titles_resto.py: %d opere" % len(titoli))
    print("   con titolo italiano: %d · lasciate all'originale: %d" % (con_it, all_orig))
    print("   originali corretti: %d · correzioni applicate: %d" % (len(originali), corrette))


if __name__ == "__main__":
    main()
