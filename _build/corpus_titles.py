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

REGOLA ADOTTATA (decisione del docente, 31 lug 2026)
----------------------------------------------------
**Se una traduzione italiana del titolo esiste, si mette quella in prima fascia
e il latino passa in seconda.** Il latino resta in testa solo dove una forma
italiana non esiste affatto (Topica, Partitiones oratoriae) o esiste come sola
glossa esplicativa e non come titolo (De architectura), e per le commedie di
Plauto che in italiano si citano col titolo latino.

Va detto con chiarezza, perché è una scelta e non un dato di fatto: una verifica
sull'uso editoriale ha mostrato che **come forma di CITAZIONE prevale il latino**
per parecchie di queste opere — manuali, Treccani e critica dicono «il De rerum
natura», non «La natura delle cose». La forma italiana esiste però come titolo di
edizioni reali in commercio («L'agricoltura», Mondadori; «Bruto», BUR Narducci;
«Il punitore di se stesso», BUR). Qui si è scelto di privilegiare **il titolo che
dice all'allievo di che cosa si tratta**, lasciando il latino subito sotto: la
scheda mostra sempre entrambi, quindi nulla va perduto.
Per invertire un singolo caso basta rimettere `None`.
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
    "phi0134.phi001": "La ragazza di Andro",      # Andria
    "phi0134.phi002": "Il punitore di se stesso", # Heautontimorumenos
    "phi0134.phi003": "L'eunuco",
    "phi0134.phi004": "Formione",
    "phi0134.phi005": "La suocera",
    "phi0134.phi006": "Gli Adelfi",
})

# Catone
LAT.update({"stoa0079.stoa001": "L'agricoltura"})   # De agri cultura

# ── ETÀ REPUBBLICANA ──────────────────────────────────────────────────────
LAT.update({
    "phi0550.phi001": "La natura delle cose",     # Lucrezio · De rerum natura
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
    "phi0474.phi038": None,                       # Partitiones oratoriae — nessuna forma italiana
    "phi0474.phi039": "Bruto",                    # Brutus
    "phi0474.phi040": "L'oratore",                # Orator
    "phi0474.phi041": "Il miglior genere di oratori",
    "phi0474.phi042": None,                       # Topica — mai tradotto in italiano
})
# Cicerone · filosofia
LAT.update({
    "phi0474.phi043": "Lo Stato",                 # De re publica
    "phi0474.phi045": "Questioni accademiche",
    "phi0474.phi046": "Questioni accademiche",
    "phi0474.phi047": "I paradossi degli Stoici",
    "phi0474.phi048": "I termini estremi del bene e del male",   # De finibus
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
# Historia Augusta · le trenta vite
# ---------------------------------------------------------------------------
# Senza titolo italiano queste trenta schede stampavano la stessa stringa due
# volte, perché nel catalogo Perseus il campo «titolo inglese» ripete il latino.
#
# LA CONVENZIONE È DOPPIA, e non per distrazione: l'italiano segue la forma che
# il latino stesso ha. Dove il titolo tradito nomina una PERSONA («Hadrianus»,
# «Probus») l'italiano dice «Vita di X»: sulla card, sopra il latino e accanto
# al nome dell'autore, un «Adriano» nudo si leggerebbe come l'imperatore, non
# come il testo. Dove invece il titolo è un CATALOGO — numerale («Gordiani
# tres») o «Divus» — l'italiano usa la forma determinativa nuda, perché è
# quella che si cita davvero: la verifica ha trovato ZERO occorrenze di «Vita
# dei due Gallieni», che sarebbe una traduzione inventata, contro un uso
# corrente e attestato di «I due Gallieni».
# Per uniformare tutto a «Vita di…» basta riscrivere le sette righe marcate ▸.
LAT.update({
    "phi2331.phi001": "Vita di Adriano",
    "phi2331.phi002": "Vita di Elio Cesare",       # L. Elio Cesare, non il biografo
    "phi2331.phi003": "Vita di Antonino Pio",
    "phi2331.phi004": "Vita di Marco Aurelio",
    "phi2331.phi005": "Vita di Lucio Vero",        # «Lucio» lo distingue da Elio Vero
    "phi2331.phi006": "Vita di Avidio Cassio",
    "phi2331.phi007": "Vita di Commodo",
    "phi2331.phi008": "Vita di Pertinace",
    "phi2331.phi009": "Vita di Didio Giuliano",
    "phi2331.phi010": "Vita di Settimio Severo",   # «Settimio» lo distingue da Alessandro S.
    "phi2331.phi011": "Vita di Pescennio Nigro",
    "phi2331.phi012": "Vita di Clodio Albino",
    "phi2331.phi013": "Vita di Caracalla",
    "phi2331.phi014": "Vita di Geta",
    "phi2331.phi015": "Vita di Macrino",           # storicamente M. Opellio Macrino
    "phi2331.phi016": "Vita di Diadumeniano",      # la persona; il titolo latino ha «Diadumenus»
    "phi2331.phi017": "Vita di Eliogabalo",
    "phi2331.phi018": "Vita di Alessandro Severo",
    "phi2331.phi019": "I due Massimini",           # ▸ catalogo, non vita singola
    "phi2331.phi020": "I tre Gordiani",            # ▸
    "phi2331.phi021": "Vita di Massimo e Balbino", # il «Massimo» è il Pupieno italiano
    "phi2331.phi022": "I due Valeriani",           # ▸
    "phi2331.phi023": "I due Gallieni",            # ▸
    "phi2331.phi024": "I trenta tiranni",          # ▸
    "phi2331.phi025": "Il divo Claudio",           # ▸ Claudio II il Gotico
    "phi2331.phi026": "Il divo Aureliano",         # ▸
    "phi2331.phi027": "Vita di Tacito",            # l'IMPERATORE M. Claudio Tacito
    "phi2331.phi028": "Vita di Probo",
    "phi2331.phi029": "Vita di Firmo, Saturnino, Proculo e Bonoso",
    "phi2331.phi030": "Vita di Caro, Carino e Numeriano",
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

    # Historia Augusta · quattro grafie di Perseus sono corrotte, non varianti.
    # «Clodinus» e «Casius» non sono nomi latini esistenti; «Heliogobalus»
    # rompe la grecizzazione su hélios. In «Firmus Saturninus» la virgola cade
    # nel posto sbagliato e fonde due dei quattro usurpatori in una persona
    # sola: la vita ne racconta quattro.
    "phi2331.phi006": "Avidius Cassius",           # era «Avidius Casius»
    "phi2331.phi012": "Clodius Albinus",           # era «Clodinus Albinus»
    "phi2331.phi017": "Antoninus Heliogabalus",    # era «Antoninus Heliogobalus»
    "phi2331.phi029": "Firmus, Saturninus, Proculus et Bonosus",
    # Non errori, ma titoli monchi o fuori serie rispetto alle altre ventinove.
    "phi2331.phi001": "Hadrianus",                 # era la rubrica «De Vita Hadriani»
    "phi2331.phi002": "Aelius",                    # «Helius» è grafia del Palatino
    "phi2331.phi008": "Helvius Pertinax",          # Perseus tronca il gentilizio
    # Numerali in minuscolo, come nelle edizioni critiche.
    "phi2331.phi019": "Maximini duo",
    "phi2331.phi020": "Gordiani tres",
    "phi2331.phi022": "Valeriani duo",
    "phi2331.phi023": "Gallieni duo",
    "phi2331.phi024": "Tyranni triginta",

    # Ortografia classica · il corpus aveva quattro titoli latini con la J
    # ottocentesca e uno con la I («De Vita Iulii Agricolae»). Correggerne uno
    # solo avrebbe lasciato l'incoerenza altrove: si uniformano tutti.
    "phi2331.phi009": "Didius Iulianus",           # era «Didius Julianus»
    "phi1348.abo011": "Divus Iulius",              # era «Divus Julius» (Svetonio)
    "stoa0275.stoa005": "Adversus Iudaeos liber",  # era «Adversus Judaeos Liber»
    "tlg0627.tlg013": "Iusiurandum",               # era «Jusjurandum» (Ippocrate)
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

# Demostene · il resto del corpus (deliberative, giudiziarie private, epidittiche).
# La nomenclatura italiana dell'oratoria attica è formulare — «Contro X», «Per X»,
# «Sulla Y» — e per questo si può dare per intero senza inventare nulla.
GRC.update({
    "tlg0014.tlg007": "Su Alonneso",
    "tlg0014.tlg011": "Risposta alla lettera di Filippo",
    "tlg0014.tlg012": "Lettera di Filippo",
    "tlg0014.tlg013": "Sull'ordinamento finanziario",
    "tlg0014.tlg014": "Sulle simmorie",
    "tlg0014.tlg015": "Per la libertà dei Rodii",
    "tlg0014.tlg016": "Per i Megalopolitani",
    "tlg0014.tlg017": "Sui trattati con Alessandro",
    "tlg0014.tlg020": "Contro Leptine",
    "tlg0014.tlg022": "Contro Androzione",
    "tlg0014.tlg023": "Contro Aristocrate",
    "tlg0014.tlg024": "Contro Timocrate",
    "tlg0014.tlg025": "Contro Aristogitone · primo discorso",
    "tlg0014.tlg026": "Contro Aristogitone · secondo discorso",
    "tlg0014.tlg027": "Contro Afobo · primo discorso",
    "tlg0014.tlg028": "Contro Afobo · secondo discorso",
    "tlg0014.tlg029": "Contro Afobo, per Fano",
    "tlg0014.tlg030": "Contro Onetore · primo discorso",
    "tlg0014.tlg031": "Contro Onetore · secondo discorso",
    "tlg0014.tlg032": "Contro Zenotemi",
    "tlg0014.tlg033": "Contro Apaturio",
    "tlg0014.tlg034": "Contro Formione, per un prestito",
    "tlg0014.tlg035": "Contro Lacrito",
    "tlg0014.tlg036": "Per Formione",
    "tlg0014.tlg037": "Contro Pantèneto",
    "tlg0014.tlg038": "Contro Nausimaco e Senopite",
    "tlg0014.tlg039": "Contro Beoto, sul nome",
    "tlg0014.tlg040": "Contro Beoto, sulla dote materna",
    "tlg0014.tlg041": "Contro Spudia",
    "tlg0014.tlg042": "Contro Fenippo",
    "tlg0014.tlg043": "Contro Macartato",
    "tlg0014.tlg044": "Contro Leocare",
    "tlg0014.tlg045": "Contro Stefano · primo discorso",
    "tlg0014.tlg046": "Contro Stefano · secondo discorso",
    "tlg0014.tlg047": "Contro Evergo e Mnesibulo",
    "tlg0014.tlg048": "Contro Olimpiodoro",
    "tlg0014.tlg049": "Contro Timoteo",
    "tlg0014.tlg050": "Contro Policle",
    "tlg0014.tlg051": "Sulla corona trierarchica",
    "tlg0014.tlg052": "Contro Callippo",
    "tlg0014.tlg053": "Contro Nicostrato",
    "tlg0014.tlg054": "Contro Conone",
    "tlg0014.tlg055": "Contro Callicle",
    "tlg0014.tlg056": "Contro Dionisodoro",
    "tlg0014.tlg057": "Contro Eubulide",
    "tlg0014.tlg058": "Contro Teocrine",
    "tlg0014.tlg059": "Contro Neera",
    "tlg0014.tlg060": "Epitafio",
    "tlg0014.tlg061": "Erotico",
    "tlg0014.tlg062": "Proemi",
    "tlg0014.tlg063": "Lettere",
})

# Lisia · il resto del corpus
GRC.update({
    "tlg0540.tlg003": "Contro Simone",
    "tlg0540.tlg004": "Per una ferita premeditata",
    "tlg0540.tlg005": "Per Callia",
    "tlg0540.tlg006": "Contro Andocide",
    "tlg0540.tlg007": "Areopagitico, per l'olivo sacro",
    "tlg0540.tlg008": "Accusa di calunnia ai compagni",
    "tlg0540.tlg009": "Per il soldato",
    "tlg0540.tlg010": "Contro Teomnesto · primo discorso",
    "tlg0540.tlg011": "Contro Teomnesto · secondo discorso",
    "tlg0540.tlg013": "Contro Agorato",
    "tlg0540.tlg014": "Contro Alcibiade, per diserzione",
    "tlg0540.tlg015": "Contro Alcibiade, per renitenza",
    "tlg0540.tlg017": "Sui beni di Eratone",
    "tlg0540.tlg018": "Sulla confisca dei beni del fratello di Nicia",
    "tlg0540.tlg019": "Sui beni di Aristofane",
    "tlg0540.tlg020": "Per Polistrato",
    "tlg0540.tlg021": "Difesa da un'accusa di corruzione",
    "tlg0540.tlg023": "Contro Pancleone",
    "tlg0540.tlg024": "Per l'invalido",
    "tlg0540.tlg025": "Difesa dall'accusa di attentato alla democrazia",
    "tlg0540.tlg026": "Sulla dokimasia di Evandro",
    "tlg0540.tlg027": "Contro Epicrate",
    "tlg0540.tlg028": "Contro Ergocle",
    "tlg0540.tlg029": "Contro Filocrate",
    "tlg0540.tlg030": "Contro Nicomaco",
    "tlg0540.tlg031": "Contro Filone",
    "tlg0540.tlg032": "Contro Diogitone",
    "tlg0540.tlg033": "Olimpico",
    "tlg0540.tlg034": "Sul non abolire la costituzione patria",
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

# ── PLUTARCO · Vite parallele ─────────────────────────────────────────────
# Le coppie si citano come «Vita di X»; i pezzi di raffronto (σύγκρισις) come
# «Confronto fra X e Y» — sono opere a sé nel catalogo, non appendici.
GRC.update({
    "tlg0007.tlg001": "Vita di Teseo",      "tlg0007.tlg002": "Vita di Romolo",
    "tlg0007.tlg003": "Confronto fra Teseo e Romolo",
    "tlg0007.tlg004": "Vita di Licurgo",    "tlg0007.tlg005": "Vita di Numa",
    "tlg0007.tlg006": "Confronto fra Licurgo e Numa",
    "tlg0007.tlg007": "Vita di Solone",     "tlg0007.tlg008": "Vita di Publicola",
    "tlg0007.tlg009": "Confronto fra Solone e Publicola",
    "tlg0007.tlg010": "Vita di Temistocle", "tlg0007.tlg011": "Vita di Camillo",
    "tlg0007.tlg012": "Vita di Pericle",    "tlg0007.tlg013": "Vita di Fabio Massimo",
    "tlg0007.tlg014": "Confronto fra Pericle e Fabio Massimo",
    "tlg0007.tlg015": "Vita di Alcibiade",  "tlg0007.tlg016": "Vita di Coriolano",
    "tlg0007.tlg017": "Confronto fra Alcibiade e Coriolano",
    "tlg0007.tlg018": "Vita di Timoleonte", "tlg0007.tlg019": "Vita di Emilio Paolo",
    "tlg0007.tlg020": "Confronto fra Timoleonte ed Emilio Paolo",
    "tlg0007.tlg021": "Vita di Pelopida",   "tlg0007.tlg022": "Vita di Marcello",
    "tlg0007.tlg023": "Confronto fra Pelopida e Marcello",
    "tlg0007.tlg024": "Vita di Aristide",   "tlg0007.tlg025": "Vita di Marco Catone",
    "tlg0007.tlg026": "Confronto fra Aristide e Catone",
    "tlg0007.tlg027": "Vita di Filopemene", "tlg0007.tlg028": "Vita di Tito Flaminino",
    "tlg0007.tlg029": "Confronto fra Filopemene e Tito Flaminino",
    "tlg0007.tlg030": "Vita di Pirro",      "tlg0007.tlg031": "Vita di Gaio Mario",
    "tlg0007.tlg032": "Vita di Lisandro",   "tlg0007.tlg033": "Vita di Silla",
    "tlg0007.tlg034": "Confronto fra Lisandro e Silla",
    "tlg0007.tlg035": "Vita di Cimone",     "tlg0007.tlg036": "Vita di Lucullo",
    "tlg0007.tlg037": "Confronto fra Cimone e Lucullo",
    "tlg0007.tlg038": "Vita di Nicia",      "tlg0007.tlg039": "Vita di Crasso",
    "tlg0007.tlg040": "Confronto fra Nicia e Crasso",
    "tlg0007.tlg041": "Vita di Eumene",     "tlg0007.tlg042": "Vita di Sertorio",
    "tlg0007.tlg043": "Confronto fra Sertorio ed Eumene",
    "tlg0007.tlg044": "Vita di Agesilao",   "tlg0007.tlg045": "Vita di Pompeo",
    "tlg0007.tlg046": "Confronto fra Agesilao e Pompeo",
    "tlg0007.tlg047": "Vita di Alessandro", "tlg0007.tlg048": "Vita di Cesare",
    "tlg0007.tlg049": "Vita di Focione",    "tlg0007.tlg050": "Vita di Catone Uticense",
    "tlg0007.tlg051": "Vite di Agide e Cleomene",
    "tlg0007.tlg052": "Vite di Tiberio e Gaio Gracco",
    "tlg0007.tlg053": "Confronto fra Agide, Cleomene e i Gracchi",
    "tlg0007.tlg054": "Vita di Demostene",  "tlg0007.tlg055": "Vita di Cicerone",
    "tlg0007.tlg056": "Confronto fra Demostene e Cicerone",
    "tlg0007.tlg057": "Vita di Demetrio",   "tlg0007.tlg058": "Vita di Antonio",
    "tlg0007.tlg059": "Confronto fra Demetrio e Antonio",
    "tlg0007.tlg060": "Vita di Dione",      "tlg0007.tlg061": "Vita di Bruto",
    "tlg0007.tlg062": "Confronto fra Dione e Bruto",
    "tlg0007.tlg063": "Vita di Arato",      "tlg0007.tlg064": "Vita di Artaserse",
    "tlg0007.tlg065": "Vita di Galba",      "tlg0007.tlg066": "Vita di Otone",
})
# ── PLUTARCO · Moralia ────────────────────────────────────────────────────
GRC.update({
    "tlg0007.tlg067": "L'educazione dei figli",
    "tlg0007.tlg068": "Come il giovane deve ascoltare i poeti",
    "tlg0007.tlg069": "L'arte di ascoltare",
    "tlg0007.tlg070": "Come distinguere l'adulatore dall'amico",
    "tlg0007.tlg071": "Come accorgersi dei propri progressi nella virtù",
    "tlg0007.tlg072": "Come trarre giovamento dai nemici",
    "tlg0007.tlg073": "L'abbondanza di amici",
    "tlg0007.tlg074": "La fortuna",
    "tlg0007.tlg075": "La virtù e il vizio",
    "tlg0007.tlg076": "Consolazione ad Apollonio",
    "tlg0007.tlg077": "Precetti sulla salute",
    "tlg0007.tlg078": "Precetti coniugali",
    "tlg0007.tlg079": "Il convito dei sette sapienti",
    "tlg0007.tlg080": "La superstizione",
    "tlg0007.tlg081": "Detti di re e di generali",
    "tlg0007.tlg082": "Detti spartani",
    "tlg0007.tlg082a": "Le antiche usanze degli Spartani",
    "tlg0007.tlg082b": "Detti di donne spartane",
    "tlg0007.tlg083": "Virtù di donne",
    "tlg0007.tlg084a": "Questioni romane",
    "tlg0007.tlg084b": "Questioni greche",
    "tlg0007.tlg085": "Storie parallele greche e romane",
    "tlg0007.tlg086": "La fortuna dei Romani",
    "tlg0007.tlg087": "La fortuna o la virtù di Alessandro",
    "tlg0007.tlg088": "Se gli Ateniesi siano stati più illustri in guerra o in sapienza",
    "tlg0007.tlg089": "Iside e Osiride",
    "tlg0007.tlg090": "L'E di Delfi",
    "tlg0007.tlg091": "Perché la Pizia non dà più responsi in versi",
    "tlg0007.tlg092": "Il tramonto degli oracoli",
    "tlg0007.tlg093": "Se la virtù si possa insegnare",
    "tlg0007.tlg094": "La virtù etica",
    "tlg0007.tlg095": "Il controllo dell'ira",
    "tlg0007.tlg096": "La serenità interiore",
    "tlg0007.tlg097": "L'amore fraterno",
    "tlg0007.tlg098": "L'amore per i figli",
    "tlg0007.tlg099": "Se il vizio basti a rendere infelici",
    "tlg0007.tlg100": "Se siano peggiori le malattie dell'anima o del corpo",
    "tlg0007.tlg101": "La loquacità",
    "tlg0007.tlg102": "La curiosità",
    "tlg0007.tlg103": "L'amore per la ricchezza",
    "tlg0007.tlg104": "La falsa vergogna",
    "tlg0007.tlg105": "L'invidia e l'odio",
    "tlg0007.tlg106": "Come lodarsi senza suscitare invidia",
    "tlg0007.tlg107": "I ritardi della punizione divina",
    "tlg0007.tlg108": "Il destino",
    "tlg0007.tlg109": "Il demone di Socrate",
    "tlg0007.tlg110": "L'esilio",
    "tlg0007.tlg111": "Consolazione alla moglie",
    "tlg0007.tlg112": "Questioni conviviali",
    "tlg0007.tlg113": "Dialogo sull'amore",
    "tlg0007.tlg114": "Storie d'amore",
    "tlg0007.tlg115": "Che il filosofo deve conversare soprattutto con i potenti",
    "tlg0007.tlg116": "A un governante incolto",
    "tlg0007.tlg117": "Se il vecchio debba far politica",
    "tlg0007.tlg118": "Precetti politici",
    "tlg0007.tlg119": "Monarchia, democrazia e oligarchia",
    "tlg0007.tlg120": "Che non si deve prendere denaro a prestito",
    "tlg0007.tlg121": "Vite dei dieci oratori",
    "tlg0007.tlg122": "Compendio del confronto fra Aristofane e Menandro",
    "tlg0007.tlg123": "La malignità di Erodoto",
    "tlg0007.tlg126": "Il volto della luna",
    "tlg0007.tlg127": "Il principio del freddo",
    "tlg0007.tlg128": "Se sia più utile l'acqua o il fuoco",
    "tlg0007.tlg129": "Se siano più intelligenti gli animali terrestri o acquatici",
    "tlg0007.tlg130": "Che gli animali irrazionali usano la ragione",
    "tlg0007.tlg131": "Il mangiar carne · primo discorso",
    "tlg0007.tlg132": "Il mangiar carne · secondo discorso",
    "tlg0007.tlg133": "Questioni platoniche",
    "tlg0007.tlg134": "La generazione dell'anima nel Timeo",
    "tlg0007.tlg135": "Epitome della generazione dell'anima nel Timeo",
    "tlg0007.tlg136": "Le contraddizioni degli Stoici",
    "tlg0007.tlg137": "Che gli Stoici dicono cose più paradossali dei poeti",
    "tlg0007.tlg138": "Le nozioni comuni, contro gli Stoici",
    "tlg0007.tlg139": "Che non è possibile vivere felici secondo Epicuro",
    "tlg0007.tlg140": "Contro Colote",
    "tlg0007.tlg141": "Se sia ben detto «vivi nascosto»",
})

# ── LUCIANO ───────────────────────────────────────────────────────────────
GRC.update({
    "tlg0062.tlg001": "Falaride",                 "tlg0062.tlg002": "Ippia o il bagno",
    "tlg0062.tlg003": "Prolalia · Dioniso",       "tlg0062.tlg004": "Prolalia · Eracle",
    "tlg0062.tlg005": "L'ambra o i cigni",        "tlg0062.tlg006": "Elogio della mosca",
    "tlg0062.tlg007": "Nigrino",                  "tlg0062.tlg008": "Vita di Demonatte",
    "tlg0062.tlg009": "La sala",                  "tlg0062.tlg010": "Elogio della patria",
    "tlg0062.tlg011": "I longevi",                "tlg0062.tlg012": "Storia vera",
    "tlg0062.tlg013": "Non credere facilmente alla calunnia",
    "tlg0062.tlg014": "Il processo delle consonanti",
    "tlg0062.tlg015": "Il convito o i Lapiti",    "tlg0062.tlg016": "La traversata o il tiranno",
    "tlg0062.tlg017": "Zeus confutato",           "tlg0062.tlg018": "Zeus tragico",
    "tlg0062.tlg019": "Il sogno o il gallo",      "tlg0062.tlg020": "Prometeo",
    "tlg0062.tlg021": "Icaromenippo",             "tlg0062.tlg022": "Timone",
    "tlg0062.tlg023": "Caronte",                  "tlg0062.tlg024": "Vendita di vite all'incanto",
    "tlg0062.tlg025": "I redivivi o il pescatore","tlg0062.tlg026": "La doppia accusa",
    "tlg0062.tlg027": "I sacrifici",              "tlg0062.tlg028": "Contro l'ignorante bibliomane",
    "tlg0062.tlg029": "Il sogno, ovvero la vita di Luciano",
    "tlg0062.tlg030": "Il parassita",             "tlg0062.tlg031": "L'amico della menzogna",
    "tlg0062.tlg032": "Il giudizio delle dee",    "tlg0062.tlg033": "Su quelli che stanno a servizio",
    "tlg0062.tlg034": "Anacarsi o sulla ginnastica",
    "tlg0062.tlg035": "Menippo o la negromanzia", "tlg0062.tlg036": "Il lutto",
    "tlg0062.tlg037": "Il maestro di retorica",   "tlg0062.tlg038": "Alessandro o il falso profeta",
    "tlg0062.tlg039": "Le immagini",              "tlg0062.tlg040": "In difesa delle immagini",
    "tlg0062.tlg041": "La dea siria",             "tlg0062.tlg042": "La morte di Peregrino",
    "tlg0062.tlg043": "I fuggitivi",              "tlg0062.tlg044": "Tossari o l'amicizia",
    "tlg0062.tlg045": "La danza",                 "tlg0062.tlg046": "Lessifane",
    "tlg0062.tlg047": "L'eunuco",                 "tlg0062.tlg048": "L'astrologia",
    "tlg0062.tlg049": "Lo pseudologista",         "tlg0062.tlg050": "L'assemblea degli dèi",
    "tlg0062.tlg051": "Il tirannicida",           "tlg0062.tlg052": "Il diseredato",
    "tlg0062.tlg053": "Come si deve scrivere la storia",
    "tlg0062.tlg054": "I dipsadi",                "tlg0062.tlg055": "Le Saturnali",
    "tlg0062.tlg056": "Erodoto o Aezione",        "tlg0062.tlg057": "Zeusi o Antioco",
    "tlg0062.tlg058": "Per un lapsus nel saluto", "tlg0062.tlg059": "Armonide",
    "tlg0062.tlg060": "Armonide",                 "tlg0062.tlg061": "Dialogo con Esiodo",
    "tlg0062.tlg062": "Lo Scita o il prosseno",   "tlg0062.tlg063": "Lo Scita o il prosseno",
    "tlg0062.tlg064": "A chi disse «sei un Prometeo nei discorsi»",
    "tlg0062.tlg065": "La nave o i desideri",     "tlg0062.tlg066": "Dialoghi dei morti",
    "tlg0062.tlg067": "Dialoghi degli dèi",       "tlg0062.tlg068": "Dialoghi degli dèi",
    "tlg0062.tlg069": "Dialoghi delle cortigiane",
    "tlg0062.tlg070": "Il falso sofista o il solecista",
    "tlg0062.tlg071": "La podagra",
})

TITLES = {**LAT, **GRC}


def _stessa_stringa(a, b):
    """Due titoli dicono la stessa cosa? Confronto tollerante: maiuscole,
    spazi doppi e punto finale non fanno differenza. Serve perché nel catalogo
    Perseus il campo «titolo inglese» spesso RIPETE il titolo latino, a volte
    con una maiuscola diversa («De Vita Hadriani» / «De vita Hadriani»)."""
    if not a or not b:
        return False
    norm = lambda s: " ".join(s.split()).casefold().rstrip(".")
    return norm(a) == norm(b)


def title_for(work_id, original, title_en=None):
    """Restituisce (titolo_principale, titolo_secondario, stato).

    stato: 'it'     → curato, l'uso italiano differisce dall'originale
           'orig'   → curato, l'uso italiano È il titolo originale (una fascia sola)
           'assente'→ non curato: originale in testa, inglese come ripiego marcato

    Il secondo campo può tornare None in ogni stato: significa «non c'è una
    seconda fascia da stampare», e la scheda ne stampa una sola.
    """
    grezzo = original                          # come lo registra la fonte
    original = ORIG.get(work_id, original)     # l'originale vero, non l'inglese
    if work_id in TITLES:
        it = TITLES[work_id]
        if it is None:
            return original, None, "orig"
        if _stessa_stringa(it, original):
            # Il titolo italiano curato coincide con l'originale: è il caso
            # 'orig' scritto per esteso invece che con None. Vale come tale.
            return it, None, "orig"
        return it, original, "it"
    # Non curato. Il ripiego vale solo se AGGIUNGE qualcosa: se ripete
    # l'originale, la seconda fascia stamperebbe la stessa riga due volte.
    # Il confronto va fatto anche col titolo GREZZO: quando ORIG corregge una
    # grafia («Adversus Judaeos» → «Adversus Iudaeos»), il campo inglese di
    # Perseus resta alla grafia vecchia e smette di coincidere con l'originale
    # corretto — se non lo si riconoscesse, la scheda finirebbe per esibire
    # sotto proprio la grafia che si è appena corretta sopra.
    if _stessa_stringa(title_en, original) or _stessa_stringa(title_en, grezzo):
        return original, None, "assente"
    return original, title_en, "assente"
