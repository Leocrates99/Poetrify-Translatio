# -*- coding: utf-8 -*-
"""FONTE · Lewis & Short, «A Latin Dictionary» (1879) — edizione Perseus.

Il dizionario del repo usa Lewis *Elementary* (voci brevi e, nel ~27% dei casi,
TRONCATE con «…»): è la ragione del punto ⑥ della checklist S.3. Qui si ingerisce
il L&S INTEGRALE, che di quelle voci è l'edizione maggiore e non troncata.

Fonte:  PerseusDL/lexica · CTS_XML_TEI/…/lat.ls.perseus-eng1.xml (77 MB)
Licenza: testo 1879 = PUBBLICO DOMINIO · digitalizzazione Perseus = CC BY-SA 4.0
         (dichiarata nel README del repo) → compatibile con la nostra CC BY-SA 4.0.

Struttura TEI: <entryFree key="pinna1"> con <orth> (lemma), <pos>, <itype>
(l'uscita del GENITIVO), <gen> (genere) e <sense level n> annidati, con
<cit><quote>…</quote><bibl>…</bibl></cit> per le citazioni d'autore.

Uso:  python sources/lewis_short.py            # normalizza → normalized/lewis_short.jsonl
      python sources/lewis_short.py --limit N  # prova sui primi N lemmi
"""
import os, sys, re, json, collections
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from betacode import beta2gr
sys.stdout.reconfigure(encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "cache")
XML = os.path.join(CACHE, "lat.ls.perseus-eng1.xml")
URL = ("https://raw.githubusercontent.com/PerseusDL/lexica/master/"
       "CTS_XML_TEI/perseus/pdllex/lat/ls/lat.ls.perseus-eng1.xml")
OUT = os.path.join(HERE, "normalized", "lewis_short.jsonl")
LIC = "PD (Lewis&Short 1879) · digitalizzazione Perseus CC BY-SA 4.0"

_WS = re.compile(r"\s+")
_SP_PUNCT = re.compile(r"\s+([,.;:!?)])")
_OPEN_PAR = re.compile(r"\(\s+")


def scarica():
    os.makedirs(CACHE, exist_ok=True)
    if os.path.exists(XML) and os.path.getsize(XML) > 1_000_000:
        return
    import urllib.request
    req = urllib.request.Request(URL, headers={"User-Agent": "poetrify-build"})
    with urllib.request.urlopen(req, timeout=900) as r, open(XML, "wb") as f:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            f.write(b)


def pulisci(s):
    s = _WS.sub(" ", s or "").strip()
    s = _SP_PUNCT.sub(r"\1", s)
    s = _OPEN_PAR.sub("(", s)
    return s.strip(" ,;:")


def testo(el):
    """TEI → testo leggibile. Le citazioni diventano «quote (autore)»; i livelli
    di <sense> conservano la numerazione originale (I. · A. · 1.)."""
    parti = []

    def walk(e, dentro_cit=False):
        t = e.tag.split("}")[-1]
        if t == "foreign" and (e.get("lang") or "") == "greek":
            # il greco è in BETACODE e va convertito SOLO qui: applicarlo al
            # testo inglese lo distruggerebbe («paunch)» → «πανξἠ»).
            parti.append(beta2gr("".join(e.itertext())))
            if e.tail:
                parti.append(e.tail)
            return
        if t == "cit":
            q = e.find("quote")
            b = e.find("bibl")
            qt = "".join(q.itertext()).strip() if q is not None else ""
            bt = "".join(b.itertext()).strip() if b is not None else ""
            if qt:
                parti.append(f"{qt}" + (f" ({bt})" if bt else ""))
            if e.tail:
                parti.append(e.tail)
            return
        if t == "sense":
            n = e.get("n") or ""
            lv = e.get("level") or ""
            if n:
                parti.append(f" {'—' if lv in ('1', '') else '·'} {n}. ")
        if e.text:
            parti.append(e.text)
        for c in e:
            walk(c, dentro_cit)
        if e.tail:
            parti.append(e.tail)

    walk(el)
    return pulisci("".join(parti))


def voce(el):
    key = el.get("key")
    if not key:
        return None
    orth = el.find("orth")
    lemma = "".join(orth.itertext()).strip() if orth is not None else key
    pos = el.find("pos")
    itype = el.find("itype")          # uscita del genitivo (nomi) / parti verbali
    gen = el.find("gen")
    # glosse brevi: i <tr> di primo livello, se ci sono
    trs = [pulisci("".join(t.itertext())) for t in el.iter() if t.tag.split("}")[-1] == "tr"]
    trs = [t for t in trs if t][:8]
    # sensi: ogni <sense> di primo livello come blocco
    sensi = []
    for s in el:
        if s.tag.split("}")[-1] == "sense":
            t = testo(s)
            if t:
                sensi.append(t)
    intero = testo(el)
    if not sensi:
        sensi = [intero] if intero else []
    return {
        "fonte": "lewis_short",
        "key_ls": key,
        "lemma": lemma,
        "pos": pulisci("".join(pos.itertext())) if pos is not None else "",
        "itype": pulisci("".join(itype.itertext())) if itype is not None else "",
        "genere": pulisci("".join(gen.itertext())) if gen is not None else "",
        "tr": {"en": trs},
        "senses": sensi,
        "definition_full": intero,
        "lic": LIC,
    }


def main():
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    scarica()
    idmap = C.load_id_map("lat")
    # indice normalizzato delle NOSTRE chiavi, per l'aggancio morbido
    def base(s):
        return C.norm_lat(re.sub(r"\d+$", "", s or ""))
    nostre_norm = collections.defaultdict(list)
    for k, rid in idmap.items():
        nostre_norm[base(k)].append((k, rid))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    n = hooked = esatti = morbidi = con_itype = 0
    fout = open(OUT, "w", encoding="utf-8")
    for ev, el in ET.iterparse(XML, events=("end",)):
        if el.tag.split("}")[-1] != "entryFree":
            continue
        v = voce(el)
        el.clear()
        if not v:
            continue
        n += 1
        if v["itype"]:
            con_itype += 1
        rid = idmap.get(v["key_ls"])
        if rid:
            esatti += 1
        else:
            cands = nostre_norm.get(base(v["key_ls"]), [])
            if len(cands) == 1:
                rid = cands[0][1]
                morbidi += 1
        v["id"] = rid
        if rid:
            hooked += 1
        fout.write(json.dumps(v, ensure_ascii=False) + "\n")
        if limit and n >= limit:
            break
    fout.close()
    print(f"  voci L&S normalizzate: {n} · con <itype> (genitivo): {con_itype}")
    print(f"  agganci id: esatti {esatti} · morbidi (chiave normalizzata) {morbidi}")
    C.report_line("lewis_short", n, LIC, hooked)
    print(f"  → {OUT}")


if __name__ == "__main__":
    main()
