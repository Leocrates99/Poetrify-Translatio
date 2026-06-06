# Tesseract OCR — file vendored (sistema interno Poetrify)

Questi file fanno funzionare l'OCR di Poetrify **interamente in locale**, serviti
dallo stesso sito (GitHub Pages, stessa origine). **Nessuna dipendenza da CDN o
server esterni**, né a runtime né al primo uso: l'OCR funziona anche offline e
nessuna immagine lascia mai il dispositivo dell'utente.

Caricati da `modules/translator/ocr.js` tramite percorsi locali
(`workerPath` / `corePath` / `langPath`).

## Contenuto e provenienza

| File / cartella | Pacchetto · versione | Fonte |
|---|---|---|
| `tesseract.min.js`, `worker.min.js` | `tesseract.js@5.1.1` | cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist |
| `core/tesseract-core*.wasm(.js)` (8 varianti: normale / SIMD / LSTM / SIMD-LSTM) | `tesseract.js-core@5.1.1` | cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1 |
| `lang/lat.traineddata.gz` | dati lingua latino (tessdata_fast 4.0.0, gzip) | tessdata.projectnaptha.com/4.0.0 |
| `lang/grc.traineddata.gz` | dati lingua greco antico (tessdata_fast 4.0.0, gzip) | tessdata.projectnaptha.com/4.0.0 |

Tutte le varianti del core sono incluse così che la selezione automatica di
Tesseract (in base al supporto SIMD del browser e all'OEM) trovi sempre il file
giusto, senza dover mai uscire a cercarlo online.

## Licenze

Tutti i componenti sono rilasciati sotto **Apache License 2.0** — uso libero,
commerciale, redistribuzione e modifica, per chi distribuisce e per chi usa.
Testo delle licenze conservato qui per attribuzione:

- `LICENSE-tesseract.js.txt` — tesseract.js
- `LICENSE-tesseract.js-core.txt` — tesseract.js-core (engine WASM)
- `LICENSE-tessdata.txt` — dati lingua (tesseract-ocr/tessdata)

## Aggiornare i file (in futuro)

Riscaricare dalle fonti sopra mantenendo le stesse versioni allineate, oppure
aggiornare la versione in `OCR_META.engineVersion` (`modules/translator/ocr.js`)
e nel parametro `?v=` dell'import in `translator.html`.
