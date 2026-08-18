<!-- Hallmark · studied: yes · DNA-source: local-source (04.01 Dizionario) · 2026-08-18
     macrostructure: Index-First (hub) + Workbench (superfici di lavoro)
     theme: custom · axes: light / high-contrast-serif / dual-accent (indigo + warm-red) -->

# Design — Poetrify

Sistema bloccato: Hallmark legge **prima** questo file e vi si conforma. Si emenda di proposito.
**`shared/poetrify-tokens.css` resta la fonte di verità dei valori**; qui stanno solo i token che
portano *identità*. Scala 8pt, raggi, semantici e palette scura completa non si duplicano: stanno là.

## System
- **Genre** · editorial · **Theme** · custom, fuori catalogo (*«officina filologica, pergamena calda, lingua a colore»*)
- **Macrostructure** · **Index-First** (hub `app.html`) + **Workbench** (dizionario, translator, corpus)
- **Axes** · carta chiara / roman editorial serif ad alto contrasto / accento doppio e semantico
- **Archetipi** · nav N6 masthead-con-issue-line · footer Ft2 riga inline · CTA **C3 link tipografico** `→`, mai bottone pieno

## Provenance
Estratto dalle 6 superfici di `04.01 Dizionario` il **2026-08-18**, modo *local-source*: valori
letti dal CSS, ritmo osservato su `app.html` renderizzato. Fonte propria; token e font **esatti**.
⚠ `dictionary.html` reso senza JS: densità letta, **resa cromatica non verificata**.

## Tokens d'identità
```css
:root{
  /* La carta è una progressione calda, non un bianco */
  --paper:#ffffff; --ivory:#fcfbf8; --cream:#f5f4f0; --parchment:#f7f3e9; --parchment-edge:#efe8d6;
  --ink:#2c3539; --ink-soft:#4a525a; --sepia:#6b6660; --rule:#d5d2cb;
  /* Accento = LINGUA (regola 1) · ottone = terzo accento, solo filetti (regola 3) */
  --accent-gr:#1800AC; --accent-lat:#A22E37; --on-primary:#ffffff; --brass:#9c6b3c;
  /* Il lift è tinto d'indaco, mai nero neutro (regola 4) */
  --shadow-lift:0 10px 30px rgba(24,0,172,.10);
  /* 'GreekTimes' in testa a OGNI stack (regola 2) */
  --font-display:'GreekTimes','Playfair Display',Georgia,serif;
  --font-body:'GreekTimes','Source Serif 4',Georgia,serif;
  --font-ui:'GreekTimes','Source Sans 3',system-ui,sans-serif;
  --font-classical:'GreekTimes','GFS Didot','EB Garamond',serif;
  --font-mono:'JetBrains Mono',Consolas,monospace;
}
```
**Scuro**: l'accento **schiarisce** (`#8b7dff` greco · `#e58a90` latino) e `--on-primary` diventa **scuro** (`#14121c`).
*Export* Tailwind `@theme` / DTCG / shadcn: chiedere *«estendi DESIGN.md con gli export»*.

## Regole non negoziabili — l'identità, non lo stile
1. **Il colore è la lingua.** `body[data-lang]` commuta l'accento: indaco = greco, rosso pompeiano = latino.
   L'accento **informa, non decora**. Valore concreto per-lingua: un `var()` su `:root` erediterebbe l'indaco ovunque.
2. **Il greco si veste per codepoint, non per elemento.** `@font-face 'GreekTimes'` con
   `unicode-range:U+0370-03FF,U+1F00-1FFF,U+2126` e `src:local('Times New Roman')`, anteposto a **ogni**
   `--font-*`. Regge le stringhe miste; una classe CSS non può sostituirlo — si romperebbe sul testo misto.
3. **L'ottone non campisce mai** — filetti, bordi, dettagli. Nessun fondo pieno.
4. **Le ombre sono tinte d'inchiostro**, mai nero neutro. 5. **La carta non è bianca**: il bianco è solo il gradino zero.

## Motion stance
**Motion-cut** — nessuna libreria, zero `@keyframes`, nessun reveal; un solo token di transizione, `prefers-reduced-motion` azzerante. La quiete è una scelta: il prodotto si legge.

## Notes — stato dei debiti
**Sanati il 2026-08-18.** `app.html` ha ora `h1` (wordmark) e tre `h2` (titoli delle schede), con i
margini di default azzerati. Il piede è ancorato in fondo (`min-height:100dvh` + `margin-top:auto`
e `padding-top:64px`, che regge anche il viewport corto). `tokens.css` ha easing **nominati**
(`--ease-out`, `--ease-in-out`, `--dur-fast|base|slow`) e `--transition` non usa più `ease` nudo.

**Aperto — il debito vero del moto.** Su **188** transizioni dichiarate nel prodotto solo **3**
passano da `--transition`: 185 lo scavalcano con valori inline. E gli anti-pattern **non sono
assenti**, contrariamente a quanto diceva la prima stesura di questo file:
`transition: all` ×**112** (dictionary 23 · translator 77 · corpus 10 · profilo 2) e
`hover: scale()` ×**2** (translator). Da bonificare, con `translator.html` (2,2 MB) come nodo duro.

Confermato assente: heading in corsivo · easing con rimbalzo.
**Non è un debito:** l'hub non ha nav perché *è* la nav (macrostruttura Index-First) e tutte e
cinque le superfici di lavoro tornano ad `app.html`.
