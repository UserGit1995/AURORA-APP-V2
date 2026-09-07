import React, { useMemo } from 'react';
import { Award, ArrowRight } from 'lucide-react';
import { Category, Subcategory, Product } from '../types';
import { buildBrandSummaries, withProductCounts, BrandSummary } from '../lib/brands';

interface BrandsSectionProps {
  categories: Category[];
  subcategories: Subcategory[];
  products: Product[];
  onSelectBrand: (brandName: string) => void;
  onViewAllBrands: () => void;
}

const BADGE_COLORS = [
  'bg-sky-50 text-sky-600 border-sky-200',
  'bg-amber-50 text-amber-600 border-amber-200',
  'bg-rose-50 text-rose-600 border-rose-200',
  'bg-emerald-50 text-emerald-600 border-emerald-200',
  'bg-indigo-50 text-indigo-600 border-indigo-200',
  'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
];

export function colorForBrand(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

export const BrandTile: React.FC<{ brand: BrandSummary; onClick: () => void }> = ({ brand, onClick }) => (
  <button
    id={`brand-card-${brand.name}`}
    onClick={onClick}
    className="w-full bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md rounded-2xl p-3.5 flex flex-col items-center text-center gap-2 transition-all hover:-translate-y-0.5"
  >
    <div
      className={`w-14 h-14 rounded-full flex items-center justify-center border overflow-hidden shrink-0 ${
        brand.image ? 'bg-white border-slate-200' : colorForBrand(brand.name)
      }`}
    >
      {brand.image ? (
        <img src={brand.image} alt={brand.name} className="w-full h-full object-contain p-1.5" />
      ) : (
        <span className="font-bold text-lg">{brand.name.charAt(0).toUpperCase()}</span>
      )}
    </div>
    <div className="min-w-0 w-full">
      <p className="text-slate-900 text-xs font-bold truncate">{brand.name}</p>
      <p className="text-slate-400 text-[10.5px] mt-0.5">{brand.productCount} prodotti</p>
    </div>
  </button>
);

// Sulla home mostriamo solo un assaggio: le marche coi più prodotti, che sono
// anche quelle più richieste. Il resto si trova nella pagina "Tutte le marche".
const HOME_PREVIEW_COUNT = 9;

export const BrandsSection: React.FC<BrandsSectionProps> = ({
  categories,
  subcategories,
  products,
  onSelectBrand,
  onViewAllBrands,
}) => {
  const brands = useMemo(() => {
    const base = buildBrandSummaries(categories, subcategories);
    return withProductCounts(base, subcategories, products)
      .filter((b) => b.productCount > 0)
      .sort((a, b) => b.productCount - a.productCount);
  }, [categories, subcategories, products]);

  if (brands.length === 0) return null;
  const preview = brands.slice(0, HOME_PREVIEW_COUNT);
  const remaining = brands.length - preview.length;

  return (
    <section className="w-full mt-6 sm:mt-7">
      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-slate-900 text-sm sm:text-lg font-bold tracking-tight leading-tight">Marche</h2>
            <p className="hidden sm:block text-slate-500 text-xs">Sfoglia tutti i prodotti per marca, in ogni categoria</p>
          </div>
        </div>
        {remaining > 0 && (
          <button
            onClick={onViewAllBrands}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 shrink-0"
          >
            Vedi tutte ({brands.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
        {preview.map((brand) => (
          <BrandTile key={brand.name} brand={brand} onClick={() => onSelectBrand(brand.name)} />
        ))}
      </div>
    </section>
  );
};
