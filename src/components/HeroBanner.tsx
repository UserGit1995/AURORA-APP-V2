import React from 'react';
import { ShieldCheck, Truck, Layers, ArrowRight, Zap } from 'lucide-react';
import { HERO_IMAGE } from '../data/catalog';
import { useLanguage } from '../context/LanguageContext';
import { AuroraLogo } from './AuroraLogo';

interface HeroBannerProps {
  onExploreCatalog: () => void;
  onQuickReorder?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreCatalog, onQuickReorder }) => {
  const { t, language } = useLanguage();

  return (
    <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-br from-white via-sky-50/60 to-slate-50 border border-[#1c2433] shadow-sm p-5 sm:p-7 md:p-8">
      {/* Background radial glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

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
            <p className="text-slate-400 text-sm sm:text-base mt-2.5 leading-relaxed">
              {language === 'it' ? (
                <>
                  Igiene, pulizia e benessere per la casa e la{' '}
                  <span className="font-semibold text-white underline decoration-sky-500/60 decoration-2 underline-offset-4">
                    persona.
                  </span>{' '}
                  Formulazioni professionali all'avanguardia, sostenibili e sicure.
                </>
              ) : (
                <>
                  Hygiene, cleaning, and sanitizing solutions for facilities and{' '}
                  <span className="font-semibold text-white underline decoration-sky-500/60 decoration-2 underline-offset-4">
                    personal care.
                  </span>{' '}
                  Advanced, sustainable and safe professional formulas.
                </>
              )}
            </p>
          </div>

          {/* 1. Mobile Feature Badges (Stacked vertically) */}
          <div className="flex flex-col gap-2.5 my-4 sm:hidden max-w-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold leading-tight">{t('hero.qualityTitle', 'Qualità Premium')}</p>
                <p className="text-slate-500 text-[11px] leading-tight mt-0.5">{t('hero.qualityDesc', 'Formule testate & dermatologicamente sicure')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold leading-tight">{t('hero.deliveryTitle', 'Consegna Veloce')}</p>
                <p className="text-slate-500 text-[11px] leading-tight mt-0.5">{t('hero.deliveryDesc', 'Spedizione in 24/48h affidabile e puntuale')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-200 text-indigo-400 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold leading-tight">{t('hero.choiceTitle', 'Ampia Scelta')}</p>
                <p className="text-slate-500 text-[11px] leading-tight mt-0.5">{t('hero.choiceDesc', 'Oltre 1.200 referenze sempre in magazzino')}</p>
              </div>
            </div>
          </div>

          {/* 2. Desktop Feature Badges (3 horizontal cards in grid) */}
          <div className="hidden sm:grid sm:grid-cols-3 gap-2.5 my-6">
            <div className="bg-[#111826]/80 backdrop-blur-xs border border-[#1c2433] rounded-xl p-2.5 flex items-center gap-2.5 transition-transform hover:-translate-y-0.5 shadow-xs">
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{t('hero.qualityTitle', 'Qualità Premium')}</p>
                <p className="text-slate-500 text-[10.5px] truncate">{t('hero.qualityDesc', 'Formule testate & dermatologicamente sicure')}</p>
              </div>
            </div>

            <div className="bg-[#111826]/80 backdrop-blur-xs border border-[#1c2433] rounded-xl p-2.5 flex items-center gap-2.5 transition-transform hover:-translate-y-0.5 shadow-xs">
              <div className="p-1.5 rounded-lg bg-teal-100 text-teal-600 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{t('hero.deliveryTitle', 'Consegna Veloce')}</p>
                <p className="text-slate-500 text-[10.5px] truncate">{t('hero.deliveryDesc', 'Spedizione in 24/48h affidabile e puntuale')}</p>
              </div>
            </div>

            <div className="bg-[#111826]/80 backdrop-blur-xs border border-[#1c2433] rounded-xl p-2.5 flex items-center gap-2.5 transition-transform hover:-translate-y-0.5 shadow-xs">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{t('hero.choiceTitle', 'Ampia Scelta')}</p>
                <p className="text-slate-500 text-[10.5px] truncate">{t('hero.choiceDesc', 'Oltre 1.200 referenze sempre in magazzino')}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <button
              id="hero-explore-catalog-btn"
              onClick={onExploreCatalog}
              className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] group"
            >
              <span>{t('hero.exploreBtn', 'Scopri il catalogo')}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            {onQuickReorder && (
              <button
                id="hero-quick-reorder-btn"
                onClick={onQuickReorder}
                className="inline-flex items-center gap-2 bg-[#0e1b30] hover:bg-[#111826] border border-[#1c2433] text-slate-300 text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>Riordino Rapido 1-Click</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Image Composition */}
        <div className="md:col-span-5 relative flex items-end justify-center overflow-hidden min-h-[220px] lg:min-h-full rounded-2xl mt-5 md:mt-0">
          <img
            src={HERO_IMAGE}
            alt="Soluzioni per igiene e pulizia"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center md:object-right transform scale-105"
          />

          {/* Badge "In Pronta Consegna" */}
          <span className="absolute top-3.5 right-3.5 z-10 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-sm">
            In Pronta Consegna
          </span>

          {/* Fascia didascalia in basso */}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-slate-900/85 backdrop-blur-xs px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sky-400 text-[10px] font-bold tracking-wide uppercase">Selezione Aurora</p>
              <p className="text-white text-xs font-semibold truncate">Ocean Breeze &amp; Gentle Care</p>
            </div>
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
              PMC &amp; Bio
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
