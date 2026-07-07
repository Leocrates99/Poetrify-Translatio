# -*- coding: utf-8 -*-
"""Generatore morfologico GRECO · forme flesse + parsing per il corpus Poetrify.

Colma il divario dell'indice greco (13k forme vs 270k latine) con GENERAZIONE
RIGOROSA dai paradigmi:

NOMINALI — classe dedotta dalla definizione LSJ della voce stessa
  («λόγος, ου, ὁ» → 2ª decl. m.): 1ª declinazione (η; ᾱ puro; ᾱ misto; maschili
  -ης/-ας), 2ª (m./f. e neutri), 3ª (temi in consonante con la fonologia del
  dativo plurale: gutturale+σι→ξι, labiale+σι→ψι, dentale/ν cade, -ντ- cade con
  allungamento di compenso; temi in -μα; temi in -ος/-εσ; temi in -ι tipo πόλις).

VERBI — tavola CURATA di parti principali (~120 verbi core): sistema del
  presente (ind. pres. e impf. att. e m.-p., cong., ott., imv., inf., ptc.),
  futuro sigmatico con fonologia del tema (+ futuri contratti dei temi in
  liquida), aoristo 1º sigmatico / 2º tematico / radicale atematico / passivo
  in -θη-/-η-, perfetto attivo e medio-passivo (con assimilazione: λέλειμμαι,
  γέγραψαι, πέπρακται), piuccheperfetto no (v1). Aumento: sillabico ἐ-,
  temporale (α→η, ε→η, ο→ω, αι→ῃ, αυ→ηυ, οι→ῳ), nei composti DOPO il preverbo
  con elisione (ἀπο+ε→ἀπε-, κατα+ε→κατε-, περι/προ/ὑπερ senza elisione).
  Verbi contratti: sistema del presente generato con le tavole di contrazione
  (άω, έω, όω) e accenti propri delle forme contratte.

ACCENTO — legge della recessività per le forme verbali finite (posizione
  esatta; acuto conservativo dove il properispomeno richiederebbe l'analisi
  delle quantità radicali); accento persistente approssimato per i nominali
  (mai oltre i limiti della legge del trisillabismo; gen. pl. 1ª decl. -ῶν).
  Il lookup del motore normalizza i diacritici, quindi la POSIZIONE prudente
  non compromette mai la ricerca; il parsing è sempre esatto.

Idempotente: le forme generate portano candidati {lemma, parsing} e vengono
fuse negli shard senza duplicare (chiave forma+lemma).
"""
import json, os, re, sys, unicodedata, collections
sys.stdout.reconfigure(encoding='utf-8')

def N(s):  # normalizza (NFD senza diacritici, minuscolo)
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if not unicodedata.combining(c))
def NFC(s):
    return unicodedata.normalize('NFC', s)
def strip_acc(s):
    """Toglie accenti/apici MA conserva spiriti e iota sottoscritto."""
    KEEP = {'̓', '̔', 'ͅ'}  # coronide/spirito dolce, aspro, iota sott.
    out = []
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.combining(c) and c not in KEEP: continue
        out.append(c)
    return NFC(''.join(out))

VOWELS = 'αεηιουω'
LONG_V = 'ηω'
DIPHTH = ['αι','ει','οι','υι','αυ','ευ','ου','ηυ']

def syllable_nuclei(word):
    """Posizioni (start,len,long?) dei nuclei vocalici, da sinistra."""
    base = N(word)
    nuclei = []
    i = 0
    while i < len(base):
        two = base[i:i+2]
        if two in DIPHTH:
            nuclei.append((i, 2, True)); i += 2; continue
        if base[i] in VOWELS:
            nuclei.append((i, 1, base[i] in LONG_V)); i += 1; continue
        i += 1
    return nuclei

def accent_at(word, idx_from_end, circum=False):
    """Applica un accento sul nucleo idx_from_end (1=ultima). Conservativo."""
    nfd = unicodedata.normalize('NFD', word)
    # mappa: posizioni dei caratteri vocalici base in nfd
    positions = [j for j, c in enumerate(nfd) if c in VOWELS or c in 'ΑΕΗΙΟΥΩ'.lower()]
    if not positions: return word
    # ricostruisci i nuclei sull'nfd (dittonghi = due vocali adiacenti valide)
    nuc = []
    j = 0
    while j < len(nfd):
        c = nfd[j]
        if c in VOWELS:
            if j + 1 < len(nfd):
                # guarda la prossima vocale base saltando i combining
                k = j + 1
                while k < len(nfd) and unicodedata.combining(nfd[k]): k += 1
                if k < len(nfd) and c + nfd[k] in DIPHTH:
                    nuc.append(k)  # accento sulla seconda vocale del dittongo
                    j = k + 1
                    continue
            nuc.append(j); j += 1
        else:
            j += 1
    if len(nuc) < idx_from_end: idx_from_end = len(nuc)
    if idx_from_end <= 0: return word
    target = nuc[-idx_from_end]
    mark = '͂' if circum else '́'
    # inserisci il segno dopo la vocale e i suoi spiriti
    k = target + 1
    while k < len(nfd) and unicodedata.combining(nfd[k]): k += 1
    return NFC(nfd[:k] + mark + nfd[k:])

OPT_ENDINGS_LONG_AI = ('οι', 'αι')  # in ottativa -οι/-αι finali contano LUNGHE

def recessive(word, opt=False):
    """Accento recessivo (verbi finiti): acuto il più indietro possibile."""
    w = strip_acc(word)
    nuclei = syllable_nuclei(w)
    if not nuclei: return w
    if len(nuclei) == 1: return accent_at(w, 1)
    last = nuclei[-1]
    base = N(w)
    ultima = base[last[0]:last[0]+last[1]]
    ultima_long = last[2]
    if ultima in ('αι', 'οι') and not opt:
        ultima_long = False   # -αι/-οι finali brevi per l'accento (tranne ottativo)
    if ultima_long or len(nuclei) == 2:
        return accent_at(w, 2)
    return accent_at(w, 3)

def persistent(word, lemma_dist, ultima_long):
    """Accento persistente nominale: prova a mantenere la distanza del lemma
    (in sillabe dalla fine), rientrando nei limiti di legge."""
    w = strip_acc(word)
    nuclei = syllable_nuclei(w)
    if not nuclei: return w
    maxdist = 2 if ultima_long else 3
    d = min(lemma_dist, maxdist, len(nuclei))
    if d <= 0: d = 1
    return accent_at(w, d)

def lemma_accent_dist(lemma):
    """Distanza (sillabe dalla fine) dell'accento del lemma. Rispetta i confini
    consonantici: due vocali separate da consonante (es. ο..ι in πόλις) NON
    formano dittongo, quindi contano come due nuclei distinti."""
    nfd = unicodedata.normalize('NFD', lemma)
    marks = {'́', '͂', '̀'}  # acuto, circonflesso, grave
    accented = []   # un bool per nucleo, sinistra → destra
    i, n = 0, len(nfd)
    while i < n:
        c = nfd[i]
        if c.lower() in VOWELS:
            has = False
            j = i + 1
            while j < n and unicodedata.combining(nfd[j]):
                if nfd[j] in marks: has = True
                j += 1
            # dittongo solo se la seconda vocale è ADIACENTE (nessuna consonante)
            if j < n and nfd[j].lower() in VOWELS and (c.lower() + nfd[j].lower()) in DIPHTH:
                j += 1
                while j < n and unicodedata.combining(nfd[j]):
                    if nfd[j] in marks: has = True
                    j += 1
            accented.append(has)
            i = j
        else:
            i += 1
    for idx in range(len(accented)):
        if accented[idx]:
            return len(accented) - idx
    return 2

# ───────────────────────── NOMINALI ─────────────────────────
def decl2(stem, neuter=False):
    if neuter:
        return { 'ον': 'nom./acc./voc. sg.', 'ου': 'gen. sg.', 'ῳ': 'dat. sg.',
                 'α': 'nom./acc./voc. pl.', 'ων': 'gen. pl.', 'οις': 'dat. pl.' }
    return { 'ος': 'nom. sg.', 'ου': 'gen. sg.', 'ῳ': 'dat. sg.', 'ον': 'acc. sg.', 'ε': 'voc. sg.',
             'οι': 'nom. pl.', 'ων': 'gen. pl.', 'οις': 'dat. pl.', 'ους': 'acc. pl.' }

def decl1_eta(stem):
    return { 'η': 'nom. sg.', 'ης': 'gen. sg.', 'ῃ': 'dat. sg.', 'ην': 'acc. sg.',
             'αι': 'nom. pl.', 'ων': 'gen. pl. (-ῶν)', 'αις': 'dat. pl.', 'ας': 'acc. pl.' }

def decl1_alpha(stem, purum=True):
    if purum:
        return { 'α': 'nom. sg.', 'ας': 'gen. sg.', 'ᾳ': 'dat. sg.', 'αν': 'acc. sg.',
                 'αι': 'nom. pl.', 'ων': 'gen. pl. (-ῶν)', 'αις': 'dat. pl.' }
    return { 'α': 'nom. sg.', 'ης': 'gen. sg.', 'ῃ': 'dat. sg.', 'αν': 'acc. sg.',
             'αι': 'nom. pl.', 'ων': 'gen. pl. (-ῶν)', 'αις': 'dat. pl.', 'ας': 'acc. pl.' }

def decl1_masc(stem, es=True):
    d = { 'ου': 'gen. sg.', 'ῃ': 'dat. sg.', 'ην' if es else 'αν': 'acc. sg.',
          'αι': 'nom. pl.', 'ων': 'gen. pl. (-ῶν)', 'αις': 'dat. pl.', 'ας': 'acc. pl.' }
    d['ης' if es else 'ας'] = 'nom. sg.'
    d['α'] = 'voc. sg.'
    return d

def dat_pl_3(stem):
    """Fonologia del dativo plurale in -σι(ν). Ordine: prima -ντ- (con
    allungamento di compenso), poi caduta del dentale/ν, poi l'assimilazione
    della gutturale/labiale residua (νυκτ → νυκ → νυξί)."""
    if stem.endswith('οντ'): return stem[:-3] + 'ουσι'
    if stem.endswith('αντ'): return stem[:-3] + 'ασι'
    if stem.endswith('εντ'): return stem[:-3] + 'εισι'
    s = stem
    while s and s[-1] in 'τδθν':
        s = s[:-1]
    if s.endswith(('κ', 'γ', 'χ')): return s[:-1] + 'ξι'
    if s.endswith(('π', 'β', 'φ')): return s[:-1] + 'ψι'
    if s.endswith('σ'): return s + 'ι'
    return s + 'σι'

def decl3(stem):
    forms = { stem + 'ος': 'gen. sg.', stem + 'ι': 'dat. sg.', stem + 'α': 'acc. sg.',
              stem + 'ες': 'nom. pl.', stem + 'ων': 'gen. pl.', stem + 'ας': 'acc. pl.' }
    forms[dat_pl_3(stem)] = 'dat. pl.'
    forms[dat_pl_3(stem) + 'ν'] = 'dat. pl. (+ν efelc.)'
    return forms

def decl3_ma(stem):  # temi in -ματ (σῶμα)
    return { stem + 'α': 'nom./acc. sg.', stem + 'ατος': 'gen. sg.', stem + 'ατι': 'dat. sg.',
             stem + 'ατα': 'nom./acc. pl.', stem + 'ατων': 'gen. pl.', stem + 'ασι': 'dat. pl.',
             stem + 'ασιν': 'dat. pl. (+ν)' }

def decl3_es(stem):  # neutri in -ος/-εσ (γένος → γένους)
    return { stem + 'ος': 'nom./acc. sg.', stem + 'ους': 'gen. sg.', stem + 'ει': 'dat. sg.',
             stem + 'η': 'nom./acc. pl.', stem + 'ων': 'gen. pl. (-ῶν)', stem + 'εσι': 'dat. pl.' }

def decl3_is(stem):  # temi in -ι tipo πόλις
    return { stem + 'ις': 'nom. sg.', stem + 'εως': 'gen. sg.', stem + 'ει': 'dat. sg.',
             stem + 'ιν': 'acc. sg.', stem + 'ι': 'voc. sg.',
             stem + 'εις': 'nom./acc. pl.', stem + 'εων': 'gen. pl.', stem + 'εσι': 'dat. pl.' }

# Testa strutturata delle voci curate: «ἡ πόλις, πόλεως · città»
RE_HEAD = re.compile(r'^\s*(ὁ|ἡ|τό|ὁ/ἡ)\s+(\S+?),\s+(\S+?)(?:\s*·|\s*$|\s)', re.S)

def classify_nominal(lemma, definition):
    """Classe e tema. Prima scelta: la testa strutturata con il GENITIVO
    esplicito (zero congetture). Fallback: solo le classi morfologicamente
    sicure dalla sola uscita del lemma (μα, η, α con la regola ε/ι/ρ, της)."""
    d = definition.strip()
    base = strip_acc(lemma)
    m = RE_HEAD.match(d)
    if m:
        art, nom, gen = m.group(1), strip_acc(m.group(2)), strip_acc(m.group(3))
        if N(nom) != N(base): return None
        if gen.endswith('ματος') and base.endswith('μα'):
            return ('ma', base[:-2] + 'μ')
        if gen.endswith('εως') and base.endswith('ις'):
            return ('is', base[:-2])
        if art == 'τό' and base.endswith('ος') and gen.endswith('ους'):
            return ('es', base[:-2])
        if art == 'τό' and base.endswith('ον') and gen.endswith('ου'):
            return ('2n', base[:-2])
        if base.endswith('ος') and gen.endswith('ου') and art in ('ὁ', 'ἡ', 'ὁ/ἡ'):
            return ('2', base[:-2])
        if base.endswith('ης') and gen.endswith('ου') and art == 'ὁ':
            return ('1m', base[:-2])
        if base.endswith('η') and gen.endswith('ης'):
            return ('1h', base[:-1])
        if base.endswith('α') and gen.endswith('ας'):
            return ('1a', base[:-1])
        if base.endswith('α') and gen.endswith('ης'):
            return ('1am', base[:-1])
        # 3ª declinazione generica: tema = genitivo esplicito − ος.
        # ESCLUSI i temi sincopati in -τρ/-δρ (πατήρ, μήτηρ, ἀνήρ, θυγάτηρ):
        # richiedono tavole dedicate (πατράσι) — meglio nessuna forma che
        # forme sbagliate.
        if gen.endswith('ος') and len(gen) > 3:
            stem = gen[:-2]
            if stem.endswith(('τρ', 'δρ')): return None
            return ('3', stem)
        return None
    # ── fallback sicuri (senza genitivo esplicito) ──
    if base.endswith('μα') and len(base) > 3:
        return ('ma', base[:-2] + 'μ')
    if base.endswith('της') and len(base) > 4:
        return ('1m', base[:-2])
    if base.endswith('η') and len(base) > 2:
        return ('1h', base[:-1])
    if base.endswith('α') and len(base) > 2:
        prev = N(base)[-2]
        return ('1a' if prev in 'ειρ' else '1am', base[:-1])
    return None

from accentuation import accent_nominal, nominal_idx_start, accent_verb, long_dichra   # motore di accentazione

def gen_nominal(lemma, klass, stem):
    idx_start = nominal_idx_start(lemma)
    out = {}
    if klass == '2':   table = { stem + e: p for e, p in decl2(stem).items() }
    elif klass == '2n': table = { stem + e: p for e, p in decl2(stem, neuter=True).items() }
    elif klass == '1h': table = { stem + e: p for e, p in decl1_eta(stem).items() }
    elif klass == '1a': table = { stem + e: p for e, p in decl1_alpha(stem, True).items() }
    elif klass == '1am': table = { stem + e: p for e, p in decl1_alpha(stem, False).items() }
    elif klass == '1m': table = { stem + e: p for e, p in decl1_masc(stem).items() }
    elif klass == 'ma': table = decl3_ma(stem)
    elif klass == 'es': table = decl3_es(stem)
    elif klass == 'is': table = decl3_is(stem)
    elif klass == '3':  table = decl3(stem)
    else: return out
    for form, parsing in table.items():
        ending = form[len(stem):]
        gendat = 'gen.' in parsing or 'dat.' in parsing
        parsing = parsing.replace(' (-ῶν)', '')
        out[accent_nominal(lemma, klass, form, ending, gendat, idx_start)] = parsing
    return out

# ───────────────────────── VERBI ─────────────────────────
PREVERBS = [  # (prefisso, forma elisa davanti a vocale/aumento)
    ('ἀπο', 'ἀπ'), ('ἐπι', 'ἐπ'), ('κατα', 'κατ'), ('μετα', 'μετ'), ('παρα', 'παρ'),
    ('ἀνα', 'ἀν'), ('δια', 'δι'), ('ὑπο', 'ὑπ'), ('ἀμφι', 'ἀμφ'), ('ἀντι', 'ἀντ'),
    ('ἐκ', 'ἐξ'), ('συν', 'συν'), ('ἐν', 'ἐν'), ('προς', 'προσ'), ('εἰς', 'εἰσ'),
    ('περι', 'περι'), ('προ', 'προ'), ('ὑπερ', 'ὑπερ'),
]
def split_preverb(lemma):
    b = lemma
    for pre, el in PREVERBS:
        pn = N(pre)
        if N(b).startswith(pn) and len(N(b)) > len(pn) + 2:
            return pre, el, b[len(pre):] if b[:len(pre)] == pre else b[len(pn):]
    return None

TEMPORAL = [('αι','ῃ'), ('αυ','ηυ'), ('οι','ῳ'), ('ει','ῃ'), ('ευ','ηυ'),
            ('α','η'), ('ε','η'), ('ο','ω'), ('ι','ι'), ('υ','υ')]
def augment_stem(stem):
    """Applica l'aumento a un tema SENZA preverbo."""
    s = strip_acc(stem)
    nfd = unicodedata.normalize('NFD', s)
    first = nfd[0]
    if N(first) not in VOWELS:
        return NFC('ἐ' + s)
    # temporale: sostituisci la vocale/dittongo iniziale conservando lo spirito
    breaths = ''.join(c for c in nfd[1:3] if c in ('̓', '̔'))
    base = N(s)
    for a, b in TEMPORAL:
        if base.startswith(a):
            rest = s[len(a):] if s[:len(a)] == a else None
            if rest is None:
                # ricostruzione prudente sul normalizzato
                rest = NFC(''.join(nfd)).__class__  # non usato
                rest = s
                return s  # dittongo con diacritici complessi: lascia com'è
            rough = '̔' in nfd[:3]
            head = unicodedata.normalize('NFC', b[0] + ('̔' if rough else '̓') + b[1:])
            return head + rest
    return s

def with_preverb(lemma_pre, elided, core):
    if not lemma_pre: return core
    if N(core) and N(core)[0] in 'ηωἀεοιυ' or unicodedata.normalize('NFD', core)[0] in VOWELS:
        # aumento vocalico → preverbo eliso (κατα→κατ), ma περι/προ/ὑπερ restano
        return elided + core
    return lemma_pre + core

def V(pres, fut=None, aor=None, aor_type='1', pf=None, pfmp=None, aorp=None, contract=None, dep=False):
    return dict(pres=pres, fut=fut, aor=aor, aor_type=aor_type, pf=pf, pfmp=pfmp, aorp=aorp,
                contract=contract, dep=dep)

# Parti principali CURATE (attico scolastico; ~120 verbi core)
VERBS = {
 'λύω': V('λυ', 'λυσ', 'ἔλυσα', '1', 'λέλυκα', 'λέλυμαι', 'ἐλύθην'),
 'παιδεύω': V('παιδευ', 'παιδευσ', 'ἐπαίδευσα', '1', 'πεπαίδευκα', 'πεπαίδευμαι', 'ἐπαιδεύθην'),
 'πιστεύω': V('πιστευ', 'πιστευσ', 'ἐπίστευσα', '1', 'πεπίστευκα', 'πεπίστευμαι', 'ἐπιστεύθην'),
 'κελεύω': V('κελευ', 'κελευσ', 'ἐκέλευσα', '1', 'κεκέλευκα', 'κεκέλευσμαι', 'ἐκελεύσθην'),
 'θύω': V('θυ', 'θυσ', 'ἔθυσα', '1', 'τέθυκα', 'τέθυμαι', 'ἐτύθην'),
 'γράφω': V('γραφ', 'γραψ', 'ἔγραψα', '1', 'γέγραφα', 'γέγραμμαι', 'ἐγράφην'),
 'πέμπω': V('πεμπ', 'πεμψ', 'ἔπεμψα', '1', 'πέπομφα', 'πέπεμμαι', 'ἐπέμφθην'),
 'τρέπω': V('τρεπ', 'τρεψ', 'ἔτρεψα', '1', None, 'τέτραμμαι', 'ἐτράπην'),
 'βλάπτω': V('βλαπτ', 'βλαψ', 'ἔβλαψα', '1', 'βέβλαφα', 'βέβλαμμαι', 'ἐβλάβην'),
 'κρύπτω': V('κρυπτ', 'κρυψ', 'ἔκρυψα', '1', None, 'κέκρυμμαι', 'ἐκρύφθην'),
 'ἄγω': V('ἀγ', 'ἀξ', 'ἤγαγον', '2:ἀγαγ', 'ἦχα', 'ἦγμαι', 'ἤχθην'),
 'ἄρχω': V('ἀρχ', 'ἀρξ', 'ἦρξα', '1', 'ἦρχα', 'ἦργμαι', 'ἤρχθην'),
 'διώκω': V('διωκ', 'διωξ', 'ἐδίωξα', '1', 'δεδίωχα', 'δεδίωγμαι', 'ἐδιώχθην'),
 'φυλάσσω': V('φυλασσ', 'φυλαξ', 'ἐφύλαξα', '1', 'πεφύλαχα', 'πεφύλαγμαι', 'ἐφυλάχθην'),
 'πράσσω': V('πρασσ', 'πραξ', 'ἔπραξα', '1', 'πέπραχα', 'πέπραγμαι', 'ἐπράχθην'),
 'τάσσω': V('τασσ', 'ταξ', 'ἔταξα', '1', 'τέταχα', 'τέταγμαι', 'ἐτάχθην'),
 'πείθω': V('πειθ', 'πεισ', 'ἔπεισα', '1', 'πέπεικα', 'πέπεισμαι', 'ἐπείσθην'),
 'ψεύδω': V('ψευδ', 'ψευσ', 'ἔψευσα', '1', None, 'ἔψευσμαι', 'ἐψεύσθην'),
 'σπεύδω': V('σπευδ', 'σπευσ', 'ἔσπευσα', '1', None, None, None),
 'σῴζω': V('σῳζ', 'σωσ', 'ἔσωσα', '1', 'σέσωκα', 'σέσῳσμαι', 'ἐσώθην'),
 'νομίζω': V('νομιζ', 'νομι', 'ἐνόμισα', '1', 'νενόμικα', 'νενόμισμαι', 'ἐνομίσθην'),
 'κομίζω': V('κομιζ', 'κομι', 'ἐκόμισα', '1', 'κεκόμικα', 'κεκόμισμαι', 'ἐκομίσθην'),
 'λείπω': V('λειπ', 'λειψ', 'ἔλιπον', '2:λιπ', 'λέλοιπα', 'λέλειμμαι', 'ἐλείφθην'),
 'φεύγω': V('φευγ', 'φευξ', 'ἔφυγον', '2:φυγ', 'πέφευγα', None, None),
 'λαμβάνω': V('λαμβαν', 'ληψ', 'ἔλαβον', '2:λαβ', 'εἴληφα', 'εἴλημμαι', 'ἐλήφθην'),
 'μανθάνω': V('μανθαν', 'μαθησ', 'ἔμαθον', '2:μαθ', 'μεμάθηκα', None, None),
 'τυγχάνω': V('τυγχαν', 'τευξ', 'ἔτυχον', '2:τυχ', 'τετύχηκα', None, None),
 'πυνθάνομαι': V('πυνθαν', 'πευσ', 'ἐπυθόμην', '2m:πυθ', None, 'πέπυσμαι', None, dep=True),
 'λανθάνω': V('λανθαν', 'λησ', 'ἔλαθον', '2:λαθ', 'λέληθα', None, None),
 'ἁμαρτάνω': V('ἁμαρταν', 'ἁμαρτησ', 'ἥμαρτον', '2:ἁμαρτ', 'ἡμάρτηκα', None, 'ἡμαρτήθην'),
 'αἰσθάνομαι': V('αἰσθαν', 'αἰσθησ', 'ᾐσθόμην', '2m:αἰσθ', None, 'ᾔσθημαι', None, dep=True),
 'γίγνομαι': V('γιγν', 'γενησ', 'ἐγενόμην', '2m:γεν', 'γέγονα', 'γεγένημαι', None, dep=True),
 'ἔρχομαι': V('ἐρχ', None, 'ἦλθον', '2:ἐλθ', 'ἐλήλυθα', None, None, dep=True),
 'εὑρίσκω': V('εὑρισκ', 'εὑρησ', 'ηὗρον', '2:εὑρ', 'ηὕρηκα', 'ηὕρημαι', 'ηὑρέθην'),
 'πάσχω': V('πασχ', 'πεισ', 'ἔπαθον', '2:παθ', 'πέπονθα', None, None),
 'ἔχω': V('ἐχ', 'ἑξ', 'ἔσχον', '2:σχ', 'ἔσχηκα', None, None),
 'βάλλω': V('βαλλ', 'βαλ~', 'ἔβαλον', '2:βαλ', 'βέβληκα', 'βέβλημαι', 'ἐβλήθην'),
 'ἀγγέλλω': V('ἀγγελλ', 'ἀγγελ~', 'ἤγγειλα', '1', 'ἤγγελκα', 'ἤγγελμαι', 'ἠγγέλθην'),
 'στέλλω': V('στελλ', 'στελ~', 'ἔστειλα', '1', 'ἔσταλκα', 'ἔσταλμαι', 'ἐστάλην'),
 'φαίνω': V('φαιν', 'φαν~', 'ἔφηνα', '1', 'πέφηνα', 'πέφασμαι', 'ἐφάνην'),
 'κρίνω': V('κριν', 'κριν~', 'ἔκρινα', '1', 'κέκρικα', 'κέκριμαι', 'ἐκρίθην'),
 'μένω': V('μεν', 'μεν~', 'ἔμεινα', '1', 'μεμένηκα', None, None),
 'νέμω': V('νεμ', 'νεμ~', 'ἔνειμα', '1', 'νενέμηκα', 'νενέμημαι', 'ἐνεμήθην'),
 'ἐγείρω': V('ἐγειρ', 'ἐγερ~', 'ἤγειρα', '1', 'ἐγρήγορα', 'ἐγήγερμαι', 'ἠγέρθην'),
 'αἴρω': V('αἰρ', 'ἀρ~', 'ἦρα', '1', 'ἦρκα', 'ἦρμαι', 'ἤρθην'),
 'ἀποκτείνω': V('ἀποκτειν', 'ἀποκτεν~', 'ἀπέκτεινα', '1', 'ἀπέκτονα', None, None),
 'ὁράω': V('ὁρα', 'ὀψ', 'εἶδον', '2:ἰδ', 'ἑώρακα', 'ἑώραμαι', 'ὤφθην', contract='α'),
 'λέγω': V('λεγ', 'ἐρ~', 'εἶπον', '2:εἰπ', 'εἴρηκα', 'εἴρημαι', 'ἐλέχθην'),
 'φέρω': V('φερ', 'οἰσ', 'ἤνεγκον', '2:ἐνεγκ', 'ἐνήνοχα', 'ἐνήνεγμαι', 'ἠνέχθην'),
 'τρέχω': V('τρεχ', 'δραμ~', 'ἔδραμον', '2:δραμ', 'δεδράμηκα', None, None),
 'ἐσθίω': V('ἐσθι', 'ἐδ~', 'ἔφαγον', '2:φαγ', 'ἐδήδοκα', None, None),
 'πίνω': V('πιν', 'πι~', 'ἔπιον', '2:πι', 'πέπωκα', 'πέπομαι', 'ἐπόθην'),
 'πίπτω': V('πιπτ', 'πεσ~', 'ἔπεσον', '2:πεσ', 'πέπτωκα', None, None),
 'θνῄσκω': V('θνῃσκ', 'θαν~', 'ἔθανον', '2:θαν', 'τέθνηκα', None, None),
 'βαίνω': V('βαιν', 'βησ', 'ἔβην', 'root:βη/βα', 'βέβηκα', None, None),
 'γιγνώσκω': V('γιγνωσκ', 'γνωσ', 'ἔγνων', 'root:γνω/γνο', 'ἔγνωκα', 'ἔγνωσμαι', 'ἐγνώσθην'),
 'ἵστημι': V('ἱστ', 'στησ', 'ἔστησα', '1', 'ἕστηκα', None, 'ἐστάθην'),
 'δίδωμι': V('διδ', 'δωσ', 'ἔδωκα', 'kappa:δο', 'δέδωκα', 'δέδομαι', 'ἐδόθην'),
 'τίθημι': V('τιθ', 'θησ', 'ἔθηκα', 'kappa:θε', 'τέθηκα', 'τέθειμαι? ', 'ἐτέθην'),
 'ἵημι': V('ἱ', 'ἡσ', 'ἧκα', 'kappa:ἑ', 'εἷκα', 'εἷμαι', 'εἵθην'),
 'δείκνυμι': V('δεικνυ', 'δειξ', 'ἔδειξα', '1', 'δέδειχα', 'δέδειγμαι', 'ἐδείχθην'),
 'τιμάω': V('τιμα', 'τιμησ', 'ἐτίμησα', '1', 'τετίμηκα', 'τετίμημαι', 'ἐτιμήθην', contract='α'),
 'νικάω': V('νικα', 'νικησ', 'ἐνίκησα', '1', 'νενίκηκα', 'νενίκημαι', 'ἐνικήθην', contract='α'),
 'ἐρωτάω': V('ἐρωτα', 'ἐρωτησ', 'ἠρώτησα', '1', 'ἠρώτηκα', 'ἠρώτημαι', 'ἠρωτήθην', contract='α'),
 'ἐάω': V('ἐα', 'ἐασ', 'εἴασα', '1', 'εἴακα', 'εἴαμαι', 'εἰάθην', contract='α'),
 'ὁρμάω': V('ὁρμα', 'ὁρμησ', 'ὥρμησα', '1', 'ὥρμηκα', 'ὥρμημαι', 'ὡρμήθην', contract='α'),
 'πειράω': V('πειρα', 'πειρασ', 'ἐπείρασα', '1', None, 'πεπείραμαι', 'ἐπειράθην', contract='α'),
 'τελευτάω': V('τελευτα', 'τελευτησ', 'ἐτελεύτησα', '1', 'τετελεύτηκα', None, 'ἐτελευτήθην', contract='α'),
 'ποιέω': V('ποιε', 'ποιησ', 'ἐποίησα', '1', 'πεποίηκα', 'πεποίημαι', 'ἐποιήθην', contract='ε'),
 'φιλέω': V('φιλε', 'φιλησ', 'ἐφίλησα', '1', 'πεφίληκα', 'πεφίλημαι', 'ἐφιλήθην', contract='ε'),
 'καλέω': V('καλε', 'καλ~', 'ἐκάλεσα', '1', 'κέκληκα', 'κέκλημαι', 'ἐκλήθην', contract='ε'),
 'δοκέω': V('δοκε', 'δοξ', 'ἔδοξα', '1', None, 'δέδογμαι', None, contract='ε'),
 'ζητέω': V('ζητε', 'ζητησ', 'ἐζήτησα', '1', 'ἐζήτηκα', 'ἐζήτημαι', 'ἐζητήθην', contract='ε'),
 'αἰτέω': V('αἰτε', 'αἰτησ', 'ᾔτησα', '1', 'ᾔτηκα', 'ᾔτημαι', 'ᾐτήθην', contract='ε'),
 'οἰκέω': V('οἰκε', 'οἰκησ', 'ᾤκησα', '1', 'ᾤκηκα', 'ᾤκημαι', 'ᾠκήθην', contract='ε'),
 'πολεμέω': V('πολεμε', 'πολεμησ', 'ἐπολέμησα', '1', 'πεπολέμηκα', None, 'ἐπολεμήθην', contract='ε'),
 'φρονέω': V('φρονε', 'φρονησ', 'ἐφρόνησα', '1', 'πεφρόνηκα', None, None, contract='ε'),
 'ἀδικέω': V('ἀδικε', 'ἀδικησ', 'ἠδίκησα', '1', 'ἠδίκηκα', 'ἠδίκημαι', 'ἠδικήθην', contract='ε'),
 'νοέω': V('νοε', 'νοησ', 'ἐνόησα', '1', 'νενόηκα', 'νενόημαι', 'ἐνοήθην', contract='ε'),
 'κρατέω': V('κρατε', 'κρατησ', 'ἐκράτησα', '1', 'κεκράτηκα', 'κεκράτημαι', 'ἐκρατήθην', contract='ε'),
 'μισέω': V('μισε', 'μισησ', 'ἐμίσησα', '1', 'μεμίσηκα', 'μεμίσημαι', 'ἐμισήθην', contract='ε'),
 'ὠφελέω': V('ὠφελε', 'ὠφελησ', 'ὠφέλησα', '1', 'ὠφέληκα', 'ὠφέλημαι', 'ὠφελήθην', contract='ε'),
 'θεάομαι': V('θεα', 'θεασ', 'ἐθεασάμην', '1m', None, 'τεθέαμαι', None, contract='α', dep=True),
 'δηλόω': V('δηλο', 'δηλωσ', 'ἐδήλωσα', '1', 'δεδήλωκα', 'δεδήλωμαι', 'ἐδηλώθην', contract='ο'),
 'ἀξιόω': V('ἀξιο', 'ἀξιωσ', 'ἠξίωσα', '1', 'ἠξίωκα', 'ἠξίωμαι', 'ἠξιώθην', contract='ο'),
 'ἐλευθερόω': V('ἐλευθερο', 'ἐλευθερωσ', 'ἠλευθέρωσα', '1', None, 'ἠλευθέρωμαι', 'ἠλευθερώθην', contract='ο'),
 'δουλόω': V('δουλο', 'δουλωσ', 'ἐδούλωσα', '1', 'δεδούλωκα', 'δεδούλωμαι', 'ἐδουλώθην', contract='ο'),
 'βούλομαι': V('βουλ', 'βουλησ', None, None, None, 'βεβούλημαι', 'ἐβουλήθην', dep=True),
 'δύναμαι': V('δυνα', 'δυνησ', None, None, None, 'δεδύνημαι', 'ἐδυνήθην', dep=True),
 'οἴομαι': V('οἰ', 'οἰησ', None, None, None, None, 'ᾠήθην', dep=True),
 'μάχομαι': V('μαχ', 'μαχ~', 'ἐμαχεσάμην', '1m', None, 'μεμάχημαι', None, dep=True),
 'δέχομαι': V('δεχ', 'δεξ', 'ἐδεξάμην', '1m', None, 'δέδεγμαι', None, dep=True),
 'ἡγέομαι': V('ἡγε', 'ἡγησ', 'ἡγησάμην', '1m', None, 'ἥγημαι', None, contract='ε', dep=True),
 'αἰσχύνομαι': V('αἰσχυν', 'αἰσχυν~', None, None, None, None, 'ᾐσχύνθην', dep=True),
 'ἀφικνέομαι': V('ἀφικνε', 'ἀφιξ', 'ἀφικόμην', '2m:ἀφικ', None, 'ἀφῖγμαι', None, contract='ε', dep=True),
 'ἀκούω': V('ἀκου', 'ἀκουσ', 'ἤκουσα', '1', 'ἀκήκοα', None, 'ἠκούσθην'),
 'θαυμάζω': V('θαυμαζ', 'θαυμασ', 'ἐθαύμασα', '1', 'τεθαύμακα', None, 'ἐθαυμάσθην'),
 'ἁρπάζω': V('ἁρπαζ', 'ἁρπασ', 'ἥρπασα', '1', 'ἥρπακα', 'ἥρπασμαι', 'ἡρπάσθην'),
 'ἀναγκάζω': V('ἀναγκαζ', 'ἀναγκασ', 'ἠνάγκασα', '1', 'ἠνάγκακα', 'ἠνάγκασμαι', 'ἠναγκάσθην'),
 'ὀνομάζω': V('ὀνομαζ', 'ὀνομασ', 'ὠνόμασα', '1', 'ὠνόμακα', 'ὠνόμασμαι', 'ὠνομάσθην'),
 'σκευάζω': V('σκευαζ', 'σκευασ', 'ἐσκεύασα', '1', None, 'ἐσκεύασμαι', 'ἐσκευάσθην'),
 'ἐλπίζω': V('ἐλπιζ', 'ἐλπι', 'ἤλπισα', '1', None, None, 'ἠλπίσθην'),
 'ὑβρίζω': V('ὑβριζ', 'ὑβρι', 'ὕβρισα', '1', 'ὕβρικα', 'ὕβρισμαι', 'ὑβρίσθην'),
 'στρατεύω': V('στρατευ', 'στρατευσ', 'ἐστράτευσα', '1', None, 'ἐστράτευμαι', None),
 'βασιλεύω': V('βασιλευ', 'βασιλευσ', 'ἐβασίλευσα', '1', 'βεβασίλευκα', None, None),
 'βουλεύω': V('βουλευ', 'βουλευσ', 'ἐβούλευσα', '1', 'βεβούλευκα', 'βεβούλευμαι', 'ἐβουλεύθην'),
 'χαίρω': V('χαιρ', 'χαιρησ', None, None, 'κεχάρηκα', None, 'ἐχάρην'),
 'κλέπτω': V('κλεπτ', 'κλεψ', 'ἔκλεψα', '1', 'κέκλοφα', 'κέκλεμμαι', 'ἐκλάπην'),
 'κόπτω': V('κοπτ', 'κοψ', 'ἔκοψα', '1', 'κέκοφα', 'κέκομμαι', 'ἐκόπην'),
 'ῥίπτω': V('ῥιπτ', 'ῥιψ', 'ἔρριψα', '1', 'ἔρριφα', 'ἔρριμμαι', 'ἐρρίφθην'),
 'στρέφω': V('στρεφ', 'στρεψ', 'ἔστρεψα', '1', None, 'ἔστραμμαι', 'ἐστράφην'),
 'τρέφω': V('τρεφ', 'θρεψ', 'ἔθρεψα', '1', 'τέτροφα', 'τέθραμμαι', 'ἐτράφην'),
 'τρίβω': V('τριβ', 'τριψ', 'ἔτριψα', '1', 'τέτριφα', 'τέτριμμαι', 'ἐτρίβην'),
 'λύπέω': V('λυπε', 'λυπησ', 'ἐλύπησα', '1', 'λελύπηκα', 'λελύπημαι', 'ἐλυπήθην', contract='ε'),
 'ἀποθνῄσκω': V('ἀποθνῃσκ', 'ἀποθαν~', 'ἀπέθανον', '2:ἀποθαν', 'ἀποτέθνηκα', None, None),
 'ἀποκρίνομαι': V('ἀποκριν', 'ἀποκριν~', 'ἀπεκρινάμην', '1m', None, 'ἀποκέκριμαι', None, dep=True),
 'ὑπισχνέομαι': V('ὑπισχνε', 'ὑποσχησ', 'ὑπεσχόμην', '2m:ὑποσχ', None, 'ὑπέσχημαι', None, contract='ε', dep=True),
 'ἅπτω': V('ἁπτ', 'ἁψ', 'ἧψα', '1', None, 'ἧμμαι', 'ἥφθην'),
 'πλέω': V('πλε', 'πλευσ', 'ἔπλευσα', '1', 'πέπλευκα', 'πέπλευσμαι', None),
 'μέλλω': V('μελλ', 'μελλησ', 'ἐμέλλησα', '1', None, None, None),
 'ἐθέλω': V('ἐθελ', 'ἐθελησ', 'ἠθέλησα', '1', 'ἠθέληκα', None, None),
 'ὀφείλω': V('ὀφειλ', 'ὀφειλησ', 'ὠφείλησα', '1', 'ὠφείληκα', None, None),
}

PRES_ACT = { 'ω':'1ª sg.', 'εις':'2ª sg.', 'ει':'3ª sg.', 'ομεν':'1ª pl.', 'ετε':'2ª pl.', 'ουσι':'3ª pl.', 'ουσιν':'3ª pl. (+ν)' }
IMPF_ACT = { 'ον':'1ª sg.', 'ες':'2ª sg.', 'ε':'3ª sg.', 'ομεν':'1ª pl.', 'ετε':'2ª pl.', 'ον·pl':'3ª pl.' }
PRES_MP  = { 'ομαι':'1ª sg.', 'ῃ':'2ª sg.', 'εται':'3ª sg.', 'ομεθα':'1ª pl.', 'εσθε':'2ª pl.', 'ονται':'3ª pl.' }
IMPF_MP  = { 'ομην':'1ª sg.', 'ου':'2ª sg.', 'ετο':'3ª sg.', 'ομεθα':'1ª pl.', 'εσθε':'2ª pl.', 'οντο':'3ª pl.' }
SUBJ_ACT = { 'ω':'1ª sg.', 'ῃς':'2ª sg.', 'ῃ':'3ª sg.', 'ωμεν':'1ª pl.', 'ητε':'2ª pl.', 'ωσι':'3ª pl.' }
OPT_ACT  = { 'οιμι':'1ª sg.', 'οις':'2ª sg.', 'οι':'3ª sg.', 'οιμεν':'1ª pl.', 'οιτε':'2ª pl.', 'οιεν':'3ª pl.' }
SUBJ_MP  = { 'ωμαι':'1ª sg.', 'ῃ':'2ª sg.', 'ηται':'3ª sg.', 'ωμεθα':'1ª pl.', 'ησθε':'2ª pl.', 'ωνται':'3ª pl.' }
OPT_MP   = { 'οιμην':'1ª sg.', 'οιο':'2ª sg.', 'οιτο':'3ª sg.', 'οιμεθα':'1ª pl.', 'οισθε':'2ª pl.', 'οιντο':'3ª pl.' }
IMV_A    = { 'ε':'2ª sg.', 'ετω':'3ª sg.', 'ετε':'2ª pl.', 'οντων':'3ª pl.' }
IMV_M    = { 'ου':'2ª sg.', 'εσθω':'3ª sg.', 'εσθε':'2ª pl.', 'εσθων':'3ª pl.' }
# uscite contratte dei modi (già accentate; 2ª sg. imv. senza accento → recessivo)
CONTR_MOOD = {
 'α': {'cong': (['ῶ','ᾷς','ᾷ','ῶμεν','ᾶτε','ῶσι'], ['ῶμαι','ᾷ','ᾶται','ώμεθα','ᾶσθε','ῶνται']),
       'opt':  (['ῷμι','ῷς','ῷ','ῷμεν','ῷτε','ῷεν'], ['ῴμην','ῷο','ῷτο','ῴμεθα','ῷσθε','ῷντο']),
       'imv':  (['α','άτω','ᾶτε','ώντων'], ['ῶ','άσθω','ᾶσθε','άσθων'])},
 'ε': {'cong': (['ῶ','ῇς','ῇ','ῶμεν','ῆτε','ῶσι'], ['ῶμαι','ῇ','ῆται','ώμεθα','ῆσθε','ῶνται']),
       'opt':  (['οῖμι','οῖς','οῖ','οῖμεν','οῖτε','οῖεν'], ['οίμην','οῖο','οῖτο','οίμεθα','οῖσθε','οῖντο']),
       'imv':  (['ει','είτω','εῖτε','ούντων'], ['οῦ','είσθω','εῖσθε','είσθων'])},
 'ο': {'cong': (['ῶ','οῖς','οῖ','ῶμεν','ῶτε','ῶσι'], ['ῶμαι','οῖ','ῶται','ώμεθα','ῶσθε','ῶνται']),
       'opt':  (['οῖμι','οῖς','οῖ','οῖμεν','οῖτε','οῖεν'], ['οίμην','οῖο','οῖτο','οίμεθα','οῖσθε','οῖντο']),
       'imv':  (['ου','ούτω','οῦτε','ούντων'], ['οῦ','ούσθω','οῦσθε','ούσθων'])},
}
MI_MOOD = {
 'δίδωμι': {'cong': (['διδῶ','διδῷς','διδῷ','διδῶμεν','διδῶτε','διδῶσι'], ['διδῶμαι','διδῷ','διδῶται','διδώμεθα','διδῶσθε','διδῶνται']),
            'opt':  (['διδοίην','διδοίης','διδοίη','διδοῖμεν','διδοῖτε','διδοῖεν'], ['διδοίμην','διδοῖο','διδοῖτο','διδοίμεθα','διδοῖσθε','διδοῖντο']),
            'imv':  (['δίδου','διδότω','δίδοτε','διδόντων'], ['δίδοσο','διδόσθω','δίδοσθε','διδόσθων'])},
 'τίθημι': {'cong': (['τιθῶ','τιθῇς','τιθῇ','τιθῶμεν','τιθῆτε','τιθῶσι'], ['τιθῶμαι','τιθῇ','τιθῆται','τιθώμεθα','τιθῆσθε','τιθῶνται']),
            'opt':  (['τιθείην','τιθείης','τιθείη','τιθεῖμεν','τιθεῖτε','τιθεῖεν'], ['τιθείμην','τιθεῖο','τιθεῖτο','τιθείμεθα','τιθεῖσθε','τιθεῖντο']),
            'imv':  (['τίθει','τιθέτω','τίθετε','τιθέντων'], ['τίθεσο','τιθέσθω','τίθεσθε','τιθέσθων'])},
 'ἵστημι': {'cong': (['ἱστῶ','ἱστῇς','ἱστῇ','ἱστῶμεν','ἱστῆτε','ἱστῶσι'], ['ἱστῶμαι','ἱστῇ','ἱστῆται','ἱστώμεθα','ἱστῆσθε','ἱστῶνται']),
            'opt':  (['ἱσταίην','ἱσταίης','ἱσταίη','ἱσταῖμεν','ἱσταῖτε','ἱσταῖεν'], ['ἱσταίμην','ἱσταῖο','ἱσταῖτο','ἱσταίμεθα','ἱσταῖσθε','ἱσταῖντο']),
            'imv':  (['ἵστη','ἱστάτω','ἵστατε','ἱστάντων'], ['ἵστασο','ἱστάσθω','ἵστασθε','ἱστάσθων'])},
 'δείκνυμι': {'cong': (['δεικνύω','δεικνύῃς','δεικνύῃ','δεικνύωμεν','δεικνύητε','δεικνύωσι'], ['δεικνύωμαι','δεικνύῃ','δεικνύηται','δεικνυώμεθα','δεικνύησθε','δεικνύωνται']),
            'opt':  (['δεικνύοιμι','δεικνύοις','δεικνύοι','δεικνύοιμεν','δεικνύοιτε','δεικνύοιεν'], ['δεικνυοίμην','δεικνύοιο','δεικνύοιτο','δεικνυοίμεθα','δεικνύοισθε','δεικνύοιντο']),
            'imv':  (['δείκνυ','δεικνύτω','δείκνυτε','δεικνύντων'], ['δείκνυσο','δεικνύσθω','δείκνυσθε','δεικνύσθων'])},
}
AOR1_ACT = { 'α':'1ª sg.', 'ας':'2ª sg.', 'ε':'3ª sg.', 'αμεν':'1ª pl.', 'ατε':'2ª pl.', 'αν':'3ª pl.' }
AOR1_MID = { 'αμην':'1ª sg.', 'ω':'2ª sg.', 'ατο':'3ª sg.', 'αμεθα':'1ª pl.', 'ασθε':'2ª pl.', 'αντο':'3ª pl.' }
AOR2_MID = { 'ομην':'1ª sg.', 'ου':'2ª sg.', 'ετο':'3ª sg.', 'ομεθα':'1ª pl.', 'εσθε':'2ª pl.', 'οντο':'3ª pl.' }
AORP_IND = { 'ην':'1ª sg.', 'ης':'2ª sg.', 'η':'3ª sg.', 'ημεν':'1ª pl.', 'ητε':'2ª pl.', 'ησαν':'3ª pl.' }
PF_ACT   = { 'α':'1ª sg.', 'ας':'2ª sg.', 'ε':'3ª sg.', 'αμεν':'1ª pl.', 'ατε':'2ª pl.', 'ασι':'3ª pl.' }
FUT_MID  = { 'ομαι':'1ª sg.', 'ῃ':'2ª sg.', 'εται':'3ª sg.', 'ομεθα':'1ª pl.', 'εσθε':'2ª pl.', 'ονται':'3ª pl.' }

CONTR = {
 'α': { 'ω':'ῶ','εις':'ᾷς','ει':'ᾷ','ομεν':'ῶμεν','ετε':'ᾶτε','ουσι':'ῶσι','ουσιν':'ῶσιν',
        'ον':'ων','ες':'ας','ε':'α','ομαι':'ῶμαι','ῃ':'ᾷ','εται':'ᾶται','ομεθα':'ώμεθα','εσθε':'ᾶσθε','ονται':'ῶνται',
        'ομην':'ώμην','ου':'ῶ','ετο':'ᾶτο','οντο':'ῶντο','ειν':'ᾶν','εσθαι':'ᾶσθαι' },
 'ε': { 'ω':'ῶ','εις':'εῖς','ει':'εῖ','ομεν':'οῦμεν','ετε':'εῖτε','ουσι':'οῦσι','ουσιν':'οῦσιν',
        'ον':'ουν','ες':'εις','ε':'ει','ομαι':'οῦμαι','ῃ':'ῇ','εται':'εῖται','ομεθα':'ούμεθα','εσθε':'εῖσθε','ονται':'οῦνται',
        'ομην':'ούμην','ου':'οῦ','ετο':'εῖτο','οντο':'οῦντο','ειν':'εῖν','εσθαι':'εῖσθαι' },
 'ο': { 'ω':'ῶ','εις':'οῖς','ει':'οῖ','ομεν':'οῦμεν','ετε':'οῦτε','ουσι':'οῦσι','ουσιν':'οῦσιν',
        'ον':'ουν','ες':'ους','ε':'ου','ομαι':'οῦμαι','ῃ':'οῖ','εται':'οῦται','ομεθα':'ούμεθα','εσθε':'οῦσθε','ονται':'οῦνται',
        'ομην':'ούμην','ου':'οῦ','ετο':'οῦτο','οντο':'οῦντο','ειν':'οῦν','εσθαι':'οῦσθαι' },
}

def mp_perfect(stem_mp):
    """Perfetto medio-passivo con assimilazione al tema (già dato col raddopp.)."""
    base = stem_mp[:-3] if stem_mp.endswith('μαι') else stem_mp
    # base termina col tema: deduci consonante finale reale
    b = base
    out = {}
    nb = N(b)
    if nb.endswith('μ'):    # labiale: γέγραμ-μαι
        root = b[:-1]
        out = { root+'μμαι':'1ª sg.', root+'ψαι':'2ª sg.', root+'πται':'3ª sg.',
                root+'μμεθα':'1ª pl.', root+'φθε':'2ª pl.' }
    elif nb.endswith('γ'):  # velare: δεδίωγ-μαι? qui base già senza μαι: τεταγ
        out = { b+'μαι':'1ª sg.', b[:-1]+'ξαι':'2ª sg.', b[:-1]+'κται':'3ª sg.',
                b+'μεθα':'1ª pl.', b[:-1]+'χθε':'2ª pl.' }
    elif nb.endswith('σ'):  # dentale: πέπεισ-μαι
        out = { b+'μαι':'1ª sg.', b[:-1]+'σαι':'2ª sg.', b+'ται':'3ª sg.',
                b+'μεθα':'1ª pl.', b+'θε':'2ª pl.' }
    else:                   # vocalico: λέλυ-μαι
        out = { b+'μαι':'1ª sg.', b+'σαι':'2ª sg.', b+'ται':'3ª sg.',
                b+'μεθα':'1ª pl.', b+'σθε':'2ª pl.', b+'νται':'3ª pl.' }
    return out

def gen_verb(lemma, v):
    out = {}
    ld = long_dichra(lemma)   # dichrona lunghi deducibili dal lemma
    def add(form, parsing, rec=True, opt=False, pre_accented=False):
        f = NFC(form)
        if not pre_accented and rec:
            f = accent_verb(f, ld, opt=opt)
        # forme ambigue (ἔλυον 1ª sg E 3ª pl): fondi i parsing, non sovrascrivere
        if f in out and parsing not in out[f]:
            out[f] = out[f] + ' / ' + parsing.replace(f' di {lemma}', '')
        else:
            out[f] = parsing
    pv = split_preverb(lemma) if not v['pres'].startswith(('ἀ','ἐ','ὀ','ἠ','ὠ','ἡ','ὑ','ἱ','αἰ','εὑ','οἰ')) else split_preverb(lemma)
    pre = split_preverb(v['pres']) if False else None
    # tema del presente con eventuale preverbo già incluso in v['pres']
    ps = v['pres']
    contract = v['contract']
    dep = v['dep']
    # ── presente e imperfetto ──
    pres_tables = ([] if dep else [(PRES_ACT, 'pres. ind. att.')]) + [(PRES_MP, 'pres. ind. m.-p.' if not dep else 'pres. ind.')]
    for table, label in pres_tables:
        for end, pers in table.items():
            e2 = CONTR[contract].get(end, None) if contract else end
            if contract and e2 is None: continue
            form = ps[:-1] + e2 if contract else ps + end
            add(form, f'{label} {pers} di {lemma}', rec=not contract, pre_accented=bool(contract))
    # infiniti presenti
    if contract:
        if not dep: add(ps[:-1] + CONTR[contract]['ειν'], f'inf. pres. att. di {lemma}', pre_accented=True)
        add(ps[:-1] + CONTR[contract]['εσθαι'], f'inf. pres. m.-p. di {lemma}', pre_accented=True)
    else:
        if not dep: add(accent_at(strip_acc(ps + 'ειν'), 2), f'inf. pres. att. di {lemma}', pre_accented=True)
        add(ps + 'εσθαι', f'inf. pres. m.-p. di {lemma}')
    # participi presenti (nom. e basi oblique principali)
    if not dep and not contract:
        add(accent_at(strip_acc(ps) + 'ων', 2), f'ptc. pres. att. nom. m. sg. di {lemma}', pre_accented=True)
        for e, p in (('οντος','gen. m./n. sg.'), ('οντι','dat. sg.'), ('οντα','acc. sg.'), ('οντες','nom. pl.'), ('οντων','gen. pl.'), ('ουσι','dat. pl.'), ('ουσα','nom. f. sg.'), ('ουσης','gen. f. sg.'), ('ον','nom. n. sg.')):
            add(ps + e, f'ptc. pres. att. {p} di {lemma}')
    add(ps + ('ομενος' if not contract else ''), f'ptc. pres. m.-p. nom. m. sg. di {lemma}') if not contract else None
    if not contract:
        for e, p in (('ομενη','nom. f. sg.'), ('ομενον','nom./acc. n. sg.'), ('ομενου','gen. sg.'), ('ομενοι','nom. pl.'), ('ομενων','gen. pl.'), ('ομενους','acc. pl.')):
            add(ps + e, f'ptc. pres. m.-p. {p} di {lemma}')
    # ── congiuntivo, ottativo, imperativo (presente) ──
    SIX = ['1ª sg.','2ª sg.','3ª sg.','1ª pl.','2ª pl.','3ª pl.']
    FOUR = ['2ª sg.','3ª sg.','2ª pl.','3ª pl.']
    if not dep:
        if lemma in MI_MOOD:
            mm = MI_MOOD[lemma]
            for key, lab in (('cong','cong. pres.'), ('opt','ott. pres.'), ('imv','imv. pres.')):
                pers = FOUR if key == 'imv' else SIX
                for forms, voice in zip(mm[key], ('att.', 'm.-p.')):
                    for f, p in zip(forms, pers):
                        add(f, f'{lab} {voice} {p} di {lemma}', pre_accented=True)
        elif contract:
            Tc = ps[:-1]; cm = CONTR_MOOD[contract]
            for key, lab in (('cong','cong. pres.'), ('opt','ott. pres.'), ('imv','imv. pres.')):
                pers = FOUR if key == 'imv' else SIX
                for endings, voice in zip(cm[key], ('att.', 'm.-p.')):
                    for end, p in zip(endings, pers):
                        eb = strip_acc(end)
                        add(accent_verb(Tc + eb) if eb == end else Tc + end,
                            f'{lab} {voice} {p} di {lemma}', pre_accented=True)
        else:
            for table, lab in ((SUBJ_ACT,'cong. pres. att.'), (SUBJ_MP,'cong. pres. m.-p.'),
                               (OPT_ACT,'ott. pres. att.'), (OPT_MP,'ott. pres. m.-p.'),
                               (IMV_A,'imv. pres. att.'), (IMV_M,'imv. pres. m.-p.')):
                for end, p in table.items():
                    add(ps + end, f'{lab} {p} di {lemma}')
    # imperfetto (aumenta il tema del presente)
    prev = split_preverb(lemma)
    if prev:
        p_lex, p_el, core = prev
        core_ps = ps[len(ps)-len(strip_acc(ps)):]  # non affidabile: usa split su ps
        prev_ps = split_preverb(ps)
        if prev_ps:
            _, p_el2, core2 = prev_ps
            aug_core = augment_stem(core2)
            impf_stem = p_el2 + aug_core if N(aug_core)[0] in VOWELS else p_el2 + aug_core
            impf_stem = (p_el2 if N(aug_core)[0] in VOWELS else prev_ps[0]) + aug_core
        else:
            impf_stem = augment_stem(ps)
    else:
        impf_stem = augment_stem(ps)
    for end, pers in IMPF_ACT.items():
        real = 'ον' if end == 'ον·pl' else end
        if dep: break
        e2 = CONTR[contract].get(real, None) if contract else real
        if contract and e2 is None: continue
        form = impf_stem[:-1] + e2 if contract else impf_stem + real
        if contract and form == strip_acc(form):
            form = accent_at(form, 2)   # imperf. contratto att. sg./3ª pl.: penultima acuta
        add(form, f'impf. ind. att. {pers} di {lemma}', rec=not contract, pre_accented=bool(contract))
    for end, pers in IMPF_MP.items():
        e2 = CONTR[contract].get(end, None) if contract else end
        if contract and e2 is None: continue
        form = impf_stem[:-1] + e2 if contract else impf_stem + end
        add(form, f'impf. ind. m.-p. {pers} di {lemma}', rec=not contract, pre_accented=bool(contract))
    # ── futuro ──
    if v['fut']:
        fs = v['fut']
        liquid = fs.endswith('~')
        if liquid: fs = fs[:-1]
        table = PRES_ACT if not dep else FUT_MID
        for end, pers in table.items():
            if liquid:
                e2 = CONTR['ε'].get(end)
                if e2 is None: continue
                add(fs + e2, f'fut. ind. {"med." if dep else "att."} {pers} di {lemma}', pre_accented=True)
            else:
                add(fs + end, f'fut. ind. {"med." if dep else "att."} {pers} di {lemma}')
        if not dep:
            for end, pers in FUT_MID.items():
                if liquid:
                    e2 = CONTR['ε'].get(end)
                    if e2 is None: continue
                    add(fs + e2, f'fut. ind. med. {pers} di {lemma}', pre_accented=True)
                else:
                    add(fs + end, f'fut. ind. med. {pers} di {lemma}')
    # ── aoristo ──
    if v['aor']:
        at = v['aor_type'] or '1'
        aor_ind = v['aor']  # 1ª sg. già aumentata e accentata
        if at == '1' or at == '1m':
            stem_aug = strip_acc(aor_ind)[:-1]  # ἐλυσ-
            mid = (at == '1m')
            if not mid:
                for end, pers in AOR1_ACT.items():
                    add(stem_aug + end, f'aor. ind. att. {pers} di {lemma}')
                # forme non aumentate: inf., ptc., cong., ott., imv.
                un = de_augment(stem_aug, lemma)
                if un:
                    out[NFC(accent_at(strip_acc(un + 'αι'), 2))] = f'inf. aor. att. di {lemma}'
                    for e, p in (('ας','nom. m. sg.'), ('αντος','gen. m. sg.'), ('αντες','nom. m. pl.'), ('ασα','nom. f. sg.'), ('αν','nom. n. sg.')):
                        add(un + e, f'ptc. aor. att. {p} di {lemma}')
                    for end, pers in SUBJ_ACT.items():
                        add(un[:-1] + 'σ' + end if not un.endswith('σ') else un + end, f'cong. aor. att. {pers} di {lemma}')
                    add(un + 'ον', f'imv. aor. att. 2ª sg. di {lemma}')
                    add(un + 'ατε', f'imv. aor. att. 2ª pl. di {lemma}')
                    for end, pers in AOR1_MID.items():
                        add(un + end, f'aor. ind. med. {pers} di {lemma} (senza aumento)') if False else None
            for end, pers in AOR1_MID.items():
                base = stem_aug if not mid else strip_acc(aor_ind)[:-4]
                add(base + end, f'aor. ind. med. {pers} di {lemma}')
        elif at.startswith('2m:'):
            st = at[3:]
            prev = split_preverb(lemma)
            stem_aug = strip_acc(v['aor'])[:-4]  # ἐγεν- da ἐγενόμην
            for end, pers in AOR2_MID.items():
                add(stem_aug + end, f'aor. ind. med. {pers} di {lemma}')
            add(accent_at(strip_acc(st + 'εσθαι'), 2), f'inf. aor. med. di {lemma}', pre_accented=True)
            add(st + 'ομενος', f'ptc. aor. med. nom. m. sg. di {lemma}')
        elif at.startswith('2:'):
            st = at[2:]
            stem_aug = strip_acc(v['aor'])[:-2]  # ἐλιπ- da ἔλιπον
            for end, pers in IMPF_ACT.items():
                real = 'ον' if end == 'ον·pl' else end
                add(stem_aug + real, f'aor. ind. att. {pers} di {lemma}')
            # inf. aor. II ossitono: -εῖν; ptc. -ών
            out[NFC(strip_acc(st) + 'εῖν')] = f'inf. aor. att. di {lemma}'
            out[NFC(strip_acc(st) + 'ών')] = f'ptc. aor. att. nom. m. sg. di {lemma}'
            for e, p in (('οντος','gen. m. sg.'), ('οντες','nom. m. pl.'), ('ουσα','nom. f. sg.'), ('ον','nom. n. sg.')):
                add(st + e, f'ptc. aor. att. {p} di {lemma}')
            for end, pers in SUBJ_ACT.items():
                add(st + end, f'cong. aor. att. {pers} di {lemma}')
            for end, pers in AOR2_MID.items():
                add(stem_aug + end, f'aor. ind. med. {pers} di {lemma}')
        elif at.startswith('root:'):
            long_s, short_s = at[5:].split('/')
            stem_aug = strip_acc(v['aor'])  # ἔβην
            base = stem_aug[:-1] if stem_aug.endswith('ν') else stem_aug
            for end, pers in (('ν','1ª sg.'), ('ς','2ª sg.'), ('','3ª sg.'), ('μεν','1ª pl.'), ('τε','2ª pl.'), ('σαν','3ª pl.')):
                add(base + end, f'aor. ind. att. {pers} di {lemma}')
            out[NFC(accent_at(strip_acc(long_s) + 'ναι', 2, circum=True))] = f'inf. aor. att. di {lemma}'
            add(short_s + 'ς', f'ptc. aor. att. nom. m. sg. di {lemma}')
            add(short_s + 'ντος', f'ptc. aor. att. gen. m. sg. di {lemma}')
        elif at.startswith('kappa:'):
            short_s = at[6:]
            stem_aug = strip_acc(v['aor'])[:-1]  # ἐδωκ-
            for end, pers in AOR1_ACT.items():
                add(stem_aug + end, f'aor. ind. att. {pers} di {lemma}')
            KAPPA_INF = { 'δο': 'δοῦναι', 'θε': 'θεῖναι', 'ἑ': 'εἷναι' }
            out[NFC(KAPPA_INF.get(short_s, accent_at(short_s + 'ναι', 2)))] = f'inf. aor. att. di {lemma}'
    # ── aoristo passivo ──
    if v['aorp']:
        ap = strip_acc(v['aorp'])
        base = ap[:-2]  # ἐλυθ- da ἐλύθην
        for end, pers in AORP_IND.items():
            add(base + end, f'aor. ind. pass. {pers} di {lemma}')
        un = de_augment(base, lemma)
        if un:
            out[NFC(accent_at(strip_acc(un + 'ηναι'), 2))] = f'inf. aor. pass. di {lemma}'
            out[NFC(strip_acc(un) + 'είς')] = f'ptc. aor. pass. nom. m. sg. di {lemma}'
            add(un + 'εντος', f'ptc. aor. pass. gen. m. sg. di {lemma}')
            for end, pers in (('ω','1ª sg.'), ('ῃς','2ª sg.'), ('ῃ','3ª sg.'), ('ωμεν','1ª pl.'), ('ητε','2ª pl.'), ('ωσι','3ª pl.')):
                out[NFC(accent_at(strip_acc(un + end), 1))] = f'cong. aor. pass. {pers} di {lemma}'
    # ── perfetto ──
    if v['pf']:
        pstem = strip_acc(v['pf'])[:-1]  # λελυκ-
        for end, pers in PF_ACT.items():
            add(pstem + end, f'pf. ind. att. {pers} di {lemma}')
        add(accent_at(strip_acc(pstem + 'εναι'), 2), f'inf. pf. att. di {lemma}', pre_accented=True)
        out[NFC(strip_acc(pstem) + 'ώς')] = f'ptc. pf. att. nom. m. sg. di {lemma}'
    if v['pfmp'] and 'μαι' in v['pfmp']:
        stem_mp = strip_acc(v['pfmp'])
        for form, pers in mp_perfect(stem_mp).items():
            add(form, f'pf. ind. m.-p. {pers} di {lemma}')
    return out

def de_augment(stem_aug, lemma):
    """Rimuove l'aumento da un tema aumentato (per inf./ptc./cong.)."""
    prev = split_preverb(lemma)
    s = stem_aug
    if prev:
        # trova il confine del preverbo (eliso) nel tema aumentato
        for pre, el in PREVERBS:
            for head in (el, N(el)):
                if N(s).startswith(N(el)):
                    rest = s[len(el):] if s[:len(el)] == el else None
                    if rest is None:
                        # allinea per lunghezza normalizzata
                        k = len(el)
                        rest = s[k:]
                    inner = _deaug_core(rest)
                    return (pre if inner and N(inner)[0] not in VOWELS else el) + inner if inner else None
            break
        return None
    return _deaug_core(s)

def _deaug_core(s):
    nfd = unicodedata.normalize('NFD', s)
    if N(s).startswith('ε') and len(nfd) > 1 and N(s)[1] not in VOWELS:
        # aumento sillabico: ἐλυσ → λυσ
        j = 1
        while j < len(nfd) and unicodedata.combining(nfd[j]): j += 1
        return NFC(nfd[j:])
    for a, b in TEMPORAL:
        if N(s).startswith(b) and a != b:
            rough = '̔' in nfd[:4]
            head = unicodedata.normalize('NFC', a[0] + ('̔' if rough else '̓') + a[1:])
            base = N(s)
            return head + s[len(b):] if s[:len(b)] == b else None
    return None

# Nominali CURATI: super-comuni con definizione LSJ inglese (non strutturata),
# che il classificatore salta per prudenza. Classe assegnata a mano.
NOMINAL_EXTRA = {
 'ἄνθρωπος': '2', 'λόγος': '2', 'θεός': '2', 'πόλεμος': '2', 'νόμος': '2',
 'δῆμος': '2', 'θάνατος': '2', 'χρόνος': '2', 'τόπος': '2', 'φίλος': '2',
 'υἱός': '2', 'ἵππος': '2', 'οἶκος': '2', 'ποταμός': '2', 'στρατηγός': '2',
 'σύμμαχος': '2', 'κίνδυνος': '2', 'θυμός': '2', 'ὕπνος': '2', 'ἥλιος': '2',
 'οὐρανός': '2', 'ἀγρός': '2', 'καιρός': '2', 'τρόπος': '2', 'λίθος': '2',
 'ἔργον': '2n', 'ὅπλον': '2n', 'δῶρον': '2n', 'τέκνον': '2n', 'πλοῖον': '2n',
 'στρατόπεδον': '2n', 'χωρίον': '2n', 'σημεῖον': '2n', 'δένδρον': '2n',
 'ζῷον': '2n', 'ἱερόν': '2n', 'ἆθλον': '2n', 'μέτρον': '2n',
}

# ───────────────────────── MAIN ─────────────────────────
def main(write=True):
    base = 'data/greek'
    # nominali dal corpus
    gen_nom = {}
    parsed = skipped = 0
    for f in sorted(os.listdir(base)):
        if not f.endswith('.json') or f.startswith('_'): continue
        data = json.load(open(os.path.join(base, f), encoding='utf-8'))
        for lemma, e in (data.get('dict') or {}).items():
            if not isinstance(e, dict): continue
            if e.get('pos') not in ('sostantivo', ''): continue
            cl = classify_nominal(lemma, e.get('definition', ''))
            if not cl and lemma in NOMINAL_EXTRA:
                lem_base = strip_acc(lemma)
                k = NOMINAL_EXTRA[lemma]
                cl = (k, lem_base[:-2] if k in ('2', '2n') else lem_base[:-1])
            if not cl: skipped += 1; continue
            parsed += 1
            for form, parsing in gen_nominal(lemma, cl[0], cl[1]).items():
                gen_nom.setdefault(form, []).append((lemma, parsing))
    # verbi dalla tavola curata
    gen_vrb = {}
    for lemma, v in VERBS.items():
        try:
            for form, parsing in gen_verb(lemma, v).items():
                if not form or len(N(form)) < 2: continue
                gen_vrb.setdefault(form, []).append((lemma, parsing))
        except Exception as ex:
            print(f'  [!] {lemma}: {ex}')
    print(f'nominali: classificati {parsed} (saltati {skipped}) → {len(gen_nom)} forme')
    print(f'verbi: {len(VERBS)} paradigmi → {len(gen_vrb)} forme')
    if not write:
        return gen_nom, gen_vrb
    # fusione negli shard
    allgen = collections.defaultdict(list)
    for d in (gen_nom, gen_vrb):
        for form, cands in d.items():
            allgen[form].extend(cands)
    by_letter = collections.defaultdict(dict)
    for form, cands in allgen.items():
        letter = N(form)[:1]
        by_letter[letter][form] = cands
    added = 0
    for letter, forms in sorted(by_letter.items()):
        path = os.path.join(base, f'{letter}.json')
        if not os.path.exists(path): continue
        data = json.load(open(path, encoding='utf-8'))
        fdict = data.setdefault('forms', {})
        changed = False
        for form, cands in forms.items():
            existing = fdict.get(form)
            if existing is None:
                fdict[form] = [ {'lemma': l, 'parsing': p} for l, p in cands[:3] ]
                added += len(fdict[form]); changed = True
            else:
                have = { c['lemma'] for c in existing }
                for l, p in cands[:3]:
                    if l not in have:
                        existing.append({'lemma': l, 'parsing': p}); added += 1; changed = True
                    else:
                        for c in existing:
                            if c['lemma'] == l and not c.get('parsing'):
                                c['parsing'] = p; changed = True
        if changed:
            data.setdefault('meta', {})['forms_count'] = len(fdict)
            json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'fusione: +{added} candidati forma→lemma negli shard')

if __name__ == '__main__':
    main(write='--dry' not in sys.argv)
