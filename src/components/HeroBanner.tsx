import React from 'react';
import { ShieldCheck, Truck, Layers, ArrowRight } from 'lucide-react';
import { HERO_IMAGE } from '../data/catalog';
import { useLanguage } from '../context/LanguageContext';

interface HeroBannerProps {
  onExploreCatalog: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreCatalog }) => {
  const { t, language } = useLanguage();

  return (
    <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-r from-[#071329] via-[#091b38] to-[#0c264d] border border-[#13284c] shadow-2xl">
      {/* Background radial glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[300px] lg:min-h-[340px]">
        {/* Left Content */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between z-10">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {t('hero.title', 'Soluzioni per ogni esigenza.')}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2.5 leading-relaxed">
              {language === 'it' ? (
                <>Igiene, pulizia e benessere per la casa e la <span className="underline decoration-sky-500/60 decoration-2 underline-offset-4">persona.</span></>
              ) : (
                <>Hygiene, cleaning, and sanitizing solutions for facilities and <span className="underline decoration-sky-500/60 decoration-2 underline-offset-4">personal care.</span></>
              )}
            </p>
          </div>

          {/* 3 Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-6">
            {/* Feature 1 */}
            <div className="bg-[#0e203f]/80 backdrop-blur-xs border border-[#1d3864] rounded-xl p-2.5 flex items-center gap-2.5 transition-transform hover:translate-y-[-1px]">
              <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{t('hero.qualityTitle', 'Qualità Premium')}</p>
                <p className="text-slate-400 text-[10.5px] truncate">{t('hero.qualityDesc', 'Prodotti selezionati')}</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#0e203f]/80 backdrop-blur-xs border border-[#1d3864] rounded-xl p-2.5 flex items-center gap-2.5 transition-transform hover:translate-y-[-1px]">
              <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{t('hero.deliveryTitle', 'Consegna Veloce')}</p>
                <p className="text-slate-400 text-[10.5px] truncate">{t('hero.deliveryDesc', 'Affidabile e puntuale')}</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#0e203f]/80 backdrop-blur-xs border border-[#1d3864] rounded-xl p-2.5 flex items-center gap-2.5 transition-transform hover:translate-y-[-1px]">
              <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{t('hero.choiceTitle', 'Ampia Scelta')}</p>
                <p className="text-slate-400 text-[10.5px] truncate">{t('hero.choiceDesc', 'Sempre disponibili')}</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div>
            <button
              id="hero-explore-catalog-btn"
              onClick={onExploreCatalog}
              className="inline-flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 shadow-lg shadow-sky-950/60 hover:shadow-sky-900/80 active:scale-[0.98] group"
            >
              <span>{t('hero.exploreBtn', 'Scopri il catalogo')}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Right Image Composition */}
        <div className="lg:col-span-5 relative flex items-end justify-center overflow-hidden min-h-[220px] lg:min-h-full">
          <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-l from-transparent via-[#071329]/40 to-[#071329] lg:to-[#091b38] z-1 pointer-events-none" />
          <img
            src={HERO_IMAGE}
            alt="Soluzioni per igiene e pulizia"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center lg:object-right transform scale-105"
          />
        </div>
      </div>
    </div>
  );
};
