import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  FileText, 
  ShoppingBag, 
  Check, 
  Package, 
  ArrowRight,
  Truck,
  Calendar,
  MapPin,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
  PackageCheck,
  Search,
  Filter,
  Building2,
  Phone,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  Info,
  Maximize2,
  Sparkles,
  TrendingUp,
  Download,
  Loader2,
  RotateCw,
  Mail,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, Product } from '../types';
import { generateOrderReceiptPdf, generateOrderHistoryPdf } from '../utils/orderPdfGenerator';
import { OrderTrackingTimeline } from './OrderTrackingTimeline';
import { OrderInquiryModal } from './OrderInquiryModal';
import { useLanguage } from '../context/LanguageContext';

interface OrdersViewProps {
  orders: Order[];
  products?: Product[];
  onBackToHome: () => void;
  onReorder: (order: Order) => void;
  onOpenCart?: () => void;
  onOpenRestockAnalysis?: (focusProductId?: string) => void;
  onOpenQuickReorder?: () => void;
  onUpdateOrderStatus?: (
    orderId: string, 
    newStatus: Order['status'], 
    details?: { courier?: string; trackingNumber?: string; estimatedDelivery?: string }
  ) => void;
  initialTrackingOrderId?: string | null;
  onClearInitialTrackingOrderId?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ 
  orders, 
  products = [],
  onBackToHome, 
  onReorder,
  onOpenCart,
  onOpenRestockAnalysis,
  onOpenQuickReorder,
  onUpdateOrderStatus,
  initialTrackingOrderId,
  onClearInitialTrackingOrderId
}) => {
  const { t, language } = useLanguage();
  const [reorderedOrderId, setReorderedOrderId] = useState<string | null>(null);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<Order | null>(null);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
  const [selectedInquiryOrder, setSelectedInquiryOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'In elaborazione' | 'Spedito' | 'Consegnato'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [isExportingHistory, setIsExportingHistory] = useState(false);
  const [historyExportSuccess, setHistoryExportSuccess] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');

  // Dynamic tracking & detail resolution ensuring live updates when order status transitions
  const currentTrackingOrder = useMemo(() => {
    if (!selectedTrackingOrder) return null;
    return orders.find((o) => o.id === selectedTrackingOrder.id) || selectedTrackingOrder;
  }, [orders, selectedTrackingOrder]);

  const currentDetailOrder = useMemo(() => {
    if (!selectedDetailOrder) return null;
    return orders.find((o) => o.id === selectedDetailOrder.id) || selectedDetailOrder;
  }, [orders, selectedDetailOrder]);

  // If redirected from toast notification or external trigger to track a specific order
  useEffect(() => {
    if (initialTrackingOrderId) {
      const match = orders.find((o) => o.id === initialTrackingOrderId);
      if (match) {
        setSelectedTrackingOrder(match);
      }
      onClearInitialTrackingOrderId?.();
    }
  }, [initialTrackingOrderId, orders, onClearInitialTrackingOrderId]);

  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === 'In elaborazione' || o.status === 'Spedito').length;
  }, [orders]);

  const handleExportHistory = (scopeOverride?: 'filtered' | 'all') => {
    const scopeToUse = scopeOverride || exportScope;
    const targetOrders = scopeToUse === 'all' ? orders : filteredOrders;

    if (targetOrders.length === 0) {
      alert(language === 'it' ? 'Nessun ordine presente da esportare.' : 'No orders available to export.');
      return;
    }

    setIsExportingHistory(true);

    try {
      let filterDescription = 'Tutto lo storico aziendale';
      if (scopeToUse === 'filtered') {
        if (statusFilter === 'active') {
          filterDescription = '⚡ Solo Ordini Attivi (In elaborazione & Spediti)';
        } else if (statusFilter === 'In elaborazione') {
          filterDescription = 'Filtro: In elaborazione';
        } else if (statusFilter === 'Spedito') {
          filterDescription = 'Filtro: In transito / Spediti';
        } else if (statusFilter === 'Consegnato') {
          filterDescription = 'Filtro: Consegnati';
        }

        if (searchFilter.trim()) {
          filterDescription += ` • Ricerca: "${searchFilter.trim()}"`;
        }
      }

      generateOrderHistoryPdf(targetOrders, {
        filterLabel: filterDescription,
        language: language === 'it' ? 'it' : 'en',
      });

      const successMsg = language === 'it'
        ? `Documento PDF esportato con successo (${targetOrders.length} ordini)!`
        : `PDF report successfully exported (${targetOrders.length} orders)!`;

      setHistoryExportSuccess(successMsg);
      setShowExportModal(false);

      setTimeout(() => {
        setHistoryExportSuccess(null);
      }, 4000);
    } catch (err) {
      console.error('Error generating Order History PDF:', err);
      alert(language === 'it' ? 'Errore durante la creazione del PDF di riepilogo.' : 'Error generating PDF statement.');
    } finally {
      setIsExportingHistory(false);
    }
  };

  const handleDownloadPdf = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingPdfId(order.id);
    try {
      generateOrderReceiptPdf(order);
      setDownloadSuccessId(order.id);
      setTimeout(() => {
        setDownloadSuccessId((current) => (current === order.id ? null : current));
      }, 2500);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleReorderClick = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onReorder(order);
    setReorderedOrderId(order.id);
    setTimeout(() => {
      setReorderedOrderId((current) => (current === order.id ? null : current));
    }, 2400);
  };

  const filteredOrders = useMemo(() => {
    const term = searchFilter.trim().toLowerCase();
    const cleanTerm = term.startsWith('#') ? term.substring(1) : term;

    return orders.filter((order) => {
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = order.status === 'In elaborazione' || order.status === 'Spedito';
      } else if (statusFilter !== 'all') {
        matchesStatus = order.status === statusFilter;
      }

      if (!matchesStatus) return false;
      if (!term) return true;

      const orderIdLower = order.id.toLowerCase();
      const cleanOrderId = orderIdLower.startsWith('#') ? orderIdLower.substring(1) : orderIdLower;
      
      const matchesId = 
        orderIdLower.includes(term) || 
        cleanOrderId.includes(cleanTerm);

      const matchesProduct = order.items.some((item) => {
        const nameMatch = item.productName.toLowerCase().includes(term);
        const idMatch = item.productId ? item.productId.toLowerCase().includes(term) : false;
        return nameMatch || idMatch;
      });

      const matchesCourier = order.courier ? order.courier.toLowerCase().includes(term) : false;
      const matchesTracking = order.trackingNumber ? order.trackingNumber.toLowerCase().includes(term) : false;
      const matchesCity = order.shippingAddress?.city ? order.shippingAddress.city.toLowerCase().includes(term) : false;

      return matchesId || matchesProduct || matchesCourier || matchesTracking || matchesCity;
    });
  }, [orders, statusFilter, searchFilter]);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'In elaborazione':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <Clock className="w-3 h-3" />
            <span>{t('orders.filterProcessing', 'In elaborazione')}</span>
          </span>
        );
      case 'Spedito':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            <Truck className="w-3 h-3" />
            <span>{language === 'it' ? 'In transito / Spedito' : 'In Transit / Shipped'}</span>
          </span>
        );
      case 'Consegnato':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
            <CheckCircle2 className="w-3 h-3" />
            <span>{t('orders.filterDelivered', 'Consegnato')}</span>
          </span>
        );
      case 'Annullato':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-xs">
            <AlertCircle className="w-3 h-3" />
            <span>{language === 'it' ? 'Annullato' : 'Cancelled'}</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/20">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Storico Ordini & Tracciamento B2B
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Clicca su qualsiasi ordine per visualizzare il dettaglio articoli, riepilogo costi e indirizzo di spedizione.
            </p>
          </div>
        </div>

        {/* Global info pill */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* History PDF Export Button */}
          <button
            id="orders-export-history-pdf-btn"
            onClick={() => setShowExportModal(true)}
            disabled={isExportingHistory}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0c203f] to-[#0f2850] hover:from-[#112a52] hover:to-[#143466] text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold shadow-md shadow-sky-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title={language === 'it' ? 'Esporta registro storico forniture e estratto conto in PDF' : 'Export supply history and statement in PDF'}
          >
            {isExportingHistory ? (
              <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>{t('orders.exportHistoryPdf', 'Esporta Storico PDF')}</span>
          </button>

          {onOpenQuickReorder && (
            <button
              id="orders-quick-reorder-btn"
              onClick={onOpenQuickReorder}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-md shadow-sky-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Avvia riordino rapido istantaneo senza checkout e senza carte"
            >
              <RotateCw className="w-3.5 h-3.5 text-white" />
              <span>Nuovo Riordino Rapido</span>
            </button>
          )}

          {onOpenRestockAnalysis && (
            <button
              id="orders-restock-analysis-btn"
              onClick={() => onOpenRestockAnalysis()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-950/40 transition-all hover:scale-[1.02]"
              title="Analisi previsionale del riordino merci con Gemini AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-200 animate-pulse" />
              <span>Analisi Riordino AI</span>
            </button>
          )}

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#081326] border border-[#142646] text-xs text-slate-300 shadow-sm">
            <Package className="w-4 h-4 text-sky-400" />
            <span>
              <strong>{orders.length}</strong> ordini registrati
            </span>
          </div>
          <button
            onClick={onBackToHome}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 px-3 py-2 rounded-xl bg-[#0a182e] border border-[#173056] hover:border-sky-500/40 transition-colors"
          >
            ← Al catalogo
          </button>
        </div>
      </div>

      {/* AI Restock Callout Banner */}
      {onOpenRestockAnalysis && (
        <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b1b36] via-[#09152b] to-[#0d2244] border border-[#1b3a66] p-4 sm:p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white">
                    Previsione Fabbisogno & Riassortimento Automatico
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Gemini AI Powered
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  L'algoritmo analizza i ritmi di consumo dai tuoi ordini storici e li incrocia con i livelli di giacenza a magazzino, stimando giorni di autonomia e consigliando quantità di reintegro per prevenire rotture di stock.
                </p>
              </div>
            </div>

            <button
              id="orders-banner-restock-btn"
              onClick={() => onOpenRestockAnalysis()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] text-white text-xs font-bold shadow-md shadow-sky-900/30 transition-all shrink-0 w-full sm:w-auto justify-center"
            >
              <Sparkles className="w-4 h-4" />
              <span>Avvia Analisi Riordino</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#081326] border border-[#142646] rounded-2xl p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            id="filter-orders-all"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#0284c7] text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#0d1e38]'
            }`}
          >
            {t('orders.filterAll', 'Tutti')} ({orders.length})
          </button>
          
          {/* Active Orders Tab */}
          <button
            id="filter-orders-active"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'active'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-400/50'
                : 'text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>{t('orders.filterActive', '⚡ Ordini Attivi')}</span>
            <span className="text-[10px] font-bold bg-sky-950/80 text-sky-200 px-1.5 py-0.2 rounded-full border border-sky-400/30">
              {activeOrdersCount}
            </span>
          </button>

          <button
            id="filter-orders-processing"
            onClick={() => setStatusFilter('In elaborazione')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'In elaborazione'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-[#0d1e38]'
            }`}
          >
            {t('orders.filterProcessing', 'In elaborazione')} ({orders.filter((o) => o.status === 'In elaborazione').length})
          </button>
          <button
            id="filter-orders-shipped"
            onClick={() => setStatusFilter('Spedito')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'Spedito'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-white hover:bg-[#0d1e38]'
            }`}
          >
            {t('orders.filterShipped', 'Spediti')} ({orders.filter((o) => o.status === 'Spedito').length})
          </button>
          <button
            id="filter-orders-delivered"
            onClick={() => setStatusFilter('Consegnato')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'Consegnato'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-[#0d1e38]'
            }`}
          >
            {t('orders.filterDelivered', 'Consegnati')} ({orders.filter((o) => o.status === 'Consegnato').length})
          </button>
        </div>

        {/* Search Bar & Quick Export */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="orders-search-input"
              type="text"
              placeholder={language === 'it' ? 'Cerca per ID ordine, colli o destinatario...' : 'Search by order ID, items or recipient...'}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#050c1a] border border-[#152a4e] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
            {searchFilter && (
              <button
                id="clear-orders-search-btn"
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Cancella ricerca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filtered Export Button */}
          <button
            id="orders-quick-export-filtered-btn"
            onClick={() => handleExportHistory('filtered')}
            disabled={isExportingHistory || filteredOrders.length === 0}
            className="shrink-0 p-2 sm:px-3 sm:py-2 rounded-xl bg-[#0c1c38] hover:bg-[#12284e] disabled:opacity-50 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs hover:border-sky-400/60"
            title={language === 'it' ? `Scarica PDF degli ordini attualmente visibili (${filteredOrders.length})` : `Download PDF of currently visible orders (${filteredOrders.length})`}
          >
            {isExportingHistory ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className="hidden sm:inline">PDF ({filteredOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Success Notification for PDF Export */}
      <AnimatePresence>
        {historyExportSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/20"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="font-medium">{historyExportSuccess}</span>
            </div>
            <button
              onClick={() => setHistoryExportSuccess(null)}
              className="text-emerald-400/80 hover:text-emerald-300 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Search / Filter Status Summary */}
      {searchFilter.trim() && (
        <div className="mb-4 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-sky-950/30 border border-sky-500/20 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Risultati per <strong className="text-white">"{searchFilter.trim()}"</strong>: trovati <strong className="text-sky-300">{filteredOrders.length}</strong> ordini su {orders.length}
            </span>
          </div>
          <button
            onClick={() => setSearchFilter('')}
            className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 hover:underline"
          >
            Azzera ricerca
          </button>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[#081326] border border-[#142646] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#0e1d38] flex items-center justify-center text-slate-500 mb-3">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Nessun ordine trovato</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Nessun ordine corrisponde ai criteri di ricerca o ai filtri selezionati.
          </p>
          <button
            onClick={() => {
              setStatusFilter('all');
              setSearchFilter('');
            }}
            className="text-xs text-sky-400 hover:underline font-semibold"
          >
            Reimposta tutti i filtri
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isJustReordered = reorderedOrderId === order.id;
            const isActiveOrder = order.status === 'In elaborazione' || order.status === 'Spedito';

            return (
              <div
                key={order.id}
                id={`order-row-${order.id}`}
                onClick={() => setSelectedDetailOrder(order)}
                className={`group relative cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-md hover:shadow-xl ${
                  isActiveOrder 
                    ? 'bg-[#08152c] hover:bg-[#0b1c3b] border-2 border-sky-500/40 hover:border-sky-400/70 shadow-sky-950/40 ring-1 ring-sky-500/20' 
                    : 'bg-[#081326] hover:bg-[#0b1b36] border border-[#142646] hover:border-sky-500/40 hover:shadow-sky-950/30'
                }`}
              >
                {/* Active Order Notice Banner */}
                {isActiveOrder && (
                  <div className="mb-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/20 via-sky-500/10 to-transparent border border-sky-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                      <span className="text-xs font-bold text-sky-200 uppercase tracking-wide">
                        {language === 'it' ? '⚡ Fornitura Attiva in Gestione Operativa' : '⚡ Active Supply in Fulfillment'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-sky-300">
                      {order.status === 'Spedito' 
                        ? (language === 'it' ? 'Fase 3/4: Spedito & in Viaggio' : 'Step 3/4: Shipped & in Transit') 
                        : (language === 'it' ? 'Fase 2/4: Processing & Allestimento' : 'Step 2/4: Processing & Picking')}
                    </span>
                  </div>
                )}

                {/* Header Row: ID, Status Badge, Price & Reorder */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#122340]">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wide group-hover:text-sky-300 transition-colors flex items-center gap-1.5">
                        <span>{order.id}</span>
                        <Maximize2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {language === 'it' ? 'Data emissione ordine:' : 'Order issue date:'} <strong className="text-slate-300">{order.date}</strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-400 block">{language === 'it' ? 'Totale Imponibile + IVA' : 'Total Taxable + VAT'}</span>
                      <span className="text-base sm:text-lg font-bold text-white font-mono">
                        €{order.total.toFixed(2)}
                      </span>
                    </div>

                    {/* Reorder Button */}
                    <motion.button
                      id={`reorder-button-${order.id}`}
                      whileTap={{ scale: 0.96 }}
                      onClick={(e) => handleReorderClick(order, e)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                        isJustReordered
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                          : 'bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] text-white shadow-sky-500/20'
                      }`}
                      title="Aggiunge tutti i colli di questo ordine direttamente al carrello"
                    >
                      {isJustReordered ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{language === 'it' ? 'Riordinato!' : 'Reordered!'}</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t('orders.reorderBtn', 'Riordina')}</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Status Indicator Bar & Delivery Estimation Info Card */}
                <div className="py-4 border-b border-[#122340]">
                  {/* Estimated Delivery Box */}
                  <div className="mb-4 bg-[#050c1a] border border-[#11233e] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                        {order.status === 'Consegnato' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Calendar className="w-4 h-4 text-sky-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 block">
                          {order.status === 'Consegnato' 
                            ? (language === 'it' ? 'Consegna effettuata' : 'Delivered on') 
                            : (language === 'it' ? 'Data di consegna stimata' : 'Estimated delivery date')}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {order.estimatedDelivery}
                        </span>
                      </div>
                    </div>

                    {/* Courier and tracking link pill */}
                    {order.courier && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="bg-[#0b182e] border border-[#162d50] px-2.5 py-1.5 rounded-lg text-slate-300">
                          <span className="text-slate-400">{language === 'it' ? 'Corriere:' : 'Courier:'} </span>
                          <span className="text-sky-300 font-semibold">{order.courier}</span>
                        </div>
                        {order.trackingNumber && (
                          <button
                            id={`tracking-btn-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrackingOrder(order);
                            }}
                            className="bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 px-2.5 py-1.5 rounded-lg font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <Truck className="w-3 h-3" />
                            <span>{language === 'it' ? 'Traccia' : 'Track'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Order Tracking Timeline Progress-Stepper */}
                  <OrderTrackingTimeline 
                    order={order} 
                    variant="card"
                    showDetailsToggle={true}
                    onOpenCarrierTracking={() => setSelectedTrackingOrder(order)}
                    onAdvanceToShipped={
                      order.status === 'In elaborazione' && onUpdateOrderStatus
                        ? () => onUpdateOrderStatus(order.id, 'Spedito')
                        : undefined
                    }
                    className="mt-2"
                  />
                </div>

                {/* Items summary */}
                <div className="pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-400">
                      {language === 'it' ? `Articoli ordinati (${order.itemsCount} colli totali):` : `Ordered items (${order.itemsCount} total units):`}
                    </p>
                    {isJustReordered && onOpenCart && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCart();
                        }}
                        className="text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1 animate-pulse"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>{language === 'it' ? 'Vai al carrello' : 'View cart'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {order.items.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between text-xs text-slate-300 bg-[#09152b] border border-[#102342] px-3 py-2 rounded-xl"
                      >
                        <span className="truncate pr-2 font-medium">{item.productName}</span>
                        <span className="text-sky-300/90 font-mono font-semibold shrink-0">
                          {item.qty} {language === 'it' ? 'colli' : 'units'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-3.5 pt-3 border-t border-[#122340] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {order.status === 'In elaborazione' && onUpdateOrderStatus && (
                      <button
                        id={`simulate-ship-row-${order.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateOrderStatus(order.id, 'Spedito', {
                            courier: order.courier || 'BRT Corriere Espresso B2B',
                            trackingNumber: order.trackingNumber || `BRT-${Math.floor(1000000 + Math.random() * 9000000)}-B2B`
                          });
                        }}
                        className="font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-400/40 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/35 hover:to-indigo-500/35 text-sky-200 hover:text-white transition-all shadow-xs"
                        title="Simula passaggio a Spedito ed emetti notifica toast in tempo reale"
                      >
                        <Truck className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                        <span>{language === 'it' ? 'Simula Spedizione (In elaborazione ➔ Spedito)' : 'Advance to Shipped'}</span>
                      </button>
                    )}

                    <button 
                      id={`download-pdf-row-${order.id}`}
                      type="button"
                      disabled={downloadingPdfId === order.id}
                      className={`font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                        downloadSuccessId === order.id
                          ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                          : 'text-slate-400 hover:text-sky-300 bg-[#09152b] hover:bg-[#0c1e3d] border-[#142848] hover:border-sky-500/40'
                      }`}
                      onClick={(e) => handleDownloadPdf(order, e)}
                      title="Scarica ricevuta d'ordine o fattura proforma in PDF"
                    >
                      {downloadingPdfId === order.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                          <span className="text-sky-300">Generazione PDF...</span>
                        </>
                      ) : downloadSuccessId === order.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">PDF Scaricato!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-sky-400" />
                          <span>Scarica Fattura PDF</span>
                        </>
                      )}
                    </button>

                    <button
                      id={`inquiry-btn-row-${order.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInquiryOrder(order);
                      }}
                      className="font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-500/25 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 transition-colors"
                      title="Genera bozza email di richiesta aggiornamento per il reparto logistico di Aurora"
                    >
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      <span>Richiedi Aggiornamento</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sky-400 group-hover:text-sky-300 font-semibold inline-flex items-center gap-1 text-xs">
                      <span>Vedi dettagli completi</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      <AnimatePresence>
        {currentDetailOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetailOrder(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#071120] border border-[#183154] rounded-3xl shadow-2xl z-10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-[#142848] bg-gradient-to-r from-[#071120] via-[#0b1b36] to-[#071120] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/25">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-bold text-white font-mono">
                        {currentDetailOrder.id}
                      </h3>
                      {getStatusBadge(currentDetailOrder.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Emesso il <strong className="text-slate-300">{currentDetailOrder.date}</strong> • Consegna: <strong className="text-sky-300">{currentDetailOrder.estimatedDelivery}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentDetailOrder.status === 'In elaborazione' && onUpdateOrderStatus && (
                    <button
                      id="modal-advance-ship-btn"
                      type="button"
                      onClick={() => {
                        onUpdateOrderStatus(currentDetailOrder.id, 'Spedito');
                      }}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500/30 to-indigo-500/30 hover:from-sky-500/40 hover:to-indigo-500/40 text-sky-200 hover:text-white border border-sky-400/50 transition-colors shadow-xs"
                      title="Simula il passaggio da In elaborazione a Spedito"
                    >
                      <Truck className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                      <span>Simula Spedizione</span>
                    </button>
                  )}

                  <button
                    id="modal-header-inquiry-btn"
                    type="button"
                    onClick={() => setSelectedInquiryOrder(currentDetailOrder)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0d2244] hover:bg-[#143260] text-sky-300 border border-sky-500/30 transition-colors shadow-xs"
                    title="Invia richiesta aggiornamento o chiarimenti logistici ad Aurora"
                  >
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Invia Richiesta Aggiornamento</span>
                    <span className="sm:hidden">Richiedi Info</span>
                  </button>

                  <button
                    id="modal-header-download-pdf-btn"
                    type="button"
                    disabled={downloadingPdfId === currentDetailOrder.id}
                    onClick={(e) => handleDownloadPdf(currentDetailOrder, e)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-colors shadow-xs"
                    title="Scarica ricevuta o fattura proforma in formato PDF"
                  >
                    {downloadingPdfId === currentDetailOrder.id ? (
                      <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                    ) : downloadSuccessId === currentDetailOrder.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                    )}
                    <span>
                      {downloadingPdfId === currentDetailOrder.id 
                        ? 'Esportazione...' 
                        : downloadSuccessId === currentDetailOrder.id
                        ? 'Scaricato!'
                        : 'Esporta PDF'}
                    </span>
                  </button>

                  <button
                    id="close-order-detail-modal"
                    onClick={() => setSelectedDetailOrder(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#0e203c] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-145px)]">
                
                {/* 1. Items Breakdown Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                      <Package className="w-4 h-4 text-sky-400" />
                      <span>Dettaglio Articoli Ordinati ({selectedDetailOrder.itemsCount} colli)</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">Prezzi B2B al netto di IVA</span>
                  </div>

                  <div className="bg-[#050c18] border border-[#122544] rounded-2xl overflow-hidden shadow-inner">
                    {/* Items table header */}
                    <div className="grid grid-cols-12 gap-2 px-3.5 py-2.5 bg-[#09152b] border-b border-[#142848] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <div className="col-span-6 sm:col-span-6">Prodotto & Confezionamento</div>
                      <div className="col-span-2 sm:col-span-2 text-right">Quantità</div>
                      <div className="col-span-2 sm:col-span-2 text-right">Prezzo Unit.</div>
                      <div className="col-span-2 sm:col-span-2 text-right">Totale</div>
                    </div>

                    {/* Item rows */}
                    <div className="divide-y divide-[#102340]">
                      {selectedDetailOrder.items.map((item, idx) => {
                        const itemSubtotal = item.price * item.qty;
                        return (
                          <div
                            key={idx}
                            className="grid grid-cols-12 gap-2 px-3.5 py-3 items-center text-xs hover:bg-[#0a1830]/50 transition-colors"
                          >
                            <div className="col-span-6 sm:col-span-6">
                              <p className="font-semibold text-white truncate">{item.productName}</p>
                              <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5">
                                {item.code && (
                                  <span className="font-mono bg-[#0c1a32] px-1.5 py-0.5 rounded border border-[#162d50]">
                                    {item.code}
                                  </span>
                                )}
                                <span>{item.packageQty || 'Confezione standard B2B'}</span>
                              </div>
                            </div>

                            <div className="col-span-2 sm:col-span-2 text-right font-mono font-bold text-sky-300">
                              {item.qty} colli
                            </div>

                            <div className="col-span-2 sm:col-span-2 text-right font-mono text-slate-300">
                              €{item.price.toFixed(2)}
                            </div>

                            <div className="col-span-2 sm:col-span-2 text-right font-mono font-bold text-white">
                              €{itemSubtotal.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2-Columns Grid: Shipping Address & Financial Cost Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Shipping Address Box */}
                  <div className="bg-[#050c18] border border-[#122544] rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-[#102340]">
                        <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Indirizzo di Spedizione & Fornitura
                        </h4>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10.5px]">Intestatario / Ragione Sociale:</span>
                          <span className="font-bold text-white">
                            {selectedDetailOrder.shippingAddress?.companyName || 'AURORA Retail & Facility Service S.r.l.'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10.5px]">Referente Scarico Merci:</span>
                          <span className="text-slate-200">
                            {selectedDetailOrder.shippingAddress?.recipient || 'Ufficio Logistica & Ricevimento Merci'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10.5px]">Indirizzo di Consegna:</span>
                          <span className="text-slate-200">
                            {selectedDetailOrder.shippingAddress?.street || 'Via dell\'Industria 45, Palazzina B, Ingresso Magazzino 3'}
                          </span>
                          <span className="text-slate-300 block font-medium">
                            {selectedDetailOrder.shippingAddress?.postalCode || '20145'} {selectedDetailOrder.shippingAddress?.city || 'Milano'} ({selectedDetailOrder.shippingAddress?.province || 'MI'}) - {selectedDetailOrder.shippingAddress?.country || 'Italia'}
                          </span>
                        </div>

                        {selectedDetailOrder.shippingAddress?.phone && (
                          <div className="flex items-center gap-1.5 text-slate-300 pt-1">
                            <Phone className="w-3 h-3 text-sky-400" />
                            <span>{selectedDetailOrder.shippingAddress.phone}</span>
                          </div>
                        )}

                        {selectedDetailOrder.shippingAddress?.deliveryNotes && (
                          <div className="mt-2.5 p-2 rounded-xl bg-[#09152b] border border-[#142848] text-[11px] text-amber-200/90">
                            <span className="font-semibold text-amber-300 block">Note Operative Consegna:</span>
                            {selectedDetailOrder.shippingAddress.deliveryNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedDetailOrder.shippingAddress?.vatNumber && (
                      <div className="mt-3 pt-2 border-t border-[#102340] flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>P.IVA / C.F.:</span>
                        <span className="text-slate-300 font-bold">{selectedDetailOrder.shippingAddress.vatNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown Box */}
                  <div className="bg-[#050c18] border border-[#122544] rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-[#102340]">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Riepilogo Costi & Fatturazione
                        </h4>
                      </div>

                      {/* Cost Calculations */}
                      {(() => {
                        const subtotal = selectedDetailOrder.subtotal ?? (selectedDetailOrder.total / 1.22);
                        const vatAmount = selectedDetailOrder.vatAmount ?? (selectedDetailOrder.total - subtotal);
                        const shippingCost = selectedDetailOrder.shippingCost ?? 0;

                        return (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between text-slate-300">
                              <span className="text-slate-400">Imponibile Merci:</span>
                              <span className="font-mono font-medium">€{subtotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between text-slate-300">
                              <span className="text-slate-400">Spese di Spedizione / Logistica:</span>
                              <span className="font-mono text-emerald-400 font-medium">
                                {shippingCost === 0 ? 'Gratuite (B2B Express)' : `€${shippingCost.toFixed(2)}`}
                              </span>
                            </div>

                            <div className="flex justify-between text-slate-300">
                              <span className="text-slate-400">IVA (22% ordinaria):</span>
                              <span className="font-mono font-medium">€{vatAmount.toFixed(2)}</span>
                            </div>

                            <div className="mt-3 pt-3 border-t border-[#142848] flex justify-between items-baseline">
                              <div>
                                <span className="text-xs font-bold text-white block">Totale Documento</span>
                                <span className="text-[10px] text-slate-400">Imponibile + IVA inclusa</span>
                              </div>
                              <span className="text-xl font-bold font-mono text-white text-right">
                                €{selectedDetailOrder.total.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Payment method terms */}
                    <div className="mt-4 pt-2.5 border-t border-[#102340]">
                      <div className="p-2 rounded-xl bg-[#09152b] border border-[#142848] flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">Pagamento concordato:</span>
                        <span className="font-semibold text-sky-300 text-[11px] text-right">
                          {selectedDetailOrder.paymentMethod || 'Bonifico Bancario B2B 30/60 gg'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Logistics & Order Tracking Timeline in Modal */}
                <div className="space-y-3">
                  <OrderTrackingTimeline 
                    order={currentDetailOrder} 
                    variant="modal"
                    showDetailsToggle={true}
                    onOpenCarrierTracking={() => {
                      const order = currentDetailOrder;
                      setSelectedDetailOrder(null);
                      setSelectedTrackingOrder(order);
                    }}
                    onAdvanceToShipped={
                      currentDetailOrder.status === 'In elaborazione' && onUpdateOrderStatus
                        ? () => onUpdateOrderStatus(currentDetailOrder.id, 'Spedito')
                        : undefined
                    }
                  />
                </div>

                {/* 4. Dedicated Logistics Request Assistant Callout Card */}
                <div className="bg-gradient-to-r from-[#06142a] via-[#091e40] to-[#06142a] border border-[#16315c] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Assistenza Logistica & Gestione Spedizione</span>
                        <span className="text-[10px] font-semibold text-sky-300 bg-sky-500/20 px-1.5 py-0.5 rounded border border-sky-400/25">
                          AURORA Logistica
                        </span>
                      </h5>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Necessiti di un sollecito urgente, variazioni orari di scarico merci o verifica tracking?
                      </p>
                    </div>
                  </div>
                  <button
                    id="modal-body-inquiry-btn"
                    type="button"
                    onClick={() => setSelectedInquiryOrder(currentDetailOrder)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-md shadow-sky-950/50 transition-colors shrink-0"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Invia Richiesta Aggiornamento</span>
                  </button>
                </div>

              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-[#142848] bg-[#060e1b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="modal-footer-download-pdf-btn"
                    type="button"
                    disabled={downloadingPdfId === currentDetailOrder.id}
                    onClick={(e) => handleDownloadPdf(currentDetailOrder, e)}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      downloadSuccessId === currentDetailOrder.id
                        ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40 shadow-emerald-900/20'
                        : 'text-white bg-[#0e2242] hover:bg-[#15325e] border-[#1d3f72] shadow-sm'
                    }`}
                    title="Genera ed esporta la ricevuta/fattura B2B in formato PDF stampabile"
                  >
                    {downloadingPdfId === currentDetailOrder.id ? (
                      <>
                        <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                        <span>Generazione Documento PDF...</span>
                      </>
                    ) : downloadSuccessId === currentDetailOrder.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                        <span>Documento PDF Scaricato!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-sky-400" />
                        <span>Scarica Fattura PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    id="modal-footer-inquiry-btn"
                    type="button"
                    onClick={() => setSelectedInquiryOrder(currentDetailOrder)}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#0a1e3d] hover:bg-[#0f2c58] text-sky-200 border border-sky-500/30 transition-colors shadow-xs"
                    title="Invia richiesta di aggiornamento via email precompilata al reparto logistica"
                  >
                    <Mail className="w-4 h-4 text-sky-400" />
                    <span>Invia Richiesta Aggiornamento</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => setSelectedDetailOrder(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0d1c34] hover:bg-[#14294a] text-slate-300 hover:text-white transition-colors"
                  >
                    Chiudi
                  </button>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      handleReorderClick(currentDetailOrder);
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md ${
                      reorderedOrderId === currentDetailOrder.id
                        ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                        : 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sky-500/20'
                    }`}
                  >
                    {reorderedOrderId === currentDetailOrder.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Riordinato nel Carrello!</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Riordina Articoli</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tracking Details Modal */}
      <AnimatePresence>
        {currentTrackingOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTrackingOrder(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-[#071120] border border-[#183154] rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#142848] mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Dettaglio Spedizione B2B</h3>
                    <p className="text-xs text-slate-400 font-mono">Ordine {currentTrackingOrder.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTrackingOrder(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0e203c]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Summary */}
              <div className="bg-[#050c18] border border-[#122544] rounded-2xl p-4 mb-5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Stato spedizione:</span>
                  <div>{getStatusBadge(currentTrackingOrder.status)}</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Consegna prevista:</span>
                  <span className="text-white font-bold">{currentTrackingOrder.estimatedDelivery}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vettore logistico:</span>
                  <span className="text-sky-300 font-medium">{currentTrackingOrder.courier || 'GLS B2B'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Numero di tracciamento (AWB):</span>
                  <span className="text-white font-mono font-bold bg-[#0d1d36] px-2 py-0.5 rounded border border-[#1a365f]">
                    {currentTrackingOrder.trackingNumber || 'GLS-IT-992019'}
                  </span>
                </div>
              </div>

              {/* Order Tracking Progress-Stepper & Timeline */}
              <div className="mb-6">
                <OrderTrackingTimeline
                  order={currentTrackingOrder}
                  variant="modal"
                  showDetailsToggle={true}
                  onAdvanceToShipped={
                    currentTrackingOrder.status === 'In elaborazione' && onUpdateOrderStatus
                      ? () => onUpdateOrderStatus(currentTrackingOrder.id, 'Spedito')
                      : undefined
                  }
                />
              </div>

              {/* Close / Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 border-t border-[#142848]">
                <button
                  id="tracking-modal-inquiry-btn"
                  type="button"
                  onClick={() => {
                    const order = currentTrackingOrder;
                    setSelectedTrackingOrder(null);
                    setSelectedInquiryOrder(order);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#0c1c38] hover:bg-[#122a52] text-sky-300 border border-sky-500/25 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Richiedi Info Logistica</span>
                </button>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setSelectedTrackingOrder(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0e203c] hover:bg-[#142d54] text-slate-300 transition-colors"
                  >
                    Chiudi
                  </button>
                  <button
                    onClick={() => {
                      alert(`Apertura tracking esterno ${currentTrackingOrder.trackingNumber} su portale corriere...`);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0284c7] hover:bg-[#0369a1] text-white transition-colors"
                  >
                    <span>Portale Corriere</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Inquiry / Logistics Email Draft Modal */}
      <AnimatePresence>
        {selectedInquiryOrder && (
          <OrderInquiryModal
            order={selectedInquiryOrder}
            isOpen={Boolean(selectedInquiryOrder)}
            onClose={() => setSelectedInquiryOrder(null)}
          />
        )}
      </AnimatePresence>

      {/* Order History PDF Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isExportingHistory && setShowExportModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#071120] border border-[#183154] rounded-3xl p-5 sm:p-6 shadow-2xl z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#142848] mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/25">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {language === 'it' ? 'Esporta Storico Forniture PDF' : 'Export Orders History PDF'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {language === 'it' ? 'Genera un estratto conto aziendale formattato in formato A4' : 'Generate an official formatted A4 corporate statement'}
                    </p>
                  </div>
                </div>
                <button
                  disabled={isExportingHistory}
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0e203c] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scope Selection */}
              <div className="space-y-3 mb-5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  {language === 'it' ? 'Seleziona Ambito di Esportazione:' : 'Select Export Scope:'}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Filtered */}
                  <div
                    onClick={() => setExportScope('filtered')}
                    className={`cursor-pointer rounded-2xl p-3.5 border transition-all ${
                      exportScope === 'filtered'
                        ? 'bg-sky-500/15 border-sky-500 text-white ring-1 ring-sky-500/40'
                        : 'bg-[#050c18] border-[#132542] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-sky-200">
                        {language === 'it' ? 'Vista Corrente Filtrata' : 'Current Filtered View'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-500/30">
                        {filteredOrders.length} {language === 'it' ? 'ordini' : 'orders'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {statusFilter === 'active' 
                        ? (language === 'it' ? 'Include solo ordini attivi in lavorazione o transito' : 'Includes only active orders in processing or transit')
                        : statusFilter !== 'all'
                        ? (language === 'it' ? `Include solo ordini "${statusFilter}"` : `Includes only "${statusFilter}" orders`)
                        : searchFilter
                        ? (language === 'it' ? `Ordini corrispondenti a "${searchFilter}"` : `Orders matching "${searchFilter}"`)
                        : (language === 'it' ? 'Ordini attualmente visualizzati a schermo' : 'Orders currently displayed on screen')}
                    </p>
                  </div>

                  {/* Option 2: All Orders */}
                  <div
                    onClick={() => setExportScope('all')}
                    className={`cursor-pointer rounded-2xl p-3.5 border transition-all ${
                      exportScope === 'all'
                        ? 'bg-sky-500/15 border-sky-500 text-white ring-1 ring-sky-500/40'
                        : 'bg-[#050c18] border-[#132542] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-sky-200">
                        {language === 'it' ? 'Tutto lo Storico Completo' : 'Full Order History'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-700">
                        {orders.length} {language === 'it' ? 'ordini' : 'orders'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {language === 'it' ? 'Esporta tutti gli ordini registrati nel tuo archivio aziendale B2B' : 'Export all orders recorded in your B2B corporate registry'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Summary Metrics Preview */}
              {(() => {
                const targetOrders = exportScope === 'all' ? orders : filteredOrders;
                const totalGross = targetOrders.reduce((sum, o) => sum + o.total, 0);
                const totalItems = targetOrders.reduce((sum, o) => sum + o.itemsCount, 0);

                return (
                  <div className="bg-[#050c18] border border-[#122544] rounded-2xl p-4 mb-5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-[#101f38]">
                      <span className="text-slate-400">{language === 'it' ? 'Ordini inclusi nel report:' : 'Orders included:'}</span>
                      <span className="text-white font-bold">{targetOrders.length} {language === 'it' ? 'ordini' : 'orders'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-[#101f38]">
                      <span className="text-slate-400">{language === 'it' ? 'Volume colli complessivo:' : 'Total unit volume:'}</span>
                      <span className="text-sky-300 font-bold">{totalItems} {language === 'it' ? 'colli totali' : 'total units'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{language === 'it' ? 'Totale Forniture (IVA inc.):' : 'Total Spend (VAT inc.):'}</span>
                      <span className="text-base font-bold font-mono text-white">€ {totalGross.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Document Features Included List */}
              <div className="bg-[#08152c]/60 border border-sky-500/20 rounded-2xl p-3.5 mb-6 text-[11px] text-slate-300 space-y-1.5">
                <p className="font-bold text-sky-200 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>{language === 'it' ? 'Contenuto del Documento PDF Formattato:' : 'Included in the Formatted PDF Document:'}</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>{language === 'it' ? 'Intestazione & Dati Fiscali B2B' : 'B2B Corporate Fiscal Header'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>{language === 'it' ? 'Registro Dettagliato Ordini' : 'Detailed Order Registry Table'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>{language === 'it' ? 'Spaccato Top Prodotti Acquistati' : 'Top Purchased Products Breakdown'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>{language === 'it' ? 'Riepilogo Imponibile & IVA 22%' : 'Taxable & VAT 22% Summary'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#142848]">
                <button
                  type="button"
                  disabled={isExportingHistory}
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0e203c] hover:bg-[#142d54] text-slate-300 transition-colors"
                >
                  {language === 'it' ? 'Annulla' : 'Cancel'}
                </button>

                <button
                  type="button"
                  disabled={isExportingHistory || (exportScope === 'filtered' ? filteredOrders.length === 0 : orders.length === 0)}
                  onClick={() => handleExportHistory()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] text-white shadow-lg shadow-sky-950/50 transition-all hover:scale-[1.02]"
                >
                  {isExportingHistory ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('orders.generatingHistoryPdf', 'Generazione PDF...')}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>{language === 'it' ? 'Scarica Report PDF' : 'Download PDF Report'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
