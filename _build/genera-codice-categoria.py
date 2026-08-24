# -*- coding: utf-8 -*-
"""Il codice di categoria degli Iperappunti sui pulsanti dell'analisi.
Le tinte si leggono dal MOTORE della skill (assets/genera-iperappunto.js), non da
una lista ricopiata: se il motore cambia, si rigenera con `python
_build/genera-codice-categoria.py`. ATTENZIONE: il generatore presuppone che i
blocchi generati NON siano gia' nel foglio e nel translator (asserisce): per
rigenerare, prima si tolgono i blocchi vecchi (cerca `--cat-nominativo` nel
foglio condiviso e `IL CODICE DI CATEGORIA` + le regole vestite della porta nel
translator), poi si lancia."""
import io, re, os

MOTORE = r'C:\Users\fasci\Downloads\Leonardo-Claude\01 - Skill e Strumenti\01.01 Skill Sartoriali\iperappunti\assets\genera-iperappunto.js'
R = r'C:\Users\fasci\Downloads\Leonardo-Claude\04 - Prodotti Digitali\04.01 Dizionario'
m = io.open(MOTORE, encoding='utf-8').read()

# ── 1 · leggo FLESSIVA dal motore ────────────────────────────────────────
blocco = m[m.index('const FLESSIVA = {'):]
blocco = blocco[:blocco.index('\n};') + 3]
flessiva = {}
for cat, corpo in re.findall(r"'(\w+)':\s*\{\s*v:\s*\{([^}]*)\}", blocco):
    for val, hexv in re.findall(r"'([^']+)':\s*'([0-9A-Fa-f]{6})'", corpo):
        flessiva.setdefault(cat, {})[val] = hexv.upper()
assert flessiva['caso']['nominativo'] == '003153', flessiva.get('caso')
assert flessiva['finitezza']['non finita'] == 'D62828'

# ── 2 · la corrispondenza etichetta Poetrify → valore del codice ─────────
# Solo le categorie «elaborate finora» dalla skill. Persona, coniugazione,
# declinazione, classe: nessun colore — la spina nera basta.
MAPPA = {
  # caso
  'Nominativo': ('caso', 'nominativo'), 'Genitivo': ('caso', 'genitivo'), 'Dativo': ('caso', 'dativo'),
  'Accusativo': ('caso', 'accusativo'), 'Vocativo': ('caso', 'vocativo'), 'Ablativo': ('caso', 'ablativo'),
  # genere · numero · grado
  'Maschile': ('genere', 'maschile'), 'Femminile': ('genere', 'femminile'), 'Neutro': ('genere', 'neutro'),
  'Singolare': ('numero', 'singolare'), 'Plurale': ('numero', 'plurale'), 'Duale': ('numero', 'duale'),
  'Positivo': ('grado', 'positivo'), 'Comparativo': ('grado', 'comparativo'), 'Superlativo': ('grado', 'superlativo'),
  # tempo: il codice conosce tre valori — presente, passato, futuro — e i tempi
  # del paradigma vi si riconducono; la tinta dice «quando», non «quale».
  'Presente': ('tempo', 'presente'),
  'Imperfetto': ('tempo', 'passato'), 'Perfetto': ('tempo', 'passato'), 'Piuccheperfetto': ('tempo', 'passato'), 'Aoristo': ('tempo', 'passato'),
  'Futuro': ('tempo', 'futuro'), 'Futuro semplice': ('tempo', 'futuro'), 'Futuro anteriore': ('tempo', 'futuro'),
  # diatesi
  'Attiva': ('diatesi', 'attiva'), 'Passiva': ('diatesi', 'passiva'),
  'Media': ('diatesi', 'media'), 'Medio-passiva': ('diatesi', 'medio-passiva'),
  'Deponente': ('diatesi', 'deponente'), 'Semideponente': ('diatesi', 'deponente'),
  # modo, finito e non
  'Indicativo': ('modo', 'indicativo'), 'Congiuntivo': ('modo', 'congiuntivo'),
  'Ottativo': ('modo', 'ottativo'), 'Imperativo': ('modo', 'imperativo'),
  'Infinito': ('modo', 'infinito'), 'Participio': ('modo', 'participio'), 'Gerundio': ('modo', 'gerundio'),
  'Gerundivo': ('modo', 'gerundivo'), 'Supino': ('modo', 'supino'),
  'Forma finita': ('finitezza', 'finita'),
}

def lum(h):
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
def contrasto(a, b):
    la, lb = lum(a), lum(b); hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)
def inchiostro(h):
    """il testo sopra la campitura lo decide il contrasto misurato"""
    return 'FFFFFF' if contrasto('FFFFFF', h) >= contrasto('1A1A1A', h) else '1A1A1A'

# ── 3 · i token nel foglio condiviso ─────────────────────────────────────
slug = lambda s: s.replace(' ', '-')
tok = []
for cat in ('caso', 'genere', 'numero', 'grado', 'tempo', 'diatesi', 'modo', 'finitezza'):
    for val, hexv in flessiva[cat].items():
        if cat == 'caso' and val in ('locativo', 'strumentale'): continue
        if cat == 'finitezza' and val not in ('finita', 'non finita'): continue
        tok.append('  --cat-%s: #%s;' % (slug(val), hexv))
# dedup mantenendo l'ordine (indicativo compare in modo e finitezza)
visti, tok2 = set(), []
for t in tok:
    k = t.split(':')[0]
    if k in visti: continue
    visti.add(k); tok2.append(t)
blocco_tok = """
/* ═══════════════════════════════════════════════════════════════════════
   IL CODICE DI CATEGORIA · dalla collana degli Iperappunti
   ───────────────────────────────────────────────────────────────────────
   Le tinte sono i pigmenti storici nominati dal docente e dichiarati nel
   motore della skill (assets/genera-iperappunto.js, FLESSIVA): blu di Prussia
   il nominativo, porpora il genitivo, giallo di Napoli il dativo, giallo
   indiano l'accusativo, verde di Scheele il vocativo, bruno di mummia
   l'ablativo; oltremare il singolare, cinabro il plurale, malachite il duale;
   orpimento il neutro. Il codice attraversa l'ecosistema: le parti del
   discorso vanno dal dizionario alla dispensa (.pos-*), le categorie flessive
   tornano dalla dispensa al translator. Generato dal motore, non ricopiato:
   se il motore cambia, si rigenera (scratchpad/codice-categoria.py).
   Persona, coniugazione, declinazione e classe NON hanno colore: la spina
   nera basta, e un colore che non serve toglie forza a quelli che servono.
   ═══════════════════════════════════════════════════════════════════════ */
:root {
%s
}
""" % '\n'.join(tok2)

S = os.path.join(R, 'shared', 'poetrify-tokens.css')
css = io.open(S, encoding='utf-8').read()
assert '--cat-nominativo' not in css
css = css.rstrip('\n') + '\n' + blocco_tok
io.open(S, 'w', encoding='utf-8', newline='').write(css)

# ── 4 · le regole sui pulsanti, nel translator ───────────────────────────
selettori = ['.seg-btn[data-v="%s"]' % et for et in MAPPA]
per_valore = []
for et, (cat, val) in MAPPA.items():
    hexv = flessiva[cat][val]
    per_valore.append('.seg-btn[data-v="%s"] { --cat: var(--cat-%s); --cat-ink: #%s; }' % (et, slug(val), inchiostro(hexv)))

regole = """
/* ═══════════════════════════════════════════════════════════════════════
   I PULSANTI DELL'ANALISI PORTANO IL CODICE DI CATEGORIA della collana.
   Tre stati: a riposo, la campitura tenue del pigmento e il testo d'inchiostro
   (nessun pigmento regge da solo come testo: il giallo di Napoli su carta
   misura 1,4); scelto, il pigmento pieno e sopra il testo che il contrasto
   misurato decide, bianco o nero; al passaggio, il bordo pieno. Le regole
   sono generate dal motore degli Iperappunti (scratchpad/codice-categoria.py)
   e accoppiate per ETICHETTA del valore (data-v), cosi' valgono ovunque una
   pastiglia nasca da una tendina: voce del token, barra, pannello del verbo,
   cassetto. I tempi del paradigma si riconducono ai tre del codice — presente,
   passato, futuro — e semideponente sta con deponente.
   ═══════════════════════════════════════════════════════════════════════ */
%s {
  background: color-mix(in srgb, var(--cat) 14%%, var(--paper));
  border-color: color-mix(in srgb, var(--cat) 55%%, transparent);
  color: var(--ink);
}
%s { border-color: var(--cat); color: var(--ink); }
%s { background: var(--cat); border-color: var(--cat); color: var(--cat-ink); }
:root[data-theme="dark"] body :is(%s) { border-color: color-mix(in srgb, var(--cat) 70%%, #fff); }
%s

/* LA PORTA E IL SELETTORE DELLA FORMA vestono la finitezza del codice: verde il
   finito, rosso il non finito, come nelle tavole della collana. */
.schel-vq-forma-btn, .schel-vq-porta-btn {
  background: color-mix(in srgb, var(--cat-finita) 14%%, var(--paper));
  border-color: color-mix(in srgb, var(--cat-finita) 55%%, transparent);
  color: var(--ink);
}
.schel-vq-forma-btn.nf, .schel-vq-porta-btn.nf {
  background: color-mix(in srgb, var(--cat-non-finita) 14%%, var(--paper));
  border-color: color-mix(in srgb, var(--cat-non-finita) 55%%, transparent);
}
.schel-vq-forma-btn:hover, .schel-vq-porta-btn:hover { border-color: var(--cat-finita); }
.schel-vq-forma-btn.nf:hover, .schel-vq-porta-btn.nf:hover { border-color: var(--cat-non-finita); }
.schel-vq-forma-btn.active { background: var(--cat-finita); border-color: var(--cat-finita); color: #fff; }
.schel-vq-forma-btn.active.nf { background: var(--cat-non-finita); border-color: var(--cat-non-finita); color: #fff; }
.schel-vq-porta-btn .svp-t, .schel-vq-porta-btn.nf .svp-t { color: var(--ink); }
:root[data-theme="dark"] body .schel-vq-forma-btn { background: color-mix(in srgb, var(--cat-finita) 14%%, var(--paper)); }
:root[data-theme="dark"] body .schel-vq-forma-btn.nf { background: color-mix(in srgb, var(--cat-non-finita) 14%%, var(--paper)); }
:root[data-theme="dark"] body .schel-vq-forma-btn.active { background: var(--cat-finita); color: #fff; }
:root[data-theme="dark"] body .schel-vq-forma-btn.active.nf { background: var(--cat-non-finita); color: #fff; }
""" % (',\n'.join(selettori),
       ',\n'.join(s + ':hover' for s in selettori),
       ',\n'.join(s + '.on' for s in selettori),
       ', '.join(selettori),
       '\n'.join(per_valore))

T = os.path.join(R, 'translator.html')
t = io.open(T, encoding='utf-8').read()
def sub(old, new, n=1):
    global t
    assert t.count(old) == n, 'ATTESE %d, TROVATE %d: %r' % (n, t.count(old), old[:80])
    t = t.replace(old, new)

# le regole vecchie del non finito (terracotta) e del finito (ruolo) lasciano il posto
sub("""/* IL NON FINITO ha un colore suo, e non e' un ruolo: e' il rame con cui il token
   non finito si distingue dal ciliegia del finito in anteprima
   (`.scheletro-verb-nonfin`). Dichiarato qui una volta sola, con il verso del
   buio, invece che scritto a mano in tre varianti. */
.schel-vq-row { --nonfin-text: #8a4318; --nonfin-border: rgba(160,78,28,0.72); --nonfin-strong: rgba(160,78,28,0.92); }
:root[data-theme="dark"] body .schel-vq-row { --nonfin-text: #E8A27A; }
""", "")
sub(""".schel-vq-porta-btn.nf .svp-t { color: var(--nonfin-text); }
.schel-vq-porta-btn.nf:hover { border-color: var(--nonfin-text); }
""", "")
sub(""".schel-vq-forma-btn.nf { border-color: var(--nonfin-border); color: var(--nonfin-text); }
/* L'attivo non finito va DOPO la regola .nf e pesa di piu': prima, a parita' di
   peso, `.nf` veniva dopo e gli lasciava il testo arancio su fondo arancio
   (misurato 1,57:1). */
.schel-vq-forma-btn.active.nf { background: var(--nonfin-strong); border-color: var(--nonfin-strong); color: #fff; }""", "")
sub(""":root[data-theme="dark"] body .schel-vq-forma-btn { background: rgba(255,255,255,0.06); }
/* Quella regola, (0,2,2), batteva anche il pulsante ATTIVO, (0,2,0): nel buio il
   fondo pieno spariva sotto un velo al 6% e restava testo bianco su niente. */
:root[data-theme="dark"] body .schel-vq-forma-btn.active { background: var(--case-strong, var(--ink)); }
:root[data-theme="dark"] body .schel-vq-forma-btn.active.nf { background: var(--nonfin-strong); color: #fff; }""", "")
# i vecchi colori di ruolo sul selettore della forma
sub("""/* Il colore viene dal RUOLO (la riga porta `.case-verbo`), non da un rosso
   scritto a mano: cosi' e' lo stesso del cassetto, dello stemma e dell'ordo. */
.schel-vq-forma-btn {
  appearance: none; cursor: pointer; font-family: var(--font-ui); font-size: 13px; font-weight: 700;
  padding: 8px 16px; min-height: 38px; border-radius: 999px; border: 1.5px solid var(--case-border, var(--rule));
  background: var(--paper); color: var(--case-text, var(--ink)); transition: all 0.15s ease;
}
.schel-vq-forma-btn:hover { border-color: var(--case-strong, var(--ink)); }
.schel-vq-forma-btn.active { background: var(--case-strong, var(--ink)); border-color: var(--case-strong, var(--ink)); color: #fff; }""",
"""/* Il colore del selettore della forma e' la FINITEZZA del codice di categoria
   (regole piu' sotto, generate dal motore degli Iperappunti). */
.schel-vq-forma-btn {
  appearance: none; cursor: pointer; font-family: var(--font-ui); font-size: 13px; font-weight: 700;
  padding: 8px 16px; min-height: 38px; border-radius: 999px; border: 1.5px solid var(--rule);
  background: var(--paper); color: var(--ink); transition: all 0.15s ease;
}""")
sub(""".schel-vq-porta-btn:hover { border-color: var(--case-strong, var(--ink)); }
.schel-vq-porta-btn:focus-visible { outline: 2px solid var(--lang-accent); outline-offset: 2px; }
.schel-vq-porta-btn .svp-t { font-family: var(--font-ui); font-size: 15px; font-weight: 700; color: var(--case-text, var(--ink)); }""",
""".schel-vq-porta-btn:focus-visible { outline: 2px solid var(--lang-accent); outline-offset: 2px; }
.schel-vq-porta-btn .svp-t { font-family: var(--font-ui); font-size: 15px; font-weight: 700; color: var(--ink); }""")

# le regole nuove, in coda al blocco della porta (prima della tastiera)
sub("""/* LA TASTIERA CHE COMPILA · solo dove c'e' una tastiera. I numerini compaiono""",
    regole + """
/* LA TASTIERA CHE COMPILA · solo dove c'e' una tastiera. I numerini compaiono""")

io.open(T, 'w', encoding='utf-8', newline='').write(t)

# ── 5 · la versione del foglio condiviso, su tutte e sei le superfici ────
n = 0
for f in ('app.html', 'lingua.html', 'profilo.html', 'dictionary.html', 'corpus.html', 'translator.html'):
    P = os.path.join(R, f); c = io.open(P, encoding='utf-8').read()
    c2 = c.replace('poetrify-tokens.css?v=2026-08-20', 'poetrify-tokens.css?v=2026-08-23')
    assert c2 != c, f
    io.open(P, 'w', encoding='utf-8', newline='').write(c2); n += 1

print('token: %d · regole per valore: %d · superfici riversionate: %d' % (len(tok2), len(per_valore), n))
print('inchiostro sulle campiture:', {et: inchiostro(flessiva[c][v]) for et, (c, v) in MAPPA.items() if inchiostro(flessiva[c][v]) == '1A1A1A'})
