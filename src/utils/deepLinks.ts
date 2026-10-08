/**
 * La nuova app non ha un router: la pagina mostrata dipende da un "tab" in memoria.
 * Questo file collega gli indirizzi (/personalizza, /privacy, /termini-vendita,
 * /personalizzazione/<token>) ai tab, così i link della vecchia app e quelli
 * nelle email dei clienti continuano a funzionare.
 */
import type { NavTab } from '../components/Sidebar';

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const TRACKING_RE = new RegExp(`^/personalizzazione/(${UUID})/?$`);
const PRODUCT_RE = /^\/prodotto\/([^/?#]+)\/?$/;
const APP_ORIGIN = 'https://appaurorav2updated.vercel.app';

/** Link da condividere che apre direttamente la scheda di un prodotto. */
export function productShareUrl(productId: string): string {
  const origin =
    typeof window !== 'undefined' && /^https:\/\//.test(window.location.origin)
      ? window.location.origin
      : APP_ORIGIN;
  return `${origin}/prodotto/${encodeURIComponent(productId)}`;
}

/** Id del prodotto se l'indirizzo è /prodotto/<id> (link condiviso), altrimenti null. */
export function sharedProductIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const m = PRODUCT_RE.exec(window.location.pathname);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Chiusa la scheda del prodotto condiviso, l'indirizzo torna /home (senza ricaricare). */
export function clearSharedProductUrl(): void {
  if (typeof window === 'undefined') return;
  if (PRODUCT_RE.test(window.location.pathname)) {
    window.history.replaceState(window.history.state, '', '/home');
  }
}

export interface InitialRoute {
  tab: NavTab;
  trackingToken: string | null;
}

const PATH_BY_TAB: Partial<Record<NavTab, string>> = {
  personalizza: '/personalizza',
  privacy: '/privacy',
  termini: '/termini-vendita',
  chat: '/chat',
};

const TAB_BY_PATH: Record<string, NavTab> = {
  '/personalizza': 'personalizza',
  '/privacy': 'privacy',
  '/termini-vendita': 'termini',
  '/chat': 'chat',
};

export function parseInitialRoute(): InitialRoute {
  if (typeof window === 'undefined') return { tab: 'home', trackingToken: null };
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const m = TRACKING_RE.exec(path);
  if (m) return { tab: 'tracking', trackingToken: m[1] };
  return { tab: TAB_BY_PATH[path] ?? 'home', trackingToken: null };
}

/** Allinea la barra degli indirizzi al tab attivo (senza ricaricare la pagina). */
export function syncUrlWithTab(tab: NavTab, trackingToken: string | null): void {
  if (typeof window === 'undefined') return;
  const current = window.location.pathname.replace(/\/+$/, '') || '/';
  const target =
    tab === 'tracking' && trackingToken ? `/personalizzazione/${trackingToken}` : PATH_BY_TAB[tab];

  if (target) {
    if (current !== target) window.history.replaceState(null, '', target);
    return;
  }
  // Tab "normale": se l'indirizzo è rimasto quello di una pagina speciale, torna a /home
  if (TAB_BY_PATH[current] || TRACKING_RE.test(current)) {
    window.history.replaceState(null, '', '/home');
  }
}
