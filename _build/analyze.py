# -*- coding: utf-8 -*-
"""Analyze Latin & Greek corpora to design scholastic pruning heuristics."""
import json, glob, os, re, sys, unicodedata
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')

DIR = {'latino': 'latin', 'greco': 'greek'}

def load_lang(lang):
    d0 = DIR[lang]
    idx = json.load(open(os.path.join(ROOT, d0, '_index.json'), encoding='utf-8'))
    dict_all = {}
    forms_lemmas = set()
    for letter in idx['letters']:
        p = os.path.join(ROOT, d0, letter + '.json')
        d = json.load(open(p, encoding='utf-8'))
        dict_all.update(d.get('dict', {}))
        for form, arr in d.get('forms', {}).items():
            for entry in arr:
                lem = entry.get('lemma')
                if lem: forms_lemmas.add(lem)
    return idx, dict_all, forms_lemmas

def is_proper(lemma):
    # first alpha char uppercase
    for ch in lemma:
        if ch.isalpha():
            return ch == ch.upper() and ch != ch.lower()
    return False

# Patterns that mark a definition as "citation-only / testimonia / cross-ref"
CROSS_REF = re.compile(r'^\s*(=|cf\.|v\.\s|vide|q\.v\.|Dim\.|sq\.|Lat\.)')
# author.number citation pattern e.g. "Il.12.157" "Th.6.4" "Sapph.158"
CITATION = re.compile(r'[A-Z][A-Za-z]*\.?\d')

def def_quality(defn):
    """Heuristic 0..n score of how 'scholastic-useful' a definition is."""
    if not defn: return 0
    d = defn.strip()
    return len(d)

for lang in ['latino', 'greco']:
    idx, dict_all, forms_lemmas = load_lang(lang)
    n = len(dict_all)
    print('='*60)
    print(lang.upper(), 'total lemmas:', n, '| lemmas-with-forms:', len(forms_lemmas & set(dict_all)))
    # distributions
    empty_def = 0
    short_def = 0   # <20 chars
    crossref = 0
    proper = 0
    has_form = 0
    pos_count = {}
    deflen_buckets = {'0':0,'1-15':0,'16-40':0,'41-100':0,'100+':0}
    for lem, v in dict_all.items():
        defn = (v.get('definition') or '').strip()
        pos = v.get('pos') or '(vuoto)'
        pos_count[pos] = pos_count.get(pos, 0) + 1
        if not defn: empty_def += 1
        L = len(defn)
        if L == 0: deflen_buckets['0'] += 1
        elif L <= 15: deflen_buckets['1-15'] += 1
        elif L <= 40: deflen_buckets['16-40'] += 1
        elif L <= 100: deflen_buckets['41-100'] += 1
        else: deflen_buckets['100+'] += 1
        if L <= 20: short_def += 1
        if CROSS_REF.match(defn): crossref += 1
        if is_proper(lem): proper += 1
        if lem in forms_lemmas: has_form += 1
    print('empty def:', empty_def, '| short(<=20):', short_def, '| crossref-start:', crossref, '| proper-noun:', proper, '| has-attested-form:', has_form)
    print('deflen buckets:', deflen_buckets)
    print('PoS distribution:')
    for k,v in sorted(pos_count.items(), key=lambda x:-x[1]):
        print('   ', repr(k), v)
