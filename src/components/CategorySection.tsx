import React, { useState } from 'react';
import { Folder, ArrowRight } from 'lucide-react';
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
  const [activeDot, setActiveDot] = useState(0);

  // Take the primary categories (First 4 for mobile view, full list for desktop)
  const mobileCategories = categories.slice(0, 4);

  return (
    <section className="w-full mt-6 sm:mt-7">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="p-1 sm:p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
            <Folder className="w-4 h-4" />
          </div>
          <h2 className="text-white text-sm sm:text-lg font-bold tracking-tight">
            {t('categories.sectionTitle', 'Categorie principali')}
          </h2>
        </div>
        <button
          id="view-all-categories-btn"
          onClick={onViewAll}
          className="text-xs sm:text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 group"
        >
          <span>{t('categories.viewAll', 'Vedi tutte')}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* 1. MOBILE ONLY VIEW (4 Category Cards Matching Screenshot) */}
      <div className="grid grid-cols-4 gap-2 md:hidden">
        {mobileCategories.map((cat, idx) => {
          const isSelected = selectedCategoryId === cat.id;
          const translatedName = t(`cat.${cat.id}`, cat.name);

          return (
            <div
              key={`mobile-${cat.id}`}
              id={`cat-card-mobile-${cat.id}`}
              onClick={() => {
                setActiveDot(idx);
                onSelectCategory(cat.id);
              }}
              className={`group cursor-pointer rounded-2xl p-1.5 text-center transition-all duration-200 ${
                isSelected
                  ? 'bg-[#0e2244] border-2 border-sky-400 shadow-lg shadow-sky-950/40'
                  : 'bg-[#08152a] hover:bg-[#0b1d3a] border border-[#13284d]'
              }`}
            >
              {/* Image Frame */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#040c1a] mb-1.5">
                <img
                  src={cat.image}
                  alt={translatedName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {/* Title */}
              <h3 className="text-white text-[11px] font-bold truncate leading-tight">
                {translatedName}
              </h3>
            </div>
          );
        })}
      </div>

      {/* Mobile Only Carousel Indicator Dots */}
      <div className="flex md:hidden items-center justify-center gap-1.5 mt-3 pt-0.5">
        {[0, 1, 2, 3, 4].map((dotIndex) => (
          <button
            key={dotIndex}
            type="button"
            onClick={() => setActiveDot(dotIndex)}
            className={`rounded-full transition-all duration-200 ${
              activeDot === dotIndex
                ? 'w-2.5 h-2.5 bg-sky-400 shadow-sm shadow-sky-500/50'
                : 'w-2 h-2 bg-[#1b345b] hover:bg-slate-600'
            }`}
            aria-label={`Slide ${dotIndex + 1}`}
          />
        ))}
      </div>

      {/* 2. DESKTOP & TABLET VIEW (Full Categories Grid with Product Counts) */}
      <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const translatedName = t(`cat.${cat.id}`, cat.name);
          const countDisplay = `${cat.countNumber || 0} ${t('categories.productsCount', 'prodotti')}`;

          return (
            <div
              key={`desktop-${cat.id}`}
              id={`cat-card-${cat.id}`}
              onClick={() => onSelectCategory(cat.id)}
              className={`group cursor-pointer rounded-2xl p-2.5 text-center transition-all duration-200 ${
                isSelected
                  ? 'bg-[#0f244a] border-2 border-sky-400 shadow-lg shadow-sky-950/40 -translate-y-0.5'
                  : 'bg-[#081326] hover:bg-[#0c1c36] border border-[#142646] hover:border-[#1e3966] hover:-translate-y-0.5'
              }`}
            >
              {/* Image Frame */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#050c18] mb-2.5">
                <img
                  src={cat.image || '/logo-login.png'}
                  alt={translatedName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Title & Count */}
              <h3 className="text-white text-xs sm:text-sm font-bold truncate leading-tight group-hover:text-sky-300 transition-colors">
                {translatedName}
              </h3>
              <p className="text-slate-400 text-[11px] mt-0.5 truncate">
                {countDisplay}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
