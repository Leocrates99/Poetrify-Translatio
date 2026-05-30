# -*- coding: utf-8 -*-
"""Extract paradigm builder functions verbatim from translator.html into a list,
then report identifiers that are *called* but not defined among the extracted
functions and are not JS builtins — i.e. external helper dependencies to pull in.
"""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')

SRC = open(r'C:\Users\fasci\Downloads\poetrify\translator.html', encoding='utf-8').read()
lines = SRC.split('\n')

# 1-based start lines of the target functions (from grep)
FUNCS = [
    'parseLatinLemma', 'buildNounParadigm', 'buildAdjParadigm',
    'buildVerbParadigm', 'buildIrregularVerbParadigm',
    'parseGreekLemma', 'buildGreekNounParadigm', 'buildGreekAdjParadigm',
    'buildGreekVerbParadigm', 'buildGreekIrregularParadigm',
]

def find_func_start(name):
    pat = re.compile(r'^\s*function\s+' + re.escape(name) + r'\s*\(')
    for i, ln in enumerate(lines):
        if pat.match(ln):
            return i
    return None

def extract_from(start_idx):
    """Brace-match a `function ... { ... }` starting at line start_idx (0-based)."""
    # find first '{'
    text = '\n'.join(lines[start_idx:])
    # walk char by char respecting strings/templates/comments
    depth = 0
    started = False
    instr = None; esc = False; mode = None
    i = 0; n = len(text)
    while i < n:
        c = text[i]; nxt = text[i+1] if i+1 < n else ''
        if instr:
            if esc: esc = False
            elif c == '\\': esc = True
            elif instr == 'tmpl' and c == '`': instr = None
            elif instr in ('"', "'") and c == instr: instr = None
            i += 1; continue
        if mode == 'line':
            if c == '\n': mode = None
            i += 1; continue
        if mode == 'block':
            if c == '*' and nxt == '/': mode = None; i += 2; continue
            i += 1; continue
        if c == '/' and nxt == '/': mode = 'line'; i += 2; continue
        if c == '/' and nxt == '*': mode = 'block'; i += 2; continue
        if c in ('"', "'"): instr = c; i += 1; continue
        if c == '`': instr = 'tmpl'; i += 1; continue
        if c == '{':
            depth += 1; started = True
        elif c == '}':
            depth -= 1
            if started and depth == 0:
                return text[:i+1]
        i += 1
    return None

bodies = {}
for name in FUNCS:
    s = find_func_start(name)
    if s is None:
        print(f'!! NOT FOUND: {name}')
        continue
    body = extract_from(s)
    if body is None:
        print(f'!! BRACE MATCH FAILED: {name}')
        continue
    bodies[name] = body
    print(f'  {name:28} start line {s+1}  ({body.count(chr(10))+1} lines)')

# Greek accent/contraction helper block (verbatim) — lines 12949..13252 (1-based)
HELPER_START, HELPER_END = 12949, 13252
helper_block = '\n'.join(lines[HELPER_START-1:HELPER_END])

# ── WRITE THE MODULE ──────────────────────────────────────────────────────
if '--write' in sys.argv:
    header = '''/**
 * @module engine/paradigm
 * @description Costruttori di paradigmi morfologici classici (declinazioni e
 *   coniugazioni) per latino e greco antico. Le funzioni `parse*Lemma` e
 *   `build*Paradigm` sono ESTRATTE VERBATIM dal translator (poetrify, monolite
 *   translator.html) per riuso nel dizionario, senza rischio di trascrizione.
 *   Vedi _build/extract_paradigm.py per la rigenerazione.
 *
 *   Sopra i builder ci sono gli helper greci (accentazione recessiva,
 *   contrazioni vocaliche, augmento/raddoppiamento) di cui i builder greci
 *   hanno bisogno — anch'essi estratti verbatim.
 *
 *   In coda: il SINTETIZZATORE di citazione (ricava la forma-citazione che i
 *   builder si aspettano a partire dal lemma nudo + definizione del dizionario)
 *   e il RENDERER che trasforma il paradigma in tabelle HTML scolastiche, più
 *   la facciata pubblica `buildClassicalParadigm()` / `renderClassicalParadigm()`.
 *
 *   NB: tutte le funzioni estratte sono pure (nessuna dipendenza dal DOM o
 *   dallo stato globale del translator).
 */

/* ════════════════════════════════════════════════════════════════════════════
   HELPER GRECI (verbatim dal translator) — accenti, contrazioni, augmento
   ════════════════════════════════════════════════════════════════════════════ */
'''
    out = [header, helper_block, '']
    out.append('/* ════════════════════════════════════════════════════════════════════════════\n'
               '   BUILDER LATINI + GRECI (verbatim dal translator)\n'
               '   ════════════════════════════════════════════════════════════════════════════ */')
    for name in FUNCS:
        if name in bodies:
            out.append(bodies[name])
            out.append('')
    module_src = '\n'.join(out)
    dest = r'C:\Users\fasci\Downloads\poetrify\modules\engine\paradigm.js'
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(module_src)
    print(f'\nWROTE {dest}  ({module_src.count(chr(10))+1} lines, {len(module_src)} chars)')

# Concatenate and find external call dependencies
combined = helper_block + '\n\n' + '\n\n'.join(bodies.values())
defined = set(FUNCS)
# function calls: identifier followed by '('
calls = set(re.findall(r'\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(', combined))
JS_BUILTINS = {
    'if','for','while','switch','catch','function','return','typeof','match','replace',
    'split','map','join','filter','slice','substring','test','exec','push','startsWith',
    'endsWith','includes','toLowerCase','toUpperCase','trim','normalize','charAt','concat',
    'Object','Array','String','Number','Boolean','Set','Map','RegExp','Math','JSON',
    'keys','values','entries','assign','from','isArray','some','every','find','indexOf',
    'forEach','reduce','sort','reverse','repeat','padStart','padEnd','flat','flatMap',
    'parseInt','parseFloat','isNaN','String','Array','of','hasOwnProperty','call','apply',
}
ext = sorted(c for c in calls if c not in defined and c not in JS_BUILTINS)
print('\nExternal call-like identifiers (candidates for external helpers):')
for e in ext:
    print('   ', e)

# total size
print(f'\nTOTAL extracted: {combined.count(chr(10))+1} lines, {len(combined)} chars')
