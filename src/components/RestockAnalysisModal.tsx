import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  X, 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  RotateCcw, 
  Check, 
  Info, 
  Clock, 
  Plus, 
  Minus, 
  ChevronRight, 
  RefreshCw, 
  ArrowRight,
  ShieldAlert,
  Calendar,
  Layers,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, Product, RestockAnalysisResult, RestockRecommendation } from '../types';
import { fetchRestockAnalysis } from '../services/restockService';

interface RestockAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  products: Product[];
  focusProductId?: string | null;
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenCart?: () => void;
}

export const RestockAnalysisModal: React.FC<RestockAnalysisModalProps> = ({
  isOpen,
  onClose,
  orders,
  products,
  focusProductId = null,
  onAddToCart,
  onOpenCart,
}) => {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RestockAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'critical' | 'medium' | 'optimal'>('all');
  
  // Custom adjusted quantities for each product
  const [adjustedQuantities, setAdjustedQuantities] = useState<Record<string, number>>({});
  const [addedProductIds, setAddedProductIds] = useState<Record<string, boolean>>({});
  const [batchAddedSuccess, setBatchAddedSuccess] = useState(false);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRestockAnalysis(orders, products, focusProductId || undefined);
      setAnalysisResult(result);
      
      // Initialize default suggested quantities
      const initialQtyMap: Record<string, number> = {};
      result.recommendations.forEach((rec) => {
        initialQtyMap[rec.productId] = rec.suggestedReorderQty || 1;
      });
      setAdjustedQuantities(initialQtyMap);
    } catch (err: any) {
      console.error(err);
      setError('Impossibile completare l\'analisi automatica delle scorte. Riprova tra poco.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAnalysis();
    } else {
      setAddedProductIds({});
      setBatchAddedSuccess(false);
    }
  }, [isOpen, focusProductId]);

  const handleQtyChange = (productId: string, delta: number) => {
    setAdjustedQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleAddSingleItem = (rec: RestockRecommendation) => {
    const product = products.find((p) => p.id === rec.productId);
    if (!product) return;
    
    const qty = adjustedQuantities[rec.productId] || rec.suggestedReorderQty || 1;
    onAddToCart(product, qty);

    setAddedProductIds((prev) => ({ ...prev, [rec.productId]: true }));
    setTimeout(() => {
      setAddedProductIds((prev) => ({ ...prev, [rec.productId]: false }));
    }, 2500);
  };

  const handleAddAllRecommendations = () => {
    if (!analysisResult) return;
    
    const urgentRecs = analysisResult.recommendations.filter(
      (r) => r.suggestedReorderQty > 0 && (r.urgency === 'CRITICA' || r.urgency === 'ALTA' || r.urgency === 'MEDIA')
    );

    urgentRecs.forEach((rec) => {
      const product = products.find((p) => p.id === rec.productId);
      if (product) {
        const qty = adjustedQuantities[rec.productId] || rec.suggestedReorderQty || 1;
        onAddToCart(product, qty);
      }
    });

    setBatchAddedSuccess(true);
    setTimeout(() => {
      setBatchAddedSuccess(false);
    }, 3500);
  };

  const filteredRecommendations = useMemo(() => {
    if (!analysisResult) return [];
    return analysisResult.recommendations.filter((rec) => {
      if (urgencyFilter === 'critical') return rec.urgency === 'CRITICA' || rec.urgency === 'ALTA';
      if (urgencyFilter === 'medium') return rec.urgency === 'MEDIA';
      if (urgencyFilter === 'optimal') return rec.urgency === 'OTTIMALE';
      return true;
    });
  }, [analysisResult, urgencyFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-xs"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#071120] border border-[#1a355c] rounded-3xl shadow-2xl z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#142848] bg-gradient-to-r from-[#071120] via-[#0c1e3d] to-[#071120] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 text-sky-300 border border-sky-500/30 shadow-inner">
              <Sparkles className="w-6 h-6 text-sky-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Analisi Riordino & Previsione Scorte AI
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>Gemini 3.7 Flash</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Stima predittiva del fabbisogno di magazzino basata sui volumi storici d'acquisto e rotazione scorte.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="refresh-restock-btn"
              onClick={loadAnalysis}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-sky-300 hover:bg-[#0e203c] border border-[#183154] transition-colors disabled:opacity-50"
              title="Ricalcola analisi con Gemini"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              id="close-restock-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#0e203c] border border-[#183154] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(92vh-140px)] space-y-5">
          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-3 border-sky-500/20 border-t-sky-400 animate-spin flex items-center justify-center" />
                <Sparkles className="w-6 h-6 text-sky-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="max-w-md">
                <h4 className="text-base font-bold text-white">
                  Gemini sta analizzando lo storico acquisti e i livelli di magazzino...
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Correlazione run-rate delle ultime settimane, stima giorni di copertura ed elaborazione quantità ottimali di riordino B2B.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
              <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-rose-200">{error}</p>
              <button
                onClick={loadAnalysis}
                className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Riprova analisi
              </button>
            </div>
          ) : analysisResult ? (
            <>
              {/* Executive Summary Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1e3a] via-[#09172f] to-[#061021] border border-[#1c3863] p-4 sm:p-5 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Sintesi Esecutiva AI</span>
                      </span>
                      {analysisResult.criticalItemsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-rose-400" />
                          <span>{analysisResult.criticalItemsCount} articoli ad alta priorità</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                      {analysisResult.summary}
                    </p>
                    {analysisResult.fallbackNotice && (
                      <p className="text-[11px] text-slate-400 italic">
                        {analysisResult.fallbackNotice}
                      </p>
                    )}
                  </div>

                  {/* Batch Actions & Cost Card */}
                  <div className="bg-[#050c18] border border-[#142848] rounded-xl p-3.5 flex flex-row md:flex-col justify-between items-center md:items-end gap-3 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10.5px] text-slate-400 block">Stima Imponibile Riassortimento</span>
                      <span className="text-base sm:text-lg font-bold text-white font-mono">
                        €{analysisResult.totalEstimatedCost.toFixed(2)}
                      </span>
                    </div>

                    <button
                      id="add-all-restock-btn"
                      onClick={handleAddAllRecommendations}
                      className={`w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                        batchAddedSuccess
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                          : 'bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] text-white shadow-sky-500/20'
                      }`}
                    >
                      {batchAddedSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Aggiunti al Carrello!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Riordina Consigliati</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Urgency Filter Tabs */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setUrgencyFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      urgencyFilter === 'all'
                        ? 'bg-[#0284c7] text-white shadow-xs'
                        : 'bg-[#081326] text-slate-400 hover:text-white border border-[#142646]'
                    }`}
                  >
                    Tutti ({analysisResult.recommendations.length})
                  </button>
                  <button
                    onClick={() => setUrgencyFilter('critical')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      urgencyFilter === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-[#081326] text-slate-400 hover:text-white border border-[#142646]'
                    }`}
                  >
                    Urgenza Critica / Alta ({analysisResult.recommendations.filter((r) => r.urgency === 'CRITICA' || r.urgency === 'ALTA').length})
                  </button>
                  <button
                    onClick={() => setUrgencyFilter('medium')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      urgencyFilter === 'medium'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'bg-[#081326] text-slate-400 hover:text-white border border-[#142646]'
                    }`}
                  >
                    Urgenza Media ({analysisResult.recommendations.filter((r) => r.urgency === 'MEDIA').length})
                  </button>
                  <button
                    onClick={() => setUrgencyFilter('optimal')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      urgencyFilter === 'optimal'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-[#081326] text-slate-400 hover:text-white border border-[#142646]'
                    }`}
                  >
                    Scorte Ottimali ({analysisResult.recommendations.filter((r) => r.urgency === 'OTTIMALE').length})
                  </button>
                </div>

                {onOpenCart && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCart();
                    }}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Visualizza carrello</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Recommendations List */}
              <div className="space-y-3">
                {filteredRecommendations.length === 0 ? (
                  <div className="p-8 text-center bg-[#081326] border border-[#142646] rounded-2xl">
                    <p className="text-xs text-slate-400">Nessun articolo per il filtro selezionato.</p>
                  </div>
                ) : (
                  filteredRecommendations.map((rec) => {
                    const product = products.find((p) => p.id === rec.productId);
                    const isAdded = addedProductIds[rec.productId];
                    const selectedQty = adjustedQuantities[rec.productId] ?? rec.suggestedReorderQty;
                    const itemCost = ((product?.price || 0) * selectedQty);

                    // Urgency styling
                    const urgencyBadge = () => {
                      switch (rec.urgency) {
                        case 'CRITICA':
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/35">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                              <span>Urgenza Critica</span>
                            </span>
                          );
                        case 'ALTA':
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/35">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Urgenza Alta</span>
                            </span>
                          );
                        case 'MEDIA':
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/35">
                              <Clock className="w-3 h-3 text-sky-400" />
                              <span>Pianificabile</span>
                            </span>
                          );
                        case 'OTTIMALE':
                        default:
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Scorte Ottimali</span>
                            </span>
                          );
                      }
                    };

                    return (
                      <div
                        key={rec.productId}
                        id={`restock-card-${rec.productId}`}
                        className={`bg-[#081326] border rounded-2xl p-4 sm:p-5 transition-all shadow-md ${
                          rec.urgency === 'CRITICA'
                            ? 'border-rose-500/30 hover:border-rose-500/50 bg-gradient-to-r from-[#0c1424] via-[#081326] to-[#081326]'
                            : rec.urgency === 'ALTA'
                            ? 'border-amber-500/30 hover:border-amber-500/50'
                            : 'border-[#142646] hover:border-sky-500/30'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Left: Product summary & Badges */}
                          <div className="flex items-start gap-3.5 flex-1">
                            {product && (
                              <div className="w-14 h-14 rounded-xl bg-[#050c18] border border-[#142848] p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-white">
                                  {rec.productName}
                                </h4>
                                {urgencyBadge()}
                                {product?.code && (
                                  <span className="font-mono text-[10px] bg-[#0c1a32] px-1.5 py-0.5 rounded border border-[#162d50] text-slate-400">
                                    {product.code}
                                  </span>
                                )}
                              </div>

                              {/* Inventory & Velocity Metrics */}
                              <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap pt-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Giacenza magazzino:</span>
                                  <strong className={`font-mono ${rec.currentStock <= 100 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                                    {rec.currentStock} colli
                                  </strong>
                                </div>
                                <span className="text-slate-600">•</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Ordini passati:</span>
                                  <strong className="text-sky-300 font-mono">
                                    {rec.pastOrderedQty} colli
                                  </strong>
                                </div>
                                <span className="text-slate-600">•</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Autonomia stimata:</span>
                                  <strong className={`font-mono ${rec.daysUntilDepletion <= 15 ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                                    ~{rec.daysUntilDepletion} giorni
                                  </strong>
                                </div>
                              </div>

                              {/* AI Rationale explanation */}
                              <div className="mt-2 text-xs text-slate-300 bg-[#050c18] border border-[#11233e] rounded-xl p-2.5 flex items-start gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                                <p className="leading-relaxed text-[11.5px] text-slate-300">
                                  {rec.rationale}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Right: Quantity Stepper & Add Action */}
                          <div className="flex sm:flex-row lg:flex-col items-center lg:items-end justify-between gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#122340] shrink-0">
                            <div className="text-left lg:text-right">
                              <span className="text-[10px] text-slate-400 block">Q.tà riordino consigliata</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <button
                                  onClick={() => handleQtyChange(rec.productId, -1)}
                                  className="w-7 h-7 rounded-lg bg-[#0e1d38] hover:bg-[#162d52] border border-[#1a365f] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={selectedQty}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    setAdjustedQuantities((prev) => ({ ...prev, [rec.productId]: val }));
                                  }}
                                  className="w-12 h-7 bg-[#050c18] border border-[#162d50] rounded-lg text-center font-mono font-bold text-xs text-white focus:outline-none focus:border-sky-500"
                                />
                                <button
                                  onClick={() => handleQtyChange(rec.productId, 1)}
                                  className="w-7 h-7 rounded-lg bg-[#0e1d38] hover:bg-[#162d52] border border-[#1a365f] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-right hidden sm:block">
                                <span className="text-[10px] text-slate-400 block">Totale parziale</span>
                                <span className="font-mono text-xs font-bold text-white">
                                  €{itemCost.toFixed(2)}
                                </span>
                              </div>

                              <button
                                id={`add-restock-btn-${rec.productId}`}
                                onClick={() => handleAddSingleItem(rec)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                                  isAdded
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#0284c7] hover:bg-[#0369a1] text-white'
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Aggiunto!</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    <span>Ordina {selectedQty} colli</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#142848] bg-[#060e1b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            <span>Prezzi e disponibilità di magazzino calcolati in tempo reale per ordini B2B.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0d1c34] hover:bg-[#14294a] text-slate-300 hover:text-white transition-colors"
          >
            Chiudi
          </button>
        </div>
      </motion.div>
    </div>
  );
};
