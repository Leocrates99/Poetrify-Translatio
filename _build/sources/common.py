# -*- coding: utf-8 -*-
"""P1.2 · Framework di normalizzazione delle fonti (BUILD_SPEC §9).
Formato comune di ogni record:
  { "fonte", "id"|null, "lemma", "pos", "tr":{lang:[...]}, "senses":[...], "lic" }
Aggancio dell'id: le fonti GIÀ PRESENTI (Lewis/LSJ) usano la chiave-sorgente
(che È una chiave di _id_map → aggancio diretto ~100%); le fonti ESTERNE
(Whitaker, …) agganciano per lemma normalizzato via build_lemma_index().
Output: _build/sources/normalized/<fonte>.jsonl (rigenerabile, gitignorato).
"""
import os, sys, json, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # _build/sources → repo
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(ROOT, "_build", "sources", "normalized")

_MN = lambda s: "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")
def norm_lat(s): return _MN(s).lower().replace("j", "i")
def norm_grc(s): return unicodedata.normalize("NFC", s or "").lower()

_DIGIT = re.compile(r"^(.*?)(\d+)$")
def base_lat(key):
    m = _DIGIT.match(key)
    return m.group(1) if (m and m.group(1)) else key

def load_id_map(lc):
    return json.load(open(os.path.join(DATA, f"_id_map.{lc}.json"), encoding="utf-8"))

def build_lemma_index(lc):
    """norm(lemma) → [id,…] per agganciare le fonti esterne per lemma."""
    nf = norm_lat if lc == "lat" else norm_grc
    idx = {}
    for key, rid in load_id_map(lc).items():
        base = base_lat(key) if lc == "lat" else key
        idx.setdefault(nf(base), []).append(rid)
    return idx


def build_lemma_pos_index(lc):
    """norm(lemma) → [(id, pos),…]: come sopra ma con la PoS (dai dict degli shard),
    per un aggancio consapevole della PoS (evita i falsi positivi cross-categoria
    delle ricostruzioni, es. lo stem verbale «am» → il sostantivo «amor»)."""
    import glob
    folder = {"lat": "latin", "grc": "greek"}[lc]
    nf = norm_lat if lc == "lat" else norm_grc
    posof = {}
    files = glob.glob(os.path.join(DATA, folder, "*.json")) + glob.glob(os.path.join(DATA, folder, "archive", "*.json"))
    for f in files:
        if os.path.basename(f).startswith("_"):
            continue
        for k, e in json.load(open(f, encoding="utf-8")).get("dict", {}).items():
            posof.setdefault(k, e.get("pos", ""))
    idx = {}
    for key, rid in load_id_map(lc).items():
        base = base_lat(key) if lc == "lat" else key
        idx.setdefault(nf(base), []).append((rid, posof.get(key, "")))
    return idx

# codici PoS di Whitaker → vocabolario PoS del progetto
POS_MAP_WHITAKER = {
    "N": "sostantivo", "V": "verbo", "VPAR": "verbo", "SUPINE": "verbo",
    "ADJ": "aggettivo", "ADV": "avverbio", "PREP": "preposizione",
    "CONJ": "congiunzione", "INTERJ": "interiezione", "PRON": "pronome",
    "PACK": "pronome", "NUM": "numerale",
}

def short_glosses(senses, n=3):
    """Glosse brevi best-effort (F2 farà la fusione vera)."""
    if not senses:
        return []
    out = []
    for part in re.split(r"[;,]", senses[0]):
        g = part.strip()
        if 0 < len(g) <= 28 and not g.isupper() and not any(ch.isdigit() for ch in g):
            out.append(g)
        if len(out) >= n:
            break
    return out

def write_jsonl(fonte, records):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{fonte}.jsonl")
    with open(path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return path

def fetch(url, timeout=90):
    import urllib.request
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()

def report_line(fonte, n, lic, hooked):
    pct = (100.0 * hooked / n) if n else 0.0
    print(f"  {fonte:<12} {n:>8} lemmi · {lic:<26} · id agganciati {hooked:>8} ({pct:5.1f}%)")
    return {"fonte": fonte, "lemmi": n, "lic": lic, "hooked": hooked, "pct": round(pct, 1)}
