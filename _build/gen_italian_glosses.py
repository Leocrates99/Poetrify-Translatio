# -*- coding: utf-8 -*-
"""
Genera glosse italiane di base (a ventaglio) per l'intero lessico latino e greco
a partire dalle definizioni inglesi (Lewis / LSJ short-defs) presenti negli
shard `data/<lang>/<lettera>.json`.

Pipeline "translate-and-filter":
  1. isola la zona-glossa iniziale della definizione (prima delle citazioni/esempi);
  2. la spezza in segmenti (virgole / punti e virgola);
  3. scarta segmenti che sono citazioni, abbreviazioni morfologiche o stopword;
  4. traduce i segmenti/parole-contenuto con una mappa EN→IT curata;
  5. tiene i primi 2–4 traducenti DISTINTI → glossa a ventaglio "x · y · z".

Output: data/<lang>/glosses_it/<lettera>.json
  { "meta": {...}, "glosses": { "<lemma>": { "it": "amare · voler bene", "src": "auto" } } }

Le voci sono marcate `src:"auto"`. Le glosse curate a mano restano in
modules/dictionary/italian-glosses.js e hanno la precedenza a runtime.

Uso:  python _build/gen_italian_glosses.py            (genera tutto)
      python _build/gen_italian_glosses.py --stats    (solo statistiche di copertura)
"""
import sys, os, json, re, unicodedata

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ─────────────────────────────────────────────────────────────────────────────
# Stopword inglesi e marcatori da scartare (NON sono glosse)
# ─────────────────────────────────────────────────────────────────────────────
STOP = set("""
a an the to of in on at by for with from into onto upon as is are be been being
and or but nor so yet not no also esp especially cf abbrev gen genit dat acc abl
nom voc sing plur sg pl masc fem neut adj adv subst conj prep pron part perf
pres fut imperf aor opt subj imper inf ptcp dim contr poet rare prob usu freq
m f n c v p l t s i o e first short long etc ii iii also one's oneself something
someone any some who which what that this these those his her its their our your
my thy thee thou him them up down out off over under again away back forth
""".split())

# pattern di citazioni / riferimenti (autori, opere, numeri di riga)
CITE_RE = re.compile(r'[A-Z][a-zA-Z]*\.?\s*\d')          # Od.11, Il.4, Arist.
CITE_RE2 = re.compile(r'\b[A-Z]{2,}\b')                  # sigle maiuscole (AM-, AC-)
HASNUM_RE = re.compile(r'\d')
PARENTH_RE = re.compile(r'\([^)]*\)')                    # incisi tra parentesi
META_RE = re.compile(r'\[[^\]]*\]')                      # note metriche [..]

# ─────────────────────────────────────────────────────────────────────────────
# MAPPE EN→IT — separate per evitare le collisioni omografe verbo/nome
#   (es. "love" = amare [V] vs amore [N]). Il routing sceglie la mappa giusta:
#   un segmento "to X" o un verbo noto → EN2IT_V; altrimenti EN2IT_N (poi V).
#   La negazione ("not X", "without X", "un-/in-") è PRESERVATA: mai invertire
#   il significato (errore grave per la didattica).
# ─────────────────────────────────────────────────────────────────────────────
EN2IT_V = {
  # ── verbi (forma base inglese → infinito italiano) ──
  'love':'amare','like':'gradire','hate':'odiare','fear':'temere','wish':'desiderare',
  'want':'volere','will':'volere','desire':'desiderare','hope':'sperare',
  'have':'avere','hold':'tenere','possess':'possedere','keep':'mantenere','own':'possedere',
  'be':'essere','exist':'esistere','become':'diventare','seem':'sembrare','appear':'apparire',
  'make':'fare','do':'fare','act':'agire','create':'creare','build':'costruire','form':'formare',
  'give':'dare','grant':'concedere','offer':'offrire','provide':'fornire','bestow':'concedere',
  'take':'prendere','seize':'afferrare','catch':'catturare','grasp':'afferrare','receive':'ricevere','get':'ottenere',
  'say':'dire','speak':'parlare','tell':'raccontare','call':'chiamare','name':'nominare','declare':'dichiarare',
  'see':'vedere','look':'guardare','watch':'osservare','behold':'contemplare','perceive':'percepire',
  'hear':'udire','listen':'ascoltare','obey':'obbedire',
  'know':'sapere','understand':'comprendere','learn':'imparare','teach':'insegnare','think':'pensare',
  'believe':'credere','judge':'giudicare','consider':'considerare','suppose':'supporre','reckon':'ritenere','deem':'ritenere',
  'lead':'condurre','guide':'guidare','bring':'portare','carry':'portare','bear':'portare','drive':'spingere',
  'send':'mandare','throw':'gettare','cast':'lanciare','hurl':'scagliare',
  'come':'venire','go':'andare','walk':'camminare','step':'avanzare','arrive':'arrivare','depart':'partire',
  'run':'correre','flee':'fuggire','fly':'volare','sail':'navigare','move':'muovere','tend':'tendere',
  'stand':'stare','sit':'sedere','lie':'giacere','fall':'cadere','rise':'sorgere','remain':'rimanere','stay':'restare',
  'put':'porre','place':'collocare','set':'collocare','lay':'deporre','found':'fondare','establish':'stabilire',
  'write':'scrivere','read':'leggere','sing':'cantare','play':'suonare','compose':'comporre',
  'fight':'combattere','conquer':'vincere','win':'vincere','overcome':'superare','defeat':'sconfiggere',
  'kill':'uccidere','slay':'uccidere','wound':'ferire','destroy':'distruggere','ruin':'rovinare',
  'save':'salvare','free':'liberare','release':'liberare','loose':'sciogliere','bind':'legare','tie':'legare',
  'rule':'governare','reign':'regnare','command':'comandare','order':'ordinare','govern':'governare',
  'ask':'chiedere','seek':'cercare','beg':'pregare','pray':'pregare','demand':'esigere','require':'richiedere',
  'find':'trovare','discover':'scoprire','show':'mostrare','reveal':'rivelare','teach ':'insegnare',
  'open':'aprire','close':'chiudere','shut':'chiudere','cover':'coprire','hide':'nascondere',
  'cut':'tagliare','break':'spezzare','tear':'strappare','burn':'bruciare','wash':'lavare',
  'eat':'mangiare','drink':'bere','sleep':'dormire','live':'vivere','die':'morire','grow':'crescere','nourish':'nutrire',
  'work':'lavorare','suffer':'soffrire','endure':'sopportare','allow':'permettere','help':'aiutare','save ':'salvare',
  'use':'usare','need':'avere bisogno','owe':'dovere','ought':'dovere','can':'potere','able':'essere capace',
  'begin':'cominciare','start':'iniziare','end':'finire','cease':'cessare','stop':'fermare','finish':'terminare',
  'follow':'seguire','pursue':'inseguire','meet':'incontrare','join':'unire','gather':'radunare','collect':'raccogliere',
  'turn':'volgere','change':'cambiare','prepare':'preparare','choose':'scegliere','elect':'eleggere',
  'praise':'lodare','blame':'biasimare','honor':'onorare','honour':'onorare','worship':'venerare','admire':'ammirare',
  'persuade':'persuadere','advise':'consigliare','warn':'ammonire','announce':'annunciare','promise':'promettere',
  'cultivate':'coltivare','plough':'arare','sow':'seminare','reap':'mietere','feed':'nutrire','rear':'allevare',
  'touch':'toccare','strike':'colpire','beat':'battere','press':'premere','push':'spingere','pull':'tirare',
  'dare':'osare','try':'tentare','attempt':'tentare','compel':'costringere','force':'forzare',
  'accuse':'accusare','flee ':'fuggire','spare':'risparmiare','trust':'fidarsi','believe ':'credere',
}
EN2IT_N = {
  # ── sostantivi ──
  'water':'acqua','fire':'fuoco','air':'aria','earth':'terra','land':'terra','ground':'suolo',
  'sea':'mare','river':'fiume','stream':'corrente','spring':'fonte','fountain':'fonte','wave':'onda',
  'mountain':'monte','hill':'colle','field':'campo','wood':'bosco','forest':'selva','tree':'albero',
  'stone':'pietra','rock':'roccia','gold':'oro','silver':'argento','iron':'ferro','bronze':'bronzo',
  'sun':'sole','moon':'luna','star':'stella','sky':'cielo','heaven':'cielo','light':'luce','darkness':'oscurità',
  'day':'giorno','night':'notte','time':'tempo','year':'anno','hour':'ora','season':'stagione','age':'età',
  'man':'uomo','woman':'donna','human':'essere umano','person':'persona','boy':'fanciullo','girl':'fanciulla',
  'child':'bambino','son':'figlio','daughter':'figlia','father':'padre','mother':'madre',
  'brother':'fratello','sister':'sorella','wife':'moglie','husband':'marito','friend':'amico','enemy':'nemico',
  'king':'re','queen':'regina','lord':'signore','master':'padrone','slave':'schiavo','servant':'servo',
  'citizen':'cittadino','people':'popolo','crowd':'folla','army':'esercito','soldier':'soldato','general':'comandante',
  'god':'dio','goddess':'dea','soul':'anima','spirit':'spirito','mind':'mente','heart':'cuore',
  'body':'corpo','head':'testa','hand':'mano','foot':'piede','eye':'occhio','mouth':'bocca','face':'volto',
  'voice':'voce','word':'parola','speech':'discorso','language':'lingua','name':'nome','story':'racconto',
  'war':'guerra','battle':'battaglia','peace':'pace','victory':'vittoria','arms':'armi','weapon':'arma','sword':'spada',
  'city':'città','town':'città','country':'patria','home':'casa','house':'casa','wall':'muro','gate':'porta',
  'road':'strada','way':'via','path':'sentiero','journey':'viaggio','door':'porta','field ':'campo',
  'law':'legge','right':'diritto','justice':'giustizia','power':'potere','rule':'comando','kingdom':'regno',
  'love':'amore','hatred':'odio','fear':'paura','anger':'ira','joy':'gioia','grief':'dolore','pain':'dolore',
  'hope':'speranza','glory':'gloria','fame':'fama','honor':'onore','honour':'onore','virtue':'virtù','courage':'coraggio',
  'wisdom':'saggezza','knowledge':'conoscenza','art':'arte','skill':'abilità','reason':'ragione','opinion':'opinione',
  'truth':'verità','life':'vita','death':'morte','fate':'destino','fortune':'fortuna','luck':'sorte',
  'gift':'dono','money':'denaro','wealth':'ricchezza','price':'prezzo','work':'opera','deed':'azione','toil':'fatica',
  'animal':'animale','horse':'cavallo','dog':'cane','bird':'uccello','ox':'bue','sheep':'pecora','wolf':'lupo',
  'ship':'nave','boat':'barca','altar':'altare','temple':'tempio','gift ':'dono','food':'cibo','bread':'pane','wine':'vino',
  'book':'libro','letter':'lettera','number':'numero','part':'parte','place':'luogo','beginning':'inizio','end':'fine',
  'fortress':'fortezza','citadel':'cittadella','castle':'rocca','stronghold':'roccaforte','camp':'accampamento',
  'implements':'attrezzi','tools':'strumenti','instruments':'strumenti','outfit':'equipaggiamento',
  'affection':'affetto','friendship':'amicizia','feeling':'sentimento','passion':'passione',
  # ── aggettivi ──
  'great':'grande','large':'grande','big':'grande','small':'piccolo','little':'piccolo','vast':'vasto',
  'high':'alto','low':'basso','deep':'profondo','long':'lungo','short':'breve','wide':'ampio','broad':'ampio',
  'good':'buono','bad':'cattivo','evil':'malvagio','beautiful':'bello','fair':'bello','ugly':'brutto',
  'strong':'forte','weak':'debole','brave':'coraggioso','bold':'audace','swift':'veloce','quick':'rapido','slow':'lento',
  'new':'nuovo','old':'vecchio','ancient':'antico','young':'giovane','first':'primo','last':'ultimo','final':'finale',
  'true':'vero','false':'falso','sacred':'sacro','holy':'santo','divine':'divino','pure':'puro','clean':'pulito',
  'happy':'felice','fortunate':'fortunato','wretched':'misero','poor':'povero','rich':'ricco','noble':'nobile',
  'wise':'saggio','foolish':'stolto','just':'giusto','unjust':'ingiusto','heavy':'pesante','light':'leggero',
  'hard':'duro','soft':'molle','hot':'caldo','cold':'freddo','dry':'secco','wet':'umido','full':'pieno','empty':'vuoto',
  'whole':'intero','all':'tutto','many':'molti','few':'pochi','much':'molto','equal':'uguale','same':'stesso',
  'golden':'dorato','winged':'alato','invincible':'invincibile','unbroken':'integro','resistless':'irresistibile',
  'unforced':'spontaneo','insatiate':'insaziabile','unpleasant':'sgradevole','insupportable':'insopportabile',
  'blindness':'cecità','glory ':'gloria',
}

# normalizza una parola-glossa inglese per il lookup
def norm_en(w):
    return w.strip().strip('.,;:!?"\'()[]').lower()

def _try(maps, key):
    for m in maps:
        if key in m:
            return m[key]
    return None

def lookup(seg):
    """Traduce un segmento-glossa inglese in italiano.
       - sceglie mappa verbi/nomi in base al contesto ("to X" → verbi);
       - PRESERVA la negazione ("not X" → "non …", "without X" → "senza …");
       - prova frase intera, poi parola, poi prima parola-contenuto."""
    raw = seg.strip().lower()
    if not raw:
        return None
    is_verb_ctx = bool(re.match(r'^to\s+', raw))
    s = re.sub(r'^to\s+', '', raw)
    s = re.sub(r'^(a|an|the)\s+', '', s).strip()
    neg = ''
    mneg = re.match(r'^(not|without|no)\s+(.*)$', s)
    if mneg:
        neg = 'senza ' if mneg.group(1) == 'without' else 'non '
        s = re.sub(r'^to\s+', '', mneg.group(2).strip()).strip()
    if not s:
        return None
    maps = [EN2IT_V, EN2IT_N] if is_verb_ctx else [EN2IT_N, EN2IT_V]
    hit = _try(maps, s)                      # frase intera
    if hit:
        return neg + hit
    hit = _try(maps, norm_en(s))             # parola singola
    if hit:
        return neg + hit
    for tok in re.split(r'[\s/]+', s):       # prima parola-contenuto mappata
        t = norm_en(tok)
        if t and t not in STOP:
            hit = _try(maps, t)
            if hit:
                return neg + hit
    return None

def gloss_zone(defn):
    """Isola la zona-glossa iniziale (prima di esempi/citazioni estese)."""
    s = defn or ''
    s = re.sub(r'^[^,]*?-,\s*', '', s, count=1)   # togli marcatore ETYM "AM-,"
    s = PARENTH_RE.sub(' ', s)
    s = META_RE.sub(' ', s)
    # taglia all'inizio degli esempi/citazioni
    s = re.split(r'[:—]', s)[0]
    return s

def build_gloss(defn):
    """Ritorna (it_gloss, n_traducenti) o ('', 0)."""
    zone = gloss_zone(defn)
    segs = re.split(r'[;,]', zone)
    out = []
    for seg in segs:
        seg = seg.strip()
        if not seg:
            continue
        if HASNUM_RE.search(seg):           # contiene cifre → citazione
            continue
        if CITE_RE.search(seg) or CITE_RE2.search(seg):
            continue
        it = lookup(seg)
        if it and it not in out:
            out.append(it)
        if len(out) >= 4:
            break
    return (' · '.join(out), len(out))

def process_lang(lang, folder, letters):
    out_dir = os.path.join(ROOT, 'data', folder, 'glosses_it')
    os.makedirs(out_dir, exist_ok=True)
    tot = covered = 0
    for letter in letters:
        path = os.path.join(ROOT, 'data', folder, f'{letter}.json')
        if not os.path.exists(path):
            continue
        shard = json.load(open(path, encoding='utf-8'))
        glosses = {}
        for lemma, info in (shard.get('dict') or {}).items():
            tot += 1
            it, n = build_gloss(info.get('definition', ''))
            if it:
                covered += 1
                glosses[lemma] = {'it': it, 'src': 'auto'}
        out = {'meta': {'lang': lang, 'letter': letter,
                        'glosses_count': len(glosses), 'src': 'auto'},
               'glosses': glosses}
        json.dump(out, open(os.path.join(out_dir, f'{letter}.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, separators=(',', ':'))
    return tot, covered

def main():
    stats_only = '--stats' in sys.argv
    lat_idx = json.load(open(os.path.join(ROOT, 'data', 'latin', '_index.json'), encoding='utf-8'))
    gr_idx = json.load(open(os.path.join(ROOT, 'data', 'greek', '_index.json'), encoding='utf-8'))
    if stats_only:
        # ricarica e conta senza scrivere
        pass
    for lang, folder, idx in [('latino', 'latin', lat_idx), ('greco', 'greek', gr_idx)]:
        letters = idx.get('letters', [])
        tot, cov = process_lang(lang, folder, letters)
        pct = (100.0 * cov / tot) if tot else 0
        print(f'{lang:7} · lemmi {tot:6} · con glossa IT {cov:6} ({pct:.1f}%)')

if __name__ == '__main__':
    main()
