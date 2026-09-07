import React, { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Product, Subcategory } from '../types';
import { productsByBrandGroupedByType } from '../lib/brands';
import { ProductGridCard } from './ProductGridCard';
import { colorForBrand } from './BrandsSection';

interface BrandDetailViewProps {
  brandName: string;
  brandImage?: string;
  subcategories: Subcategory[];
  products: Product[];
  favorites: string[];
  onToggleFavorite: (productId: string) => void;
  comparedProductIds?: string[];
  onToggleCompare?: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onBack: () => void;
}

export const BrandDetailView: React.FC<BrandDetailViewProps> = ({
  brandName,
  brandImage,
  subcategories,
  products,
  favorites,
  onToggleFavorite,
  comparedProductIds = [],
  onToggleCompare,
  onSelectProduct,
  onAddToCart,
  onBack,
}) => {
  const groups = useMemo(
    () => productsByBrandGroupedByType(brandName, subcategories, products),
    [brandName, subcategories, products]
  );
  const totalCount = groups.reduce((sum, g) => sum + g.products.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
          aria-label="Indietro"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center border overflow-hidden shrink-0 ${
            brandImage ? 'bg-white border-slate-200' : colorForBrand(brandName)
          }`}
        >
          {brandImage ? (
            <img src={brandImage} alt={brandName} className="w-full h-full object-contain p-1" />
          ) : (
            <span className="font-bold text-base">{brandName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <h1 className="text-slate-900 text-xl sm:text-2xl font-bold tracking-tight">{brandName}</h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            {totalCount} prodott{totalCount === 1 ? 'o' : 'i'} in {groups.length} tipologi{groups.length === 1 ? 'a' : 'e'}
          </p>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-10">Nessun prodotto disponibile al momento per questa marca.</p>
      )}

      {groups.map((group) => (
        <section key={group.typeName}>
          <h2 className="text-slate-900 text-base font-bold mb-3 flex items-center gap-2">
            {group.typeName}
            <span className="text-slate-400 text-xs font-medium">({group.products.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {group.products.map((product) => (
              <ProductGridCard
                key={product.id}
                product={product}
                isFavorite={favorites.includes(product.id)}
                onToggleFavorite={onToggleFavorite}
                isCompared={comparedProductIds.includes(product.id)}
                onToggleCompare={onToggleCompare}
                onSelectProduct={onSelectProduct}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
