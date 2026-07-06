# -*- coding: utf-8 -*-
"""Promuove dall'ARCHIVIO al NUCLEO attivo le voci che l'indice delle forme
referenzia (populus1/2, duo1, quoque1, …): il pruner le aveva archiviate come
omografi numerati pur lasciando vive le loro forme flesse. La voce promossa
prende la chiave canonica piana (populus), fondendo gli omografi «1) … | 2) …»
nell'ordine di numerazione (in L&S/LSJ il n.1 è il più importante). Idempotente;
aggiorna i meta e RIMUOVE le chiavi promosse dall'archivio (niente doppioni).
Guardia: per il greco il match è sulla piegatura NFD senza numeri, ma i
monosillabi richiedono uguaglianza esatta della forma de-sillabata (ὦς ≠ ὡς).
"""
import json, os, re, sys, unicodedata, collections
sys.stdout.reconfigure(encoding='utf-8')

def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if not unicodedata.combining(c))

def canon(lang, s):
    s = s.strip()
    if s.startswith('# '): s = s[2:]
    s = s.replace('-', '').replace('_', '')
    if lang == 'latin': s = s.replace('j', 'i').replace('J', 'I')
    return s

def fold(lang, s):
    return norm(re.sub(r'\d+$', '', canon(lang, s)))

for lang in ('latin', 'greek'):
    base = f'data/{lang}'
    # lemmi referenziati dalle forme: fold → grafia di riferimento più frequente
    refspell = collections.defaultdict(collections.Counter)
    for f in os.listdir(base):
        if not f.endswith('.json') or f.startswith('_'): continue
        data = json.load(open(os.path.join(base, f), encoding='utf-8'))
        for form, cands in (data.get('forms') or {}).items():
            for c in cands:
                refspell[fold(lang, c['lemma'])][canon(lang, c['lemma'])] += 1
    # fold già presenti nel nucleo
    core_fold = set()
    core_paths = {}
    for f in os.listdir(base):
        if not f.endswith('.json') or f.startswith('_') or f == 'aliases.json': continue
        p = os.path.join(base, f)
        data = json.load(open(p, encoding='utf-8'))
        if 'dict' not in data: continue
        core_paths[f[:-5]] = p
        for k in data['dict']:
            core_fold.add(fold(lang, k))
    # candidati alla promozione dall'archivio
    promo = collections.defaultdict(list)   # fold → [(chiave_arch, voce, file)]
    for f in os.listdir(f'{base}/archive'):
        if not f.endswith('.json'): continue
        ap = f'{base}/archive/{f}'
        data = json.load(open(ap, encoding='utf-8'))
        for k, v in (data.get('dict') or {}).items():
            fk = fold(lang, k)
            if fk in core_fold or fk not in refspell: continue
            if lang == 'greek' and len(fk) <= 2:
                # monosillabo: pretendi identità esatta senza numeri
                if re.sub(r'\d+$', '', canon(lang, k)) not in refspell[fk]: continue
            promo[fk].append((k, v, ap))
    # iniezione nel nucleo + rimozione dall'archivio
    injected = 0
    arch_dirty = {}
    core_dirty = {}
    for fk, items in promo.items():
        items.sort(key=lambda x: (len(x[0]), x[0]))       # populus1 prima di populus2
        key = refspell[fk].most_common(1)[0][0]            # grafia usata dalle forme
        letter = fk[:1]
        if letter not in core_paths: continue
        cp = core_paths[letter]
        core = core_dirty.get(cp) or json.load(open(cp, encoding='utf-8'))
        if key in core['dict']: continue
        if len(items) == 1:
            e = items[0][1]
            entry = { 'pos': e.get('pos', ''), 'definition': e.get('definition', '') }
        else:
            parts, pos = [], ''
            for i, (k, e, _) in enumerate(items[:3], 1):
                if not pos and e.get('pos'): pos = e['pos']
                d = (e.get('definition') or '').strip()
                if len(d) > 420: d = d[:417] + '…'
                parts.append(f'{i}) {d}')
            entry = { 'pos': pos, 'definition': ' | '.join(parts) }
        entry['src'] = 'promoted'
        core['dict'][key] = entry
        core_dirty[cp] = core
        injected += 1
        for k, _, ap in items:
            arch = arch_dirty.get(ap) or json.load(open(ap, encoding='utf-8'))
            arch['dict'].pop(k, None)
            arch_dirty[ap] = arch
    for cp, data in core_dirty.items():
        data.setdefault('meta', {})['lemmas_count'] = len(data['dict'])
        json.dump(data, open(cp, 'w', encoding='utf-8'), ensure_ascii=False)
    for ap, data in arch_dirty.items():
        data.setdefault('meta', {})['archived_count'] = len(data['dict'])
        json.dump(data, open(ap, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{lang}: promossi {injected} lemmi dall\'archivio al nucleo')
