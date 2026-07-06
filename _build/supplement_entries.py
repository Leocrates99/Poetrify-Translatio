# -*- coding: utf-8 -*-
"""Supplemento CURATO del lemmario: voci assenti sia dal nucleo sia
dall'archivio sia dal backup, redatte a mano con criterio filologico.

Principî redazionali (qualità dell'output finale):
  - VERBI latini: paradigma completo «-āre, -āvī, -ātum» o parti principali
    irregolari; VERBI greci: parti principali del sistema verbale quando
    non banali (fut., aor., pf.), con nota sul TEMA quando differisce dal
    tema del presente (ferrea distinzione tema verbale / tema del presente).
  - SOSTANTIVI: genitivo e genere. AGGETTIVI: uscite.
  - PREPOSIZIONI greche: reggenze per caso, in ordine gen./dat./acc.
  - Forme suppletive e perfetti con valore di presente: ancorati al lemma
    di riferimento (εἶδον → ὁράω) con il posto preciso nel paradigma.
  - Marca [crist.] per il latino cristiano/tardo, [epico] per l'omerico.

Il passo 2 risolve inoltre le grafie non assimilate/etimologiche contro il
nucleo attivo (ad-stringo → astringo) iniettando una voce-rinvio con la
definizione della canonica. Idempotente (src:'curated' / 'xref').
"""
import json, os, re, sys, unicodedata, collections
sys.stdout.reconfigure(encoding='utf-8')

def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if not unicodedata.combining(c))

V, S, A, PR, AV, C, P, PN = 'verbo','sostantivo','aggettivo','preposizione','avverbio','congiunzione','particella','pronome'

GREEK = {
 # ── parole-funzione ──────────────────────────────────────────────────────
 'οὐκ':   (P, 'non: forma di οὐ davanti a vocale con spirito dolce (οὐχ davanti a spirito aspro)'),
 'οὐχ':   (P, 'non: forma di οὐ davanti a vocale con spirito aspro'),
 'ἄν':    (P, 'particella modale: col congiuntivo = eventualità (ἐάν, ὅταν); con l\'ottativo = possibilità; con indicativo di tempo storico = irrealtà'),
 'ὡς':    (C, 'come, che, affinché, quando; + participio = valore causale/finale soggettivo; + superlativo = il più possibile (ὡς τάχιστα); + acc. = verso (persone)'),
 'ἐν':    (PR, '+ dat.: in, dentro, fra, presso (stato in luogo)'),
 'εἰς':   (PR, '+ acc.: in, verso, contro, fino a (moto a luogo); per (fine)'),
 'ἐκ':    (PR, '+ gen.: da, fuori da (moto da luogo); a partire da, in conseguenza di (ἐξ davanti a vocale)'),
 'ἐξ':    (PR, '+ gen.: da, fuori da — forma di ἐκ davanti a vocale'),
 'ἀπό':   (PR, '+ gen.: da, lontano da (allontanamento, provenienza, origine)'),
 'παρά':  (PR, '+ gen.: da (provenienza da persona); + dat.: presso; + acc.: lungo, presso, oltre, contro'),
 'κατά':  (PR, '+ gen.: giù da, contro; + acc.: secondo, per, lungo, riguardo a (κατὰ γῆν καὶ θάλατταν)'),
 'μετά':  (PR, '+ gen.: con, insieme a; + acc.: dopo, dietro'),
 'περί':  (PR, '+ gen.: intorno a, riguardo a; + dat.: intorno a (raro); + acc.: attorno a, verso'),
 'ἐπί':   (PR, '+ gen.: sopra, al tempo di; + dat.: su, presso, a condizione di, per; + acc.: verso, contro, per (estensione)'),
 'ἤ':     (C, 'o, oppure; che (secondo termine di paragone dopo comparativo); ἤ … ἤ: o … o'),
 'ὅτε':   (C, 'quando (temporale; con ἄν → ὅταν eventuale)'),
 'μήτε':  (C, 'né (serie negativa soggettiva: μήτε … μήτε; correlativo di μή come οὔτε lo è di οὐ)'),
 'ἕ':     (PN, 'sé, lui/lei (acc. del riflessivo di 3ª pers.; gen. οὗ, dat. οἷ; spesso enclitico ἑ)'),
 'μάλα':  (AV, 'molto, assai, certamente; compar. μᾶλλον (più, piuttosto), superl. μάλιστα (soprattutto)'),
 'οὕτως': (AV, 'così, in questo modo (οὕτω davanti a consonante); correlativo di ὥσπερ/ὡς'),
 'τότε':  (AV, 'allora, in quel tempo (correlativo di ὅτε)'),
 'ποτέ':  (P, 'enclitica: una volta, un tempo, mai (in domande: τίς ποτε; chi mai?)'),
 'ἄρα':   (P, 'dunque, allora, come risulta (conclusiva/inferenziale; ἆρα interrogativa è parola diversa)'),
 'τοίνυν':(P, 'dunque, ebbene, pertanto (transizione argomentativa)'),
 'καίπερ':(C, '+ participio: sebbene, benché (concessiva)'),
 'ἅτε':   (P, '+ participio: in quanto, poiché (causa oggettiva, dal punto di vista di chi scrive)'),
 'ἕνεκα': (PR, '+ gen. (di norma posposta): a causa di, per, in favore di (anche ἕνεκεν, εἵνεκα)'),
 'χάριν': (PR, '+ gen. (posposta): per, in grazia di, a favore di (acc. avverbiale di χάρις)'),
 'ἄνευ':  (PR, '+ gen.: senza, all\'insaputa di'),
 'οἷος':  (A, 'οἷος, -α, -ον: quale (relativo di qualità; correl. τοῖος/τοιοῦτος); οἷός τέ εἰμι + inf. = sono capace di'),
 'τοιοῦτος': (A, 'τοιοῦτος, τοιαύτη, τοιοῦτο(ν): tale, siffatto (dimostrativo di qualità, correl. di οἷος)'),
 'τοσοῦτος': (A, 'τοσοῦτος, τοσαύτη, τοσοῦτο(ν): tanto grande, tanto numeroso (correl. di ὅσος)'),
 # ── suppletivi, perfetti presentivi, temi epici ──────────────────────────
 'εἶδον': (V, 'vidi: aor. II (tema ϝιδ-, cfr. lat. video) usato come aoristo di ὁράω; ind. εἶδον, cong. ἴδω, ott. ἴδοιμι, imv. ἰδέ, inf. ἰδεῖν, ptc. ἰδών; med. εἰδόμην (apparvi)'),
 'εἶπον': (V, 'dissi: aor. II usato come aoristo di λέγω/φημί (tema ϝεπ-); inf. εἰπεῖν, ptc. εἰπών; alternativo aor. I εἶπα'),
 'προσεῖπον': (V, 'rivolsi la parola a, salutai (+ acc.): aor. II di προσαγορεύω/προσλέγω'),
 'προεῖδον': (V, 'previdi, vidi in anticipo: aor. II di προοράω'),
 'ἀπεῖπον': (V, 'vietai, rinunciai (+ dat./inf.), rifiutai: aor. II di ἀπαγορεύω; anche: venni meno per stanchezza'),
 'εἰσείδω': (V, 'εἰσεῖδον: scorsi, guardai dentro/verso — aor. II di εἰσοράω'),
 'μίγνυμι': (V, 'mescolare, unire (+ dat.): fut. μείξω, aor. ἔμειξα, aor. pass. ἐμίγην/ἐμείχθην, pf. m.-p. μέμιγμαι; anche μείγνυμι'),
 'ἄνωγα': (V, 'comando, esorto: pf. con valore di presente (tema ἀνωγ-); ppf. ἠνώγεα con valore d\'imperfetto; imv. ἄνωχθι [epico]'),
 'τλάω':  (V, 'sopportare, osare, avere il coraggio di: tema τλα-/τλη- senza presente in uso; aor. ἔτλην (imv. τλῆθι), fut. τλήσομαι, pf. τέτληκα (valore di presente)'),
 'ἔοικα': (V, 'sembro, sono simile a (+ dat.): pf. con valore di presente (tema ϝεικ-/ϝοικ-); ptc. ἐοικώς/εἰκώς; impers. ἔοικε: sembra, conviene; ὡς ἔοικε: a quanto pare'),
 'μέμαα': (V, 'bramo, mi slancio [epico]: pf. con valore di presente (tema μεν-/μα-); ptc. μεμαώς, 3ª pl. μεμάασι'),
 'ἐμμεμαώς': (A, 'impetuoso, bramoso [epico]: ptc. pf. di ἐμμέμαα (μέμαα rafforzato)'),
 'φαγεῖν': (V, 'mangiare: inf. dell\'aor. II ἔφαγον, usato come aoristo di ἐσθίω (paradigma ἐσθίω, ἔδομαι, ἔφαγον, ἐδήδοκα)'),
 'πόρω':  (V, 'diedi, procurai, destinai: tema πορ-/πρω- senza presente; aor. II ἔπορον; pf. m.-p. impers. πέπρωται: è destinato (ἡ πεπρωμένη: il destino)'),
 'ἐμπίπλημι': (V, 'riempire (+ gen. della cosa): fut. ἐμπλήσω, aor. ἐνέπλησα, pf. m.-p. ἐμπέπλησμαι; cfr. πίμπλημι'),
 'δάω':   (V, 'imparare; al causativo insegnare [epico]: tema δα-; aor. II ἔδαον, inf. δαῆναι (pass.), pf. δεδάηκα; cfr. διδάσκω'),
 'εἴδομαι': (V, 'apparire, sembrare; assomigliare a (+ dat.) [epico]: medio del tema ϝιδ- (cfr. εἶδον)'),
 'χαρίζομαι': (V, 'far cosa gradita, compiacere (+ dat.); donare volentieri: fut. χαριοῦμαι, aor. ἐχαρισάμην, pf. κεχάρισμαι'),
 'καίνυμαι': (V, 'superare, eccellere [epico]: pf. κέκασμαι (valore di presente): mi distinguo'),
 'μέδομαι': (V, 'prendersi cura di, meditare (+ gen.) [epico]; μέδων, -οντος: signore, reggitore'),
 'ἀτύζω': (V, 'sbigottire [epico]; di norma pass. ἀτύζομαι: essere sbigottito, fuggire atterrito (ptc. aor. ἀτυχθείς)'),
 'ὁμοκλέω': (V, 'gridare (insieme), minacciare, incitare con grida [epico] (ὁμοκλή: grido di comando)'),
 'τέθηπα': (V, 'sono stupito, attonito: pf. con valore di presente (tema θαπ-/ταφ-); aor. II ἔταφον'),
 'κατέπεφνον': (V, 'uccisi [epico]: aor. II a raddoppiamento del tema φεν- (senza presente); inf. καταπεφνεῖν'),
 'νοσφίζομαι': (V, 'allontanarsi, separarsi; sottrarre, privare (da νόσφι: lontano, in disparte); aor. ἐνοσφισάμην'),
 'παμφανόων': (A, 'tutto splendente [epico]: ptc. di παμφαίνω (πᾶν + φαίνω) con diectasi omerica'),
 'γέγωνα': (V, 'grido, mi faccio udire: pf. con valore di presente; anche presente derivato γεγωνέω'),
 'γεγωνέω': (V, 'gridare, farsi udire da lontano (= γέγωνα)'),
 'ἔργνυμι': (V, 'rinchiudere, serrare (= εἴργω/εἵργω): impf. ἐέργνυ [epico]'),
 'οἰνοχοέω': (V, 'versare il vino, fare da coppiere (οἶνος + χέω): impf. epico οἰνοχόει/ᾠνοχόει'),
 'τέτμον': (V, 'raggiunsi, trovai, colsi [epico]: aor. II a raddoppiamento senza presente (anche ἔτετμον)'),
 'ὑποδύομαι': (V, 'immergersi sotto, insinuarsi; assumersi, sobbarcarsi: aor. II atematico ὑπέδυν, pf. ὑποδέδυκα'),
 'ἀνέρομαι': (V, 'domandare, interrogare [epico/ionico] (att. ἀνερωτάω): aor. II ἀνηρόμην, inf. ἀνερέσθαι'),
 'ἀνέχω': (V, 'sollevare, tenere alto; medio ἀνέχομαι: sopportare, tollerare — impf. ἠνειχόμην e aor. ἠνεσχόμην con doppio aumento'),
 'ἀπεχθάνομαι': (V, 'divenire odioso, farsi odiare (+ dat.): fut. ἀπεχθήσομαι, aor. II ἀπηχθόμην, pf. ἀπήχθημαι (ἀπεχθής: odioso)'),
 'ὀδύσσομαι': (V, 'adirarsi, essere in collera [epico]: aor. ὠδυσάμην; nell\'Odissea gioco etimologico col nome di Ὀδυσσεύς'),
 'οἰκτείρω': (V, 'compiangere, avere pietà di (+ acc.): aor. ᾤκτειρα (anche οἰκτίρω)'),
 'περιδείδω': (V, 'temere assai (per qualcuno: + dat./gen.) [epico]: pf. περιδείδια con valore di presente'),
 'συνόχωκα': (V, 'essere congiunto, piegato insieme [epico]: pf. di συνέχω con raddoppiamento attico (σWorld? no) — pf. intr. di συνέχω'),
 'ἄλαλκε': (V, 'respinse, tenne lontano (+ dat. della persona difesa) [epico]: aor. II a raddoppiamento del tema ἀλκ- (cfr. ἀλέξω, ἀλκή)'),
}
# correzione della voce συνόχωκα (niente parentesi spurie)
GREEK['συνόχωκα'] = (V, 'essere congiunto, curvato insieme [epico]: pf. intransitivo di συνέχω (raddoppiamento ὀχ-ωκ-)')

LATIN = {
 # ── classici ad alta frequenza assenti dal corpus ────────────────────────
 'vulnero': (V, 'vulnerō, -āre, -āvī, -ātum: ferire, piagare (vulnus); fig. offendere'),
 'vulnus':  (S, 'vulnus, vulneris n: ferita, colpo; fig. dolore, danno (arc. volnus)'),
 'vultus':  (S, 'vultus, -ūs m: volto, espressione del viso, sguardo (arc. voltus)'),
 'vulgus':  (S, 'vulgus, -ī n (raro m): il volgo, la moltitudine, la folla'),
 'vulgo':   (V, '1) vulgō avv.: comunemente, dappertutto, pubblicamente | 2) vulgō, -āre, -āvī, -ātum: divulgare, render pubblico'),
 'vultur':  (S, 'vultur, vulturis m: avvoltoio'),
 'vulturius': (S, 'vulturius, -ī m: avvoltoio; fig. uomo rapace'),
 'urgeo':   (V, 'urgeō, urgēre, ursī: incalzare, premere, insistere (anche urgueo)'),
 'traduco': (V, 'trādūcō, -ere, -dūxī, -ductum (trans+duco): condurre oltre, far passare, trasferire; esporre (al pubblico)'),
 'manduco': (V, 'mandūcō, -āre, -āvī, -ātum: masticare, mangiare [colloquiale e tardo]'),
 'excio':   (V, 'exciō, -īre, -īvī, -ītum (anche excieō): far uscire, chiamar fuori, destare, suscitare'),
 'expando': (V, 'expandō, -ere, -pandī, -pānsum/-passum: distendere, spiegare, aprire'),
 'superpono': (V, 'superpōnō, -ere, -posuī, -positum: porre sopra, sovrapporre; preporre'),
 'cognomino': (V, 'cognōminō, -āre, -āvī, -ātum: soprannominare, chiamare con un cognome'),
 'exercito': (V, 'exercitō, -āre, -āvī, -ātum (frequentativo di exerceo): esercitare assiduamente'),
 'divulgo': (V, 'dīvulgō, -āre, -āvī, -ātum: divulgare, diffondere, render noto'),
 'pervulgo': (V, 'pervulgō, -āre, -āvī, -ātum: divulgare ovunque, rendere di dominio pubblico'),
 'dignosco': (V, 'dignōscō, -ere, -nōvī: distinguere, discernere (da qualcosa: ab + abl.)'),
 'pertimeo': (V, 'pertimeō, -ēre, -uī: temere assai (cfr. pertimesco: essere preso da gran timore)'),
 'obdormio': (V, 'obdormiō, -īre, -īvī, -ītum: addormentarsi'),
 'rugio':   (V, 'rugiō, -īre: ruggire (del leone)'),
 'pigeo':   (V, 'piget, pigēre, piguit (impers.): rincresce, dà fastidio (piget me + gen./inf.)'),
 'querela': (S, 'querēla (querella), -ae f: lamentela, lagnanza; reclamo'),
 'imbecillis': (A, 'imbēcillis, -e (= imbēcillus, -a, -um): debole, fiacco, senza forze'),
 'infirmis': (A, 'infirmis, -e (= infirmus, -a, -um): debole, malaticcio, malfermo'),
 'semianimis': (A, 'sēmianimis, -e (anche -us, -a, -um): mezzo vivo, semivivo'),
 'parvulus': (A, 'parvulus, -a, -um (dim. di parvus): piccolino, piccino; a parvulis: fin da piccoli'),
 'servulus': (S, 'servulus, -ī m (dim. di servus): giovane schiavo, schiavetto'),
 'mercenarius': (A, 'mercēnārius, -a, -um: prezzolato, salariato; m.: mercenario, lavoratore a paga'),
 'prosper': (A, 'prosper (prosperus), -a, -um: prospero, favorevole, felice'),
 'ceter':   (A, 'ceter (= cēterus), -a, -um: restante, rimanente; pl. ceteri: gli altri'),
 'ulter':   (A, 'ulter, -tra, -trum (arcaico): che sta oltre — base di ultrā, ulterior, ultimus'),
 'citer':   (A, 'citer, -tra, -trum (arcaico): che sta al di qua — base di citrā, citerior'),
 'infer':   (A, 'infer (= inferus), -a, -um: che sta sotto, infero; pl. inferī: gli dèi di sotto, i morti'),
 'pleo':    (V, 'pleō, -ēre (arcaico): riempire — base di compleō, impleō, expleō (tema PLE-)'),
 'no':      (V, 'nō, nāre, nāvī: nuotare (cfr. nato, frequentativo)'),
 'aceo':    (V, 'aceō, -ēre, acuī: essere acido, essere aspro'),
 'flaveo':  (V, 'flāveō, -ēre: essere biondo, dorato (flavus)'),
 'hinnio':  (V, 'hinniō, -īre: nitrire'),
 'pipo':    (V, 'pīpō, -āre: pigolare'),
 'bullio':  (V, 'bulliō, -īre: bollire, gorgogliare (bulla: bolla)'),
 'sufflo':  (V, 'sufflō, -āre, -āvī, -ātum: soffiare sotto, gonfiare soffiando'),
 'asso':    (V, 'assō, -āre, -āvī, -ātum: arrostire (assum: arrosto)'),
 'elixo':   (V, 'ēlixō, -āre: lessare, bollire (elixus: lessato)'),
 'cibo':    (V, 'cibō, -āre, -āvī, -ātum: nutrire, dar da mangiare (cibus)'),
 'coagulo': (V, 'coāgulō, -āre, -āvī, -ātum: coagulare, rapprendere'),
 'fermento': (V, 'fermentō, -āre, -āvī, -ātum: far fermentare, far lievitare'),
 'levigo':  (V, 'lēvigō, -āre, -āvī, -ātum: levigare, lisciare (lēvis: liscio)'),
 'glutino': (V, 'glūtinō, -āre, -āvī, -ātum: incollare, saldare (gluten)'),
 'gypso':   (V, 'gypsō, -āre, -āvī, -ātum: ingessare (gypsum)'),
 'pico':    (V, 'picō, -āre, -āvī, -ātum: impeciare, spalmare di pece (pix)'),
 'auro':    (V, 'aurō, -āre, -āvī, -ātum: dorare (aurum; più comune inauro)'),
 'purpuro': (V, 'purpurō, -āre: imporporare, tingere di porpora'),
 'soporo':  (V, 'sōpōrō, -āre, -āvī, -ātum: assopire, addormentare (sopor)'),
 'spisso':  (V, 'spissō, -āre, -āvī, -ātum: addensare, condensare (spissus)'),
 'umbro':   (V, 'umbrō, -āre, -āvī, -ātum: ombreggiare, coprire d\'ombra'),
 'stello':  (V, 'stēllō, -āre: costellare; stellatus: stellato, trapunto di stelle'),
 'foro':    (V, 'forō, -āre, -āvī, -ātum: forare, perforare (foramen: foro)'),
 'consuo':  (V, 'cōnsuō, -ere, -suī, -sūtum: cucire insieme (sutor: calzolaio)'),
 'derado':  (V, 'dēradō, -ere, -rāsī, -rāsum: raschiare via, radere'),
 'erodo':   (V, 'ērōdō, -ere, -rōsī, -rōsum: rodere, corrodere'),
 'disseco': (V, 'dissecō, -āre, -secuī, -sectum: tagliare in due, squarciare'),
 'circumlino': (V, 'circumlinō, -ere, -lēvī, -litum: spalmare intorno, ungere attorno'),
 'circumfodio': (V, 'circumfodiō, -ere, -fōdī, -fossum: scavare intorno'),
 'inungo':  (V, 'inungō, -ere, -ūnxī, -ūnctum: ungere, spalmare sopra'),
 'conspargo': (V, 'conspargō, -ere (= conspergō): aspergere, cospargere'),
 'effreno': (V, 'effrēnō, -āre, -āvī, -ātum: sfrenare, sbrigliare (effrenatus: sfrenato)'),
 'cribro':  (V, 'crībrō, -āre, -āvī, -ātum: setacciare, vagliare (cribrum: setaccio)'),
 'runco':   (V, 'runcō, -āre: sarchiare, estirpare le erbacce'),
 'pastino': (V, 'pastinō, -āre, -āvī, -ātum: vangare, preparare il terreno per la vigna'),
 'repastino': (V, 'repastinō, -āre, -āvī, -ātum: rivangare, dissodare di nuovo'),
 'vindemio': (V, 'vindēmiō, -āre: vendemmiare (vindemia)'),
 'pampino': (V, 'pampinō, -āre: spampinare, potare i pampini della vite'),
 'suppuro': (V, 'suppūrō, -āre, -āvī, -ātum: suppurare, marcire sotto (pus)'),
 'superfluo': (V, 'superfluō, -ere, -flūxī: traboccare; sovrabbondare, essere superfluo'),
 'supervivo': (V, 'supervīvō, -ere, -vīxī: sopravvivere (a: + dat.)'),
 'sublimo': (V, 'sublīmō, -āre, -āvī, -ātum: innalzare, sollevare in alto (sublimis)'),
 'brevio':  (V, 'breviō, -āre, -āvī, -ātum: abbreviare, accorciare [tardo] (brevis)'),
 'taxo':    (V, 'taxō, -āre, -āvī, -ātum: toccare ripetutamente; valutare, stimare, tassare'),
 'foedero': (V, 'foederō, -āre, -āvī, -ātum: stringere in patto, allearsi (foedus, -eris)'),
 'dissido': (V, 'dissideō, -ēre, -sēdī (grafia dissido): essere discorde, dissentire, essere in conflitto'),
 'benefacio': (V, 'benefaciō, -ere, -fēcī, -factum: far del bene, beneficare (+ dat.)'),
 'malefacio': (V, 'malefaciō, -ere, -fēcī, -factum: far del male, nuocere (+ dat.)'),
 'poenio':  (V, 'poeniō, -īre (arc. = pūniō): punire, castigare, vendicare (poena)'),
 'lympho':  (V, 'lymphō, -āre, -āvī, -ātum: far impazzire, invasare (lymphatus: fuori di sé)'),
 'inhabito': (V, 'inhabitō, -āre, -āvī, -ātum: abitare in, dimorare (+ acc.)'),
 'transverto': (V, 'trānsvertō, -ere, -vertī, -versum: volgere altrove, mutare (transversus: obliquo)'),
 'adalligo': (V, 'adalligō, -āre, -āvī, -ātum: legare a, attaccare a (Plinio)'),
 'fastigo': (V, 'fastīgō, -āre, -āvī, -ātum: rendere acuminato, culminare (fastigium: sommità)'),
 'usitor':  (V, 'ūsitor, -ārī (frequentativo di utor): usare abitualmente (usitatus: consueto)'),
 'inopinor': (V, 'inopīnor, -ārī: non aspettarsi — di norma nel ptc. inopinans: che non s\'aspetta, ignaro'),
 'intimo':  (V, 'intimō, -āre, -āvī, -ātum [tardo]: far penetrare; notificare, intimare (intimus)'),
 'heredito': (V, 'hērēditō, -āre, -āvī, -ātum [tardo]: ereditare (hereditas)'),
 'dimidio': (V, 'dīmidiō, -āre, -āvī, -ātum [tardo]: dimezzare (dimidium: metà)'),
 'evacuo':  (V, 'ēvacuō, -āre, -āvī, -ātum [tardo]: vuotare, svuotare; render vano'),
 'pertranseo': (V, 'pertrānseō, -īre, -iī, -itum [tardo]: attraversare da parte a parte, passare oltre'),
 'saepis':  (S, 'saepis, -is f (= saepēs, -is f): siepe, recinto'),
 'vasum':   (S, 'vāsum, -ī n (= vās, vāsis n): vaso, recipiente; pl. vasa: bagagli, arredi'),
 'vermiculus': (S, 'vermiculus, -ī m (dim. di vermis): vermicello; [tardo] cocciniglia, scarlatto'),
 'virgultus': (S, 'virgultum, -ī n (di norma al pl. virgulta): virgulto, cespuglio, sterpaglia'),
 'cichorium': (S, 'cichorium, -ī n: cicoria (gr. κιχόριον)'),
 'lanifica': (A, 'lānificus, -a, -um: che lavora la lana (lāna + facio); lanifica: filatrice'),
 'carnosus': (A, 'carnōsus, -a, -um: carnoso, polposo (caro, carnis)'),
 'caldus':  (A, 'caldus, -a, -um (forma popolare di calidus): caldo'),
 'aerius':  (A, 'āerius, -a, -um: aereo, dell\'aria, alto nel cielo (gr. ἀήρ)'),
 'villaticus': (A, 'vīllāticus, -a, -um: di fattoria, di villa (villa)'),
 'concubo': (V, 'concubō, -āre (= concumbō, -ere, -cubuī, -cubitum): giacere insieme'),
 'exardeo': (V, 'exārdeō, -ēre (cfr. exardescō, -ere, -ārsī): ardere, infiammarsi (d\'ira, di passione)'),
 'expecto': (V, 'expectō, -āre, -āvī, -ātum (grafia di exspectō): aspettare, attendere; sperare'),
 'adspiro': (V, 'adspīrō, -āre, -āvī, -ātum (= aspīrō): soffiare verso; aspirare a, favorire'),
 'adsedeo': (V, 'adsedeō (= assideō), -ēre, -sēdī, -sessum: sedere presso, assistere'),
 'adscisco': (V, 'adscīscō (= ascīscō), -ere, -scīvī, -scītum: accogliere, adottare, associarsi'),
 'accelero': (V, 'accelerō, -āre, -āvī, -ātum: affrettare, accelerare; affrettarsi'),
 'arefacio': (V, 'ārefaciō, -ere, -fēcī, -factum: far seccare, disseccare (areo + facio)'),
 'conivit':  (V, 'cōnīveō, -ēre, -nīvī/-nīxī: chiudere gli occhi; essere connivente, tollerare'),
 'interiacio': (V, 'intericiō (interiaciō), -ere, -iēcī, -iectum: gettare in mezzo, frapporre'),
 'circumiacio': (V, 'circumiaciō, -ere (cfr. circumiaceō): gettare intorno; giacere intorno, circondare'),
 # ── latino cristiano/tardo (Vulgata, Padri) ──────────────────────────────
 'benedico': (V, 'benedīcō, -ere, -dīxī, -dictum: dir bene di, lodare (+ dat.); [crist.] benedire'),
 'sanctifico': (V, 'sānctificō, -āre, -āvī, -ātum [crist.]: santificare, consacrare'),
 'glorifico': (V, 'glōrificō, -āre, -āvī, -ātum [crist.]: glorificare'),
 'honorifico': (V, 'honōrificō, -āre [crist./tardo]: onorare, rendere onore'),
 'vivifico': (V, 'vīvificō, -āre, -āvī, -ātum [crist.]: vivificare, dar vita'),
 'iustifico': (V, 'iūstificō, -āre, -āvī, -ātum [crist.]: giustificare, rendere giusto'),
 'purifico': (V, 'pūrificō, -āre, -āvī, -ātum: purificare'),
 'humilio': (V, 'humiliō, -āre, -āvī, -ātum [crist.]: umiliare, abbassare (humilis)'),
 'exalto':  (V, 'exaltō, -āre, -āvī, -ātum [crist.]: innalzare, esaltare (altus)'),
 'salvo':   (V, 'salvō, -āre, -āvī, -ātum [tardo/crist.]: salvare (classico: servo, conservo)'),
 'salvus':  (A, 'salvus, -a, -um: salvo, incolume, intatto; salve!: salute a te!'),
 'mundo':   (V, 'mundō, -āre, -āvī, -ātum [crist.]: mondare, pulire, purificare (mundus agg.: pulito)'),
 'emundo':  (V, 'ēmundō, -āre, -āvī, -ātum [crist.]: mondare a fondo, purificare'),
 'baptizo': (V, 'baptizō, -āre, -āvī, -ātum [crist.]: battezzare (gr. βαπτίζω: immergere)'),
 'evangelizo': (V, 'ēvangelizō, -āre [crist.]: evangelizzare, annunciare il vangelo (gr. εὐαγγελίζομαι)'),
 'blasphemo': (V, 'blasphēmō, -āre, -āvī, -ātum [crist.]: bestemmiare, oltraggiare (gr. βλασφημέω)'),
 'scandalizo': (V, 'scandalizō, -āre [crist.]: scandalizzare, indurre in errore (gr. σκανδαλίζω)'),
 'transfiguro': (V, 'trānsfigūrō, -āre, -āvī, -ātum: trasformare; [crist.] trasfigurare'),
 'adimpleo': (V, 'adimpleō, -ēre, -plēvī, -plētum [crist.]: adempiere, compiere; riempire'),
 'reprobo': (V, 'reprobō, -āre, -āvī, -ātum [tardo]: riprovare, respingere, rigettare'),
 'tribulo': (V, 'trībulō, -āre [crist.]: pressare, tribolare, affliggere (tribulum: trebbia)'),
 'zelo':    (V, 'zēlō, -āre [crist.]: amare con zelo; essere geloso di (gr. ζηλόω)'),
 'fornicor': (V, 'fornicor, -ārī, -ātus sum [crist.]: fornicare (fornix: volta, postribolo)'),
 'conforto': (V, 'cōnfortō, -āre, -āvī, -ātum [tardo/crist.]: rafforzare, confortare (fortis)'),
 'inhonoro': (V, 'inhonōrō, -āre [tardo]: disonorare, trattare senza onore'),
 'obdormisco': (V, 'obdormīscō, -ere, -dormīvī: addormentarsi'),
 'planto':  (V, 'plantō, -āre, -āvī, -ātum [tardo]: piantare (planta; classico: sero)'),
 'ieiuno':  (V, 'iēiūnō, -āre, -āvī, -ātum [crist.]: digiunare (ieiunium: digiuno)'),
 'fideiubeo': (V, 'fideiubeō, -ēre, -iussī, -iussum [giur.]: garantire, farsi fideiussore'),
 'fideicommitto': (V, 'fideicommittō, -ere [giur.]: affidare per fedecommesso'),
 'subiaceo': (V, 'subiaceō, -ēre, -iacuī: giacere sotto; essere soggetto a (+ dat.)'),
 'subiugo': (V, 'subiugō, -āre, -āvī, -ātum [tardo]: soggiogare, sottomettere (iugum)'),
 'applumbo': (V, 'applumbō, -āre [tecnico]: impiombare, saldare col piombo'),
 'eremus':  (S, 'erēmus, -ī f [crist.]: deserto, eremo (gr. ἔρημος)'),
 # ── onomastica e etnici scolastici ───────────────────────────────────────
 'Caesar':  (S, 'Caesar, -aris m: Cesare, cognomen della gens Iulia; per antonomasia C. Giulio Cesare; poi titolo imperiale'),
 'Carthago': (S, 'Carthāgō, -inis f: Cartagine (Karthago); Carthago Nova: Cartagena'),
 'Carthaginiensis': (A, 'Carthāginiēnsis, -e: cartaginese; pl. i Cartaginesi'),
 'Cornelius': (S, 'Cornēlius, -a: nome della gens Cornelia (Scipioni, Silla, Cinna)'),
 'Claudius': (S, 'Claudius, -a: nome della gens Claudia; l\'imperatore Claudio'),
 'Fabius':  (S, 'Fabius, -a: nome della gens Fabia (Q. Fabio Massimo il Temporeggiatore)'),
 'Livius':  (S, 'Līvius, -a: nome della gens Livia; Tito Livio, lo storico patavino'),
 'Valerius': (S, 'Valerius, -a: nome della gens Valeria (Publicola; Valerio Massimo)'),
 'Octavius': (S, 'Octāvius, -a: nome della gens Octavia; C. Ottavio, il futuro Augusto'),
 'Fulvius': (S, 'Fulvius, -a: nome della gens Fulvia'),
 'Furius':  (S, 'Fūrius, -a: nome della gens Furia (M. Furio Camillo)'),
 'Marcius': (S, 'Mārcius, -a: nome della gens Marcia (Anco Marzio; Coriolano)'),
 'Servius': (S, 'Servius, -ī m: Servio (praenomen; Servio Tullio, sesto re di Roma)'),
 'Quintius': (S, 'Quīnctius (Quintius), -a: nome della gens Quinzia (Cincinnato; T. Quinzio Flaminino)'),
 'Sestius': (S, 'Sestius, -a: nome della gens Sestia (P. Sestio, difeso da Cicerone)'),
 'Naevius': (S, 'Naevius, -a: Nevio (Cn. Naevius, poeta arcaico); nome gentilizio'),
 'Attius':  (S, 'Attius, -a: nome gentilizio (anche Accius: Accio, il tragediografo)'),
 'Plautius': (S, 'Plautius, -a: nome della gens Plauzia'),
 'Gracchus': (S, 'Gracchus, -ī m: Gracco (Tiberio e Gaio Sempronio Gracco, i tribuni riformatori)'),
 'Argivus': (A, 'Argīvus, -a, -um: argivo, di Argo; pl. gli Argivi = i Greci (in Omero/Virgilio)'),
 'Argolicus': (A, 'Argolicus, -a, -um: argolico, greco'),
 'Etruscus': (A, 'Etrūscus, -a, -um: etrusco; pl. gli Etruschi'),
 'Tyrrhenus': (A, 'Tyrrhēnus, -a, -um: tirreno, etrusco'),
 'Siculus': (A, 'Siculus, -a, -um: siculo, siciliano'),
 'Tyrius':  (A, 'Tyrius, -a, -um: tirio, di Tiro; purpureo; pl. i Cartaginesi (in Virgilio)'),
 'Parthus': (A, 'Parthus, -a, -um: parto; pl. i Parti, arcieri a cavallo nemici di Roma'),
 'Volscus': (A, 'Volscus, -a, -um: volsco; pl. i Volsci, popolo del Lazio meridionale'),
 'Campanus': (A, 'Campānus, -a, -um: campano, di Capua'),
 'Dardanus': (A, 'Dardanus, -a, -um: dardano, troiano (da Dardano, capostipite)'),
 'Idaeus':  (A, 'Īdaeus, -a, -um: del monte Ida (di Creta o di Troade)'),
 'Indus':   (A, 'Indus, -a, -um: indiano; m. l\'Indo (fiume)'),
 'Libycus': (A, 'Libycus, -a, -um: libico, africano'),
 'Massylus': (A, 'Massȳlus, -a, -um: massilo, numida, nordafricano'),
 'Geticus': (A, 'Geticus, -a, -um: getico, dei Geti (Traci del basso Danubio)'),
 'Sarmaticus': (A, 'Sarmaticus, -a, -um: sarmatico, della Sarmazia'),
 'Rhodius': (A, 'Rhodius, -a, -um: rodio, di Rodi'),
 'Laurens': (A, 'Laurēns, -entis: laurente, di Lavinio/Laurento (costa del Lazio)'),
 'Veiens':  (A, 'Vēiēns, -entis: veiente, di Veio'),
 'Aetolus': (A, 'Aetōlus, -a, -um: etolo, dell\'Etolia'),
 'Appulus': (A, 'Appulus (Āpulus), -a, -um: apulo, della Puglia'),
 'Aventinus': (S, 'Aventīnus, -ī m: l\'Aventino, uno dei sette colli di Roma'),
 'Syria':   (S, 'Syria, -ae f: la Siria'),
 'Graecum': (A, 'Graecus, -a, -um: greco; Graece: in greco; n. Graecum: il greco'),
 'Venereus': (A, 'Venereus, -a, -um: di Venere; venereo (Venus, -eris)'),
}

# ── PAROLE-FUNZIONE LATINE (batch FORZATO: sovrascrive voci rotte/tronche) ──
# L'audit ha trovato: cum/ut/si/ab/a/vel/dum ASSENTI; in=«aggettivo»,
# iam=«aggettivo», pro/sine/apud/ne/e/quia senza pos o con definizioni tronche.
LATIN_FUNC = {
 'in':   (PR, '+ abl.: in, su (stato in luogo); + acc.: in, verso, contro (moto a luogo)'),
 'a':    (PR, 'ā: forma di ab davanti a consonante — + abl.: da, via da; complemento d\'agente'),
 'ab':   (PR, '+ abl.: da, a partire da (moto da luogo, origine); complemento d\'agente coi passivi (ā davanti a cons., abs in abs tē)'),
 'e':    (PR, 'ē: forma di ex davanti a consonante — + abl.: da, fuori da'),
 'de':   (PR, '+ abl.: da, giù da (moto dall\'alto); riguardo a, intorno a (Dē bellō Gallicō); di (partitivo)'),
 'cum':  (PR, '1) prep. + abl.: con, insieme a (mēcum, tēcum) | 2) cong.: quando (cum + ind.); poiché, sebbene, mentre (cum narrativo + cong.)'),
 'ut':   (C, '+ ind.: come, quando; + cong.: affinché (finale), che (completiva), cosicché (consecutiva; spesso con ita/sic), sebbene (concessiva)'),
 'ne':   (C, '1) + cong.: affinché non (finale negativa), che (dopo i verba timendi) | 2) nē … quidem: neppure | 3) -ne enclitica interrogativa'),
 'si':   (C, 'se (introduce il periodo ipotetico: + ind. realtà, + cong. possibilità/irrealtà)'),
 'vel':  (C, 'o, oppure (scelta indifferente: vel … vel); avv.: perfino, ad esempio'),
 'dum':  (C, 'mentre (+ ind. presente); finché (+ ind./cong.); purché (+ cong.: dum, dummodo)'),
 'pro':  (PR, '+ abl.: davanti a; in difesa di, in favore di (prō patriā); al posto di, in cambio di; in proporzione a'),
 'sine': (PR, '+ abl.: senza'),
 'apud': (PR, '+ acc.: presso, in casa di, davanti a; in (un autore: apud Homērum)'),
 'quia': (C, 'perché, poiché (causale oggettiva)'),
 'iam':  (AV, 'già, ormai; subito, ora; nōn iam: non più; iam prīdem: già da tempo'),
 'propter': (PR, '+ acc.: a causa di, per; avv.: vicino, accanto'),
 'ante': (PR, '+ acc.: davanti a (luogo), prima di (tempo); avv.: prima, davanti (ante quam → antequam)'),
 'post': (PR, '+ acc.: dopo (tempo), dietro (luogo); avv.: poi, in seguito (post quam → postquam)'),
 'contra': (PR, '+ acc.: contro, di fronte a; avv.: al contrario, invece'),
 'nec':  (C, 'né, e non (= neque; nec … nec: né … né)'),
 'ergo': (C, 'dunque, quindi, perciò (conclusiva); + gen. preposto: a causa di (arcaico)'),
}

def main():
    # batch forzato: le parole-funzione sovrascrivono voci rotte o mancanti
    base = 'data/latin'
    shards = {}
    forced = 0
    for lemma, (pos, definition) in LATIN_FUNC.items():
        letter = norm(lemma)[:1]
        path = os.path.join(base, f'{letter}.json')
        if not os.path.exists(path): continue
        data = shards.get(path) or json.load(open(path, encoding='utf-8'))
        shards[path] = data
        data['dict'][lemma] = { 'pos': pos, 'definition': definition, 'src': 'curated' }
        forced += 1
    for path, data in shards.items():
        data.setdefault('meta', {})['lemmas_count'] = len(data['dict'])
        json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'latin: {forced} parole-funzione curate (forzate)')

    for lang, table in (('greek', GREEK), ('latin', LATIN)):
        base = f'data/{lang}'
        shards = {}
        injected = skipped = 0
        for lemma, (pos, definition) in table.items():
            letter = norm(lemma)[:1]
            path = os.path.join(base, f'{letter}.json')
            if not os.path.exists(path):
                print(f'  [!] shard {letter} mancante per {lemma}'); continue
            data = shards.get(path) or json.load(open(path, encoding='utf-8'))
            shards[path] = data
            if lemma in data['dict'] and data['dict'][lemma].get('src') != 'curated':
                skipped += 1; continue
            data['dict'][lemma] = { 'pos': pos, 'definition': definition, 'src': 'curated' }
            injected += 1
        for path, data in shards.items():
            data.setdefault('meta', {})['lemmas_count'] = len(data['dict'])
            json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        print(f'{lang}: iniettate {injected} voci curate (saltate {skipped} già presenti non-curate)')

    # ── passo 2 · grafie etimologiche → voce-rinvio alla canonica attiva ──
    ASSIM = [('adf','aff'),('adc','acc'),('adg','agg'),('adl','all'),('adp','app'),
             ('adq','acq'),('ads','ass'),('adt','att'),('adr','arr'),('adn','ann'),
             ('conl','coll'),('conm','comm'),('conr','corr'),('conp','comp'),
             ('inl','ill'),('inm','imm'),('inr','irr'),('inp','imp'),
             ('obc','occ'),('obf','off'),('obp','opp'),
             ('subc','succ'),('subf','suff'),('subg','sugg'),('subm','summ'),
             ('subp','supp'),('subr','surr'),('exf','eff'),('disf','diff')]
    base = 'data/latin'
    canon = lambda s: s.strip().lstrip('# ').replace('-','').replace('_','').replace('j','i').replace('J','I')
    active = {}
    for f in os.listdir(base):
        if not f.endswith('.json') or f.startswith('_') or f == 'aliases.json': continue
        data = json.load(open(os.path.join(base, f), encoding='utf-8'))
        if 'dict' not in data: continue
        for k, v in data['dict'].items():
            active[norm(re.sub(r'\d+$','',canon(k)))] = (k, v)
    refs = collections.Counter()
    for f in os.listdir(base):
        if not f.endswith('.json') or f.startswith('_') or f == 'aliases.json': continue
        data = json.load(open(os.path.join(base, f), encoding='utf-8'))
        for form, cands in (data.get('forms') or {}).items():
            for c in cands: refs[canon(c['lemma'])] += 1
    shards = {}
    xrefs = 0
    for lem in refs:
        fk = norm(lem)
        if fk in active: continue
        for a, b in ASSIM:
            hit = None
            if fk.startswith(a) and (b + fk[len(a):]) in active: hit = active[b + fk[len(a):]]
            elif fk.startswith(b) and (a + fk[len(b):]) in active: hit = active[a + fk[len(b):]]
            if hit:
                tk, tv = hit
                letter = fk[:1]
                path = os.path.join(base, f'{letter}.json')
                if not os.path.exists(path): break
                data = shards.get(path) or json.load(open(path, encoding='utf-8'))
                shards[path] = data
                if lem not in data['dict']:
                    data['dict'][lem] = { 'pos': tv.get('pos',''),
                        'definition': f'(grafia non assimilata di {tk}) ' + (tv.get('definition','') or '')[:380],
                        'src': 'xref' }
                    xrefs += 1
                break
    for path, data in shards.items():
        data.setdefault('meta', {})['lemmas_count'] = len(data['dict'])
        json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'latin: iniettate {xrefs} voci-rinvio per grafie non assimilate')

if __name__ == '__main__':
    main()
