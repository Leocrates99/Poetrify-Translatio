# -*- coding: utf-8 -*-
"""deduce_pos.py — Deduce la Part-of-Speech mancante per i lemmi latini.

~25% dei lemmi del nucleo latino (Lewis) non ha il tag `pos`. La definizione
Lewis però inizia con la forma-citazione + marcatori morfologici, da cui si può
dedurre la categoria in modo conservativo:
  • "adj." → aggettivo · "adv." → avverbio · "praep." → preposizione
  • "conj." → congiunzione · "pron." → pronome · "num." → numerale
  • un token isolato m/f/n nei primi token → sostantivo
  • desinenza d'infinito (are/ere/ire) o pattern dei paradigmi → verbo
Riempe SOLO quando il marcatore è chiaro (niente ipotesi azzardate).

Uso:  python _build/deduce_pos.py --dry-run   (mostra i conteggi)
      python _build/deduce_pos.py             (scrive gli shard)
"""
import json, os, re, sys, glob
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.join(os.path.dirname(__file__), '..', 'data', 'latin')
DRY = '--dry-run' in sys.argv

INF = re.compile(r'(?:^|[\s,(])(?:-)?[a-zāēīōūăĕĭŏŭ]*(?:āre|ēre|ere|īre|ĕre)(?:[\s,)]|$)', re.I)
# token di genere isolato (m/f/n) nei primi ~30 caratteri, dopo la citazione
GENDER = re.compile(r'(?:^|[\s,)])\s*(m|f|n)\b\.?(?:[\s,]|$)')
PERF = re.compile(r'\b[a-zāēīōūăĕĭŏŭ]+[īuvs]ī\b', re.I)  # perfetto tipo amāvī, monuī, rēxī

def deduce(lemma, defn):
    if not defn:
        return ''
    d = defn.strip()
    low = d.lower()
    head = d[:60]
    headlow = low[:60]
    # marcatori espliciti Lewis
    if re.search(r'\badj\.', headlow): return 'aggettivo'
    if re.search(r'\badv\.', headlow): return 'avverbio'
    if re.search(r'\bpraep\.', headlow): return 'preposizione'
    if re.search(r'\bconj\.', headlow): return 'congiunzione'
    if re.search(r'\bpron\.', headlow): return 'pronome'
    if re.search(r'\bnum\.|\bnumer', headlow): return 'numerale'
    if re.search(r'\binterj\.', headlow): return 'interiezione'
    # sostantivo: genere isolato m/f/n nella testa (es. "annus ī, m 1 AC-, a year")
    if GENDER.search(head):
        return 'sostantivo'
    # verbo: desinenza d'infinito nella testa, o pattern perfetto + "to <verbo>"
    if INF.search(head) or (PERF.search(head) and re.search(r'\bto\s+[a-z]', low[:80])):
        return 'verbo'
    return ''

def main():
    files = sorted(f for f in glob.glob(os.path.join(ROOT, '*.json')) if not os.path.basename(f).startswith('_'))
    counts = {}
    total_missing = total_filled = 0
    samples = []
    for f in files:
        d = json.load(open(f, encoding='utf-8'))
        dct = d.get('dict') or {}
        changed = False
        for lemma, v in dct.items():
            if (str(v.get('pos') or '')).strip():
                continue
            total_missing += 1
            pos = deduce(lemma, v.get('definition') or '')
            if pos:
                total_filled += 1
                counts[pos] = counts.get(pos, 0) + 1
                if len(samples) < 16:
                    samples.append(f"{lemma} → {pos}  ::  {(v.get('definition') or '')[:48]}")
                if not DRY:
                    v['pos'] = pos
                    changed = True
        if changed and not DRY:
            with open(f, 'w', encoding='utf-8') as out:
                json.dump(d, out, ensure_ascii=False)
    print(f"Lemmi senza PoS: {total_missing}")
    print(f"PoS dedotte:     {total_filled} ({100*total_filled//max(total_missing,1)}%)  → restano vuoti {total_missing-total_filled}")
    print("Per categoria:  " + " · ".join(f"{k}={v}" for k,v in sorted(counts.items(), key=lambda x:-x[1])))
    print("\nEsempi:")
    for s in samples: print("  ", s)
    if DRY: print("\n(DRY RUN — nessun file modificato)")

if __name__ == '__main__':
    main()
