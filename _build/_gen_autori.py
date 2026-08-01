# -*- coding: utf-8 -*-
"""Genera _build/corpus_autori.py — i nomi estesi degli autori.

Fonde due sorgenti: la ricerca (agganciata per NOME, non per id, perché gli id
passati alla ricerca erano corrotti) e le integrazioni scritte a mano qui sotto
per gli autori che la ricerca non ha coperto. Si genera invece di trascrivere:
trascrivere a mano 150 righe è già costato una tabella con 29 voci sbagliate.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from corpus_meta import canonico            # noqa: E402

# Autori che la ricerca non ha coperto (due lotti greci caduti sul limite di
# sessione) o che il catalogo ha con un nome diverso. Forme standard: nome greco
# politonico, etnico solo dove è tradizione citarlo.
AGGIUNTE = {
    "Achille Tazio": "**Ἀχιλλεὺς** **Τάτιος**",
    "Agatemero": "**Ἀγαθήμερος**",
    "Apollodoro": "**Ἀπολλόδωρος**",
    "Appiano": "**Ἀππιανὸς** Ἀλεξανδρεύς",
    "Arato": "**Ἄρατος** Σολεύς",
    "Areteo": "**Ἀρεταῖος** Καππαδόκης",
    "Arpocrazione": "**Ἁρποκρατίων**",
    "Asclepiodoto": "**Ἀσκληπιόδοτος**",
    "Bione": "**Βίων** Σμυρναῖος",
    "Callimaco": "**Καλλίμαχος** Κυρηναῖος",
    "Callistrato": "**Καλλίστρατος**",
    "Caritone": "**Χαρίτων** Ἀφροδισιεύς",
    "Cassio Dione": "**Δίων** **Κάσσιος** Κοκκηιανός",
    "Colluto": "**Κόλλουθος**",
    "Demade": "**Δημάδης**",
    "Demetrio Falereo": "**Δημήτριος** ὁ **Φαληρεύς**",
    "Dinarco": "**Δείναρχος**",
    "Diodoro Siculo": "**Διόδωρος** **Σικελιώτης**",
    "Diogene Laerzio": "**Διογένης** **Λαέρτιος**",
    "Dione Crisostomo": "**Δίων** **Χρυσόστομος**",
    "Dionigi di Alicarnasso": "**Διονύσιος** **Ἁλικαρνασσεύς**",
    "Eliano": "Κλαύδιος **Αἰλιανός**",
    "Epitteto": "**Ἐπίκτητος**",
    "Euclide": "**Εὐκλείδης**",
    "Eusebio di Cesarea": "**Εὐσέβιος** ὁ **Καισαρείας**",
    "Filostrato": "**Φιλόστρατος** ὁ Ἀθηναῖος",
    "Filostrato minore": "**Φιλόστρατος** ὁ νεώτερος",
    "Filostrato sofista": "**Φιλόστρατος** ὁ σοφιστής",
    "Licofrone": "**Λυκόφρων** Χαλκιδεύς",
    "Licurgo": "**Λυκοῦργος**",
    "Longino": "**Λογγῖνος**",
    "Mosco": "**Μόσχος** Συρακούσιος",
    "Nonno di Panopoli": "**Νόννος** **Πανοπολίτης**",
    "Onasandro": "**Ὀνάσανδρος**",
    "Oppiano": "**Ὀππιανός** Ἀναζαρβεύς",
    "Oppiano di Apamea": "**Ὀππιανός** ὁ **Ἀπαμεύς**",
    "Partenio": "**Παρθένιος** Νικαεύς",
    "Pausania": "**Παυσανίας** ὁ Περιηγητής",
    "Polibio": "**Πολύβιος** Μεγαλοπολίτης",
    "Proclo": "**Πρόκλος** ὁ Διάδοχος",
    "Procopio": "**Προκόπιος** Καισαρεύς",
    "Quinto Smirneo": "**Κόϊντος** **Σμυρναῖος**",
    "Seneca il Vecchio": "Lucius **Annaeus** **Seneca** maior",
    "Senofonte Efesio": "**Ξενοφῶν** ὁ **Ἐφέσιος**",
    "Strabone": "**Στράβων** Ἀμασεύς",
    "Tolomeo": "**Κλαύδιος** **Πτολεμαῖος**",
    "Trifiodoro": "**Τρυφιόδωρος**",
    "Zonara": "Ἰωάννης **Ζωναρᾶς**",
}

# Chi NON ha e non può avere un nome esteso: raccolte, corpora, anonimi, pseudo.
# Elencati per far vedere che l'assenza è una constatazione, non una dimenticanza.
SENZA_NOME = [
    "Antologia Palatina", "Appendix Vergiliana", "Historia Augusta",
    "Inni omerici", "Lettera di Barnaba", "Nuovo Testamento",
    "Pseudo-Cesare", "Pseudo-Plutarco", "Pseudo-Tertulliano",
]


def main():
    # Il nome va agganciato al textgroup CANONICO. Seneca e Pseudo-Cesare stanno
    # nell'elenco più volte, una per textgroup: prendendo l'ultima riga si finiva
    # sull'id assorbito dalla fusione, e in catalogo l'autore restava senza nome
    # esteso perché nessuno cercava più quella chiave.
    veri = {}
    with open(os.path.join(HERE, "_autori_elenco.txt"), encoding="utf-8") as fh:
        for r in fh.read().splitlines():
            if r.strip():
                p = r.split("|")
                veri[p[5]] = canonico(p[0])

    with open(os.path.join(HERE, "_estesi_parziale.json"), encoding="utf-8") as fh:
        da_ricerca = json.load(fh)          # per id, ma quelli PRIMA della fusione

    per_id = {canonico(tg): v for tg, v in da_ricerca.items()}
    for nome, esteso in AGGIUNTE.items():
        if nome in veri:
            per_id[veri[nome]] = esteso

    righe = []
    for tg in sorted(per_id):
        nome = next((n for n, i in veri.items() if i == tg), "?")
        righe.append('    %-20s %-46s # %s' % ('"%s":' % tg, '"%s",' % per_id[tg], nome))

    scoperti = sorted(n for n in veri if veri[n] not in per_id)
    testo = '''# -*- coding: utf-8 -*-
"""Nomi estesi degli autori — GENERATO da _gen_autori.py, non modificare a mano.

Sulla card di sfoglia l'autore compare col nome per esteso, e in GRASSETTO
l'elemento con cui davvero lo si chiama: «Publius **Vergilius** Maro». Serve a
due cose insieme — ricordare che Virgilio è i tre nomi, e non perdere di vista
quale dei tre è quello che si usa.

Il grassetto è marcato con doppi asterischi; l'interfaccia lo converte in <b>.

I LATINI hanno i tria nomina; i GRECI no — hanno il nome e, dove è tradizione
citarlo, l'etnico o il patronimico (Ἡρόδοτος Ἁλικαρνασσεύς). Non si inventano
praenomina per analogia: dove il nome esteso non è accertato, l'autore resta
col suo nome semplice e la card non mostra la riga.

%d autori su %d hanno un nome esteso. Restano scoperti:
%s
"""

# textgroup → nome esteso, **grassetto** sull'elemento d'uso
ESTESI = {
%s
}

# Chi non può averne uno: raccolte, corpora anonimi, pseudo-autori.
SENZA_NOME_ESTESO = {
%s
}


def esteso_per(textgroup):
    """Il nome esteso, o None se non c'è (e allora la card non mostra la riga)."""
    return ESTESI.get(textgroup)
''' % (
        len(per_id), len(veri),
        "\n".join("  · " + n for n in scoperti) or "  (nessuno)",
        "\n".join(righe),
        "\n".join('    "%s",' % n for n in SENZA_NOME),
    )

    out = os.path.join(HERE, "corpus_autori.py")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(testo)
    print("scritto corpus_autori.py: %d nomi estesi su %d autori" % (len(per_id), len(veri)))
    print("scoperti (%d): %s" % (len(scoperti), ", ".join(scoperti)))


if __name__ == "__main__":
    main()
