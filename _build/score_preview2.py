# -*- coding: utf-8 -*-
"""Preview v2: scholastic scoring that penalizes epigraphic/testimonia markers."""
import json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')
DIR = {'latino': 'latin', 'greco': 'greek'}

def load_freq_sets():
    p = os.path.join(os.path.dirname(__file__), '..', 'modules', 'dictionary', 'frequency.js')
    txt = open(p, encoding='utf-8').read()
    lat, gr = set(), set()
    for m in re.finditer(r"const (LATIN|GREEK)_FREQ_\d\s*=\s*new Set\(\[(.*?)\]\)", txt, re.S):
        toks = re.findall(r"'([^']+)'", m.group(2))
        (lat if m.group(1) == 'LATIN' else gr).update(toks)
    return lat, gr
LAT_FREQ, GR_FREQ = load_freq_sets()

def load_lang(lang):
    d0 = DIR[lang]
    idx = json.load(open(os.path.join(ROOT, d0, '_index.json'), encoding='utf-8'))
    dict_all = {}; forms_lemmas = set()
    for letter in idx['letters']:
        d = json.load(open(os.path.join(ROOT, d0, letter + '.json'), encoding='utf-8'))
        dict_all.update(d.get('dict', {}))
        for arr in d.get('forms', {}).values():
            for e in arr:
                if e.get('lemma'): forms_lemmas.add(e['lemma'])
    return idx, dict_all, forms_lemmas

def is_proper(lemma):
    for ch in lemma:
        if ch.isalpha(): return ch == ch.upper() and ch != ch.lower()
    return False

# ---- markers ----
# epigraphic / papyrological sources (the "voci epigrafiche")
EPIG = re.compile(r'\b(IG|SIG|OGI|SEG|CIG|GDI|Schwyzer|Sammelb|SB|Ostr|Inscr|Tab\.?Defix|'
                  r'P\.?(Oxy|Mich|Cair|Lond|Petr|Hib|Teb|Teb|Flor|Giss|Ryl|Hamb|Grenf|Strassb|Lille|Eleph|Par|Leid|Amh|Fay|Goodsp)|'
                  r'PSI|BGU|PCZ|PEnteux|PRev|PMagic|PGM|Wilcken|Mitteis)\b')
# glossographers / lexica only (testimonia)
GLOSS = re.compile(r'\b(Hsch|Suid|Phot|EM|Zonar|AB|Sch|Et\.?Gud|Et\.?M|Cyr|Theognost|Orio|Ammon|Poll|Moer|Phryn|Hdn\.?Gr)\b')
NAME = re.compile(r'\b(name of|son of|daughter of|epith\.?|surname|place in|city in|town in|river in|mountain in|island in|'
                  r'festival|gentile name|nymph|deity|hero |Pythagorean|king of|tribe|demos|deme of)\b', re.I)
CIT = re.compile(r'\b[A-Z][A-Za-z]*\.?\s?\d[\d.,]*')
PAREN = re.compile(r'\([^)]*\)')
ABBR = re.compile(r'\b(cf|v|sq|al|prob|cj|interpol|Dim|Ep|Aeol|Dor|Ion|Att|Lat|Adj|Subst|pl|sg|gen|dat|acc|nom|voc|comp|Sup|impf|aor|pf|fut|Med|Pass|Act)\b\.?', re.I)
NONLAT = re.compile(r'[^\x00-\x7f]+')

def gloss_words(defn):
    s = PAREN.sub(' ', defn); s = CIT.sub(' ', s); s = ABBR.sub(' ', s); s = NONLAT.sub(' ', s)
    return len(re.findall(r"[A-Za-z][A-Za-z'-]{2,}", s))

def score(lang, lem, v, fset):
    defn = (v.get('definition') or '').strip()
    pos = v.get('pos') or ''
    base = lem.split()[0] if lem else lem
    s = 0.0
    freq = LAT_FREQ if lang == 'latino' else GR_FREQ
    if lem in freq: s += 1000
    if lem in fset: s += 500
    if pos in ('congiunzione','preposizione','pronome','particella','numerale'): s += 200
    # commonness proxy: shorter lemma = more basic vocab
    s += max(-6, min(12, 14 - len(base.replace('-',''))))
    gw = gloss_words(defn)
    s += min(gw, 6)                  # has real gloss content (capped)
    if pos in ('sostantivo','aggettivo','verbo','avverbio'): s += 3
    ncit = len(CIT.findall(defn))
    s -= min(ncit, 8) * 1.5         # citation-heavy = testimonia
    if EPIG.search(defn): s -= 25   # epigraphic/papyrological
    if GLOSS.search(defn): s -= 12  # glossographer-only testimonia
    if NAME.search(defn): s -= 14   # proper-name gloss
    if is_proper(lem): s -= 10
    if '-' in lem: s -= 7           # LSJ compound sub-entry
    if not defn: s -= 200
    elif len(defn) <= 12: s -= 12
    return s

for lang, target in [('latino', None), ('greco', 11000)]:
    idx, dict_all, forms_lemmas = load_lang(lang)
    fset = forms_lemmas & set(dict_all)
    if lang == 'latino':
        target = len(fset)   # ~11,696, all attested
    scored = sorted(((score(lang, l, v, fset), l, v) for l, v in dict_all.items()),
                    key=lambda x: (-x[0], x[1]))
    cutoff = scored[target-1][0]
    kept = set(l for _, l, _ in scored[:target])
    # force-include all forms-bearing anchors
    forced = fset - kept
    print('='*72)
    print(lang.upper(), 'total', len(dict_all), 'target', target, 'cutoff', cutoff,
          'forced-add-forms', len(forced), '-> final kept', len(kept | fset),
          'archived', len(dict_all) - len(kept | fset))
    print('--- 14 around cutoff ---')
    for s, l, v in scored[max(0,target-7):target+7]:
        d=(v.get('definition') or '')[:46].replace(chr(10),' ')
        print(f'  {s:8.1f} {l!r:22} :: {d}')
    if lang=='greco':
        print('--- 12 deeper into archive (should be clearly obscure) ---')
        for s,l,v in scored[target+200:target+212]:
            d=(v.get('definition') or '')[:50].replace(chr(10),' ')
            print(f'  {s:8.1f} {l!r:22} :: {d}')
