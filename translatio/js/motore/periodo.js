/* ============================================================================
   PERIODO · sigle, livelli e albero delle proposizioni
   ----------------------------------------------------------------------------
   Il modello dell'albero sintattico del Translator di Poetrify, riscritto qui
   (Translatio e' isolato). Ogni proposizione puo' dire da quale dipende:
     · la subordinata DIPENDE dalla sua reggente  → sta un livello sotto;
     · la coordinata e' COORDINATA a un'altra     → sta allo stesso livello,
                                                   accanto a lei;
     · la principale non dipende da nessuno       → livello 0.
   Il livello da' la lettera (A principali, B subordinate di 1° grado, C di 2°…),
   l'ordine nel testo il pedice: A₁ A₂ B₁ B₂…
   Una subordinata di cui lo studente non ha ancora detto la reggente prende
   il grado che ha scelto (o il 1°) e sta in cima all'albero, in attesa.
   ============================================================================ */

const LETTERE = 'ABCDEFGH';
const PEDICI = '₀₁₂₃₄₅₆₇₈₉';
export const pedice = n => String(n).split('').map(d => PEDICI[+d]).join('');

function livello(p, tutte, memo, pila) {
  if (memo.has(p.id)) return memo.get(p.id);
  if (pila.has(p.id)) return 0;                       // un giro: si ferma
  pila.add(p.id);
  const d = p.dipende && tutte.find(x => x.id === p.dipende);
  let l = 0;
  if (p.ruolo === 'Subordinata') l = d ? livello(d, tutte, memo, pila) + 1 : Math.max(1, p.grado || 1);
  else if (p.ruolo === 'Coordinata') l = d ? livello(d, tutte, memo, pila) : 0;
  pila.delete(p.id);
  memo.set(p.id, l);
  return l;
}

/** id → { livello, sigla }, con le sigle assegnate nell'ordine del testo. */
export function annotaPeriodo(props) {
  const memo = new Map();
  const conta = {};
  const info = new Map();
  for (const p of [...props].sort((a, b) => a.da - b.da || a.a - b.a)) {
    const l = livello(p, props, memo, new Set());
    conta[l] = (conta[l] || 0) + 1;
    info.set(p.id, { livello: l, sigla: LETTERE[Math.min(l, LETTERE.length - 1)] + pedice(conta[l]) });
  }
  return info;
}

/** L'albero: radici in cima, le subordinate sotto la reggente, le coordinate
 *  accanto alla proposizione cui sono coordinate (stesso padre). */
export function alberoDelPeriodo(props) {
  const perId = new Map(props.map(p => [p.id, p]));
  const padreDi = (p, pila = new Set()) => {
    if (pila.has(p.id)) return '';
    pila.add(p.id);
    const d = p.dipende && perId.get(p.dipende);
    if (!d) return '';
    if (p.ruolo === 'Subordinata') return d.id;
    if (p.ruolo === 'Coordinata') return padreDi(d, pila);
    return '';
  };
  const figli = new Map();
  for (const p of props) {
    const k = padreDi(p);
    if (!figli.has(k)) figli.set(k, []);
    figli.get(k).push(p);
  }
  for (const l of figli.values()) l.sort((a, b) => a.da - b.da);
  const visti = new Set();
  const nodo = p => {
    visti.add(p.id);
    return { p, figli: (figli.get(p.id) || []).filter(x => !visti.has(x.id)).map(nodo) };
  };
  return (figli.get('') || []).map(nodo);
}

/** Le proposizioni da cui questa puo' dipendere (o a cui puo' essere
 *  coordinata): non se stessa, non chi gia' dipende da lei. */
export function possibiliReggenti(p, props) {
  const sotto = new Set([p.id]);
  let ancora = true;
  while (ancora) {
    ancora = false;
    for (const x of props) {
      if (x.dipende && sotto.has(x.dipende) && !sotto.has(x.id)) { sotto.add(x.id); ancora = true; }
    }
  }
  return props.filter(x => !sotto.has(x.id)).sort((a, b) => a.da - b.da);
}
