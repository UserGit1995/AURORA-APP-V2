import React, { useState } from 'react';
import { useCloseOnBack } from '../utils/useCloseOnBack';
import { AdminImageFinderButton } from './AdminImageFinderButton';
import { AdminRemoveBgButton } from './AdminRemoveBgButton';
import { ShareProductButton } from './ShareProductButton';
import { X, ArrowLeft, Heart, Plus, Minus, ShoppingBag, ShieldCheck, Check, Package, Star, Scale, BookOpen, FlaskConical, Info } from 'lucide-react';
import { Product } from '../types';
import { useAdmin } from '../context/AdminContext';
import { PLACEHOLDER_IMAGE } from '../utils/imageRepair';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  isCompared?: boolean;
  onToggleCompare?: (productId: string) => void;
  onOpenRestockAnalysis?: (focusProductId?: string) => void;
  onEditProduct?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
  isCompared = false,
  onToggleCompare,
  onOpenRestockAnalysis,
  onEditProduct,
}) => {
  const { isBusinessCustomer, vatFactor, vatPercent } = useAdmin();
  // Indietro del telefono / Esc chiudono la scheda prodotto
  useCloseOnBack(true, onClose);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage'>('overview');
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);

  if (!product) return null;

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  const rawSubtotal = product.price * quantity;
  const totalPrice = rawSubtotal.toFixed(2);
  const totalWithVat = (rawSubtotal * vatFactor).toFixed(2);
  const displayFinalPrice = isBusinessCustomer ? totalWithVat : totalPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl sm:max-w-4xl max-h-[94vh] overflow-y-auto overflow-x-hidden bg-[#0d1420] border border-[#1c2433] rounded-3xl shadow-2xl scrollbar-none flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Back Button */}
        <button
          id="back-from-product-modal"
          onClick={onClose}
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 pl-2 pr-3 py-2 rounded-full bg-[#0d1420] text-slate-300 hover:text-white border border-[#1c2433] hover:border-sky-500/40 transition-colors text-xs font-semibold"
          aria-label="Torna indietro"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Indietro</span>
        </button>

        {/* Close Button */}
        <button
          id="close-product-modal"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#0d1420] text-slate-500 hover:text-white border border-[#1c2433] transition-colors"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Navigation Header */}
        <div className="px-5 sm:px-6 pt-16 sm:pt-5 sm:pl-28 pb-0 border-b border-[#1c2433] flex items-center gap-2">
          <button
            type="button"
            id="tab-product-overview"
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'overview'
                ? 'border-sky-400 text-sky-400 bg-sky-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-[#1a2230] rounded-t-xl'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Panoramica Articolo</span>
          </button>
        </div>

        {(
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1">
            {/* Left: Product Image Showcase */}
            <div className="md:col-span-5 relative bg-white p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#1c2433]">
              <AdminImageFinderButton product={product} className="bottom-4 left-4" />
              <AdminRemoveBgButton product={product} className="bottom-4 right-4" />
              {product.discountPercent && (
                <div className="absolute top-4 left-4 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg">
                  Sconto -{product.discountPercent}%
                </div>
              )}
              <img
                src={product.image || PLACEHOLDER_IMAGE}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
              />
              <div className="mt-4 flex items-center gap-2 text-xs text-sky-400 font-medium">
                <Package className="w-4 h-4" />
                <span>Confezione: {product.packageQty}</span>
              </div>
            </div>

            {/* Right: Product Details */}
            <div className="md:col-span-7 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <span className="block text-xs font-semibold text-sky-400 uppercase tracking-wider truncate">
                  {product.category}
                </span>

                {onEditProduct && (
                  <button
                    id="modal-edit-product-btn"
                    type="button"
                    onClick={() => {
                      onEditProduct(product);
                      onClose();
                    }}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold border transition-colors whitespace-nowrap font-bold border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    title="Modifica questo prodotto"
                  >
                    <Star className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>Modifica prodotto (Admin)</span>
                  </button>
                )}

                {/* Pulsanti tutti uguali: 2 per riga sul telefono, 4 in fila sul PC.
                    Niente sporge dalla scheda, quindi la pagina non scorre di lato. */}
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                  {onToggleCompare && (
                    <button
                      id="modal-compare-toggle"
                      type="button"
                      onClick={() => onToggleCompare(product.id)}
                      className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold border transition-colors whitespace-nowrap ${
                        isCompared
                          ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                          : 'border-[#1c2433] bg-[#0d1420] text-slate-400 hover:text-white'
                      }`}
                      title={isCompared ? 'Rimuovi dal confronto' : 'Aggiungi al confronto'}
                    >
                      <Scale className="w-3.5 h-3.5 shrink-0" />
                      <span>{isCompared ? 'In confronto' : 'Confronta'}</span>
                    </button>
                  )}

                  {onOpenRestockAnalysis && (
                    <button
                      id="modal-restock-btn"
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRestockAnalysis(product.id);
                      }}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold border transition-colors whitespace-nowrap border-sky-500/30 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"
                      title="Analisi Riordino per questo articolo"
                    >
                      <Star className="w-3.5 h-3.5 shrink-0" />
                      <span>Riordino</span>
                    </button>
                  )}

                  <button
                    id="modal-fav-toggle"
                    type="button"
                    onClick={() => onToggleFavorite(product.id)}
                    className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold border transition-colors whitespace-nowrap ${
                      isFavorite
                        ? 'border-rose-500/30 bg-rose-500/15 text-rose-400'
                        : 'border-[#1c2433] bg-[#0d1420] text-slate-400 hover:text-white'
                    }`}
                    aria-label="Preferito"
                  >
                    <Heart className={`w-3.5 h-3.5 shrink-0 ${isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
                    <span>{isFavorite ? 'Nei preferiti' : 'Preferito'}</span>
                  </button>

                  <ShareProductButton product={product} buttonClassName="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold border transition-colors whitespace-nowrap border-[#1c2433] bg-[#0d1420] text-slate-400 hover:text-white hover:border-sky-500/40" />
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white mt-4 break-words">
                  {product.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Codice Articolo: <span className="text-slate-400 font-mono">{product.code}</span>
                </p>

                <p className="text-slate-400 text-xs sm:text-sm mt-3 leading-relaxed">
                  {product.description}
                </p>

                {/* Specs Box */}
                <div className="mt-3.5 bg-[#0d1420] border border-[#1c2433] rounded-xl p-3 text-xs space-y-1.5">
                  {product.specs.format && (
                    <div className="flex justify-between text-slate-400">
                      <span>Formato:</span>
                      <span className="text-slate-300 font-medium">{product.specs.format}</span>
                    </div>
                  )}
                  {product.specs.fragrance && (
                    <div className="flex justify-between text-slate-400">
                      <span>Fragranza:</span>
                      <span className="text-slate-300 font-medium">{product.specs.fragrance}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Disponibilità B2B:</span>
                    {product.stock <= (product.lowStockThreshold ?? 100) ? (
                      <span className="text-rose-400 font-medium flex items-center gap-1.5 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                        <span>Scorte limitate: {product.stock} colli rimasti</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {product.stock >= 999 ? 'Disponibile' : `${product.stock} colli a magazzino`}
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* Bottom: Price & Quantity Controls */}
              <div className="mt-5 pt-4 border-t border-[#1c2433]">
                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <span className="text-2xl font-extrabold text-white">€{displayFinalPrice}</span>
                    {vatPercent === 0 ? null : isBusinessCustomer ? (
                      <span className="text-xs text-sky-400 ml-2 font-medium bg-sky-500/15 px-2 py-0.5 rounded border border-sky-500/25">
                        con IVA {vatPercent}% (Netto €{totalPrice})
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400 ml-2 font-medium bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/25">
                        senza IVA (Prezzo Utente)
                      </span>
                    )}
                  </div>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xs text-slate-500 line-through mr-2">
                      €{(isBusinessCustomer ? product.originalPrice * vatFactor : product.originalPrice).toFixed(2)}
                    </span>
                  )}
                  {product.offerNote && (
                    <span className="block text-xs font-semibold text-amber-300 mb-1">Offerta: {product.offerNote}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    €{isBusinessCustomer ? (product.price * vatFactor).toFixed(2) : product.price.toFixed(2)} / {product.unit}
                    <span className="text-[10px] ml-1 text-slate-500">
                      {vatPercent === 0 ? '' : isBusinessCustomer ? '(IVA inc.)' : '(senza IVA)'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Quantity modifier */}
                  <div className="flex items-center bg-[#0d1420] border border-[#1c2433] rounded-xl px-2 py-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-1.5 text-slate-400 hover:text-white"
                      aria-label="Diminuisci quantità"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-sm font-bold text-white min-w-[2rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-1.5 text-slate-400 hover:text-white"
                      aria-label="Aumenta quantità"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    id="modal-add-to-cart-btn"
                    onClick={handleAdd}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md ${
                      addedAnimation
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sky-950/50'
                    }`}
                  >
                    {addedAnimation ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Aggiunto al carrello!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Aggiungi all'ordine</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
