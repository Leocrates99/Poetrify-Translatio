# -*- coding: utf-8 -*-
"""Motore di accentazione del greco antico — unica fonte di verità per le tabelle.

QUANTITÀ VOCALICHE
    η ω           → sempre lunghe
    ε ο           → sempre brevi
    dittonghi     → lunghi (‑αι/‑οι FINALI contano brevi per l'accento, tranne ott.)
    α ι υ (dichrona) → dal lessico/regole (LONG_DICHRON, suffissi); default breve

LEGGI D'ACCENTO
    · limitazione (trisillabica): con ultima lunga l'accento non va oltre la penultima
    · properispomeno: penultima LUNGA + ultima BREVE → circonflesso
    · ossitoni 1ª/2ª decl.: circonflesso al gen./dat. (τιμῆς, θεοῦ)
    · gen. pl. 1ª decl. (e ‑εσ): sempre ‑ῶν
    · metatesi quantitativa attica: πόλεως/πόλεων tengono la proparossitona

Il motore è self‑contained (nessuna dipendenza dai generatori) e viene usato sia
da gk_noun_table (paradigmi segmentati) sia da gen_nominal (indice piatto): così
le due tavole restano identiche per costruzione.
"""
import unicodedata, re

VOWELS = 'αεηιουω'
LONG_V = 'ηω'
SHORT_V = 'εο'
DICHRONA = 'αιυ'
DIPHTH = {'αι', 'ει', 'οι', 'υι', 'αυ', 'ευ', 'ου', 'ηυ'}
ACUTE, CIRCUM, GRAVE, IOTA_SUB = '́', '͂', '̀', 'ͅ'
BREATH = {'̓', '̔'}          # spirito dolce / aspro
ACCENTS = {ACUTE, CIRCUM, GRAVE}

def nfc(s): return unicodedata.normalize('NFC', s)
def base(s):  # sole lettere nude, minuscole
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if not unicodedata.combining(c))
def strip_accents(s):  # toglie SOLO gli accenti; conserva spiriti e iota sottoscritto
    keep = BREATH | {IOTA_SUB}
    return nfc(''.join(c for c in unicodedata.normalize('NFD', s)
                       if not unicodedata.combining(c) or c in keep))

# ─────────────────────────── nuclei e posizione ───────────────────────────
def syllable_nuclei(word):
    """[(start, len, is_long)] da sinistra; is_long deterministico:
    η/ω/dittongo = True, ε/ο/dichron = False (i dichrona lunghi si risolvono altrove)."""
    b = base(word); out = []; i = 0
    while i < len(b):
        two = b[i:i+2]
        if two in DIPHTH:
            out.append((i, 2, True)); i += 2; continue
        if b[i] in VOWELS:
            out.append((i, 1, b[i] in LONG_V)); i += 1; continue
        i += 1
    return out

def place_accent(word, idx_from_end, circum=False):
    """Applica acuto (o circonflesso) sul nucleo idx_from_end (1 = ultima)."""
    nfd = unicodedata.normalize('NFD', word)
    nuc = []
    j = 0
    while j < len(nfd):
        c = nfd[j]
        if c in VOWELS:
            k = j + 1
            while k < len(nfd) and unicodedata.combining(nfd[k]): k += 1
            if k < len(nfd) and c + nfd[k] in DIPHTH:
                nuc.append(k); j = k + 1; continue
            nuc.append(j); j += 1
        else:
            j += 1
    if not nuc: return word
    if idx_from_end > len(nuc): idx_from_end = len(nuc)
    if idx_from_end <= 0: return word
    target = nuc[-idx_from_end]
    mark = CIRCUM if circum else ACUTE
    k = target + 1
    while k < len(nfd) and unicodedata.combining(nfd[k]): k += 1
    return nfc(nfd[:k] + mark + nfd[k:])

def lemma_accent_dist(lemma):
    """Distanza (sillabe dalla fine) dell'accento del lemma; rispetta i confini
    consonantici (ο..ι di πόλις NON è dittongo)."""
    nfd = unicodedata.normalize('NFD', lemma)
    accented = []; i, n = 0, len(nfd)
    while i < n:
        c = nfd[i]
        if c.lower() in VOWELS:
            has = False; j = i + 1
            while j < n and unicodedata.combining(nfd[j]):
                if nfd[j] in ACCENTS: has = True
                j += 1
            if j < n and nfd[j].lower() in VOWELS and (c.lower() + nfd[j].lower()) in DIPHTH:
                j += 1
                while j < n and unicodedata.combining(nfd[j]):
                    if nfd[j] in ACCENTS: has = True
                    j += 1
            accented.append(has); i = j
        else:
            i += 1
    for idx in range(len(accented)):
        if accented[idx]:
            return len(accented) - idx
    return 2

def recessive(word, opt=False):
    """Accento recessivo (verbi finiti): il più indietro possibile, con acuto o
    circonflesso secondo la quantità dell'ultima."""
    w = strip_accents(word)
    nuc = syllable_nuclei(w)
    if not nuc: return w
    if len(nuc) == 1: return place_accent(w, 1)
    st, ln, isL = nuc[-1]
    ultima = base(w)[st:st+ln]
    ultima_long = isL
    if ultima in ('αι', 'οι') and not opt:
        ultima_long = False
    if ultima_long or len(nuc) == 2:
        # penultima accentata: circonflesso se penult. lunga + ultima breve
        pen_long = nuc[-2][2]
        circ = pen_long and not ultima_long and len(nuc) >= 2
        return place_accent(w, 2, circum=circ)
    return place_accent(w, 3)

# ─────────────────────── quantità dei dichrona (lessico + inferenza) ───────────
# Dichrona (α/ι/υ) LUNGHI nei temi. Risoluzione a cascata:
#   1) INFERENZA dal lemma: un dichron che porta il CIRCONFLESSO nel lemma è per
#      forza lungo (μῦθος → υ lunga → μῦθον/μῦθοι col circonflesso);
#   2) REGOLE di suffisso produttivo (-ῑτης agentivo/etnico → ι lunga);
#   3) LESSICO curato (estendibile) per i casi residui a penultima acuta;
#   altrimenti → breve (errore sempre «acuto invece di circonflesso», mai lettere).
LONG_DICHRON = {
    # dichron lungo a penultima ACUTA (non deducibile dal lemma né dal suffisso)
    'πατρίς', 'ἐλευθερία', 'σωτηρία',
}
_LONG_DICHRON_B = {base(x) for x in LONG_DICHRON}

def _lemma_long_dichra(lemma):
    """Insieme dei dichrona (α/ι/υ) che portano il CIRCONFLESSO nel lemma → lunghi."""
    nfd = unicodedata.normalize('NFD', lemma.lower()); out = set(); i = 0
    while i < len(nfd):
        c = nfd[i]
        if c in DICHRONA:
            j = i + 1; circ = False
            while j < len(nfd) and unicodedata.combining(nfd[j]):
                if nfd[j] == CIRCUM: circ = True
                j += 1
            if circ: out.add(c)
            i = j; continue
        i += 1
    return out

def _dichron_long(lemma, vowel):
    """La vocale dichron della penultima è lunga? (inferenza + regole + lessico)."""
    if vowel in _lemma_long_dichra(lemma):                 # 1) circonflesso nel lemma
        return True
    lb = base(lemma)
    if vowel == 'ι' and (lb.endswith('ιτης') or lb.endswith('ιτις') or lb.endswith('ιτου')):
        return True                                        # 2) suffisso -ῑτης
    if lb in _LONG_DICHRON_B:                              # 3) lessico curato
        return True
    return False

def penult_long(lemma, plain, nuc=None):
    """La penultima è lunga? (η/ω/dittongo deterministici; dichrona dal lessico)."""
    if nuc is None: nuc = syllable_nuclei(plain)
    if len(nuc) < 2: return False
    st, ln, isL = nuc[-2]
    if isL: return True
    v = base(plain)[st:st+ln]
    return v in DICHRONA and _dichron_long(lemma, v)

# ─────────────────────── quantità delle desinenze nominali ───────────────────────
# Lunghezza dell'ultima per (classe, uscita): distingue ᾰ breve (σῶμα) da ᾱ lunga
# (χώρα). Le uscite del gen. pl. -ῶν (1ª decl. e -εσ) sono gestite a parte (NOM_GPL).
NOM_ULT = {
 '2':  {'ος':0,'ου':1,'ῳ':1,'ον':0,'ε':0,'οι':0,'ων':1,'οις':1,'ους':1},
 '2n': {'ον':0,'ου':1,'ῳ':1,'α':0,'ων':1,'οις':1},
 '1h': {'η':1,'ης':1,'ῃ':1,'ην':1,'αι':0,'αις':1,'ας':1},
 '1a': {'α':1,'ας':1,'ᾳ':1,'αν':1,'αι':0,'αις':1},
 '1am':{'α':0,'ης':1,'ῃ':1,'αν':0,'αι':0,'αις':1,'ας':1},
 '1m': {'ης':1,'ου':1,'ῃ':1,'ην':1,'αι':0,'αις':1,'ας':1,'α':0},
 'ma': {'α':0,'ατος':0,'ατι':0,'ατα':0,'ατων':1,'ασι':0,'ασιν':0},
 'es': {'ος':0,'ους':1,'ει':1,'η':1,'εσι':0},
 'is': {'ις':0,'ει':1,'ιν':0,'ι':0,'εις':1,'εσι':0},
 '3':  {'ος':0,'ι':0,'α':0,'ες':0,'ων':1,'ας':0},
}
NOM_GPL = {'1h', '1a', '1am', '1m', 'es'}          # gen. pl. → -ῶν
NOM_FORCE3 = {('is', 'εως'), ('is', 'εων')}         # metatesi quantitativa (πόλεως)
_ULT_FB = re.compile(r'(η|ω|ου|ῳ|ῃ|αις|οις|ους|εως|εων)$')  # fallback: senza 'ας' (ambigua)

def nominal_idx_start(lemma):
    return max(0, len(syllable_nuclei(lemma)) - lemma_accent_dist(lemma))

def accent_nominal(lemma, klass, form, ending, gendat, idx_start):
    """Forma nominale accentata. `form` = forma piena non accentata (per i temi
    assimilati come il dat. pl. 3ª, φύλαξι ≠ tema+desinenza); `ending` serve solo a
    classificare l'uscita; `idx_start` = posizione (dall'inizio) dell'accento
    persistente del lemma; `gendat` = True per gen./dat. (regola degli ossitoni)."""
    plain = nfc(form)
    if ending == 'ων' and klass in NOM_GPL:                 # gen. pl. -ῶν
        return nfc(strip_accents(plain)[:-2] + 'ῶν')
    force = 3 if (klass, ending) in NOM_FORCE3 else None
    ul = NOM_ULT.get(klass, {}).get(ending)
    if ul is None:
        ul = 1 if _ULT_FB.search(base(plain)) else 0
    nuc = syllable_nuclei(plain)
    n = len(nuc)
    if force:
        d = min(force, n)
    else:
        maxd = 2 if ul else 3
        d = max(1, min(n - idx_start, maxd, n))
    if d == 1:
        circ = bool(ul) and gendat                          # ossitono: gen./dat.
    elif d == 2:
        circ = penult_long(lemma, plain, nuc) and not ul     # properispomeno
    else:
        circ = False
    return place_accent(strip_accents(plain), d, circum=circ)
