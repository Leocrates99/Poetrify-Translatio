# -*- coding: utf-8 -*-
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

138 autori su 147 hanno un nome esteso. Restano scoperti:
  · Antologia Palatina
  · Appendix Vergiliana
  · Historia Augusta
  · Inni omerici
  · Lettera di Barnaba
  · Nuovo Testamento
  · Pseudo-Cesare
  · Pseudo-Plutarco
  · Pseudo-Tertulliano
"""

# textgroup → nome esteso, **grassetto** sull'elemento d'uso
ESTESI = {
    "phi0119":           "Titus Maccius **Plautus**",                   # Plauto
    "phi0134":           "Publius **Terentius** Afer",                  # Terenzio
    "phi0448":           "Gaius Iulius **Caesar**",                     # Cesare
    "phi0472":           "Gaius Valerius **Catullus**",                 # Catullo
    "phi0474":           "Marcus **Tullius** **Cicero**",               # Cicerone
    "phi0478":           "Quintus **Tullius** **Cicero**",              # Quinto Tullio Cicerone
    "phi0550":           "Titus **Lucretius** Carus",                   # Lucrezio
    "phi0588":           "**Cornelius** **Nepos**",                     # Cornelio Nepote
    "phi0620":           "Sextus **Propertius**",                       # Properzio
    "phi0631":           "Gaius **Sallustius** Crispus",                # Sallustio
    "phi0660":           "Albius **Tibullus**",                         # Tibullo
    "phi0690":           "Publius **Vergilius** Maro",                  # Virgilio
    "phi0836":           "Aulus Cornelius **Celsus**",                  # Celso
    "phi0845":           "Lucius Iunius Moderatus **Columella**",       # Columella
    "phi0860":           "Quintus **Curtius** **Rufus**",               # Curzio Rufo
    "phi0893":           "Quintus **Horatius** Flaccus",                # Orazio
    "phi0914":           "Titus **Livius**",                            # Livio
    "phi0917":           "Marcus Annaeus **Lucanus**",                  # Lucano
    "phi0959":           "Publius **Ovidius** Naso",                    # Ovidio
    "phi0969":           "Aulus **Persius** Flaccus",                   # Persio
    "phi0972":           "**Petronius** Arbiter",                       # Petronio
    "phi0975":           "**Phaedrus** Augusti libertus",               # Fedro
    "phi0978":           "Gaius **Plinius** Secundus",                  # Plinio il Vecchio
    "phi1002":           "Marcus Fabius **Quintilianus**",              # Quintiliano
    "phi1014":           "Lucius **Annaeus** **Seneca** maior",         # Seneca il Vecchio
    "phi1017":           "Lucius Annaeus **Seneca**",                   # Seneca
    "phi1020":           "Publius Papinius **Statius**",                # Stazio
    "phi1035":           "Gaius **Valerius** **Flaccus** Setinus Balbus", # Valerio Flacco
    "phi1038":           "**Valerius** **Maximus**",                    # Valerio Massimo
    "phi1056":           "Marcus **Vitruvius** Pollio",                 # Vitruvio
    "phi1212":           "**Apuleius** Madaurensis",                    # Apuleio
    "phi1242":           "Lucius Annaeus **Florus**",                   # Floro
    "phi1254":           "**Aulus** **Gellius**",                       # Aulo Gellio
    "phi1276":           "Decimus Iunius **Iuvenalis**",                # Giovenale
    "phi1294":           "Marcus Valerius **Martialis**",               # Marziale
    "phi1318":           "Gaius **Plinius** Caecilius Secundus",        # Plinio il Giovane
    "phi1345":           "Tiberius Catius Asconius **Silius** **Italicus**", # Silio Italico
    "phi1348":           "Gaius **Suetonius** Tranquillus",             # Svetonio
    "phi1351":           "Publius Cornelius **Tacitus**",               # Tacito
    "phi2003":           "Marcus Gavius **Apicius**",                   # Apicio
    "stoa0023":          "**Ammianus** **Marcellinus**",                # Ammiano Marcellino
    "stoa0040":          "Aurelius **Augustinus**",                     # Agostino
    "stoa0045":          "Decimus Magnus **Ausonius**",                 # Ausonio
    "stoa0054":          "**Beda** Venerabilis",                        # Beda il Venerabile
    "stoa0058":          "Anicius Manlius Severinus **Boethius**",      # Boezio
    "stoa0079":          "Marcus Porcius **Cato**",                     # Catone
    "stoa0089":          "Claudius **Claudianus**",                     # Claudiano
    "stoa0162":          "Sophronius Eusebius **Hieronymus**",          # Girolamo
    "stoa0203":          "Marcus **Minucius** **Felix**",               # Minucio Felice
    "stoa0238":          "Aurelius **Prudentius** Clemens",             # Prudenzio
    "stoa0261":          "Gaius Sollius Modestus **Apollinaris** **Sidonius**", # Sidonio Apollinare
    "stoa0275":          "Quintus Septimius Florens **Tertullianus**",  # Tertulliano
    "tlg0001":           "**Ἀπολλώνιος** **Ῥόδιος**",                   # Apollonio Rodio
    "tlg0003":           "**Θουκυδίδης** Ὀλόρου Ἁλιμούσιος",            # Tucidide
    "tlg0004":           "**Διογένης** **Λαέρτιος**",                   # Diogene Laerzio
    "tlg0005":           "**Θεόκριτος** Συρακούσιος",                   # Teocrito
    "tlg0006":           "**Εὐριπίδης**",                               # Euripide
    "tlg0007":           "**Πλούταρχος** Χαιρωνεύς",                    # Plutarco
    "tlg0008":           "**Ἀθήναιος** Ναυκρατίτης",                    # Ateneo
    "tlg0010":           "**Ἰσοκράτης**",                               # Isocrate
    "tlg0011":           "**Σοφοκλῆς**",                                # Sofocle
    "tlg0012":           "**Ὅμηρος**",                                  # Omero
    "tlg0014":           "**Δημοσθένης** Δημοσθένους Παιανιεύς",        # Demostene
    "tlg0016":           "**Ἡρόδοτος** Ἁλικαρνασσεύς",                  # Erodoto
    "tlg0017":           "**Ἰσαῖος**",                                  # Iseo
    "tlg0019":           "**Ἀριστοφάνης**",                             # Aristofane
    "tlg0020":           "**Ἡσίοδος**",                                 # Esiodo
    "tlg0023":           "**Ὀππιανός** Ἀναζαρβεύς",                     # Oppiano
    "tlg0024":           "**Ὀππιανός** ὁ **Ἀπαμεύς**",                  # Oppiano di Apamea
    "tlg0026":           "**Αἰσχίνης**",                                # Eschine
    "tlg0027":           "**Ἀνδοκίδης**",                               # Andocide
    "tlg0028":           "**Ἀντιφῶν** Ῥαμνούσιος",                      # Antifonte
    "tlg0029":           "**Δείναρχος**",                               # Dinarco
    "tlg0030":           "**Ὑπερείδης**",                               # Iperide
    "tlg0032":           "**Ξενοφῶν**",                                 # Senofonte
    "tlg0033":           "**Πίνδαρος**",                                # Pindaro
    "tlg0034":           "**Λυκοῦργος**",                               # Licurgo
    "tlg0035":           "**Μόσχος** Συρακούσιος",                      # Mosco
    "tlg0036":           "**Βίων** Σμυρναῖος",                          # Bione
    "tlg0057":           "**Γαληνός** Περγαμηνός",                      # Galeno
    "tlg0058":           "**Αἰνείας** ὁ **Τακτικός**",                  # Enea Tattico
    "tlg0059":           "**Πλάτων**",                                  # Platone
    "tlg0060":           "**Διόδωρος** **Σικελιώτης**",                 # Diodoro Siculo
    "tlg0062":           "**Λουκιανός** Σαμοσατεύς",                    # Luciano
    "tlg0074":           "Λούκιος Φλάβιος **Ἀρριανός**",                # Arriano
    "tlg0081":           "**Διονύσιος** **Ἁλικαρνασσεύς**",             # Dionigi di Alicarnasso
    "tlg0085":           "**Αἰσχύλος**",                                # Eschilo
    "tlg0086":           "**Ἀριστοτέλης** Σταγειρίτης",                 # Aristotele
    "tlg0090":           "**Ἀγαθήμερος**",                              # Agatemero
    "tlg0093":           "**Θεόφραστος** Ἐρέσιος",                      # Teofrasto
    "tlg0099":           "**Στράβων** Ἀμασεύς",                         # Strabone
    "tlg0199":           "**Βακχυλίδης**",                              # Bacchilide
    "tlg0284":           "Πόπλιος **Αἴλιος** **Ἀριστείδης** Θεόδωρος",  # Elio Aristide
    "tlg0341":           "**Λυκόφρων** Χαλκιδεύς",                      # Licofrone
    "tlg0363":           "**Κλαύδιος** **Πτολεμαῖος**",                 # Tolomeo
    "tlg0385":           "**Δίων** **Κάσσιος** Κοκκηιανός",             # Cassio Dione
    "tlg0525":           "**Παυσανίας** ὁ Περιηγητής",                  # Pausania
    "tlg0526":           "**Φλάβιος** **Ἰώσηπος**",                     # Flavio Giuseppe
    "tlg0532":           "**Ἀχιλλεὺς** **Τάτιος**",                     # Achille Tazio
    "tlg0533":           "**Καλλίμαχος** Κυρηναῖος",                    # Callimaco
    "tlg0535":           "**Δημάδης**",                                 # Demade
    "tlg0540":           "**Λυσίας**",                                  # Lisia
    "tlg0543":           "**Πολύβιος** Μεγαλοπολίτης",                  # Polibio
    "tlg0545":           "Κλαύδιος **Αἰλιανός**",                       # Eliano
    "tlg0548":           "**Ἀπολλόδωρος**",                             # Apollodoro
    "tlg0551":           "**Ἀππιανὸς** Ἀλεξανδρεύς",                    # Appiano
    "tlg0554":           "**Χαρίτων** Ἀφροδισιεύς",                     # Caritone
    "tlg0555":           "Τίτος Φλάβιος **Κλήμης** **Ἀλεξανδρεύς**",    # Clemente Alessandrino
    "tlg0556":           "**Ἀσκληπιόδοτος**",                           # Asclepiodoto
    "tlg0557":           "**Ἐπίκτητος**",                               # Epitteto
    "tlg0560":           "**Λογγῖνος**",                                # Longino
    "tlg0561":           "**Λόγγος**",                                  # Longo Sofista
    "tlg0562":           "**Marcus** **Aurelius** Antoninus",           # Marco Aurelio
    "tlg0612":           "**Δίων** **Χρυσόστομος**",                    # Dione Crisostomo
    "tlg0613":           "**Δημήτριος** ὁ **Φαληρεύς**",                # Demetrio Falereo
    "tlg0627":           "**Ἱπποκράτης** Κῷος",                         # Ippocrate
    "tlg0638":           "**Φιλόστρατος** ὁ Ἀθηναῖος",                  # Filostrato
    "tlg0641":           "**Ξενοφῶν** ὁ **Ἐφέσιος**",                   # Senofonte Efesio
    "tlg0647":           "**Τρυφιόδωρος**",                             # Trifiodoro
    "tlg0648":           "**Ὀνάσανδρος**",                              # Onasandro
    "tlg0652":           "**Φιλόστρατος** ὁ νεώτερος",                  # Filostrato minore
    "tlg0653":           "**Ἄρατος** Σολεύς",                           # Arato
    "tlg0655":           "**Παρθένιος** Νικαεύς",                       # Partenio
    "tlg0719":           "**Ἀρεταῖος** Καππαδόκης",                     # Areteo
    "tlg1389":           "**Ἁρποκρατίων**",                             # Arpocrazione
    "tlg1600":           "**Φιλόστρατος** ὁ σοφιστής",                  # Filostrato sofista
    "tlg1799":           "**Εὐκλείδης**",                               # Euclide
    "tlg2003":           "Flavius Claudius **Iulianus**",               # Giuliano imperatore
    "tlg2018":           "**Εὐσέβιος** ὁ **Καισαρείας**",               # Eusebio di Cesarea
    "tlg2040":           "**Βασίλειος** Καισαρεύς",                     # Basilio di Cesarea
    "tlg2045":           "**Νόννος** **Πανοπολίτης**",                  # Nonno di Panopoli
    "tlg2046":           "**Κόϊντος** **Σμυρναῖος**",                   # Quinto Smirneo
    "tlg2934":           "**Ἰωάννης** **Δαμασκηνός**",                  # Giovanni Damasceno
    "tlg3135":           "Ἰωάννης **Ζωναρᾶς**",                         # Zonara
    "tlg4029":           "**Προκόπιος** Καισαρεύς",                     # Procopio
    "tlg4036":           "**Πρόκλος** ὁ Διάδοχος",                      # Proclo
    "tlg4081":           "**Κόλλουθος**",                               # Colluto
    "tlg4091":           "**Καλλίστρατος**",                            # Callistrato
}

# Chi non può averne uno: raccolte, corpora anonimi, pseudo-autori.
SENZA_NOME_ESTESO = {
    "Antologia Palatina",
    "Appendix Vergiliana",
    "Historia Augusta",
    "Inni omerici",
    "Lettera di Barnaba",
    "Nuovo Testamento",
    "Pseudo-Cesare",
    "Pseudo-Plutarco",
    "Pseudo-Tertulliano",
}


def esteso_per(textgroup):
    """Il nome esteso, o None se non c'è (e allora la card non mostra la riga)."""
    return ESTESI.get(textgroup)
