# -*- coding: utf-8 -*-
"""Ripara il disallineamento forms→dict: molti lemmi referenziati dall'indice
delle forme usano grafie diverse dal lemmario (j/i, assimilazione dei prefissi,
trattini, omografi numerati). Genera data/<lang>/aliases.json con la mappa
lemma-mancante → lemma-canonico del dizionario. Filologia delle trasformazioni:
  - j → i (jubeo → iubeo): grafia moderna vs classica
  - prefissi col trattino: ad-sumo → adsumo → assumo (assimilazione)
  - assimilazione ⇄ etimologica: adf/aff, adc/acc, adg/agg, adl/all, adp/app,
    adq/acq, ads/ass, adt/att; conl/coll, conm/comm, conr/corr, conb/comb,
    conp/comp; inl/ill, inm/imm, inr/irr, inb/imb, inp/imp; obc/occ, obf/off,
    obp/opp; subc/succ, subf/suff, subg/sugg, subm/summ, subp/supp, subr/surr;
    exf/eff; disf/diff
  - arcaismi vocalici: vo → ve (revorto → reverto), u ⇄ i (recipero→recupero? no:
    recupero/recipero sono varianti reali — proviamo entrambe le direzioni)
  - deponenti: +r (miro → miror, vago → vagor)
  - omografi numerati: duo → duo1 (gestito a parte, qui registrato come alias)
  - '# ' spurio all'inizio della chiave (bug di generazione)
"""
import json, os, re, sys, unicodedata, collections
sys.stdout.reconfigure(encoding='utf-8')

def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if not unicodedata.combining(c))

ASSIM = [
    ('adf','aff'),('adc','acc'),('adg','agg'),('adl','all'),('adp','app'),
    ('adq','acq'),('ads','ass'),('adt','att'),('adr','arr'),('adn','ann'),
    ('conl','coll'),('conm','comm'),('conr','corr'),('conb','comb'),('conp','comp'),
    ('inl','ill'),('inm','imm'),('inr','irr'),('inb','imb'),('inp','imp'),
    ('obc','occ'),('obf','off'),('obp','opp'),('obg','ogg'),
    ('subc','succ'),('subf','suff'),('subg','sugg'),('subm','summ'),('subp','supp'),('subr','surr'),
    ('exf','eff'),('disf','diff'),('transd','trad'),('transm','tram'),('transl','tral'),
]

def latin_variants(lemma):
    """Genera le grafie candidate (ordinate per plausibilità)."""
    out = []
    base = lemma.strip()
    if base.startswith('# '): base = base[2:]
    cands = {base}
    # trattino via (ad-sumo → adsumo)
    cands.add(base.replace('-', ''))
    cands.add(base.replace('_', ''))
    more = set()
    for c in cands:
        # j → i
        more.add(c.replace('j', 'i').replace('J', 'I'))
    cands |= more
    more = set()
    for c in cands:
        # assimilazioni in ENTRAMBE le direzioni (solo all'inizio parola)
        for a, b in ASSIM:
            if c.startswith(a): more.add(b + c[len(a):])
            if c.startswith(b): more.add(a + c[len(b):])
    cands |= more
    more = set()
    for c in cands:
        # arcaismo vo→ve dopo consonante iniziale di radice (revorto→reverto)
        if 'vo' in c: more.add(c.replace('vort', 'vert').replace('voc', 'vec') if 'vort' in c else c.replace('vort','vert'))
        more.add(re.sub(r'vort', 'vert', c))
        # u ⇄ i in sillaba interna (recipero ⇄ recupero; maxumus ⇄ maximus)
        more.add(re.sub(r'um([aeiou])', r'im\1', c))
        more.add(re.sub(r'im([aeiou])', r'um\1', c))
        more.add(c.replace('recip', 'recup').replace('recup', 'recip') if False else c)
        more.add(re.sub(r'^recip', 'recup', c))
        # deponente: aggiungi -r
        if c.endswith('o'): more.add(c + 'r')
    cands |= more
    cands.discard(base)
    return [base] + sorted(cands)

def greek_variants(lemma):
    out = {lemma.strip()}
    b = lemma.strip()
    if b.startswith('# '): out.add(b[2:])
    return list(out)

for lang in ('latin', 'greek'):
    base = f'data/{lang}'
    # dizionario noto: chiave esatta + chiave normalizzata + senza numero finale
    exact = set(); by_norm = {}
    for sub in ('', 'archive/'):
        for f in os.listdir(base + '/' + sub if sub else base):
            if not f.endswith('.json') or f.startswith('_'): continue
            p = os.path.join(base, sub, f) if sub else os.path.join(base, f)
            try: data = json.load(open(p, encoding='utf-8'))
            except Exception: continue
            for k in (data.get('dict') or {}):
                exact.add(k)
                nk = norm(re.sub(r'\d+$', '', k))
                by_norm.setdefault(nk, k)
    # lemmi referenziati mancanti
    refcount = collections.Counter()
    for f in os.listdir(base):
        if not f.endswith('.json') or f.startswith('_'): continue
        data = json.load(open(os.path.join(base, f), encoding='utf-8'))
        for form, cands in (data.get('forms') or {}).items():
            for c in cands: refcount[c['lemma']] += 1
    missing = {l: n for l, n in refcount.items() if l not in exact and norm(re.sub(r'\d+$', '', l)) not in by_norm}
    aliases = {}
    variants_fn = latin_variants if lang == 'latin' else greek_variants
    for lem in missing:
        for v in variants_fn(lem):
            nv = norm(re.sub(r'\d+$', '', v))
            if v in exact: aliases[lem] = v; break
            if nv in by_norm: aliases[lem] = by_norm[nv]; break
    # anche gli omografi 'nudi' (duo → duo1) che NON sono missing perché il norm li copre:
    # il motore li gestirà con l'indice normalizzato senza numeri; qui non serve.
    unresolved = {l: refcount[l] for l in missing if l not in aliases}
    print(f'{lang}: mancanti {len(missing)} · risolti via alias {len(aliases)} · irrisolti {len(unresolved)}')
    top = sorted(unresolved.items(), key=lambda x: -x[1])[:25]
    print('  irrisolti top:', ', '.join(f'{l}({n})' for l, n in top))
    json.dump(aliases, open(f'{base}/aliases.json', 'w', encoding='utf-8'), ensure_ascii=False, sort_keys=True)
    json.dump(unresolved, open(f'_build/_unresolved_{lang}.json', 'w', encoding='utf-8'), ensure_ascii=False)
