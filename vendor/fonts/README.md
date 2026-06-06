# Font self-hosted (sistema interno Poetrify)

Font serviti dal sito stesso (`vendor/fonts/`) — **nessuna dipendenza da Google
Fonts**. Caricati da `fonts.css` (referenziato in `translator.html` e `app.html`).

## Famiglie e licenze

Tutte sotto **SIL Open Font License 1.1 (OFL-1.1)** — uso libero, anche
commerciale, incorporamento e redistribuzione consentiti; testo della licenza e
copyright conservati qui accanto (`OFL-*.txt`). I nomi delle famiglie non sono
stati modificati (clausola Reserved Font Name rispettata).

| Famiglia | Copyright | Licenza |
|---|---|---|
| Playfair Display | The Playfair Display Project Authors | OFL-1.1 |
| Source Serif 4 | The Source Serif 4 Project Authors (Adobe) | OFL-1.1 |
| Source Sans 3 | Adobe (RFN "Source") | OFL-1.1 |
| JetBrains Mono | The JetBrains Mono Project Authors | OFL-1.1 |
| GFS Didot | Greek Font Society | OFL-1.1 |

## Contenuto

- `fonts.css` — regole `@font-face` con `src` a percorsi locali (nessun URL gstatic).
- `*.woff2` — subset **latin, latin-ext, greek, greek-ext** (copre italiano,
  latino e greco antico politonico) ai pesi usati dal sito.

Origine: webfont woff2 di Google Fonts (`fonts.gstatic.com`), versioni del CSS
`css2` per ciascuna famiglia. Per aggiornare: riscaricare il CSS per famiglia
(con User-Agent moderno), filtrare i subset, riscaricare i woff2 e rimappare gli
URL a locale.
