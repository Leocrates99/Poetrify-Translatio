# -*- coding: utf-8 -*-
"""T4 · Completamento delle CLOSED-CLASS nel dict piatto (sorgente L&S / LSJ).

Le parti del discorso chiuse ed enumerabili — articolo greco, pronomi, numerali
cardinali — sono spesso mal taggate o vuote nella fonte:
    ὁ 'sostantivo'  (è l'ARTICOLO)      ·  ἐγώ 'verbo'  (è il PRONOME personale)
    qui/is 'aggettivo' (sono PRONOMI)   ·  ille/ego/iste vuoti (PRONOMI)
    unus/tres/mille 'aggettivo'         (sono NUMERALI cardinali)
Qui si CORREGGE il pos di questi lemmi noti, SOLO dove il lemma è PRESENTE nel
dict e la sua identità è certa dalla glossa: mai un indovinello, solo grammatica
chiusa. Idempotente e chirurgico — tocca esclusivamente il campo `pos` dei lemmi
elencati; `forms`, `definition` e tutto il resto restano intatti. I generatori
gen_latin_forms / gen_greek_forms fanno json.dump(data) preservando `dict`, quindi
la patch è DUREVOLE (sopravvive alle rigenerazioni dell'indice piatto).

Lemmi richiesti ma ASSENTI dalla fonte (εἷς/δύο/τρεῖς/τέσσαρες, ὅστις; duo, vos,
se) NON sono completabili con una patch di pos — servirebbe autorare la voce.
"""
import json, os, io, glob, sys
sys.stdout.reconfigure(encoding='utf-8')

# lemma → pos corretto (minuscolo, convenzione del dict piatto). Solo closed-class certe.
FIX = {
    'greek': {
        'ὁ': 'articolo',        # articolo determinativo (glossa: "is, joined with a Subst.")
        'ἐγώ': 'pronome',       # pron. personale 1ª (glossa: "Pron. of the first person")
    },
    'latin': {
        # pronomi: relativo / interrogativo / dimostrativi / determinativo / personali
        'qui': 'pronome', 'quis': 'pronome', 'ille': 'pronome', 'iste': 'pronome',
        'is': 'pronome', 'ipse': 'pronome', 'hic': 'pronome',
        'ego': 'pronome', 'tu': 'pronome', 'nos': 'pronome',
        # numerali cardinali
        'unus': 'numerale', 'tres': 'numerale', 'mille': 'numerale',
    },
}

def run(write=True):
    changed = 0; report = []; absent = []
    for lang, fixes in FIX.items():
        seen = set()
        for path in glob.glob(f'data/{lang}/*.json'):
            if os.sep + 'paradigms' + os.sep in path: continue
            data = json.load(io.open(path, encoding='utf-8'))
            d = data.get('dict') or {}
            dirty = False
            for lem, newpos in fixes.items():
                if lem in d:
                    seen.add(lem)
                    old = d[lem].get('pos', '')
                    if old != newpos:
                        d[lem]['pos'] = newpos; dirty = True; changed += 1
                        report.append((lang, lem, old or '∅', newpos))
            if dirty and write:
                json.dump(data, io.open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        absent += [(lang, l) for l in fixes if l not in seen]
    for lang, lem, old, new in report:
        print(f'  {lang:6} {lem:8} {old:12} → {new}')
    if absent:
        print('  (assenti dalla fonte, non patchabili:', ', '.join(f'{l}·{lang[:3]}' for lang, l in absent) + ')')
    print(f'closed-class completati: {changed}')
    return changed

if __name__ == '__main__':
    run(write='--dry' not in sys.argv)
