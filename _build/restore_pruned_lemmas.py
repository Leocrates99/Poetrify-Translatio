# -*- coding: utf-8 -*-
"""Restaura nel nucleo attivo le voci perdute dal taglio, recuperandole dal
backup pre-prune (_build/backup/). Il danno: l'indice delle forme referenzia
lemmi che non hanno più voce nel dizionario (populus, jubeo, vulnero, …).

Cause riconosciute e relative strategie di match sul backup:
  1. omografi numerati   populus → populus1 + populus2 (si fondono: «1) … | 2) …»)
  2. grafia j/i          jubeo → iubeo (in entrambe le direzioni)
  3. trattini/underscore ad-sumo, de_-voveo → adsumo, devoveo
  4. «# » spurio         '# ἀνέχω' → 'ἀνέχω'
  5. assimilazione       adfero ⇄ affero, conligo ⇄ colligo, subm ⇄ summ, …
  6. apofonia in composizione  confacio → conficio, occaedes → occido,
     ad-capio → accipio (facio→ficio, cado→cido, caedo→cido, capio→cipio,
     teneo→tineo, premo→primo, habeo→hibeo, statuo→stituo, salio→silio,
     ago→igo, quaero→quiro, laedo→lido, claudo→cludo, tango→tingo)
  7. de-sillabazione LSJ (greco)  μαγάδ-ιον → μαγάδιον

Guardie filologiche:
  - monosillabi greci: SOLO match esatto (οὐ ≠ οὗ, ὁ ≠ ὅ: spiriti e accenti
    sono distintivi);
  - il match normalizzato non scavalca mai un match esatto.

La voce restaurata viene INIETTATA nello shard attivo con chiave = grafia
canonica del lemma referenziato dalle forme (j→i, senza trattini), così il
lookup runtime non ha bisogno di alias. Idempotente (marca src:'restored').
"""
import json, os, re, sys, unicodedata, collections
sys.stdout.reconfigure(encoding='utf-8')

def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if not unicodedata.combining(c))

def canon_latin(lemma):
    s = lemma.strip()
    if s.startswith('# '): s = s[2:]
    s = s.replace('-', '').replace('_', '')
    s = s.replace('j', 'i').replace('J', 'I')
    return s

def canon_greek(lemma):
    s = lemma.strip()
    if s.startswith('# '): s = s[2:]
    return s.replace('-', '')

ASSIM = [
    ('adf','aff'),('adc','acc'),('adg','agg'),('adl','all'),('adp','app'),
    ('adq','acq'),('ads','ass'),('adt','att'),('adr','arr'),('adn','ann'),
    ('conl','coll'),('conm','comm'),('conr','corr'),('conp','comp'),
    ('inl','ill'),('inm','imm'),('inr','irr'),('inp','imp'),
    ('obc','occ'),('obf','off'),('obp','opp'),
    ('subc','succ'),('subf','suff'),('subg','sugg'),('subm','summ'),('subp','supp'),('subr','surr'),
    ('exf','eff'),('disf','diff'),
]
APOPHONY = [
    ('facio','ficio'),('cado','cido'),('caedo','cido'),('capio','cipio'),
    ('teneo','tineo'),('premo','primo'),('habeo','hibeo'),('statuo','stituo'),
    ('salio','silio'),('ago','igo'),('quaero','quiro'),('laedo','lido'),
    ('claudo','cludo'),('tango','tingo'),('caedes','cidium'),
]

def latin_candidates(lemma):
    base = canon_latin(lemma)
    out = [base]
    seen = {base}
    def push(x):
        if x and x not in seen:
            seen.add(x); out.append(x)
    for a, b in ASSIM:
        if base.startswith(a): push(b + base[len(a):])
        if base.startswith(b): push(a + base[len(b):])
    snapshot = list(out)
    for c in snapshot:
        for plain, weak in APOPHONY:
            if c.endswith(plain): push(c[:-len(plain)] + weak)
            if c.endswith(weak): push(c[:-len(weak)] + plain)
    snapshot = list(out)
    for c in snapshot:
        push(re.sub(r'vort', 'vert', c))
        push(re.sub(r'^recip', 'recup', c))
        if c.endswith('o'): push(c + 'r')          # attivo → deponente
        if c.endswith('or'): push(c[:-1])           # deponente → attivo
    return out

def load_backup(lang):
    """Indice del backup: norm(chiave de-sillabata, senza numero) → [chiavi]."""
    d = f'_build/backup/{lang}'
    exact, folded = {}, {}
    dehy = canon_latin if lang == 'latin' else canon_greek
    for f in os.listdir(d):
        if not f.endswith('.json'): continue
        data = json.load(open(os.path.join(d, f), encoding='utf-8'))
        dd = data.get('dict', data)
        if not isinstance(dd, dict): continue
        for k, v in dd.items():
            if not isinstance(v, dict): continue
            exact[k] = v
            fk = norm(re.sub(r'\d+$', '', dehy(k)))
            folded.setdefault(fk, []).append(k)
    for fk in folded:
        folded[fk].sort(key=lambda k: (len(k), k))   # populus1 prima di populus2
    return exact, folded

def merge_homographs(keys, exact):
    """populus1+populus2 → voce unica «1) … | 2) …» (fedele, compatta)."""
    if len(keys) == 1:
        e = exact[keys[0]]
        return { 'pos': e.get('pos', ''), 'definition': e.get('definition', '') }
    parts, pos = [], ''
    for i, k in enumerate(keys[:3], 1):
        e = exact[k]
        if not pos and e.get('pos'): pos = e['pos']
        d = (e.get('definition') or '').strip()
        if len(d) > 420: d = d[:417] + '…'
        parts.append(f'{i}) {d}')
    return { 'pos': pos, 'definition': ' | '.join(parts) }

def main():
    report = {}
    for lang in ('latin', 'greek'):
        base = f'data/{lang}'
        canon = canon_latin if lang == 'latin' else canon_greek
        # 1 · chiavi attive note (core + archivio), con piegatura
        active_fold = set()
        for sub in ('', 'archive/'):
            dd = os.path.join(base, sub) if sub else base
            for f in os.listdir(dd):
                if not f.endswith('.json') or f.startswith('_'): continue
                data = json.load(open(os.path.join(dd, f), encoding='utf-8'))
                for k in (data.get('dict') or {}):
                    active_fold.add(norm(re.sub(r'\d+$', '', canon(k))))
        # 2 · lemmi referenziati dalle forme, con conteggio
        refcount = collections.Counter()
        for f in os.listdir(base):
            if not f.endswith('.json') or f.startswith('_'): continue
            data = json.load(open(os.path.join(base, f), encoding='utf-8'))
            for form, cands in (data.get('forms') or {}).items():
                for c in cands: refcount[c['lemma']] += 1
        missing = {l: n for l, n in refcount.items()
                   if norm(re.sub(r'\d+$', '', canon(l))) not in active_fold}
        # 3 · match sul backup
        exact, folded = load_backup(lang)
        to_inject = {}      # chiave canonica → voce
        unresolved = {}
        for lem, n in missing.items():
            ckey = canon(lem)
            hit_keys = None
            if lang == 'latin':
                for cand in latin_candidates(lem):
                    if cand in exact: hit_keys = [cand]; break
                    fk = norm(cand)
                    if fk in folded: hit_keys = folded[fk]; break
            else:
                cg = canon_greek(lem)
                if cg in exact: hit_keys = [cg]
                else:
                    fk = norm(cg)
                    # monosillabi: solo esatto (οὐ ≠ οὗ)
                    if len(fk) > 2 and fk in folded:
                        hit_keys = folded[fk]
            if hit_keys:
                entry = merge_homographs(hit_keys, exact)
                entry['src'] = 'restored'
                to_inject[ckey] = entry
            else:
                unresolved[lem] = n
        # 4 · iniezione negli shard attivi (per prima lettera normalizzata)
        by_letter = collections.defaultdict(dict)
        for ckey, entry in to_inject.items():
            letter = norm(ckey)[:1]
            by_letter[letter][ckey] = entry
        injected = 0
        for letter, entries in sorted(by_letter.items()):
            path = os.path.join(base, f'{letter}.json')
            if not os.path.exists(path):
                # lettera senza shard (j latino non esiste: canon j→i la elimina già)
                continue
            data = json.load(open(path, encoding='utf-8'))
            dd = data.setdefault('dict', {})
            changed = False
            for k, v in entries.items():
                if k not in dd:
                    dd[k] = v; changed = True; injected += 1
            if changed:
                data.setdefault('meta', {})['lemmas_count'] = len(dd)
                json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        top_unres = sorted(unresolved.items(), key=lambda x: -x[1])[:30]
        report[lang] = (len(missing), injected, len(unresolved))
        print(f'{lang}: mancanti {len(missing)} · restaurati dal backup {injected} · irrisolti {len(unresolved)}')
        print('  irrisolti top:', ', '.join(f'{l}({n})' for l, n in top_unres))
        json.dump(unresolved, open(f'_build/_unresolved_{lang}.json', 'w', encoding='utf-8'), ensure_ascii=False)
    return report

if __name__ == '__main__':
    main()
