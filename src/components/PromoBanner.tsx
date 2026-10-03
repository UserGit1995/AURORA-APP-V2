import React, { useEffect, useMemo, useState } from 'react';
import { Tag, ArrowRight, Timer } from 'lucide-react';
import { BANNER_BOTTLES_IMAGE } from '../data/catalog';
import { useLanguage } from '../context/LanguageContext';
import { useAdmin } from '../context/AdminContext';
import { isFlashLive } from '../utils/flashOffers';

interface PromoBannerProps {
  onDiscoverOffers: () => void;
}

const countdown = (ms: number) => {
  const min = Math.max(1, Math.round(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} g ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
};

export const PromoBanner: React.FC<PromoBannerProps> = ({ onDiscoverOffers }) => {
  const { t, language } = useLanguage();
  const { baseProductsList, flashOffersEnabled, systemSettings } = useAdmin();

  // Aggiorna il conto alla rovescia ogni 30 secondi
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  // Offerte a tempo in corso adesso
  const live = useMemo(() => {
    if (!flashOffersEnabled) return { count: 0, maxPct: 0, endsIn: 0 };
    let count = 0;
    let maxPct = 0;
    let firstEnd = Infinity;
    for (const p of baseProductsList) {
      if (!p.flashOffer || !isFlashLive(p, now)) continue;
      count++;
      maxPct = Math.max(maxPct, Math.round((1 - p.flashOffer.price / p.price) * 100));
      firstEnd = Math.min(firstEnd, new Date(p.flashOffer.endAt).getTime());
    }
    return { count, maxPct, endsIn: count ? firstEnd - now.getTime() : 0 };
  }, [baseProductsList, flashOffersEnabled, now]);

  // Riquadro "FINO AL -30%": testo scelto dall'admin, oppure calcolato dalle offerte a tempo in corso
  const badgeLabel = (systemSettings.promoBadgeLabel || '').trim() || (language === 'it' ? 'FINO AL' : 'UP TO');
  const manualValue = (systemSettings.promoBadgeValue || '').trim() || '-30%';
  const badgeValue = systemSettings.promoBadgeAuto && live.maxPct > 0 ? `-${live.maxPct}%` : manualValue;

  return (
    <div className="w-full mt-7 rounded-2xl overflow-hidden bg-gradient-to-r from-[#051d41] via-[#052a5a] to-[#051836] border border-[#1c2433] shadow-xl relative">
      <div className="flex flex-col md:flex-row items-center justify-between p-4 sm:p-5 lg:px-8 gap-4">
        {/* Left info */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
            <Tag className="w-5 h-5 fill-sky-400" />
          </div>
          <div>
            <h3 className="text-white text-base sm:text-lg font-bold tracking-tight">
              {t('promo.title', 'Offerte del mese')}
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm">
              {t('promo.desc', 'Scopri le promozioni esclusive a te dedicate!')}
            </p>
            {live.count > 0 && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-amber-300">
                <Timer className="w-3.5 h-3.5" />
                {live.count === 1 ? '1 offerta a tempo in corso' : `${live.count} offerte a tempo in corso`}
                {' · '}
                {live.count === 1 ? 'termina' : 'la prima termina'} tra {countdown(live.endsIn)}
              </p>
            )}
          </div>
        </div>

        {/* Center Product Bottles visual blend */}
        <div className="hidden lg:flex items-center justify-center flex-1 h-14 relative overflow-hidden px-4">
          <img
            src={BANNER_BOTTLES_IMAGE}
            alt="Promozioni del mese"
            referrerPolicy="no-referrer"
            className="h-full max-w-[280px] object-contain opacity-90 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* Right CTA and Discount Badge */}
        <div className="flex items-center gap-3 z-10 w-full sm:w-auto justify-between sm:justify-end">
          {badgeValue && (
            <div className="bg-[#0d1420] border border-amber-500/30 px-3 py-1.5 rounded-lg text-center">
              {badgeLabel && (
                <span className="block text-[9px] uppercase tracking-wider font-bold text-amber-300 leading-none">
                  {badgeLabel}
                </span>
              )}
              <span className="block text-amber-400 font-extrabold text-sm leading-none mt-0.5">{badgeValue}</span>
            </div>
          )}

          <button
            id="promo-banner-offers-btn"
            onClick={onDiscoverOffers}
            className="inline-flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full transition-all duration-200 shadow-md shadow-sky-950/50 group whitespace-nowrap"
          >
            <span>{t('promo.cta', 'Scopri le offerte')}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
