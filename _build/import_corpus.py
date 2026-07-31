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
from corpus_meta import meta_for, name_for, TEXTGROUPS  # noqa: E402

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


def parse_tei(path):
    """Parsing tollerante: se il file inciampa nelle entità, si risana e si ritenta."""
    raw = open(path, "rb").read().decode("utf-8", "replace")
    try:
        return ET.fromstring(raw)
    except ET.ParseError:
        return ET.fromstring(_fix_entities(raw))


SKIP_TEXT = {"note", "bibl", "ref", "cit", "head", "milestone", "gap", "del", "figure"}


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
        for c in e:
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
    for e in body.iter():
        if ln(e.tag) == "div" and e.get("type") == "edition":
            return e
    for e in body:
        if ln(e.tag) == "div":
            return e
    return body


def extract(elem, path, units, kind_flags):
    """Estrae ricorsivamente unità citabili (versi <l> / paragrafi <p>)."""
    handled = False
    for c in elem:
        t = ln(c.tag)
        if t == "l":
            n = c.get("n")
            loc = [x for x in path + ([n] if n else []) if x]
            txt = clean_text(c)
            if txt:
                units.append((".".join(loc), txt))
                kind_flags["verse"] = True
            handled = True
        elif t in ("div", "lg", "sp"):
            n = c.get("n")
            extract(c, path + ([n] if n else []), units, kind_flags)
            handled = True
    if handled:
        return
    ps = [c for c in elem if ln(c.tag) in ("p", "said")]
    if ps:
        multi = len(ps) > 1
        for i, p in enumerate(ps, 1):
            n = p.get("n") or (str(i) if multi else None)
            loc = [x for x in path + ([n] if n else []) if x]
            txt = clean_text(p)
            if txt:
                units.append((".".join(loc), txt))
        kind_flags["prose"] = True
    else:
        txt = clean_text(elem)
        if txt:
            units.append((".".join([x for x in path if x]), txt))
            kind_flags["prose"] = True


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


def edition_label_and_desc(path, tag):
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
        if e.get(XLANG) == tag:          # l'edizione nella lingua che importiamo
            return label, desc
        if fallback == (None, None):
            fallback = (label, desc)
    return fallback


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
    fname = pick_edition(work_dir, tag)
    if not fname:
        return None, {"id": key, "reason": "nessuna edizione in lingua originale"}

    wcts = os.path.join(work_dir, "__cts__.xml")
    label, edition = edition_label_and_desc(wcts, tag)
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
    extract(edition_root(find_body(root)), [], units, kind_flags)
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
    words = sum(len(t.split()) for _, t in units)
    doc = {
        "id": key, "lang": lang,
        "author": author, "authorId": tg,
        "title": title, "titleEn": title_en,
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
        if os.path.isdir(d):
            shutil.rmtree(d)          # via gli id vecchi (slug) → ora id canonici
        os.makedirs(d, exist_ok=True)

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
        "title": d["title"], "titleEn": d.get("titleEn"),
        "genre": d["genre"], "epoch": d["epoch"], "inferred": d["inferred"],
        "kind": d["kind"], "citation": d["citation"],
        "units": d["stats"]["units"], "words": d["stats"]["words"],
    } for d in docs]
    works.sort(key=lambda w: (w["lang"] != "la", w["author"], w["title"]))

    authors = {}
    for w in works:
        a = authors.setdefault(w["authorId"], {
            "id": w["authorId"], "name": w["author"], "lang": w["lang"],
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
