import React from 'react';
import { ShieldCheck, Truck, Layers, ArrowRight } from 'lucide-react';
import { HERO_IMAGE } from '../data/catalog';
import { useLanguage } from '../context/LanguageContext';
import { AuroraLogo } from './AuroraLogo';

interface HeroBannerProps {
  onExploreCatalog: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreCatalog }) => {
  const { t, language } = useLanguage();

  return (
    <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-r from-[#071329] via-[#091b38] to-[#0c264d] border border-[#13284c] shadow-2xl p-5 sm:p-7 md:p-8">
      {/* Background radial glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Right Mini Brand Logo on the Card (Mobile Only) */}
      <div className="absolute top-4 right-4 z-20 flex items-center md:hidden">
        <AuroraLogo size="xs" className="scale-90 opacity-90" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[280px] lg:min-h-[340px] items-center">
        {/* Left Content */}
        <div className="md:col-span-7 flex flex-col justify-between z-10 pr-0 md:pr-4">
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

          {/* 1. Mobile Feature Badges (Stacked vertically) */}
          <div className="flex flex-col gap-2.5 my-4 sm:hidden max-w-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0d2244] border border-[#1a386b] text-sky-400 flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold leading-tight">{t('hero.qualityTitle', 'Qualità Premium')}</p>
                <p className="text-slate-400 text-[11px] leading-tight mt-0.5">{t('hero.qualityDesc', 'Prodotti selezionati')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0d2244] border border-[#1a386b] text-sky-400 flex items-center justify-center shrink-0 shadow-sm">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold leading-tight">{t('hero.deliveryTitle', 'Consegna Veloce')}</p>
                <p className="text-slate-400 text-[11px] leading-tight mt-0.5">{t('hero.deliveryDesc', 'Affidabile e puntuale')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0d2244] border border-[#1a386b] text-sky-400 flex items-center justify-center shrink-0 shadow-sm">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold leading-tight">{t('hero.choiceTitle', 'Ampia Scelta')}</p>
                <p className="text-slate-400 text-[11px] leading-tight mt-0.5">{t('hero.choiceDesc', 'Sempre disponibili')}</p>
              </div>
            </div>
          </div>

          {/* 2. Desktop Feature Badges (3 horizontal cards in grid) */}
          <div className="hidden sm:grid sm:grid-cols-3 gap-2.5 my-6">
            <div className="bg-[#0e203f]/80 backdrop-blur-xs border border-[#1d3864] rounded-xl p-2.5 flex items-center gap-2.5 transition-transform hover:-translate-y-0.5">
              <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{t('hero.qualityTitle', 'Qualità Premium')}</p>
                <p className="text-slate-400 text-[10.5px] truncate">{t('hero.qualityDesc', 'Prodotti selezionati')}</p>
              </div>
            </div>

            <div className="bg-[#0e203f]/80 backdrop-blur-xs border border-[#1d3864] rounded-xl p-2.5 flex items-center gap-2.5 transition-transform hover:-translate-y-0.5">
              <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{t('hero.deliveryTitle', 'Consegna Veloce')}</p>
                <p className="text-slate-400 text-[10.5px] truncate">{t('hero.deliveryDesc', 'Affidabile e puntuale')}</p>
              </div>
            </div>

            <div className="bg-[#0e203f]/80 backdrop-blur-xs border border-[#1d3864] rounded-xl p-2.5 flex items-center gap-2.5 transition-transform hover:-translate-y-0.5">
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
          <div className="pt-1">
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
        <div className="md:col-span-5 relative flex items-end justify-center overflow-hidden min-h-[220px] lg:min-h-full">
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-transparent via-[#071329]/40 to-[#071329] md:to-[#091b38] z-1 pointer-events-none" />
          <img
            src={HERO_IMAGE}
            alt="Soluzioni per igiene e pulizia"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center md:object-right transform scale-105"
          />
        </div>
      </div>
    </div>
  );
};
