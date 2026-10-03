import { COOKIE_CONFIG, CookieCategory } from '../config/cookies';

const KEY = 'aurora_cookie_consent';
const EVT = 'aurora-cookie-consent-change';
export const OPEN_COOKIE_SETTINGS_EVENT = 'aurora-open-cookie-settings';

export interface CookieConsent {
  version: number;
  date: string; // ISO
  choices: Record<CookieCategory, boolean>;
}

/** Categorie davvero usate dal sito (solo queste vengono mostrate nel banner) */
export const activeCookieCategories = (): CookieCategory[] =>
  (Object.keys(COOKIE_CONFIG.categories) as CookieCategory[]).filter((c) => COOKIE_CONFIG.categories[c].inUse);

/** true se il banner va mostrato in questo sito */
export const isCookieBannerActive = () => COOKIE_CONFIG.bannerEnabled && activeCookieCategories().length > 0;

export function getCookieConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CookieConsent;
    if (c.version !== COOKIE_CONFIG.policyVersion) return null;
    const ageDays = (Date.now() - new Date(c.date).getTime()) / 86400000;
    if (!(ageDays >= 0) || ageDays > COOKIE_CONFIG.validityDays) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveCookieConsent(choices: Partial<Record<CookieCategory, boolean>>) {
  const full: Record<CookieCategory, boolean> = { statistiche: false, marketing: false };
  activeCookieCategories().forEach((c) => (full[c] = !!choices[c]));
  const consent: CookieConsent = { version: COOKIE_CONFIG.policyVersion, date: new Date().toISOString(), choices: full };
  try {
    localStorage.setItem(KEY, JSON.stringify(consent));
  } catch {
    /* niente */
  }
  window.dispatchEvent(new CustomEvent(EVT, { detail: consent }));
}

/** Il visitatore ha dato il consenso a questa categoria? (senza banner attivo: sempre no) */
export function hasCookieConsent(cat: CookieCategory): boolean {
  if (!isCookieBannerActive()) return false;
  return !!getCookieConsent()?.choices[cat];
}

/** Esegue "run" appena c'è il consenso alla categoria (subito, se c'è già) */
export function onCookieConsent(cat: CookieCategory, run: () => void) {
  let done = false;
  const tryRun = () => {
    if (!done && hasCookieConsent(cat)) {
      done = true;
      run();
    }
  };
  tryRun();
  window.addEventListener(EVT, tryRun);
  return () => window.removeEventListener(EVT, tryRun);
}

/** Riapre il banner per cambiare le scelte (es. dal link nell'informativa) */
export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
