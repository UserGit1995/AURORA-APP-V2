# Integrazione Remove BG in AURORA-APP-V2

Dalla Pixlr Creative Suite (AI Studio) è stato portato **solo** lo strumento Remove BG.

## Dopo aver scaricato lo ZIP
1. `npm install`   (aggiunge `@imgly/background-removal` e `jszip` e aggiorna `package-lock.json`)
2. `npm run dev` per provare in locale
3. Fai commit di tutto, compresi `package.json` e `package-lock.json` aggiornati, e fai il deploy su Vercel.

## Dove si trova nell'app
- **Admin → scheda «Rimuovi sfondo»**: lo studio completo (Foto Singola e Batch Multi-Foto).
- **Admin → lista prodotti → pulsante «Sfondo»** su ogni articolo: apre lo studio già con la foto di quell'articolo.
- **Scheda prodotto (Modifica / Nuovo) → «Rimuovi / cambia sfondo della foto (AI)»**: apre lo studio a tutto schermo; con «Usa questa immagine» la foto torna nella scheda e va confermata con «Salva Modifiche».

## Funzioni portate (come nello screenshot)
Foto Singola / Batch Multi-Foto · annulla / ripeti (Ctrl+Z / Ctrl+Y) · Auto-Crop · Carica Foto · Scarica Trasparente (PNG) ·
Rifinitura di Precisione: Pennello, Bacchetta, Lazo (Rimuovi / Ripristina) ·
Sostituzione Sfondo: Trasparente, Tinta Unita, Sfumatura, Sfocatura Bokeh · Palette Studio ·
Effetti Soggetto: Ombra da Contatto Studio, Contorno Adesivo (Sticker) · zoom.

## Aggiunte per l'uso sui prodotti (non c'erano in Pixlr)
- «Salva sul prodotto»: sostituisce la foto dell'articolo (stesso formato delle foto caricate: max 1200 px; Storage Supabase se collegato, altrimenti incorporata).
- «Dal catalogo»: scegli gli articoli già caricati (ricerca per nome / codice / categoria / marca).
- Batch: «Applica ai prodotti» sostituisce in un colpo solo le foto degli articoli elaborati; «Scarica ZIP» per averle sul PC.

## File nuovi
- `src/components/RemoveBg/` → `RemoveBgStudio.tsx`, `SingleEditor.tsx`, `BatchEditor.tsx`, `ProductPicker.tsx`
- `src/utils/bgRemoval/` → `canvasHelpers.ts`, `aiBackgroundRemoval.ts`, `composeScene.ts`, `saveImage.ts`, `productImage.ts`

## File modificati
- `src/components/AdminControlPanel.tsx` (scheda + pulsante «Sfondo»)
- `src/components/ProductEditModal.tsx` (pulsante nella scheda prodotto)
- `src/index.css` (scacchiera della trasparenza)
- `package.json` (2 dipendenze)

## Nota sul modello AI
Al primo utilizzo il browser scarica il modello (alcune decine di MB, serve internet) e poi lo tiene in cache.
Se non è raggiungibile, lo strumento ripiega sul metodo semplice (buono solo con sfondi uniformi) e lo segnala con un avviso.
