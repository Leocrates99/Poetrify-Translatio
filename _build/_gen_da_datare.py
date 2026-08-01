# -*- coding: utf-8 -*-
"""Prepara i lotti di opere da datare a mano, per il canone liceale.

Non si datano tutte e 1166 le opere: per gli autori minori e per i corpora
tecnici la cronologia della singola opera non esiste come dato, e inventarla
sarebbe peggio dell'ordine tradizionale. Si datano gli autori che in un liceo
si affrontano davvero, dove la critica una data ce l'ha — e per il teatro
l'anno di rappresentazione è spesso certo, non congetturale.
"""
import json
import os
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# Il canone. Chiave = nome in catalogo; il valore dice perché sta qui, e finisce
# nel prompt: a un agente che data l'Orestea serve sapere che le didascalie
# danno l'anno esatto, a chi data i Dialoghi platonici che avrà solo fasce.
CANONE = {
    # ── teatro · l'anno di rappresentazione è spesso documentato ──────────
    "Eschilo":      "tragedia greca · le didascalie danno spesso l'anno esatto di rappresentazione",
    "Sofocle":      "tragedia greca · alcune date certe (Filottete 409, Edipo a Colono postumo 401), altre congetturali",
    "Euripide":     "tragedia greca · molte date certe da didascalie e scoli",
    "Aristofane":   "commedia antica · quasi tutte le date di rappresentazione sono note",
    "Plauto":       "palliata · date incerte, si va per fasce; alcune ancorate (Stichus 200, Pseudolus 191)",
    "Terenzio":     "palliata · le didascalie danno l'anno esatto di ciascuna delle sei commedie",
    "Menandro":     "commedia nuova · poche date sicure (Dyskolos 316)",
    # ── prosa e poesia latina del canone ─────────────────────────────────
    "Cicerone":     "opera datatissima: orazioni per il processo, trattati per le lettere e i proemi",
    "Cesare":       "Bellum Gallicum e Bellum civile, composizione ben circoscritta",
    "Sallustio":    "monografie databili con precisione",
    "Virgilio":     "Bucoliche, Georgiche, Eneide: cronologia canonica e sicura",
    "Orazio":       "raccolte datate per libro (Satire, Epodi, Odi I-III e IV, Epistole)",
    "Ovidio":       "dalle opere amatorie all'esilio, cronologia ben ricostruita",
    "Livio":        "Ab urbe condita a decadi, composizione lunga",
    "Seneca":       "Dialogi databili singolarmente; Lettere a Lucilio 62-65; tragedie incerte",
    "Tacito":       "Agricola e Germania 98, poi Historiae e Annales",
    "Lucrezio":     "opera unica",
    "Catullo":      "liber unico",
    "Tibullo":      "libri di elegie",
    "Properzio":    "libri di elegie",
    "Quintiliano":  "Institutio oratoria, composizione circoscritta",
    "Marziale":     "libri di epigrammi, quasi tutti datati anno per anno",
    "Giovenale":    "satire per libri",
    "Petronio":     "opera unica",
    "Lucano":       "opera unica, incompiuta",
    "Persio":       "opera unica",
    "Svetonio":     "De vita Caesarum",
    "Apuleio":      "Apologia databile al processo, Metamorfosi più tarda",
    "Plinio il Giovane": "libri di epistole, pubblicati a scaglioni",
    "Agostino":     "opere databili con precisione dalle Retractationes",
    "Girolamo":     "opere databili",
    # ── prosa greca del canone ───────────────────────────────────────────
    "Erodoto":      "opera unica",
    "Tucidide":     "opera unica",
    "Senofonte":    "cronologia relativa ricostruita",
    "Lisia":        "orazioni databili dal processo",
    "Isocrate":     "orazioni e discorsi databili",
    "Demostene":    "orazioni datatissime dal contesto politico",
    "Eschine":      "tre orazioni, date certe",
    "Platone":      "NESSUNA data certa: si usano le tre fasi canoniche (giovanile, matura, tarda) e si ordina per fase",
    "Aristotele":   "cronologia interna discussa: si ordina per fase e per gruppo di trattati",
    "Polibio":      "opera unica",
    "Teocrito":     "Idilli, cronologia relativa incerta",
    "Callimaco":    "cronologia relativa incerta",
    "Apollonio Rodio": "opera unica",
    "Plutarco":     "Vite e Moralia, cronologia relativa poco determinabile",
    "Omero":        "opera di tradizione orale: si dà la fascia convenzionale",
    "Esiodo":       "cronologia relativa fra Teogonia e Opere",
    "Pindaro":      "epinici datati dalla vittoria celebrata",
    "Bacchilide":   "epinici datati dalla vittoria celebrata",
}

OUT = os.path.join(HERE, "_da_datare")


def main():
    with open(os.path.join(ROOT, "data", "corpus", "_index.json"), encoding="utf-8") as fh:
        idx = json.load(fh)

    per_autore = collections.defaultdict(list)
    for w in idx["works"]:
        per_autore[w["author"]].append(w)

    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))

    lotti, totale, assenti = [], 0, []
    for nome, nota in CANONE.items():
        opere = per_autore.get(nome)
        if not opere:
            assenti.append(nome)
            continue
        opere.sort(key=lambda w: w["id"])
        righe = ["# %s — %s" % (nome, nota), "# id | genere | opere | titolo italiano | titolo originale", ""]
        for w in opere:
            righe.append("%s | %s | %s | %s" % (
                w["id"], w["genre"], w["title"], w.get("titleOrig") or ""))
        slug = nome.lower().replace(" ", "-").replace("'", "")
        percorso = os.path.join(OUT, slug + ".txt")
        with open(percorso, "w", encoding="utf-8") as fh:
            fh.write("\n".join(righe) + "\n")
        lotti.append({"autore": nome, "nota": nota, "file": percorso, "n": len(opere)})
        totale += len(opere)

    with open(os.path.join(HERE, "_da_datare_lotti.json"), "w", encoding="utf-8") as fh:
        json.dump(lotti, fh, ensure_ascii=False, indent=1)

    print("autori del canone presenti: %d · opere da datare: %d" % (len(lotti), totale))
    if assenti:
        print("NON in catalogo:", ", ".join(assenti))
    for l in sorted(lotti, key=lambda x: -x["n"])[:12]:
        print("   %-22s %3d opere" % (l["autore"], l["n"]))


if __name__ == "__main__":
    main()
