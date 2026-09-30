# Personalizzazione packaging — cosa attivare (una sola volta)

## 1. Database (Supabase → SQL Editor), in questo ordine
1. `supabase/migrations/20260930120000_customization_and_packaging.sql`  (tabelle, permessi, bucket loghi)
2. `supabase/migrations/20260930130000_customization_tracking.sql`       (link di tracking + dati per le email)

Sono rilanciabili senza rischi e non cancellano dati.

## 2. Variabili su Vercel (Settings → Environment Variables)
Per le email (una delle due opzioni, le stesse già usate per gli ordini):
- `GMAIL_USER` + `GMAIL_APP_PASSWORD`   oppure   `RESEND_API_KEY`

Devono esserci anche (probabilmente già presenti):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Facoltativa: `APP_URL` = `https://appaurorav2updated.vercel.app` (dominio usato nel link di tracking nelle email).
Dopo aver cambiato le variabili fai un nuovo deploy.

## 3. Account admin
Prezzi e richieste si gestiscono solo da un account con ruolo `admin` nella tabella `user_roles`
(login reale Supabase). Senza, l'app mostra "Permesso negato".

## 4. Dopo il deploy
`npm install` (aggiunge `three`), poi prova:
- `/personalizza` → invia una richiesta di prova
- Pannello Gestione → **Personalizzazioni** e **Prezzi Personalizzazione**
- il link `/personalizzazione/<token>` mostrato a fine invio
- `/api/send-order` nel browser → deve dire `emailConfigured: true`

## 5. Da completare a mano
I testi di Privacy e Termini contengono ancora i segnaposto `[inserire ...]` (sede legale, P.IVA, PEC, foro).
