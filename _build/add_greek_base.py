# -*- coding: utf-8 -*-
"""add_greek_base.py — Promuove a lemma cercabile le voci-base greche che hanno
già una glossa italiana curata (modules/dictionary/italian-glosses.js) ma NON
un headword nel dizionario attivo (data/greek/<lettera>.json).

Caso d'uso: parole foundational del liceo (πόλις, ἀγαθός, πᾶς, οὗτος, οὐ, εἰ…)
hanno la traduzione italiana nel modulo glosse, ma la ricerca dà «non trovato»
perché manca la voce. Qui colmiamo il divario: per ogni lemma glossato assente
dai shard aggiungiamo {pos, definition}. La PoS è dedotta dalle sezioni-commento
del blocco GREEK_GLOSSES; la definizione è la glossa italiana stessa.

Uso:  python _build/add_greek_base.py --dry-run
      python _build/add_greek_base.py
"""
import json, os, re, sys, glob, unicodedata
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(__file__))
GR = os.path.join(ROOT, 'data', 'greek')
GLOSSES = os.path.join(ROOT, 'modules', 'dictionary', 'italian-glosses.js')
DRY = '--dry-run' in sys.argv

# commento di sezione → PoS (override puntuali per la sezione mista finale)
SECTION_POS = {
    'verbi': 'verbo',
    'sostantivi': 'sostantivo',
    'aggettivi': 'aggettivo',
    'pronomi': 'pronome',
    'congiunzioni': 'congiunzione',
}
POS_OVERRIDE = {'οὐ': 'avverbio', 'μή': 'avverbio', 'οὖν': 'avverbio'}

# Morfologia curata dei sostantivi: (articolo, genitivo completo). Serve al motore
# per classificare la declinazione (la III si ricava SOLO dal genitivo) e il genere
# (l'articolo). La definizione diventa una citazione da vocabolario:
#   "ἡ πόλις, πόλεως · città · stato"
NOUN_MORPH = {
    'θεά': ('ἡ', 'θεᾶς'),        'πόλις': ('ἡ', 'πόλεως'),     'μήτηρ': ('ἡ', 'μητρός'),
    'ἀδελφός': ('ὁ', 'ἀδελφοῦ'), 'φίλος': ('ὁ', 'φίλου'),      'ἐχθρός': ('ὁ', 'ἐχθροῦ'),
    'πολέμιος': ('ὁ', 'πολεμίου'),'δοῦλος': ('ὁ', 'δούλου'),   'δεσπότης': ('ὁ', 'δεσπότου'),
    'βίος': ('ὁ', 'βίου'),       'σῶμα': ('τό', 'σώματος'),    'καρδία': ('ἡ', 'καρδίας'),
    'ἀρετή': ('ἡ', 'ἀρετῆς'),    'τέχνη': ('ἡ', 'τέχνης'),     'ἐπιστήμη': ('ἡ', 'ἐπιστήμης'),
    'ἡμέρα': ('ἡ', 'ἡμέρας'),    'θάλασσα': ('ἡ', 'θαλάσσης'), 'ὄρος': ('τό', 'ὄρους'),
    'οἰκία': ('ἡ', 'οἰκίας'),    'πόλεμος': ('ὁ', 'πολέμου'),  'εἰρήνη': ('ἡ', 'εἰρήνης'),
    'νίκη': ('ἡ', 'νίκης'),      'φόβος': ('ὁ', 'φόβου'),      'ἀρχή': ('ἡ', 'ἀρχῆς'),
    'τέλος': ('τό', 'τέλους'),   'ὁδός': ('ἡ', 'ὁδοῦ'),        'βίβλος': ('ἡ', 'βίβλου'),
    'ὀφθαλμός': ('ὁ', 'ὀφθαλμοῦ'),
}


def make_definition(lemma, gloss, pos):
    """Per i sostantivi anteponi la citazione morfologica (articolo + genitivo);
    per le altre categorie la definizione resta la glossa italiana."""
    if pos == 'sostantivo' and lemma in NOUN_MORPH:
        art, gen = NOUN_MORPH[lemma]
        return f'{art} {lemma}, {gen} · {gloss}'
    return gloss


def base_letter(lemma):
    """Prima lettera normalizzata (NFD + strip diacritici + lower) → nome shard."""
    s = ''.join(c for c in unicodedata.normalize('NFD', lemma) if unicodedata.category(c) != 'Mn')
    return s[:1].lower()


def parse_greek_glosses():
    src = open(GLOSSES, encoding='utf-8').read()
    m = re.search(r'GREEK_GLOSSES\s*=\s*\{(.*?)\n\};', src, re.S)
    if not m:
        sys.exit('GREEK_GLOSSES non trovato')
    blk = m.group(1)
    out = []           # (lemma, gloss, pos)
    cur = None
    for line in blk.splitlines():
        s = line.strip()
        cm = re.match(r'//\s*(.+)', s)
        if cm:
            head = cm.group(1).lower()
            cur = None
            for key, pos in SECTION_POS.items():
                if head.startswith(key):
                    cur = pos
                    break
            continue
        em = re.match(r"'([^']+)'\s*:\s*'([^']*)'", s)
        if em and cur:
            lemma, gloss = em.group(1), em.group(2)
            out.append((lemma, gloss, POS_OVERRIDE.get(lemma, cur)))
    return out


def main():
    glosses = parse_greek_glosses()
    # carica i shard attivi
    shards = {}
    headwords = set()
    for f in sorted(glob.glob(os.path.join(GR, '*.json'))):
        if os.path.basename(f).startswith('_'):
            continue
        d = json.load(open(f, encoding='utf-8'))
        letter = os.path.splitext(os.path.basename(f))[0]
        shards[letter] = (f, d)
        headwords.update((d.get('dict') or {}).keys())

    to_add = [(l, g, p) for (l, g, p) in glosses if l not in headwords]
    by_pos = {}
    changed_files = {}
    for lemma, gloss, pos in to_add:
        by_pos[pos] = by_pos.get(pos, 0) + 1
        letter = base_letter(lemma)
        if letter not in shards:
            print(f'  ! nessuno shard per {lemma!r} (lettera {letter!r}) — salto')
            continue
        f, d = shards[letter]
        d.setdefault('dict', {})[lemma] = {'pos': pos, 'definition': make_definition(lemma, gloss, pos)}
        changed_files[letter] = (f, d)

    print(f'Glosse greche totali: {len(glosses)}')
    print(f'Già presenti come headword: {len(glosses) - len(to_add)}')
    print(f'Da aggiungere: {len(to_add)}  → ' + ' · '.join(f'{k}={v}' for k, v in sorted(by_pos.items())))
    print('\nElenco aggiunte:')
    for lemma, gloss, pos in to_add:
        print(f'  + {lemma:10s} [{pos:12s}] {gloss}')

    if DRY:
        print('\n(DRY RUN — nessun file modificato)')
        return
    for letter, (f, d) in changed_files.items():
        with open(f, 'w', encoding='utf-8') as out:
            json.dump(d, out, ensure_ascii=False)
    # aggiorna il conteggio nell'indice
    idxp = os.path.join(GR, '_index.json')
    idx = json.load(open(idxp, encoding='utf-8'))
    if 'meta' in idx and 'total_lemmas' in idx['meta']:
        idx['meta']['total_lemmas'] += len(to_add)
        with open(idxp, 'w', encoding='utf-8') as out:
            json.dump(idx, out, ensure_ascii=False)
    print(f'\nScritti {len(changed_files)} shard. total_lemmas aggiornato (+{len(to_add)}).')


if __name__ == '__main__':
    main()
