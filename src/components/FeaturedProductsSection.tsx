import React from 'react';
import { Star, Heart, ArrowRight, Plus, Check, Scale } from 'lucide-react';
import { Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAdmin } from '../context/AdminContext';

interface FeaturedProductsSectionProps {
  products: Product[];
  favorites: string[];
  onToggleFavorite: (productId: string) => void;
  comparedProductIds?: string[];
  onToggleCompare?: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onViewAll: () => void;
  addedProductId?: string | null;
}

export const FeaturedProductsSection: React.FC<FeaturedProductsSectionProps> = ({
  products,
  favorites,
  onToggleFavorite,
  comparedProductIds = [],
  onToggleCompare,
  onSelectProduct,
  onAddToCart,
  onViewAll,
  addedProductId,
}) => {
  const { t, language } = useLanguage();
  const { isBusinessCustomer } = useAdmin();

  return (
    <section className="w-full mt-7 mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
            <Star className="w-4 h-4 fill-sky-400/30" />
          </div>
          <h2 className="text-white text-base sm:text-lg font-bold tracking-tight">
            {t('featured.sectionTitle', 'Prodotti in evidenza')}
          </h2>
        </div>
        <button
          id="view-all-featured-btn"
          onClick={onViewAll}
          className="text-xs sm:text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 group"
        >
          <span>{t('featured.viewAll', 'Vedi tutti')}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Products Grid (6 items matching the screenshot) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {products.slice(0, 6).map((product) => {
          const isFav = favorites.includes(product.id);
          const isCompared = comparedProductIds.includes(product.id);
          const isJustAdded = addedProductId === product.id;
          const isLowStock = product.stock <= (product.lowStockThreshold ?? 100);
          const translatedCat = t(`cat.${product.categoryId}`, product.category);

          return (
            <div
              key={product.id}
              id={`product-card-${product.id}`}
              onClick={() => onSelectProduct(product)}
              className={`group relative cursor-pointer bg-[#081326] hover:bg-[#0c1c36] border rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 hover:translate-y-[-2px] shadow-sm hover:shadow-lg hover:shadow-sky-950/40 ${
                isCompared
                  ? 'border-amber-500/50 ring-1 ring-amber-500/30 shadow-amber-500/5'
                  : 'border-[#142646] hover:border-[#1e3966]'
              }`}
            >
              {/* Top Bar: Discount, Low Stock Badge & Favorite + Compare Buttons */}
              <div className="flex items-center justify-between w-full mb-1 z-10 gap-1">
                <div className="flex items-center gap-1 flex-wrap">
                  {product.discountPercent ? (
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                      -{product.discountPercent}%
                    </span>
                  ) : null}
                  {isLowStock && (
                    <span
                      id={`low-stock-badge-${product.id}`}
                      className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/35 px-1.5 py-0.5 rounded-md"
                      title={language === 'it' ? `Scorte basse: rimasti ${product.stock} colli a magazzino` : `Low stock: ${product.stock} units remaining in warehouse`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                      <span>{t('featured.stockLow', 'Scorte basse')}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Compare Toggle Button */}
                  {onToggleCompare && (
                    <button
                      id={`compare-btn-${product.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCompare(product.id);
                      }}
                      className={`p-1.5 rounded-full backdrop-blur-xs transition-colors shrink-0 ${
                        isCompared
                          ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-white bg-[#0a1528]/80 hover:bg-[#112344]'
                      }`}
                      title={isCompared ? t('featured.inCompare', 'Rimuovi dal confronto') : t('featured.compare', 'Aggiungi al confronto')}
                      aria-label="Confronta prodotto"
                    >
                      <Scale className={`w-3.5 h-3.5 ${isCompared ? 'stroke-[2.5]' : ''}`} />
                    </button>
                  )}

                  {/* Favorite Button */}
                  <button
                    id={`fav-btn-${product.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(product.id);
                    }}
                    className={`p-1.5 rounded-full backdrop-blur-xs transition-colors shrink-0 ${
                      isFav
                        ? 'text-rose-400 bg-rose-500/10'
                        : 'text-slate-400 hover:text-white bg-[#0a1528]/80 hover:bg-[#112344]'
                    }`}
                    aria-label="Aggiungi ai preferiti"
                    title={isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400 text-rose-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Product Image */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-b from-[#060e1d] to-[#0a1529] flex items-center justify-center p-2 my-1">
                <img
                  src={product.image}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Product Info */}
              <div className="mt-2 text-left">
                <h3 className="text-white text-xs sm:text-sm font-bold truncate leading-tight group-hover:text-sky-300 transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p className="text-slate-400 text-[11px] truncate">
                    {translatedCat}
                  </p>
                  {isLowStock && (
                    <span className="text-rose-400 text-[10px] font-medium shrink-0">
                      {language === 'it' ? `Solo ${product.stock} colli` : `Only ${product.stock} units`}
                    </span>
                  )}
                </div>

                {/* Price and B2B quick add */}
                <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-[#122340]">
                  <div>
                    {isBusinessCustomer ? (
                      <span className="text-white text-xs font-bold">
                        €{(product.price * 1.22).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-white text-xs font-bold">
                        €{product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button
                    id={`add-cart-btn-${product.id}`}
                    onClick={(e) => onAddToCart(product, e)}
                    className={`p-1 rounded-lg transition-all ${
                      isJustAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#102342] hover:bg-[#0284c7] text-slate-300 hover:text-white'
                    }`}
                    title={t('featured.addToCart', 'Aggiungi')}
                  >
                    {isJustAdded ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
