# -*- coding: utf-8 -*-
"""Preview scholastic-pruning scores and cutoffs before regenerating shards."""
import json, os, re, sys, unicodedata
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')
DIR = {'latino': 'latin', 'greco': 'greek'}

# ---- parse frequency word lists from the JS module for a ranking boost ----
def load_freq_sets():
    p = os.path.join(os.path.dirname(__file__), '..', 'modules', 'dictionary', 'frequency.js')
    txt = open(p, encoding='utf-8').read()
    lat, gr = set(), set()
    # crude: collect all single-quoted tokens within LATIN_FREQ_* / GREEK_FREQ_* blocks
    for m in re.finditer(r"const (LATIN|GREEK)_FREQ_\d\s*=\s*new Set\(\[(.*?)\]\)", txt, re.S):
        which, body = m.group(1), m.group(2)
        toks = re.findall(r"'([^']+)'", body)
        (lat if which == 'LATIN' else gr).update(toks)
    return lat, gr

LAT_FREQ, GR_FREQ = load_freq_sets()
print('freq sets:', 'lat', len(LAT_FREQ), 'gr', len(GR_FREQ))

def load_lang(lang):
    d0 = DIR[lang]
    idx = json.load(open(os.path.join(ROOT, d0, '_index.json'), encoding='utf-8'))
    dict_all = {}
    forms_lemmas = set()
    for letter in idx['letters']:
        d = json.load(open(os.path.join(ROOT, d0, letter + '.json'), encoding='utf-8'))
        dict_all.update(d.get('dict', {}))
        for form, arr in d.get('forms', {}).items():
            for e in arr:
                if e.get('lemma'): forms_lemmas.add(e['lemma'])
    return idx, dict_all, forms_lemmas

def is_proper(lemma):
    for ch in lemma:
        if ch.isalpha():
            return ch == ch.upper() and ch != ch.lower()
    return False

# Strip LSJ-style citations to estimate real gloss content.
CIT = re.compile(r'\b[A-Z][A-Za-z]*\.?(?:\s?\d[\d.,]*)')   # author + number, e.g. Il.12.157, Th.6.4
PAREN = re.compile(r'\([^)]*\)')
ABBR = re.compile(r'\b(cf|v|sq|al|prob|cj|interpol|Dim|Ep|Aeol|Dor|Ion|Att|Lat|Adj|Subst|pl|sg|gen|dat|acc|nom|voc)\b\.?', re.I)
NONLAT = re.compile(r'[^\x00-\x7f]+')   # non-ASCII (greek words inside def)

def gloss_words(defn):
    if not defn: return 0, ''
    s = defn
    s = PAREN.sub(' ', s)
    s = CIT.sub(' ', s)
    s = ABBR.sub(' ', s)
    s = NONLAT.sub(' ', s)
    # remaining latin-script word tokens of length>=3 (real gloss vocabulary)
    words = re.findall(r"[A-Za-z][A-Za-z'-]{2,}", s)
    return len(words), ' '.join(words[:8])

def score(lang, lem, v, forms_lemmas):
    defn = (v.get('definition') or '').strip()
    pos = v.get('pos') or ''
    gw, _ = gloss_words(defn)
    s = 0.0
    s += gw * 2.0                      # real gloss content is king
    if lem in forms_lemmas: s += 40    # attested with inflected forms
    freq = LAT_FREQ if lang == 'latino' else GR_FREQ
    if lem in freq: s += 60            # top-frequency vocabulary
    if pos in ('sostantivo','aggettivo','verbo','avverbio'): s += 4
    if pos in ('congiunzione','preposizione','pronome','particella','numerale'): s += 30  # function words: always useful
    if is_proper(lem): s -= 12         # proper nouns less useful for school
    if not defn: s -= 100              # empty defs go to archive
    L = len(defn)
    if 0 < L <= 12: s -= 8             # citation-only stubs
    # shorter lemmas tend to be more basic vocabulary (mild)
    base = lem.split()[0] if lem else lem
    if len(base) <= 9: s += 1
    return s

for lang, target in [('latino', None), ('greco', 10000)]:
    idx, dict_all, forms_lemmas = load_lang(lang)
    fset = forms_lemmas & set(dict_all)
    scored = [(score(lang, lem, v, fset), lem, v) for lem, v in dict_all.items()]
    scored.sort(key=lambda x: (-x[0], x[1]))
    print('='*70)
    print(lang.upper(), 'total', len(dict_all), '| forms-bearing', len(fset))
    if lang == 'latino':
        # Latin policy: keep forms-bearing + any with strong score; report
        keep_forms = [s for s in scored if s[1] in fset]
        print('forms-bearing kept ->', len(keep_forms))
        target = len(keep_forms)
    cutoff = scored[target-1][0]
    kept = scored[:target]
    arch = scored[target:]
    print('TARGET', target, '| cutoff score', cutoff, '| kept', len(kept), '| archived', len(arch))
    # ensure all forms-bearing are within kept
    kept_set = set(l for _,l,_ in kept)
    missing_forms = fset - kept_set
    print('forms-bearing NOT in kept (will force-add):', len(missing_forms))
    print('--- 12 KEPT around the cutoff ---')
    for s,l,v in scored[max(0,target-6):target+6]:
        gw,sample = gloss_words(v.get('definition'))
        print(f'  {s:7.1f} {l!r:24} gw={gw} :: {sample[:50]}')
    print('--- 10 sample ARCHIVED (just below cutoff) ---')
    for s,l,v in scored[target:target+10]:
        print(f'  {s:7.1f} {l!r:24} :: {(v.get("definition") or "")[:60]!r}')
    # sanity: common words must be kept
    probes = (['sum','amo','rex','bonus','aqua','virtus','homo','dico'] if lang=='latino'
              else ['λόγος','ἄνθρωπος','καλός','θεός','λέγω','πόλις','ἀγαθός','φιλέω','σοφία','βασιλεύς'])
    print('--- probe common words (rank / kept?) ---')
    rank = {l:i for i,(_,l,_) in enumerate(scored)}
    for p in probes:
        r = rank.get(p)
        print(f'   {p!r:14} rank={r} kept={r is not None and r < target}')
