# Whitelist delle delezioni · punto 10

> Scritta **prima** di cancellare, come impone l'ordine dei lavori: si dichiara
> cosa cade e cosa resta, e perché, così la delezione è un commit verificabile
> e non un colpo di spugna.
> Il commit di delezione contiene **solo delezioni**: niente rinomine, niente
> ritocchi, niente «già che c'ero».

## 0 · La premessa che rende possibile il taglio

Il ramo `frase-per-frase` è **codice morto raggiungibile**, non codice morto e
basta. La differenza è tutta qui:

- `deriveApproachFromAxes()` non restituisce **mai** `'frase-per-frase'`: dà
  `scheletro` · `integrale` · `attuale` e nient'altro.
- ma `getApproach()` restituiva `state.approach || 'attuale'`, cioè il campo
  **persistito**;
- e la migrazione 0→1 normalizza `p.approach` **solo se mancano `metodo` o
  `vista`**. Un brano salvato con gli assi già scritti e un `approach` vecchio
  conservava `'frase-per-frase'` e apriva il ramo.

**Prerequisito del taglio** (fa parte del commit di delezione, ed è l'unica
riga che non è una delezione): `getApproach()` **deriva** dagli assi invece di
leggere il campo persistito. Da lì in poi il ramo è irraggiungibile per
costruzione, e cancellarlo non cambia il comportamento di nessun brano.

## 1 · Che cosa CADE

| Cosa | Dove | Perché cade |
|---|---|---|
| `renderStep3HtmlFrasePerFrase()` | ~70 righe | il suo dispatcher non può più selezionarla |
| il ramo `if (approach === 'frase-per-frase')` nel dispatcher della scheda C | 1 riga | condizione impossibile |
| il ramo `if (getApproach() === 'frase-per-frase')` nella scheda E | blocco | idem |
| CSS `.fpf-*` | 31 dichiarazioni | nessun markup le produce più |
| `APPROACH_DESCRIPTORS['frase-per-frase']` | 1 voce | descriveva un approccio che non esiste |
| `renderApproachOptions()` · `openApproachModal()` · `closeApproachModal()` | funzioni | il modale «a» è sostituito dalla **pill Percorso** |
| markup `#modal-approach` | blocco HTML | idem |
| voce di palette «Apri scheda Approccio (modal)» e scorciatoia `a` | 2 punti | non avrebbero più bersaglio |
| `renderApproachBanner()` e le sue 9 chiamate | funzione + call-site | dopo la pill restituiva stringa vuota: un controllo che non disegna niente |
| `quickBarCustomOpen` · `toggleQuickBarCustom()` | 2 simboli | il «Personalizza» che promettevano non esiste in `renderQuickBar` |
| `maybeShowApproachModalOnStart()` | funzione | già ridotta a `no-op` |

## 2 · Che cosa RESTA, e perché

| Cosa | Perché resta |
|---|---|
| **`MIGRAZIONI[1]` con il ramo `a === 'frase-per-frase'`** | è **compatibilità con i dati**, non codice vivo: legge brani salvati anni fa e li traduce negli assi. Toccarlo romperebbe l'apertura di quei brani. Non si cancella una migrazione perché il caso non capita più: capita esattamente ai brani vecchi |
| `state.approach` come campo persistito | continua a essere scritto da `_syncApproach()`; smette solo di essere la **fonte** in lettura |
| `APPROACH_DESCRIPTORS` per `integrale`/`attuale`/`scheletro` | li usa ancora la scheda descrittiva dell'aiuto e la palette dei metodi |
| I tre segmentati Metodo · Vista · Guida | la pill è il controllo **primario**, non l'unico: un brano senza percorso deve restare governabile. La regola dell'audit («la pill sostituisce i 3 segmented») si compie quando ogni brano ha un percorso — cioè dopo la fusione del punto 11 |
| `renderStep3HtmlScheletro` e il ramo `integrale` | vivi e raggiungibili |

## 2.1 · Un errore della whitelist, corretto in corsa

Questo documento dichiarava `setApproach()` orfano: **non lo era**. Lo chiama
ancora il pulsante «apri questa frase da sola» nella fase dei verbi.
Cancellarlo avrebbe rotto quel pulsante al primo click. La funzione **resta**;
cade invece il wrapper `quickSwitchApproach()`, quello sì senza chiamanti.

Vale come promemoria: una whitelist si verifica contando i chiamanti uno per
uno, non a memoria.

## 3 · La terna di controllo

Dopo la delezione, tre verifiche nel browser reale — non tre impressioni:

1. **Un brano legacy con `approach: 'frase-per-frase'` persistito** si apre e
   mostra la superficie giusta (per strati, frase corrente), senza errori di
   console.
2. **La migrazione dei brani senza assi** continua a funzionare: un brano con
   solo `approach` e nessun `metodo`/`vista` riceve gli assi corretti.
3. **Le tre superfici vive** (scheletro · integrale · per strati) rendono, e la
   pill le governa: cambiare percorso dalla pill cambia davvero gli assi.

## 4 · Il lessico bandito (commit separato, solo copy)

L'audit vieta nelle superfici **utente**: *approccio*, *attuale*, *integrale*,
*frase-per-frase*. Il divieto è sul **senso tecnico**: `approccio graduale` in
una scheda del corpus è italiano normale e non si tocca. Restano intatti anche
i nomi interni — classi CSS `.integrale-*`, chiavi di stato, funzioni: non li
legge nessuno studente.

### Esito della terna (eseguita nel browser reale)

1. **Brano legacy con `approach: 'frase-per-frase'` persistito e assi già
   scritti** → `getApproach()` restituisce `attuale`, gli assi restano
   `strati / frase / free`, la superficie giusta rende. Il ramo è
   irraggiungibile per costruzione.
2. **Brano senza assi** → la migrazione li deduce (`strati / frase / guided`) e
   normalizza `approach`.
3. **Le tre superfici vive** rendono (scheletro, integrale, per strati) e la
   pill le governa.

Due scoperte laterali, rimandate al commit successivo perché non sono
delezioni: la pill si fidava di un flag memorizzato invece di guardare gli assi
veri, e un brano senza `currentSentenceIdx` mostrava «Frase non trovata» nella
vista per frase.

---

## Appendice · le carcasse dell'«approccio» (ago 2026)

Il punto 10 aveva tolto il modale dell'approccio, sostituito dalla pill Percorso.
Il suo **vestito** era rimasto: CSS che nessun markup produce più.

**Verificato prima di cancellare**: cercando ogni classe `approach-*` in tutti i
file vivi del repo (esclusi i worktree), le occorrenze stanno **tutte** dentro
selettori CSS — zero nel markup, zero in JavaScript. E `.approach-banner*` non
c'era già più.

| Cosa | Quanto | Perché cade |
|---|---|---|
| CSS `.approach-grid` · `.approach-option` (+ `:hover`, `.current`, `::after`) · `.approach-head` · `.approach-icon` · `.approach-title` · `.approach-tagline` · `.approach-pros` · `.approach-cons` | **85 righe** | nessun markup le produce |
| CSS `.approach-toggle-btn` (+ `:hover`, `.approach-current-tag`) | **29 righe** | il bottone apriva il modale che non c'è più |
| `const approachBannerInGuided = ''` + la sua interpolazione nel wizard | 6 righe | è il buco lasciato dal banner rimosso: una costante vuota interpolata una volta |
| `state.approachShown` (campo + assegnazione) | 2 righe | **scritto due volte, letto mai** |

**Resta in piedi** `approach` come valore *derivato* dagli assi: è vivo, lo legge
il dispatcher di rendering della scheda C (`renderStep3Html`).

Collaudo: `regoleApproachNelCSSOM = 0`; le quattro sotto-schede dell'analisi, lo
scheletro, la traduzione e la panoramica rendono; `brace_check = 10`;
`node --check` OK.
