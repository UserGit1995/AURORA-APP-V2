import React, { useRef } from 'react';
import { Folder, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Category } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CategorySectionProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  onViewAll: () => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onViewAll,
}) => {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  const totalProducts = categories.reduce((sum, c) => sum + (c.countNumber || 0), 0);

  return (
    <section className="w-full mt-6 sm:mt-7">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-100 text-sky-600">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-slate-900 text-sm sm:text-lg font-bold tracking-tight leading-tight">
              {t('categories.sectionTitle', 'Categorie principali')}
            </h2>
            <p className="hidden sm:block text-slate-500 text-xs">
              Esplora la gamma completa per la pulizia professionale e personale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedCategoryId && (
            <button
              onClick={onViewAll}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 underline underline-offset-2"
            >
              Mostra tutte
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scrollBy('left')}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors"
              aria-label="Scorri a sinistra"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollBy('right')}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors"
              aria-label="Scorri a destra"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Carosello orizzontale */}
      <div
        ref={scrollRef}
        className="flex gap-3.5 overflow-x-auto pb-2 scroll-smooth snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Card "Catalogo completo" */}
        <button
          onClick={onViewAll}
          className={`shrink-0 snap-start w-36 sm:w-44 h-40 rounded-2xl p-4 flex flex-col justify-between text-left transition-all border ${
            !selectedCategoryId
              ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
              : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300 shadow-xs'
          }`}
        >
          <span className="p-2 rounded-xl bg-white/15 w-fit">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <div className="font-bold text-sm leading-tight">Catalogo completo</div>
            <div className="text-[11px] opacity-80 mt-0.5">{totalProducts} prodotti</div>
          </div>
        </button>

        {/* Card categorie */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const translatedName = t(`cat.${cat.id}`, cat.name);
          return (
            <button
              key={cat.id}
              id={`cat-card-${cat.id}`}
              onClick={() => onSelectCategory(cat.id)}
              className={`relative shrink-0 snap-start w-48 sm:w-56 h-40 rounded-2xl overflow-hidden text-left transition-all border group ${
                isSelected
                  ? 'border-sky-400 ring-2 ring-sky-500/60 shadow-md -translate-y-0.5'
                  : 'border-slate-200 hover:border-sky-400 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              <img
                src={cat.image || '/logo-login.png'}
                alt={translatedName}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div
                className={`absolute inset-0 ${
                  isSelected
                    ? 'bg-gradient-to-t from-sky-950/95 via-sky-950/60 to-sky-950/20'
                    : 'bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/20 group-hover:from-slate-950/95'
                }`}
              />

              <div className="relative z-10 h-full p-4 flex flex-col justify-between">
                <span className="self-start text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20">
                  {cat.countNumber || 0} prodotti
                </span>
                <div>
                  <div className="font-bold text-base leading-tight text-white group-hover:text-sky-700 transition-colors">
                    {translatedName}
                  </div>
                  {cat.description && (
                    <div className="text-[11px] text-slate-200/90 line-clamp-1 mt-0.5">{cat.description}</div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
