#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
corpus_meta.py · Poetrify — ramo CORPUS
========================================
Genere ed epoca per ogni GRUPPO D'AUTORE del canone Perseus.

PERCHÉ ESISTE QUESTO FILE
-------------------------
I file di catalogo CTS di Perseus danno autore e titolo, ma NON genere né epoca:
sono le due faccette con cui un docente cerca davvero («una tragedia», «un testo
di età imperiale»). Su 1.169 opere non è pensabile classificarle a mano.

La scelta (presa con l'utente il 2026-07-30) è: **dedurre dall'autore e
dichiararlo**. Ogni opera eredita genere ed epoca del suo autore; il dato esce
marcato `inferred: true`, e l'interfaccia lo mostra come dedotto, non come
verità filologica.

Dove il default d'autore MENTE su un'opera precisa (Ovidio elegiaco che scrive
le «Metamorfosi» epiche; Cicerone oratore che scrive il «De officiis»
filosofico), c'è l'eccezione puntuale in WORKS: quella è curata, e infatti esce
con `inferred: false`.

VOCABOLARI CHIUSI (non inventare valori nuovi senza aggiornarli qui)
--------------------------------------------------------------------
generi : epica · lirica · elegia · epigramma · tragedia · commedia · satira ·
         favola · romanzo · storiografia · biografia · oratoria · retorica ·
         filosofia · epistolografia · didascalica · geografia · medicina ·
         scienze · tecnica · erudizione · mitografia · religione · antologia
epoche latino: arcaica · repubblicana · augustea · imperiale · tarda
epoche greco : arcaica · classica · ellenistica · imperiale · tarda
"""

# ── LATINO ────────────────────────────────────────────────────────────────
LAT = {
    "phi0119": ("commedia", "arcaica"),          # Plauto
    "phi0134": ("commedia", "arcaica"),          # Terenzio
    "phi0426": ("storiografia", "repubblicana"), # Pseudo-Cesare
    "phi0428": ("storiografia", "repubblicana"),
    "phi0430": ("storiografia", "repubblicana"),
    "phi0448": ("storiografia", "repubblicana"), # Cesare
    "phi0472": ("lirica", "repubblicana"),       # Catullo
    "phi0474": ("oratoria", "repubblicana"),     # Cicerone
    "phi0478": ("epistolografia", "repubblicana"),
    "phi0550": ("didascalica", "repubblicana"),  # Lucrezio
    "phi0588": ("biografia", "repubblicana"),    # Cornelio Nepote
    "phi0620": ("elegia", "augustea"),           # Properzio
    "phi0631": ("storiografia", "repubblicana"), # Sallustio
    "phi0660": ("elegia", "augustea"),           # Tibullo
    "phi0690": ("epica", "augustea"),            # Virgilio
    "phi0836": ("medicina", "imperiale"),        # Celso
    "phi0845": ("tecnica", "imperiale"),         # Columella
    "phi0860": ("storiografia", "imperiale"),    # Curzio Rufo
    "phi0893": ("lirica", "augustea"),           # Orazio
    "phi0914": ("storiografia", "augustea"),     # Livio
    "phi0917": ("epica", "imperiale"),           # Lucano
    "phi0959": ("elegia", "augustea"),           # Ovidio
    "phi0969": ("satira", "imperiale"),          # Persio
    "phi0972": ("romanzo", "imperiale"),         # Petronio
    "phi0975": ("favola", "imperiale"),          # Fedro
    "phi0978": ("scienze", "imperiale"),         # Plinio il Vecchio
    "phi1002": ("retorica", "imperiale"),        # Quintiliano
    "phi1014": ("retorica", "imperiale"),        # Seneca il Vecchio
    # ATTENZIONE ai due gruppi di Seneca, che il catalogo Perseus tiene separati
    # in modo controintuitivo: `phi1017` raccoglie le TRAGEDIE (più qualche prosa),
    # `stoa0255` i DIALOGHI filosofici. Erano invertiti, e l'errore è rimasto
    # invisibile finché il genere è stato solo un'etichetta: è emerso sfogliando
    # il catalogo per genere, dove «tragedia» restituiva le Consolazioni.
    "phi1017": ("tragedia", "imperiale"),        # Seneca tragico
    "phi1020": ("epica", "imperiale"),           # Stazio
    "phi1035": ("epica", "imperiale"),           # Valerio Flacco
    "phi1038": ("erudizione", "imperiale"),      # Valerio Massimo
    "phi1056": ("tecnica", "augustea"),          # Vitruvio
    "phi1212": ("romanzo", "imperiale"),         # Apuleio
    "phi1221": ("storiografia", "augustea"),     # Augusto (Res gestae)
    "phi1242": ("storiografia", "imperiale"),    # Floro
    "phi1254": ("erudizione", "imperiale"),      # Gellio
    "phi1276": ("satira", "imperiale"),          # Giovenale
    "phi1294": ("epigramma", "imperiale"),       # Marziale
    "phi1318": ("epistolografia", "imperiale"),  # Plinio il Giovane
    "phi1345": ("epica", "imperiale"),           # Silio Italico
    "phi1348": ("biografia", "imperiale"),       # Svetonio
    "phi1351": ("storiografia", "imperiale"),    # Tacito
    "phi2331": ("storiografia", "tarda"),        # Historia Augusta
    "stoa0023": ("storiografia", "tarda"),       # Ammiano Marcellino
    "stoa0045": ("lirica", "tarda"),             # Ausonio
    "stoa0058": ("filosofia", "tarda"),          # Boezio
    "stoa0089": ("epica", "tarda"),              # Claudiano
    "stoa0162": ("religione", "tarda"),          # Girolamo
    "stoa0203": ("religione", "tarda"),          # Minucio Felice
    "stoa0238": ("religione", "tarda"),          # Prudenzio
    "stoa0255": ("filosofia", "imperiale"),      # Seneca · i Dialogi
    "stoa0275": ("religione", "tarda"),          # Tertulliano
    "stoa0276": ("religione", "tarda"),          # Pseudo-Tertulliano
    # Questi sei gruppi NON hanno `__cts__.xml` nel repository: identificati
    # leggendo l'intestazione TEI delle loro opere (non indovinati).
    "phi0692": ("lirica", "augustea"),           # Appendix Vergiliana
    "phi2003": ("tecnica", "imperiale"),         # Apicio · De re coquinaria
    "stoa0040": ("religione", "tarda"),          # Agostino
    "stoa0054": ("storiografia", "tarda"),       # Beda il Venerabile
    "stoa0079": ("tecnica", "arcaica"),          # Catone · De agri cultura
    "stoa0261": ("lirica", "tarda"),             # Sidonio Apollinare
}

# ── GRECO ─────────────────────────────────────────────────────────────────
GRC = {
    "tlg0001": ("epica", "ellenistica"),         # Apollonio Rodio
    "tlg0003": ("storiografia", "classica"),     # Tucidide
    "tlg0004": ("biografia", "imperiale"),       # Diogene Laerzio
    "tlg0005": ("lirica", "ellenistica"),        # Teocrito
    "tlg0006": ("tragedia", "classica"),         # Euripide
    "tlg0007": ("biografia", "imperiale"),       # Plutarco
    "tlg0008": ("erudizione", "imperiale"),      # Ateneo
    "tlg0010": ("oratoria", "classica"),         # Isocrate
    "tlg0011": ("tragedia", "classica"),         # Sofocle
    "tlg0012": ("epica", "arcaica"),             # Omero
    "tlg0013": ("epica", "arcaica"),             # Inni omerici
    "tlg0014": ("oratoria", "classica"),         # Demostene
    "tlg0016": ("storiografia", "classica"),     # Erodoto
    "tlg0017": ("oratoria", "classica"),         # Iseo
    "tlg0019": ("commedia", "classica"),         # Aristofane
    "tlg0020": ("didascalica", "arcaica"),       # Esiodo
    "tlg0023": ("didascalica", "imperiale"),     # Oppiano
    "tlg0024": ("didascalica", "imperiale"),     # Oppiano di Apamea
    "tlg0026": ("oratoria", "classica"),         # Eschine
    "tlg0027": ("oratoria", "classica"),         # Andocide
    "tlg0028": ("oratoria", "classica"),         # Antifonte
    "tlg0029": ("oratoria", "classica"),         # Dinarco
    "tlg0030": ("oratoria", "classica"),         # Iperide
    "tlg0031": ("religione", "imperiale"),       # Nuovo Testamento
    "tlg0032": ("storiografia", "classica"),     # Senofonte
    "tlg0033": ("lirica", "classica"),           # Pindaro
    "tlg0034": ("oratoria", "classica"),         # Licurgo
    "tlg0035": ("lirica", "ellenistica"),        # Mosco
    "tlg0036": ("lirica", "ellenistica"),        # Bione
    "tlg0057": ("medicina", "imperiale"),        # Galeno
    "tlg0058": ("tecnica", "classica"),          # Enea Tattico
    "tlg0059": ("filosofia", "classica"),        # Platone
    "tlg0060": ("storiografia", "ellenistica"),  # Diodoro Siculo
    "tlg0061": ("satira", "imperiale"),          # Pseudo-Luciano
    "tlg0062": ("satira", "imperiale"),          # Luciano
    "tlg0074": ("storiografia", "imperiale"),    # Arriano
    "tlg0081": ("retorica", "ellenistica"),      # Dionigi di Alicarnasso
    "tlg0085": ("tragedia", "classica"),         # Eschilo
    "tlg0086": ("filosofia", "classica"),        # Aristotele
    "tlg0090": ("geografia", "imperiale"),       # Agatemero
    "tlg0093": ("scienze", "ellenistica"),       # Teofrasto
    "tlg0094": ("erudizione", "imperiale"),      # Pseudo-Plutarco
    "tlg0099": ("geografia", "imperiale"),       # Strabone
    "tlg0199": ("lirica", "classica"),           # Bacchilide
    "tlg0284": ("retorica", "imperiale"),        # Elio Aristide
    "tlg0341": ("lirica", "ellenistica"),        # Licofrone
    "tlg0363": ("scienze", "imperiale"),         # Tolomeo
    "tlg0385": ("storiografia", "imperiale"),    # Cassio Dione
    "tlg0525": ("geografia", "imperiale"),       # Pausania
    "tlg0526": ("storiografia", "imperiale"),    # Flavio Giuseppe
    "tlg0527": ("religione", "ellenistica"),     # Antico Testamento (LXX)
    "tlg0532": ("romanzo", "imperiale"),         # Achille Tazio
    "tlg0533": ("elegia", "ellenistica"),        # Callimaco
    "tlg0535": ("oratoria", "classica"),         # Demade
    "tlg0540": ("oratoria", "classica"),         # Lisia
    "tlg0543": ("storiografia", "ellenistica"),  # Polibio
    "tlg0545": ("erudizione", "imperiale"),      # Eliano
    "tlg0548": ("mitografia", "imperiale"),      # Apollodoro
    "tlg0551": ("storiografia", "imperiale"),    # Appiano
    "tlg0554": ("romanzo", "imperiale"),         # Caritone
    "tlg0555": ("religione", "imperiale"),       # Clemente Alessandrino
    "tlg0556": ("tecnica", "ellenistica"),       # Asclepiodoto
    "tlg0557": ("filosofia", "imperiale"),       # Epitteto
    "tlg0560": ("retorica", "imperiale"),        # Longino
    "tlg0561": ("romanzo", "imperiale"),         # Longo Sofista
    "tlg0562": ("filosofia", "imperiale"),       # Marco Aurelio
    "tlg0612": ("retorica", "imperiale"),        # Dione Crisostomo
    "tlg0613": ("retorica", "ellenistica"),      # Demetrio Falereo
    "tlg0627": ("medicina", "classica"),         # Ippocrate
    "tlg0638": ("biografia", "imperiale"),       # Filostrato
    "tlg0641": ("romanzo", "imperiale"),         # Senofonte Efesio
    "tlg0646": ("religione", "imperiale"),       # Pseudo-Giustino
    "tlg0647": ("epica", "tarda"),               # Trifiodoro
    "tlg0648": ("tecnica", "imperiale"),         # Onasandro
    "tlg0652": ("retorica", "imperiale"),        # Filostrato minore
    "tlg0653": ("didascalica", "ellenistica"),   # Arato
    "tlg0655": ("mitografia", "ellenistica"),    # Partenio
    "tlg0719": ("medicina", "imperiale"),        # Areteo
    "tlg1216": ("religione", "imperiale"),       # Lettera di Barnaba
    "tlg1271": ("religione", "imperiale"),       # Clemente Romano
    "tlg1311": ("religione", "imperiale"),       # Didaché
    "tlg1389": ("erudizione", "imperiale"),      # Arpocrazione
    "tlg1419": ("religione", "imperiale"),       # Erma
    "tlg1443": ("religione", "imperiale"),       # Ignazio d'Antiochia
    "tlg1484": ("religione", "imperiale"),       # Martirio di Policarpo
    "tlg1600": ("retorica", "imperiale"),        # Filostrato sofista
    "tlg1622": ("religione", "imperiale"),       # Policarpo
    "tlg1799": ("scienze", "ellenistica"),       # Euclide
    "tlg2003": ("retorica", "tarda"),            # Giuliano imperatore
    "tlg2018": ("religione", "tarda"),           # Eusebio di Cesarea
    "tlg2040": ("religione", "tarda"),           # Basilio
    "tlg2045": ("epica", "tarda"),               # Nonno di Panopoli
    "tlg2046": ("epica", "tarda"),               # Quinto Smirneo
    "tlg2934": ("religione", "tarda"),           # Giovanni Damasceno
    "tlg3135": ("storiografia", "tarda"),        # Zonara
    "tlg4029": ("storiografia", "tarda"),        # Procopio
    "tlg4036": ("filosofia", "tarda"),           # Proclo
    "tlg4081": ("epica", "tarda"),               # Colluto
    "tlg4091": ("retorica", "tarda"),            # Callistrato
    "tlg7000": ("antologia", "ellenistica"),     # Antologia Palatina
}

TEXTGROUPS = {**LAT, **GRC}

# ── NOMI ITALIANI degli autori ────────────────────────────────────────────
# I file CTS danno la forma bibliotecaria inglese («Cicero, Marcus Tullius»,
# «Thucydides»): illeggibile in un catalogo per il liceo. Qui la forma con cui
# l'autore si chiama in italiano. Chi manca tiene il nome CTS (mai inventato).
NAMES = {
    # latini
    "phi0119": "Plauto", "phi0134": "Terenzio", "phi0426": "Pseudo-Cesare",
    "phi0428": "Pseudo-Cesare", "phi0430": "Pseudo-Cesare", "phi0448": "Cesare",
    "phi0472": "Catullo", "phi0474": "Cicerone", "phi0478": "Quinto Tullio Cicerone",
    "phi0550": "Lucrezio", "phi0588": "Cornelio Nepote", "phi0620": "Properzio",
    "phi0631": "Sallustio", "phi0660": "Tibullo", "phi0690": "Virgilio",
    "phi0836": "Celso", "phi0845": "Columella", "phi0860": "Curzio Rufo",
    "phi0893": "Orazio", "phi0914": "Livio", "phi0917": "Lucano",
    "phi0959": "Ovidio", "phi0969": "Persio", "phi0972": "Petronio",
    "phi0975": "Fedro", "phi0978": "Plinio il Vecchio", "phi1002": "Quintiliano",
    "phi1014": "Seneca il Vecchio", "phi1017": "Seneca", "phi1020": "Stazio",
    "phi1035": "Valerio Flacco", "phi1038": "Valerio Massimo", "phi1056": "Vitruvio",
    "phi1212": "Apuleio", "phi1221": "Augusto", "phi1242": "Floro",
    "phi1254": "Aulo Gellio", "phi1276": "Giovenale", "phi1294": "Marziale",
    "phi1318": "Plinio il Giovane", "phi1345": "Silio Italico", "phi1348": "Svetonio",
    "phi1351": "Tacito", "phi2331": "Historia Augusta",
    "stoa0023": "Ammiano Marcellino", "stoa0045": "Ausonio", "stoa0058": "Boezio",
    "stoa0089": "Claudiano", "stoa0162": "Girolamo", "stoa0203": "Minucio Felice",
    "stoa0238": "Prudenzio", "stoa0255": "Seneca", "stoa0275": "Tertulliano",
    "stoa0276": "Pseudo-Tertulliano",
    "phi0692": "Appendix Vergiliana", "phi2003": "Apicio", "stoa0040": "Agostino",
    "stoa0054": "Beda il Venerabile", "stoa0079": "Catone", "stoa0261": "Sidonio Apollinare",
    # greci
    "tlg0001": "Apollonio Rodio", "tlg0003": "Tucidide", "tlg0004": "Diogene Laerzio",
    "tlg0005": "Teocrito", "tlg0006": "Euripide", "tlg0007": "Plutarco",
    "tlg0008": "Ateneo", "tlg0010": "Isocrate", "tlg0011": "Sofocle",
    "tlg0012": "Omero", "tlg0013": "Inni omerici", "tlg0014": "Demostene",
    "tlg0016": "Erodoto", "tlg0017": "Iseo", "tlg0019": "Aristofane",
    "tlg0020": "Esiodo", "tlg0023": "Oppiano", "tlg0024": "Oppiano di Apamea",
    "tlg0026": "Eschine", "tlg0027": "Andocide", "tlg0028": "Antifonte",
    "tlg0029": "Dinarco", "tlg0030": "Iperide", "tlg0031": "Nuovo Testamento",
    "tlg0032": "Senofonte", "tlg0033": "Pindaro", "tlg0034": "Licurgo",
    "tlg0035": "Mosco", "tlg0036": "Bione", "tlg0057": "Galeno",
    "tlg0058": "Enea Tattico", "tlg0059": "Platone", "tlg0060": "Diodoro Siculo",
    "tlg0061": "Pseudo-Luciano", "tlg0062": "Luciano", "tlg0074": "Arriano",
    "tlg0081": "Dionigi di Alicarnasso", "tlg0085": "Eschilo", "tlg0086": "Aristotele",
    "tlg0090": "Agatemero", "tlg0093": "Teofrasto", "tlg0094": "Pseudo-Plutarco",
    "tlg0099": "Strabone", "tlg0199": "Bacchilide", "tlg0284": "Elio Aristide",
    "tlg0341": "Licofrone", "tlg0363": "Tolomeo", "tlg0385": "Cassio Dione",
    "tlg0525": "Pausania", "tlg0526": "Flavio Giuseppe", "tlg0527": "Antico Testamento",
    "tlg0532": "Achille Tazio", "tlg0533": "Callimaco", "tlg0535": "Demade",
    "tlg0540": "Lisia", "tlg0543": "Polibio", "tlg0545": "Eliano",
    "tlg0548": "Apollodoro", "tlg0551": "Appiano", "tlg0554": "Caritone",
    "tlg0555": "Clemente Alessandrino", "tlg0556": "Asclepiodoto", "tlg0557": "Epitteto",
    "tlg0560": "Longino", "tlg0561": "Longo Sofista", "tlg0562": "Marco Aurelio",
    "tlg0612": "Dione Crisostomo", "tlg0613": "Demetrio Falereo", "tlg0627": "Ippocrate",
    "tlg0638": "Filostrato", "tlg0641": "Senofonte Efesio", "tlg0646": "Pseudo-Giustino",
    "tlg0647": "Trifiodoro", "tlg0648": "Onasandro", "tlg0652": "Filostrato minore",
    "tlg0653": "Arato", "tlg0655": "Partenio", "tlg0719": "Areteo",
    "tlg1216": "Lettera di Barnaba", "tlg1271": "Clemente Romano", "tlg1311": "Didaché",
    "tlg1389": "Arpocrazione", "tlg1419": "Erma", "tlg1443": "Ignazio di Antiochia",
    "tlg1484": "Martirio di Policarpo", "tlg1600": "Filostrato sofista",
    "tlg1622": "Policarpo", "tlg1799": "Euclide", "tlg2003": "Giuliano imperatore",
    "tlg2018": "Eusebio di Cesarea", "tlg2040": "Basilio di Cesarea",
    "tlg2045": "Nonno di Panopoli", "tlg2046": "Quinto Smirneo",
    "tlg2934": "Giovanni Damasceno", "tlg3135": "Zonara", "tlg4029": "Procopio",
    "tlg4036": "Proclo", "tlg4081": "Colluto", "tlg4091": "Callistrato",
    "tlg7000": "Antologia Palatina",
}


def name_for(textgroup, cts_name):
    """Nome italiano se lo conosciamo, altrimenti quello del catalogo CTS."""
    return NAMES.get(textgroup) or cts_name


# ── AUTORI CHE SONO UNA PERSONA SOLA ──────────────────────────────────────
# Perseus divide per «textgroup», che è un'unità di TRASMISSIONE, non un autore:
# lo stesso scrittore può stare in due gruppi perché le sue opere sono arrivate
# per strade diverse. Nel catalogo il risultato è un autore che compare due o
# tre volte, ciascuna con una fetta delle sue opere — e uno studente che cerca
# Seneca ne trova due, senza modo di sapere quale contenga cosa.
#
# La chiave è il textgroup da assorbire, il valore quello che resta.
#  · Seneca: le tragedie e le opere in prosa stanno in due gruppi (phi1017 /
#    stoa0255), ma sono lo stesso Lucio Anneo Seneca. Fondendoli l'autore
#    riacquista tutti e cinque i suoi generi — ed è il caso per cui i
#    separatori di genere nell'elenco delle opere servono davvero.
#  · Pseudo-Cesare: tre gruppi per i tre libri del corpus cesariano non
#    autentici (Africo, Alessandrino, Ispaniense). La distinzione fra i tre
#    anonimi continuatori è filologia: per chi legge, pseudo è pseudo.
# Attenzione: la fusione riguarda SOLO l'identità dell'autore. Genere ed epoca
# restano calcolati sul textgroup ORIGINALE, altrimenti le tragedie di Seneca
# erediterebbero il genere dei Dialogi.
FUSIONI = {
    "stoa0255": "phi1017",     # Seneca · Dialogi → Seneca
    "phi0428": "phi0426",      # Pseudo-Cesare · Bellum Alexandrinum
    "phi0430": "phi0426",      # Pseudo-Cesare · Bellum Hispaniense
    # Il textgroup «Pseudo-Tertulliano» contiene UNA SOLA opera, l'Ad uxorem —
    # che di Tertulliano è autentica (c. 203). Lo dice il file stesso: l'edizione
    # è l'Oehler delle opere GENUINE e l'incipit è «Dignum duxi, dilectissima
    # mihi in domino conserva…». Lo «pseudo» viene solo dal gruppo in cui
    # Perseus l'ha collocata, e intanto fra le 30 opere di Tertulliano quella
    # mancava. Fondendo, l'opera torna dove le altre la aspettavano e il
    # catalogo perde un autore che non è mai esistito.
    "stoa0276": "stoa0275",    # Pseudo-Tertulliano · Ad uxorem → Tertulliano
}


def canonico(textgroup):
    """Il textgroup sotto cui l'autore va mostrato in catalogo."""
    return FUSIONI.get(textgroup, textgroup)


# ── CRONOLOGIA DEGLI AUTORI ───────────────────────────────────────────────
# Anno approssimativo di *floruit* (negativo = a.C.). Serve a ordinare gli
# autori come si affrontano in classe — per tempo, non per alfabeto: dentro
# l'età classica greca Erodoto viene prima di Demostene, e nessuna lista
# alfabetica lo direbbe.
#
# Sono APPROSSIMAZIONI dichiarate, non date d'archivio: per molti antichi la
# cronologia è discussa e per alcuni ignota. Servono a mettere in fila, non a
# datare; l'interfaccia infatti non le mostra mai come anni.
CRONO = {
    # ── latini ────────────────────────────────────────────────────────────
    "stoa0079": -180, "phi0119": -200, "phi0134": -165,
    # Gli anni pari lasciavano decidere all'alfabeto, e usciva Tibullo prima di
    # Virgilio: qui la successione conta più della precisione della data, perché
    # è la sequenza in cui gli autori si affrontano.
    "phi0474": -63, "phi0550": -58, "phi0472": -57,
    "phi0448": -55, "phi0478": -54, "phi0426": -45, "phi0428": -45, "phi0430": -45,
    "phi0631": -40, "phi0588": -35,
    "phi0690": -29, "phi0893": -23, "phi0660": -22, "phi0620": -20,
    "phi1056": -21, "phi0692": -12, "phi0914": -10, "phi1221": 10, "phi0959": 5,
    "phi0836": 30, "phi1014": 20, "phi1038": 30, "phi0975": 40,
    "phi0860": 50, "phi2003": 50, "phi1017": 55, "stoa0255": 55,
    "phi0969": 60, "phi0972": 60, "phi0845": 60, "phi0917": 62,
    "phi0978": 70, "phi1035": 85, "phi1020": 90, "phi1345": 90,
    "phi1002": 90, "phi1294": 90, "phi1318": 105, "phi1351": 105,
    "phi1276": 110, "phi1348": 120, "phi1242": 120,
    "phi1212": 160, "phi1254": 160,
    "stoa0203": 200, "stoa0275": 200, "stoa0276": 220,
    "phi2331": 380, "stoa0023": 385, "stoa0162": 390, "stoa0045": 375,
    "stoa0089": 400, "stoa0238": 400, "stoa0040": 400,
    "stoa0261": 470, "stoa0058": 520, "stoa0054": 720,
    # ── greci ─────────────────────────────────────────────────────────────
    "tlg0012": -750, "tlg0020": -700, "tlg0013": -650,
    "tlg0085": -470, "tlg0033": -480, "tlg0199": -470,
    "tlg0016": -440, "tlg0011": -440, "tlg0006": -430,
    "tlg0003": -420, "tlg0028": -420, "tlg0627": -410, "tlg0019": -410,
    "tlg0027": -400, "tlg0540": -395, "tlg0032": -390,
    "tlg0059": -380, "tlg0010": -380, "tlg0017": -370,
    "tlg0058": -350, "tlg0014": -345, "tlg0026": -345,
    "tlg0086": -340, "tlg0030": -340, "tlg0034": -330, "tlg0535": -330,
    "tlg0029": -320, "tlg0093": -310, "tlg0613": -300, "tlg1799": -290,
    "tlg0005": -270, "tlg0341": -270, "tlg0653": -270,
    "tlg0533": -260, "tlg0001": -250, "tlg0527": -250,
    "tlg0543": -150, "tlg0035": -150, "tlg0036": -100,
    "tlg0556": -50, "tlg0060": -40, "tlg0655": -30, "tlg0081": -20,
    "tlg0099": 10, "tlg0560": 50, "tlg0554": 60, "tlg0648": 60,
    "tlg0031": 60, "tlg0526": 80, "tlg1271": 96,
    "tlg0007": 100, "tlg0612": 100, "tlg1311": 100,
    "tlg0557": 110, "tlg1443": 110, "tlg1216": 120, "tlg1622": 130,
    "tlg0074": 140, "tlg1419": 140,
    "tlg0548": 150, "tlg0363": 150, "tlg0551": 150, "tlg0719": 150,
    "tlg0641": 150, "tlg1484": 160, "tlg0284": 160,
    "tlg0062": 165, "tlg0532": 170, "tlg0525": 170,
    "tlg0057": 175, "tlg0562": 175, "tlg0023": 180, "tlg1389": 180,
    "tlg0061": 180,
    "tlg0008": 200, "tlg0090": 200, "tlg0094": 200, "tlg0545": 200,
    "tlg0555": 200, "tlg0561": 200, "tlg0646": 200,
    "tlg0024": 215, "tlg0385": 220, "tlg0638": 220, "tlg1600": 220,
    "tlg0004": 230, "tlg0652": 250, "tlg0647": 280,
    "tlg4091": 300, "tlg2018": 320, "tlg2003": 360, "tlg2040": 370,
    "tlg2046": 380, "tlg2045": 450, "tlg4036": 460, "tlg4081": 500,
    "tlg4029": 550, "tlg2934": 730, "tlg7000": 900, "tlg3135": 1120,
}

# Quando l'anno manca, l'autore si colloca comunque nella sua epoca invece di
# finire in testa o in coda a caso.
EPOCH_FALLBACK = {
    "arcaica": -600, "repubblicana": -80, "classica": -420, "augustea": -15,
    "ellenistica": -200, "imperiale": 120, "tarda": 400, "non datata": 9999,
}


def year_for(textgroup, epoch=None):
    """Anno d'ordinamento. `None` non esiste: chi manca prende l'epoca."""
    if textgroup in CRONO:
        return CRONO[textgroup]
    return EPOCH_FALLBACK.get(epoch, 9999)

# ── Eccezioni PER OPERA ───────────────────────────────────────────────────
# Solo dove il genere dell'autore mente sull'opera. Queste escono NON dedotte.
WORKS = {
    "phi0959.phi006": ("epica", "augustea"),        # Ovidio · Metamorfosi
    "phi0959.phi002": ("didascalica", "augustea"),  # Ovidio · Ars amatoria
    "phi0474.phi055": ("filosofia", "repubblicana"),# Cicerone · De officiis
    "phi0474.phi052": ("filosofia", "repubblicana"),# Cicerone · De amicitia
    "phi0474.phi051": ("filosofia", "repubblicana"),# Cicerone · De senectute
    "phi0474.phi054": ("filosofia", "repubblicana"),# Cicerone · De natura deorum
    "phi0474.phi058": ("epistolografia", "repubblicana"),  # Cic. · Ad Atticum
    "phi0474.phi057": ("epistolografia", "repubblicana"),  # Cic. · Ad familiares
    "phi0474.phi056": ("retorica", "repubblicana"), # Cicerone · De oratore
    "phi0893.phi004": ("satira", "augustea"),       # Orazio · Sermones
    "phi0893.phi005": ("epistolografia", "augustea"),# Orazio · Epistulae
    "tlg0032.tlg006": ("storiografia", "classica"), # Senofonte · Anabasi
    "tlg0032.tlg002": ("filosofia", "classica"),    # Senofonte · Memorabili
    "tlg0086.tlg010": ("filosofia", "classica"),    # Aristotele · Etica Nic.
    "tlg0086.tlg035": ("retorica", "classica"),     # Aristotele · Poetica
    "tlg0086.tlg038": ("retorica", "classica"),     # Aristotele · Retorica
    "tlg0020.tlg001": ("didascalica", "arcaica"),   # Esiodo · Teogonia
    # `phi1017` è il gruppo delle tragedie, ma ospita anche quattro prose:
    # senza queste eccezioni finirebbero in catalogo fra i drammi.
    "phi1017.phi011": ("satira", "imperiale"),          # Apocolocintosi
    "phi1017.phi013": ("filosofia", "imperiale"),       # De beneficiis
    "phi1017.phi014": ("filosofia", "imperiale"),       # De clementia
    "phi1017.phi015": ("epistolografia", "imperiale"),  # Lettere a Lucilio
}

UNKNOWN = ("non classificato", "non datata")


def meta_for(textgroup, work_key):
    """(genere, epoca, inferred). `work_key` = '<tg>.<wk>'."""
    if work_key in WORKS:
        g, e = WORKS[work_key]
        return g, e, False                      # curata a mano
    if textgroup in TEXTGROUPS:
        g, e = TEXTGROUPS[textgroup]
        return g, e, True                       # dedotta dall'autore
    g, e = UNKNOWN
    return g, e, True
