import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Category, Subcategory, Product } from '../types';
import { buildBrandSummaries, withProductCounts } from '../lib/brands';
import { BrandTile } from './BrandsSection';

interface AllBrandsViewProps {
  categories: Category[];
  subcategories: Subcategory[];
  products: Product[];
  onSelectBrand: (brandName: string) => void;
  onBack: () => void;
}

export const AllBrandsView: React.FC<AllBrandsViewProps> = ({
  categories,
  subcategories,
  products,
  onSelectBrand,
  onBack,
}) => {
  const [query, setQuery] = useState('');

  const brands = useMemo(() => {
    const base = buildBrandSummaries(categories, subcategories);
    return withProductCounts(base, subcategories, products)
      .filter((b) => b.productCount > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [categories, subcategories, products]);

  const filtered = query.trim()
    ? brands.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
    : brands;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-[#0e1b30] border border-[#1c2433] hover:bg-[#1a2230] text-slate-400 transition-colors"
          aria-label="Torna alla home"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight">Tutte le marche</h1>
          <p className="text-slate-500 text-xs sm:text-sm">{brands.length} marche disponibili nel catalogo</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca una marca..."
          className="w-full pl-10 pr-3.5 py-2.5 bg-[#0e1b30] border border-[#1c2433] focus:border-sky-400 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-colors"
        />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3">
        {filtered.map((brand) => (
          <BrandTile key={brand.name} brand={brand} onClick={() => onSelectBrand(brand.name)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-10">Nessuna marca trovata per "{query}"</p>
      )}
    </div>
  );
};
