# -*- coding: utf-8 -*-
"""
expand.py — Espande il nucleo scolastico dei dizionari Poetrify fino a ~25.000
lemmi per lingua, PROMUOVENDO dall'archivio le voci migliori secondo il
punteggio scolastico di prune.py (frequenza + forme attestate, penalizzando
fonti epigrafiche/papirologiche, glossografi/testimonia, nomi propri, voci
sovraccariche di citazioni e voci-passo). NON declassa mai voci già attive.

Esclude sempre dalla promozione la spazzatura d'archivio: definizioni vuote,
lemmi segmentati (con trattino/spazio/cifre).

Uso:  python _build/expand.py --dry-run
      python _build/expand.py
"""
import json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')
DIR = {'latino': 'latin', 'greco': 'greek'}
DRY = '--dry-run' in sys.argv
TARGET = 25000

# ── scoring scolastico (identico a prune.py / score_preview2) ────────────
def load_freq_sets():
    p = os.path.join(os.path.dirname(__file__), '..', 'modules', 'dictionary', 'frequency.js')
    txt = open(p, encoding='utf-8').read()
    lat, gr = set(), set()
    for m in re.finditer(r"const (LATIN|GREEK)_FREQ_\d\s*=\s*new Set\(\[(.*?)\]\)", txt, re.S):
        toks = re.findall(r"'([^']+)'", m.group(2))
        (lat if m.group(1) == 'LATIN' else gr).update(toks)
    return lat, gr
LAT_FREQ, GR_FREQ = load_freq_sets()

FUNCTION_POS = ('congiunzione', 'preposizione', 'pronome', 'particella', 'numerale')
CONTENT_POS  = ('sostantivo', 'aggettivo', 'verbo', 'avverbio')
EPIG = re.compile(r'\b(IG|SIG|OGI|SEG|CIG|GDI|Schwyzer|Sammelb|SB|Ostr|Inscr|Tab\.?Defix|'
                  r'P\.?(Oxy|Mich|Cair|Lond|Petr|Hib|Teb|Flor|Giss|Ryl|Hamb|Grenf|Strassb|Lille|Eleph|Par|Leid|Amh|Fay|Goodsp)|'
                  r'PSI|BGU|PCZ|PEnteux|PRev|PMagic|PGM|Wilcken|Mitteis)\b')
GLOSS = re.compile(r'\b(Hsch|Suid|Phot|EM|Zonar|AB|Sch|Et\.?Gud|Et\.?M|Cyr|Theognost|Orio|Ammon|Poll|Moer|Phryn|Hdn\.?Gr)\b')
NAME = re.compile(r'\b(name of|son of|daughter of|epith\.?|surname|place in|city in|town in|river in|mountain in|island in|'
                  r'festival|gentile name|nymph|deity|hero |Pythagorean|king of|tribe|demos|deme of)\b', re.I)
CIT = re.compile(r'\b[A-Z][A-Za-z]*\.?\s?\d[\d.,]*')
PAREN = re.compile(r'\([^)]*\)')
ABBR = re.compile(r'\b(cf|v|sq|al|prob|cj|interpol|Dim|Ep|Aeol|Dor|Ion|Att|Lat|Adj|Subst|pl|sg|gen|dat|acc|nom|voc|comp|Sup|impf|aor|pf|fut|Med|Pass|Act)\b\.?', re.I)
NONLAT = re.compile(r'[^\x00-\x7f]+')

def is_proper(lemma):
    for ch in lemma:
        if ch.isalpha():
            return ch == ch.upper() and ch != ch.lower()
    return False

def gloss_words(defn):
    s = PAREN.sub(' ', defn); s = CIT.sub(' ', s); s = ABBR.sub(' ', s); s = NONLAT.sub(' ', s)
    return len(re.findall(r"[A-Za-z][A-Za-z'-]{2,}", s))

def score(lang, lem, v, fset):
    defn = (v.get('definition') or '').strip()
    pos = v.get('pos') or ''
    base = (lem.split()[0] if lem else lem)
    s = 0.0
    freq = LAT_FREQ if lang == 'latino' else GR_FREQ
    if lem in freq: s += 1000
    if lem in fset: s += 500
    if pos in FUNCTION_POS: s += 200
    s += max(-6, min(12, 14 - len(base.replace('-', ''))))
    s += min(gloss_words(defn), 6)
    if pos in CONTENT_POS: s += 3
    s -= min(len(CIT.findall(defn)), 8) * 1.5
    if EPIG.search(defn): s -= 25
    if GLOSS.search(defn): s -= 12
    if NAME.search(defn): s -= 14
    if is_proper(lem): s -= 10
    if '-' in lem: s -= 7
    if not defn: s -= 200
    elif len(defn) <= 12: s -= 12
    return s

def promotable(lem, v):
    """Filtro duro: mai promuovere spazzatura d'archivio o voci-citazione.
    Richiede una definizione con ALMENO 2 parole-glossa reali dopo aver tolto
    citazioni/abbreviazioni → esclude i "passi" tipo "= Theoc.10.38"."""
    d = (v.get('definition') or '').strip()
    if len(d) < 5: return False
    if re.search(r'[\s\d]', lem): return False     # spazi/cifre nel lemma
    if '-' in lem: return False                     # lemma segmentato
    if gloss_words(d) < 2: return False             # solo citazioni/passi → fuori
    return True

def load_active(base, idx):
    shards = {}; forms_lemmas = set()
    for letter in idx['letters']:
        d = json.load(open(os.path.join(base, letter + '.json'), encoding='utf-8'))
        shards[letter] = d
        for arr in d.get('forms', {}).values():
            for e in arr:
                if e.get('lemma'): forms_lemmas.add(e['lemma'])
    return shards, forms_lemmas

def load_archive(base, idx):
    arch = {}
    adir = os.path.join(base, 'archive')
    for letter in idx['letters']:
        p = os.path.join(adir, letter + '.json')
        if os.path.exists(p):
            j = json.load(open(p, encoding='utf-8'))
            arch[letter] = j.get('dict', {}) if isinstance(j, dict) else {}
        else:
            arch[letter] = {}
    return arch

def main():
    for lang in ('latino', 'greco'):
        base = os.path.join(ROOT, DIR[lang])
        idx = json.load(open(os.path.join(base, '_index.json'), encoding='utf-8'))
        shards, forms_lemmas = load_active(base, idx)
        arch = load_archive(base, idx)

        active_all = {}
        for d in shards.values():
            active_all.update(d.get('dict', {}))
        n_active = len(active_all)
        fset = forms_lemmas & (set(active_all) | {l for dd in arch.values() for l in dd})

        # candidati = voci d'archivio non già attive, che superano il filtro duro
        cands = []  # (score, letter, lemma)
        for letter, dd in arch.items():
            for lem, v in dd.items():
                if lem in active_all: continue
                if not promotable(lem, v): continue
                cands.append((score(lang, lem, v, fset), letter, lem))
        cands.sort(key=lambda x: (-x[0], x[1]))

        need = max(0, TARGET - n_active)
        promote = cands[:need]
        promote_set = {(l, lem) for _, l, lem in promote}

        print(f"[{lang}] attivi={n_active} archivio_promuovibili={len(cands)} "
              f"target={TARGET} → promuovo={len(promote)} (tot finale={n_active + len(promote)})")
        if promote:
            cutoff = promote[-1][0]
            print(f"   score di taglio={cutoff:.1f}  · top promossi: " +
                  ', '.join(lem for _, _, lem in promote[:10]))
            print(f"   ultimi promossi: " + ', '.join(lem for _, _, lem in promote[-8:]))
        # cosa resta escluso appena sotto il taglio
        rest = cands[need:need+8]
        if rest:
            print(f"   primi esclusi (sotto taglio): " + ', '.join(lem for _, _, lem in rest))

        if DRY:
            continue

        # ── applica: sposta da archivio a shard attivo ──
        moved = 0
        for letter in idx['letters']:
            d = shards[letter]; dct = d.setdefault('dict', {})
            adct = arch.get(letter, {})
            promo_here = [lem for (l, lem) in promote_set if l == letter]
            for lem in promo_here:
                if lem in adct:
                    dct[lem] = adct.pop(lem)
                    moved += 1
            # riscrivi shard attivo
            with open(os.path.join(base, letter + '.json'), 'w', encoding='utf-8') as f:
                json.dump(d, f, ensure_ascii=False)
            # riscrivi archivio (rimosse le promosse)
            apath = os.path.join(base, 'archive', letter + '.json')
            if os.path.exists(apath) or adct:
                with open(apath, 'w', encoding='utf-8') as f:
                    json.dump({'meta': {'lang': lang, 'letter': letter, 'archived_count': len(adct)},
                               'dict': adct}, f, ensure_ascii=False)
        # ── aggiorna _index meta ──
        meta = idx.get('meta', {})
        meta['total_lemmas'] = n_active + moved
        meta['archived_lemmas'] = max(0, meta.get('archived_lemmas', 0) - moved)
        with open(os.path.join(base, '_index.json'), 'w', encoding='utf-8') as f:
            json.dump(idx, f, ensure_ascii=False)
        print(f"   -> promossi {moved} lemmi. Totale attivo {lang} = {n_active + moved}")

    if DRY:
        print("\n(DRY RUN — nessun file modificato)")

if __name__ == '__main__':
    main()
