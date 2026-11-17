/**
 * Conta una visita al sito: una sola volta per sessione (finché la scheda resta aperta).
 * I dispositivi dell'amministratore non vengono contati (vedi segnaNonContare).
 */
const NO_TRACK = 'aurora_no_track';
const SESSION = 'aurora_visita_contata';
const VISITOR = 'aurora_visitatore';

export function segnaNonContare() {
  try { localStorage.setItem(NO_TRACK, '1'); } catch { /* niente */ }
}

export function installVisitTracker() {
  try {
    if (typeof window === 'undefined') return;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
    if (localStorage.getItem(NO_TRACK) === '1') return;
    if (sessionStorage.getItem(SESSION)) return;
    sessionStorage.setItem(SESSION, '1');
    let id = localStorage.getItem(VISITOR);
    if (!id) {
      id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
      localStorage.setItem(VISITOR, id as string);
    }
    let prov = '';
    try {
      if (document.referrer && new URL(document.referrer).host !== location.host) prov = document.referrer;
    } catch { /* niente */ }
    const send = () =>
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitatore: id, pagina: location.pathname, provenienza: prov }),
        keepalive: true,
      }).catch(() => {});
    setTimeout(send, 1500);
  } catch {
    // il conteggio non deve mai disturbare il sito
  }
}
