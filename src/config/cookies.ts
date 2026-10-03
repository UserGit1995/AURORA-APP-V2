/**
 * IMPOSTAZIONI COOKIE
 *
 * Oggi l'app usa SOLO strumenti tecnici (accesso, carrello, preferiti, preferenze):
 * per legge il banner NON serve, quindi è spento.
 *
 * Quando aggiungerai strumenti di statistica o marketing (es. Google Analytics,
 * Pixel di Facebook, video YouTube):
 *   1. metti  bannerEnabled: true
 *   2. metti  inUse: true  sulla categoria che usi (statistiche e/o marketing)
 *   3. scrivi nella descrizione quali servizi usi
 *   4. carica quei servizi solo se c'è il consenso, con  hasCookieConsent('statistiche')
 *      oppure  onCookieConsent('statistiche', () => { ...carica lo script... })
 * Se cambi le categorie in futuro, aumenta  policyVersion  di 1: il banner verrà
 * richiesto di nuovo a tutti.
 */
export type CookieCategory = 'statistiche' | 'marketing';

export const COOKIE_CONFIG = {
  bannerEnabled: false,
  policyVersion: 1,
  // Il consenso viene richiesto di nuovo dopo 6 mesi (indicazione del Garante Privacy)
  validityDays: 180,
  categories: {
    statistiche: {
      inUse: false,
      label: 'Statistiche',
      description:
        "Ci aiutano a capire, in forma aggregata, come viene usato il sito (pagine visitate, tempo di permanenza) per migliorarlo.",
    },
    marketing: {
      inUse: false,
      label: 'Marketing',
      description: 'Servono a mostrarti pubblicità e offerte in linea con i tuoi interessi, anche su altri siti.',
    },
  } as Record<CookieCategory, { inUse: boolean; label: string; description: string }>,
};
