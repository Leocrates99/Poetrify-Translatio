# -*- coding: utf-8 -*-
"""Genera _build/corpus_opere.py — le date di composizione delle opere.

Legge l'esito della datazione (JSON con {opere:[{id,anno,tipo,base}], correzioni:[...]})
e ne fa una tabella Python. Le correzioni del controllo avversariale si applicano
SOPRA le date di prima passata: se il controllo ha smentito una data dichiarata
documentata, vince il controllo.

    python _build/_gen_opere.py <percorso-output.json>

Senza argomento rigenera dalla copia già salvata in _build/_date_grezze.json.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
GREZZE = os.path.join(HERE, "_date_grezze.json")

TIPI = {"certa", "circa", "fase"}


def carica(percorso):
    with open(percorso, encoding="utf-8") as fh:
        raw = fh.read()
    d = json.loads(raw[raw.find("{"):])
    return d.get("result", d)


def main():
    # Le passate si ACCUMULANO: la prima ha datato il canone liceale, la seconda
    # tutto il resto. Rigenerare con la sola seconda cancellerebbe la prima, che
    # è la cosa peggiore che possa fare uno script di build — quindi il grezzo
    # si rilegge e si fonde, con le voci nuove che vincono su quelle vecchie.
    d = {"opere": [], "correzioni": []}
    if os.path.exists(GREZZE):
        with open(GREZZE, encoding="utf-8") as fh:
            d = json.load(fh)

    for percorso in sys.argv[1:]:
        nuovo = carica(percorso)
        visti = {o["id"] for o in nuovo.get("opere", [])}
        d["opere"] = [o for o in d["opere"] if o["id"] not in visti] + nuovo.get("opere", [])
        idc = {c["id"] for c in nuovo.get("correzioni", [])}
        d["correzioni"] = [c for c in d["correzioni"] if c["id"] not in idc] + nuovo.get("correzioni", [])

    if len(sys.argv) > 1:
        with open(GREZZE, "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, indent=1)

    date = {}
    for o in d.get("opere", []):
        if o.get("tipo") not in TIPI or not isinstance(o.get("anno"), int):
            continue
        date[o["id"]] = (o["anno"], o["tipo"], (o.get("base") or "").strip())

    corrette = 0
    for c in d.get("correzioni", []):
        if c.get("id") in date and c.get("tipo_corretto") in TIPI:
            base = date[c["id"]][2]
            prova = (c.get("prova") or "").strip()
            date[c["id"]] = (c.get("anno_corretto", date[c["id"]][0]), c["tipo_corretto"],
                             prova or base)
            corrette += 1

    # «non-databile» è una risposta, non un buco: si conta e si dichiara, ma non
    # entra nella tabella — l'opera resta senza data e l'interfaccia la mette in
    # coda nell'ordine tradizionale.
    indatabili = sum(1 for o in d.get("opere", []) if o.get("tipo") == "non-databile")
    conteggi = {t: sum(1 for v in date.values() if v[1] == t) for t in sorted(TIPI)}

    righe = []
    for wid in sorted(date):
        anno, tipo, base = date[wid]
        base = base.replace('"', "'").replace("\\", "")
        if len(base) > 90:
            base = base[:87] + "…"
        righe.append('    "%s": (%d, "%s", "%s"),' % (wid, anno, tipo, base))

    testo = '''# -*- coding: utf-8 -*-
"""Date di composizione — GENERATO da _gen_opere.py, non modificare a mano.

Curate a mano per il CANONE LICEALE, non per tutte le 1166 opere: per gli autori
minori e i corpora tecnici la data della singola opera non esiste come dato, e
inventarla sarebbe peggio dell'ordine tradizionale.

Ogni voce dice l'anno E COME lo si conosce, che è la parte che conta:
  "certa"  documentata — didascalia teatrale, processo, dedica, lettera
  "circa"  la critica converge, ma per via indiretta
  "fase"   nessuna data: il numero è solo un posto in una successione relativa
           (i tre periodi platonici, la cronologia interna di un corpus)

L'interfaccia stampa l'anno solo per i primi due tipi. Le opere in "fase" si
ordinano ma non mostrano una data, perché stamparla la farebbe passare per tale.

Anni NEGATIVI = avanti Cristo.

Le opere per cui la datazione è stata esaminata e dichiarata IMPOSSIBILE non
stanno qui: restano senza data e l'interfaccia le mette in coda nell'ordine
tradizionale. Assenza esaminata e assenza non esaminata si somigliano nel dato
ma non nel significato — il registro di chi le ha valutate sta in
_build/_date_grezze.json.

%d opere datate — certa %d · circa %d · fase %d · non databili %d.
"""

# id opera → (anno, tipo, su che cosa si regge)
DATE = {
%s
}


def data_per(work_id):
    """(anno, tipo, base) oppure None se l'opera non è stata datata."""
    return DATE.get(work_id)
''' % (len(date), conteggi["certa"], conteggi["circa"], conteggi["fase"], indatabili,
       "\n".join(righe) if righe else "    # (ancora vuota)")

    with open(os.path.join(HERE, "corpus_opere.py"), "w", encoding="utf-8") as fh:
        fh.write(testo)

    print("scritto corpus_opere.py: %d opere datate" % len(date))
    print("   certa %d · circa %d · fase %d" % (conteggi["certa"], conteggi["circa"], conteggi["fase"]))
    print("   dichiarate NON databili: %d · correzioni applicate: %d" % (indatabili, corrette))


if __name__ == "__main__":
    main()
