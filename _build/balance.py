# -*- coding: utf-8 -*-
"""Crude JS brace/paren/bracket balance check (ignores strings & comments)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

path = sys.argv[1] if len(sys.argv) > 1 else 'modules/dictionary/index.js'
src = open(path, encoding='utf-8').read()
n = len(src)
b = p = k = 0
instr = None      # '"', "'", or 'tmpl'
esc = False
mode = None       # 'line' or 'block'
i = 0
while i < n:
    c = src[i]
    nxt = src[i+1] if i+1 < n else ''
    if instr:
        if esc:
            esc = False
        elif c == '\\':
            esc = True
        elif instr == 'tmpl' and c == '`':
            instr = None
        elif instr in ('"', "'") and c == instr:
            instr = None
        i += 1
        continue
    if mode == 'line':
        if c == '\n':
            mode = None
        i += 1
        continue
    if mode == 'block':
        if c == '*' and nxt == '/':
            mode = None
            i += 2
            continue
        i += 1
        continue
    if c == '/' and nxt == '/':
        mode = 'line'; i += 2; continue
    if c == '/' and nxt == '*':
        mode = 'block'; i += 2; continue
    if c in ('"', "'"):
        instr = c; i += 1; continue
    if c == '`':
        instr = 'tmpl'; i += 1; continue
    if c == '{': b += 1
    elif c == '}': b -= 1
    elif c == '(': p += 1
    elif c == ')': p -= 1
    elif c == '[': k += 1
    elif c == ']': k -= 1
    i += 1

print(f'{path}')
print(f'  braces   {"OK" if b==0 else "MISMATCH"}  (net {b})')
print(f'  parens   {"OK" if p==0 else "MISMATCH"}  (net {p})')
print(f'  brackets {"OK" if k==0 else "MISMATCH"}  (net {k})')
print(f'  unterminated string/template: {instr}')
print(f'  unterminated comment: {mode}')
