# Librerie self-hosted (sistema interno Poetrify)

Librerie servite dal sito stesso (`vendor/lib/`) — **nessuna dipendenza da
cdnjs/CDN**. Usate per l'esportazione del lavoro (PNG/PDF).

| File | Pacchetto · versione | Licenza | Uso |
|---|---|---|---|
| `html2canvas.min.js` | html2canvas 1.4.1 | MIT (`LICENSE-html2canvas.txt`) | export PNG |
| `jspdf.umd.min.js` | jsPDF 2.5.1 | MIT (`LICENSE-jspdf.txt`) | export PDF |

Referenziate da `translator.html` (tag `<script>` statici + fallback
`ensureLib`/`loadScript`). Origine: cdnjs (cloudflare). MIT consente uso libero,
commerciale e redistribuzione, conservando avviso di copyright e licenza (qui).
