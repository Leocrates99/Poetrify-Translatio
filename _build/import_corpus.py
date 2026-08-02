#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
import_corpus.py  ·  Poetrify — ramo CORPUS (import integrale del canone Perseus)
==================================================================================
Importa TUTTE le opere greche e latine dei due repository canonici Perseus e le
normalizza nei JSON leggeri che alimentano `corpus.html`.

Solo TESTO (nessun apparato critico): i testi antichi sono di pubblico dominio,
le edizioni digitali Perseus sono rilasciate con licenza CC BY-SA.

FONTE = CLONE LOCALE, non l'API
-------------------------------
L'API di GitHub concede 60 richieste l'ora: con ~1.170 opere servirebbero ore.
Si lavora quindi su cloni superficiali (fase C0 di CORPUS_SPEC.md):

    mkdir -p _build/corpus_sources && cd _build/corpus_sources
    git clone --depth 1 --single-branch https://github.com/PerseusDL/canonical-latinLit.git
    git clone --depth 1 --single-branch https://github.com/PerseusDL/canonical-greekLit.git

Da lì autore, titolo ed edizione si leggono dai `__cts__.xml` già presenti: zero
richieste di rete, e si può rilanciare quante volte serve.

USO
---
    PYTHONIOENCODING=utf-8 python _build/import_corpus.py            # tutto
    PYTHONIOENCODING=utf-8 python _build/import_corpus.py --limit 40 # prova rapida

USCITE
------
    data/corpus/<lang>/<tg>.<wk>.json   una per opera (testo + loci)
    data/corpus/_index.json             catalogo: opere, autori, faccette
    _build/reports/corpus_import.json   registro COMPLETO, scarti inclusi
"""

import json
import os
import re
import shutil
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from corpus_meta import meta_for, name_for, year_for, TEXTGROUPS  # noqa: E402
from corpus_titles import title_for                     # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "corpus_sources")
OUT = os.path.join(ROOT, "data", "corpus")
REPORTS = os.path.join(HERE, "reports")

REPOS = [
    ("canonical-latinLit", "la", "lat", "latinLit"),
    ("canonical-greekLit", "grc", "grc", "greekLit"),
]
LICENSE = "CC BY-SA (Perseus Digital Library)"

GREEK_CH = re.compile(r"[Ͱ-Ͽἀ-῿]")
LATIN_CH = re.compile(r"[A-Za-z]")

# ── Cancello di FRUIBILITÀ (fase C2) ──────────────────────────────────────
# La soglia distingue la SCHEDA VUOTA dal TESTO BREVE: i frammenti di Appiano e i
# «Fragmenta» di Seneca il Vecchio esistono nel repo con 0-3 caratteri (schede
# senza testo), mentre gli Inni omerici 13 e 23 sono opere complete di tre o
# quattro versi (139 e 171 caratteri). Con la soglia a 200 buttavamo via anche
# quelli: sta a 50, che separa il vuoto dal breve senza perdere nulla di reale.
MIN_CHARS = 50
MIN_UNITS = 1
MAX_FOREIGN_PCT = 15.0   # oltre: edizione bilingue (greco + versione latina a fronte)

# ── Doppioni della fonte (decisione del docente, 1 ago 2026) ──────────────
# Livio è l'UNICO textgroup del canone Perseus — uno su 1.226 directory d'opera —
# in cui accanto all'opera dichiarata dal catalogo CTS stanno altre 46 cartelle
# senza `__cts__.xml`, che l'enumeratore promuove a opere a pieno titolo. Il
# risultato era mezzo milione di parole in catalogo due volte: ogni passo di
# Livio usciva doppio dalla ricerca e la barra per autore ne raddoppiava il peso.
#
# I due testimoni portano lo STESSO Livio — gli stessi 35 libri superstiti (I-X,
# XXI-XLV), identici al 98,5% dei token — ma phi001 è il Teubner Weissenborn-
# Müller uniforme e dichiarato, mentre le 46 cartelle sono un rammendo di OCT
# Conway, Loeb e Weissenborn-Weidmann senza edizione dichiarata, con otto libri
# stampati in *u* consonantica e ventisette in *v*.
#
# SI TIENE phi001, e con esso NON SI PERDE NULLA di ciò che le cartelle davano:
#   · le 45 Periochae dei libri I-XLV stanno già dentro phi001 (loci «1s»…«45s»),
#     e le dieci schede autonome 11s-20s ne sono una seconda redazione con lo
#     stesso identico conteggio di parole;
#   · le Periochae dei 97 libri perduti XLVI-CXLII restano in phi001fr, che dopo
#     la correzione di edition_root() entra per intero invece che al 2%.
# Restano fuori le lezioni proprie di Loeb e OCT: è il prezzo dichiarato di
# avere un solo testimone con un'edizione sola.
ESCLUSE = {
    k: "doppione della fonte: lo stesso testo è già in phi0914.phi001"
    for k in ([f"phi0914.phi001{n}" for n in range(1, 11)] +      # libri I-X
              [f"phi0914.phi001{n}" for n in range(21, 46)] +     # libri XXI-XLV
              [f"phi0914.phi001{n}s" for n in range(11, 21)])     # periochae XI-XX
}

# Sulpicia · il secondo caso, e non è un difetto d'import ma una scheda che si
# sovrappone da sé. phi0660.phi003 sono le sei elegie della sola poetessa latina
# di cui resti l'opera, e stanno GIÀ dentro «Elegie» di Tibullo ai loci
# 3.13.1-3.18.6: il Corpus Tibullianum le tramanda nel suo terzo libro. La
# scheda a parte le rinumerava da 1 a 6 sotto il titolo «Carmina omnia», che è
# falso due volte — non sono i carmi di nessuno per intero — e insegnava una
# citazione («Sulpicia 1,1») che non esiste in nessuna edizione. Potandola,
# Sulpicia resta leggibile con il locus canonico e trovabile per nome: il suo
# nome è nel testo di Tibullo, a 3.8.1 e a 3.16.4.
ESCLUSE["phi0660.phi003"] = (
    "doppione: sono le elegie di Sulpicia, già in phi0660.phi001 a 3.13-3.18"
)


# ══════════════════════════════════════════════════════════════════════════
# Parsing TEI — nucleo collaudato sul nucleo scolastico (non toccare a cuor
# leggero: le tre correzioni qui sotto sono state pagate con bug reali)
# ══════════════════════════════════════════════════════════════════════════
def ln(tag):
    """Local-name senza namespace. NB: i repo Perseus usano TRE convenzioni
    diverse (`ti:`, `cts:`, namespace di default) → mai filtrare per prefisso."""
    return tag.rsplit("}", 1)[-1]


# ── Entità HTML non dichiarate ────────────────────────────────────────────
# Parecchi file Perseus usano entità HTML (&dagger; &mdash; &iacute; &aelig;…)
# senza dichiararle nel DTD: un parser XML rigoroso rifiuta l'INTERO file. Nel
# primo giro d'import ci costava 17 opere — nove di un solo autore, una di
# Tacito, una di Cicerone — buttate via per una croce tipografica.
# Le convertiamo nel carattere Unicode corrispondente e riproviamo.
_ENT = re.compile(r"&([a-zA-Z][a-zA-Z0-9]*);")
_XML_BUILTIN = {"amp", "lt", "gt", "quot", "apos"}


def _fix_entities(text):
    import html.entities as he

    def rep(m):
        name = m.group(1)
        if name in _XML_BUILTIN:
            return m.group(0)
        ch = he.html5.get(name + ";") or he.html5.get(name)
        if not ch:
            return ""                       # ignota: meglio perdere un segno che il file
        return {"&": "&amp;", "<": "&lt;", ">": "&gt;"}.get(ch, ch)

    return _ENT.sub(rep, text)


# ── Struttura sbilanciata ─────────────────────────────────────────────────
# Due file del canone non aprono nemmeno: un parser rigoroso rifiuta l'intero
# documento per un tag che manca o per uno di troppo, e l'opera sparisce dal
# catalogo come «XML illeggibile». I guasti sono simmetrici e banali:
#
#   · phi0692.phi009 (il Catalepton) usa lo schema TEI a gruppo —
#     <text><group> … <text n="catalepton"> … — e non chiude né il group né il
#     text esterno: mancano due tag in fondo. Sono sedici componimenti, e con i
#     loro <div1 type="poem" n="N"> sarebbe l'unica opera dell'Appendix
#     Vergiliana citabile per numero.
#   · phi0972.phi001p (Petronio) ha la sequenza di chiusura scritta DUE volte:
#     «</body></text></TEI>» compare, identica, anche dopo la fine.
#
# Il rimedio è lo stesso schema delle entità qui sopra — si risana e si ritenta —
# e come quello non indovina nulla: si limita a pareggiare il conto dei tag.
_TAG = re.compile(r"<(/?)([A-Za-z][\w.:-]*)([^>]*?)(/?)>")


def _fix_structure(raw):
    """Pareggia i tag di struttura: taglia la coda dopo la chiusura della radice
    e chiude quelli rimasti aperti NEL PUNTO in cui lo squilibrio si manifesta.

    L'ultimo dettaglio è quello che conta: aggiungere i tag mancanti in fondo al
    documento non servirebbe, perché la chiusura della radice è già lì e i tag
    orfani vanno chiusi PRIMA di lei. Ce ne si accorge quando una chiusura non
    corrisponde alla cima della pila: lì, e non altrove, va messa la toppa."""
    fine = re.search(r"</TEI(?:\.\d)?\s*>", raw)
    if fine and raw[fine.end():].strip():
        raw = raw[: fine.end()]                    # coda di chiusura ripetuta

    pila, toppe = [], []
    for t in _TAG.finditer(raw):
        chiude, nome, _attr, auto = t.groups()
        if auto or nome[:1] in "?!":
            continue
        if not chiude:
            pila.append(nome)
            continue
        if nome not in pila:
            continue                               # chiusura orfana: non si tocca
        mancanti = []
        while pila and pila[-1] != nome:
            mancanti.append(pila.pop())
        if pila:
            pila.pop()
        if mancanti:
            toppe.append((t.start(), "".join(f"</{x}>" for x in mancanti)))

    if not toppe:
        return raw
    pezzi, ultimo = [], 0
    for pos, testo in toppe:
        pezzi.append(raw[ultimo:pos])
        pezzi.append(testo)
        ultimo = pos
    pezzi.append(raw[ultimo:])
    return "".join(pezzi)


def parse_tei(path):
    """Parsing tollerante: se il file inciampa, si risana e si ritenta.

    I rimedi si provano in cascata perché non si escludono — il Catalogo del
    Catalepton ha insieme un'entità non dichiarata E la struttura sbilanciata,
    e nessuno dei due rimedi da solo gli basta."""
    raw = open(path, "rb").read().decode("utf-8", "replace")
    rimedi = (lambda s: s,
              _fix_entities,
              _fix_structure,
              lambda s: _fix_structure(_fix_entities(s)))
    ultimo = None
    for rimedio in rimedi:
        try:
            return ET.fromstring(rimedio(raw))
        except ET.ParseError as e:
            ultimo = e
    raise ultimo


# Elementi il cui contenuto NON è testo d'autore.
# NB: `cit` NON va qui. Un <cit> è «citazione + sua fonte»: contiene il testo citato
# (<quote>, <l>, <p>) e la referenza (<bibl>). Saltando l'intero <cit> si buttavano
# via ~20.000 parole di testo vero; bastano `bibl` e `ref`, già presenti, a togliere
# la sola referenza bibliografica.
SKIP_TEXT = {"note", "bibl", "ref", "head", "milestone", "gap", "del", "figure"}

# Coppie di varianti mutuamente esclusive. In TEI stanno di norma dentro <choice>,
# ma capita che siano fratelli diretti senza involucro: allora vanno trattate come
# una scelta implicita, altrimenti nel testo finiscono ENTRAMBE le letture.
IMPLICIT_CHOICE = {"abbr": "expan", "sic": "corr", "orig": "reg"}


def clean_text(elem):
    """Testo pulito dell'elemento, saltando note/apparato/heading."""
    parts = []

    def walk(e):
        # NB: il .tail di ogni figlio lo aggiunge SEMPRE il loop del genitore
        # (sotto). Qui, per un elemento saltato, ci limitiamo a non scenderci
        # dentro — aggiungere il tail anche qui lo conterebbe due volte.
        tag = ln(e.tag)
        if tag in SKIP_TEXT:
            return
        # <choice> = varianti MUTUAMENTE ESCLUSIVE (abbr/expan, orig/reg, sic/corr):
        # se ne prende UNA sola, non tutte. Preferiamo la forma espansa/normalizzata
        # (parola intera, più utile allo studente).
        if tag == "choice":
            kids = list(e)
            chosen = None
            for pref in ("expan", "reg", "corr", "abbr", "orig", "sic"):
                chosen = next((c for c in kids if ln(c.tag) == pref), None)
                if chosen is not None:
                    break
            if chosen is None and kids:
                chosen = kids[0]
            if chosen is not None:
                walk(chosen)
            return
        if e.text:
            parts.append(e.text)
        # scelta implicita: se fra i figli c'è sia `abbr` sia `expan` (o sic/corr,
        # orig/reg) senza <choice> attorno, si tiene solo la forma preferita.
        kids = list(e)
        present = {ln(c.tag) for c in kids}
        drop = {a for a, b in IMPLICIT_CHOICE.items() if a in present and b in present}
        for c in kids:
            if ln(c.tag) not in drop:
                walk(c)
            if c.tail:
                parts.append(c.tail)

    walk(elem)
    # Concatenazione SENZA separatori: il TEI porta già i propri spazi nei nodi
    # text/tail; inserirne di artificiali spezzerebbe le parole tagliate da un
    # elemento inline (es. un <milestone/> a metà di «Titum»).
    s = "".join(parts)
    return re.sub(r"\s+", " ", s).strip()


def find_body(root):
    for e in root.iter():
        if ln(e.tag) == "body":
            return e
    return root


def edition_root(body):
    """Il ramo che contiene l'edizione. Riconosce anche la marcatura TEI antica
    (`div1`), altrimenti su quei file si ripiegava sul <body> intero.

    UN solo <div> senza tipo è l'involucro dell'edizione, e ci si scende dentro.
    PIÙ d'uno sono già le sue partizioni — i libri, i frammenti, le periochae — e
    scendere nel primo significa buttare via tutti i fratelli. Costava due opere
    quasi intere: le Periochae dei 97 libri perduti di Livio entravano con UNO dei
    97 <div> (210 parole su 11.691) e i Fragmenta di Petronio con uno su 26.
    """
    for e in body.iter():
        if DIVLIKE.match(ln(e.tag)) and e.get("type") == "edition":
            return e
    figli = [e for e in body if DIVLIKE.match(ln(e.tag))]
    if figli:
        if len(figli) > 1 or ln(figli[0].tag) != "div":
            return body
        return figli[0]
    return body


def structural_divs(tei_root):
    """Quanti <div> stanno fra il <body> e il PRIMO GRADO DI CITAZIONE.

    Non è un'euristica: lo dichiara il file stesso. Nel `refsDecl` marcato CTS il
    pattern più grossolano — quello con un solo gruppo — porta l'xpath completo
    fino al primo grado citabile, e i <div> che lo precedono sono STRUTTURA
    dell'edizione, non gradi del riferimento:

        book: /tei:TEI/tei:text/tei:body/tei:div/tei:div/tei:div[@n='$1']
                                          edizione  pars    libro ← qui si cita

    Nella stragrande maggioranza dei file (1.778 su 1.796) i <div> sono due —
    l'edizione e il grado citabile — e non c'è nulla da saltare. In diciotto no,
    e lì il livello di troppo finiva dritto nel locus: Catullo si citava
    «lyrics.5.1» invece di 5,1; Giovenale «5.16.60» col numero del libro davanti;
    le Lettere a Lucilio «20.124.24»; gli otto Dialoghi di Seneca col numero del
    dialogo in testa («10.1.1» per Brev. 1,1); Livio con la pars del Teubner
    («2.21.35.1» per 21,35,1). Restituisce None se il file non lo dichiara.
    """
    livelli = None
    for e in tei_root.iter():
        if ln(e.tag) != "cRefPattern":
            continue
        rp = e.get("replacementPattern") or ""
        m = re.search(r"\$1", rp)
        if not m or len(re.findall(r"\$\d", rp)) != 1:
            continue                       # non è il grado più grossolano
        livelli = len(re.findall(r"tei:div", rp[: m.start()]))
    return livelli


def div_depth(body, target):
    """Quanti livelli di <div> separano il <body> dall'elemento dato (incluso)."""
    if target is body:
        return 0
    padre = {c: p for p in body.iter() for c in p}
    n, e = 0, target
    while e is not body and e in padre:
        if DIVLIKE.match(ln(e.tag)):
            n += 1
        e = padre[e]
    return n


DIVLIKE = re.compile(r"div\d*$")          # `div` e la marcatura TEI antica div1…div4
CONTAINER = {"lg", "sp", "quote", "cit", "body", "text", "group"}
PROSE_UNIT = {"p", "said", "ab"}

# <div type="textpart" subtype="index"> è l'INDEX NOTARUM: la tavola delle sigle
# dei codici («V = Veronensis saec. V.»), apparato dell'editore e non testo
# d'autore. In tutto il corpus compare in un file solo — il Livio del Teubner,
# due volte — dove valeva 64 unità di sigle in testa al testo e, non avendo @n,
# rubava il numero 1 al primo libro di ciascuna pars: trentuno loci in collisione.
SKIP_TEXTPART = {"index"}


def extract(elem, path, units, kind_flags, salta=0):
    """Estrae ricorsivamente le unità citabili. Ritorna quante ne ha prodotte.

    `salta` è il numero di livelli di <div> ancora da ATTRAVERSARE SENZA CITARE,
    calcolato da structural_divs() sul refsDecl del file: sono le partizioni
    dell'edizione (parti, volumi, libri di raccolta) che il CTS dichiara fuori
    dal riferimento canonico. Si consuma un livello per volta e si azzera appena
    si entra in un grado citabile.

    Un solo ciclo tratta versi e paragrafi INSIEME: la versione precedente, appena
    incontrava un <l> o un <div>, usciva prima di guardare i <p> fratelli — e in
    un'opera mista (prosa con versi citati) quei paragrafi sparivano dal testo.

    Si scende anche dentro `quote` e `cit`: i versi citati dentro una citazione sono
    versi, non prosa; senza questo, ~17.000 versi finivano appiattiti e certe opere
    venivano classificate «prosa» a torto.

    I contenitori senza `n` contribuiscono al locus con la loro POSIZIONE: senza,
    rami diversi collassavano sullo stesso locus (fino a 35 unità con la stessa
    citazione, che rende impossibile puntare al passo giusto).
    """
    made = 0
    # numerazione di riserva per i figli privi di @n, per tipo
    seq = {}
    kids = list(elem)
    plain = {t: sum(1 for c in kids if ln(c.tag) == t and not c.get("n"))
             for t in ("p", "said", "ab", "l")}

    for c in kids:
        t = ln(c.tag)
        n = c.get("n")

        if t == "l":
            if not n and plain["l"] > 1:
                seq["l"] = seq.get("l", 0) + 1
                n = str(seq["l"])
            loc = [x for x in path + ([n] if n else []) if x]
            txt = clean_text(c)
            if txt:
                units.append((".".join(loc), txt))
                kind_flags["verse"] = True
                made += 1

        elif t in PROSE_UNIT:
            if not n and plain.get(t, 0) > 1:
                seq[t] = seq.get(t, 0) + 1
                n = str(seq[t])
            loc = [x for x in path + ([n] if n else []) if x]
            txt = clean_text(c)
            if txt:
                units.append((".".join(loc), txt))
                kind_flags["prose"] = True
                made += 1

        elif t == "speaker":
            # nel dramma il nome del personaggio è testo, non impaginazione:
            # senza questo ramo sparivano ~40.000 battute d'attacco.
            txt = clean_text(c)
            if txt:
                units.append((".".join([x for x in path if x]), txt))
                made += 1

        elif DIVLIKE.match(t) or t in CONTAINER:
            # L'apparato dell'editore ha un nome proprio nel TEI: non si indovina.
            if c.get("type") == "textpart" and (c.get("subtype") or "").lower() in SKIP_TEXTPART:
                continue
            # Livello di STRUTTURA: si attraversa, non entra nel locus.
            if salta and DIVLIKE.match(t):
                made += extract(c, path, units, kind_flags, salta - 1)
                continue
            if not n:
                seq[t] = seq.get(t, 0) + 1
                same = sum(1 for k in kids if ln(k.tag) == t)
                if same > 1:
                    n = str(seq[t])
            made += extract(c, path + ([n] if n else []), units, kind_flags)

    if made == 0:
        txt = clean_text(elem)
        if txt:
            units.append((".".join([x for x in path if x]), txt))
            kind_flags["prose"] = True
            made = 1
    return made


def dedupe_loci(units):
    """Rete di sicurezza: se due unità restano con lo stesso locus, si distinguono.

    Il locus è ciò che rende citabile un passo e ciò su cui il lettore salta dai
    risultati di ricerca: due unità omonime mandano sempre alla prima.
    """
    seen = {}
    out = []
    for loc, txt in units:
        if loc in seen:
            seen[loc] += 1
            loc = f"{loc}#{seen[loc]}"
        else:
            seen[loc] = 1
        out.append((loc, txt))
    return out


def citation_label(units, kind):
    depth = max((u[0].count(".") + 1 for u in units if u[0]), default=1)
    if kind == "versi":
        return {1: "verso", 2: "libro.verso", 3: "libro.canto.verso"}.get(depth, "loci")
    return {1: "capitolo", 2: "libro.capitolo", 3: "libro.capitolo.paragrafo"}.get(depth, "loci")


# ══════════════════════════════════════════════════════════════════════════
# Metadati CTS (autore, titolo, edizione di provenienza)
# ══════════════════════════════════════════════════════════════════════════
def cts_first(path, localname, lang_pref=()):
    """Primo elemento <localname> del file CTS, preferendo un xml:lang dato."""
    if not os.path.exists(path):
        return None
    try:
        root = parse_tei(path)
    except ET.ParseError:
        return None
    found = {}
    for e in root.iter():
        if ln(e.tag) == localname and (e.text or "").strip():
            lg = e.get("{http://www.w3.org/XML/1998/namespace}lang") or ""
            found.setdefault(lg, e.text.strip())
    for lg in lang_pref:
        if lg in found:
            return found[lg]
    return next(iter(found.values()), None)


XLANG = "{http://www.w3.org/XML/1998/namespace}lang"


def edition_label_and_desc(path, tag, edition_id=None):
    """Titolo in LINGUA ORIGINALE e citazione dell'edizione a stampa.

    Attenzione: nel catalogo Perseus il titolo greco/latino NON sta quasi mai in
    <title> (solo 8 opere greche su 772 hanno un <title xml:lang="grc">): sta
    nella <label> dell'<edition>. Per Tucidide, <title> dà «History of the
    Peloponnesian War», mentre l'edizione porta «Ἱστορίαι» — che è quello che
    un lettore si aspetta di vedere nel catalogo.
    """
    if not os.path.exists(path):
        return None, None
    try:
        root = parse_tei(path)
    except ET.ParseError:
        return None, None
    fallback = (None, None)
    by_lang = (None, None)
    for e in root.iter():
        if ln(e.tag) != "edition":
            continue
        label = desc = None
        for d in e.iter():
            t = ln(d.tag)
            if t == "label" and (d.text or "").strip() and label is None:
                label = re.sub(r"\s+", " ", d.text.strip())
            elif t == "description" and (d.text or "").strip() and desc is None:
                desc = re.sub(r"\s+", " ", d.text.strip())
        # Corrispondenza ESATTA con l'edizione che stiamo davvero importando: senza,
        # un'opera con più edizioni nella stessa lingua veniva attribuita alla stampa
        # sbagliata (curatore ed editore altrui accanto a un testo che non è suo).
        if edition_id and (e.get("urn") or "").endswith(edition_id):
            return label, desc
        if e.get(XLANG) == tag and by_lang == (None, None):
            by_lang = (label, desc)
        if fallback == (None, None):
            fallback = (label, desc)
    return by_lang if by_lang != (None, None) else fallback


def tei_header_title(root):
    """Titolo preso dall'intestazione del TESTO, non dal catalogo.

    Serve alle 63 opere che nel repository non hanno `__cts__.xml` (l'intera
    Appendix Vergiliana, Apicio, Catone, Beda…): senza questo ripiego finirebbero
    in catalogo con l'identificativo al posto del titolo.
    """
    for e in root.iter():
        if ln(e.tag) != "titleStmt":
            continue
        for t in e:
            if ln(t.tag) == "title":
                s = re.sub(r"\s+", " ", "".join(t.itertext())).strip()
                # scarta i segnaposto d'edizione digitale, non sono titoli
                if s and not re.match(r"(?i)machine[- ]readable", s):
                    return s
    return None


VER = {"lat": re.compile(r"-lat(\d+)"), "grc": re.compile(r"-grc(\d+)")}


def pick_edition(work_dir, tag):
    """Il file-edizione in lingua originale con numero di versione più alto."""
    best = None
    for fn in os.listdir(work_dir):
        if not fn.endswith(".xml") or "__cts__" in fn:
            continue
        m = VER[tag].search(fn)
        if not m:
            continue
        v = int(m.group(1))
        if best is None or v > best[0]:
            best = (v, fn)
    return best[1] if best else None


# ══════════════════════════════════════════════════════════════════════════
def process_work(repo_dir, repo_name, lang, tag, urn_ns, tg, wk, author):
    work_dir = os.path.join(repo_dir, "data", tg, wk)
    key = f"{tg}.{wk}"
    # L'esclusione passa dallo stesso canale degli scarti, così finisce dichiarata
    # nel registro d'import invece di sparire in silenzio.
    if key in ESCLUSE:
        return None, {"id": key, "reason": ESCLUSE[key]}
    fname = pick_edition(work_dir, tag)
    if not fname:
        return None, {"id": key, "reason": "nessuna edizione in lingua originale"}

    wcts = os.path.join(work_dir, "__cts__.xml")
    edition_id = fname[:-4] if fname.endswith(".xml") else fname   # es. phi0448.phi001.perseus-lat2
    label, edition = edition_label_and_desc(wcts, tag, edition_id)
    title_en = cts_first(wcts, "title", lang_pref=("eng",))
    # ordine: etichetta dell'edizione originale → <title> in lingua → inglese
    title = label or cts_first(wcts, "title", lang_pref=("lat", "grc")) or title_en

    try:
        root = parse_tei(os.path.join(work_dir, fname))
    except ET.ParseError as e:
        return None, {"id": key, "title": title or key, "reason": f"XML illeggibile: {e}"}

    # ultimo ripiego: il titolo scritto nell'intestazione del testo (63 opere)
    if not title:
        title = tei_header_title(root) or key

    units, kind_flags = [], {}
    body = find_body(root)
    er = edition_root(body)
    # I livelli di struttura che edition_root() ha già attraversato non vanno
    # saltati due volte: si conta quanto è sceso e si chiede il resto a extract().
    livelli = structural_divs(root)
    salta = max(0, (livelli - 1) - div_depth(body, er)) if livelli else 0
    extract(er, [], units, kind_flags, salta)
    units = dedupe_loci(units)
    kind = "versi" if kind_flags.get("verse") else "prosa"

    # ── cancello di fruibilità ────────────────────────────────────────────
    joined = " ".join(t for _, t in units)
    if len(units) < MIN_UNITS or len(joined) < MIN_CHARS:
        return None, {"id": key, "title": title, "reason": "testo assente o troppo breve",
                      "chars": len(joined)}
    g, l = len(GREEK_CH.findall(joined)), len(LATIN_CH.findall(joined))
    foreign = (100.0 * l / max(g + l, 1)) if lang == "grc" else (100.0 * g / max(g + l, 1))
    if foreign > MAX_FOREIGN_PCT:
        return None, {"id": key, "title": title, "reason": "edizione bilingue (lingua mista)",
                      "foreign_pct": round(foreign, 1)}

    genre, epoch, inferred = meta_for(tg, key)
    # Titolo d'USO italiano: `title` diventa il nome con cui l'opera si chiama in
    # classe, `titleOrig` conserva l'originale per la seconda fascia della scheda.
    # `titleState` dice quale dei tre casi è (vedi corpus_titles.py): serve
    # all'interfaccia per non mostrare due volte la stessa riga né spacciare per
    # originale un ripiego inglese.
    t_main, t_orig, t_state = title_for(key, title, title_en)
    words = sum(len(t.split()) for _, t in units)
    doc = {
        "id": key, "lang": lang,
        "author": author, "authorId": tg,
        "title": t_main, "titleOrig": t_orig, "titleState": t_state,
        "titleEn": title_en,
        "genre": genre, "epoch": epoch, "inferred": inferred,
        "kind": kind,
        "source": {"urn": f"urn:cts:{urn_ns}:{key}", "repo": repo_name,
                   "file": fname, "edition": edition, "license": LICENSE},
        "citation": citation_label(units, kind),
        "units": [{"loc": loc, "t": t} for loc, t in units],
        "stats": {"units": len(units), "words": words},
    }
    return doc, None


def main():
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    missing = [r for r, *_ in REPOS if not os.path.isdir(os.path.join(SRC, r))]
    if missing:
        print("ERRORE · cloni mancanti in _build/corpus_sources/: " + ", ".join(missing))
        print("Esegui la fase C0 (vedi l'intestazione di questo file).")
        return 2

    os.makedirs(REPORTS, exist_ok=True)
    for lang in ("la", "grc"):
        d = os.path.join(OUT, lang)
        # La pulizia si fa SOLO sull'import completo: con --limit si scriverebbero
        # 40 opere dopo averne cancellate 1.157, lasciando il catalogo monco e
        # l'indice appeso al vuoto. «Prova rapida» non deve poter distruggere nulla.
        if limit is None and os.path.isdir(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)
    if limit is not None:
        print(f"[--limit {limit}] prova rapida: NON ripulisco data/corpus/ e NON "
              f"riscrivo _index.json (userei un catalogo parziale).\n")

    docs, rejected, unmapped = [], [], set()
    for repo_name, lang, tag, urn_ns in REPOS:
        repo_dir = os.path.join(SRC, repo_name)
        data_dir = os.path.join(repo_dir, "data")
        tgs = sorted(d for d in os.listdir(data_dir)
                     if os.path.isdir(os.path.join(data_dir, d)))
        print(f"\n── {repo_name} · {len(tgs)} gruppi d'autore ──")
        done = 0
        for tg in tgs:
            tg_dir = os.path.join(data_dir, tg)
            cts_name = cts_first(os.path.join(tg_dir, "__cts__.xml"), "groupname",
                                 lang_pref=("eng",)) or tg
            author = name_for(tg, cts_name)
            if tg not in TEXTGROUPS:
                unmapped.add(f"{tg} · {author}")
            for wk in sorted(d for d in os.listdir(tg_dir)
                             if os.path.isdir(os.path.join(tg_dir, d))):
                if limit and done >= limit:
                    break
                doc, err = process_work(repo_dir, repo_name, lang, tag, urn_ns, tg, wk, author)
                done += 1
                if err:
                    err["author"] = author
                    rejected.append(err)
                    continue
                with open(os.path.join(OUT, lang, doc["id"] + ".json"), "w",
                          encoding="utf-8") as fh:
                    json.dump(doc, fh, ensure_ascii=False, separators=(",", ":"))
                docs.append(doc)
                if len(docs) % 100 == 0:
                    print(f"   … {len(docs)} opere importate")
            if limit and done >= limit:
                break
        print(f"   {repo_name}: {done} esaminate")

    if limit is None:
        build_index(docs)
    report = {
        "imported": len(docs), "rejected": len(rejected),
        "unmapped_textgroups": sorted(unmapped),
        "rejects": rejected,
    }
    with open(os.path.join(REPORTS, "corpus_import.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)

    words = sum(d["stats"]["words"] for d in docs)
    print("\n" + "═" * 64)
    print(f"  importate : {len(docs)} opere   ({sum(1 for d in docs if d['lang']=='la')} lat · "
          f"{sum(1 for d in docs if d['lang']=='grc')} grc)")
    print(f"  parole    : {words:,}".replace(",", "."))
    print(f"  scartate  : {len(rejected)}")
    for r in rejected[:12]:
        print(f"      · {r['id']:<18} {r.get('title','')[:34]:<34} {r['reason']}")
    if len(rejected) > 12:
        print(f"      … altre {len(rejected)-12} nel registro")
    if unmapped:
        print(f"  autori senza genere/epoca: {len(unmapped)} → non classificato")
        for u in sorted(unmapped)[:10]:
            print(f"      · {u}")
    print(f"\n  → data/corpus/  ·  registro in _build/reports/corpus_import.json")
    return 0


def build_index(docs):
    """Catalogo: opere + albero autori + faccette (generi, epoche)."""
    works = [{
        "id": d["id"], "lang": d["lang"], "authorId": d["authorId"], "author": d["author"],
        "title": d["title"], "titleOrig": d.get("titleOrig"),
        "titleState": d.get("titleState"), "titleEn": d.get("titleEn"),
        "genre": d["genre"], "epoch": d["epoch"], "inferred": d["inferred"],
        "kind": d["kind"], "citation": d["citation"],
        "units": d["stats"]["units"], "words": d["stats"]["words"],
    } for d in docs]
    works.sort(key=lambda w: (w["lang"] != "la", w["author"], w["title"]))

    authors = {}
    for w in works:
        a = authors.setdefault(w["authorId"], {
            "id": w["authorId"], "name": w["author"], "lang": w["lang"],
            # anno d'ordinamento: serve a mettere gli autori in fila per TEMPO,
            # come si affrontano in classe, non per alfabeto
            "year": year_for(w["authorId"], w["epoch"]),
            "works": 0, "words": 0,
        })
        a["works"] += 1
        a["words"] += w["words"]
    authors_list = sorted(authors.values(), key=lambda a: (a["lang"] != "la", a["name"]))

    def tally(field):
        t = {}
        for w in works:
            t[w[field]] = t.get(w[field], 0) + 1
        return dict(sorted(t.items(), key=lambda x: -x[1]))

    idx = {
        "schema": "poetrify-corpus/2",
        "license": LICENSE,
        "counts": {
            "works": len(works), "authors": len(authors_list),
            "la": sum(1 for w in works if w["lang"] == "la"),
            "grc": sum(1 for w in works if w["lang"] == "grc"),
            "units": sum(w["units"] for w in works),
            "words": sum(w["words"] for w in works),
        },
        "facets": {"genre": tally("genre"), "epoch": tally("epoch")},
        "authors": authors_list,
        "works": works,
    }
    with open(os.path.join(OUT, "_index.json"), "w", encoding="utf-8") as fh:
        json.dump(idx, fh, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    sys.exit(main())
