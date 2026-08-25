import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  Tag, 
  Sparkles, 
  Flame, 
  Filter, 
  Heart, 
  Plus, 
  Check, 
  Search, 
  SlidersHorizontal, 
  Scale, 
  CheckSquare, 
  Square, 
  ShoppingBag, 
  X, 
  Layers, 
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Product } from '../types';
import { NavTab } from './Sidebar';
import { exportProductsToCsv } from '../utils/catalogCsvExporter';

interface CatalogViewProps {
  viewType: NavTab;
  categories: Category[];
  products: Product[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  favorites: string[];
  onToggleFavorite: (productId: string) => void;
  comparedProductIds?: string[];
  onToggleCompare?: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onBulkAddToCart?: (products: Product[]) => void;
  onBulkAddToFavorites?: (productIds: string[]) => void;
  searchQuery: string;
  onOpenRestockAnalysis?: (focusProductId?: string) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  viewType,
  categories,
  products,
  selectedCategoryId,
  onSelectCategory,
  favorites,
  onToggleFavorite,
  comparedProductIds = [],
  onToggleCompare,
  onSelectProduct,
  onAddToCart,
  onBulkAddToCart,
  onBulkAddToFavorites,
  searchQuery,
  onOpenRestockAnalysis,
}) => {
  const [activeFilterCategory, setActiveFilterCategory] = useState<string | null>(selectedCategoryId);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);
  const [bulkFeedback, setBulkFeedback] = useState<{ type: 'cart' | 'fav' | 'csv'; count: number } | null>(null);

  const getHeaderInfo = () => {
    switch (viewType) {
      case 'offerte':
        return {
          title: 'Promozioni e Offerte del Mese',
          description: 'Sconti quantità e promozioni speciali riservate per distributori e rivenditori.',
          icon: <Tag className="w-5 h-5 fill-amber-400/30 text-amber-400" />,
        };
      case 'novita':
        return {
          title: 'Nuovi Arrivi e Nuove Formulazioni',
          description: 'Le ultime novità in catalogo per igiene professionale e sanificazione avanzata.',
          icon: <Sparkles className="w-5 h-5 text-sky-400" />,
        };
      case 'piu-venduti':
        return {
          title: 'I Più Venduti - Top B2B',
          description: 'I prodotti con la maggiore rotazione di magazzino e gradimento dai clienti.',
          icon: <Flame className="w-5 h-5 text-amber-400" />,
        };
      case 'categorie':
      default:
        return {
          title: 'Catalogo Generale Prodotti',
          description: 'Tutte le linee di prodotto per la pulizia professionale, cura persona e igiene.',
          icon: <Folder className="w-5 h-5 text-sky-400" />,
        };
    }
  };

  const headerInfo = getHeaderInfo();

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Tab filter
      if (viewType === 'offerte' && !product.isOffer && !product.discountPercent) {
        return false;
      }
      // Category filter
      if (activeFilterCategory && product.categoryId !== activeFilterCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = product.name.toLowerCase().includes(q);
        const matchCategory = product.category.toLowerCase().includes(q);
        const matchCode = product.code.toLowerCase().includes(q);
        if (!matchName && !matchCategory && !matchCode) return false;
      }
      return true;
    });
  }, [products, viewType, activeFilterCategory, searchQuery]);

  const selectedProducts = useMemo(() => {
    return products.filter((p) => selectedProductIds.includes(p.id));
  }, [products, selectedProductIds]);

  const totalSelectedPrice = useMemo(() => {
    return selectedProducts.reduce((acc, p) => acc + p.price, 0);
  }, [selectedProducts]);

  const toggleSelectProduct = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredProducts.map((p) => p.id);
    const allSelected = visibleIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedProductIds([]);
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedProductIds([]);
  };

  const handleBulkAddSelectedToCart = () => {
    if (selectedProducts.length === 0) return;
    if (onBulkAddToCart) {
      onBulkAddToCart(selectedProducts);
    } else {
      selectedProducts.forEach((p) => onAddToCart(p, {} as any));
    }
    const count = selectedProducts.length;
    setBulkFeedback({ type: 'cart', count });
    setTimeout(() => setBulkFeedback(null), 3000);
    setSelectedProductIds([]);
  };

  const handleBulkAddSelectedToFavorites = () => {
    if (selectedProductIds.length === 0) return;
    if (onBulkAddToFavorites) {
      onBulkAddToFavorites(selectedProductIds);
    } else {
      selectedProductIds.forEach((id) => {
        if (!favorites.includes(id)) {
          onToggleFavorite(id);
        }
      });
    }
    const count = selectedProductIds.length;
    setBulkFeedback({ type: 'fav', count });
    setTimeout(() => setBulkFeedback(null), 3000);
    setSelectedProductIds([]);
  };

  const handleExportSelectedToCsv = () => {
    if (selectedProducts.length === 0) return;
    setIsExportingCsv(true);
    try {
      exportProductsToCsv(selectedProducts, 'aurora_inventario_prodotti');
      const count = selectedProducts.length;
      setBulkFeedback({ type: 'csv', count });
      setTimeout(() => setBulkFeedback(null), 3500);
    } catch (err) {
      console.error('Errore durante esportazione CSV inventario:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const allVisibleSelected = 
    filteredProducts.length > 0 && 
    filteredProducts.every((p) => selectedProductIds.includes(p.id));

  return (
    <div className="w-full animate-in fade-in duration-200 relative pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0d1e3a] border border-[#162d52]">
            {headerInfo.icon}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {headerInfo.title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {headerInfo.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Selection Mode Toggle Button */}
          <button
            id="toggle-selection-mode-btn"
            type="button"
            onClick={() => {
              if (isSelectionMode) {
                handleExitSelectionMode();
              } else {
                setIsSelectionMode(true);
              }
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              isSelectionMode
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-xs shadow-sky-950/40'
                : 'bg-[#09152b] hover:bg-[#0e203c] text-slate-300 hover:text-white border-[#142848]'
            }`}
            title={isSelectionMode ? 'Disattiva selezione multipla' : 'Attiva modalità selezione multipla'}
          >
            <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
            <span>{isSelectionMode ? 'Modalità Selezione Attiva' : 'Selezione Multipla'}</span>
            {selectedProductIds.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-sky-500 text-white text-[10px] font-bold">
                {selectedProductIds.length}
              </span>
            )}
          </button>

          {onOpenRestockAnalysis && (
            <button
              id="catalog-restock-analysis-btn"
              onClick={() => onOpenRestockAnalysis()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-950/40 transition-all hover:scale-[1.02] shrink-0"
              title="Analisi previsionale del riordino merci con Gemini AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-200 animate-pulse" />
              <span>Analisi Riordino AI</span>
            </button>
          )}
        </div>
      </div>

      {/* Selection Mode Action Banner Toolbar (when active) */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="bg-[#07152e] border border-sky-500/40 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-sky-950/30">
              <div className="flex items-center gap-2.5">
                <button
                  id="select-all-visible-btn"
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0e2448] hover:bg-[#143264] text-xs font-semibold text-sky-200 border border-sky-500/30 transition-colors"
                >
                  {allVisibleSelected ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                      <span>Deseleziona Visibili ({filteredProducts.length})</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-sky-400" />
                      <span>Seleziona Visibili ({filteredProducts.length})</span>
                    </>
                  )}
                </button>

                {selectedProductIds.length > 0 && (
                  <button
                    id="clear-selection-btn"
                    type="button"
                    onClick={handleClearSelection}
                    className="text-xs text-slate-400 hover:text-white underline transition-colors px-2 py-1"
                  >
                    Azzera ({selectedProductIds.length})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-300 font-medium mr-1 hidden sm:inline">
                  <strong className="text-sky-300">{selectedProductIds.length}</strong> selezionati
                  {selectedProductIds.length > 0 && ` (€ ${totalSelectedPrice.toFixed(2)} +IVA)`}
                </span>

                {/* Export Selected to CSV */}
                <button
                  id="bulk-export-csv-btn"
                  type="button"
                  disabled={selectedProductIds.length === 0 || isExportingCsv}
                  onClick={handleExportSelectedToCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0d223f] hover:bg-[#13325c] disabled:opacity-40 disabled:cursor-not-allowed text-sky-200 border border-sky-400/30 transition-colors shadow-xs"
                  title="Esporta i prodotti selezionati in formato CSV per la gestione dell'inventario e riordini offline"
                >
                  {isExportingCsv ? (
                    <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>Esporta CSV ({selectedProductIds.length})</span>
                </button>

                <button
                  id="bulk-add-favorites-btn"
                  type="button"
                  disabled={selectedProductIds.length === 0}
                  onClick={handleBulkAddSelectedToFavorites}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#122340] hover:bg-[#183058] disabled:opacity-40 disabled:cursor-not-allowed text-rose-300 border border-rose-500/30 transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                  <span>Ai Preferiti ({selectedProductIds.length})</span>
                </button>

                <button
                  id="bulk-add-cart-btn"
                  type="button"
                  disabled={selectedProductIds.length === 0}
                  onClick={handleBulkAddSelectedToCart}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-sky-950/40 transition-colors"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Al Carrello ({selectedProductIds.length})</span>
                </button>

                <button
                  id="close-selection-mode-btn"
                  type="button"
                  onClick={handleExitSelectionMode}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#0e203c] transition-colors ml-1"
                  title="Esci dalla modalità selezione"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Feedback Toast Banner */}
      <AnimatePresence>
        {bulkFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-lg ${
              bulkFeedback.type === 'csv'
                ? 'bg-sky-950/90 border-sky-500/40 text-sky-200'
                : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {bulkFeedback.type === 'csv' ? (
                <FileSpreadsheet className="w-4 h-4 text-sky-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>
                {bulkFeedback.type === 'cart'
                  ? `${bulkFeedback.count} ${bulkFeedback.count === 1 ? 'prodotto aggiunto' : 'prodotti aggiunti'} al carrello con successo!`
                  : bulkFeedback.type === 'fav'
                  ? `${bulkFeedback.count} ${bulkFeedback.count === 1 ? 'prodotto salvato' : 'prodotti salvati'} nei preferiti con successo!`
                  : `File CSV generato e scaricato per ${bulkFeedback.count} ${bulkFeedback.count === 1 ? 'prodotto' : 'prodotti'}! Pronto per Excel & inventario.`}
              </span>
            </div>
            <button
              onClick={() => setBulkFeedback(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Pills Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none">
        <button
          onClick={() => {
            setActiveFilterCategory(null);
            onSelectCategory(null);
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            !activeFilterCategory
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-950/50'
              : 'bg-[#09152b] text-slate-400 hover:text-white border border-[#132746]'
          }`}
        >
          Tutte le Categorie ({products.length})
        </button>

        {categories.map((cat) => {
          const isSelected = activeFilterCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                const next = isSelected ? null : cat.id;
                setActiveFilterCategory(next);
                onSelectCategory(next);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#0284c7] text-white shadow-md shadow-sky-950/50'
                  : 'bg-[#09152b] text-slate-400 hover:text-white border border-[#132746]'
              }`}
            >
              {cat.name} ({cat.countNumber})
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#081326] border border-[#142646] rounded-2xl p-12 text-center">
          <p className="text-sm font-semibold text-white">Nessun prodotto trovato</p>
          <p className="text-xs text-slate-400 mt-1">Prova a cambiare i filtri di ricerca o la categoria selezionata.</p>
          <button
            onClick={() => {
              setActiveFilterCategory(null);
              onSelectCategory(null);
            }}
            className="mt-4 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            Azzera Filtri
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {filteredProducts.map((product) => {
            const isFav = favorites.includes(product.id);
            const isCompared = comparedProductIds.includes(product.id);
            const isLowStock = product.stock <= (product.lowStockThreshold ?? 100);
            const isSelected = selectedProductIds.includes(product.id);

            return (
              <div
                key={product.id}
                id={`catalog-product-card-${product.id}`}
                onClick={(e) => {
                  if (isSelectionMode) {
                    toggleSelectProduct(product.id, e);
                  } else {
                    onSelectProduct(product);
                  }
                }}
                className={`group relative cursor-pointer bg-[#081326] hover:bg-[#0c1c36] border rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 hover:translate-y-[-2px] ${
                  isSelected
                    ? 'border-sky-400 bg-[#071836] ring-2 ring-sky-500/40 shadow-md shadow-sky-950/50'
                    : isCompared 
                    ? 'border-amber-500/50 ring-1 ring-amber-500/30' 
                    : 'border-[#142646] hover:border-[#1e3966]'
                }`}
              >
                {/* Top Badge & Multi-Select Checkbox Bar */}
                <div className="flex items-center justify-between w-full mb-1 gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Multi-Select Checkbox (always visible in selection mode, or hover/always available) */}
                    {isSelectionMode ? (
                      <button
                        type="button"
                        id={`catalog-select-checkbox-${product.id}`}
                        onClick={(e) => toggleSelectProduct(product.id, e)}
                        className={`p-1 rounded-lg border transition-all flex items-center justify-center ${
                          isSelected
                            ? 'bg-sky-500 border-sky-400 text-white shadow-xs'
                            : 'bg-[#060e1d] border-slate-600 hover:border-sky-400 text-transparent'
                        }`}
                        title={isSelected ? 'Deseleziona' : 'Seleziona'}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>
                    ) : null}

                    {product.discountPercent ? (
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                        -{product.discountPercent}%
                      </span>
                    ) : null}

                    {isLowStock && (
                      <button
                        type="button"
                        id={`catalog-low-stock-badge-${product.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRestockAnalysis?.(product.id);
                        }}
                        className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/35 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                        title={`Scorte basse (${product.stock} colli). Clicca per analisi riordino Gemini AI`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        <span>Scorte basse</span>
                        <Sparkles className="w-2.5 h-2.5 text-rose-300 ml-0.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {onOpenRestockAnalysis && (
                      <button
                        id={`catalog-ai-restock-btn-${product.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRestockAnalysis(product.id);
                        }}
                        className="p-1.5 rounded-full backdrop-blur-xs transition-colors shrink-0 text-slate-400 hover:text-sky-300 bg-[#0a1528]/80 hover:bg-[#112344]"
                        title="Analisi Riordino AI per questo prodotto"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onToggleCompare && (
                      <button
                        id={`catalog-compare-btn-${product.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCompare(product.id);
                        }}
                        className={`p-1.5 rounded-full backdrop-blur-xs transition-colors shrink-0 ${
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
                      id={`catalog-fav-btn-${product.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(product.id);
                      }}
                      className={`p-1.5 rounded-full backdrop-blur-xs transition-colors shrink-0 ${
                        isFav
                          ? 'text-rose-400 bg-rose-500/10'
                          : 'text-slate-400 hover:text-white bg-[#0a1528]/80 hover:bg-[#112344]'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400 text-rose-400' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-b from-[#060e1d] to-[#0a1529] flex items-center justify-center p-2 my-1">
                  <img
                    src={product.image}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain transition-all duration-500 ease-out will-change-transform group-hover:scale-110 group-hover:brightness-105"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-sky-600/15 backdrop-blur-[0.5px] flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-2 text-left">
                  <h3 className="text-white text-xs font-bold truncate leading-tight group-hover:text-sky-300">
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
                      <span className="text-white text-xs font-bold">€{product.price.toFixed(2)}</span>
                      <span className="text-slate-400 text-[10px] ml-1">+IVA</span>
                    </div>
                    <button
                      id={`catalog-add-cart-btn-${product.id}`}
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

      {/* Floating Bottom Sticky Action Dock when multiple items are selected */}
      <AnimatePresence>
        {selectedProductIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl bg-[#061124]/95 backdrop-blur-md border border-sky-500/50 rounded-2xl p-3 sm:p-3.5 px-4 shadow-2xl shadow-sky-950/70 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold text-xs">
                {selectedProductIds.length}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{selectedProductIds.length} {selectedProductIds.length === 1 ? 'prodotto selezionato' : 'prodotti selezionati'}</span>
                </div>
                <div className="text-[11px] text-sky-300 font-mono">
                  Totale: <strong>€ {totalSelectedPrice.toFixed(2)}</strong> <span className="text-slate-400 font-normal">+IVA</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                id="floating-bulk-csv-btn"
                type="button"
                disabled={selectedProductIds.length === 0 || isExportingCsv}
                onClick={handleExportSelectedToCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#091b33] hover:bg-[#0f2d52] disabled:opacity-40 text-sky-200 border border-sky-400/40 transition-colors"
                title="Scarica file CSV per inventario e giacenze offline"
              >
                {isExportingCsv ? (
                  <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span className="hidden sm:inline">Esporta CSV</span>
              </button>

              <button
                id="floating-bulk-fav-btn"
                type="button"
                onClick={handleBulkAddSelectedToFavorites}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0d1c36] hover:bg-[#132a52] text-rose-300 border border-rose-500/30 transition-colors"
                title="Aggiungi tutti i prodotti selezionati ai preferiti"
              >
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                <span className="hidden sm:inline">Ai Preferiti</span>
              </button>

              <button
                id="floating-bulk-cart-btn"
                type="button"
                onClick={handleBulkAddSelectedToCart}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-md shadow-sky-900/50 transition-colors"
                title="Aggiungi tutti i prodotti selezionati al carrello"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Aggiungi al Carrello</span>
              </button>

              <button
                id="floating-clear-selection-btn"
                type="button"
                onClick={handleClearSelection}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#0e203c] transition-colors"
                title="Deseleziona tutti"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
