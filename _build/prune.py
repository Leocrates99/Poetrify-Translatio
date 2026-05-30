# -*- coding: utf-8 -*-
"""
prune.py — Semplificazione scolastica dei dizionari Poetrify.

Riduce ogni lingua a ~10.000 lemmi del nucleo scolastico, archiviando le
voci epigrafiche, papirologiche e le testimonianze eccessivamente
specifiche (richiesta utente). Le voci rimosse NON vengono cancellate: sono
spostate in data/<lang>/archive/<letter>.json e restano consultabili nel
dizionario con l'etichetta "archiviato" (fallback del LexiconEngine).

Le `forms` (tavole di flessione) restano INTATTE in ogni shard: la
morfologia del translator non viene toccata.

Uso:
    python _build/prune.py --dry-run     # mostra solo i conteggi finali
    python _build/prune.py               # esegue (con backup automatico)

Politica di selezione:
  • Latino (Lewis Elementary, già scolastico): si tengono tutti i lemmi
    ATTESTATI (con forme flesse nel corpus) + il lessico ad alta frequenza
    + le parole-funzione. ~11,7k lemmi. Si archiviano i ~5,9k non attestati.
  • Greco (LSJ9 integrale, 135k): si tiene il top ~10.500 per punteggio
    scolastico (ancorato a frequenza + forme attestate, penalizzando fonti
    epigrafiche/papirologiche, glossografi/testimonia, nomi propri,
    sotto-voci composte, voci sovraccariche di citazioni).
"""
import json, os, re, sys, shutil

ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')
DIR = {'latino': 'latin', 'greco': 'greek'}
DRY = '--dry-run' in sys.argv

GREEK_TARGET = 10500   # nucleo greco da tenere

# ── frequenza (boost ancora) ────────────────────────────────────────────
def load_freq_sets():
    p = os.path.join(os.path.dirname(__file__), '..', 'modules', 'dictionary', 'frequency.js')
    txt = open(p, encoding='utf-8').read()
    lat, gr = set(), set()
    for m in re.finditer(r"const (LATIN|GREEK)_FREQ_\d\s*=\s*new Set\(\[(.*?)\]\)", txt, re.S):
        toks = re.findall(r"'([^']+)'", m.group(2))
        (lat if m.group(1) == 'LATIN' else gr).update(toks)
    return lat, gr
LAT_FREQ, GR_FREQ = load_freq_sets()

FUNCTION_POS = ('congiunzione', 'preposizione', 'pronome', 'particella', 'numerale')
CONTENT_POS  = ('sostantivo', 'aggettivo', 'verbo', 'avverbio')

EPIG = re.compile(r'\b(IG|SIG|OGI|SEG|CIG|GDI|Schwyzer|Sammelb|SB|Ostr|Inscr|Tab\.?Defix|'
                  r'P\.?(Oxy|Mich|Cair|Lond|Petr|Hib|Teb|Flor|Giss|Ryl|Hamb|Grenf|Strassb|Lille|Eleph|Par|Leid|Amh|Fay|Goodsp)|'
                  r'PSI|BGU|PCZ|PEnteux|PRev|PMagic|PGM|Wilcken|Mitteis)\b')
GLOSS = re.compile(r'\b(Hsch|Suid|Phot|EM|Zonar|AB|Sch|Et\.?Gud|Et\.?M|Cyr|Theognost|Orio|Ammon|Poll|Moer|Phryn|Hdn\.?Gr)\b')
NAME = re.compile(r'\b(name of|son of|daughter of|epith\.?|surname|place in|city in|town in|river in|mountain in|island in|'
                  r'festival|gentile name|nymph|deity|hero |Pythagorean|king of|tribe|demos|deme of)\b', re.I)
CIT = re.compile(r'\b[A-Z][A-Za-z]*\.?\s?\d[\d.,]*')
PAREN = re.compile(r'\([^)]*\)')
ABBR = re.compile(r'\b(cf|v|sq|al|prob|cj|interpol|Dim|Ep|Aeol|Dor|Ion|Att|Lat|Adj|Subst|pl|sg|gen|dat|acc|nom|voc|comp|Sup|impf|aor|pf|fut|Med|Pass|Act)\b\.?', re.I)
NONLAT = re.compile(r'[^\x00-\x7f]+')

def is_proper(lemma):
    for ch in lemma:
        if ch.isalpha():
            return ch == ch.upper() and ch != ch.lower()
    return False

def gloss_words(defn):
    s = PAREN.sub(' ', defn); s = CIT.sub(' ', s); s = ABBR.sub(' ', s); s = NONLAT.sub(' ', s)
    return len(re.findall(r"[A-Za-z][A-Za-z'-]{2,}", s))

def score(lang, lem, v, fset):
    defn = (v.get('definition') or '').strip()
    pos = v.get('pos') or ''
    base = (lem.split()[0] if lem else lem)
    s = 0.0
    freq = LAT_FREQ if lang == 'latino' else GR_FREQ
    if lem in freq: s += 1000
    if lem in fset: s += 500
    if pos in FUNCTION_POS: s += 200
    s += max(-6, min(12, 14 - len(base.replace('-', ''))))
    s += min(gloss_words(defn), 6)
    if pos in CONTENT_POS: s += 3
    s -= min(len(CIT.findall(defn)), 8) * 1.5
    if EPIG.search(defn): s -= 25
    if GLOSS.search(defn): s -= 12
    if NAME.search(defn): s -= 14
    if is_proper(lem): s -= 10
    if '-' in lem: s -= 7
    if not defn: s -= 200
    elif len(defn) <= 12: s -= 12
    return s

def load_lang(lang):
    d0 = DIR[lang]
    base = os.path.join(ROOT, d0)
    idx = json.load(open(os.path.join(base, '_index.json'), encoding='utf-8'))
    shards = {}
    forms_lemmas = set()
    for letter in idx['letters']:
        d = json.load(open(os.path.join(base, letter + '.json'), encoding='utf-8'))
        shards[letter] = d
        for arr in d.get('forms', {}).values():
            for e in arr:
                if e.get('lemma'): forms_lemmas.add(e['lemma'])
    return base, idx, shards, forms_lemmas

def compute_keep(lang, shards, forms_lemmas):
    dict_all = {}
    for d in shards.values():
        dict_all.update(d.get('dict', {}))
    fset = forms_lemmas & set(dict_all)
    if lang == 'latino':
        # principio: tieni tutti gli attestati + frequenza + parole-funzione
        keep = set(fset)
        for lem, v in dict_all.items():
            if lem in LAT_FREQ or (v.get('pos') or '') in FUNCTION_POS:
                keep.add(lem)
        cutoff = None
    else:
        scored = sorted(((score(lang, l, v, fset), l) for l, v in dict_all.items()),
                        key=lambda x: (-x[0], x[1]))
        keep = set(l for _, l in scored[:GREEK_TARGET])
        # ancore obbligatorie
        for lem, v in dict_all.items():
            if lem in fset or lem in GR_FREQ or (v.get('pos') or '') in FUNCTION_POS:
                keep.add(lem)
        cutoff = scored[GREEK_TARGET-1][0]
    return dict_all, fset, keep, cutoff

def main():
    summary = {}
    for lang in ('latino', 'greco'):
        base, idx, shards, forms_lemmas = load_lang(lang)
        dict_all, fset, keep, cutoff = compute_keep(lang, shards, forms_lemmas)
        archived = set(dict_all) - keep
        summary[lang] = dict(total=len(dict_all), kept=len(keep), archived=len(archived),
                             attested=len(fset), cutoff=cutoff)
        print(f"[{lang}] total={len(dict_all)} kept={len(keep)} archived={len(archived)} "
              f"attested={len(fset)} greek_cutoff={cutoff}")
        if DRY:
            continue
        # ── backup una-tantum dei dict originali (forms escluse, già intatte) ──
        bkp = os.path.join(os.path.dirname(__file__), 'backup', DIR[lang])
        os.makedirs(bkp, exist_ok=True)
        arch_dir = os.path.join(base, 'archive')
        os.makedirs(arch_dir, exist_ok=True)
        total_kept = 0; total_arch = 0
        arch_letters = []
        for letter, d in shards.items():
            dct = d.get('dict', {})
            # backup originale del dict di questo shard
            with open(os.path.join(bkp, letter + '.json'), 'w', encoding='utf-8') as f:
                json.dump(dct, f, ensure_ascii=False)
            kept_dict = {k: v for k, v in dct.items() if k in keep}
            arch_dict = {k: v for k, v in dct.items() if k not in keep}
            total_kept += len(kept_dict); total_arch += len(arch_dict)
            # riscrivi shard principale: forms intatte, dict = solo kept
            d['dict'] = kept_dict
            if 'meta' in d and isinstance(d['meta'], dict):
                d['meta']['lemmas_count'] = len(kept_dict)
                d['meta']['archived_count'] = len(arch_dict)
            with open(os.path.join(base, letter + '.json'), 'w', encoding='utf-8') as f:
                json.dump(d, f, ensure_ascii=False)
            # scrivi archivio (solo se non vuoto)
            if arch_dict:
                arch_letters.append(letter)
                with open(os.path.join(arch_dir, letter + '.json'), 'w', encoding='utf-8') as f:
                    json.dump({'meta': {'lang': lang, 'letter': letter,
                                        'archived_count': len(arch_dict)},
                               'dict': arch_dict}, f, ensure_ascii=False)
        # ── aggiorna _index.json ──
        idx_path = os.path.join(base, '_index.json')
        meta = idx.get('meta', {})
        meta['total_lemmas'] = total_kept
        meta['archived_lemmas'] = total_arch
        meta['scholastic'] = True
        idx['archive_letters'] = arch_letters
        with open(idx_path, 'w', encoding='utf-8') as f:
            json.dump(idx, f, ensure_ascii=False)
        print(f"   -> wrote shards: kept={total_kept} archived={total_arch} "
              f"archive_letters={len(arch_letters)} (backup in _build/backup/{DIR[lang]})")
    if DRY:
        print("\n(DRY RUN — nessun file modificato)")
    else:
        print("\nFatto. Index, shard e archivio aggiornati.")

if __name__ == '__main__':
    main()
