# -*- coding: utf-8 -*-
"""Conta le graffe { } SOLO nel codice JS, tokenizzando correttamente stringhe,
template literal con annidamento ${...}, commenti e regex. Più affidabile di
balance.py (che non gestisce l'annidamento dei template)."""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

def extract_classic_script(html):
    # prende lo <script> classico più grande (non module, non src)
    best = ''
    for m in re.finditer(r'<script([^>]*)>([\s\S]*?)</script>', html):
        attrs, code = m.group(1), m.group(2)
        if 'src=' in attrs: continue
        if re.search(r'type\s*=\s*["\']module', attrs): continue
        if len(code) > len(best): best = code
    return best

def brace_net(code):
    i, n = 0, len(code)
    # stack di contesti: 'code', 'tmpl'. Le {} si contano solo in 'code'.
    ctx = ['code']
    net = 0
    prev_sig = ''   # ultimo carattere significativo (per distinguere regex da divisione)
    while i < n:
        c = code[i]
        cur = ctx[-1]
        nxt = code[i+1] if i+1 < n else ''
        if cur == 'code':
            # commenti
            if c == '/' and nxt == '/':
                j = code.find('\n', i); i = n if j < 0 else j; continue
            if c == '/' and nxt == '*':
                j = code.find('*/', i+2); i = n if j < 0 else j+2; continue
            # regex literal: '/' dopo un token che NON è valore
            if c == '/':
                if prev_sig in ('', '(', ',', '=', ':', '[', '{', '}', ';', '!', '&', '|', '?', '+', '-', '*', '%', '<', '>', '~', '^', 'r'):
                    # 'r' approssima return/typeof etc.; consuma regex
                    j = i+1; incls = False
                    while j < n:
                        cj = code[j]
                        if cj == '\\': j += 2; continue
                        if cj == '[': incls = True
                        elif cj == ']': incls = False
                        elif cj == '/' and not incls: break
                        elif cj == '\n': break
                        j += 1
                    i = j+1; prev_sig = '/'; continue
            # stringhe
            if c == '"' or c == "'":
                j = i+1
                while j < n:
                    if code[j] == '\\': j += 2; continue
                    if code[j] == c: break
                    j += 1
                i = j+1; prev_sig = '"'; continue
            if c == '`':
                ctx.append('tmpl'); i += 1; continue
            if c == '{':
                net += 1; prev_sig = '{'; i += 1; continue
            if c == '}':
                # chiusura di un ${...} dentro un template?
                if len(ctx) > 1 and ctx[-2] == 'tmpl' and getattr(brace_net, '_expr', None):
                    pass
                net -= 1; prev_sig = '}'; i += 1; continue
            if not c.isspace():
                prev_sig = c
            i += 1; continue
        else:  # cur == 'tmpl'
            if c == '\\': i += 2; continue
            if c == '`':
                ctx.pop(); i += 1; prev_sig = '`'; continue
            if c == '$' and nxt == '{':
                ctx.append('code'); i += 2; continue
            i += 1; continue
    return net

def expr_aware_net(code):
    """Versione corretta dell'annidamento ${...}: la } che chiude un'espressione
    di template NON conta come graffa di codice."""
    i, n = 0, len(code)
    ctx = ['code']        # 'code' | 'tmpl' | 'expr'
    net = 0
    prev_sig = ''
    while i < n:
        c = code[i]; cur = ctx[-1]; nxt = code[i+1] if i+1 < n else ''
        if cur in ('code', 'expr'):
            if c == '/' and nxt == '/':
                j = code.find('\n', i); i = n if j < 0 else j; continue
            if c == '/' and nxt == '*':
                j = code.find('*/', i+2); i = n if j < 0 else j+2; continue
            if c == '/' and prev_sig in ('', '(', ',', '=', ':', '[', '{', '}', ';', '!', '&', '|', '?', '+', '-', '*', '%', '<', '>', '~', '^', '/'):
                j = i+1; incls = False
                while j < n:
                    cj = code[j]
                    if cj == '\\': j += 2; continue
                    if cj == '[': incls = True
                    elif cj == ']': incls = False
                    elif cj == '/' and not incls: break
                    elif cj == '\n': break
                    j += 1
                i = j+1; prev_sig = '/'; continue
            if c in '"\'':
                j = i+1
                while j < n:
                    if code[j] == '\\': j += 2; continue
                    if code[j] == c: break
                    j += 1
                i = j+1; prev_sig = '"'; continue
            if c == '`':
                ctx.append('tmpl'); i += 1; continue
            if c == '{':
                net += 1; prev_sig = '{'; i += 1; continue
            if c == '}':
                if cur == 'expr':
                    ctx.pop()        # chiude ${...}, torna a tmpl, NON conta
                    prev_sig = '}'; i += 1; continue
                net -= 1; prev_sig = '}'; i += 1; continue
            if not c.isspace(): prev_sig = c
            i += 1; continue
        else:  # tmpl
            if c == '\\': i += 2; continue
            if c == '`': ctx.pop(); i += 1; prev_sig = '`'; continue
            if c == '$' and nxt == '{':
                ctx.append('expr'); i += 2; continue
            i += 1; continue
    return net

for path in sys.argv[1:]:
    html = open(path, encoding='utf-8').read()
    code = extract_classic_script(html)
    print(f'{path}: classic script {len(code)} chars · brace net (expr-aware) = {expr_aware_net(code)}')
