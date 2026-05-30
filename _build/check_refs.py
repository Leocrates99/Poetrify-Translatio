# -*- coding: utf-8 -*-
"""Find identifiers CALLED as functions in a JS module that are not defined
anywhere in it (top-level function/const, OR local const/let/param closures)
and are not JS builtins/method names. Heuristic but catches missing helpers."""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')
path = sys.argv[1]
src = open(path, encoding='utf-8').read()

# strip comments and strings crudely so we don't pick up words in them
def strip(src):
    out = []; i = 0; n = len(src); instr=None; esc=False; mode=None
    while i < n:
        c = src[i]; nx = src[i+1] if i+1<n else ''
        if instr:
            if esc: esc=False
            elif c=='\\': esc=True
            elif instr=='tmpl' and c=='`': instr=None; out.append(' ')
            elif instr in ('"',"'") and c==instr: instr=None
            i+=1; continue
        if mode=='line':
            if c=='\n': mode=None; out.append('\n')
            i+=1; continue
        if mode=='block':
            if c=='*' and nx=='/': mode=None; i+=2
            else: i+=1
            continue
        if c=='/' and nx=='/': mode='line'; i+=2; continue
        if c=='/' and nx=='*': mode='block'; i+=2; continue
        if c in ('"',"'"): instr=c; out.append(' '); i+=1; continue
        if c=='`': instr='tmpl'; out.append(' '); i+=1; continue
        out.append(c); i+=1
    return ''.join(out)

code = strip(src)

defined = set()
defined |= set(re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)', code))
defined |= set(re.findall(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=', code))
# arrow/function params (rough): capture (a, b) => and function(a,b)
for m in re.findall(r'\(([^()]*)\)\s*=>', code):
    for p in re.split(r'[,]', m):
        p = p.strip().split('=')[0].strip()
        if re.match(r'^[A-Za-z_$][\w$]*$', p): defined.add(p)
# destructured const { a, b } =
for m in re.findall(r'\b(?:const|let|var)\s*\{([^}]*)\}\s*=', code):
    for p in re.split(r'[,]', m):
        p = p.strip().split(':')[-1].strip()
        if re.match(r'^[A-Za-z_$][\w$]*$', p): defined.add(p)

called = set(re.findall(r'([A-Za-z_$][\w$]*)\s*\(', code))

BUILTINS = set('''if for while switch catch return typeof do else new delete void instanceof
match replace replaceAll split map join filter slice splice substring substr test exec push pop shift unshift
startsWith endsWith includes indexOf lastIndexOf toLowerCase toUpperCase trim trimStart trimEnd normalize charAt charCodeAt codePointAt fromCharCode fromCodePoint concat
Object Array String Number Boolean Set Map WeakMap RegExp Math JSON Symbol Promise Date Error isNaN isFinite
keys values entries assign freeze from isArray of getOwnPropertyNames create
some every find findIndex forEach reduce reduceRight sort reverse repeat padStart padEnd flat flatMap fill
parseInt parseFloat hasOwnProperty call apply bind localeCompare toFixed toString valueOf
max min abs floor ceil round pow sqrt random sign trunc
add has get delete clear append'''.split())

missing = sorted(c for c in called if c not in defined and c not in BUILTINS)
print(f'{path}')
print('Possibly-undefined called identifiers:')
if not missing:
    print('   (none)')
for m in missing:
    print('   ', m)
