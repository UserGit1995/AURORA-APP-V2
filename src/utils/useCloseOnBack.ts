import { useEffect, useRef } from 'react';

/**
 * Finestre sopra la pagina (dettaglio prodotto, carrello…):
 * - il tasto "Indietro" del telefono chiude la finestra invece di uscire dalla pagina;
 * - il tasto Esc della tastiera la chiude su PC.
 */
export function useCloseOnBack(active: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    let closedByBack = false;
    window.history.pushState({ ...(window.history.state || {}), auroraOverlay: true }, '');
    const onPop = () => {
      closedByBack = true;
      closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      // chiusa con la X o toccando fuori: tolgo il passo aggiunto alla cronologia
      if (!closedByBack && window.history.state?.auroraOverlay) window.history.back();
    };
  }, [active]);
}
