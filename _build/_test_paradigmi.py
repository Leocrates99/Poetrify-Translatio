# -*- coding: utf-8 -*-
"""Suite dei PARADIGMI-ORO: la generazione deve contenere le forme canoniche
attese (confronto normalizzato per il lookup + verifica del parsing)."""
import sys, unicodedata
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '_build')
from gen_greek_forms import main, N

gen_nom, gen_vrb = main(write=False)
ALL = {}
for d in (gen_nom, gen_vrb):
    for form, cands in d.items():
        ALL.setdefault(N(form), []).extend(cands)

fail = 0
def T(form, lemma, frag, note=''):
    global fail
    hits = ALL.get(N(form), [])
    ok = any(l == lemma and frag in p for l, p in hits)
    if ok: print(f'OK   {form} → {lemma} · {frag}')
    else:
        fail += 1
        got = [f'{l}·{p[:35]}' for l, p in hits[:3]]
        print(f'FAIL {form} → atteso {lemma}/{frag} · trovato: {got} {note}')

print('— λύω (verbo modello) —')
T('λύεις', 'λύω', 'pres. ind. att. 2ª sg.')
T('ἔλυον', 'λύω', 'impf. ind. att. 1ª sg.')
T('λύσομεν', 'λύω', 'fut. ind. att. 1ª pl.')
T('ἔλυσε', 'λύω', 'aor. ind. att. 3ª sg.')
T('λῦσαι', 'λύω', 'inf. aor. att.')
T('ἐλύθην', 'λύω', 'aor. ind. pass. 1ª sg.')
T('λυθῆναι', 'λύω', 'inf. aor. pass.')
T('λελύκασι', 'λύω', 'pf. ind. att. 3ª pl.')
T('λέλυται', 'λύω', 'pf. ind. m.-p. 3ª sg.')
print('— contratti —')
T('τιμᾷ', 'τιμάω', 'pres. ind.')
T('τιμῶμεν', 'τιμάω', '1ª pl.')
T('ποιεῖ', 'ποιέω', '3ª sg.')
T('ἐποίουν', 'ποιέω', 'impf.')
T('δηλοῖ', 'δηλόω', '3ª sg.')
print('— aoristi II e futuri contratti —')
T('ἔλιπον', 'λείπω', 'aor. ind. att.')
T('λιπεῖν', 'λείπω', 'inf. aor. att.')
T('λιπών', 'λείπω', 'ptc. aor. att. nom. m. sg.')
T('βαλῶ', 'βάλλω', 'fut. ind. att. 1ª sg.')
T('βαλεῖ', 'βάλλω', 'fut. ind. att. 3ª sg.')
T('ἔλαβον', 'λαμβάνω', 'aor. ind. att.')
T('ἐγένετο', 'γίγνομαι', 'aor. ind. med. 3ª sg.')
T('γενέσθαι', 'γίγνομαι', 'inf. aor. med.')
print('— radicali e in kappa —')
T('ἔβη', 'βαίνω', 'aor. ind. att. 3ª sg.')
T('βῆναι', 'βαίνω', 'inf. aor. att.')
T('ἔγνω', 'γιγνώσκω', 'aor. ind. att. 3ª sg.')
T('γνῶναι', 'γιγνώσκω', 'inf. aor. att.')
T('ἔδωκε', 'δίδωμι', 'aor. ind. att. 3ª sg.')
T('δοῦναι', 'δίδωμι', 'inf. aor. att.')
T('θεῖναι', 'τίθημι', 'inf. aor. att.')
print('— perfetti m.-p. con assimilazione —')
T('γέγραπται', 'γράφω', 'pf. ind. m.-p. 3ª sg.')
T('πέπεισται', 'πείθω', 'pf. ind. m.-p. 3ª sg.')
T('τέτακται', 'τάσσω', 'pf. ind. m.-p. 3ª sg.')
T('λέλειμμαι', 'λείπω', 'pf. ind. m.-p. 1ª sg.')
print('— aumento nei composti —')
T('ἀπέθανε', 'ἀποθνῄσκω', 'aor. ind. att. 3ª sg.')
T('ἀπέκτεινα', 'ἀποκτείνω', 'aor. ind. att. 1ª sg.')
print('— nominali (classificati dal corpus) —')
T('ἀδελφοῦ', 'ἀδελφός', 'gen. sg.')
T('δούλοις', 'δοῦλος', 'dat. pl.')
T('βίον', 'βίος', 'acc. sg.')
T('ἡμέρας', 'ἡμέρα', 'gen. sg.')
T('θαλάσσης', 'θάλασσα', 'gen. sg.', '(α misto)')
T('πολίτου', 'πολίτης', 'gen. sg.')
T('σώματος', 'σῶμα', 'gen. sg.')
T('σώμασι', 'σῶμα', 'dat. pl.')
T('τέλους', 'τέλος', 'gen. sg.')
T('πόλεως', 'πόλις', 'gen. sg.')
T('πόλεσι', 'πόλις', 'dat. pl.')
pass
# test FUNZIONALI della fonologia del dativo plurale (paradigmi noti)
from gen_greek_forms import dat_pl_3, gen_nominal
def TF(got, exp, note):
    global fail
    if got == exp: print(f'OK   {exp} {note}')
    else: fail += 1; print(f'FAIL {got} ≠ {exp} {note}')
TF(dat_pl_3('φυλακ'), 'φυλαξι', '(φύλαξ: gutturale+σι)')
TF(dat_pl_3('νυκτ'), 'νυξι', '(νύξ: κτ+σι → ξι)')
TF(dat_pl_3('σωματ'), 'σωμασι', '(σῶμα: dentale cade)')
TF(dat_pl_3('γεροντ'), 'γερουσι', '(γέρων: -οντ- con allungamento)')
TF(dat_pl_3('Αἰθιοπ'), 'Αἰθιοψι', '(labiale+σι)')
print()
print('TUTTI I PARADIGMI OK' if fail == 0 else f'{fail} FALLITI')
sys.exit(1 if fail else 0)
