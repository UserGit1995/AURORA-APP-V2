import React, { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { COOKIE_CONFIG, CookieCategory } from '../config/cookies';
import {
  activeCookieCategories,
  getCookieConsent,
  isCookieBannerActive,
  saveCookieConsent,
  OPEN_COOKIE_SETTINGS_EVENT,
} from '../utils/cookieConsent';

interface CookieBannerProps {
  onOpenPrivacy: () => void;
}

/**
 * Banner dei cookie secondo le linee guida del Garante Privacy:
 * - "Accetta tutti" e "Rifiuta" con la stessa evidenza
 * - la X chiude il banner e vale come rifiuto
 * - nessuna casella già spuntata
 * - non blocca la navigazione
 * - la scelta resta valida 6 mesi e si può cambiare dall'informativa
 * Si attiva solo da src/config/cookies.ts (oggi è spento).
 */
export const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenPrivacy }) => {
  const active = isCookieBannerActive();
  const categories = activeCookieCategories();
  const [open, setOpen] = useState(() => active && !getCookieConsent());
  const [custom, setCustom] = useState(false);
  const [choices, setChoices] = useState<Partial<Record<CookieCategory, boolean>>>({});

  useEffect(() => {
    if (!active) return;
    const reopen = () => {
      setChoices(getCookieConsent()?.choices || {});
      setCustom(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, [active]);

  if (!active || !open) return null;

  const close = (c: Partial<Record<CookieCategory, boolean>>) => {
    saveCookieConsent(c);
    setOpen(false);
    setCustom(false);
  };
  const acceptAll = () => close(Object.fromEntries(categories.map((c) => [c, true])));
  const rejectAll = () => close({});

  const btn = 'flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors';

  return (
    <div
      role="dialog"
      aria-label="Preferenze cookie"
      className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-5 pointer-events-none"
    >
      <div className="pointer-events-auto relative mx-auto max-w-3xl rounded-2xl border border-[#1c2433] bg-[#0b1526] shadow-2xl p-4 sm:p-5 text-left">
        <button
          type="button"
          onClick={rejectAll}
          aria-label="Chiudi e rifiuta i cookie non necessari"
          title="Chiudi (rifiuta i cookie non necessari)"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#121c2e]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm sm:text-base">Questo sito usa i cookie</h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
              Usiamo cookie tecnici, necessari al funzionamento del sito, e — solo con il tuo consenso — cookie di{' '}
              {categories.map((c) => COOKIE_CONFIG.categories[c].label.toLowerCase()).join(' e ')}. Puoi accettarli,
              rifiutarli o scegliere quali attivare. Maggiori dettagli nell'
              <button type="button" onClick={onOpenPrivacy} className="text-sky-400 underline hover:text-sky-300">
                Informativa privacy e cookie
              </button>
              .
            </p>
          </div>
        </div>

        {custom && (
          <div className="mt-4 space-y-2">
            <div className="flex items-start justify-between gap-3 rounded-xl border border-[#1c2433] bg-[#0d1420] p-3">
              <div>
                <p className="text-white text-sm font-semibold">Necessari</p>
                <p className="text-slate-400 text-xs">Accesso, carrello, preferiti e preferenze. Sempre attivi.</p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 shrink-0">Sempre attivi</span>
            </div>
            {categories.map((c) => (
              <label
                key={c}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#1c2433] bg-[#0d1420] p-3 cursor-pointer"
              >
                <div>
                  <p className="text-white text-sm font-semibold">{COOKIE_CONFIG.categories[c].label}</p>
                  <p className="text-slate-400 text-xs">{COOKIE_CONFIG.categories[c].description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={!!choices[c]}
                  onChange={(e) => setChoices((p) => ({ ...p, [c]: e.target.checked }))}
                  className="mt-1 w-4 h-4 accent-sky-500 shrink-0"
                />
              </label>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={rejectAll} className={`${btn} bg-sky-600 hover:bg-sky-500 text-white`}>
            Rifiuta
          </button>
          {custom ? (
            <button
              type="button"
              onClick={() => close(choices)}
              className={`${btn} bg-[#16213a] text-white hover:bg-[#1d2b4a] border border-[#26324a]`}
            >
              Salva le mie scelte
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCustom(true)}
              className={`${btn} bg-[#16213a] text-white hover:bg-[#1d2b4a] border border-[#26324a]`}
            >
              Personalizza
            </button>
          )}
          <button type="button" onClick={acceptAll} className={`${btn} bg-sky-600 hover:bg-sky-500 text-white`}>
            Accetta tutti
          </button>
        </div>
      </div>
    </div>
  );
};
