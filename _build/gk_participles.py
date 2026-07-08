# -*- coding: utf-8 -*-
"""Participi greci DECLINATI e segmentati, derivati dai principi (testa), per
tutti i verbi di gen_greek_forms.VERBS. Portati dal laboratorio (grk_ptc.py):
gli archetipi -οντ/-αντ/-εντ/-οτ (persistente o fisso) e -μενος (2-1-2), accentati
da accentuation.place_accent. I temi si ricavano da pres/fut/aor/pf/aorp; contratti,
2º aoristo, 2º passivo, 2º perfetto, -μι e radicali hanno trattamento dedicato.
Regola ferrea: mai una forma sbagliata → derivazioni incerte cadono in fallback.

Cella = [[testo, ruolo], …]  ruoli: a=raddoppiamento · t=tema · s=marcatore(σ/θ/κ) ·
v=vocale(tematica/contratta) · d=desinenza.  Output: {tempo:{diatesi:{m,f,n:{sg,pl:{caso:cella}}}}}."""
import unicodedata
from accentuation import place_accent, syllable_nuclei, strip_accents, nfc, long_dichra

C5 = ['nom', 'gen', 'dat', 'acc', 'voc']

# ── desinenze (senza marcatore σ/θ/κ) — ordine casi C5, (sg, pl) ──
E_ONT = {'m': [('ων','οντες'),('οντος','οντων'),('οντι','ουσι'),('οντα','οντας'),('ων','οντες')],
         'f': [('ουσα','ουσαι'),('ουσης','ουσων'),('ουσῃ','ουσαις'),('ουσαν','ουσας'),('ουσα','ουσαι')],
         'n': [('ον','οντα'),('οντος','οντων'),('οντι','ουσι'),('ον','οντα'),('ον','οντα')]}
E_ANT = {'m': [('ας','αντες'),('αντος','αντων'),('αντι','ασι'),('αντα','αντας'),('ας','αντες')],
         'f': [('ασα','ασαι'),('ασης','ασων'),('ασῃ','ασαις'),('ασαν','ασας'),('ασα','ασαι')],
         'n': [('αν','αντα'),('αντος','αντων'),('αντι','ασι'),('αν','αντα'),('αν','αντα')]}
E_ENT = {'m': [('εις','εντες'),('εντος','εντων'),('εντι','εισι'),('εντα','εντας'),('εις','εντες')],
         'f': [('εισα','εισαι'),('εισης','εισων'),('εισῃ','εισαις'),('εισαν','εισας'),('εισα','εισαι')],
         'n': [('εν','εντα'),('εντος','εντων'),('εντι','εισι'),('εν','εντα'),('εν','εντα')]}
E_OT  = {'m': [('ως','οτες'),('οτος','οτων'),('οτι','οσι'),('οτα','οτας'),('ως','οτες')],
         'f': [('υια','υιαι'),('υιας','υιων'),('υιᾳ','υιαις'),('υιαν','υιας'),('υια','υιαι')],
         'n': [('ος','οτα'),('οτος','οτων'),('οτι','οσι'),('ος','οτα'),('ος','οτα')]}
E212  = {'m': [('ος','οι'),('ου','ων'),('ῳ','οις'),('ον','ους'),('ε','οι')],
         'f': [('η','αι'),('ης','ων'),('ῃ','αις'),('ην','ας'),('η','αι')],
         'n': [('ον','α'),('ου','ων'),('ῳ','οις'),('ον','α'),('ον','α')]}

def _short_final(p): return p[-2:] in ('αι', 'οι')
def _place(plain, d, circ): return nfc(place_accent(strip_accents(plain), d, circ))

def _obj(flex): return flex   # {m:{sg,pl},f,n}

def consptc(redup, stem, marker, E, mode, stem_long=False, aor=False):
    """Tema consonantico -οντ/-αντ/-εντ/-οτ + femminile di 1ª decl."""
    la, lt, ls = len(redup), len(stem), len(marker)
    ss = len(syllable_nuclei(redup + stem))
    flex = {}
    for g in ('m', 'f', 'n'):
        sg, pl = {}, {}
        for ci, case in enumerate(C5):
            for num, coll in ((0, sg), (1, pl)):
                end = E[g][ci][num]; plain = redup + stem + marker + end
                if g == 'f' and case == 'gen' and num == 1:
                    d, circ = 1, True
                else:
                    nuc = syllable_nuclei(plain); n = len(nuc)
                    ul = nuc[n-1][2] and not _short_final(plain)
                    pen = nuc[n-2][2] if n >= 2 else False
                    d = (n - ss) if mode == 'fixed' else min(n - ss + 1, 2 if ul else 3)
                    circ = (d == 2 and pen and not ul)
                    if stem_long and g == 'n' and case in ('nom', 'acc') and num == 0:
                        circ = True
                    if aor and g == 'm' and case in ('nom', 'voc') and num == 0:
                        circ = False
                acc = _place(plain, d, circ)
                i = 0; segs = []
                if la: segs.append([acc[i:i+la], 'a']); i += la
                segs.append([acc[i:i+lt], 't']); i += lt
                if ls: segs.append([acc[i:i+ls], 's']); i += ls
                if acc[i:]: segs.append([acc[i:], 'd'])
                coll[case] = segs
        flex[g] = {'sg': sg, 'pl': pl}
    return _obj(flex)

def menosptc(redup, stem, themv, mode):
    """Medio/m.-p. in -μενος (2-1-2). themv = vocale tematica/contratta."""
    la, lt, lv = len(redup), len(stem), len(themv)
    base = redup + stem + themv
    ss = len(syllable_nuclei(base if mode == 'persist' else redup + stem))
    flex = {}
    for g in ('m', 'f', 'n'):
        sg, pl = {}, {}
        for ci, case in enumerate(C5):
            for num, coll in ((0, sg), (1, pl)):
                end = 'μεν' + E212[g][ci][num]; plain = base + end
                nuc = syllable_nuclei(plain); n = len(nuc)
                ul = nuc[n-1][2] and not _short_final(plain)
                pen = nuc[n-2][2] if n >= 2 else False
                d = (n - ss) if mode == 'fixed' else min(n - ss + 1, 2 if ul else 3)
                circ = (d == 2 and pen and not ul)
                acc = _place(plain, d, circ)
                i = 0; segs = []
                if la: segs.append([acc[i:i+la], 'a']); i += la
                segs.append([acc[i:i+lt], 't']); i += lt
                if lv: segs.append([acc[i:i+lv], 'v']); i += lv
                segs.append([acc[i:], 'd'])
                coll[case] = segs
        flex[g] = {'sg': sg, 'pl': pl}
    return _obj(flex)

# ── participio presente CONTRATTO (schemi -άω e -έω/-όω), segmentato [t:tema][v:contratta][d] ──
_CA = {'m': [('ῶν','ῶντες'),('ῶντος','ώντων'),('ῶντι','ῶσι'),('ῶντα','ῶντας'),('ῶν','ῶντες')],
       'f': [('ῶσα','ῶσαι'),('ώσης','ωσῶν'),('ώσῃ','ώσαις'),('ῶσαν','ώσας'),('ῶσα','ῶσαι')],
       'n': [('ῶν','ῶντα'),('ῶντος','ώντων'),('ῶντι','ῶσι'),('ῶν','ῶντα'),('ῶν','ῶντα')]}
_CEO = {'m': [('ῶν','οῦντες'),('οῦντος','ούντων'),('οῦντι','οῦσι'),('οῦντα','οῦντας'),('ῶν','οῦντες')],
        'f': [('οῦσα','οῦσαι'),('ούσης','ουσῶν'),('ούσῃ','ούσαις'),('οῦσαν','ούσας'),('οῦσα','οῦσαι')],
        'n': [('οῦν','οῦντα'),('οῦντος','ούντων'),('οῦντι','οῦσι'),('οῦν','οῦντα'),('οῦν','οῦντα')]}
def contr_pres_att(stem, kind):
    E = _CA if kind == 'a' else _CEO
    flex = {}
    for g in ('m', 'f', 'n'):
        sg, pl = {}, {}
        for ci, case in enumerate(C5):
            for num, coll in ((0, sg), (1, pl)):
                w = nfc(stem + E[g][ci][num])
                # split [t:stem][v:vocale contratta iniziale][d:resto]
                rest = w[len(stem):]
                # la vocale contratta = primo blocco vocalico del resto
                vlen = 1
                if len(rest) >= 2 and rest[1] in 'ῦῖΰ ιυ' + 'υ': vlen = 2 if rest[:2] in ('οῦ','ου') else 1
                if rest[:2] in ('οῦ', 'ου'): vlen = 2
                coll[case] = [[stem, 't'], [rest[:vlen], 'v']] + ([[rest[vlen:], 'd']] if rest[vlen:] else [])
        flex[g] = {'sg': sg, 'pl': pl}
    return flex

# ── override per i pochi verbi irregolari (presente -μι e aoristi radicali/kappa) ──
def _authored(stem, tbl):
    lt = len(stem); flex = {}
    for g in ('m', 'f', 'n'):
        sg, pl = {}, {}
        for ci, case in enumerate(C5):
            for num, coll in ((0, sg), (1, pl)):
                w = tbl[g][ci][num]
                coll[case] = [[w[:lt], 't']] + ([[w[lt:], 'd']] if w[lt:] else [])
        flex[g] = {'sg': sg, 'pl': pl}
    return flex

# presente attivo dei verbi in -μι (nom/gen/dat/acc/voc × sg/pl), scritti a mano
MI_PRES_ATT = {
 'δίδωμι': {'m':[('διδούς','διδόντες'),('διδόντος','διδόντων'),('διδόντι','διδοῦσι'),('διδόντα','διδόντας'),('διδούς','διδόντες')],
            'f':[('διδοῦσα','διδοῦσαι'),('διδούσης','διδουσῶν'),('διδούσῃ','διδούσαις'),('διδοῦσαν','διδούσας'),('διδοῦσα','διδοῦσαι')],
            'n':[('διδόν','διδόντα'),('διδόντος','διδόντων'),('διδόντι','διδοῦσι'),('διδόν','διδόντα'),('διδόν','διδόντα')]},
 'τίθημι': {'m':[('τιθείς','τιθέντες'),('τιθέντος','τιθέντων'),('τιθέντι','τιθεῖσι'),('τιθέντα','τιθέντας'),('τιθείς','τιθέντες')],
            'f':[('τιθεῖσα','τιθεῖσαι'),('τιθείσης','τιθεισῶν'),('τιθείσῃ','τιθείσαις'),('τιθεῖσαν','τιθείσας'),('τιθεῖσα','τιθεῖσαι')],
            'n':[('τιθέν','τιθέντα'),('τιθέντος','τιθέντων'),('τιθέντι','τιθεῖσι'),('τιθέν','τιθέντα'),('τιθέν','τιθέντα')]},
 'ἵστημι': {'m':[('ἱστάς','ἱστάντες'),('ἱστάντος','ἱστάντων'),('ἱστάντι','ἱστᾶσι'),('ἱστάντα','ἱστάντας'),('ἱστάς','ἱστάντες')],
            'f':[('ἱστᾶσα','ἱστᾶσαι'),('ἱστάσης','ἱστασῶν'),('ἱστάσῃ','ἱστάσαις'),('ἱστᾶσαν','ἱστάσας'),('ἱστᾶσα','ἱστᾶσαι')],
            'n':[('ἱστάν','ἱστάντα'),('ἱστάντος','ἱστάντων'),('ἱστάντι','ἱστᾶσι'),('ἱστάν','ἱστάντα'),('ἱστάν','ἱστάντα')]},
 'δείκνυμι': {'m':[('δεικνύς','δεικνύντες'),('δεικνύντος','δεικνύντων'),('δεικνύντι','δεικνῦσι'),('δεικνύντα','δεικνύντας'),('δεικνύς','δεικνύντες')],
              'f':[('δεικνῦσα','δεικνῦσαι'),('δεικνύσης','δεικνυσῶν'),('δεικνύσῃ','δεικνύσαις'),('δεικνῦσαν','δεικνύσας'),('δεικνῦσα','δεικνῦσαι')],
              'n':[('δεικνύν','δεικνύντα'),('δεικνύντος','δεικνύντων'),('δεικνύντι','δεικνῦσι'),('δεικνύν','δεικνύντα'),('δεικνύν','δεικνύντα')]},
 'ἵημι': {'m':[('ἱείς','ἱέντες'),('ἱέντος','ἱέντων'),('ἱέντι','ἱεῖσι'),('ἱέντα','ἱέντας'),('ἱείς','ἱέντες')],
          'f':[('ἱεῖσα','ἱεῖσαι'),('ἱείσης','ἱεισῶν'),('ἱείσῃ','ἱείσαις'),('ἱεῖσαν','ἱείσας'),('ἱεῖσα','ἱεῖσαι')],
          'n':[('ἱέν','ἱέντα'),('ἱέντος','ἱέντων'),('ἱέντι','ἱεῖσι'),('ἱέν','ἱέντα'),('ἱέν','ἱέντα')]},
}
# aoristo attivo radicale/kappa (δούς, θείς, εἵς, βάς, γνούς, στάς) — nom/gen sg m come guida; declino via consptc su base ridotta
MI_AOR_ATT_STEM = {'δίδωμι': ('δ','ο'), 'τίθημι': ('θ','ε'), 'ἵημι': ('','ἑ'),   # base+vocale → E "-οντ/-εντ" radicale
                   'βαίνω': ('β','α'), 'γιγνώσκω': ('γν','ο'), 'ἵστημι': ('στ','α')}

def _seg_from(word, lt, ls=0, la=0):
    i = 0; segs = []
    if la: segs.append([word[:la], 'a']); i = la
    segs.append([word[i:i+lt], 't']); i += lt
    if ls: segs.append([word[i:i+ls], 's']); i += ls
    if word[i:]: segs.append([word[i:], 'd'])
    return segs

def _deaug(form):
    """toglie l'aumento sillabico ἐ- o l'allungamento iniziale; ritorna il tema nudo (senza accenti)."""
    s = strip_accents(form)
    if s and s[0] in 'ἐἑἠἡ' and len(s) > 1: return s[1:]   # ἐ-/ε- augment
    return s

def _base(s): return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if not unicodedata.combining(c))

def participles(lemma, v):
    """Ritorna {tempo:{diatesi:{m,f,n}}} coi participi declinati derivabili con sicurezza."""
    out = {}
    contract = v.get('contract'); dep = v.get('dep'); at = str(v.get('aor_type') or '')
    is_mi = lemma.endswith('μι')
    ld = long_dichra(lemma)
    def stem_long(stem):
        b = _base(stem)
        if not b: return False
        if b[-1] == 'υ': return True          # tema in -υ dei verbi in -ύω: υ (quasi sempre) lungo → λῦον, θῦον
        return b[-1] in 'αι' and b[-1] in ld

    # ── PRESENTE ──
    try:
        pres = strip_accents(v['pres'])
        d = {}
        if is_mi and lemma in MI_PRES_ATT:
            d['att'] = _authored('', MI_PRES_ATT[lemma]) if False else _authored(
                {'δίδωμι':'διδ','τίθημι':'τιθ','ἵστημι':'ἱστ','δείκνυμι':'δεικν','ἵημι':'ἱ'}[lemma], MI_PRES_ATT[lemma])
            th = {'δίδωμι':('διδ','ο'),'τίθημι':('τιθ','ε'),'ἵστημι':('ἱστ','α'),'δείκνυμι':('δεικν','υ'),'ἵημι':('ἱ','ε')}[lemma]
            d['mp'] = menosptc('', th[0], th[1], 'persist')
        elif contract:
            st = pres[:-1]; kind = 'a' if contract == 'α' else 'eo'
            if not dep: d['att'] = contr_pres_att(st, kind)
            d['mp'] = menosptc('', st, 'ω' if contract == 'α' else 'ου', 'persist')
        else:
            if not dep: d['att'] = consptc('', pres, '', E_ONT, 'persist', stem_long=stem_long(pres))
            d['mp'] = menosptc('', pres, 'ο', 'persist')
        if d: out['pres'] = d
    except Exception: pass

    # ── FUTURO ──
    try:
        if v.get('fut'):
            fut = strip_accents(v['fut']); d = {}
            if fut.endswith('~'):                          # futuro contratto (liquido) → schema -έω
                fs = fut[:-1]
                if not dep: d['att'] = contr_pres_att(fs, 'eo')
                d['mid'] = menosptc('', fs, 'ου', 'persist')
            else:                                          # futuro sigmatico
                base = fut[:-1] if fut.endswith('σ') else fut
                mk = 'σ' if fut.endswith('σ') else ''
                if not dep: d['att'] = consptc('', base, mk, E_ONT, 'persist', stem_long=stem_long(base))
                d['mid'] = menosptc('', fut, 'ο', 'persist')
            # futuro passivo: tema del passivo + ησ
            if v.get('aorp'):
                pst, marker = _passive_stem(v['aorp'])
                d['pass'] = menosptc('', pst + marker + 'ησ', 'ο', 'persist')
            if d: out['fut'] = d
    except Exception: pass

    # ── AORISTO ──
    try:
        d = {}
        if at == '1' or at == '1m':
            ast = _deaug(v['aor'])                     # ἔλυσα → λυσα ; ἔγραψα → γραψα
            astem = ast[:-1] if ast.endswith('α') else ast    # tema aoristo: λυσ / γραψ
            if astem.endswith('σ'): base, mk = astem[:-1], 'σ'    # λυσ → λυ + σ
            else: base, mk = astem, ''                            # γραψ/ταξ: σ già fuso
            if at == '1' and not dep: d['att'] = consptc('', base, mk, E_ANT, 'persist', aor=True, stem_long=stem_long(base))
            d['mid'] = menosptc('', astem, 'α', 'persist')
        elif at.startswith('2:') or at.startswith('2m:'):
            st = at.split(':', 1)[1]
            if at.startswith('2:') and not dep: d['att'] = consptc('', st, '', E_ONT, 'fixed')   # λιπών (ossitono)
            d['mid'] = menosptc('', st, 'ο', 'persist')
        elif at.startswith('root:') or at.startswith('kappa:'):
            if lemma in MI_AOR_ATT_STEM:
                b, vw = MI_AOR_ATT_STEM[lemma]
                # radicale: base=b, vocale tematica lunga → E_ONT/E_ANT? uso -ντ- su b+vocale
                if not dep: d['att'] = _root_aor_att(lemma)
                if lemma in ('δίδωμι','τίθημι','ἵημι'):
                    thv = {'δίδωμι':'ο','τίθημι':'ε','ἵημι':'ε'}[lemma]; rb = {'δίδωμι':'δ','τίθημι':'θ','ἵημι':''}[lemma]
                    d['mid'] = menosptc('', rb, thv, 'persist')
        # passivo aoristo
        if v.get('aorp'):
            pst, marker = _passive_stem(v['aorp'])
            d['pass'] = consptc('', pst, marker, E_ENT, 'fixed')
        if d: out['aor'] = d
    except Exception: pass

    # ── PERFETTO ──
    try:
        d = {}
        if v.get('pf'):
            redup, pstem, mk = _perfect_stem(v['pf'])
            if pstem is not None:
                d['att'] = consptc(redup, pstem, mk, E_OT, 'fixed')
        if v.get('pfmp'):
            redup, pstem = _pfmp_stem(v['pfmp'])
            if pstem is not None:
                d['mp'] = menosptc(redup, pstem, '', 'fixed')
        if d: out['pf'] = d
    except Exception: pass

    # sfronda le diatesi vuote / incoerenti
    return {t: {vc: fx for vc, fx in dd.items() if fx} for t, dd in out.items() if dd}

def _passive_stem(aorp):
    """ἐλύθην → ('λυ','θ') ; ἐγράφην → ('γραφ','') — tema + marcatore θ (1º) o '' (2º)."""
    s = _deaug(aorp)
    core = s[:-2] if s.endswith('ην') else s        # toglie -ην
    if core.endswith('θ'): return core[:-1], 'θ'
    return core, ''

def _perfect_stem(pf):
    """λέλυκα → ('λε','λυ','κ') ; γέγραφα → ('γε','γραφ','') — raddopp, tema, marcatore κ."""
    s = _deaug_perf(pf)
    core = s[:-1] if s.endswith('α') else s          # toglie -α
    b = _base(core)
    redup = ''
    if len(b) >= 3 and b[1] == 'ε' and b[0] == b[2]:
        redup = core[:2]; core = core[2:]
    if core.endswith('κ'): return redup, core[:-1], 'κ'
    return redup, core, ''

def _pfmp_stem(pfmp):
    """λέλυμαι → ('λε','λυ')."""
    s = _deaug_perf(pfmp)
    core = s[:-3] if s.endswith('μαι') else s
    b = _base(core); redup = ''
    if len(b) >= 3 and b[1] == 'ε' and b[0] == b[2]:
        redup = core[:2]; core = core[2:]
    return redup, core

def _deaug_perf(form):
    return strip_accents(form)   # il perfetto porta il raddoppiamento, non l'aumento: niente de-augment

# participi aoristi radicali/kappa scritti a mano (nom/gen/dat/acc/voc × sg/pl)
_ROOT_AOR = {
 'δίδωμι': {'m':[('δούς','δόντες'),('δόντος','δόντων'),('δόντι','δοῦσι'),('δόντα','δόντας'),('δούς','δόντες')],
            'f':[('δοῦσα','δοῦσαι'),('δούσης','δουσῶν'),('δούσῃ','δούσαις'),('δοῦσαν','δούσας'),('δοῦσα','δοῦσαι')],
            'n':[('δόν','δόντα'),('δόντος','δόντων'),('δόντι','δοῦσι'),('δόν','δόντα'),('δόν','δόντα')]},
 'τίθημι': {'m':[('θείς','θέντες'),('θέντος','θέντων'),('θέντι','θεῖσι'),('θέντα','θέντας'),('θείς','θέντες')],
            'f':[('θεῖσα','θεῖσαι'),('θείσης','θεισῶν'),('θείσῃ','θείσαις'),('θεῖσαν','θείσας'),('θεῖσα','θεῖσαι')],
            'n':[('θέν','θέντα'),('θέντος','θέντων'),('θέντι','θεῖσι'),('θέν','θέντα'),('θέν','θέντα')]},
 'ἵημι': {'m':[('εἵς','ἕντες'),('ἕντος','ἕντων'),('ἕντι','εἷσι'),('ἕντα','ἕντας'),('εἵς','ἕντες')],
          'f':[('εἷσα','εἷσαι'),('εἵσης','εἱσῶν'),('εἵσῃ','εἵσαις'),('εἷσαν','εἵσας'),('εἷσα','εἷσαι')],
          'n':[('ἕν','ἕντα'),('ἕντος','ἕντων'),('ἕντι','εἷσι'),('ἕν','ἕντα'),('ἕν','ἕντα')]},
 'βαίνω': {'m':[('βάς','βάντες'),('βάντος','βάντων'),('βάντι','βᾶσι'),('βάντα','βάντας'),('βάς','βάντες')],
           'f':[('βᾶσα','βᾶσαι'),('βάσης','βασῶν'),('βάσῃ','βάσαις'),('βᾶσαν','βάσας'),('βᾶσα','βᾶσαι')],
           'n':[('βάν','βάντα'),('βάντος','βάντων'),('βάντι','βᾶσι'),('βάν','βάντα'),('βάν','βάντα')]},
 'γιγνώσκω': {'m':[('γνούς','γνόντες'),('γνόντος','γνόντων'),('γνόντι','γνοῦσι'),('γνόντα','γνόντας'),('γνούς','γνόντες')],
              'f':[('γνοῦσα','γνοῦσαι'),('γνούσης','γνουσῶν'),('γνούσῃ','γνούσαις'),('γνοῦσαν','γνούσας'),('γνοῦσα','γνοῦσαι')],
              'n':[('γνόν','γνόντα'),('γνόντος','γνόντων'),('γνόντι','γνοῦσι'),('γνόν','γνόντα'),('γνόν','γνόντα')]},
 'ἵστημι': {'m':[('στάς','στάντες'),('στάντος','στάντων'),('στάντι','στᾶσι'),('στάντα','στάντας'),('στάς','στάντες')],
            'f':[('στᾶσα','στᾶσαι'),('στάσης','στασῶν'),('στάσῃ','στάσαις'),('στᾶσαν','στάσας'),('στᾶσα','στᾶσαι')],
            'n':[('στάν','στάντα'),('στάντος','στάντων'),('στάντι','στᾶσι'),('στάν','στάντα'),('στάν','στάντα')]},
}
def _root_aor_att(lemma):
    tbl = _ROOT_AOR[lemma]
    # tema per la segmentazione (parte prima della desinenza): usa la radice nota
    lt = {'δίδωμι':1,'τίθημι':1,'ἵημι':1,'βαίνω':1,'γιγνώσκω':2,'ἵστημι':2}[lemma]
    flex = {}
    for g in ('m','f','n'):
        sg, pl = {}, {}
        for ci, case in enumerate(C5):
            for num, coll in ((0,sg),(1,pl)):
                w = tbl[g][ci][num]
                coll[case] = [[w[:lt],'t']] + ([[w[lt:],'d']] if w[lt:] else [])
        flex[g] = {'sg':sg,'pl':pl}
    return flex

def surface(cell): return ''.join(s[0] for s in cell)

if __name__ == '__main__':
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from gen_greek_forms import VERBS
    # gold: nominativo maschile sg per tempo/diatesi, su verbi di tipi diversi
    GOLD = {
      'λύω': {('pres','att'):'λύων',('pres','mp'):'λυόμενος',('fut','att'):'λύσων',('fut','mid'):'λυσόμενος',
              ('fut','pass'):'λυθησόμενος',('aor','att'):'λύσας',('aor','mid'):'λυσάμενος',('aor','pass'):'λυθείς',
              ('pf','att'):'λελυκώς',('pf','mp'):'λελυμένος'},
      'γράφω': {('pres','att'):'γράφων',('aor','att'):'γράψας',('aor','pass'):'γραφείς',('pf','att'):'γεγραφώς'},
      'τιμάω': {('pres','att'):'τιμῶν',('pres','mp'):'τιμώμενος',('aor','att'):'τιμήσας',('pf','att'):'τετιμηκώς'},
      'φιλέω': {('pres','att'):'φιλῶν',('pres','mp'):'φιλούμενος',('aor','att'):'φιλήσας'},
      'δηλόω': {('pres','att'):'δηλῶν',('pres','mp'):'δηλούμενος'},
      'λείπω': {('aor','att'):'λιπών',('aor','mid'):'λιπόμενος'},
      'δίδωμι': {('pres','att'):'διδούς',('aor','att'):'δούς',('pf','att'):'δεδωκώς'},
      'γιγνώσκω': {('aor','att'):'γνούς'},
    }
    # nom/gen di riferimento più fini su λύω
    FINE = {'λύω': {('aor','pass','m','sg','gen'):'λυθέντος',('aor','pass','f','sg','nom'):'λυθεῖσα',
                    ('pres','att','n','sg','nom'):'λῦον',('pf','att','f','sg','nom'):'λελυκυῖα'}}
    bad = tot = 0; cov = 0
    for lm, gold in GOLD.items():
        if lm not in VERBS: print('(assente)', lm); continue
        P = participles(lm, VERBS[lm]); cov += 1
        for (t, vc), exp in gold.items():
            tot += 1
            got = surface(P.get(t, {}).get(vc, {}).get('m', {}).get('sg', {}).get('nom', [['—']])) if P.get(t, {}).get(vc) else '∅'
            if got != exp: bad += 1; print('FAIL %s %s.%s: atteso %s, ottenuto %s' % (lm, t, vc, exp, got))
    for lm, fine in FINE.items():
        P = participles(lm, VERBS[lm])
        for (t, vc, g, num, case), exp in fine.items():
            tot += 1
            got = surface(P[t][vc][g][num][case]) if P.get(t, {}).get(vc, {}).get(g) else '∅'
            if got != exp: bad += 1; print('FAIL %s %s.%s %s.%s.%s: atteso %s, ottenuto %s' % (lm, t, vc, g, num, case, exp, got))
    print('\n%d/%d forme di riferimento OK%s' % (tot - bad, tot, '' if not bad else '  (%d ERRATE)' % bad))
    # copertura su tutti i 122 verbi
    full = part = none = 0
    for lm, v in VERBS.items():
        P = participles(lm, v)
        ntv = sum(len(dd) for dd in P.values())
        if ntv >= 8: full += 1
        elif ntv: part += 1
        else: none += 1
    print('copertura 122 verbi: completi(≥8 forme) %d · parziali %d · vuoti %d' % (full, part, none))
