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
    if len(sys.argv) > 1:
        d = carica(sys.argv[1])
        with open(GREZZE, "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, indent=1)
    elif os.path.exists(GREZZE):
        with open(GREZZE, encoding="utf-8") as fh:
            d = json.load(fh)
    else:
        d = {"opere": [], "correzioni": []}

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

%d opere datate — certa %d · circa %d · fase %d.
"""

# id opera → (anno, tipo, su che cosa si regge)
DATE = {
%s
}


def data_per(work_id):
    """(anno, tipo, base) oppure None se l'opera non è stata datata."""
    return DATE.get(work_id)
''' % (len(date), conteggi["certa"], conteggi["circa"], conteggi["fase"],
       "\n".join(righe) if righe else "    # (ancora vuota)")

    with open(os.path.join(HERE, "corpus_opere.py"), "w", encoding="utf-8") as fh:
        fh.write(testo)

    print("scritto corpus_opere.py: %d opere datate" % len(date))
    print("   certa %d · circa %d · fase %d · correzioni applicate %d"
          % (conteggi["certa"], conteggi["circa"], conteggi["fase"], corrette))


if __name__ == "__main__":
    main()
