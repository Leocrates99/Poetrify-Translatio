# -*- coding: utf-8 -*-
"""Modi (aoristo/perfetto/futuro) + infiniti completi dei verbi greci, derivati
dai principi, per gen_paradigms (segmentati) e gen_greek_forms (indice piatto).
Portato dal laboratorio (grk_moods.py), generalizzato ai 122 verbi.

Recessivo → accent_verb; aor. pass. cong./ott. con desinenze già accentate;
perfetto medio-pass. cong./ott. PERIFRASTICO (participio + εἰμί). Fallback su
derivazioni incerte (regola ferrea: mai una forma sbagliata).
Cella = [[testo,ruolo],…]. Output infiniti: {tempo:{diatesi:cella}};
modi: {modo:{tempo:{diatesi:[celle]}}}."""
import unicodedata
from accentuation import accent_verb, place_accent, strip_accents, nfc, syllable_nuclei, long_dichra
from gk_participles import _deaug, _passive_stem, _perfect_stem, _pfmp_stem, _base, participles, surface

def _seg(w, lt, ls=0, la=0):
    i = 0; out = []
    if la: out.append([w[:la], 'a']); i = la
    out.append([w[i:i+lt], 't']); i += lt
    if ls: out.append([w[i:i+ls], 's']); i += ls
    if w[i:]: out.append([w[i:], 'd'])
    return out

def _rec(word, ld=frozenset(), opt=False):
    return accent_verb(strip_accents(word), ld, opt=opt)
def _verb_ld(lemma, v):
    ld = long_dichra(lemma)
    if _base(strip_accents(v.get('pres', '')))[-1:] == 'υ': ld = ld | {'υ'}   # verbi in -ύω: υ lungo
    return ld
def _pen(word, ld=frozenset()):      # accento fisso sulla penultima (con dichra + finale -αι/-οι breve)
    plain = strip_accents(word); nuc = syllable_nuclei(plain); n = len(nuc)
    def islong(k):
        st, ln, lg = nuc[n-k]
        if k == 1 and plain[-2:] in ('αι', 'οι'): return False
        return lg or (ln == 1 and _base(plain)[st] in ld)
    circ = (n >= 2 and islong(2) and not islong(1))
    return nfc(place_accent(plain, 2, circ))
def _ult_circ(word):                 # accento fisso circonflesso sull'ultima (2º aor. att. -εῖν)
    return nfc(place_accent(strip_accents(word), 1, True))

# desinenze dei modi (dopo il tema; recessive) ─────────────────────────────
SUBJ_A = ['ω','ῃς','ῃ','ωμεν','ητε','ωσι'];      SUBJ_M = ['ωμαι','ῃ','ηται','ωμεθα','ησθε','ωνται']
OPT_AI = ['αιμι','αις','αι','αιμεν','αιτε','αιεν']; OPT_AIM = ['αιμην','αιο','αιτο','αιμεθα','αισθε','αιντο']
OPT_OI = ['οιμι','οις','οι','οιμεν','οιτε','οιεν']; OPT_OIM = ['οιμην','οιο','οιτο','οιμεθα','οισθε','οιντο']
IMV_S_A = ['ον','ατω','ατε','αντων'];  IMV_S_M = ['αι','ασθω','ασθε','ασθων']       # aoristo sigmatico
IMV_2_A = ['ε','ετω','ετε','οντων'];   IMV_2_M = ['ου','εσθω','εσθε','εσθων']        # 2º aoristo
PFIMV_A = ['ε','ετω','ετε','οντων']
# aor. pass. cong./ott./imperativo (desinenze già accentate / recessivo)
SUBJ_P = ['ῶ','ῇς','ῇ','ῶμεν','ῆτε','ῶσι']
OPT_P  = ['είην','είης','είη','εῖμεν','εῖτε','εῖεν']
IMV_P  = ['ητι','ητω','ητε','εντων']
EIMI_SUBJ = ['ὦ','ᾖς','ᾖ','ὦμεν','ἦτε','ὦσι']
EIMI_OPT  = ['εἴην','εἴης','εἴη','εἶμεν','εἶτε','εἶεν']

def _aor_stem(v):
    """(base, marker, kind) per l'aoristo attivo/medio. kind: 's'(sigmatico) '2'(2º) None."""
    at = str(v.get('aor_type') or '')
    if at in ('1', '1m'):
        ast = _deaug(v['aor']); astem = ast[:-1] if ast.endswith('α') else ast
        if astem.endswith('σ'): return astem[:-1], 'σ', 's'
        return astem, '', 's'
    if at.startswith('2:') or at.startswith('2m:'):
        return at.split(':', 1)[1], '', '2'
    return None, None, None

def _rows(base, marker, ends, ld, la=0, lt=None, ls=None, opt=False, mode='rec'):
    lt = len(base) if lt is None else lt
    ls = len(marker) if ls is None else ls
    out = []
    for e in ends:
        w = base + marker + e
        acc = _rec(w, ld, opt=opt) if mode == 'rec' else nfc(w)
        out.append(_seg(acc, lt, ls, la))
    return out

def _peri(ptc_nom_sg, ptc_nom_pl, auxes):
    return [[[nfc((ptc_nom_sg if i < 3 else ptc_nom_pl) + ' ' + a), 't']] for i, a in enumerate(auxes)]

def moods(lemma, v):
    """{cong|opt|imv: {aor|pf: {att|mid|pass|mp: [celle]}}, opt:{fut:…}} — derivabili con sicurezza."""
    out = {'cong': {}, 'opt': {}, 'imv': {}}
    dep = v.get('dep'); at = str(v.get('aor_type') or '')
    ld = _verb_ld(lemma, v)
    base, mk, kind = _aor_stem(v)

    # ── AORISTO att./med. (recessivo) ──
    try:
        if kind == 's':
            if not dep:
                out['cong'].setdefault('aor', {})['att'] = _rows(base, mk, SUBJ_A, ld)
                out['opt'].setdefault('aor', {})['att'] = _rows(base, mk, OPT_AI, ld, opt=True)
                out['imv'].setdefault('aor', {})['att'] = _rows(base, mk, IMV_S_A, ld)
            out['cong'].setdefault('aor', {})['mid'] = _rows(base, mk, SUBJ_M, ld)
            out['opt'].setdefault('aor', {})['mid'] = _rows(base, mk, OPT_AIM, ld, opt=True)
            out['imv'].setdefault('aor', {})['mid'] = _rows(base, mk, IMV_S_M, ld)
        elif kind == '2':
            if not dep:
                out['cong'].setdefault('aor', {})['att'] = _rows(base, '', SUBJ_A, ld)
                out['opt'].setdefault('aor', {})['att'] = _rows(base, '', OPT_OI, ld, opt=True)
                out['imv'].setdefault('aor', {})['att'] = _rows(base, '', IMV_2_A, ld)
            out['cong'].setdefault('aor', {})['mid'] = _rows(base, '', SUBJ_M, ld)
            out['opt'].setdefault('aor', {})['mid'] = _rows(base, '', OPT_OIM, ld, opt=True)
            out['imv'].setdefault('aor', {})['mid'] = _rows(base, '', IMV_2_M, ld)
    except Exception: pass
    # ── AORISTO passivo (desinenze accentate / imperativo recessivo) ──
    try:
        if v.get('aorp'):
            pst, pm = _passive_stem(v['aorp']); pb = pst + pm; lt = len(pst); ls = len(pm)
            out['cong'].setdefault('aor', {})['pass'] = [_seg(nfc(pb + e), lt, ls) for e in SUBJ_P]
            out['opt'].setdefault('aor', {})['pass'] = [_seg(nfc(pb + e), lt, ls) for e in OPT_P]
            out['imv'].setdefault('aor', {})['pass'] = [_seg(_rec(pb + e, ld), lt, ls) for e in IMV_P]
    except Exception: pass

    # ── FUTURO ottativo ──
    try:
        if v.get('fut') and not str(v['fut']).endswith('~'):
            fut = strip_accents(v['fut'])
            fb = fut[:-1] if fut.endswith('σ') else fut; fm = 'σ' if fut.endswith('σ') else ''
            if not dep:
                out['opt'].setdefault('fut', {})['att'] = _rows(fb, fm, OPT_OI, ld, opt=True)
            out['opt'].setdefault('fut', {})['mid'] = _rows(fut, '', [x[1:] if False else 'ο'+x for x in ['ιμην','ιο','ιτο','ιμεθα','ισθε','ιντο']], ld, opt=True) \
                if False else [_seg(_rec(fut + 'ο' + e, ld, opt=True), len(fut)) for e in ['ιμην','ιο','ιτο','ιμεθα','ισθε','ιντο']]
            if v.get('aorp'):
                pst, pm = _passive_stem(v['aorp'])
                out['opt'].setdefault('fut', {})['pass'] = [_seg(_rec(pst + pm + 'ησο' + e, ld, opt=True), len(pst)) for e in ['ιμην','ιο','ιτο','ιμεθα','ισθε','ιντο']]
    except Exception: pass

    # ── PERFETTO: attivo sintetico (κ-perf) + medio-pass. perifrastico ──
    try:
        if v.get('pf'):
            redup, pstem, pmk = _perfect_stem(v['pf'])
            if pstem is not None and pmk == 'κ':     # solo perfetti in κ (sintetici sicuri)
                pb = redup + pstem + pmk; la = len(redup); lt = len(pstem); ls = len(pmk)
                out['cong'].setdefault('pf', {})['att'] = _rows(pb, '', SUBJ_A, ld, la=la, lt=lt, ls=ls)
                out['opt'].setdefault('pf', {})['att'] = _rows(pb, '', OPT_OI, ld, la=la, lt=lt, ls=ls, opt=True)
                out['imv'].setdefault('pf', {})['att'] = _rows(pb, '', PFIMV_A, ld, la=la, lt=lt, ls=ls)
        if v.get('pfmp'):
            P = participles(lemma, v)
            mp = P.get('pf', {}).get('mp', {}).get('m', {})
            if mp:
                nsg = surface(mp['sg']['nom']); npl = surface(mp['pl']['nom'])
                out['cong'].setdefault('pf', {})['mp'] = _peri(nsg, npl, EIMI_SUBJ)
                out['opt'].setdefault('pf', {})['mp'] = _peri(nsg, npl, EIMI_OPT)
    except Exception: pass

    return {m: {t: {vc: c for vc, c in d.items()} for t, d in td.items() if d} for m, td in out.items() if td}

# ── INFINITI (tutti i tempi/diatesi) ──
def _cell_inf(word, la, lt, ls):
    return _seg(word, lt, ls, la)

def infinitives(lemma, v):
    out = {}
    contract = v.get('contract'); dep = v.get('dep'); at = str(v.get('aor_type') or '')
    is_mi = lemma.endswith('μι'); ld = _verb_ld(lemma, v)
    pres = strip_accents(v['pres'])
    try:
        d = {}
        if is_mi:
            root = {'δίδωμι':'διδ','τίθημι':'τιθ','ἵστημι':'ἱστ','δείκνυμι':'δεικν','ἵημι':'ἱ'}.get(lemma, pres)
            end = {'δίδωμι':'όναι','τίθημι':'έναι','ἵστημι':'άναι','δείκνυμι':'ύναι','ἵημι':'έναι'}.get(lemma, 'ναι')
            if not dep: d['att'] = _cell_inf(nfc(root + end), 0, len(root), 0)
            mps = {'δίδωμι':'διδο','τίθημι':'τιθε','ἵστημι':'ἱστα','δείκνυμι':'δεικνυ','ἵημι':'ἱε'}.get(lemma, root)
            d['mp'] = _cell_inf(_rec(mps + 'σθαι', ld), 0, len(mps), 0)
        elif contract:
            st = pres[:-1]; ea = {'α': ('ᾶν','ᾶσθαι'), 'ε': ('εῖν','εῖσθαι'), 'ο': ('οῦν','οῦσθαι')}[contract]
            if not dep: d['att'] = [[st, 't'], [nfc(ea[0]), 'v' if False else 'd']]
            d['mp'] = [[st, 't'], [nfc(ea[1]), 'd']]
        else:
            if not dep: d['att'] = _cell_inf(_rec(pres + 'ειν', ld), 0, len(pres), 0)
            d['mp'] = _cell_inf(_rec(pres + 'εσθαι', ld), 0, len(pres), 0)
        out['pres'] = d
    except Exception: pass
    try:
        if v.get('fut') and not str(v['fut']).endswith('~'):
            fut = strip_accents(v['fut']); fb = fut[:-1] if fut.endswith('σ') else fut; fm = 'σ' if fut.endswith('σ') else ''
            d = {}
            if not dep: d['att'] = _cell_inf(_rec(fut + 'ειν', ld), 0, len(fb), len(fm))
            d['mid'] = _cell_inf(_rec(fut + 'εσθαι', ld), 0, len(fb), len(fm))
            if v.get('aorp'):
                pst, pm = _passive_stem(v['aorp'])
                d['pass'] = _cell_inf(_rec(pst + pm + 'ησεσθαι', ld), 0, len(pst), len(pm) + 2)
            out['fut'] = d
    except Exception: pass
    try:
        base, mk, kind = _aor_stem(v); d = {}
        if kind == 's':
            if not dep: d['att'] = _cell_inf(_pen(base + mk + 'αι', ld), 0, len(base), len(mk))
            d['mid'] = _cell_inf(_rec(base + mk + 'ασθαι', ld), 0, len(base), len(mk))
        elif kind == '2':
            if not dep: d['att'] = _cell_inf(_ult_circ(base + 'ειν'), 0, len(base), 0)
            d['mid'] = _cell_inf(_pen(base + 'εσθαι', ld), 0, len(base), 0)
        if v.get('aorp'):
            pst, pm = _passive_stem(v['aorp'])
            d['pass'] = _cell_inf(_pen(pst + pm + 'ηναι', ld), 0, len(pst), len(pm))
        if d: out['aor'] = d
    except Exception: pass
    try:
        d = {}
        if v.get('pf'):
            redup, pstem, pmk = _perfect_stem(v['pf'])
            if pstem is not None:
                d['att'] = _cell_inf(_pen(redup + pstem + pmk + 'εναι', long_dichra(lemma)), len(redup), len(pstem), len(pmk))
        if v.get('pfmp'):
            redup, pstem = _pfmp_stem(v['pfmp'])
            if pstem is not None and _base(pstem)[-1:] in 'αεηιουω':   # solo temi vocalici; le assimilazioni (γεγράφθαι) → fallback
                d['mp'] = _cell_inf(_pen(redup + pstem + 'σθαι', long_dichra(lemma)), len(redup), len(pstem), 0)
        if d: out['pf'] = d
    except Exception: pass
    return {t: {vc: c for vc, c in dd.items() if c} for t, dd in out.items() if dd}

if __name__ == '__main__':
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from gen_greek_forms import VERBS
    def s(c): return ''.join(x[0] for x in c)
    GOLD_INF = {
      'λύω': {('pres','att'):'λύειν',('pres','mp'):'λύεσθαι',('fut','att'):'λύσειν',('fut','mid'):'λύσεσθαι',
              ('fut','pass'):'λυθήσεσθαι',('aor','att'):'λῦσαι',('aor','mid'):'λύσασθαι',('aor','pass'):'λυθῆναι',
              ('pf','att'):'λελυκέναι',('pf','mp'):'λελύσθαι'},
      'τιμάω': {('pres','att'):'τιμᾶν',('aor','att'):'τιμῆσαι',('pf','att'):'τετιμηκέναι'},
      'φιλέω': {('pres','att'):'φιλεῖν'}, 'λείπω': {('aor','att'):'λιπεῖν',('aor','mid'):'λιπέσθαι'},
      'γράφω': {('aor','pass'):'γραφῆναι',('pf','att'):'γεγραφέναι'},
    }
    GOLD_M = {
      'λύω': {('cong','aor','att'):['λύσω','λύσῃς'],('opt','aor','att'):['λύσαιμι','λύσαις'],
              ('imv','aor','att'):['λῦσον','λυσάτω'],('cong','aor','pass'):['λυθῶ','λυθῇς'],
              ('opt','aor','pass'):['λυθείην'],('opt','fut','att'):['λύσοιμι'],
              ('cong','pf','att'):['λελύκω'],('cong','pf','mp'):['λελυμένος ὦ']},
      'λείπω': {('cong','aor','att'):['λίπω'],('opt','aor','att'):['λίποιμι'],('imv','aor','att'):['λίπε']},
    }
    bad = tot = 0
    for lm, g in GOLD_INF.items():
        I = infinitives(lm, VERBS[lm])
        for (t, vc), exp in g.items():
            tot += 1; got = s(I.get(t, {}).get(vc, [['∅']]))
            if got != exp: bad += 1; print('INF %s %s.%s: atteso %s, ottenuto %s' % (lm, t, vc, exp, got))
    for lm, g in GOLD_M.items():
        M = moods(lm, VERBS[lm])
        for (mo, t, vc), exps in g.items():
            cells = M.get(mo, {}).get(t, {}).get(vc)
            for i, exp in enumerate(exps):
                tot += 1; got = s(cells[i]) if cells and i < len(cells) else '∅'
                if got != exp: bad += 1; print('MOOD %s %s.%s.%s[%d]: atteso %s, ottenuto %s' % (lm, mo, t, vc, i, exp, got))
    print('\n%d/%d forme di riferimento OK%s' % (tot - bad, tot, '' if not bad else '  (%d ERRATE)' % bad))
    # copertura
    fi = fm = 0
    for lm, v in VERBS.items():
        if sum(len(d) for d in infinitives(lm, v).values()) >= 6: fi += 1
        if sum(len(d) for td in moods(lm, v).values() for d in td.values()) >= 6: fm += 1
    print('copertura: infiniti(≥6) %d/122 · modi(≥6 gruppi) %d/122' % (fi, fm))
