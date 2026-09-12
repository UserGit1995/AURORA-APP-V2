import React from 'react';
import { Heart, Plus, Check, Scale } from 'lucide-react';
import { Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAdmin } from '../context/AdminContext';

interface ProductGridCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  isCompared?: boolean;
  onToggleCompare?: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  isJustAdded?: boolean;
}

/**
 * Scheda prodotto usata nella griglia (Prodotti in Evidenza, pagina Marca,
 * ecc.). Stessa identica resa grafica/comportamento del catalogo, estratta
 * qui per non duplicare il markup in ogni sezione che mostra una griglia di
 * prodotti.
 */
export const ProductGridCard: React.FC<ProductGridCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  isCompared = false,
  onToggleCompare,
  onSelectProduct,
  onAddToCart,
  isJustAdded = false,
}) => {
  const { t, language } = useLanguage();
  const { isBusinessCustomer } = useAdmin();
  const isLowStock = product.stock <= (product.lowStockThreshold ?? 100);
  const translatedCat = t(`cat.${product.categoryId}`, product.category);

  return (
    <div
      key={product.id}
      id={`product-card-${product.id}`}
      onClick={() => onSelectProduct(product)}
      className={`group relative cursor-pointer bg-[#0d1420] hover:bg-[#1a2230] border rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 hover:translate-y-[-2px] shadow-sm hover:shadow-lg ${
        isCompared ? 'border-amber-400 ring-1 ring-amber-300' : 'border-[#1c2433] hover:border-sky-500/50'
      }`}
    >
      <div className="flex items-center justify-between w-full mb-1 z-10 gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          {product.discountPercent ? (
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-500/40">
              -{product.discountPercent}%
            </span>
          ) : product.isFeatured ? (
            <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded-md border border-sky-500/30">
              In Evidenza
            </span>
          ) : null}
          {isLowStock && (
            <span
              id={`low-stock-badge-${product.id}`}
              className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded-md"
              title={language === 'it' ? `Scorte basse: rimasti ${product.stock} colli a magazzino` : `Low stock: ${product.stock} units remaining`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>{t('featured.stockLow', 'Scorte basse')}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onToggleCompare && (
            <button
              id={`compare-btn-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(product.id);
              }}
              className={`p-1.5 rounded-full transition-colors shrink-0 ${
                isCompared
                  ? 'text-amber-300 bg-amber-100 border border-amber-500/40'
                  : 'text-slate-500 hover:text-white bg-[#0e1b30] hover:bg-[#1a2230] border border-[#1c2433]'
              }`}
              title={isCompared ? t('featured.inCompare', 'Rimuovi dal confronto') : t('featured.compare', 'Aggiungi al confronto')}
              aria-label="Confronta prodotto"
            >
              <Scale className={`w-3.5 h-3.5 ${isCompared ? 'stroke-[2.5]' : ''}`} />
            </button>
          )}

          <button
            id={`fav-btn-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(product.id);
            }}
            className={`p-1.5 rounded-full transition-colors shrink-0 ${
              isFavorite
                ? 'text-rose-500 bg-rose-500/15'
                : 'text-slate-500 hover:text-white bg-[#0e1b30] hover:bg-[#1a2230] border border-[#1c2433]'
            }`}
            aria-label="Aggiungi ai preferiti"
            title={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#0e1b30] border border-[#1c2433] shadow-xs flex items-center justify-center p-2 my-1">
        <img
          src={product.image}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="mt-2 text-left">
        <h3 className="text-white text-xs sm:text-sm font-bold truncate leading-tight group-hover:text-sky-300 transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-slate-400 text-[11px] truncate">{translatedCat}</p>
          {isLowStock && (
            <span className="text-rose-500 text-[10px] font-medium shrink-0">
              {language === 'it' ? `Solo ${product.stock} colli` : `Only ${product.stock} units`}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-[#1c2433]">
          <div>
            {isBusinessCustomer ? (
              <span className="text-white text-xs font-bold">€{(product.price * 1.22).toFixed(2)}</span>
            ) : (
              <span className="text-white text-xs font-bold">€{product.price.toFixed(2)}</span>
            )}
          </div>
          <button
            id={`add-cart-btn-${product.id}`}
            onClick={(e) => onAddToCart(product, e)}
            className={`p-1 rounded-lg transition-all ${
              isJustAdded ? 'bg-emerald-600 text-white' : 'bg-[#161f30] hover:bg-[#0284c7] text-slate-400 hover:text-white'
            }`}
            title={t('featured.addToCart', 'Aggiungi')}
          >
            {isJustAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
