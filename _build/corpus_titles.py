#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
corpus_titles.py · Poetrify — ramo CORPUS
==========================================
Titolo d'uso ITALIANO delle opere del canone scolastico.

PERCHÉ NON SI CHIAMA «TITOLO TRADOTTO»
--------------------------------------
Perché la vulgata scolastica e le edizioni italiane non traducono: **scelgono**.
Ci sono tre regimi, e vanno tenuti distinti o la scheda dell'opera mente:

  1. **Titolo italiano corrente** — nessuno dice «Aeneis» o «Pharsalia»: si dice
     *Eneide*, *Farsaglia*, *Le Catilinarie*, *La congiura di Catilina*.
  2. **Titolo latino che È la forma italiana d'uso** — nessuno dice «La natura
     delle cose» al posto di *De rerum natura*, né traduce *Satyricon*, *Brutus*,
     *Orator*, *Topica*, *Fasti*. Qui il valore è `None`: significa «curato, e
     l'uso italiano è il titolo originale».
  3. **Doppio uso** — *Ars amatoria* / *L'arte di amare*, *Institutio oratoria* /
     *L'istituzione oratoria*, *Tristia* / *Tristezze*. Si sceglie la forma più
     diffusa nei manuali e la si dichiara qui; l'altra resta nel titolo originale,
     che la scheda mostra comunque nella seconda fascia.

LE TRE RISPOSTE POSSIBILI (contratto con l'interfaccia)
-------------------------------------------------------
    id presente con stringa → 1ª fascia: italiano · 2ª fascia: originale
    id presente con None    → una fascia sola: l'originale (è già l'uso italiano)
    id assente              → non curato: 1ª fascia originale, 2ª fascia inglese
                              marcato «en» (ripiego dichiarato, mai inventato)

Quest'ultimo caso è la maggioranza del corpus, ed è giusto così: dei 1.166 testi
importati la coda è fatta di trattati medici, omelie e scoli che nessuno cercherà
mai per titolo italiano. Qui si cura **il canone che si legge a scuola**.

ORDINE
------
Gli autori seguono l'**ordine scolastico diacronico** — quello in cui si
affrontano in classe, non l'alfabetico — così la tavola si legge e si mantiene
come un programma. Le opere di ciascun autore seguono l'ordine tradizionale.
"""

# ══════════════════════════════════════════════════════════════════════════
# LETTERATURA LATINA
# ══════════════════════════════════════════════════════════════════════════

LAT = {}

# ── ETÀ ARCAICA ───────────────────────────────────────────────────────────
# Plauto — le commedie circolano in italiano per lo più col titolo latino;
# fa eccezione il gruppo entrato nell'uso comune.
LAT.update({
    "phi0119.phi001": "Anfitrione",
    "phi0119.phi002": None,                       # Asinaria
    "phi0119.phi003": None,                       # Aulularia
    "phi0119.phi004": "Le Bacchidi",
    "phi0119.phi005": "I prigionieri",
    "phi0119.phi006": None,                       # Casina
    "phi0119.phi007": None,                       # Cistellaria
    "phi0119.phi008": None,                       # Curculio
    "phi0119.phi009": "Epidico",
    "phi0119.phi010": "I Menecmi",
    "phi0119.phi011": "Il mercante",
    "phi0119.phi012": "Il soldato fanfarone",
    "phi0119.phi013": None,                       # Mostellaria
    "phi0119.phi014": "Il Persiano",
    "phi0119.phi015": "Il Cartaginese",
    "phi0119.phi016": "Pseudolo",
    "phi0119.phi017": "La gomena",                # Rudens
    "phi0119.phi018": "Stico",
    "phi0119.phi019": "Le tre monete",            # Trinummus
    "phi0119.phi020": None,                       # Truculentus
})

# Terenzio
LAT.update({
    "phi0134.phi001": None,                       # Andria
    "phi0134.phi002": None,                       # Heautontimorumenos («Il punitore di sé stesso»)
    "phi0134.phi003": "L'eunuco",
    "phi0134.phi004": "Formione",
    "phi0134.phi005": "La suocera",
    "phi0134.phi006": "Gli Adelfi",
})

# Catone
LAT.update({"stoa0079.stoa001": None})            # De agri cultura

# ── ETÀ REPUBBLICANA ──────────────────────────────────────────────────────
LAT.update({
    "phi0550.phi001": None,                       # Lucrezio · De rerum natura
    "phi0472.phi001": "Carmi",                    # Catullo
    "phi0448.phi001": "La guerra gallica",        # Cesare
    "phi0448.phi002": "La guerra civile",
})

# Cornelio Nepote — le singole vite del De viris illustribus
LAT.update({
    "phi0588.abo001": "Vita di Milziade",   "phi0588.abo002": "Vita di Temistocle",
    "phi0588.abo003": "Vita di Aristide",   "phi0588.abo004": "Vita di Pausania",
    "phi0588.abo005": "Vita di Cimone",     "phi0588.abo006": "Vita di Lisandro",
    "phi0588.abo007": "Vita di Alcibiade",  "phi0588.abo008": "Vita di Trasibulo",
    "phi0588.abo009": "Vita di Conone",     "phi0588.abo010": "Vita di Dione",
})

# Cicerone · orazioni (ordine tradizionale)
LAT.update({
    "phi0474.phi001": "Per Publio Quinzio",
    "phi0474.phi002": "Per Sesto Roscio Amerino",
    "phi0474.phi003": "Per Quinto Roscio comico",
    "phi0474.phi004": "Divinazione contro Quinto Cecilio",
    "phi0474.phi005": "Le Verrine",
    "phi0474.phi006": "Per Marco Tullio",
    "phi0474.phi007": "Per Marco Fonteio",
    "phi0474.phi008": "Per Aulo Cecina",
    "phi0474.phi009": "Per la legge Manilia",
    "phi0474.phi010": "Per Aulo Cluenzio",
    "phi0474.phi011": "Le agrarie",
    "phi0474.phi012": "Per Gaio Rabirio",
    "phi0474.phi013": "Le Catilinarie",
    "phi0474.phi014": "Per Lucio Murena",
    "phi0474.phi015": "Per Publio Silla",
    "phi0474.phi016": "Per il poeta Archia",
    "phi0474.phi017": "Per Lucio Flacco",
    "phi0474.phi018": "Al popolo dopo il ritorno",
    "phi0474.phi019": "Al senato dopo il ritorno",
    "phi0474.phi020": "La sua casa",
    "phi0474.phi021": "La risposta degli aruspici",
    "phi0474.phi022": "Per Publio Sestio",
    "phi0474.phi023": "Contro Vatinio",
    "phi0474.phi024": "Per Marco Celio",
    "phi0474.phi025": "Le province consolari",
    "phi0474.phi026": "Per Lucio Cornelio Balbo",
    "phi0474.phi027": "Contro Pisone",
    "phi0474.phi028": "Per Gneo Plancio",
    "phi0474.phi029": "Per Marco Scauro",
    "phi0474.phi030": "Per Gaio Rabirio Postumo",
    "phi0474.phi031": "Per Tito Annio Milone",
    "phi0474.phi032": "Per Marco Marcello",
    "phi0474.phi033": "Per Quinto Ligario",
    "phi0474.phi034": "Per il re Deiotaro",
    "phi0474.phi035": "Le Filippiche",
})
# Cicerone · retorica — qui il latino è la forma corrente, salvo i due «oratori»
LAT.update({
    "phi0474.phi036": "L'invenzione retorica",
    "phi0474.phi037": "Dell'oratore",             # De oratore
    "phi0474.phi038": None,                       # Partitiones oratoriae
    "phi0474.phi039": None,                       # Brutus
    "phi0474.phi040": "L'oratore",                # Orator
    "phi0474.phi041": "Il miglior genere di oratori",
    "phi0474.phi042": None,                       # Topica
})
# Cicerone · filosofia
LAT.update({
    "phi0474.phi043": "Lo Stato",                 # De re publica
    "phi0474.phi045": "Questioni accademiche",
    "phi0474.phi046": "Questioni accademiche",
    "phi0474.phi047": "I paradossi degli Stoici",
    "phi0474.phi048": None,                       # De finibus bonorum et malorum
    "phi0474.phi049": "Le Tusculane",
    "phi0474.phi050": "La natura degli dèi",
    "phi0474.phi051": "La vecchiaia",             # De senectute (Cato maior)
    "phi0474.phi052": "L'amicizia",               # De amicitia (Laelius)
    "phi0474.phi053": "La divinazione",
    "phi0474.phi054": "Il fato",
    "phi0474.phi055": "I doveri",                 # De officiis
    "phi0474.phi072": "Timeo",                    # versione ciceroniana di Platone
})
# Cicerone · epistolari
LAT.update({
    "phi0474.phi056": "Lettere ai familiari",
    "phi0474.phi057": "Lettere ad Attico",
    "phi0474.phi058": "Lettere al fratello Quinto",
    "phi0474.phi059": "Lettere a Bruto",
})

# Sallustio
LAT.update({
    "phi0631.phi001": "La congiura di Catilina",
    "phi0631.phi002": "La guerra giugurtina",
    "phi0631.phi003": "Le Storie",
})

# ── ETÀ AUGUSTEA ──────────────────────────────────────────────────────────
LAT.update({
    "phi0690.phi001": "Bucoliche",                # Virgilio
    "phi0690.phi002": "Georgiche",
    "phi0690.phi003": "Eneide",
})
LAT.update({
    "phi0893.phi001": "Odi",                      # Orazio · Carmina
    "phi0893.phi002": "Carme secolare",
    "phi0893.phi003": "Epodi",
    "phi0893.phi004": "Satire",
    "phi0893.phi005": "Epistole",
    "phi0893.phi006": "Arte poetica",
})
LAT.update({
    "phi0914.phi001": "Storia di Roma dalla fondazione",   # Livio · Ab urbe condita
})
LAT.update({
    "phi0660.phi001": "Elegie",                   # Tibullo
    "phi0660.phi003": None,                       # Corpus Tibullianum
    "phi0620.phi001": "Elegie",                   # Properzio
})
LAT.update({
    "phi0959.phi001": "Amori",                    # Ovidio
    "phi0959.phi002": "Eroidi",                   # Epistulae = Heroides
    "phi0959.phi003": "I cosmetici per il volto femminile",
    "phi0959.phi004": "L'arte di amare",          # doppio uso con «Ars amatoria»
    "phi0959.phi005": "I rimedi dell'amore",
    "phi0959.phi006": "Le metamorfosi",
    "phi0959.phi007": None,                       # Fasti
    "phi0959.phi008": "Tristezze",                # doppio uso con «Tristia»
    "phi0959.phi009": "Lettere dal Ponto",
    "phi0959.phi010": None,                       # Ibis
})
LAT.update({"phi1056.phi001": None})              # Vitruvio · De architectura

# ── ETÀ IMPERIALE ─────────────────────────────────────────────────────────
LAT.update({
    "phi1014.phi001": "Controversie",             # Seneca il Vecchio
    "phi1014.phi002": "Controversie · estratti",
    "phi1014.phi003": "Suasorie",
})
# Seneca · tragedie
LAT.update({
    "phi1017.phi001": "Ercole furioso",
    "phi1017.phi002": "Le Troiane",
    "phi1017.phi003": "Le Fenicie",
    "phi1017.phi004": "Medea",
    "phi1017.phi005": "Fedra",
    "phi1017.phi006": "Edipo",
    "phi1017.phi007": "Agamennone",
    "phi1017.phi008": "Tieste",
    "phi1017.phi009": "Ercole sull'Eta",
    "phi1017.phi010": "Ottavia",
})
# Seneca · prosa
LAT.update({
    "phi1017.phi011": "Apocolocintosi",
    "phi1017.phi013": "I benefici",
    "phi1017.phi014": "La clemenza",
    "phi1017.phi015": "Lettere a Lucilio",
    "stoa0255.stoa004": "La brevità della vita",
    "stoa0255.stoa006": "Consolazione a Elvia",
    "stoa0255.stoa007": "Consolazione a Marcia",
    "stoa0255.stoa008": "Consolazione a Polibio",
    "stoa0255.stoa009": "La fermezza del saggio",
    "stoa0255.stoa010": "L'ira",
    "stoa0255.stoa011": "L'ozio",
    "stoa0255.stoa012": "La provvidenza",
    "stoa0255.stoa013": "La tranquillità dell'animo",
    "stoa0255.stoa014": "La vita felice",
})
LAT.update({
    "phi0972.phi001": None,                       # Petronio · Satyricon
    "phi0917.phi001": "Farsaglia",                # Lucano · Pharsalia
    "phi0969.phi001": "Satire",                   # Persio
    "phi0978.phi001": "Storia naturale",          # Plinio il Vecchio
    "phi1002.phi001": "L'istituzione oratoria",   # Quintiliano
    "phi1294.phi002": "Epigrammi",                # Marziale
    "phi1276.phi001": "Satire",                   # Giovenale
    "phi1318.phi001": "Lettere",                  # Plinio il Giovane
    "phi0975.phi001": "Favole",                   # Fedro
    "phi1254.phi001": "Le notti attiche",         # Aulo Gellio
})
# Tacito
LAT.update({
    "phi1351.phi001": "Agricola",
    "phi1351.phi002": "Germania",
    "phi1351.phi003": "Dialogo degli oratori",
    "phi1351.phi004": "Storie",
    "phi1351.phi005": "Annali",
})
# Svetonio · Vite dei Cesari
LAT.update({
    "phi1348.abo011": "Vita di Cesare",     "phi1348.abo012": "Vita di Augusto",
    "phi1348.abo013": "Vita di Tiberio",    "phi1348.abo014": "Vita di Caligola",
    "phi1348.abo015": "Vita di Claudio",    "phi1348.abo016": "Vita di Nerone",
    "phi1348.abo017": "Vita di Galba",      "phi1348.abo018": "Vita di Otone",
    "phi1348.abo019": "Vita di Vitellio",   "phi1348.abo020": "Vita di Vespasiano",
})
# Apuleio
LAT.update({
    "phi1212.phi001": "Apologia",
    "phi1212.phi002": "Le metamorfosi",            # nota d'uso: «L'asino d'oro»
    "phi1212.phi003": None,                        # Florida
})

# ── TARDA ANTICHITÀ ───────────────────────────────────────────────────────
LAT.update({
    "stoa0023.stoa001": "Storie",                  # Ammiano Marcellino · Res gestae
    "stoa0058.stoa001": "La consolazione della filosofia",   # Boezio
})


# ══════════════════════════════════════════════════════════════════════════
# CORREZIONE DEL TITOLO ORIGINALE
# ══════════════════════════════════════════════════════════════════════════
# Per alcune opere il catalogo Perseus registra come etichetta dell'edizione un
# titolo INGLESE anche quando il testo è latino: l'Eneide arriva come «Aeneid»,
# le Bucoliche come «Eclogues», il Bellum civile come «The Civil Wars». Se la
# seconda fascia della scheda mostrasse quello, prometterebbe l'originale e
# darebbe una traduzione — l'errore peggiore proprio dove si vuole il testo vero.
ORIG = {
    "phi0690.phi001": "Bucolica",
    "phi0690.phi002": "Georgica",
    "phi0690.phi003": "Aeneis",
    "phi0448.phi002": "De bello civili",
    "phi1318.phi001": "Epistulae",
    # greco: qui il catalogo registra titoli inglesi o LATINI su testi greci
    "tlg0020.tlg001": "Θεογονία",              # era «Theogony»
    "tlg0011.tlg008": "Ἰχνευταί",              # era «Ichneutae»
    "tlg0001.tlg001": "Ἀργοναυτικά",           # era «Argonautica» (latino)
    "tlg0562.tlg001": "Τὰ εἰς ἑαυτόν",         # era «Ad Se Ipsum» (latino)
    "tlg0013.tlg001": "εἰς Διόνυσον",          # gli Inni omerici sono tutti in inglese
    "tlg0013.tlg002": "εἰς Δημήτραν",
    "tlg0013.tlg003": "εἰς Ἀπόλλωνα",
    "tlg0013.tlg004": "εἰς Ἑρμῆν",
    "tlg0013.tlg005": "εἰς Ἀφροδίτην",
}


# ══════════════════════════════════════════════════════════════════════════
# LETTERATURA GRECA
# ══════════════════════════════════════════════════════════════════════════
# NOTA DI REGIME — il greco si comporta al contrario del latino. Là il titolo
# originale è spesso la forma italiana corrente (De rerum natura, Satyricon);
# qui quasi mai: nessuno dice «Ἰλιάς» o «Πολιτεία», si dice Iliade e La
# Repubblica. I nomi dei dialoghi platonici (Fedone, Gorgia, Protagora) sono
# già forme ITALIANE — traslitterate e adattate — non greche. Perciò in questa
# sezione il valore `None` non compare quasi mai.

GRC = {}

# ── ETÀ ARCAICA ───────────────────────────────────────────────────────────
GRC.update({
    "tlg0012.tlg001": "Iliade",
    "tlg0012.tlg002": "Odissea",
    "tlg0012.tlg003": "Epigrammi omerici",
})
# Inni omerici — il catalogo li registra in inglese; in italiano sono «Inno a…»
GRC.update({
    "tlg0013.tlg001": "Inno a Dioniso",        "tlg0013.tlg002": "Inno a Demetra",
    "tlg0013.tlg003": "Inno ad Apollo",        "tlg0013.tlg004": "Inno a Ermes",
    "tlg0013.tlg005": "Inno ad Afrodite",      "tlg0013.tlg006": "Inno ad Afrodite (VI)",
    "tlg0013.tlg007": "Inno a Dioniso (VII)",  "tlg0013.tlg008": "Inno ad Ares",
    "tlg0013.tlg009": "Inno ad Artemide",      "tlg0013.tlg010": "Inno ad Afrodite (X)",
    "tlg0013.tlg011": "Inno ad Atena",         "tlg0013.tlg012": "Inno a Era",
    "tlg0013.tlg013": "Inno a Demetra (XIII)", "tlg0013.tlg014": "Inno alla Madre degli dèi",
    "tlg0013.tlg015": "Inno a Eracle",         "tlg0013.tlg016": "Inno ad Asclepio",
    "tlg0013.tlg017": "Inno ai Dioscuri",      "tlg0013.tlg018": "Inno a Ermes (XVIII)",
    "tlg0013.tlg019": "Inno a Pan",            "tlg0013.tlg020": "Inno a Efesto",
    "tlg0013.tlg021": "Inno ad Apollo (XXI)",  "tlg0013.tlg022": "Inno a Poseidone",
})
GRC.update({
    "tlg0020.tlg001": "Teogonia",
    "tlg0020.tlg002": "Le opere e i giorni",
    "tlg0020.tlg003": "Lo scudo di Eracle",
})

# ── ETÀ CLASSICA ──────────────────────────────────────────────────────────
GRC.update({                                   # Pindaro
    "tlg0033.tlg001": "Olimpiche", "tlg0033.tlg002": "Pitiche",
    "tlg0033.tlg003": "Nemee",     "tlg0033.tlg004": "Istmiche",
})
GRC.update({"tlg0199.tlg001": "Epinici", "tlg0199.tlg002": "Ditirambi"})   # Bacchilide

GRC.update({"tlg0016.tlg001": "Le Storie"})                                # Erodoto
GRC.update({"tlg0003.tlg001": "La guerra del Peloponneso"})                # Tucidide

GRC.update({                                   # Eschilo
    "tlg0085.tlg001": "Le supplici",           "tlg0085.tlg002": "I Persiani",
    "tlg0085.tlg003": "Prometeo incatenato",   "tlg0085.tlg004": "I sette contro Tebe",
    "tlg0085.tlg005": "Agamennone",            "tlg0085.tlg006": "Le Coefore",
    "tlg0085.tlg007": "Le Eumenidi",
})
GRC.update({                                   # Sofocle
    "tlg0011.tlg001": "Le Trachinie",          "tlg0011.tlg002": "Antigone",
    "tlg0011.tlg003": "Aiace",                 "tlg0011.tlg004": "Edipo re",
    "tlg0011.tlg005": "Elettra",               "tlg0011.tlg006": "Filottete",
    "tlg0011.tlg007": "Edipo a Colono",        "tlg0011.tlg008": "I cercatori di tracce",
})
GRC.update({                                   # Euripide
    "tlg0006.tlg001": "Il Ciclope",            "tlg0006.tlg002": "Alcesti",
    "tlg0006.tlg003": "Medea",                 "tlg0006.tlg004": "Gli Eraclidi",
    "tlg0006.tlg005": "Ippolito",              "tlg0006.tlg006": "Andromaca",
    "tlg0006.tlg007": "Ecuba",                 "tlg0006.tlg008": "Le supplici",
    "tlg0006.tlg009": "Eracle",                "tlg0006.tlg010": "Ione",
    "tlg0006.tlg011": "Le Troiane",            "tlg0006.tlg012": "Elettra",
    "tlg0006.tlg013": "Ifigenia in Tauride",   "tlg0006.tlg014": "Elena",
    "tlg0006.tlg015": "Le Fenicie",            "tlg0006.tlg016": "Oreste",
    "tlg0006.tlg017": "Le Baccanti",           "tlg0006.tlg018": "Ifigenia in Aulide",
    "tlg0006.tlg019": "Reso",
})
GRC.update({                                   # Aristofane
    "tlg0019.tlg001": "Gli Acarnesi",          "tlg0019.tlg002": "I cavalieri",
    "tlg0019.tlg003": "Le nuvole",             "tlg0019.tlg004": "Le vespe",
    "tlg0019.tlg005": "La pace",               "tlg0019.tlg006": "Gli uccelli",
    "tlg0019.tlg007": "Lisistrata",            "tlg0019.tlg008": "Le Tesmoforiazuse",
    "tlg0019.tlg009": "Le rane",               "tlg0019.tlg010": "Le Ecclesiazuse",
    "tlg0019.tlg011": "Pluto",
})
GRC.update({                                   # Lisia · le orazioni più lette
    "tlg0540.tlg001": "Per l'uccisione di Eratostene",
    "tlg0540.tlg002": "Epitafio",
    "tlg0540.tlg012": "Contro Eratostene",
    "tlg0540.tlg016": "Per Mantiteo",
    "tlg0540.tlg022": "Contro i mercanti di grano",
})
GRC.update({                                   # Isocrate
    "tlg0010.tlg007": "A Demonico",            "tlg0010.tlg008": "Contro i sofisti",
    "tlg0010.tlg009": "Elena",                 "tlg0010.tlg010": "Busiride",
    "tlg0010.tlg011": "Panegirico",            "tlg0010.tlg013": "A Nicocle",
    "tlg0010.tlg014": "Nicocle",               "tlg0010.tlg015": "Evagora",
    "tlg0010.tlg016": "Archidamo",             "tlg0010.tlg017": "Sulla pace",
    "tlg0010.tlg018": "Areopagitico",          "tlg0010.tlg019": "Antidosi",
    "tlg0010.tlg020": "Filippo",               "tlg0010.tlg021": "Panatenaico",
})
GRC.update({                                   # Demostene
    "tlg0014.tlg001": "Prima Olintiaca",       "tlg0014.tlg002": "Seconda Olintiaca",
    "tlg0014.tlg003": "Terza Olintiaca",       "tlg0014.tlg004": "Prima Filippica",
    "tlg0014.tlg005": "Sulla pace",            "tlg0014.tlg006": "Seconda Filippica",
    "tlg0014.tlg008": "Sul Chersoneso",        "tlg0014.tlg009": "Terza Filippica",
    "tlg0014.tlg010": "Quarta Filippica",
    "tlg0014.tlg018": "Sulla corona",          "tlg0014.tlg019": "Sull'ambasceria",
    "tlg0014.tlg021": "Contro Midia",
})
GRC.update({                                   # Eschine
    "tlg0026.tlg001": "Contro Timarco",
    "tlg0026.tlg002": "Sull'ambasceria",
    "tlg0026.tlg003": "Contro Ctesifonte",
})
GRC.update({                                   # Senofonte
    "tlg0032.tlg001": "Elleniche",             "tlg0032.tlg002": "Memorabili",
    "tlg0032.tlg003": "Economico",             "tlg0032.tlg004": "Simposio",
    "tlg0032.tlg005": "Apologia di Socrate",   "tlg0032.tlg006": "Anabasi",
    "tlg0032.tlg007": "Ciropedia",             "tlg0032.tlg008": "Ierone",
    "tlg0032.tlg009": "Agesilao",              "tlg0032.tlg010": "Costituzione degli Spartani",
    "tlg0032.tlg011": "Le entrate",            "tlg0032.tlg012": "Ipparchico",
    "tlg0032.tlg013": "L'arte equestre",       "tlg0032.tlg014": "Cinegetico",
})
GRC.update({                                   # Platone
    "tlg0059.tlg001": "Eutifrone",             "tlg0059.tlg002": "Apologia di Socrate",
    "tlg0059.tlg003": "Critone",               "tlg0059.tlg004": "Fedone",
    "tlg0059.tlg005": "Cratilo",               "tlg0059.tlg006": "Teeteto",
    "tlg0059.tlg007": "Sofista",               "tlg0059.tlg008": "Politico",
    "tlg0059.tlg009": "Parmenide",             "tlg0059.tlg010": "Filebo",
    "tlg0059.tlg011": "Simposio",              "tlg0059.tlg012": "Fedro",
    "tlg0059.tlg013": "Alcibiade primo",       "tlg0059.tlg014": "Alcibiade secondo",
    "tlg0059.tlg015": "Ipparco",               "tlg0059.tlg016": "Gli amanti",
    "tlg0059.tlg017": "Teage",                 "tlg0059.tlg018": "Carmide",
    "tlg0059.tlg019": "Lachete",               "tlg0059.tlg020": "Liside",
    "tlg0059.tlg021": "Eutidemo",              "tlg0059.tlg022": "Protagora",
    "tlg0059.tlg023": "Gorgia",                "tlg0059.tlg024": "Menone",
    "tlg0059.tlg025": "Ippia maggiore",        "tlg0059.tlg026": "Ippia minore",
    "tlg0059.tlg027": "Ione",                  "tlg0059.tlg028": "Menesseno",
    "tlg0059.tlg029": "Clitofonte",            "tlg0059.tlg030": "La Repubblica",
    "tlg0059.tlg031": "Timeo",                 "tlg0059.tlg032": "Crizia",
    "tlg0059.tlg033": "Minosse",               "tlg0059.tlg034": "Le leggi",
    "tlg0059.tlg035": "Epinomide",             "tlg0059.tlg036": "Lettere",
})
GRC.update({                                   # Aristotele
    "tlg0086.tlg003": "Costituzione degli Ateniesi",
    "tlg0086.tlg009": "Etica Eudemia",         "tlg0086.tlg010": "Etica Nicomachea",
    "tlg0086.tlg025": "Metafisica",            "tlg0086.tlg029": "Economici",
    "tlg0086.tlg034": "Poetica",               "tlg0086.tlg035": "Politica",
    "tlg0086.tlg038": "Retorica",              "tlg0086.tlg045": "Sulle virtù e sui vizi",
})

# ── ETÀ ELLENISTICA ───────────────────────────────────────────────────────
GRC.update({
    "tlg0005.tlg001": "Idilli",                "tlg0005.tlg002": "Epigrammi",   # Teocrito
    "tlg0001.tlg001": "Le Argonautiche",                                        # Apollonio Rodio
    "tlg0543.tlg001": "Storie",                                                 # Polibio
    "tlg0060.tlg001": "Biblioteca storica",                                     # Diodoro Siculo
})
GRC.update({                                   # Callimaco
    "tlg0533.tlg003": "Epigrammi",             "tlg0533.tlg004": "Epigrammi",
    "tlg0533.tlg015": "Inno a Zeus",           "tlg0533.tlg016": "Inno ad Apollo",
    "tlg0533.tlg017": "Inno ad Artemide",      "tlg0533.tlg018": "Inno a Delo",
    "tlg0533.tlg019": "Per i lavacri di Pallade",
    "tlg0533.tlg020": "Inno a Demetra",
})

# ── ETÀ IMPERIALE ─────────────────────────────────────────────────────────
GRC.update({
    "tlg0561.tlg001": "Dafni e Cloe",                      # Longo Sofista
    "tlg0562.tlg001": "A se stesso",                       # Marco Aurelio
    "tlg0557.tlg001": "Diatribe",                          # Epitteto
    "tlg0557.tlg002": "Manuale",
    "tlg0525.tlg001": "Periegesi della Grecia",            # Pausania
    "tlg0099.tlg001": "Geografia",                         # Strabone
})

TITLES = {**LAT, **GRC}


def title_for(work_id, original, title_en=None):
    """Restituisce (titolo_principale, titolo_secondario, stato).

    stato: 'it'     → curato, l'uso italiano differisce dall'originale
           'orig'   → curato, l'uso italiano È il titolo originale (una fascia sola)
           'assente'→ non curato: originale in testa, inglese come ripiego marcato
    """
    original = ORIG.get(work_id, original)     # l'originale vero, non l'inglese
    if work_id in TITLES:
        it = TITLES[work_id]
        if it is None:
            return original, None, "orig"
        return it, original, "it"
    return original, title_en, "assente"
