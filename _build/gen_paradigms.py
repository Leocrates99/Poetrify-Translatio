# -*- coding: utf-8 -*-
"""Indice dei PARADIGMI SEGMENTATI · data/<lang>/paradigms/<lettera>.json

Per ogni lemma classificato emette la tabella flessiva con le celle già
SCOMPOSTE in morfemi, ciascuno col suo ruolo:
    a = aumento / raddoppiamento        (ἐ-, λε-)
    t = tema (del presente, del perfetto, dell'aoristo…)
    v = vocale tematica / di coniugazione / contratta   (a, e, i · ο/ε · ῶ, ᾷ)
    s = suffisso di tempo/modo          (ba, bi, era, isse, re, nd · σ(α), θη, κ)
    d = desinenza personale o casuale
Cella = [[testo, ruolo], …]; la CONCATENAZIONE dei testi è la forma piena
(cross-validata contro l'indice piatto generato da gen_latin_forms /
gen_greek_forms). Le fusioni irriducibili restano nel segmento più ampio e
la voce porta una nota (ξ = gutturale+σ; vocale contratta = v+d fuse).

Struttura: { meta, paradigms: { lemma: { pos, classe, testa, nota?,
  nome?: {sg:{nom:CELL,…}, pl:{…}},
  verbo?: {ind:{pres:{att:[6],pass|mp:[6]},…}, cong?, imv?, inf:{…}, ptc:{…}, ger?} } }
"""
import json, os, re, sys, unicodedata, collections
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_latin_forms import (N as NL, parse_noun_head, parse_verb_head)
from gen_greek_forms import (VERBS, classify_nominal, NOMINAL_EXTRA, strip_acc,
                             recessive, accent_at, split_preverb, augment_stem,
                             de_augment, CONTR, N as NG, NFC, lemma_accent_dist,
                             persistent, dat_pl_3, syllable_nuclei)
from accentuation import accent_nominal, nominal_idx_start, accent_verb, long_dichra   # motore di accentazione
from gk_participles import participles as gk_participles   # participi greci declinati (derivati dai principi)
from gk_moods import moods as gk_moods, infinitives as gk_infinitives   # modi aor/pf/fut + infiniti completi

def seg(*pairs):
    return [[t, r] for t, r in pairs if t]

# ═══════════════════ LATINO · NOMI ═══════════════════
def lat_noun_table(lemma, gen_full, gen_raw, gender):
    lem = NL(lemma); g = NL(gen_full)
    raw = gen_raw
    def C(*p): return seg(*p)
    if g.endswith('ae'):
        st = g[:-2]; cl = '1ª declinazione'
        sg = dict(nom=C((st,'t'),('a','d')), gen=C((st,'t'),('ae','d')), dat=C((st,'t'),('ae','d')),
                  acc=C((st,'t'),('am','d')), voc=C((st,'t'),('a','d')), abl=C((st,'t'),('a','d')))
        pl = dict(nom=C((st,'t'),('ae','d')), gen=C((st,'t'),('arum','d')), dat=C((st,'t'),('is','d')),
                  acc=C((st,'t'),('as','d')), voc=C((st,'t'),('ae','d')), abl=C((st,'t'),('is','d')))
    elif raw.strip() in ('ūs',) or (raw.strip() == 'us' and 'ū' in raw):
        st = g[:-2]
        if gender == 'n':
            cl = '4ª declinazione (neutro)'
            u = C((st,'t'),('u','d')); ua = C((st,'t'),('ua','d'))
            sg = dict(nom=u, gen=C((st,'t'),('us','d')), dat=u, acc=u, voc=u, abl=u)
            pl = dict(nom=ua, gen=C((st,'t'),('uum','d')), dat=C((st,'t'),('ibus','d')),
                      acc=ua, voc=ua, abl=C((st,'t'),('ibus','d')))
        else:
            cl = '4ª declinazione'
            sg = dict(nom=C((st,'t'),('us','d')), gen=C((st,'t'),('us','d')), dat=C((st,'t'),('ui','d')),
                      acc=C((st,'t'),('um','d')), voc=C((st,'t'),('us','d')), abl=C((st,'t'),('u','d')))
            pl = dict(nom=C((st,'t'),('us','d')), gen=C((st,'t'),('uum','d')), dat=C((st,'t'),('ibus','d')),
                      acc=C((st,'t'),('us','d')), voc=C((st,'t'),('us','d')), abl=C((st,'t'),('ibus','d')))
    elif g.endswith('ei'):
        st = g[:-2]; cl = '5ª declinazione'
        sg = dict(nom=C((st,'t'),('es','d')), gen=C((st,'t'),('ei','d')), dat=C((st,'t'),('ei','d')),
                  acc=C((st,'t'),('em','d')), voc=C((st,'t'),('es','d')), abl=C((st,'t'),('e','d')))
        pl = dict(nom=C((st,'t'),('es','d')), gen=C((st,'t'),('erum','d')), dat=C((st,'t'),('ebus','d')),
                  acc=C((st,'t'),('es','d')), voc=C((st,'t'),('es','d')), abl=C((st,'t'),('ebus','d')))
    elif g.endswith('i') and not g.endswith('is'):
        st = g[:-1]
        if gender == 'n':
            cl = '2ª declinazione (neutro)'
            nomv = C((st,'t'),('um','d'))
            sg = dict(nom=nomv, gen=C((st,'t'),('i','d')), dat=C((st,'t'),('o','d')),
                      acc=nomv, voc=nomv, abl=C((st,'t'),('o','d')))
            pl = dict(nom=C((st,'t'),('a','d')), gen=C((st,'t'),('orum','d')), dat=C((st,'t'),('is','d')),
                      acc=C((st,'t'),('a','d')), voc=C((st,'t'),('a','d')), abl=C((st,'t'),('is','d')))
        else:
            cl = '2ª declinazione'
            if lem.endswith('us'):
                nomc = C((st,'t'),('us','d'))
                vocc = C((st[:-1],'t'),('i','d')) if lem.endswith('ius') else C((st,'t'),('e','d'))
            else:
                nomc = C((lem,'t')); vocc = C((lem,'t'))
            sg = dict(nom=nomc, gen=C((st,'t'),('i','d')), dat=C((st,'t'),('o','d')),
                      acc=C((st,'t'),('um','d')), voc=vocc, abl=C((st,'t'),('o','d')))
            pl = dict(nom=C((st,'t'),('i','d')), gen=C((st,'t'),('orum','d')), dat=C((st,'t'),('is','d')),
                      acc=C((st,'t'),('os','d')), voc=C((st,'t'),('i','d')), abl=C((st,'t'),('is','d')))
    elif g.endswith('is'):
        st = g[:-2]
        parisyll = lem.endswith(('is', 'es')) and abs(len(lem) - len(g)) <= 1
        double_cons = len(st) >= 2 and st[-1] not in 'aeiou' and st[-2] not in 'aeiou'
        neuter_ial = lem.endswith(('e', 'al', 'ar')) and gender == 'n'
        istem = parisyll or double_cons or neuter_ial
        gpl = 'ium' if istem else 'um'
        quals = (['tema in -i'] if istem else []) + (['neutro'] if gender == 'n' else [])
        cl = '3ª declinazione' + (' (' + ', '.join(quals) + ')' if quals else '')
        nomc = C((lem,'t'))
        if gender == 'n':
            sg = dict(nom=nomc, gen=C((st,'t'),('is','d')), dat=C((st,'t'),('i','d')),
                      acc=nomc, voc=nomc, abl=C((st,'t'),('i' if neuter_ial else 'e','d')))
            plna = C((st,'t'),('ia' if neuter_ial else 'a','d'))
            pl = dict(nom=plna, gen=C((st,'t'),(gpl,'d')), dat=C((st,'t'),('ibus','d')),
                      acc=plna, voc=plna, abl=C((st,'t'),('ibus','d')))
        else:
            sg = dict(nom=nomc, gen=C((st,'t'),('is','d')), dat=C((st,'t'),('i','d')),
                      acc=C((st,'t'),('em','d')), voc=nomc, abl=C((st,'t'),('e','d')))
            es = C((st,'t'),('es','d'))
            pl = dict(nom=es, gen=C((st,'t'),(gpl,'d')), dat=C((st,'t'),('ibus','d')),
                      acc=es, voc=es, abl=C((st,'t'),('ibus','d')))
    else:
        return None
    return dict(classe=cl, tab={'sg': sg, 'pl': pl})

# ═══════════════════ LATINO · VERBI ═══════════════════
P6 = ('m','s','t','mus','tis','nt')
R6 = ('r','ris','tur','mur','mini','ntur')
# (vocale, suffisso, desinenza) per cella; '' = segmento assente
LV = {
 '1': dict(v='a',
   pres=[('','','o'),('a','','s'),('a','','t'),('a','','mus'),('a','','tis'),('a','','nt')],
   fut=[('a','b','o'),('a','bi','s'),('a','bi','t'),('a','bi','mus'),('a','bi','tis'),('a','b','unt')],
   cong=[('','e','m'),('','e','s'),('','e','t'),('','e','mus'),('','e','tis'),('','e','nt')],
   impf_vs=('a','ba'), inf=('a','re'), imv=[('a',''),('a','te')], ptc=('a','ns'), ptcob=('a','nt'), ger=('a','nd'),
   prpass=[('','','or'),('a','','ris'),('a','','tur'),('a','','mur'),('a','','mini'),('a','','ntur')],
   futpass=[('a','b','or'),('a','be','ris'),('a','bi','tur'),('a','bi','mur'),('a','bi','mini'),('a','bu','ntur')],
   infpass=('a','ri')),
 '2': dict(v='e',
   pres=[('e','','o'),('e','','s'),('e','','t'),('e','','mus'),('e','','tis'),('e','','nt')],
   fut=[('e','b','o'),('e','bi','s'),('e','bi','t'),('e','bi','mus'),('e','bi','tis'),('e','b','unt')],
   cong=[('e','a','m'),('e','a','s'),('e','a','t'),('e','a','mus'),('e','a','tis'),('e','a','nt')],
   impf_vs=('e','ba'), inf=('e','re'), imv=[('e',''),('e','te')], ptc=('e','ns'), ptcob=('e','nt'), ger=('e','nd'),
   prpass=[('e','','or'),('e','','ris'),('e','','tur'),('e','','mur'),('e','','mini'),('e','','ntur')],
   futpass=[('e','b','or'),('e','be','ris'),('e','bi','tur'),('e','bi','mur'),('e','bi','mini'),('e','bu','ntur')],
   infpass=('e','ri')),
 '3': dict(v='i/u',
   pres=[('','','o'),('i','','s'),('i','','t'),('i','','mus'),('i','','tis'),('u','','nt')],
   fut=[('','a','m'),('','e','s'),('','e','t'),('','e','mus'),('','e','tis'),('','e','nt')],
   cong=[('','a','m'),('','a','s'),('','a','t'),('','a','mus'),('','a','tis'),('','a','nt')],
   impf_vs=('','eba'), inf=('e','re'), imv=[('e',''),('i','te')], ptc=('e','ns'), ptcob=('e','nt'), ger=('e','nd'),
   prpass=[('','','or'),('e','','ris'),('i','','tur'),('i','','mur'),('i','','mini'),('u','','ntur')],
   futpass=[('','a','r'),('','e','ris'),('','e','tur'),('','e','mur'),('','e','mini'),('','e','ntur')],
   infpass=('','i')),
 '3io': dict(v='i',
   pres=[('i','','o'),('i','','s'),('i','','t'),('i','','mus'),('i','','tis'),('iu','','nt')],
   fut=[('i','a','m'),('i','e','s'),('i','e','t'),('i','e','mus'),('i','e','tis'),('i','e','nt')],
   cong=[('i','a','m'),('i','a','s'),('i','a','t'),('i','a','mus'),('i','a','tis'),('i','a','nt')],
   impf_vs=('i','eba'), inf=('e','re'), imv=[('e',''),('i','te')], ptc=('ie','ns'), ptcob=('ie','nt'), ger=('ie','nd'),
   prpass=[('i','','or'),('e','','ris'),('i','','tur'),('i','','mur'),('i','','mini'),('iu','','ntur')],
   futpass=[('i','a','r'),('i','e','ris'),('i','e','tur'),('i','e','mur'),('i','e','mini'),('i','e','ntur')],
   infpass=('','i')),
 '4': dict(v='i',
   pres=[('i','','o'),('i','','s'),('i','','t'),('i','','mus'),('i','','tis'),('iu','','nt')],
   fut=[('i','a','m'),('i','e','s'),('i','e','t'),('i','e','mus'),('i','e','tis'),('i','e','nt')],
   cong=[('i','a','m'),('i','a','s'),('i','a','t'),('i','a','mus'),('i','a','tis'),('i','a','nt')],
   impf_vs=('i','eba'), inf=('i','re'), imv=[('i',''),('i','te')], ptc=('ie','ns'), ptcob=('ie','nt'), ger=('ie','nd'),
   prpass=[('i','','or'),('i','','ris'),('i','','tur'),('i','','mur'),('i','','mini'),('iu','','ntur')],
   futpass=[('i','a','r'),('i','e','ris'),('i','e','tur'),('i','e','mur'),('i','e','mini'),('i','e','ntur')],
   infpass=('i','ri')),
}
CONJ_LABEL = {'1':'1ª coniugazione','2':'2ª coniugazione','3':'3ª coniugazione','3io':'coniugazione mista (-iō)','4':'4ª coniugazione'}

# ── declinatori latini per i participi/gerundivo/gerundio (celle [[testo,ruolo],…]) ──
CASES_LAT = ['nom', 'gen', 'dat', 'acc', 'voc', 'abl']
LAT_ADJ12 = {   # aggettivo 1ª/2ª classe: (sg, pl) per caso
 'm': {'nom':('us','i'),'gen':('i','orum'),'dat':('o','is'),'acc':('um','os'),'voc':('e','i'),'abl':('o','is')},
 'f': {'nom':('a','ae'),'gen':('ae','arum'),'dat':('ae','is'),'acc':('am','as'),'voc':('a','ae'),'abl':('a','is')},
 'n': {'nom':('um','a'),'gen':('i','orum'),'dat':('o','is'),'acc':('um','a'),'voc':('um','a'),'abl':('o','is')},
}
def _lat_adj(prefix):   # prefix = [[testo,ruolo],…]; participio pf/fut + gerundivo (1ª/2ª classe)
    flex = {}
    for g in ('m', 'f', 'n'):
        sg, pl = {}, {}
        for case in CASES_LAT:
            se, pe = LAT_ADJ12[g][case]
            sg[case] = [list(x) for x in prefix] + [[se, 'd']]
            pl[case] = [list(x) for x in prefix] + [[pe, 'd']]
        flex[g] = {'sg': sg, 'pl': pl}
    return flex
def _lat_ptc_pres(pstem, ov, osx, ps):   # participio presente: 3ª decl. a una uscita (M/F comune)
    nom = [[pstem,'t'],[ov,'v'],[ps,'s']]                       # laud-a-ns
    def obl(end): return [[pstem,'t'],[ov,'v'],[osx,'s'],[end,'d']]   # laud-a-nt-…
    mf = {'sg':{'nom':nom,'gen':obl('is'),'dat':obl('i'),'acc':obl('em'),'voc':nom,'abl':obl('e')},
          'pl':{'nom':obl('es'),'gen':obl('ium'),'dat':obl('ibus'),'acc':obl('es'),'voc':obl('es'),'abl':obl('ibus')}}
    n = {'sg':{'nom':nom,'gen':obl('is'),'dat':obl('i'),'acc':nom,'voc':nom,'abl':obl('e')},
         'pl':{'nom':obl('ia'),'gen':obl('ium'),'dat':obl('ibus'),'acc':obl('ia'),'voc':obl('ia'),'abl':obl('ibus')}}
    return {'m': mf, 'f': mf, 'n': n}
def _lat_gerund(pstem, gv, gs):   # gerundio: nome neutro, solo gen/dat/acc/abl sg.
    def c(end): return [[pstem,'t'],[gv,'v'],[gs,'s'],[end,'d']]
    return {'sg': {'gen': c('i'), 'dat': c('o'), 'acc': c('um'), 'abl': c('o')}}

def lat_verb_table(lemma, conj, pstem, pfstem, supstem, dep):
    T = LV[conj]
    def row6(triples):
        return [seg((pstem,'t'),(v,'v'),(s,'s'),(d,'d')) for v, s, d in triples]
    def impf6(ends):
        v, s = T['impf_vs']
        return [seg((pstem,'t'),(v,'v'),(s,'s'),(e,'d')) for e in ends]
    verbo = {'ind': {}, 'cong': {}, 'imv': {}, 'inf': {}, 'ptc': {}}
    if not dep:
        verbo['ind']['pres'] = {'att': row6(T['pres'])}
        verbo['ind']['impf'] = {'att': impf6(P6)}
        verbo['ind']['fut'] = {'att': row6(T['fut'])}
        verbo['cong']['pres'] = {'att': row6(T['cong'])}
        vi, si = T['inf']
        verbo['cong']['impf'] = {'att': [seg((pstem,'t'),(vi,'v'),(si,'s'),(e,'d')) for e in P6]}
        verbo['imv']['pres'] = {'att': [seg((pstem,'t'),(v,'v'),(d,'d')) for v, d in T['imv']]}
        verbo['inf']['pres_att'] = seg((pstem,'t'),(vi,'v'),(si,'s'))
        pv, ps = T['ptc']
        verbo['ptc']['pres'] = seg((pstem,'t'),(pv,'v'),(ps,'s'))
        ov, osx = T['ptcob']
        verbo['ptc']['pres_gen'] = seg((pstem,'t'),(ov,'v'),(osx,'s'),('is','d'))
        gv, gs = T['ger']
        verbo['ger'] = seg((pstem,'t'),(gv,'v'),(gs,'s'),('us','d'))
    lbl = 'mp' if dep else 'pass'
    verbo['ind'].setdefault('pres', {})[lbl] = row6(T['prpass'])
    v, s = T['impf_vs']
    verbo['ind'].setdefault('impf', {})[lbl] = [seg((pstem,'t'),(v,'v'),(s,'s'),(e,'d')) for e in R6]
    verbo['ind'].setdefault('fut', {})[lbl] = row6(T['futpass'])
    congp = []
    for i, (cv, cs, cd) in enumerate(T['cong']):
        base = cd
        rd = {0: base[:-1]+'r' if base.endswith('m') else base+'r'}.get(0)
        congp.append((cv, cs, R6[i] if i else ('r' if base == 'm' else base+'r')))
    verbo['cong'].setdefault('pres', {})[lbl] = [seg((pstem,'t'),(cv,'v'),(cs,'s'),(rd,'d'))
        for (cv, cs, _), rd in zip(T['cong'], R6)]
    iv, isf = T['infpass']
    verbo['inf']['pres_' + lbl] = seg((pstem,'t'),(iv,'v'),(isf,'s')) if isf else seg((pstem,'t'),(iv,'v'),('i','d'))
    if conj in ('3', '3io'):
        verbo['inf']['pres_' + lbl] = seg((pstem,'t'),('i','d'))
    if pfstem:
        verbo['ind']['pf'] = {'att': [seg((pfstem,'t'),(e,'d')) for e in ('i','isti','it','imus','istis','erunt')]}
        verbo['ind']['ppf'] = {'att': [seg((pfstem,'t'),('era','s'),(e,'d')) for e in P6]}
        verbo['ind']['futant'] = {'att': [seg((pfstem,'t'),('er','s'),('o','d'))] +
            [seg((pfstem,'t'),('eri','s'),(e,'d')) for e in ('s','t','mus','tis','nt')]}
        verbo['cong']['pf'] = {'att': [seg((pfstem,'t'),('eri','s'),(e,'d')) for e in P6]}
        verbo['cong']['ppf'] = {'att': [seg((pfstem,'t'),('isse','s'),(e,'d')) for e in P6]}
        verbo['inf']['pf_att'] = seg((pfstem,'t'),('isse','s'))
    if supstem:
        verbo['ptc']['pf'] = seg((supstem,'t'),('us','d'))
        verbo['ptc']['fut'] = seg((supstem,'t'),('ur','s'),('us','d'))
    # ── participi DECLINATI + gerundivo + gerundio + cong. pf/ppf passivo perifrastico ──
    pv, ps = T['ptc']; ov, osx = T['ptcob']; gv, gs = T['ger']
    ptc_decl = {'pres': {'att': _lat_ptc_pres(pstem, ov, osx, ps)}}   # senso attivo (anche deponenti)
    if supstem:
        ptc_decl['pf'] = {('att' if dep else 'pass'): _lat_adj([[supstem,'t']])}   # deponente: participio pf. di senso attivo
        ptc_decl['fut'] = {'att': _lat_adj([[supstem,'t'],['ur','s']])}
    verbo['ptc_decl'] = ptc_decl
    verbo['gerundivo'] = _lat_adj([[pstem,'t'],[gv,'v'],[gs,'s']])       # laud-a-nd-us (aggettivo)
    verbo['gerundio'] = _lat_gerund(pstem, gv, gs)                        # laud-a-nd-i (nome neutro)
    if supstem:                                                          # cong. pf/ppf passivo (o m.-p. deponente) perifrastico
        vcp = 'mp' if dep else 'pass'
        for tn, aux in (('pf', ['sim','sis','sit','simus','sitis','sint']),
                        ('ppf', ['essem','esses','esset','essemus','essetis','essent'])):
            verbo['cong'].setdefault(tn, {})[vcp] = \
                [[[(supstem + ('us' if i < 3 else 'i')) + ' ' + aux[i], 't']] for i in range(6)]
    # ── testa: 2ª sing. presente inserita dopo il lemma (laudo, laudas, laudavi…) ──
    _prv = verbo['ind'].get('pres', {}).get('mp' if dep else 'att')
    s2 = ''.join(t for t, _ in _prv[1]) if _prv and len(_prv) > 1 else ''
    testa = lemma
    if s2 and s2 != lemma: testa += f', {s2}'
    if pfstem: testa += f', {pfstem}i'
    if supstem: testa += f', {supstem}um'
    testa += f', {pstem}{"" if dep else T["inf"][0] + T["inf"][1]}{(T["inf"][0] + "ri") if dep and conj != "3" else ""}'
    nota = None
    return dict(classe=CONJ_LABEL[conj] + (' · deponente' if dep else ''), testa=testa, verbo=verbo, nota=nota)

# ═══════════════════ GRECO ═══════════════════
def split_accented(form, parts):
    """Rispalma i diacritici della forma accentata sui segmenti non accentati.
    parts = [(testo_senza_accento, ruolo)] · concat(base(parts)) == base(form)."""
    nfd = unicodedata.normalize('NFD', form)
    lens = []
    for txt, _ in parts:
        lens.append(sum(1 for c in unicodedata.normalize('NFD', txt) if not unicodedata.combining(c)))
    out, i, li = [], 0, 0
    for (txt, role), L in zip(parts, lens):
        buf = ''
        count = 0
        while i < len(nfd) and count < L:
            c = nfd[i]
            buf += c
            if not unicodedata.combining(c):
                count += 1
            i += 1
        while i < len(nfd) and unicodedata.combining(nfd[i]):
            buf += nfd[i]; i += 1
        out.append([NFC(buf), role])
    return out

_VERB_LD = frozenset()   # dichrona lunghi del verbo in corso (impostato da gk_verb_table)

def gk_cell(parts, accent='recessive', pre=None):
    """parts non accentati (con spiriti) → forma accentata + segmenti.
    L'accento recessivo passa dal motore condiviso (accentuation.accent_verb)."""
    plain = ''.join(t for t, _ in parts)
    if pre is not None:
        form = pre
    elif accent == 'recessive':
        form = accent_verb(NFC(plain), _VERB_LD)
    else:
        form = NFC(plain)
    return split_accented(form, parts)

GK_PRES_A = [('','ω'),('','εις'),('','ει'),('ο','μεν'),('ε','τε'),('','ουσι')]
GK_PRES_M = [('ο','μαι'),('','ῃ'),('ε','ται'),('ο','μεθα'),('ε','σθε'),('ο','νται')]
GK_IMPF_A = [('ο','ν'),('ε','ς'),('ε',''),('ο','μεν'),('ε','τε'),('ο','ν')]
GK_IMPF_M = [('ο','μην'),('','ου'),('ε','το'),('ο','μεθα'),('ε','σθε'),('ο','ντο')]
GK_AOR1 =  [('σα',''),('σα','ς'),('σε',''),('σα','μεν'),('σα','τε'),('σα','ν')]
GK_AORP =  [('θη','ν'),('θη','ς'),('θη',''),('θη','μεν'),('θη','τε'),('θη','σαν')]
GK_PF_A =  [('','α'),('','ας'),('','ε'),('','αμεν'),('','ατε'),('','ασι')]
# congiuntivo (vocale lunga ω/η = 's'), ottativo (-οι- = 's'), imperativo (vocale tematica = 'v')
GK_CONG_A = [('ω',''),('ῃ','ς'),('ῃ',''),('ω','μεν'),('η','τε'),('ω','σι')]
GK_CONG_M = [('ω','μαι'),('ῃ',''),('η','ται'),('ω','μεθα'),('η','σθε'),('ω','νται')]
GK_OPT_A  = [('οι','μι'),('οι','ς'),('οι',''),('οι','μεν'),('οι','τε'),('οι','εν')]
GK_OPT_M  = [('οι','μην'),('οι','ο'),('οι','το'),('οι','μεθα'),('οι','σθε'),('οι','ντο')]
GK_IMV_A  = [('','ε'),('ε','τω'),('ε','τε'),('ο','ντων')]
GK_IMV_M  = [('','ου'),('ε','σθω'),('ε','σθε'),('ε','σθων')]
# modi contratti (uscite già contratte e accentate; il 2ª sg. imv. senza accento → recessivo)
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
# verbi in -μι: modi del presente (forme piene accentate), per lemma
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

def gk_split_contract(s):
    """'ῶμεν' → ('ῶ','μεν'): vocale contratta + resto."""
    nfd = unicodedata.normalize('NFD', s)
    i = 0; seen_v = False
    VOW = 'αεηιουω'
    while i < len(nfd):
        c = nfd[i]
        if unicodedata.combining(c): i += 1; continue
        if c in VOW:
            seen_v = True; i += 1; continue
        break
    head = NFC(nfd[:i]); tail = NFC(nfd[i:])
    return head, tail

# ── verbi ATEMATICI in -μι: presente (raddoppiamento + radice lunga sg / breve pl) ──
MI_PRES = {
 'δίδωμι':  ('δι', 'δω', 'δο'),
 'τίθημι':  ('τι', 'θη', 'θε'),
 'ἵστημι':  ('ἱ',  'στη', 'στα'),
 'δείκνυμι':('',   'δεικνυ', 'δεικνυ'),
 'ἵημι':    ('ἱ',  'η',  'ε'),
}
MI_ATT_END = ['μι', 'ς', 'σι', 'μεν', 'τε', 'ασι']
MI_MP_END  = ['μαι', 'σαι', 'ται', 'μεθα', 'σθε', 'νται']
MI_PTC_END = {'δίδωμι':'υς', 'τίθημι':'ις', 'ἵστημι':'ς', 'δείκνυμι':'ς', 'ἵημι':'ις'}
MI_ATT3PL  = {'ἵστημι':'ἱστᾶσι', 'ἵημι':'ἱᾶσι'}   # 3ª pl. att. con accento forzato (contrazione)

def gk_verb_table(lemma, v):
    global _VERB_LD
    _VERB_LD = long_dichra(lemma)   # dichrona lunghi deducibili dal lemma (per l'accento recessivo)
    ps = v['pres']; contract = v['contract']; dep = v['dep']
    T = strip_acc(ps)
    verbo = {'ind': {}, 'inf': {}, 'ptc': {}}
    nota = []
    prev = split_preverb(lemma)
    def aug_parts():
        """(aumento, tema) per l'imperfetto/aoristi dal tema del presente."""
        if prev:
            pv = split_preverb(ps)
            if pv:
                pre, el, core = pv
                aug = augment_stem(core)
                base = strip_acc(aug)
                inner = strip_acc(core)
                if base != inner and base.startswith('ἐ') and NG(base[1:]) == NG(inner):
                    return (el + 'ἐ' if False else el, base) if False else ((el, 'ἐ', inner))
                return ((el, '', base))
        aug = strip_acc(augment_stem(ps))
        inner = T
        if aug.startswith('ἐ') and NG(aug[1:]) == NG(inner):
            return ('', 'ἐ', inner)
        return ('', aug[:max(1, len(aug)-len(inner))], inner) if len(aug) > len(inner) else ('', '', aug)
    # presente e imperfetto
    mi = MI_PRES.get(lemma)
    if mi:
        red, rl, rs = mi
        def micell(root, end, forced=None):
            parts = ([(red,'a')] if red else []) + [(root,'t'), (end,'d')]
            return gk_cell(parts, pre=(NFC(forced) if forced else None))
        att = []
        for i, end in enumerate(MI_ATT_END):
            root = rl if i < 3 else rs
            att.append(micell(root, end, MI_ATT3PL.get(lemma) if i == 5 else None))
        verbo['ind']['pres'] = {'att': att}
        verbo['ind']['pres']['mp'] = [micell(rs, end) for end in MI_MP_END]
        infp = ([(red,'a')] if red else []) + [(rs,'t'), ('ναι','d')]
        verbo['inf']['pres_att'] = gk_cell(infp, pre=NFC(accent_at(strip_acc(''.join(t for t,_ in infp)), 2)))
        pe = MI_PTC_END[lemma]
        ptcp = ([(red,'a')] if red else []) + [(rs,'t'), (pe,'d')]
        verbo['ptc']['pres_att'] = gk_cell(ptcp, pre=NFC(accent_at(strip_acc(''.join(t for t,_ in ptcp)), 1)))
        verbo['ptc']['pres_mp'] = gk_cell(([(red,'a')] if red else []) + [(rs,'t'), ('μενος','d')])
        nota.append('presente atematico in -μι: raddoppiamento e radice lunga al sing., breve al plur.; senza vocale tematica')
    elif contract:
        Tc = T[:-1]   # la vocale del tema è DENTRO la contrazione (τιμ+ῶ, non τιμα+ῶ)
        def crow(base6, mid=False):
            cells = []
            for ve, de in base6:
                cfull = CONTR[contract].get(ve + de)
                if cfull is None:
                    cells.append(None); continue
                h, t2 = gk_split_contract(cfull)
                cells.append(gk_cell([(Tc,'t'),(h,'v'),(t2,'d')] if t2 or h else [(Tc,'t'),(cfull,'d')], pre=NFC(Tc+cfull)))
            return cells
        if not dep: verbo['ind']['pres'] = {'att': crow(GK_PRES_A)}
        verbo['ind'].setdefault('pres', {})['mp'] = crow(GK_PRES_M)
        pre_el, A, core = aug_parts()
        def crow_i(base6):
            cells = []
            corec = core[:-1]
            for ve, de in base6:
                cfull = CONTR[contract].get(ve + de)
                if cfull is None: cells.append(None); continue
                h, t2 = gk_split_contract(cfull)
                parts = [(x, r) for x, r in [(pre_el,'t'),(A,'a'),(corec,'t'),(h,'v'),(t2,'d')] if x]
                cells.append(gk_cell(parts, pre=NFC(pre_el + A + corec + cfull)))
            return cells
        if not dep: verbo['ind']['impf'] = {'att': crow_i(GK_IMPF_A)}
        verbo['ind'].setdefault('impf', {})['mp'] = crow_i(GK_IMPF_M)
        infc = CONTR[contract]['εσθαι']
        h, t2 = gk_split_contract(infc)
        verbo['inf']['pres_mp'] = gk_cell([(Tc,'t'),(h,'v'),(t2,'d')], pre=NFC(Tc+infc))
        if not dep:
            infa = CONTR[contract]['ειν']
            h, t2 = gk_split_contract(infa)
            verbo['inf']['pres_att'] = gk_cell([(Tc,'t'),(h,'v'),(t2,'d')], pre=NFC(Tc+infa))
        nota.append('presente contratto: la vocale evidenziata è la CONTRAZIONE di vocale tematica e desinenza')
    else:
        def row(base6, mid=False):
            return [gk_cell([(T,'t')] + ([(ve,'v')] if ve else []) + ([(de,'d')] if de else [])) for ve, de in base6]
        if not dep: verbo['ind']['pres'] = {'att': row(GK_PRES_A)}
        verbo['ind'].setdefault('pres', {})['mp'] = row(GK_PRES_M)
        pre_el, A, core = aug_parts()
        def rowi(base6):
            out = []
            for ve, de in base6:
                parts = [(x, r) for x, r in [(pre_el,'t'),(A,'a'),(core,'t'),(ve,'v'),(de,'d')] if x]
                out.append(gk_cell(parts))
            return out
        if not dep: verbo['ind']['impf'] = {'att': rowi(GK_IMPF_A)}
        verbo['ind'].setdefault('impf', {})['mp'] = rowi(GK_IMPF_M)
        if not dep:
            verbo['inf']['pres_att'] = gk_cell([(T,'t'),('ειν','d')], pre=NFC(accent_at(T + 'ειν', 2)))
        verbo['inf']['pres_mp'] = gk_cell([(T,'t'),('ε','v'),('σθαι','d')])
        if not dep:
            verbo['ptc']['pres_att'] = gk_cell([(T,'t'),('ων','d')], pre=NFC(strip_acc(T) + 'ών') if False else None) or None
            verbo['ptc']['pres_att'] = gk_cell([(T,'t'),('ων','d')])
        verbo['ptc']['pres_mp'] = gk_cell([(T,'t'),('ο','v'),('μενος','d')])
    # ── congiuntivo · ottativo · imperativo (sistema del presente) ──
    def mood_them(stem, table, role):
        return [gk_cell([(stem,'t')] + ([(mv,role)] if mv else []) + ([(de,'d')] if de else [])) for mv, de in table]
    def mood_contract(Tc, endings):
        cells = []
        for end in endings:
            eb = strip_acc(end)
            pre = accent_verb(NFC(Tc + eb)) if eb == end else NFC(Tc + end)
            h, t2 = gk_split_contract(eb)
            parts = [(Tc,'t'),(h,'v')] + ([(t2,'d')] if t2 else [])
            cells.append(gk_cell(parts, pre=NFC(pre)))
        return cells
    def mood_mi(red, forms):
        cells = []
        for f in forms:
            b = strip_acc(f)
            parts = [(red,'a'),(b[len(red):],'d')] if (red and b.startswith(red)) else [(b,'t')]
            cells.append(gk_cell(parts, pre=NFC(f)))
        return cells
    if not dep:
        if mi:
            if lemma in MI_MOOD:
                mm = MI_MOOD[lemma]; red = mi[0]
                verbo['cong'] = {'pres': {'att': mood_mi(red, mm['cong'][0]), 'mp': mood_mi(red, mm['cong'][1])}}
                verbo['opt']  = {'pres': {'att': mood_mi(red, mm['opt'][0]),  'mp': mood_mi(red, mm['opt'][1])}}
                verbo['imv']  = {'pres': {'att': mood_mi(red, mm['imv'][0]),  'mp': mood_mi(red, mm['imv'][1])}}
        elif contract:
            Tc = T[:-1]; cm = CONTR_MOOD[contract]
            verbo['cong'] = {'pres': {'att': mood_contract(Tc, cm['cong'][0]), 'mp': mood_contract(Tc, cm['cong'][1])}}
            verbo['opt']  = {'pres': {'att': mood_contract(Tc, cm['opt'][0]),  'mp': mood_contract(Tc, cm['opt'][1])}}
            verbo['imv']  = {'pres': {'att': mood_contract(Tc, cm['imv'][0]),  'mp': mood_contract(Tc, cm['imv'][1])}}
        else:
            verbo['cong'] = {'pres': {'att': mood_them(T, GK_CONG_A, 's'), 'mp': mood_them(T, GK_CONG_M, 's')}}
            verbo['opt']  = {'pres': {'att': mood_them(T, GK_OPT_A, 's'),  'mp': mood_them(T, GK_OPT_M, 's')}}
            verbo['imv']  = {'pres': {'att': mood_them(T, GK_IMV_A, 'v'),  'mp': mood_them(T, GK_IMV_M, 'v')}}
    # futuro
    if v['fut']:
        fs = strip_acc(v['fut'])
        liquid = fs.endswith('~')
        if liquid:
            fs = fs[:-1]
            cells = []
            for ve, de in GK_PRES_A:
                cfull = CONTR['ε'].get(ve + de)
                if cfull is None: cells.append(None); continue
                h, t2 = gk_split_contract(cfull)
                cells.append(gk_cell([(fs,'t'),(h,'v'),(t2,'d')], pre=NFC(fs + cfull)))
            verbo['ind']['fut'] = {('mp' if dep else 'att'): cells}
            nota.append('futuro contratto (tema in liquida): -ῶ, -εῖς…')
        else:
            sig = fs.endswith('σ')
            base = fs[:-1] if sig else fs
            def rowf(base6):
                out = []
                for ve, de in base6:
                    parts = [(base,'t')] + ([('σ','s')] if sig else []) + ([(ve,'v')] if ve else []) + ([(de,'d')] if de else [])
                    out.append(gk_cell(parts))
                return out
            verbo['ind']['fut'] = {('mp' if dep else 'att'): rowf(GK_PRES_M if dep else GK_PRES_A)}
            if not sig:
                nota.append('futuro: la caratteristica σ è fusa nel tema (ξ = gutt.+σ, ψ = lab.+σ)')
    # aoristo
    at = v.get('aor_type') or ''
    if v['aor'] and (at in ('1','1m') or at.startswith('2') or at.startswith('root') or at.startswith('kappa')):
        aor = strip_acc(v['aor'])
        if at in ('1', '1m'):
            stem_aug = aor[:-1] if at == '1' else aor[:-4]
            sig = stem_aug.endswith('σ')
            body = stem_aug[:-1] if sig else stem_aug
            un = de_augment(body if not sig else body + 'σ', lemma)
            A2, T2 = ('', body)
            if un:
                unb = un[:-1] if sig and un.endswith('σ') else un
                if NG(body).endswith(NG(unb)) and len(body) > len(unb):
                    A2, T2 = body[:len(body)-len(unb)], unb
            def rowa(base6, mid=False):
                out = []
                for sfx, de in base6:
                    if sig:
                        s_seg = sfx  # σα/σε già con σ? no: GK_AOR1 ha σα/σε compreso σ
                        parts = [(x, r) for x, r in [(A2,'a'),(T2,'t'),(s_seg,'s'),(de,'d')] if x]
                    else:
                        parts = [(x, r) for x, r in [(A2,'a'),(T2 + sfx[0],'t'),(sfx[1:],'s'),(de,'d')] if x]
                    out.append(gk_cell(parts))
                return out
            if sig:
                if at == '1':
                    verbo['ind']['aor'] = {'att': rowa(GK_AOR1)}
                    verbo['ind']['aor']['mp'] = [gk_cell([(x,r) for x, r in [(A2,'a'),(T2,'t'),(s,'s'),(d,'d')] if x])
                        for s, d in [('σα','μην'),('σ','ω'),('σα','το'),('σα','μεθα'),('σα','σθε'),('σα','ντο')]]
                else:
                    verbo['ind']['aor'] = {'mp': [gk_cell([(x,r) for x, r in [(A2,'a'),(T2,'t'),(s,'s'),(d,'d')] if x])
                        for s, d in [('σα','μην'),('σ','ω'),('σα','το'),('σα','μεθα'),('σα','σθε'),('σα','ντο')]]}
                un2 = de_augment(stem_aug, lemma)
                if un2 and at == '1':
                    verbo['inf']['aor_att'] = gk_cell([(un2[:-1],'t'),('σ','s'),('αι','d')],
                        pre=NFC(accent_at(un2 + 'αι', 2)))
            else:
                verbo['ind']['aor'] = {('att' if at == '1' else 'mp'):
                    [gk_cell([(x,r) for x, r in [(A2,'a'),(T2,'t'),(s,'s'),(d,'d')] if x]) for s, d in
                     ([('α',''),('α','ς'),('ε',''),('α','μεν'),('α','τε'),('α','ν')] if at == '1' else
                      [('α','μην'),('','ω'),('α','το'),('α','μεθα'),('α','σθε'),('α','ντο')])]}
                nota.append('aoristo sigmatico: il σ è fuso nel tema (ξ, ψ)')
        elif at.startswith('2m:') or at.startswith('2:'):
            st2 = strip_acc(at.split(':')[1])
            mid = at.startswith('2m')
            stem_aug = aor[:-4] if mid else aor[:-2]
            A2, T2 = ('', stem_aug)
            if NG(stem_aug).endswith(NG(st2)) and len(stem_aug) > len(st2):
                A2, T2 = stem_aug[:len(stem_aug)-len(st2)], st2
            base6 = GK_IMPF_M if mid else GK_IMPF_A
            verbo['ind']['aor'] = {('mp' if mid else 'att'):
                [gk_cell([(x, r) for x, r in [(A2,'a'),(T2,'t'),(ve,'v'),(de,'d')] if x]) for ve, de in base6]}
            if mid:
                verbo['inf']['aor_mp'] = gk_cell([(st2,'t'),('ε','v'),('σθαι','d')],
                    pre=NFC(accent_at(st2 + 'εσθαι', 2)))
            else:
                verbo['inf']['aor_att'] = gk_cell([(st2,'t'),('εῖν','d')], pre=NFC(strip_acc(st2) + 'εῖν'))
                verbo['ptc']['aor_att'] = gk_cell([(st2,'t'),('ών','d')], pre=NFC(strip_acc(st2) + 'ών'))
            nota.append('aoristo II (tematico): tema dell\'aoristo diverso dal tema del presente')
        elif at.startswith('root:'):
            long_s, short_s = at[5:].split('/')
            base = aor[:-1] if aor.endswith('ν') else aor
            stem_pure = strip_acc(long_s)
            A2 = base[:len(base)-len(stem_pure)] if NG(base).endswith(NG(stem_pure)) else ''
            T2 = stem_pure if A2 else base
            ends = [('ν',),('ς',),('',),('μεν',),('τε',),('σαν',)]
            verbo['ind']['aor'] = {'att': [gk_cell([(x, r) for x, r in [(A2,'a'),(T2,'t'),(e[0],'d')] if x]) for e in ends]}
            verbo['inf']['aor_att'] = gk_cell([(stem_pure,'t'),('ναι','d')],
                pre=NFC(accent_at(stem_pure + 'ναι', 2, circum=True)))
            nota.append('aoristo radicale atematico (ἔβην, ἔγνων)')
        elif at.startswith('kappa:'):
            short_s = at[6:]
            stem_aug = aor[:-1]
            body = stem_aug[:-1]
            A2 = ''
            un = de_augment(body + 'κ', lemma)
            if un and NG(stem_aug).endswith(NG(un)):
                A2 = stem_aug[:len(stem_aug)-len(un)]
                body = un[:-1]
            verbo['ind']['aor'] = {'att': [gk_cell([(x, r) for x, r in
                [(A2,'a'),(body,'t'),('κ','s'),(d,'d')] if x]) for d in ('α','ας','ε','αμεν','ατε','αν')]}
            nota.append('aoristo in -κα (δίδωμι, τίθημι, ἵημι)')
    # aoristo passivo
    if v['aorp']:
        ap = strip_acc(v['aorp'])
        stem_aug = ap[:-2]
        theta = stem_aug.endswith('θ')
        body = stem_aug[:-1] if theta else stem_aug
        un = de_augment(stem_aug, lemma)
        A2, T2 = '', body
        if un:
            unb = un[:-1] if theta and un.endswith('θ') else un
            if NG(body).endswith(NG(unb)) and len(body) > len(unb):
                A2, T2 = body[:len(body)-len(unb)], unb
        S2 = 'θη' if theta else 'η'
        verbo['ind']['aorp'] = {'pass': [gk_cell([(x, r) for x, r in
            [(A2,'a'),(T2,'t'),(S2,'s'),(d,'d')] if x]) for _, d in
            [(None,'ν'),(None,'ς'),(None,''),(None,'μεν'),(None,'τε'),(None,'σαν')]]}
        un2 = de_augment(stem_aug, lemma)
        if un2:
            base_inf = un2[:-1] if theta else un2
            verbo['inf']['aorp'] = gk_cell([(base_inf,'t'),('θῆ' if theta else 'ῆ','s'),('ναι','d')],
                pre=NFC(accent_at(un2 + 'ηναι'.replace('η','η'), 2, circum=True)) if False else
                    NFC(accent_at(un2 + 'ηναι', 2, circum=True)))
        if not theta:
            nota.append('aoristo passivo II in -η- (senza θ)')
    # perfetto
    if v['pf']:
        pf = strip_acc(v['pf'])
        pstem_pf = pf[:-1]
        kappa = pstem_pf.endswith('κ')
        body = pstem_pf[:-1] if kappa else pstem_pf
        R2 = ''
        b = NG(body)
        if len(b) >= 3 and b[1] == 'ε' and b[0] == b[2]:
            R2 = body[:2]; body = body[2:]
        verbo['ind']['pf'] = {'att': [gk_cell([(x, r) for x, r in
            [(R2,'a'),(body,'t'),('κ' if kappa else '','s'),(d,'d')] if x]) for _, d in zip(range(6), ('α','ας','ε','αμεν','ατε','ασι'))]}
        if R2: nota.append('perfetto: raddoppiamento evidenziato come aumento stabile')
    if v['pfmp']:
        mp = strip_acc(v['pfmp'])
        base = mp[:-3] if mp.endswith('μαι') else mp
        R2 = ''
        b = NG(base)
        if len(b) >= 3 and b[1] == 'ε' and b[0] == b[2]:
            R2 = base[:2]; core2 = base[2:]
        else:
            core2 = base
        nb = NG(base)
        # il TEMA porta la consonante assimilata; la desinenza resta pulita
        if nb.endswith('μ'):
            root = core2[:-1]
            cells = [(root+'μ','μαι'),(root+'ψ','αι'),(root+'π','ται'),(root+'μ','μεθα'),(root+'φ','θε'),(None,None)]
        elif nb.endswith('γ'):
            root = core2[:-1]
            cells = [(root+'γ','μαι'),(root+'ξ','αι'),(root+'κ','ται'),(root+'γ','μεθα'),(root+'χ','θε'),(None,None)]
        elif nb.endswith('σ'):
            cells = [(core2,'μαι'),(core2,'αι'),(core2,'ται'),(core2,'μεθα'),(core2,'θε'),(None,None)]
        else:
            cells = [(core2,'μαι'),(core2,'σαι'),(core2,'ται'),(core2,'μεθα'),(core2,'σθε'),(core2,'νται')]
        row = []
        for tt, dd in cells:
            if tt is None: row.append(None); continue
            row.append(gk_cell([(x, r) for x, r in [(R2,'a'),(tt,'t'),(dd,'d')] if x]))
        verbo['ind']['pfmp'] = {'mp': row}
        nota.append('perfetto medio-passivo: desinenze assimilate al tema (μμαι, ξαι, σται…)')
    parts_head = [lemma]
    # futuro nella «voce»: prendi la 1ª sing. GIÀ ACCENTATA dal paradigma generato
    # (ricostruirla dallo stem nudo dava λυσω senza accento)
    _futn = verbo.get('ind', {}).get('fut')
    _f1 = next(iter(_futn.values()))[0] if _futn else None
    if _f1:
        parts_head.append(''.join(s[0] for s in _f1))
    elif v['fut']:
        parts_head.append(accent_verb(NFC(strip_acc(v['fut'].replace('~','')) + 'ω')))
    if v['aor']: parts_head.append(v['aor'])
    if v['pf']: parts_head.append(v['pf'])
    if v['aorp']: parts_head.append(v['aorp'])
    # participi DECLINATI (pres/fut/aor/pf × att/med/pass), derivati dai principi — campo nuovo,
    # accanto a ptc (nominativo) per non rompere il renderer attuale; fallback se non derivabile
    try:
        pd = gk_participles(lemma, v)
        if pd: verbo['ptc_decl'] = pd
    except Exception:
        pass
    # modi aoristo/perfetto + ottativo futuro: FUSI in cong/opt/imv (già nidificati) — non-breaking
    try:
        for mood, tenses in gk_moods(lemma, v).items():
            for t, voices in tenses.items():
                verbo.setdefault(mood, {}).setdefault(t, {}).update(voices)
    except Exception:
        pass
    # infiniti completi (pres/fut/aor/pf × diatesi): campo NUOVO inf_full accanto a inf (nominativo)
    try:
        inf_full = gk_infinitives(lemma, v)
        if inf_full: verbo['inf_full'] = inf_full
    except Exception:
        pass
    _atem = strip_acc(lemma).endswith('μι')   # δίδωμι/τίθημι/ἵστημι/δείκνυμι/ἵημι → atematici in -μι
    _cl = ('verbo contratto in -' + contract + 'ω') if contract else ('verbo atematico (in -μι)' if _atem else 'verbo tematico')
    return dict(classe=_cl + (' · deponente' if dep else ''),
                testa=', '.join(parts_head), verbo=verbo, nota=(' · '.join(dict.fromkeys(nota)) or None))

def gk_noun_table(lemma, klass, stem):
    # Accentazione delegata al motore condiviso (accentuation.accent_nominal):
    # posizione persistente + acuto/circonflesso + quantità vocaliche. Qui restano
    # solo le uscite per classe e la segmentazione in morfemi (tema + desinenza).
    idx_start = nominal_idx_start(lemma)
    def C(end, gendat=False):
        pre = accent_nominal(lemma, klass, NFC(stem + end), end, gendat, idx_start)
        return split_accented(pre, [(stem, 't'), (end, 'd')])
    if klass == '2':
        sg = dict(nom=C('ος'), gen=C('ου', True), dat=C('ῳ', True), acc=C('ον'), voc=C('ε'))
        pl = dict(nom=C('οι'), gen=C('ων', True), dat=C('οις', True), acc=C('ους'), voc=C('οι'))
        cl = '2ª declinazione'
    elif klass == '2n':
        nn = C('ον'); npl = C('α')
        sg = dict(nom=nn, gen=C('ου', True), dat=C('ῳ', True), acc=nn, voc=nn)
        pl = dict(nom=npl, gen=C('ων', True), dat=C('οις', True), acc=npl, voc=npl)
        cl = '2ª declinazione (neutro)'
    elif klass in ('1h', '1a', '1am'):
        e1 = {'1h': ('η','ης','ῃ','ην'), '1a': ('α','ας','ᾳ','αν'), '1am': ('α','ης','ῃ','αν')}[klass]
        sg = dict(nom=C(e1[0]), gen=C(e1[1], True), dat=C(e1[2], True), acc=C(e1[3]), voc=C(e1[0]))
        pl = dict(nom=C('αι'), gen=C('ων', True), dat=C('αις', True), acc=C('ας'), voc=C('αι'))
        cl = '1ª declinazione' + {'1h':' (in -η)','1a':' (in -ᾱ puro)','1am':' (in -ᾰ misto)'}[klass]
    elif klass == '1m':
        sg = dict(nom=C('ης'), gen=C('ου', True), dat=C('ῃ', True), acc=C('ην'), voc=C('α'))
        pl = dict(nom=C('αι'), gen=C('ων', True), dat=C('αις', True), acc=C('ας'), voc=C('αι'))
        cl = '1ª declinazione (maschile in -ης)'
    elif klass == 'ma':
        sg = dict(nom=C('α'), gen=C('ατος', True), dat=C('ατι', True), acc=C('α'), voc=C('α'))
        pl = dict(nom=C('ατα'), gen=C('ατων', True), dat=C('ασι', True), acc=C('ατα'), voc=C('ατα'))
        cl = '3ª declinazione (tema in -ματ, neutro)'
    elif klass == 'es':
        sg = dict(nom=C('ος'), gen=C('ους', True), dat=C('ει', True), acc=C('ος'), voc=C('ος'))
        pl = dict(nom=C('η'), gen=C('ων', True), dat=C('εσι', True), acc=C('η'), voc=C('η'))
        cl = '3ª declinazione (tema in -εσ, neutro)'
    elif klass == 'is':
        sg = dict(nom=C('ις'), gen=C('εως', True), dat=C('ει', True), acc=C('ιν'), voc=C('ι'))
        pl = dict(nom=C('εις'), gen=C('εων', True), dat=C('εσι', True), acc=C('εις'), voc=C('εις'))
        cl = '3ª declinazione (tema in -ι: πόλις)'
    elif klass == '3':
        dp = dat_pl_3(stem)
        dsplit = ('σι' if dp.endswith('σι') else 'ι')
        dpstem = dp[:len(dp) - len(dsplit)]
        pldat = split_accented(accent_nominal(lemma, klass, dp, dsplit, True, idx_start),
                               [(dpstem, 't'), (dsplit, 'd')])
        sg = dict(nom=[[lemma,'t']], gen=C('ος', True), dat=C('ι', True), acc=C('α'), voc=[[lemma,'t']])
        es = C('ες')
        pl = dict(nom=es, gen=C('ων', True), dat=pldat, acc=C('ας'), voc=es)
        cl = '3ª declinazione'
    else:
        return None
    return dict(classe=cl, tab={'sg': sg, 'pl': pl})

# ═══════════════════ MAIN ═══════════════════
# ═══════════════════ T4 · PARTE DEL DISCORSO + CATEGORIA (targhetta) ═══════════════════
# Il dict piatto (data/*/<lettera>.json → dict[lemma].pos) porta GIÀ il PoS ricco
# dalle fonti (L&S / LSJ). Qui lo si PROPAGA ai paradigmi, mappato sulle etichette
# capitalizzate del laboratorio (POS_CLASS/POS_LAB: Sostantivo/Aggettivo/Verbo/…),
# e si aggiunge `cat` (targhetta breve: declinazione, coniugazione, classe, categoria).
# REGOLA SACRA: dove la fonte non basta a distinguere (sost. vs agg.) si lascia il
# nominale generico 'nome' e lo si SEGNALA — mai indovinare.
POS_LAB = {'sostantivo': 'Sostantivo', 'aggettivo': 'Aggettivo', 'verbo': 'Verbo',
           'pronome': 'Pronome', 'avverbio': 'Avverbio', 'preposizione': 'Preposizione',
           'congiunzione': 'Congiunzione', 'articolo': 'Articolo', 'interiezione': 'Interiezione',
           'numerale': 'Numerale', 'particella': 'Particella'}
_NOMINAL_POS = {'sostantivo', 'aggettivo', 'pronome', 'numerale', 'articolo'}

# Completamento delle closed-class DECLINABILI dove la fonte tace: mai un indovinello,
# solo lemmi certi ed enumerabili (grammatica chiusa). Valore = (POS_LAB, categoria).
CLOSED_CLASS = {
    'latin': {
        'qui': ('Pronome', 'relativo'), 'quis': ('Pronome', 'interrogativo'),
        'hic': ('Pronome', 'dimostrativo'), 'ille': ('Pronome', 'dimostrativo'),
        'iste': ('Pronome', 'dimostrativo'), 'is': ('Pronome', 'determinativo'),
        'ipse': ('Pronome', 'determinativo'), 'idem': ('Pronome', 'determinativo'),
        'ego': ('Pronome', 'personale'), 'tu': ('Pronome', 'personale'), 'sui': ('Pronome', 'riflessivo'),
        'unus': ('Numerale', 'cardinale'), 'duo': ('Numerale', 'cardinale'), 'tres': ('Numerale', 'cardinale'),
    },
    'greek': {
        'ὁ': ('Articolo', 'determinativo'),
        'ὅς': ('Pronome', 'relativo'), 'ὅστις': ('Pronome', 'relativo indef.'),
        'οὗτος': ('Pronome', 'dimostrativo'), 'ἐκεῖνος': ('Pronome', 'dimostrativo'), 'ὅδε': ('Pronome', 'dimostrativo'),
        'αὐτός': ('Pronome', 'determinativo'), 'ἐγώ': ('Pronome', 'personale'), 'σύ': ('Pronome', 'personale'),
        'τις': ('Pronome', 'indefinito'), 'τίς': ('Pronome', 'interrogativo'),
        'εἷς': ('Numerale', 'cardinale'), 'δύο': ('Numerale', 'cardinale'),
        'τρεῖς': ('Numerale', 'cardinale'), 'τέσσαρες': ('Numerale', 'cardinale'),
    },
}

def _num_in(classe):
    m = re.search(r'([1-5])ª', classe or '')
    return m.group(1) if m else ''

def _cat_nominale(classe):
    n = _num_in(classe); neu = 'neutro' in (classe or '')   # 'neutro' robusto: anche «(tema in -i, neutro)»
    return (f'{n}ª decl.' if n else 'decl.') + (' n.' if neu else '')

def _cat_verbo(classe):
    c = classe or ''; dep = 'deponente' in c
    if 'mista' in c: base = 'mista'
    elif '-μι' in c or 'atematico' in c: base = 'atem. -μι'   # PRIMA di 'tematico' («atematico» lo contiene!)
    elif 'contratto' in c:
        m = re.search(r'-([αεο])ω', c); base = f'contr. -{m.group(1)}ω' if m else 'contratto'
    elif 'tematico' in c: base = 'tematico'
    else:
        n = _num_in(c); base = f'{n}ª con.' if n else 'con.'
    return base + (' dep.' if dep else '')

def _cat_aggettivo(classe):
    n = _num_in(classe)          # 1ª/2ª decl. → 1ª classe (bonus, -a, -um);  3ª decl. → 2ª classe (fortis, felix)
    if n in ('1', '2'): return '1ª classe'
    if n == '3': return '2ª classe'
    return 'agg.'

def assign_nominal_pos(lang, lemma, flat_pos, classe):
    """Per un NOMINALE (già declinato): → (pos_lab, cat, incerto).
    Fonte sufficiente ⇒ etichetta certa. Fonte insufficiente ⇒ 'nome' + flag,
    salvo che il lemma sia una closed-class declinabile nota (completamento)."""
    fp = (flat_pos or '').strip().lower()
    if fp == 'aggettivo':
        if _num_in(classe) not in ('1', '2', '3'):   # agg. di 4ª/5ª decl. = impossibile ⇒ fonte inaffidabile
            return 'nome', _cat_nominale(classe), True
        return 'Aggettivo', _cat_aggettivo(classe), False
    if fp in _NOMINAL_POS:                       # sostantivo/pronome/numerale/articolo dalla fonte
        return POS_LAB[fp], _cat_nominale(classe), False
    # fonte vuota o non-nominale in conflitto col fatto che declina: prova il completamento closed-class
    cc = CLOSED_CLASS.get(lang, {})
    if lemma in cc:
        pl, categoria = cc[lemma]
        return pl, categoria, False
    # nessuna certezza sost. vs agg.: resta nominale generico + segnalazione
    return 'nome', _cat_nominale(classe), True

def main(write=True):
    out = {'latin': collections.defaultdict(dict), 'greek': collections.defaultdict(dict)}
    stats = collections.Counter()
    # LATINO
    base = 'data/latin'
    for f in sorted(os.listdir(base)):
        if not f.endswith('.json') or f.startswith('_'): continue
        data = json.load(open(os.path.join(base, f), encoding='utf-8'))
        for lemma, e in (data.get('dict') or {}).items():
            if not isinstance(e, dict): continue
            dfn = e.get('definition', ''); pos = e.get('pos', '')
            entry = None
            if pos in ('sostantivo', 'aggettivo', ''):
                h = parse_noun_head(lemma, dfn)
                if h:
                    t = lat_noun_table(lemma, h['gen_full'], h['gen_raw'], h['gender'])
                    if t:
                        P, CAT, unc = assign_nominal_pos('latin', lemma, pos, t['classe'])
                        entry = dict(pos=P, cat=CAT, classe=t['classe'],
                                     testa=f"{lemma}, {h['gen_full']} {h['gender']}", nome=t['tab'])
                        stats['lat_nomi'] += 1
                        stats['pos·' + ('nome (incerto)' if unc else P)] += 1
            if entry is None and pos in ('verbo', '') and (NL(lemma).endswith('o') or NL(lemma).endswith('or')):
                h = parse_verb_head(lemma, dfn)
                if h:
                    t = lat_verb_table(lemma, h['conj'], h['pstem'], h['pfstem'], h['supstem'], h['dep'])
                    entry = dict(pos='Verbo', cat=_cat_verbo(t['classe']), classe=t['classe'], testa=t['testa'], verbo=t['verbo'])
                    if t.get('nota'): entry['nota'] = t['nota']
                    stats['lat_verbi'] += 1
                    stats['pos·Verbo'] += 1
            if entry:
                out['latin'][NL(lemma)[:1]][lemma] = entry
    # GRECO · verbi curati
    for lemma, v in VERBS.items():
        try:
            t = gk_verb_table(lemma, v)
            entry = dict(pos='Verbo', cat=_cat_verbo(t['classe']), classe=t['classe'], testa=t['testa'], verbo=t['verbo'])
            if t.get('nota'): entry['nota'] = t['nota']
            out['greek'][NG(lemma)[:1]][lemma] = entry
            stats['gr_verbi'] += 1
            stats['pos·Verbo'] += 1
        except Exception as ex:
            print(f'  [!] {lemma}: {ex}')
    # GRECO · nominali
    base = 'data/greek'
    for f in sorted(os.listdir(base)):
        if not f.endswith('.json') or f.startswith('_'): continue
        p = os.path.join(base, f)
        if os.path.isdir(p): continue
        data = json.load(open(p, encoding='utf-8'))
        for lemma, e in (data.get('dict') or {}).items():
            if not isinstance(e, dict) or e.get('pos') != 'sostantivo': continue
            cl = classify_nominal(lemma, e.get('definition', ''))
            if not cl and lemma in NOMINAL_EXTRA:
                lb = strip_acc(lemma); k = NOMINAL_EXTRA[lemma]
                cl = (k, lb[:-2] if k in ('2','2n') else lb[:-1])
            if not cl: continue
            t = gk_noun_table(lemma, cl[0], cl[1])
            if not t: continue
            m = re.match(r'^\s*(ὁ|ἡ|τό|ὁ/ἡ)\s+(\S+?),\s+(\S+?)(?:\s*·|\s*$|\s)', e.get('definition',''))
            testa = f"{m.group(1)} {lemma}, {m.group(3)}" if m else lemma
            P, CAT, unc = assign_nominal_pos('greek', lemma, e.get('pos'), t['classe'])
            out['greek'][NG(lemma)[:1]][lemma] = dict(pos=P, cat=CAT, classe=t['classe'], testa=testa, nome=t['tab'])
            stats['gr_nomi'] += 1
            stats['pos·' + ('nome (incerto)' if unc else P)] += 1
    print('paradigmi:', dict(stats))
    if not write:
        return out
    for lang in ('latin', 'greek'):
        d = f'data/{lang}/paradigms'
        os.makedirs(d, exist_ok=True)
        for letter, paradigms in sorted(out[lang].items()):
            json.dump({'meta': {'lang': lang, 'letter': letter, 'count': len(paradigms)},
                       'paradigms': paradigms},
                      open(os.path.join(d, f'{letter}.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        print(f'{lang}: scritte {len(out[lang])} lettere in {d}/')
    return out

if __name__ == '__main__':
    main(write='--dry' not in sys.argv)
