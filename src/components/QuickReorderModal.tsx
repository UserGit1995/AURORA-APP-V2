import React, { useState, useMemo } from 'react';
import { 
  X, 
  RotateCcw, 
  RotateCw, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  FileText, 
  Download, 
  Search, 
  Building2, 
  User, 
  Truck, 
  Store, 
  AlertCircle,
  Package,
  Send,
  Loader2,
  Clock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, CustomerType, DeliveryOption } from '../types';
import { PRODUCTS } from '../data/catalog';
import { generateOrderReceiptPdf } from '../utils/orderPdfGenerator';
import { useAdmin } from '../context/AdminContext';

interface QuickReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onOrderCreated: (newOrder: Order) => void;
  onSelectProduct?: (product: Product) => void;
}

interface QuickRowItem {
  id: string;
  product: Product;
  quantity: number;
}

export const QuickReorderModal: React.FC<QuickReorderModalProps> = ({
  isOpen,
  onClose,
  orders,
  onOrderCreated,
  onSelectProduct
}) => {
  const { currentUser, isBusinessCustomer } = useAdmin();

  // Tabs: 'frequent' (Frequenti & Consumabili) | 'history' (Da Ordini Passati) | 'sku' (Inserimento Rapido Codice)
  const [activeTab, setActiveTab] = useState<'frequent' | 'history' | 'sku'>('frequent');

  // Quick items basket
  const [selectedItems, setSelectedItems] = useState<QuickRowItem[]>([
    { id: '1', product: PRODUCTS[0], quantity: 2 }, // Detersivo Lavatrice
    { id: '2', product: PRODUCTS[2], quantity: 2 }, // Sgrassatore
  ]);

  // Recipient / Shipping Info: Default to user profile type
  const [customerType, setCustomerType] = useState<CustomerType>(() => {
    if (currentUser?.customerType === 'attivita' || currentUser?.role === 'superadmin') {
      return 'azienda';
    }
    return 'privato';
  });
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('corriere');
  const [companyOrName, setCompanyOrName] = useState(currentUser?.company || currentUser?.name || 'Simone Aricò');
  const [contactPerson, setContactPerson] = useState(currentUser?.name || 'Simone Aricò');
  const [email, setEmail] = useState(currentUser?.email || 'simonearico10@gmail.com');
  const [phone, setPhone] = useState(currentUser?.phone || '+39 340 1234567');
  const [deliveryAddress, setDeliveryAddress] = useState('Via dell\'Industria 45, Palazzina B, 20145 Milano (MI)');
  const [notes, setNotes] = useState('Riordino periodico programmato - scarico colli magazzino.');

  // SKU code input
  const [skuSearch, setSkuSearch] = useState('');
  const [skuQty, setSkuQty] = useState(1);
  const [skuError, setSkuError] = useState<string | null>(null);

  // Submission & Success state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Frequently ordered products (based on catalog top items)
  const frequentProducts = useMemo(() => {
    return PRODUCTS.filter((p) => p.isFeatured || p.stock > 0).slice(0, 8);
  }, []);

  if (!isOpen) return null;

  const isAzienda = customerType === 'azienda';
  // Calculation: IVA 22% for business, 0% for private
  const subtotal = selectedItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const vat = isAzienda ? subtotal * 0.22 : 0;
  const total = subtotal + vat;
  const totalColli = selectedItems.reduce((acc, item) => acc + item.quantity, 0);

  // Update item quantity
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setSelectedItems((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as QuickRowItem[];
    });
  };

  // Add product to quick list
  const handleAddProductToQuickList = (product: Product, defaultQty: number = 1) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + defaultQty }
            : item
        );
      }
      return [...prev, { id: `${product.id}-${Date.now()}`, product, quantity: defaultQty }];
    });
  };

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Clone previous order into quick list
  const handleLoadOrder = (order: Order) => {
    const newItems: QuickRowItem[] = [];
    order.items.forEach((ordItem) => {
      const prod = PRODUCTS.find((p) => p.id === ordItem.productId || p.code === ordItem.code);
      if (prod) {
        newItems.push({
          id: `${prod.id}-${Date.now()}`,
          product: prod,
          quantity: ordItem.qty,
        });
      }
    });

    if (newItems.length > 0) {
      setSelectedItems(newItems);
      if (order.shippingAddress?.companyName) {
        setCustomerType('azienda');
        setCompanyOrName(order.shippingAddress.companyName);
      } else if (order.shippingAddress?.recipient) {
        setCustomerType('privato');
        setCompanyOrName(order.shippingAddress.recipient);
      }
      if (order.shippingAddress?.recipient) setContactPerson(order.shippingAddress.recipient);
      if (order.shippingAddress?.email) setEmail(order.shippingAddress.email);
      if (order.shippingAddress?.phone) setPhone(order.shippingAddress.phone);
    }
  };

  // Add by SKU
  const handleAddBySku = (e: React.FormEvent) => {
    e.preventDefault();
    setSkuError(null);
    const cleanSku = skuSearch.trim().toLowerCase();
    if (!cleanSku) return;

    const matched = PRODUCTS.find(
      (p) => p.code.toLowerCase() === cleanSku || p.id.toLowerCase() === cleanSku || p.name.toLowerCase().includes(cleanSku)
    );

    if (!matched) {
      setSkuError(`Nessun prodotto trovato per "${skuSearch}". Verifica il codice articolo o SKU.`);
      return;
    }

    handleAddProductToQuickList(matched, Math.max(1, skuQty));
    setSkuSearch('');
    setSkuQty(1);
  };

  // Submit direct reorder request (NO CARTE / NO CHECKOUT)
  const handleSubmitReorder = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const orderId = `ORD-QUICK-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder: Order = {
        id: orderId,
        date: 'Oggi (Riordino Rapido)',
        status: 'In elaborazione',
        estimatedDelivery: deliveryOption === 'ritiro_sede' 
          ? 'Pronto per il ritiro in sede (entro 24h)' 
          : 'Spedizione rapida in 24/48h',
        courier: deliveryOption === 'ritiro_sede' 
          ? 'Ritiro diretto presso Magazzino Aurora' 
          : 'GLS Logistics Express B2B',
        trackingNumber: deliveryOption === 'ritiro_sede' 
          ? 'RITIRO-SEDE' 
          : `GLS-QR-${Math.floor(1000000 + Math.random() * 9000000)}`,
        total: total,
        subtotal: subtotal,
        vatAmount: vat,
        shippingCost: 0.0,
        paymentMethod: customerType === 'azienda' 
          ? 'Fattura B2B con Bonifico 30/60 gg d.f. / Ri.Ba.' 
          : 'Pagamento alla Consegna / Bonifico su Ricevuta',
        shippingAddress: {
          customerType,
          companyName: customerType === 'azienda' ? companyOrName : undefined,
          recipient: contactPerson || companyOrName,
          email,
          phone,
          street: deliveryOption === 'ritiro_sede' ? 'Ritiro Magazzino Centrale - Via dell\'Industria 45' : deliveryAddress,
          city: 'Milano',
          province: 'MI',
          postalCode: '20145',
          country: 'Italia',
          vatNumber: customerType === 'azienda' ? 'IT09876543210' : undefined,
          fiscalCode: customerType === 'privato' ? 'RCISMN85T10F205Z' : undefined,
          deliveryOption,
          deliveryNotes: notes || undefined,
        },
        itemsCount: totalColli,
        items: selectedItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          code: item.product.code,
          packageQty: item.product.packageQty,
          qty: item.quantity,
          price: item.product.price,
        })),
      };

      onOrderCreated(newOrder);
      setSubmittedOrder(newOrder);
      setIsSubmitting(false);
    }, 400);
  };

  const handleDownloadPdf = async () => {
    if (!submittedOrder) return;
    setIsDownloadingPdf(true);
    try {
      generateOrderReceiptPdf(submittedOrder);
    } catch (err) {
      console.error('Errore generazione PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedOrder(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={submittedOrder ? handleResetAndClose : onClose}
      />

      <div className="relative w-full max-w-4xl bg-[#060e1d] border border-[#132746] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#122442] bg-[#081326] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-400/30 text-sky-400 shadow-xs">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-base sm:text-lg">
                  Riordino Rapido B2B
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  1-CLICK • ORDINE DIRETTO
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Riordina prodotti frequenti, replica forniture passate o inserisci codici SKU per consegna immediata.
              </p>
            </div>
          </div>
          <button
            id="close-quick-reorder-modal-btn"
            onClick={submittedOrder ? handleResetAndClose : onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#0f1e38] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        {!submittedOrder ? (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#122442]">
            
            {/* LEFT COLUMN: SELECTION TOOLS (Tabs) */}
            <div className="lg:col-span-7 p-4 sm:p-5 space-y-4">
              
              {/* Tab Navigation */}
              <div className="flex bg-[#0a152b] p-1 rounded-2xl border border-[#14294d] text-xs font-bold">
                <button
                  type="button"
                  id="tab-frequent-btn"
                  onClick={() => setActiveTab('frequent')}
                  className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'frequent'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Consumabili Frequenti</span>
                </button>

                <button
                  type="button"
                  id="tab-history-btn"
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Da Ordini Passati</span>
                </button>

                <button
                  type="button"
                  id="tab-sku-btn"
                  onClick={() => setActiveTab('sku')}
                  className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'sku'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Inserisci SKU</span>
                </button>
              </div>

              {/* TAB 1: FREQUENT CONSUMABLES */}
              {activeTab === 'frequent' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>Prodotti ad alta rotazione consigliati per riordino:</span>
                    <span className="text-[11px] text-sky-400">{frequentProducts.length} referenze</span>
                  </div>

                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {frequentProducts.map((product) => {
                      const inList = selectedItems.find((i) => i.product.id === product.id);
                      return (
                        <div
                          key={product.id}
                          className="bg-[#09152b] border border-[#14294d] hover:border-sky-500/40 rounded-2xl p-2.5 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="w-11 h-11 rounded-xl bg-[#060c17] p-1 shrink-0 flex items-center justify-center">
                            <img
                              src={product.image}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-white truncate">{product.name}</h4>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">{product.code}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>{product.packageQty}</span>
                              <span>•</span>
                              {isBusinessCustomer ? (
                                <span className="text-sky-400 font-bold font-mono">
                                  €{(product.price * 1.22).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold font-mono">
                                  €{product.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          {inList ? (
                            <div className="flex items-center bg-[#0d1e3d] border border-sky-400/40 rounded-xl px-1 py-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(product.id, -1)}
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-xs font-bold text-sky-300 min-w-[1.2rem] text-center">
                                {inList.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(product.id, 1)}
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddProductToQuickList(product, 1)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-bold transition-colors shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Aggiungi</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: FROM PAST ORDERS */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 px-1">
                    Replica l'intera fornitura di un ordine precedente con 1 click:
                  </p>

                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-[#09152b] border border-[#14294d] rounded-2xl p-3.5 space-y-2 hover:border-sky-500/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-mono font-bold text-sky-400">{order.id}</span>
                            <span className="text-[11px] text-slate-400 ml-2">({order.date})</span>
                          </div>
                          <span className="text-xs font-bold font-mono text-white">
                            €{order.total.toFixed(2)} <span className="text-[10px] text-slate-400">({order.itemsCount} colli)</span>
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-300 flex flex-wrap gap-1">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="bg-[#060e1d] px-2 py-0.5 rounded-lg border border-[#132746]">
                              {item.productName} ({item.qty}x)
                            </span>
                          ))}
                          {order.items.length > 3 && (
                            <span className="text-slate-400 self-center">+{order.items.length - 3} altri</span>
                          )}
                        </div>

                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleLoadOrder(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-xs transition-all"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Carica Questa Lista</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: SKU RAPID ENTRY */}
              {activeTab === 'sku' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddBySku} className="bg-[#09152b] border border-[#14294d] rounded-2xl p-3.5 space-y-3">
                    <label className="block text-xs font-bold text-white">
                      Inserisci Codice Articolo (SKU) o Nome:
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={skuSearch}
                          onChange={(e) => {
                            setSkuSearch(e.target.value);
                            setSkuError(null);
                          }}
                          placeholder="es. DET-LAV-01, SGR-UNIV-03..."
                          className="w-full bg-[#060e1d] border border-[#14294d] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={skuQty}
                          onChange={(e) => setSkuQty(parseInt(e.target.value) || 1)}
                          className="w-full bg-[#060e1d] border border-[#14294d] rounded-xl px-2 py-2 text-xs text-center text-white focus:outline-none focus:border-sky-400"
                          title="Quantità colli"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-colors"
                      >
                        Aggiungi
                      </button>
                    </div>

                    {skuError && (
                      <p className="text-[11px] text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{skuError}</span>
                      </p>
                    )}
                  </form>

                  <div className="p-3 bg-[#060e1d] border border-[#132746] rounded-2xl text-[11px] text-slate-400 space-y-1">
                    <p className="font-bold text-slate-300">Codici SKU rapidi frequenti:</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {PRODUCTS.slice(0, 6).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSkuSearch(p.code);
                            handleAddProductToQuickList(p, 1);
                          }}
                          className="px-2 py-1 rounded-lg bg-[#0c1c38] hover:bg-[#122b56] text-sky-300 border border-[#1a3a6b] font-mono text-[10px] transition-colors"
                        >
                          +{p.code} ({p.name.slice(0, 18)}...)
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: REORDER SUMMARY & DIRECT SUBMISSION (NO PAY / NO CARD) */}
            <div className="lg:col-span-5 p-4 sm:p-5 bg-[#050b17] flex flex-col justify-between space-y-4">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#122442]">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-sky-400" />
                    <span>Lista Riordino ({totalColli} colli)</span>
                  </h4>
                  {selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedItems([])}
                      className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      Svuota
                    </button>
                  )}
                </div>

                {/* Basket List */}
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                  {selectedItems.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-6">
                      Seleziona i prodotti a sinistra per comporre il riordino rapido.
                    </p>
                  ) : (
                    selectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#081326] border border-[#122442] text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-white font-medium truncate">{item.product.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {isAzienda ? (
                              <>
                                €{(item.product.price * 1.22).toFixed(2)}/cad (IVA inc.) • <span className="text-sky-300 font-bold font-mono">€{((item.product.price * 1.22) * item.quantity).toFixed(2)}</span>
                              </>
                            ) : (
                              <>
                                €{item.product.price.toFixed(2)}/cad (senza IVA) • <span className="text-emerald-300 font-bold font-mono">€{(item.product.price * item.quantity).toFixed(2)}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex items-center bg-[#060e1d] border border-[#132746] rounded-lg px-1 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.product.id, -1)}
                              className="text-slate-400 hover:text-white p-0.5"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="px-1.5 text-[11px] font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.product.id, 1)}
                              className="text-slate-400 hover:text-white p-0.5"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.product.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Recipient & Shipping Options */}
                <div className="bg-[#081326] border border-[#122442] rounded-2xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Intestatario fornitura:</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCustomerType('azienda')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          customerType === 'azienda'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Azienda
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerType('privato')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          customerType === 'privato'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Privato
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={companyOrName}
                    onChange={(e) => setCompanyOrName(e.target.value)}
                    placeholder="Nome Azienda o Referente"
                    className="w-full bg-[#060e1d] border border-[#132746] rounded-xl px-2.5 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none"
                  />

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setDeliveryOption('corriere')}
                      className={`py-1 px-2 rounded-xl text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                        deliveryOption === 'corriere'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                          : 'bg-[#060e1d] text-slate-400 border-[#132746]'
                      }`}
                    >
                      <Truck className="w-3 h-3" />
                      <span>Consegna Corriere</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryOption('ritiro_sede')}
                      className={`py-1 px-2 rounded-xl text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                        deliveryOption === 'ritiro_sede'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                          : 'bg-[#060e1d] text-slate-400 border-[#132746]'
                      }`}
                    >
                      <Store className="w-3 h-3" />
                      <span>Ritiro in Sede</span>
                    </button>
                  </div>
                </div>

                {/* Subtotal & Summary */}
                <div className="space-y-1 text-xs pt-1 border-t border-[#122442]">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Imponibile ({totalColli} colli):</span>
                    <span className="font-mono text-white">€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>{isAzienda ? 'IVA 22% (Attività/Aziende):' : 'IVA (0% - Listino Privati):'}</span>
                    <span className={`font-mono ${isAzienda ? 'text-white' : 'text-emerald-400'}`}>
                      {isAzienda ? `€${vat.toFixed(2)}` : '€0.00 (non applicata)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-1">
                    <span>{isAzienda ? 'Totale Documento (con IVA):' : 'Totale Documento (Senza IVA):'}</span>
                    <span className={`font-mono ${isAzienda ? 'text-sky-400' : 'text-emerald-400'}`}>
                      €{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Submit Button (NO CHECKOUT / NO CART REDIRECT) */}
              <div className="space-y-2">
                <button
                  type="button"
                  id="submit-direct-reorder-btn"
                  disabled={selectedItems.length === 0 || isSubmitting}
                  onClick={handleSubmitReorder}
                  className="w-full bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-950/80 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Generazione Ordine Immediata...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-sky-100" />
                      <span>Conferma e Invia Riordino Diretto</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-500">
                  Nessun pagamento con carta • Fattura differita / Ricevuta alla consegna
                </p>
              </div>

            </div>

          </div>
        ) : (
          /* SUCCESS STATE */
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Riordino Inviato con Successo!</h3>
              <p className="text-slate-300 text-xs mt-1 max-w-md">
                La fornitura è stata confermata e registrata nel sistema logistico per l'allestimento immediato.
              </p>
            </div>

            <div className="w-full max-w-md bg-[#081326] border border-[#14284b] rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-[#122340] pb-2">
                <span className="text-slate-400">Codice Riordino:</span>
                <span className="font-mono text-sky-400 font-bold">{submittedOrder.id}</span>
              </div>
              <div className="flex justify-between border-b border-[#122340] pb-2">
                <span className="text-slate-400">Destinatario:</span>
                <span className="text-white font-medium">
                  {submittedOrder.shippingAddress?.companyName || submittedOrder.shippingAddress?.recipient}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#122340] pb-2">
                <span className="text-slate-400">Totale Colli:</span>
                <span className="text-slate-200 font-bold">{submittedOrder.itemsCount} colli</span>
              </div>
              <div className="flex justify-between border-b border-[#122340] pb-2">
                <span className="text-slate-400">Importo Documento:</span>
                <span className="text-sky-400 font-mono font-bold">€{submittedOrder.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Spedizione / Ricezione:</span>
                <span className="text-emerald-300 font-medium">
                  {submittedOrder.shippingAddress?.deliveryOption === 'ritiro_sede' ? 'Ritiro Sede Aurora' : 'GLS Express 24/48h'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-md">
              <button
                type="button"
                id="quick-reorder-download-pdf-btn"
                disabled={isDownloadingPdf}
                onClick={handleDownloadPdf}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0e223f] hover:bg-[#153460] text-sky-300 border border-sky-500/40 text-xs font-bold transition-colors"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-sky-400" />
                )}
                <span>Scarica Scheda Riordino PDF</span>
              </button>

              <button
                type="button"
                id="quick-reorder-done-btn"
                onClick={handleResetAndClose}
                className="flex-1 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-colors"
              >
                Chiudi e Torna al Catalogo
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
