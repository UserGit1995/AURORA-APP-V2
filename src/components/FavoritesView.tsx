import React from 'react';
import { Heart, Plus, ArrowLeft, Sparkles, PackageSearch, Bookmark, Scale } from 'lucide-react';
import { Product } from '../types';
import { useAdmin } from '../context/AdminContext';

interface FavoritesViewProps {
  favoriteProducts: Product[];
  onToggleFavorite: (productId: string) => void;
  comparedProductIds?: string[];
  onToggleCompare?: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onBackToHome: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favoriteProducts,
  onToggleFavorite,
  comparedProductIds = [],
  onToggleCompare,
  onSelectProduct,
  onAddToCart,
  onBackToHome,
}) => {
  const { isBusinessCustomer } = useAdmin();

  return (
    <div className="w-full animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
            <Heart className="w-5 h-5 fill-rose-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Prodotti Preferiti e Riordino Rapido
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {favoriteProducts.length} referenze salvate per i tuoi ordini ricorrenti.
            </p>
          </div>
        </div>
      </div>

      {favoriteProducts.length === 0 ? (
        <div
          id="favorites-empty-container"
          className="relative overflow-hidden bg-gradient-to-b from-[#081326] to-[#050b18] border border-[#142646] rounded-3xl p-8 sm:p-14 text-center flex flex-col items-center justify-center shadow-xl"
        >
          {/* Background ambient lighting effects */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Visual CSS + Lucide Illustration */}
          <div className="relative mb-6 flex items-center justify-center">
            {/* Outer dotted orbit */}
            <div className="w-32 h-32 rounded-full border border-dashed border-[#1e3860] flex items-center justify-center animate-[spin_40s_linear_infinite]" />

            {/* Orbiting mini badges */}
            <div className="absolute -top-1 -right-1 p-2 rounded-xl bg-[#0d1e38] border border-[#1c3963] text-rose-400 shadow-md">
              <Heart className="w-3.5 h-3.5 fill-rose-400/80" />
            </div>
            <div className="absolute -bottom-1 -left-1 p-2 rounded-xl bg-[#0d1e38] border border-[#1c3963] text-amber-400 shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="absolute top-1/2 -right-4 -translate-y-1/2 p-1.5 rounded-lg bg-[#0a182e] border border-[#152e50] text-sky-400 shadow-md">
              <Bookmark className="w-3 h-3" />
            </div>

            {/* Central glowing illustration bubble */}
            <div className="absolute w-20 h-20 rounded-2xl bg-gradient-to-br from-[#102444] to-[#0a172c] border border-[#203e6b] flex items-center justify-center text-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.15)]">
              <div className="relative">
                <Heart className="w-9 h-9 stroke-[1.5] text-rose-400/50" />
                <PackageSearch className="w-5 h-5 text-sky-300 absolute -bottom-1 -right-2" />
              </div>
            </div>
          </div>

          {/* Text Details */}
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-2">
            La tua lista preferiti è vuota
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-7">
            Non hai ancora salvato nessun prodotto. Clicca sull'icona a forma di cuore sui prodotti nel catalogo per aggiungerli alla tua lista di riordino rapido.
          </p>

          {/* Back to Shop / Torna allo Shop CTA Button */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              id="favorites-back-to-shop-button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Torna allo Shop</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {favoriteProducts.map((product) => {
            const isLowStock = product.stock <= (product.lowStockThreshold ?? 100);
            const isCompared = comparedProductIds.includes(product.id);

            return (
              <div
                key={product.id}
                id={`favorites-product-card-${product.id}`}
                onClick={() => onSelectProduct(product)}
                className={`group cursor-pointer bg-[#081326] hover:bg-[#0c1c36] border rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 ${
                  isCompared
                    ? 'border-amber-500/50 ring-1 ring-amber-500/30'
                    : 'border-[#142646] hover:border-[#1e3966]'
                }`}
              >
                <div className="flex items-center justify-between mb-1 gap-1">
                  <div>
                    {isLowStock && (
                      <span
                        id={`fav-low-stock-badge-${product.id}`}
                        className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/35 px-1.5 py-0.5 rounded-md"
                        title={`Scorte basse: rimasti ${product.stock} colli a magazzino`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        <span>Scorte basse</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {onToggleCompare && (
                      <button
                        id={`fav-compare-btn-${product.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCompare(product.id);
                        }}
                        className={`p-1.5 rounded-full transition-colors ${
                          isCompared
                            ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40'
                            : 'text-slate-400 hover:text-white bg-[#0a1528]/80 hover:bg-[#112344]'
                        }`}
                        title={isCompared ? 'Rimuovi dal confronto' : 'Aggiungi al confronto'}
                      >
                        <Scale className={`w-3.5 h-3.5 ${isCompared ? 'stroke-[2.5]' : ''}`} />
                      </button>
                    )}

                    <button
                      id={`fav-remove-btn-${product.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(product.id);
                      }}
                      className="p-1.5 rounded-full text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                      title="Rimuovi dai preferiti"
                    >
                      <Heart className="w-3.5 h-3.5 fill-rose-400" />
                    </button>
                  </div>
                </div>

                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-b from-[#060e1d] to-[#0a1529] flex items-center justify-center p-2 mb-2">
                  <img
                    src={product.image}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>

                <div className="text-left">
                  <h3 className="text-white text-xs font-bold truncate leading-tight">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-slate-400 text-[11px] truncate">{product.category}</p>
                    {isLowStock && (
                      <span className="text-rose-400 text-[10px] font-medium shrink-0">
                        Solo {product.stock} colli
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-[#122340]">
                    <div>
                      {isBusinessCustomer ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-white text-xs font-bold">€{(product.price * 1.22).toFixed(2)}</span>
                          <span className="text-sky-400 text-[9.5px] font-medium bg-sky-500/15 px-1 py-0.5 rounded border border-sky-500/25">con IVA</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-white text-xs font-bold">€{product.price.toFixed(2)}</span>
                          <span className="text-emerald-400 text-[9.5px] font-medium bg-emerald-500/15 px-1 py-0.5 rounded border border-emerald-500/25">senza IVA</span>
                        </div>
                      )}
                    </div>
                    <button
                      id={`fav-add-cart-btn-${product.id}`}
                      onClick={(e) => onAddToCart(product, e)}
                      className="p-1 rounded-lg bg-[#102342] hover:bg-[#0284c7] text-slate-300 hover:text-white transition-colors"
                      title="Aggiungi al carrello"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
