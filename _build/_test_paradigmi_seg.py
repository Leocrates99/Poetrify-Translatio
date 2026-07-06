# -*- coding: utf-8 -*-
"""Gold test dei PARADIGMI SEGMENTATI + cross-validazione con l'indice piatto."""
import sys, json, unicodedata, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '_build')
from gen_paradigms import main

def NG(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if not unicodedata.combining(c))

out = main(write=False)
fail = 0

def cell(lang, lemma, path):
    letter = NG(lemma)[:1]
    node = out[lang][letter][lemma]
    for k in path:
        node = node[k]
    return node

def T(lang, lemma, path, exp_segs, note=''):
    global fail
    try:
        c = cell(lang, lemma, path)
    except Exception as e:
        fail += 1; print(f'FAIL {lemma} {path}: {e}'); return
    got = [(t, r) for t, r in c]
    form = ''.join(t for t, _ in got)
    exp_form = ''.join(t for t, _ in exp_segs)
    ok = (NG(form) == NG(exp_form)) and [r for _, r in got] == [r for _, r in exp_segs]
    disp = ' | '.join(f'{t}:{r}' for t, r in got)
    if ok:
        print(f'OK   {form} = {disp} {note}')
    else:
        fail += 1
        exp_disp = ' | '.join(f'{t}:{r}' for t, r in exp_segs)
        print(f'FAIL {lemma} {path}: {disp} (atteso {exp_disp})')

print('--- LATINO / verbi ---')
T('latin','amo',['verbo','ind','pres','att',2], [('am','t'),('a','v'),('t','d')])
T('latin','amo',['verbo','ind','impf','att',2], [('am','t'),('a','v'),('ba','s'),('t','d')])
T('latin','amo',['verbo','ind','fut','att',5], [('am','t'),('a','v'),('b','s'),('unt','d')])
T('latin','amo',['verbo','cong','impf','att',2], [('am','t'),('a','v'),('re','s'),('t','d')])
T('latin','amo',['verbo','ind','pf','att',2], [('amav','t'),('it','d')])
T('latin','amo',['verbo','cong','ppf','att',2], [('amav','t'),('isse','s'),('t','d')], '(amavisset!)')
T('latin','amo',['verbo','ind','pres','pass',2], [('am','t'),('a','v'),('tur','d')])
T('latin','amo',['verbo','inf','pres_att'], [('am','t'),('a','v'),('re','s')])
T('latin','duco',['verbo','ind','pres','att',2], [('duc','t'),('i','v'),('t','d')])
T('latin','duco',['verbo','ind','fut','att',2], [('duc','t'),('e','s'),('t','d')])
T('latin','duco',['verbo','inf','pres_pass'], [('duc','t'),('i','d')], '(duci)')
T('latin','capio',['verbo','ind','pres','att',5], [('cap','t'),('iu','v'),('nt','d')])
T('latin','capio',['verbo','ind','impf','att',2], [('cap','t'),('i','v'),('eba','s'),('t','d')])
T('latin','audio',['verbo','ind','fut','att',2], [('aud','t'),('i','v'),('e','s'),('t','d')])
T('latin','moneo',['verbo','ind','ppf','att',2], [('monu','t'),('era','s'),('t','d')])
T('latin','conor',['verbo','ind','pres','mp',2], [('con','t'),('a','v'),('tur','d')], '(deponente)')
print('--- LATINO / nomi ---')
T('latin','rosa',['nome','sg','gen'], [('ros','t'),('ae','d')])
T('latin','urbs',['nome','pl','gen'], [('urb','t'),('ium','d')])
T('latin','corpus',['nome','pl','dat'], [('corpor','t'),('ibus','d')])
print('--- GRECO / verbi ---')
T('greek','λύω',['verbo','ind','pres','att',3], [('λύ','t'),('ο','v'),('μεν','d')])
T('greek','λύω',['verbo','ind','impf','att',2], [('ἔ','a'),('λυ','t'),('ε','v')], '(ἔλυε)')
T('greek','λύω',['verbo','ind','fut','att',3], [('λύ','t'),('σ','s'),('ο','v'),('μεν','d')])
T('greek','λύω',['verbo','ind','aor','att',3], [('ἐ','a'),('λύ','t'),('σα','s'),('μεν','d')], '(ἐλύσαμεν)')
T('greek','λύω',['verbo','ind','aorp','pass',0], [('ἐ','a'),('λύ','t'),('θη','s'),('ν','d')], '(ἐλύθην)')
T('greek','λύω',['verbo','ind','pf','att',0], [('λέ','a'),('λυ','t'),('κ','s'),('α','d')], '(λέλυκα)')
T('greek','λύω',['verbo','ind','pfmp','mp',2], [('λέ','a'),('λυ','t'),('ται','d')], '(λέλυται)')
T('greek','τιμάω',['verbo','ind','pres','att',3], [('τιμ','t'),('ῶ','v'),('μεν','d')], '(contrazione)')
T('greek','ποιέω',['verbo','ind','impf','att',0], [('ἐ','a'),('ποι','t'),('ου','v'),('ν','d')], '(ἐποίουν)')
T('greek','λείπω',['verbo','ind','aor','att',2], [('ἔ','a'),('λιπ','t'),('ε','v')], '(ἔλιπε, aor. II)')
T('greek','γίγνομαι',['verbo','ind','aor','mp',2], [('ἐ','a'),('γέν','t'),('ε','v'),('το','d')], '(ἐγένετο)')
T('greek','δίδωμι',['verbo','ind','aor','att',0], [('ἔ','a'),('δω','t'),('κ','s'),('α','d')], '(ἔδωκα)')
T('greek','γράφω',['verbo','ind','pfmp','mp',2], [('γέ','a'),('γραπ','t'),('ται','d')], '(γέγραπται)')
print('--- GRECO / nomi (accento persistente esatto) ---')
def TX(lang, lemma, path, exp_form):
    global fail
    c = cell(lang, lemma, path)
    form = ''.join(t for t, _ in c)
    import unicodedata as U
    if U.normalize('NFC', form) == U.normalize('NFC', exp_form):
        print(f'OK   {form} (accento esatto)')
    else:
        fail += 1; print(f'FAIL {lemma} {path}: {form} (atteso {exp_form})')
TX('greek','θάλασσα',['nome','sg','gen'], 'θαλάσσης')
TX('greek','σῶμα',['nome','pl','dat'], 'σώμασι')
TX('greek','πόλις',['nome','sg','gen'], 'πόλεως')
TX('greek','πόλις',['nome','pl','gen'], 'πόλεων')
T('greek','θάλασσα',['nome','sg','gen'], [('θαλάσσ','t'),('ης','d')])
T('greek','πόλις',['nome','sg','gen'], [('πόλ','t'),('εως','d')])
T('greek','σῶμα',['nome','pl','dat'], [('σώμ','t'),('ασι','d')])

print('--- cross-validazione con l\'indice piatto ---')
def flat_forms(lang, letter):
    try:
        return json.load(open(f'data/{lang}/{letter}.json', encoding='utf-8'))['forms']
    except Exception:
        return {}

def crossval(lang, lemma):
    global fail
    letter = NG(lemma)[:1]
    entry = out[lang][letter][lemma]
    cells = []
    def walk(n):
        if isinstance(n, list) and n and isinstance(n[0], list) and len(n[0]) == 2 and isinstance(n[0][0], str):
            cells.append(n); return
        if isinstance(n, dict):
            for v in n.values(): walk(v)
        elif isinstance(n, list):
            for v in n:
                if v is not None: walk(v)
    walk(entry.get('verbo') or entry.get('nome'))
    shards = {}
    nidx = {}
    miss = 0; tot = 0; missing = []
    for c in cells:
        form = ''.join(t for t, _ in c)
        l0 = NG(form)[:1]
        if l0 not in shards:
            shards[l0] = flat_forms(lang, l0)
            nidx[l0] = {}
            for k in shards[l0]:
                nidx[l0].setdefault(NG(k), k)
        tot += 1
        cands = shards[l0].get(form)
        if not cands:
            k = nidx[l0].get(NG(form))
            cands = shards[l0].get(k) if k else None
        if not cands or not any(NG(x['lemma']) == NG(lemma) for x in cands):
            miss += 1; missing.append(form)
    status = 'OK  ' if miss == 0 else ('WARN' if miss <= max(1, tot // 10) else 'FAIL')
    if status == 'FAIL': fail += 1
    extra = ('  mancanti: ' + ', '.join(missing[:6])) if missing else ''
    print(f'{status} {lemma}: {tot - miss}/{tot} celle presenti nell\'indice piatto{extra}')

for l in ('amo', 'duco', 'rosa', 'urbs'):
    crossval('latin', l)
for l in ('λύω', 'τιμάω', 'θάλασσα', 'πόλις'):
    crossval('greek', l)
print()
print('TUTTO OK' if fail == 0 else f'{fail} FALLITI')
sys.exit(1 if fail else 0)
