# -*- coding: utf-8 -*-
"""I RUOLI SINTATTICI (.case-*) MIGRANO AI PIGMENTI degli Iperappunti.

Le tinte si leggono dal motore della skill (FLESSIVA['caso']) e dal foglio
condiviso (.pos-verbo, la tinta del verbo che il dizionario gia' porta); i
derivati si CALCOLANO, non si scelgono a occhio:
  · --case-strong      pigmento abbassato di valore finche' regge il bianco
                       come barra (>=3:1) — e' cio' che la skill stessa fa per
                       la stampa; sui pigmenti gia' scuri resta il pigmento
  · --case-strong-ink  il testo sopra la campitura piena, bianco o nero per
                       contrasto misurato
  · --case-text        pigmento abbassato finche' e' testo su carta (>=4.6)
  · --case-bg          il pigmento VIVO in velatura, con alfa tarata sulla
                       chiarezza (i gialli vogliono piu' corpo)
  · --case-border      lo strong in velatura .62
  · verso del buio     text e strong si schiariscono finche' reggono la carta
                       scura (>=6.5 il testo, >=3:1 la barra)

Idempotente: i blocchi generati stanno fra marcatori e si riscrivono.
Uso: python _build/genera-ruoli-dai-pigmenti.py
"""
import io, os, re, sys

QUI = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(QUI)
MOTORE = r'C:\Users\fasci\Downloads\Leonardo-Claude\01 - Skill e Strumenti\01.01 Skill Sartoriali\iperappunti\assets\genera-iperappunto.js'

# ── pigmenti dal motore ──────────────────────────────────────────────────
m = io.open(MOTORE, encoding='utf-8').read()
blocco = m[m.index("'caso':"):]
blocco = blocco[:blocco.index('} }') + 3]
caso = dict(re.findall(r"'([a-z-]+)':\s*'([0-9A-Fa-f]{6})'", blocco))
assert caso['nominativo'] == '003153' and caso['dativo'] == 'FADA5E', caso

# il verbo non e' un caso: porta la tinta della sua parte del discorso, quella
# che il dizionario mostra gia' (.pos-verbo nel foglio condiviso)
tok = io.open(os.path.join(R, 'shared', 'poetrify-tokens.css'), encoding='utf-8').read()
verbo_chiaro = re.search(r"^\.pos-verbo\s*\{\s*--pos-c:\s*#([0-9A-Fa-f]{6})", tok, re.M).group(1)
verbo_scuro = re.search(r'data-theme="dark"\]\s*\.pos-verbo\s*\{\s*--pos-c:\s*#([0-9A-Fa-f]{6})', tok).group(1)

PIGMENTO = {
    'nominativo': caso['nominativo'], 'genitivo': caso['genitivo'], 'dativo': caso['dativo'],
    'accusativo': caso['accusativo'], 'vocativo': caso['vocativo'], 'ablativo': caso['ablativo'],
    'locativo': caso['locativo'], 'verbo': verbo_chiaro,
}
NOME = {
    'nominativo': 'blu di Prussia', 'genitivo': 'porpora', 'dativo': 'giallo di Napoli',
    'accusativo': 'giallo indiano', 'vocativo': 'verde di Scheele', 'ablativo': 'bruno di mummia',
    'locativo': 'ardesia (dal motore)', 'verbo': 'il rosso del verbo, dal dizionario (.pos-verbo)',
}
ALFA_BG = {  # il pigmento vivo in velatura: i chiari vogliono piu' corpo
    'nominativo': 0.13, 'genitivo': 0.13, 'dativo': 0.35, 'accusativo': 0.22,
    'vocativo': 0.14, 'ablativo': 0.14, 'locativo': 0.12, 'verbo': 0.12,
}
CARTA_CHIARA, CARTA_SCURA = 'FCFBF8', '1C1F24'

def rgb(h): return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def hexa(t): return '%02X%02X%02X' % t
def lum(h):
    f = lambda c: c/12.92 if (c := c/255) <= 0.03928 else ((c+0.055)/1.055)**2.4
    r, g, b = rgb(h); return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b)
def cx(a, b):
    la, lb = lum(a), lum(b); hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)
def scala(h, s):  # verso il nero (s<1) mantenendo la tinta
    return hexa(tuple(max(0, min(255, round(c*s))) for c in rgb(h)))
def verso_bianco(h, s):
    return hexa(tuple(round(c + (255-c)*s) for c in rgb(h)))
def abbassa(h, fondo, soglia):
    s = 1.0
    while cx(scala(h, s), fondo) < soglia and s > 0.05: s -= 0.02
    return scala(h, s)
def schiarisci(h, fondo, soglia):
    s = 0.0
    while cx(verso_bianco(h, s), fondo) < soglia and s < 0.95: s += 0.02
    return verso_bianco(h, s)
def inchiostro_su(h):
    return 'FFFFFF' if cx('FFFFFF', h) >= cx('1A1A1A', h) else '1A1A1A'

derivati, prova = {}, []
for k, p in PIGMENTO.items():
    strong = abbassa(p, CARTA_CHIARA, 3.0)
    testo = abbassa(p, CARTA_CHIARA, 4.6)
    ink = inchiostro_su(strong)
    testo_buio = schiarisci(p, CARTA_SCURA, 6.5)
    strong_buio = schiarisci(p, CARTA_SCURA, 3.0)
    ink_buio = inchiostro_su(strong_buio)
    derivati[k] = dict(p=p, strong=strong, ink=ink, testo=testo,
                       testo_buio=testo_buio, strong_buio=strong_buio, ink_buio=ink_buio)
    prova.append('%-11s strong %s (%0.1f, ink %s) · testo %s (%0.1f) · buio testo %s (%0.1f) strong %s (%0.1f)'
                 % (k, strong, cx(strong, CARTA_CHIARA), ink, testo, cx(testo, CARTA_CHIARA),
                    testo_buio, cx(testo_buio, CARTA_SCURA), strong_buio, cx(strong_buio, CARTA_SCURA)))
    assert cx(testo, CARTA_CHIARA) >= 4.5 and cx(testo_buio, CARTA_SCURA) >= 4.5
    assert cx(ink, strong) >= 4.5, (k, ink, strong, cx(ink, strong))

def rgba(h, a): return 'rgba(%d, %d, %d, %.2f)' % (rgb(h) + (a,))

# ── i tre blocchi generati ───────────────────────────────────────────────
def riga_caso(k):
    d = derivati[k]
    return ('.case-%s { --case-strong: #%s; --case-strong-ink: #%s; --case-bg: %s; --case-border: %s; --case-text: #%s; }   /* %s */'
            % (k, d['strong'], d['ink'], rgba(d['p'], ALFA_BG[k]), rgba(d['strong'], 0.62), d['testo'], NOME[k]))
def riga_buio(k):
    d = derivati[k]
    return (':root[data-theme="dark"] .case-%s { --case-text: #%s; --case-strong: #%s; --case-strong-ink: #%s; }'
            % (k, d['testo_buio'], d['strong_buio'], d['ink_buio']))

ORDINE = ['nominativo', 'verbo', 'accusativo', 'dativo', 'ablativo', 'genitivo', 'vocativo', 'locativo']
CSS = """/* ═══ RUOLI DAI PIGMENTI · inizio (generato: _build/genera-ruoli-dai-pigmenti.py) ═══
   I ruoli sintattici vestono i pigmenti storici della collana degli Iperappunti,
   letti dal motore della skill: il nominativo e' blu di Prussia sul token, sul
   pulsante e nella tavola della dispensa — il codice attraversa l'ecosistema.
   `--case-strong` e' il pigmento ABBASSATO DI VALORE finche' regge il bianco come
   barra (i gialli, vivi, non lo reggerebbero); `--case-strong-ink` e' il testo
   sopra la campitura piena, deciso dal contrasto misurato; `--case-bg` tiene il
   pigmento vivo, in velatura. Il verbo non e' un caso: porta la tinta della sua
   parte del discorso, quella del dizionario (.pos-verbo). Il neutro resta grigio:
   e' il ripiego, non un pigmento. */
%s
.case-neutro     { --case-strong: rgba(120, 113, 108, 0.55); --case-strong-ink: #1A1A1A; --case-bg: rgba(120, 113, 108, 0.08); --case-border: rgba(120, 113, 108, 0.32); --case-text: var(--sepia); }

/* IL VERSO DEL BUIO · testo e barra si schiariscono finche' reggono la carta
   scura (misurato: testo >=6.5, barra >=3). La velatura di fondo e il bordo sono
   alfa e reggono da se'. Il neutro usa var(--sepia), che si inverte da se'. */
%s
:root[data-theme="dark"] .case-neutro { --case-strong-ink: #1A1A1A; }
/* ═══ RUOLI DAI PIGMENTI · fine ═══ */""" % ('\n'.join(riga_caso(k) for k in ORDINE),
                                             '\n'.join(riga_buio(k) for k in ORDINE))

def riga_export(k):
    d = derivati[k]
    a = {'dativo': 0.28, 'accusativo': 0.18}.get(k, 0.10)
    return ("  %-11s { bg: '%s', border: '%s', text: '#%s', strong: '#%s' },"
            % (k + ':', rgba(d['p'], a), rgba(d['strong'], 0.70), d['testo'], d['strong']))
EXPORT = """/* ═ RUOLI DAI PIGMENTI · export · inizio (generato: _build/genera-ruoli-dai-pigmenti.py) ═ */
const CASE_EXPORT_PALETTE = {
%s
  neutro:      { bg: 'rgba(120, 113, 108, 0.06)', border: 'rgba(120, 113, 108, 0.45)', text: '#4a4540', strong: 'rgba(120, 113, 108, 0.55)' },
};
/* ═ RUOLI DAI PIGMENTI · export · fine ═ */""" % '\n'.join(riga_export(k) for k in ORDINE)

# ── innesto nel translator ───────────────────────────────────────────────
T = os.path.join(R, 'translator.html')
t = io.open(T, encoding='utf-8').read()

MARC_A = '/* ═══ RUOLI DAI PIGMENTI · inizio'
MARC_Z = '/* ═══ RUOLI DAI PIGMENTI · fine ═══ */'
if MARC_A in t:
    a, z = t.index(MARC_A), t.index(MARC_Z) + len(MARC_Z)
    t = t[:a] + CSS + t[z:]
else:
    # prima corsa: il blocco vecchio (palette distintiva + verso del buio) esce
    a = t.index('/* PALETTE DISTINTIVA')
    z = t.index(":root[data-theme=\"dark\"] .case-locativo   { --case-text: #AEB6C2; }")
    z = t.index('\n', z) + 1
    t = t[:a] + CSS + '\n' + t[z:]

MEX_A = '/* ═ RUOLI DAI PIGMENTI · export · inizio'
MEX_Z = '/* ═ RUOLI DAI PIGMENTI · export · fine ═ */'
if MEX_A in t:
    a, z = t.index(MEX_A), t.index(MEX_Z) + len(MEX_Z)
    t = t[:a] + EXPORT + t[z:]
else:
    a = t.index('const CASE_EXPORT_PALETTE = {')
    z = t.index('};', a) + 2
    t = t[:a] + EXPORT + t[z:]

# ── i consumatori che mettevano bianco fisso sopra lo strong (una volta) ─
t = t.replace("""  background: var(--case-strong, var(--primary)); color: var(--on-primary);
  font-family: var(--font-ui); font-size: 11px; font-weight: 700; flex: 0 0 auto;""",
"""  background: var(--case-strong, var(--primary)); color: var(--case-strong-ink, var(--on-primary));
  font-family: var(--font-ui); font-size: 11px; font-weight: 700; flex: 0 0 auto;""")
t = t.replace("""  background: var(--case-strong, var(--primary)); color: var(--on-primary); opacity: 0.92;""",
"""  background: var(--case-strong, var(--primary)); color: var(--case-strong-ink, var(--on-primary)); opacity: 0.92;""")
t = t.replace(""".schel-confirm-ok { background: var(--case-strong, var(--primary)); color: #fff; }""",
""".schel-confirm-ok { background: var(--case-strong, var(--primary)); color: var(--case-strong-ink, #fff); }""")
# l'occhiello dell'ordo era TESTO nel colore della barra: il testo ha il suo token
t = t.replace("""  color: var(--case-strong, var(--sepia));
}
.ordo-prop-group .ordo-grid""",
"""  color: var(--case-text, var(--sepia));
}
.ordo-prop-group .ordo-grid""")

io.open(T, 'w', encoding='utf-8', newline='').write(t)
print('ruoli migrati ai pigmenti')
for r in prova: print('  ' + r)
