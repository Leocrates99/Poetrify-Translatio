# 🔄 Come aggiornare il sito Poetrify

Promemoria pratico per pubblicare le modifiche **senza caricare niente a mano**.

- **Sito online:** https://leocrates99.github.io/Poetrify-Translatio/
- **Repository GitHub:** https://github.com/Leocrates99/Poetrify-Translatio
- **Cartella sul computer:** `C:\Users\fasci\Downloads\poetrify`

---

## ⭐ La regola d'oro (3 comandi)

Ogni volta che hai modificato qualcosa nel progetto, apri un terminale **dentro la
cartella del progetto** e lancia questi tre comandi:

```bash
git add -A
git commit -m "descrizione di cosa hai cambiato"
git push
```

Fatto. Dopo ~1–2 minuti il sito online si aggiorna **da solo** (ci pensa GitHub Actions).

> 💡 Cambia solo il testo fra virgolette dopo `-m`: scrivi a parole cosa hai modificato
> (es. `"aggiunte nuove voci al dizionario"`). Serve solo a te per ricordartelo.

---

## ⚙️ Impostazione da fare UNA SOLA VOLTA

Perché la pubblicazione automatica funzioni, sul sito di GitHub deve essere attiva
la sorgente "GitHub Actions":

**Settings ▸ Pages ▸ "Build and deployment" ▸ Source → "GitHub Actions"**

(Da fare una volta sola; poi non serve più toccarla.)

---

## 👀 Come controllare che sia andato tutto bene

1. Vai nella tab **Actions** del repository su GitHub.
2. Vedi partire *"Deploy Poetrify to GitHub Pages"*.
3. **Spunta verde ✅** = sito aggiornato. **X rossa** = qualcosa è andato storto (vedi sotto).

---

## 🆘 Se qualcosa non va

| Messaggio / problema | Cosa significa | Come risolvere |
|---|---|---|
| `nothing to commit, working tree clean` | Non hai modifiche nuove da salvare | Tutto normale: non c'è niente da pubblicare. |
| `rejected` / `failed to push` / `fetch first` | Su GitHub ci sono modifiche che non hai in locale | Lancia `git pull` e poi di nuovo `git push`. |
| Run **rosso** nella tab Actions con errore su *Pages* | Manca l'impostazione "Source = GitHub Actions" | Fai l'impostazione qui sopra, poi clicca **"Re-run jobs"** sul run fallito. |
| Si apre una finestra del browser al `push` | GitHub ti chiede di autorizzare l'accesso | Clicca **Authorize**: succede solo le prime volte. |
| Il sito mostra una pagina vuota o "404" | Cache del browser o deploy non ancora finito | Aspetta 2 minuti e ricarica con `Ctrl+F5` (ricarica forzata). |

---

## 🌐 Le pagine del sito

| Indirizzo | Pagina |
|---|---|
| `…/Poetrify-Translatio/` | Home → reindirizza alla dashboard |
| `…/app.html` | Dashboard (hub: Translator + Dizionario) |
| `…/translator.html` | Translator (analisi grammaticale/logica) |
| `…/dictionary.html` | Dizionario (latino + greco) |

---

## 📝 Note utili

- **Devi sempre essere dentro la cartella del progetto** quando lanci i comandi git
  (`C:\Users\fasci\Downloads\poetrify`).
- I file dentro `_build/` e `.claude/` **non vengono pubblicati** (sono solo strumenti
  di lavoro): è normale e voluto.
- Non serve "ricostruire" niente: il sito è fatto di file statici, GitHub li serve così
  come sono.
- Se cambi i dati dei dizionari in `data/`, dopo `git push` saranno online come gli altri file.

---

*Per qualunque errore nella tab Actions, copia il messaggio rosso e chiedi aiuto: è quasi
sempre una di queste tre cose — impostazione Pages, oppure un `git pull` da fare prima del push.*
