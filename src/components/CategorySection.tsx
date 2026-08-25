import React from 'react';
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

  return (
    <section className="w-full mt-7">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
            <Folder className="w-4 h-4" />
          </div>
          <h2 className="text-white text-base sm:text-lg font-bold tracking-tight">
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

      {/* Categories Grid (7 items matching the screenshot) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {categories.slice(0, 7).map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const translatedName = t(`cat.${cat.id}`, cat.name);
          const countDisplay = `${cat.countNumber || 100} ${t('categories.productsCount', 'prodotti')}`;

          return (
            <div
              key={cat.id}
              id={`cat-card-${cat.id}`}
              onClick={() => onSelectCategory(cat.id)}
              className={`group cursor-pointer rounded-2xl p-2.5 text-center transition-all duration-200 ${
                isSelected
                  ? 'bg-[#0f244a] border-2 border-sky-400 shadow-lg shadow-sky-950/40 translate-y-[-2px]'
                  : 'bg-[#081326] hover:bg-[#0c1c36] border border-[#142646] hover:border-[#1e3966] hover:translate-y-[-2px]'
              }`}
            >
              {/* Image Frame */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#050c18] mb-2.5">
                <img
                  src={cat.image}
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
