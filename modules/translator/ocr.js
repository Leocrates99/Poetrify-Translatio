/* ════════════════════════════════════════════════════════════════════════════
   ocr.js · Motore OCR client-side per Poetrify

   Riconoscimento ottico del testo (foto da telefono/tablet/fotocamera, immagini
   incollate, file trascinati) interamente DENTRO il browser, via Tesseract.js
   caricato lazy da CDN al primo utilizzo.

   Principio cardine — coerente con la promessa "Nessun dato lascia il tuo
   dispositivo": l'immagine non viene mai inviata a un server. Tutto il calcolo
   (WASM + dati lingua) gira in locale. Richiede internet solo la PRIMA volta,
   per scaricare il motore e i dati lingua; poi il browser li mette in cache.

   Lingue supportate: 'lat' (latino) e 'grc' (greco antico politonico).
   ────────────────────────────────────────────────────────────────────────────
   Esposto dal translator come window.PoetrifyOCR (vedi blocco module in fondo a
   translator.html). API principale:
     recognize(imageSource, projectLang, onProgress) → { text, rawText, confidence, lang }
     prepareImage(file|url, maxDim) → dataURL ridotto
     cleanupText(text, projectLang) → testo ripulito
   ═══════════════════════════════════════════════════════════════════════════ */

export const OCR_META = {
  version: '0.2.0', // 0.2.0: crop + raddrizzamento + formattazione compatta in prosa
  engine: 'tesseract.js',
  engineVersion: '5.1.1',
  languages: ['lat', 'grc'],
};

// Bundle UMD di Tesseract.js. jsdelivr ospita anche worker/core/dati coerenti
// con questa versione, evitando disallineamenti tra le parti.
const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

// Mappa lingua-di-progetto → traineddata Tesseract.
const LANG_MAP = { greco: 'grc', latino: 'lat' };

let _tesseractPromise = null;
const _workers = new Map(); // lang → worker riutilizzabile

/* Traduce la lingua interna del progetto ('greco'/'latino') nel codice
   traineddata di Tesseract. Default prudente: latino. */
export function tesseractLangFor(projectLang) {
  return LANG_MAP[projectLang] || 'lat';
}

/* Carica una sola volta lo script UMD di Tesseract iniettando un <script>.
   Idempotente: chiamate successive riusano la stessa Promise / il global già
   presente. In caso di errore di rete azzera la cache così un retry è possibile. */
export function loadTesseract() {
  if (typeof window !== 'undefined' && window.Tesseract) return Promise.resolve(window.Tesseract);
  if (_tesseractPromise) return _tesseractPromise;
  _tesseractPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TESSERACT_CDN;
    s.async = true;
    s.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else { _tesseractPromise = null; reject(new Error('Tesseract non disponibile dopo il caricamento')); }
    };
    s.onerror = () => {
      _tesseractPromise = null;
      reject(new Error('Impossibile scaricare il motore OCR dalla rete (sei offline?)'));
    };
    document.head.appendChild(s);
  });
  return _tesseractPromise;
}

/* Crea (o riusa) un worker Tesseract per la lingua data. Riusare il worker tra
   scansioni successive evita di riscaricare core+dati ogni volta. */
async function getWorker(lang, onProgress) {
  if (_workers.has(lang)) return _workers.get(lang);
  const Tesseract = await loadTesseract();
  const worker = await Tesseract.createWorker(lang, 1, {
    logger: m => { if (typeof onProgress === 'function') onProgress(m); },
  });
  _workers.set(lang, worker);
  return worker;
}

/* Riduce immagini enormi da fotocamera (anche 4000+ px) per velocizzare l'OCR
   senza perdere leggibilità, e le normalizza in PNG (dataURL). Accetta un File,
   un Blob o un URL/dataURL. */
export function prepareImage(fileOrUrl, maxDim = 2200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl = null;
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      if (scale < 1) { width = Math.round(width * scale); height = Math.round(height * scale); }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      try { resolve(canvas.toDataURL('image/png')); }
      catch (e) { reject(new Error('Impossibile elaborare l’immagine')); }
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('File immagine non valido o non leggibile'));
    };
    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      objectUrl = URL.createObjectURL(fileOrUrl);
      img.src = objectUrl;
    }
  });
}

/* Esegue il riconoscimento. imageSource può essere un dataURL, un canvas, un
   File/Blob o un'Image. Restituisce testo ripulito + testo grezzo + confidenza. */
export async function recognize(imageSource, projectLang, onProgress) {
  const lang = tesseractLangFor(projectLang);
  const worker = await getWorker(lang, onProgress);
  const { data } = await worker.recognize(imageSource);
  return {
    text: cleanupText(data.text, { compact: true }),
    rawText: data.text,
    confidence: typeof data.confidence === 'number' ? Math.round(data.confidence) : null,
    lang,
  };
}

// Insieme di caratteri "lettera" per latino esteso + greco (incluso politonico).
const LETTER = 'A-Za-z\\u00C0-\\u024F\\u0370-\\u03FF\\u1F00-\\u1FFF';
const RE_HYPHEN_BREAK = new RegExp('([' + LETTER + '])-\\n\\s*([' + LETTER + '])', 'g');
const RE_SPACE_BEFORE_PUNCT = /\s+([,.;:·!?])/g; // · = punto in alto greco

/* Pulizia post-OCR conservativa. Volutamente prudente: non tenta di "correggere"
   lettere, per non introdurre errori nel testo classico. Ricuce sempre le parole
   spezzate da trattino a fine riga ("popu-\nlus" → "populus") e toglie gli spazi
   prima della punteggiatura. Con { compact: true } (default per le versioni in
   prosa) unisce TUTTI gli a capo in un flusso continuo; senza, preserva le righe. */
export function cleanupText(text, opts) {
  opts = opts || {};
  if (!text) return '';
  let t = text.replace(/\r\n?/g, '\n');
  t = t.replace(RE_HYPHEN_BREAK, '$1$2');       // ricuci sillabazione di fine riga
  if (opts.compact) {
    t = t.replace(/\n+/g, ' ');                 // prosa: ogni a capo → spazio
  } else {
    t = t.replace(/\n{3,}/g, '\n\n');           // max una riga vuota
  }
  t = t.replace(/[ \t]{2,}/g, ' ');             // spazi multipli → uno
  t = t.replace(RE_SPACE_BEFORE_PUNCT, '$1');   // niente spazio prima di , . ; : · ! ?
  if (opts.compact) t = t.trim();
  else t = t.split('\n').map(l => l.trim()).join('\n').trim();
  return t;
}

/* ── Geometria per il ritaglio + raddrizzamento (tutto su <canvas>, niente libs) ──
   Dimensioni del rettangolo che contiene l'immagine ruotata di theta radianti. */
export function rotatedBoundingBox(w, h, theta) {
  const c = Math.abs(Math.cos(theta)), s = Math.abs(Math.sin(theta));
  return { w: w * c + h * s, h: w * s + h * c };
}

/* Estrae una regione dell'immagine ruotata e la restituisce come dataURL PNG.
   img          = HTMLImageElement sorgente
   srcW, srcH   = dimensioni reali dell'immagine
   theta        = rotazione in radianti
   region       = { sx, sy, sw, sh } in coordinate del bounding box ruotato a
                  piena risoluzione; se null → tutta l'immagine ruotata.
   Lo sfondo è bianco così gli angoli "vuoti" creati dalla rotazione non
   diventano neri/trasparenti (meglio per l'OCR). */
export function extractRegion(img, srcW, srcH, theta, region) {
  const bb = rotatedBoundingBox(srcW, srcH, theta);
  const sx = region ? region.sx : 0;
  const sy = region ? region.sy : 0;
  const sw = region ? region.sw : bb.w;
  const sh = region ? region.sh : bb.h;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(sw));
  out.height = Math.max(1, Math.round(sh));
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.translate(-sx, -sy);          // porta l'origine della regione su (0,0)
  ctx.translate(bb.w / 2, bb.h / 2); // centro del bounding box ruotato
  ctx.rotate(theta);
  ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);
  return out.toDataURL('image/png');
}

/* Chiude i worker e libera la memoria (utile su mobile). Idempotente. */
export async function terminate() {
  for (const w of _workers.values()) {
    try { await w.terminate(); } catch (e) { /* no-op */ }
  }
  _workers.clear();
}
