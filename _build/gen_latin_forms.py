# -*- coding: utf-8 -*-
"""Generatore morfologico LATINO · forme flesse + parsing (incremento 5).

Le classi si deducono dalla TESTA della definizione L&S della voce stessa:
  «rosa ae, f …» · «rēx rēgis, m …» · «corpus oris, n …» · «manus ūs, f …»
  «amō āvī, ātus, āre …» · «dūcō ūxī, uctus, ere …» · «cōnor ātus, ārī …»
Le parti parziali (oris, grī, ūxī) si risolvono per FUSIONE AD ANCORAGGIO
contro il lemma (corpus+oris → corporis; ager+grī → agrī; dūc+ūxī → dūxī).

NOMI — 5 declinazioni complete; 3ª col genitivo plurale secondo la regola
scolastica dei temi in -i (parisillabi in -is/-es; monosillabi con tema in
doppia consonante; neutri in -e/-al/-ar → -ium; altrimenti -um); neutri con
acc. = nom. VERBI — 4 coniugazioni + mista (-iō): sistema del presente
attivo e passivo completo (ind. pres./impf./fut., cong. pres./impf., imv.,
inf., ptc. pres. declinato, gerundivo), sistema del perfetto quando il tema
è certo (ind. pf./ppf./fut. ant., cong. pf./ppf. — amāvisset! —, inf. pf.),
participio perfetto declinato + supino quando il tema è dato. Deponenti:
sistema del presente in forma passiva. Output SENZA macron (come l'indice
esistente); il lookup del motore è comunque tollerante ai diacritici.

Fusione: riempie il parsing vuoto delle forme esistenti dello stesso lemma
e aggiunge le forme mancanti (il paradigma di amō aveva buchi: amavisset
non esisteva). Idempotente."""
import json, os, re, sys, unicodedata, collections
sys.stdout.reconfigure(encoding='utf-8')

def N(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if not unicodedata.combining(c))

def demacron(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c))

# ── risoluzione delle parti parziali L&S contro il lemma ──
NOM_ENDINGS = ['us', 'um', 'a', 'es', 'is', 'e', 'os', 'on', 'x', 's', 'o']
def resolve_part(lemma, part, vowel_anchor=False):
    """corpus+oris→corporis · ager+grī→agrī · rosa+ae→rosae · rēx+rēgis→regis.
    Con vowel_anchor (parti verbali): dūc+ūxī→dūxī, dūc+uctus→ductus (la
    parte parziale rimpiazza dalla VOCALE del tema in poi)."""
    lem = N(lemma); p = N(part)
    if not p: return None
    if len(p) >= len(lem) - 1 and p.startswith(lem[:2]):
        return p                                    # forma piena (rēgis, urbis)
    for k in range(min(len(lem), len(p), 4), 0, -1):  # sovrapposizione massima
        if lem.endswith(p[:k]) and len(lem) - k >= 1:
            return lem[:len(lem)-k] + p
    if p[0] not in 'aeiou':                          # ancoraggio su consonante
        idx = lem.rfind(p[0], max(0, len(lem)-4))
        if idx >= 1:
            return lem[:idx] + p
    elif vowel_anchor:                               # ancoraggio su vocale (verbi)
        idx = lem.rfind(p[0], max(0, len(lem)-4))
        if idx >= 1:
            return lem[:idx] + p
    # forma piena con apofonia (cēpī per capiō, vīsus per videō): DOPO gli
    # ancoraggi, altrimenti ruberebbe le parti dei composti (dē-dūcō dūxī).
    if len(p) >= 3 and p[0] == lem[0] and p.endswith(('i', 'us', 'um')):
        return p
    for e in NOM_ENDINGS:                            # spoglia l'uscita del nom.
        if lem.endswith(e) and len(lem) - len(e) >= 1:
            return lem[:len(lem)-len(e)] + p
    return None

# ── NOMI ──
def gen_noun(lemma, gen_full, gen_raw, gender):
    lem = N(lemma); g = N(gen_full)
    out = collections.defaultdict(list)
    def add(form, parsing):
        out[form].append(parsing)
    raw = demacron(gen_raw)
    # classe dall'uscita del genitivo (il RAW conserva la distinzione ūs)
    if g.endswith('ae'):
        st = g[:-2]
        for e, p in (('a','nom./voc./abl. sg.'), ('ae','gen./dat. sg. · nom. pl.'), ('am','acc. sg.'),
                     ('arum','gen. pl.'), ('is','dat./abl. pl.'), ('as','acc. pl.')):
            add(st+e, f'{p} (1ª decl.)')
    elif gen_raw.strip() in ('ūs', 'us') and 'ū' in gen_raw:
        st = g[:-2]
        for e, p in (('us','nom./voc. sg. · gen. sg. · nom./acc. pl.'), ('ui','dat. sg.'),
                     ('um','acc. sg.'), ('u','abl. sg.'), ('uum','gen. pl.'), ('ibus','dat./abl. pl.')):
            add(st+e, f'{p} (4ª decl.)')
    elif g.endswith('ei') and lem.endswith('es'):   # 5ª solo col nom. in -es (rēs/reī)
        st = g[:-2]
        for e, p in (('es','nom./voc. sg. · nom./acc. pl.'), ('ei','gen./dat. sg.'), ('em','acc. sg.'),
                     ('e','abl. sg.'), ('erum','gen. pl.'), ('ebus','dat./abl. pl.')):
            add(st+e, f'{p} (5ª decl.)')
    elif g.endswith('i') and not g.endswith('is'):
        st = g[:-1]
        if gender == 'n':
            for e, p in (('um','nom./acc./voc. sg.'), ('i','gen. sg.'), ('o','dat./abl. sg.'),
                         ('a','nom./acc. pl.'), ('orum','gen. pl.'), ('is','dat./abl. pl.')):
                add(st+e, f'{p} (2ª decl. n.)')
        else:
            add(lem, 'nom. sg. (2ª decl.)')
            voc = st + 'e' if lem.endswith('us') else lem
            if lem.endswith('ius'): voc = st[:-1] + 'i'   # fīlī
            add(voc, 'voc. sg. (2ª decl.)')
            for e, p in (('i','gen. sg. · nom. pl.'), ('o','dat./abl. sg.'), ('um','acc. sg.'),
                         ('orum','gen. pl.'), ('is','dat./abl. pl.'), ('os','acc. pl.')):
                add(st+e, f'{p} (2ª decl.)')
    elif g.endswith('is'):
        st = g[:-2]
        # gen. pl.: regola dei temi in -i
        parisyll = lem.endswith(('is', 'es')) and abs(len(lem) - len(g)) <= 1
        double_cons = len(st) >= 2 and st[-1] not in 'aeiou' and st[-2] not in 'aeiou'
        neuter_ial = lem.endswith(('e', 'al', 'ar')) and gender == 'n'
        istem = parisyll or double_cons or neuter_ial
        gpl = 'ium' if istem else 'um'
        add(st+'is', 'gen. sg. (3ª decl.)')
        add(st+'i', 'dat. sg. (3ª decl.)')
        add(st+gpl, 'gen. pl. (3ª decl.)')
        add(st+'ibus', 'dat./abl. pl. (3ª decl.)')
        if gender == 'n':
            plna = 'ia' if neuter_ial else 'a'
            add(st+plna, 'nom./acc. pl. (3ª decl. n.)')
            add(st+('i' if neuter_ial else 'e'), 'abl. sg. (3ª decl. n.)')
        else:
            add(st+'em', 'acc. sg. (3ª decl.)')
            add(st+'e', 'abl. sg. (3ª decl.)')
            add(st+'es', 'nom./acc. pl. (3ª decl.)')
    return out

# ── VERBI ──
P_ACT = {  # coniugazione → (vocale tematica per gruppi)
 '1':  dict(pres=('o','as','at','amus','atis','ant'), impf='aba', fut1=('abo','abis','abit','abimus','abitis','abunt'),
            subj=('em','es','et','emus','etis','ent'), inf='are', imv=('a','ate'), ptc='ans', ptcst='ant', ger='and'),
 '2':  dict(pres=('eo','es','et','emus','etis','ent'), impf='eba', fut1=('ebo','ebis','ebit','ebimus','ebitis','ebunt'),
            subj=('eam','eas','eat','eamus','eatis','eant'), inf='ere', imv=('e','ete'), ptc='ens', ptcst='ent', ger='end'),
 '3':  dict(pres=('o','is','it','imus','itis','unt'), impf='eba', fut1=('am','es','et','emus','etis','ent'),
            subj=('am','as','at','amus','atis','ant'), inf='ere', imv=('e','ite'), ptc='ens', ptcst='ent', ger='end'),
 '3io': dict(pres=('io','is','it','imus','itis','iunt'), impf='ieba', fut1=('iam','ies','iet','iemus','ietis','ient'),
            subj=('iam','ias','iat','iamus','iatis','iant'), inf='ere', imv=('e','ite'), ptc='iens', ptcst='ient', ger='iend'),
 '4':  dict(pres=('io','is','it','imus','itis','iunt'), impf='ieba', fut1=('iam','ies','iet','iemus','ietis','ient'),
            subj=('iam','ias','iat','iamus','iatis','iant'), inf='ire', imv=('i','ite'), ptc='iens', ptcst='ient', ger='iend'),
}
PERS = ('1ª sg.', '2ª sg.', '3ª sg.', '1ª pl.', '2ª pl.', '3ª pl.')
PASS_PRES = {
 '1': ('or','aris','atur','amur','amini','antur'),
 '2': ('eor','eris','etur','emur','emini','entur'),
 '3': ('or','eris','itur','imur','imini','untur'),
 '3io': ('ior','eris','itur','imur','imini','iuntur'),
 '4': ('ior','iris','itur','imur','imini','iuntur'),
}

def gen_verb(lemma, conj, pstem, pfstem, supstem, dep=False):
    out = collections.defaultdict(list)
    def add(form, parsing):
        out[form].append(parsing)
    T = P_ACT[conj]
    dl = ' dep.' if dep else ''
    if not dep:
        for e, pers in zip(T['pres'], PERS): add(pstem+e, f'pres. ind. att. {pers}')
        for i, pers in enumerate(PERS):
            e = ('m','s','t','mus','tis','nt')[i]
            add(pstem+T['impf']+('m' if e=='m' else e), f'impf. ind. att. {pers}')
        for e, pers in zip(T['fut1'], PERS): add(pstem+e, f'fut. ind. att. {pers}')
        for e, pers in zip(T['subj'], PERS): add(pstem+e, f'pres. cong. att. {pers}')
        inf = pstem + T['inf']
        add(inf, 'inf. pres. att.')
        for i, pers in enumerate(PERS):
            add(inf+('m','s','t','mus','tis','nt')[i], f'impf. cong. att. {pers}')
        add(pstem+T['imv'][0], 'imv. pres. 2ª sg.')
        add(pstem+T['imv'][1], 'imv. pres. 2ª pl.')
    # participio presente (3ª decl. a una uscita): ANCHE per le deponenti (forma attiva),
    # neutro plurale -ia incluso → parità col segmentato
    add(pstem+T['ptc'], 'ptc. pres. nom./voc. sg.')
    for e, p in (('is','gen. sg.'), ('i','dat. sg.'), ('em','acc. m./f. sg.'), ('e','abl. sg.'),
                 ('es','nom./acc. m./f. pl.'), ('ia','nom./acc. n. pl.'), ('ium','gen. pl.'), ('ibus','dat./abl. pl.')):
        add(pstem+T['ptcst']+e, f'ptc. pres. {p}')
    # passivo (o deponente: stesse uscite)
    for e, pers in zip(PASS_PRES[conj], PERS): add(pstem+e, f'pres. ind. {"" if dep else "pass. "}{pers}{dl}')
    for i, pers in enumerate(PERS):
        e = ('r','ris','tur','mur','mini','ntur')[i]
        add(pstem+T['impf']+e, f'impf. ind. {"" if dep else "pass. "}{pers}{dl}')
    futp = { '1': ('abor','aberis','abitur','abimur','abimini','abuntur'),
             '2': ('ebor','eberis','ebitur','ebimur','ebimini','ebuntur'),
             '3': ('ar','eris','etur','emur','emini','entur'),
             '3io': ('iar','ieris','ietur','iemur','iemini','ientur'),
             '4': ('iar','ieris','ietur','iemur','iemini','ientur') }[conj]
    for e, pers in zip(futp, PERS): add(pstem+e, f'fut. ind. {"" if dep else "pass. "}{pers}{dl}')
    subjp = tuple(s[:-1]+('r' if s.endswith('m') else s[-1]) for s in ())
    for i, pers in enumerate(PERS):
        base = T['subj'][i]
        e = { 0: base[:-1]+'r', 3: base[:-3]+'mur', 4: base[:-3]+'mini', 5: base[:-2]+'ntur' }.get(i)
        if i == 1: e = base[:-1] + 'ris'
        if i == 2: e = base[:-1] + 'tur'
        add(pstem+e, f'pres. cong. {"" if dep else "pass. "}{pers}{dl}')
    infp = pstem + (T['inf'][:-1] + 'i' if conj not in ('3', '3io') else 'i')
    add(infp, f'inf. pres. {"dep." if dep else "pass."}')
    add(pstem+T['ger']+'us', 'gerundivo nom. m. sg.')
    for e in ('e','a','um','i','o','ae','am','os','as','orum','arum','is'):
        add(pstem+T['ger']+e, 'gerundivo/gerundio')
    # sistema del perfetto
    if pfstem:
        for e, pers in zip(('i','isti','it','imus','istis','erunt'), PERS): add(pfstem+e, f'pf. ind. att. {pers}')
        add(pfstem+'ere', 'pf. ind. att. 3ª pl. (in -ēre)')
        for e, pers in zip(('eram','eras','erat','eramus','eratis','erant'), PERS): add(pfstem+e, f'ppf. ind. att. {pers}')
        for e, pers in zip(('ero','eris','erit','erimus','eritis','erint'), PERS): add(pfstem+e, f'fut. ant. att. {pers}')
        for e, pers in zip(('erim','eris','erit','erimus','eritis','erint'), PERS): add(pfstem+e, f'pf. cong. att. {pers}')
        for e, pers in zip(('issem','isses','isset','issemus','issetis','issent'), PERS): add(pfstem+e, f'ppf. cong. att. {pers}')
        add(pfstem+'isse', 'inf. pf. att.')
    if supstem:
        # participio perfetto E futuro: 1ª/2ª classe declinati PIENI (voc. sg. m. e
        # acc. f. pl. inclusi) → il piatto eguaglia il segmentato di gen_paradigms.
        for e, p in (('us', 'nom. m. sg.'), ('e', 'voc. m. sg.'), ('um', 'nom./acc./voc. n. sg. · acc. m. sg.'),
                     ('i', 'gen. m./n. sg. · nom. m. pl.'), ('o', 'dat./abl. m./n. sg.'), ('orum', 'gen. m./n. pl.'),
                     ('is', 'dat./abl. pl.'), ('os', 'acc. m. pl.'), ('a', 'nom./voc. f. sg. · nom./acc. n. pl.'),
                     ('ae', 'gen./dat. f. sg. · nom./voc. f. pl.'), ('am', 'acc. f. sg.'), ('arum', 'gen. f. pl.'), ('as', 'acc. f. pl.')):
            add(supstem + e, f'ptc. pf. {p}')
            add(supstem + 'ur' + e, f'ptc. fut. {p}')
    return out

RE_NOUN = re.compile(r'^\s*\d?\)?\s*(\S+)\s+([^\s,]+)[\s,]+(m and f|f and m|[mfn])\b')
# Fallback non ancorato: teste con prosa interposta («bellum old and poet.
# duellum, ī, n»). Prende il PRIMO «token, genere» e valida poi l'uscita.
RE_NOUN_LOOSE = re.compile(r'(\S+?)[\s,]+(m and f|f and m|[mfn])\b')
# L'infinito dev'essere un TOKEN a sé (preceduto da spazio o virgola): la
# alternativa nuda «ī» matcherebbe dentro «āvī». Niente «ī» solitaria (i rari
# deponenti di 3ª tipo «sequor, ī» restano fuori: meglio l'assenza dell'errore).
RE_VERB = re.compile(r'^\s*\d?\)?\s*(\S+)\s+(.*?)(?:(?<=,)|(?<= ))(āre|ārī|ēre|ērī|ere|īre|īrī)\s*(?=[\s,;.]|$)')

def parse_verb_head(lemma, definition):
    d = re.sub(r'\([^)]*\)', '', definition.split(':')[0])[:90]
    m = RE_VERB.match(d)
    if not m: return None
    inf = m.group(3)
    parts = [p.strip(' ,;') for p in m.group(2).split(',') if p.strip(' ,;')]
    parts = [p.split(' or ')[0].strip() for p in parts if not p[:1].isupper()]
    lem = N(lemma)
    dep = lem.endswith('or') or lemma.endswith('or')
    pstem = lem[:-2] if dep else (lem[:-1] if lem.endswith('o') else None)
    if pstem is None: return None
    conj = { 'āre':'1', 'ārī':'1', 'ēre':'2', 'ērī':'2', 'īre':'4', 'īrī':'4' }.get(inf)
    if conj is None:  # ere / ī → 3ª (o mista se il lemma esce in -iō)
        conj = '3io' if lem.endswith('io') else '3'
    if conj in ('1','2','4') and lem.endswith('io') and inf in ('āre','ārī'):
        pass
    if conj == '4': pstem = lem[:-2] if lem.endswith('io') else pstem
    if conj == '3io': pstem = lem[:-2]
    if conj == '2' and pstem.endswith('e'): pstem = pstem[:-1]
    pfstem = supstem = None
    lembase = lemma[:-1] if not dep else lemma[:-2]
    for p in parts[:3]:
        pn = N(p)
        if pn.endswith('i') and not pn.endswith('ri') and len(pn) >= 2 and not pfstem:
            full = resolve_part(lembase, p, vowel_anchor=True) or (pstem + pn if len(pn) <= 3 else None)
            if pn in ('avi','evi','ivi','ui','i'):
                full = pstem + pn
            if full and full.endswith('i'):
                pfstem = full[:-1]
        if (pn.endswith('us') or pn.endswith('um')) and not supstem:
            full = resolve_part(lembase, p, vowel_anchor=True)
            if pn in ('atus','etus','itus','utus','tus','sus','atum','itum'):
                full = pstem + pn
            if full and (full.endswith('us') or full.endswith('um')):
                supstem = full[:-2]
    if dep and not supstem:
        for p in parts[:2]:
            pn = N(p)
            if pn.endswith('us'):
                supstem = (pstem + pn[:-2]) if len(pn) <= 4 else None
    return dict(conj=conj, pstem=pstem, pfstem=pfstem, supstem=supstem, dep=dep)

GEN_OK = ('ae', 'i', 'is', 'us', 'ei')
def parse_noun_head(lemma, definition):
    d = re.sub(r'\([^)]*\)', '', definition.split(':')[0])[:80]
    m = RE_NOUN.match(d)
    gen_raw = gender = None
    if m and N(m.group(1)) == N(lemma) and N(m.group(2)) not in ('m','f','n'):
        gen_raw, gender = m.group(2), m.group(3)[0]
    else:
        m2 = RE_NOUN_LOOSE.search(d[:60])
        if m2 and N(m2.group(1)) != N(lemma):
            gen_raw, gender = m2.group(1).rstrip('.,;'), m2.group(2)[0]
    if not gen_raw: return None
    if not re.fullmatch(r'[a-zāēīōūŭĭăŏĕ]+', N(gen_raw) and gen_raw, re.I): return None
    full = resolve_part(lemma, gen_raw)
    if not full or not any(N(full).endswith(e) for e in GEN_OK): return None
    return dict(gen_full=full, gen_raw=gen_raw, gender=gender)

def main(write=True):
    base = 'data/latin'
    gen_all = collections.defaultdict(list)   # forma → [(lemma, parsing)]
    nn = nv = 0
    for f in sorted(os.listdir(base)):
        if not f.endswith('.json') or f.startswith('_'): continue
        data = json.load(open(os.path.join(base, f), encoding='utf-8'))
        for lemma, e in (data.get('dict') or {}).items():
            if not isinstance(e, dict): continue
            dfn = e.get('definition', '')
            pos = e.get('pos', '')
            hn = hv = None
            if pos in ('sostantivo', 'aggettivo', ''):
                # anche «aggettivo» e pos VUOTA: voci mal taggate (rēs reī, f;
                # cōnor); le regex con genere/infinito espliciti fanno da guardia.
                hn = parse_noun_head(lemma, dfn)
            if hn is None and pos in ('verbo', '') and (N(lemma).endswith('o') or N(lemma).endswith('or')):
                hv = parse_verb_head(lemma, dfn)
            if hn:
                nn += 1
                for form, plist in gen_noun(lemma, hn['gen_full'], hn['gen_raw'], hn['gender']).items():
                    gen_all[form].append((lemma, ' / '.join(sorted(set(plist)))))
            elif hv:
                nv += 1
                for form, plist in gen_verb(lemma, hv['conj'], hv['pstem'], hv['pfstem'], hv['supstem'], hv['dep']).items():
                    gen_all[form].append((lemma, ' / '.join(sorted(set(plist)))))
    print(f'nomi classificati: {nn} · verbi: {nv} · forme generate: {len(gen_all)}')
    if not write:
        return gen_all
    by_letter = collections.defaultdict(dict)
    for form, cands in gen_all.items():
        by_letter[N(form)[:1]][form] = cands
    added = filled = 0
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
                have = { N(c['lemma']) for c in existing }
                for l, p in cands[:3]:
                    if N(l) in have:
                        for c in existing:
                            if N(c['lemma']) == N(l) and not c.get('parsing'):
                                c['parsing'] = p; filled += 1; changed = True
                    elif len(existing) < 5:
                        existing.append({'lemma': l, 'parsing': p}); added += 1; changed = True
        if changed:
            data.setdefault('meta', {})['forms_count'] = len(fdict)
            json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'fusione: +{added} candidati nuovi · {filled} parsing riempiti su forme esistenti')

if __name__ == '__main__':
    main(write='--dry' not in sys.argv)
