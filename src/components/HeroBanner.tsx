import React from 'react';
import { ShieldCheck, Truck, Layers, ArrowRight, Package, Download } from 'lucide-react';
import { HERO_IMAGE } from '../data/catalog';
import { useLanguage } from '../context/LanguageContext';
import { useAdmin } from '../context/AdminContext';

interface HeroBannerProps {
  onExploreCatalog: () => void;
  onPersonalizza?: () => void;
  onChat?: () => void;
}

/** Icona WhatsApp (fumetto con cornetta) */
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28Z" />
  </svg>
);

const heroBtn =
  'w-full h-11 inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-semibold px-3 rounded-full transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]';

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreCatalog, onPersonalizza, onChat }) => {
  const { t, language } = useLanguage();
  const { productsList } = useAdmin();
  // Numero di referenze sempre aggiornato (arrotondato per difetto alle centinaia)
  const refCount = productsList.length >= 100 ? Math.floor(productsList.length / 100) * 100 : productsList.length;
  const refText =
    refCount > 0
      ? `Oltre ${refCount.toLocaleString('it-IT')} referenze sempre in magazzino`
      : 'Ampia scelta sempre in magazzino';

  return (
    <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-br from-[#01203d] via-[#052848] to-[#0a2038] border border-[#1c2433] shadow-sm p-5 sm:p-7 md:p-8">
      {/* Background radial glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

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
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold leading-tight">{t('hero.deliveryTitle', 'Consegna Veloce')}</p>
                <p className="text-slate-500 text-[11px] leading-tight mt-0.5">{t('hero.deliveryDesc', 'Spedizione in 24/48h affidabile e puntuale')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold leading-tight">{t('hero.choiceTitle', 'Ampia Scelta')}</p>
                <p className="text-slate-500 text-[11px] leading-tight mt-0.5">{refText}</p>
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
              <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 shrink-0">
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
                <p className="text-slate-500 text-[10.5px] truncate">{refText}</p>
              </div>
            </div>
          </div>

          {/* Pulsanti: tutti uguali, 2 per riga, stessa larghezza e altezza */}
          <div className="pt-1 grid grid-cols-2 gap-2.5 max-w-[520px]">
            <button
              id="hero-explore-catalog-btn"
              onClick={onExploreCatalog}
              className={heroBtn}
            >
              <ArrowRight className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('hero.exploreBtn', 'Scopri il catalogo')}</span>
            </button>
            <button
              id="hero-personalizza-btn"
              onClick={onPersonalizza}
              className={heroBtn}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span className="truncate sm:hidden">Personalizza</span>
              <span className="truncate hidden sm:inline">Personalizza Packaging</span>
            </button>
            <button
              id="hero-scarica-app-btn"
              onClick={() => {
                window.location.href = '/installa';
              }}
              className={heroBtn}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="truncate">Scarica App</span>
            </button>
            <button
              id="hero-chat-btn"
              onClick={onChat}
              className={heroBtn}
            >
              <WhatsAppIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">Chatta con noi</span>
            </button>
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
