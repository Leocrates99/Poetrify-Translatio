#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
import_corpus.py  ·  Poetrify — ramo CORPUS (import + normalizzazione)
======================================================================
Importa un NUCLEO SCOLASTICO di opere greche e latine dai repository open
della Perseus Digital Library e le normalizza in JSON leggeri consumati dal
lettore `corpus.html`.

Solo TESTO (nessun apparato critico): i testi antichi sono di pubblico dominio,
le edizioni digitali Perseus sono rilasciate con licenza CC BY-SA 3.0.

Fonti:
  · PerseusDL/canonical-latinLit   (latino)
  · PerseusDL/canonical-greekLit   (greco)

Il file-edizione in lingua originale viene SCOPERTO via GitHub contents API
(non indovinato): per ogni opera si sceglie il `*-lat<N>.xml` / `*-grc<N>.xml`
di versione più alta, escludendo `__cts__.xml` e le traduzioni (`-eng`, ...).

Struttura del dato per opera (data/corpus/<lang>/<id>.json):
  {
    "id","lang","author","authorId","title","genre","epoch",
    "kind": "versi" | "prosa",
    "source": {"urn","repo","file","license"},
    "citation": "libro.verso" | "libro.capitolo" | ...,
    "units": [ {"loc":"1.1","t":"Gallia est omnis divisa ..."}, ... ],
    "stats": {"units":N,"words":M}
  }
Catalogo (data/corpus/_index.json): opere + albero autori, per la classificazione.

Uso (Windows, per il greco serve UTF-8 sullo stdout):
    set PYTHONIOENCODING=utf-8 && python _build/import_corpus.py
    # oppure:  PYTHONIOENCODING=utf-8 python _build/import_corpus.py
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

# ── Percorsi ──────────────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, "corpus_cache")            # escluso dal deploy (_build/)
OUT = os.path.join(ROOT, "data", "corpus")            # pubblicato

# ── Nucleo scolastico curato (10 opere, 5 + 5) ────────────────────────────
# repo si deduce dalla lingua; tg = textgroup CTS, wk = work CTS.
MANIFEST = [
    # ── LATINO ────────────────────────────────────────────────────────────
    dict(id="cesare-bello-gallico", lang="la", tg="phi0448", wk="phi001",
         author="Gaio Giulio Cesare", authorId="cesare",
         title="De Bello Gallico", genre="storiografia", epoch="I sec. a.C."),
    dict(id="cicerone-in-catilinam", lang="la", tg="phi0474", wk="phi013",
         author="Marco Tullio Cicerone", authorId="cicerone",
         title="In Catilinam", genre="oratoria", epoch="I sec. a.C."),
    dict(id="sallustio-de-catilinae-coniuratione", lang="la", tg="phi0631", wk="phi001",
         author="Gaio Sallustio Crispo", authorId="sallustio",
         title="De Catilinae coniuratione", genre="storiografia", epoch="I sec. a.C."),
    dict(id="virgilio-aeneis", lang="la", tg="phi0690", wk="phi003",
         author="Publio Virgilio Marone", authorId="virgilio",
         title="Aeneis", genre="epica", epoch="I sec. a.C."),
    dict(id="ovidio-metamorphoses", lang="la", tg="phi0959", wk="phi006",
         author="Publio Ovidio Nasone", authorId="ovidio",
         title="Metamorphoses", genre="epica", epoch="I sec. a.C. – I sec. d.C."),
    # ── GRECO ─────────────────────────────────────────────────────────────
    dict(id="omero-ilias", lang="grc", tg="tlg0012", wk="tlg001",
         author="Omero", authorId="omero",
         title="Ἰλιάς", genre="epica", epoch="VIII sec. a.C."),
    dict(id="senofonte-anabasis", lang="grc", tg="tlg0032", wk="tlg006",
         author="Senofonte", authorId="senofonte",
         title="Ἀνάβασις", genre="storiografia", epoch="V–IV sec. a.C."),
    dict(id="platone-apologia", lang="grc", tg="tlg0059", wk="tlg002",
         author="Platone", authorId="platone",
         title="Ἀπολογία Σωκράτους", genre="filosofia", epoch="V–IV sec. a.C."),
    dict(id="sofocle-antigone", lang="grc", tg="tlg0011", wk="tlg002",
         author="Sofocle", authorId="sofocle",
         title="Ἀντιγόνη", genre="tragedia", epoch="V sec. a.C."),
    dict(id="erodoto-historiae", lang="grc", tg="tlg0016", wk="tlg001",
         author="Erodoto", authorId="erodoto",
         title="Ἱστορίαι", genre="storiografia", epoch="V sec. a.C."),
]

REPO = {"la": "canonical-latinLit", "grc": "canonical-greekLit"}
LANGTAG = {"la": "lat", "grc": "grc"}
LICENSE = "CC BY-SA 3.0 (Perseus Digital Library)"
UA = {"User-Agent": "Poetrify-corpus-importer/1.0 (+https://leocrates99.github.io/Poetrify-Translatio/)"}


# ── HTTP ──────────────────────────────────────────────────────────────────
def http_get(url, as_json=False, tries=3):
    """GET con retry semplice. Ritorna bytes (o dict se as_json)."""
    last = None
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read()
                return json.loads(raw.decode("utf-8")) if as_json else raw
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (403, 429):          # rate limit → attendi e riprova
                time.sleep(2 + 3 * k)
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            last = e
            time.sleep(1 + k)
    raise last


def discover_edition(entry):
    """Scopre via GitHub API l'URL raw del file-edizione in lingua originale."""
    repo = REPO[entry["lang"]]
    tag = LANGTAG[entry["lang"]]
    api = f"https://api.github.com/repos/PerseusDL/{repo}/contents/data/{entry['tg']}/{entry['wk']}"
    files = http_get(api, as_json=True)
    cands = []
    for f in files:
        name = f.get("name", "")
        if not name.endswith(".xml") or "__cts__" in name:
            continue
        m = re.search(rf"-{tag}(\d+)", name)          # es. -lat2 / -grc1
        if not m:
            continue
        cands.append((int(m.group(1)), name, f["download_url"]))
    if not cands:
        raise RuntimeError(f"nessuna edizione {tag} trovata in {api}")
    cands.sort(reverse=True)                            # versione più alta prima
    _, name, url = cands[0]
    return name, url


# ── Parsing TEI ───────────────────────────────────────────────────────────
def ln(tag):
    """Local-name senza namespace."""
    return tag.rsplit("}", 1)[-1]


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
    s = re.sub(r"\s+", " ", s).strip()
    return s


def find_body(root):
    for e in root.iter():
        if ln(e.tag) == "body":
            return e
    return root


def edition_root(body):
    """Il <div type='edition'> (fallback: primo div, poi body)."""
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
        if t == "l":                                    # verso
            n = c.get("n")
            loc = [x for x in path + ([n] if n else []) if x]
            txt = clean_text(c)
            if txt:
                units.append((".".join(loc), txt))
                kind_flags["verse"] = True
            handled = True
        elif t in ("div", "lg", "sp"):                  # contenitori strutturali
            n = c.get("n")
            extract(c, path + ([n] if n else []), units, kind_flags)
            handled = True
    if handled:
        return
    # Foglia in prosa: paragrafi
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
    """Etichetta euristica dello schema di citazione (per l'UI)."""
    depth = max((u[0].count(".") + 1 for u in units if u[0]), default=1)
    if kind == "versi":
        return {1: "verso", 2: "libro.verso", 3: "libro.canto.verso"}.get(depth, "loci")
    return {1: "capitolo", 2: "libro.capitolo", 3: "libro.capitolo.paragrafo"}.get(depth, "loci")


# ── Pipeline per opera ────────────────────────────────────────────────────
def process(entry):
    lang = entry["lang"]
    print(f"  · {entry['id']:38s} ", end="", flush=True)
    xml_path = os.path.join(CACHE, f"{entry['id']}.xml")

    if os.path.exists(xml_path):
        with open(xml_path, "rb") as fh:
            raw = fh.read()
        fname = entry.get("_file", "cache")
        print("[cache] ", end="", flush=True)
    else:
        fname, url = discover_edition(entry)
        raw = http_get(url)
        with open(xml_path, "wb") as fh:
            fh.write(raw)
        print(f"[{len(raw)//1024} KB] ", end="", flush=True)

    root = ET.fromstring(raw)
    body = find_body(root)
    ed = edition_root(body)
    units, kind_flags = [], {}
    extract(ed, [], units, kind_flags)
    kind = "versi" if kind_flags.get("verse") else "prosa"

    words = sum(len(t.split()) for _, t in units)
    doc = {
        "id": entry["id"], "lang": lang,
        "author": entry["author"], "authorId": entry["authorId"],
        "title": entry["title"], "genre": entry["genre"], "epoch": entry["epoch"],
        "kind": kind,
        "source": {
            "urn": f"urn:cts:{'latinLit' if lang == 'la' else 'greekLit'}:{entry['tg']}.{entry['wk']}",
            "repo": REPO[lang], "file": fname, "license": LICENSE,
        },
        "citation": citation_label(units, kind),
        "units": [{"loc": loc, "t": t} for loc, t in units],
        "stats": {"units": len(units), "words": words},
    }
    lang_dir = os.path.join(OUT, lang)
    os.makedirs(lang_dir, exist_ok=True)
    with open(os.path.join(lang_dir, f"{entry['id']}.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"OK · {len(units)} unità · {words} parole ({kind})")
    return doc


def build_index(docs):
    """Catalogo: lista opere piatta + albero autori (per la classificazione)."""
    works = [{
        "id": d["id"], "lang": d["lang"], "authorId": d["authorId"], "author": d["author"],
        "title": d["title"], "genre": d["genre"], "epoch": d["epoch"], "kind": d["kind"],
        "citation": d["citation"], "units": d["stats"]["units"], "words": d["stats"]["words"],
    } for d in docs]

    authors = {}
    for w in works:
        a = authors.setdefault(w["authorId"], {
            "id": w["authorId"], "name": w["author"], "lang": w["lang"], "works": [],
        })
        a["works"].append({"id": w["id"], "title": w["title"], "genre": w["genre"],
                           "kind": w["kind"], "units": w["units"], "words": w["words"]})
    authors_tree = sorted(authors.values(), key=lambda a: (a["lang"] != "la", a["name"]))

    idx = {
        "schema": "poetrify-corpus/1",
        "license": LICENSE,
        "counts": {
            "works": len(works),
            "authors": len(authors_tree),
            "la": sum(1 for w in works if w["lang"] == "la"),
            "grc": sum(1 for w in works if w["lang"] == "grc"),
            "units": sum(w["units"] for w in works),
            "words": sum(w["words"] for w in works),
        },
        "works": works,
        "authors": authors_tree,
    }
    with open(os.path.join(OUT, "_index.json"), "w", encoding="utf-8") as fh:
        json.dump(idx, fh, ensure_ascii=False, indent=2)
    return idx


def main():
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    print("Poetrify · import corpus (nucleo scolastico)\n")
    docs, failed = [], []
    for entry in MANIFEST:
        try:
            docs.append(process(entry))
        except Exception as e:                          # noqa: BLE001 — riportiamo e proseguiamo
            failed.append((entry["id"], repr(e)))
            print(f"FALLITA · {e!r}")
    idx = build_index(docs)
    print("\n── Catalogo ──────────────────────────────────────────")
    print(f"  opere:   {idx['counts']['works']}  (la {idx['counts']['la']} · grc {idx['counts']['grc']})")
    print(f"  autori:  {idx['counts']['authors']}")
    print(f"  unità:   {idx['counts']['units']}")
    print(f"  parole:  {idx['counts']['words']}")
    if failed:
        print("\n  FALLITE:")
        for fid, err in failed:
            print(f"    · {fid}: {err}")
    print(f"\n  → {os.path.relpath(OUT, ROOT)}/_index.json + <lang>/<id>.json")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
