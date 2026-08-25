import React from 'react';
import { Tag, ArrowRight } from 'lucide-react';
import { BANNER_BOTTLES_IMAGE } from '../data/catalog';
import { useLanguage } from '../context/LanguageContext';

interface PromoBannerProps {
  onDiscoverOffers: () => void;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ onDiscoverOffers }) => {
  const { t, language } = useLanguage();

  return (
    <div className="w-full mt-7 rounded-2xl overflow-hidden bg-gradient-to-r from-[#071329] via-[#091b3b] to-[#0c244b] border border-[#13284c] shadow-xl relative">
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
          <div className="bg-[#1f2819] border border-amber-500/30 px-3 py-1.5 rounded-lg text-center">
            <span className="block text-[9px] uppercase tracking-wider font-bold text-amber-300 leading-none">
              {language === 'it' ? 'FINO AL' : 'UP TO'}
            </span>
            <span className="block text-amber-400 font-extrabold text-sm leading-none mt-0.5">
              -30%
            </span>
          </div>

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
