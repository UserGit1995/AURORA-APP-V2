import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck,
  Building2,
  User,
  Truck,
  Store,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Send,
  AlertCircle,
  Clock,
  Bookmark,
  BookmarkPlus,
  BookmarkCheck,
  Sparkles,
  Layers,
  RotateCw,
  Check,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, Order, CustomerType, DeliveryOption, OrderTemplate } from '../types';
import { OrderTemplateModal } from './OrderTemplateModal';
import { getSavedTemplates } from '../data/orderTemplates';
import { newOrderNumber } from '../services/supabase';
import { OrderSendFallback } from './OrderSendFallback';
import { useLanguage } from '../context/LanguageContext';
import { useAdmin } from '../context/AdminContext';
import { PLACEHOLDER_IMAGE } from '../utils/imageRepair';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckoutSuccess?: (order: Order) => void;
  // Cliente che ha dimenticato di essere online / rete assente: ci pensa il pulsante Riprova
  onApplyTemplate?: (template: OrderTemplate, mode: 'replace' | 'merge') => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckoutSuccess,
  onApplyTemplate,
}) => {
  const { language, t } = useLanguage();
  const isIt = language === 'it';
  const { currentUser, createOrder, productsList, vatFactor, vatPercent } = useAdmin();

  // Step in checkout: 'cart' -> 'form' -> 'success'
  const [step, setStep] = useState<'cart' | 'form' | 'success'>('cart');
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState<Order | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failedOrder, setFailedOrder] = useState<Order | null>(null);

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateModalMode, setTemplateModalMode] = useState<'save' | 'load'>('load');
  const [templateFeedbackMsg, setTemplateFeedbackMsg] = useState<string | null>(null);

  // Form State: Initialize to user's profile type
  const [customerType, setCustomerType] = useState<CustomerType>(() => {
    if (currentUser?.customerType === 'attivita' || currentUser?.role === 'superadmin') {
      return 'azienda';
    }
    return 'privato';
  });
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('corriere');

  // Fields
  const [companyName, setCompanyName] = useState(currentUser?.company || '');
  const [vatNumber, setVatNumber] = useState(currentUser?.piva || '');
  const [sdiCode, setSdiCode] = useState(currentUser?.sdi || '');
  
  // Private / Common Fields
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [fiscalCode, setFiscalCode] = useState('');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  
  // Delivery Address
  const [street, setStreet] = useState(currentUser?.address || '');
  const [city, setCity] = useState(currentUser?.city || '');
  const [province, setProvince] = useState(currentUser?.province || '');
  const [postalCode, setPostalCode] = useState(currentUser?.postalCode || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Form Validation Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentUser) return;
    const fill = (setter: React.Dispatch<React.SetStateAction<string>>, value?: string) =>
      value && setter((prev) => prev || value);
    fill(setCompanyName, currentUser.company);
    fill(setVatNumber, currentUser.piva);
    fill(setSdiCode, currentUser.sdi);
    fill(setFullName, currentUser.name);
    fill(setEmail, currentUser.email);
    fill(setPhone, currentUser.phone);
    fill(setStreet, currentUser.address);
    fill(setCity, currentUser.city);
    fill(setProvince, currentUser.province);
    fill(setPostalCode, currentUser.postalCode);
    if (currentUser.customerType === 'attivita') setCustomerType('azienda');
  }, [currentUser?.id]);

  if (!isOpen) return null;

  const isAzienda = customerType === 'azienda';
  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  // IVA: solo se impostata dall'admin (default 0); i privati non la pagano mai
  const vat = isAzienda ? subtotal * (vatPercent / 100) : 0;
  const total = subtotal + vat;
  const freeShippingThreshold = 250;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Nome e Cognome obbligatori';
    if (!email.trim() || !email.includes('@')) errors.email = 'E-mail valida obbligatoria per conferme';
    if (!phone.trim()) errors.phone = 'Telefono per la consegna obbligatorio';

    if (customerType === 'azienda') {
      if (!companyName.trim()) errors.companyName = 'Ragione Sociale o Nome Ditta obbligatorio';
      if (!vatNumber.trim()) errors.vatNumber = 'P.IVA o Codice Fiscale ditta obbligatorio';
    } else {
      if (!fiscalCode.trim()) errors.fiscalCode = 'Codice Fiscale obbligatorio per ricevuta';
    }

    if (deliveryOption === 'corriere') {
      if (!street.trim()) errors.street = 'Indirizzo di spedizione obbligatorio';
      if (!city.trim()) errors.city = 'Città obbligatoria';
      if (!postalCode.trim()) errors.postalCode = 'CAP obbligatorio';
      if (!province.trim()) errors.province = 'Provincia obbligatoria';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToForm = () => {
    setStep('form');
  };

  const handleSendOrderRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    if (!validateForm()) return;
    if (items.length === 0) return;

    const pickup = deliveryOption === 'ritiro_sede';
    const newOrder: Order = {
      // Se è un nuovo tentativo dopo un errore, stesso numero ordine: niente doppioni
      id: failedOrder?.id || newOrderNumber(),
      date: new Date().toLocaleDateString('it-IT'),
      status: 'In elaborazione',
      estimatedDelivery: pickup
        ? 'Ritiro in sede: ti avviseremo quando è pronto'
        : 'Spedizione da confermare (di norma 24/48h)',
      courier: pickup ? 'Ritiro in sede' : 'Corriere da confermare',
      trackingNumber: pickup ? 'RITIRO-SEDE' : undefined,
      total: total,
      subtotal: subtotal,
      vatAmount: vat,
      shippingCost: 0.0,
      paymentMethod: 'Pagamento alla consegna',
      shippingAddress: {
        customerType: customerType,
        companyName: customerType === 'azienda' ? companyName.trim() : undefined,
        recipient: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        street: pickup ? 'Ritiro in sede' : street.trim(),
        city: pickup ? '' : city.trim(),
        province: pickup ? '' : province.trim(),
        postalCode: pickup ? '' : postalCode.trim(),
        country: 'Italia',
        vatNumber: customerType === 'azienda' ? vatNumber.trim() : undefined,
        fiscalCode: customerType === 'privato' ? fiscalCode.trim() : undefined,
        sdiCode: customerType === 'azienda' ? sdiCode.trim() || undefined : undefined,
        deliveryOption: deliveryOption,
        deliveryNotes: deliveryNotes.trim() || undefined,
      },
      itemsCount: items.reduce((acc, i) => acc + i.quantity, 0),
      items: items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        code: i.product.code,
        packageQty: i.product.packageQty,
        qty: i.quantity,
        price: i.product.price,
      })),
    };

    setIsSending(true);
    setSendError(null);
    const result = await createOrder(newOrder, 'carrello');
    setIsSending(false);

    if (!result.ok) {
      // L'ordine NON è partito: il carrello resta com'è così il cliente può riprovare.
      setFailedOrder(newOrder);
      setSendError(
        'Non siamo riusciti a inviare l\'ordine (probabile problema di connessione). Il carrello è al sicuro: riprova tra un momento oppure contattaci per telefono.'
      );
      return;
    }

    setFailedOrder(null);
    setLastSubmittedOrder(newOrder);
    setStep('success');
    if (onCheckoutSuccess) onCheckoutSuccess(newOrder);
  };

  const handleCompleteAndClose = () => {
    onClearCart();
    setStep('cart');
    setLastSubmittedOrder(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={step === 'success' ? handleCompleteAndClose : onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-lg bg-[#0d1420] border-l border-[#1c2433] shadow-2xl flex flex-col justify-between overflow-hidden">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#1c2433] flex items-center justify-between bg-[#0d1420]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">
                  {step === 'cart' ? 'Riepilogo Lista Ordine' : step === 'form' ? 'Dati Ordine & Destinatario' : 'Richiesta Ordine Inviata'}
                </h3>
                <p className="text-slate-400 text-xs">
                  {step === 'cart' 
                    ? `${items.length} articoli da ordinare • Si paga alla consegna` 
                    : step === 'form'
                    ? 'Aziende e Privati • Pagamento alla consegna'
                    : `Codice: ${lastSubmittedOrder?.id || 'ORD-2026'}`}
                </p>
              </div>
            </div>
            <button
              id="close-cart-drawer-btn"
              onClick={step === 'success' ? handleCompleteAndClose : onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2230] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* STEP 1: CART LIST VIEW */}
          {step === 'cart' && (
            <>
              {/* Free shipping banner */}
              <div className="px-5 py-2.5 bg-[#0d1420] border-b border-[#1c2433]">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">
                    {remainingForFreeShipping === 0 
                      ? '🎉 Consegna Gratuita inclusa!' 
                      : `Aggiungi €${remainingForFreeShipping.toFixed(2)} per la spedizione gratuita`}
                  </span>
                  <span className="text-sky-400 font-bold">
                    {Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#0d1420] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Template Quick Toolbar */}
              <div className="px-4 py-2.5 bg-[#0d1420] border-b border-[#1c2433] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    id="cart-open-templates-btn"
                    onClick={() => {
                      setTemplateModalMode('load');
                      setIsTemplateModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1420] hover:bg-[#1a2230] text-sky-300 hover:text-sky-900 border border-sky-500/40 text-xs font-semibold transition-all shadow-xs"
                    title={isIt ? 'Visualizza e carica modelli di riordino B2B' : 'View and load B2B restock templates'}
                  >
                    <Bookmark className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('cart.templates', 'Modelli Riordino')}</span>
                  </button>

                  {items.length > 0 && (
                    <button
                      id="cart-save-template-btn"
                      onClick={() => {
                        setTemplateModalMode('save');
                        setIsTemplateModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-100 text-emerald-300 hover:text-emerald-900 border border-emerald-500/40 text-xs font-semibold transition-all shadow-xs"
                      title={isIt ? 'Salva gli articoli correnti come modello riutilizzabile' : 'Save current items as reusable template'}
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('cart.saveAsTemplate', 'Salva come Modello')}</span>
                    </button>
                  )}
                </div>

                {items.length > 0 && (
                  <button
                    id="cart-clear-btn"
                    onClick={onClearCart}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 py-1 px-1.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t('cart.clear', 'Svuota')}</span>
                  </button>
                )}
              </div>

              {/* In-cart template feedback notification */}
              <AnimatePresence>
                {templateFeedbackMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 py-2 bg-emerald-950/60 border-b border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold">{templateFeedbackMsg}</span>
                    </div>
                    <button
                      onClick={() => setTemplateFeedbackMsg(null)}
                      className="text-emerald-400 hover:text-emerald-900 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Items List / Empty State */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {/* Customer Type Quick Selector in Cart */}
                {items.length > 0 && (
                  <div className="bg-[#0d1420] border border-[#1c2433] rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {isAzienda ? (
                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                      <span className="text-[11px] text-slate-400 font-medium">
                        Listino:{' '}
                        <strong className={isAzienda ? "text-sky-300" : "text-emerald-300"}>
                          {isAzienda ? `Attività / Fornitore${vatPercent > 0 ? ` (con IVA ${vatPercent}%)` : ''}` : `Cliente Privato${vatPercent > 0 ? ' (senza IVA)' : ''}`}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCustomerType('privato')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          !isAzienda 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Privato
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerType('azienda')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          isAzienda 
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' 
                            : 'text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Azienda
                      </button>
                    </div>
                  </div>
                )}

                {items.length === 0 ? (
                  <div className="space-y-5">
                    {/* Empty cart banner */}
                    <div className="py-6 flex flex-col items-center justify-center text-center text-slate-400 bg-[#0d1420] border border-[#1c2433] rounded-2xl p-4">
                      <div className="p-3 rounded-2xl bg-[#0d1420] text-slate-500 mb-2 border border-[#1c2433]">
                        <ShoppingBag className="w-8 h-8 stroke-1" />
                      </div>
                      <p className="text-sm font-semibold text-slate-300">{t('cart.empty', 'La lista d\'ordine è vuota')}</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        {isIt
                          ? 'Aggiungi singoli prodotti dal catalogo oppure carica subito un modello di rifornimento preconfigurato.'
                          : 'Add products from the catalog or load a pre-configured B2B restock template below.'}
                      </p>
                    </div>

                    {/* Quick restock templates section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isIt ? 'Carica un Modello di Riordino Rapido:' : 'Load a Quick Restock Template:'}</span>
                        </span>
                        <button
                          onClick={() => {
                            setTemplateModalMode('load');
                            setIsTemplateModalOpen(true);
                          }}
                          className="text-xs text-slate-500 hover:text-white transition-colors"
                        >
                          {isIt ? 'Tutti i modelli →' : 'All templates →'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {getSavedTemplates().slice(0, 3).map((tpl) => {
                          let totalItems = 0;
                          let totalCost = 0;
                          tpl.items.forEach((item) => {
                            const prod = productsList.find((p) => p.id === item.productId);
                            if (prod) {
                              totalItems += item.quantity;
                              totalCost += prod.price * item.quantity;
                            }
                          });

                          return (
                            <div
                              key={tpl.id}
                              className="p-3 rounded-2xl bg-[#0d1420] border border-[#1c2433] hover:border-sky-500/40 transition-all text-left flex items-center justify-between gap-3 group"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-sky-950 text-sky-300 border border-sky-500/30">
                                    {tpl.tag}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {totalItems} {isIt ? 'colli' : 'units'} • €{totalCost.toFixed(2)}
                                  </span>
                                </div>
                                <h5 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                                  {tpl.name}
                                </h5>
                                {tpl.description && (
                                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                    {tpl.description}
                                  </p>
                                )}
                              </div>

                              <button
                                id={`quick-load-preset-${tpl.id}`}
                                onClick={() => {
                                  if (onApplyTemplate) {
                                    onApplyTemplate(tpl, 'replace');
                                  }
                                  setTemplateFeedbackMsg(
                                    isIt ? `Modello "${tpl.name}" caricato nel carrello!` : `Template "${tpl.name}" loaded into cart!`
                                  );
                                  setTimeout(() => setTemplateFeedbackMsg(null), 3500);
                                }}
                                className="shrink-0 px-3 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-md shadow-sky-950/40 flex items-center gap-1.5 transition-transform active:scale-95"
                              >
                                <RotateCw className="w-3 h-3" />
                                <span>{isIt ? 'Carica' : 'Load'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  items.map((item) => (
                    <div 
                      key={item.product.id}
                      className="bg-[#0d1420] border border-[#1c2433] rounded-2xl p-3 flex gap-3 items-center"
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#0d1420] p-1 shrink-0 flex items-center justify-center">
                        <img 
                          src={item.product.image || PLACEHOLDER_IMAGE} 
                          alt={item.product.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{item.product.name}</h4>
                        <p className="text-[11px] text-slate-400">{item.product.packageQty}</p>
                        {isAzienda ? (
                          <div className="mt-1">
                            <span className="text-xs font-bold text-sky-400">
                              €{((item.product.price * vatFactor) * item.quantity).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              (€{(item.product.price * vatFactor).toFixed(2)}{vatPercent > 0 ? ' con IVA' : ''})
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="text-xs font-bold text-emerald-400">
                              €{(item.product.price * item.quantity).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              (€{item.product.price.toFixed(2)}{vatPercent > 0 ? ' senza IVA' : ''})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quantity Modifier */}
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          title="Rimuovi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center bg-[#0d1420] border border-[#1c2433] rounded-lg px-1 py-0.5">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, -1)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-white min-w-[1.2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, 1)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Summary */}
              {items.length > 0 && (
                <div className="p-4 sm:p-5 border-t border-[#1c2433] bg-[#0d1420] space-y-3">
                  <div className="space-y-1.5 text-xs text-slate-400">
                    {isAzienda ? (
                      <>
                        <div className="flex justify-between">
                          <span>Imponibile Netto:</span>
                          <span className="font-mono text-white font-medium">€{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{vatPercent > 0 ? `IVA (${vatPercent}% per Attività/Aziende):` : 'IVA (non applicata):'}</span>
                          <span className="font-mono text-white font-medium">€{vat.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-[#1c2433]">
                          <span>{vatPercent > 0 ? 'Totale Fornitura (IVA inclusa):' : 'Totale Ordine:'}</span>
                          <span className="text-sky-400 font-mono">€{total.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>Imponibile:</span>
                          <span className="font-mono text-white font-medium">€{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-400">IVA (0% - Listino Utenti Privati):</span>
                          <span className="font-mono text-emerald-400 font-medium">€0.00 (non applicata)</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-[#1c2433]">
                          <span>Totale Ordine (Senza IVA):</span>
                          <span className="text-emerald-400 font-mono">€{total.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="save-cart-template-footer-btn"
                      type="button"
                      onClick={() => {
                        setTemplateModalMode('save');
                        setIsTemplateModalOpen(true);
                      }}
                      className="px-3.5 py-3 rounded-xl bg-[#0d1420] hover:bg-[#1a2230] text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      title={isIt ? 'Salva questi articoli e quantità come modello riutilizzabile' : 'Save these items and quantities as reusable template'}
                    >
                      <BookmarkPlus className="w-4 h-4 text-sky-400" />
                      <span className="hidden sm:inline">{isIt ? 'Salva Modello' : 'Save Template'}</span>
                    </button>

                    <button
                      id="proceed-to-order-form-btn"
                      onClick={handleProceedToForm}
                      className="flex-1 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60"
                    >
                      <span>Compila Dati e Invia Ordine</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nessun pagamento online • Si paga alla consegna</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2: FORM COMPILATION (AZIENDA O PRIVATO) */}
          {step === 'form' && (
            <form onSubmit={handleSendOrderRequest} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
                
                {/* 1. SELEZIONE TIPO UTENTE (AZIENDA / PRIVATO) */}
                <div className="bg-[#0d1420] border border-[#1c2433] rounded-2xl p-3.5">
                  <label className="block text-slate-400 font-bold mb-2">
                    Tipologia Intestatario Ordine:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="customer-type-company-btn"
                      onClick={() => setCustomerType('azienda')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        customerType === 'azienda'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/60 shadow-xs'
                          : 'bg-[#0d1420] text-slate-500 border-[#1c2433] hover:text-white'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-sky-400" />
                      <span>Azienda / P.IVA</span>
                    </button>

                    <button
                      type="button"
                      id="customer-type-private-btn"
                      onClick={() => setCustomerType('privato')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        customerType === 'privato'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/60 shadow-xs'
                          : 'bg-[#0d1420] text-slate-500 border-[#1c2433] hover:text-white'
                      }`}
                    >
                      <User className="w-4 h-4 text-emerald-400" />
                      <span>Privato / Privata</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {customerType === 'azienda'
                      ? `✓ Attività: ${vatPercent > 0 ? `prezzi con IVA ${vatPercent}%` : 'prezzi senza IVA'} (P.IVA obbligatoria)`
                      : '✓ Privato: prezzi senza IVA (codice fiscale obbligatorio)'}
                  </p>
                </div>

                {/* 2. DATI INTESTAZIONE */}
                <div className="bg-[#0d1420] border border-[#1c2433] rounded-2xl p-3.5 space-y-3">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    {customerType === 'azienda' ? <Building2 className="w-3.5 h-3.5 text-sky-400" /> : <User className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{customerType === 'azienda' ? 'Dati Azienda / Società' : 'Dati Anagrafici Privato'}</span>
                  </h4>

                  {customerType === 'azienda' ? (
                    <>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Ragione Sociale / Denominazione *</label>
                        <input
                          type="text"
                          id="company-name-input"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="es. Rossi & Figli S.r.l."
                          className={`w-full bg-[#0d1420] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                            formErrors.companyName ? 'border-rose-500' : 'border-[#1c2433]'
                          }`}
                        />
                        {formErrors.companyName && <span className="text-[10px] text-rose-400">{formErrors.companyName}</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Partita IVA *</label>
                          <input
                            type="text"
                            id="vat-number-input"
                            value={vatNumber}
                            onChange={(e) => setVatNumber(e.target.value)}
                            placeholder="es. IT01234567890"
                            className={`w-full bg-[#0d1420] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                              formErrors.vatNumber ? 'border-rose-500' : 'border-[#1c2433]'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Codice SDI / PEC</label>
                          <input
                            type="text"
                            id="sdi-code-input"
                            value={sdiCode}
                            onChange={(e) => setSdiCode(e.target.value)}
                            placeholder="es. codice SDI (7 caratteri) o PEC"
                            className="w-full bg-[#0d1420] border border-[#1c2433] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Codice Fiscale *</label>
                      <input
                        type="text"
                        id="fiscal-code-input"
                        value={fiscalCode}
                        onChange={(e) => setFiscalCode(e.target.value.toUpperCase())}
                        placeholder="es. RSSMRA80A01H501U"
                        className={`w-full bg-[#0d1420] border rounded-xl px-3 py-2 text-white uppercase placeholder-slate-500 focus:outline-none focus:border-emerald-400 ${
                          formErrors.fiscalCode ? 'border-rose-500' : 'border-[#1c2433]'
                        }`}
                      />
                      {formErrors.fiscalCode && <span className="text-[10px] text-rose-400">{formErrors.fiscalCode}</span>}
                    </div>
                  )}

                  {/* Nome Referente / Contatti */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {customerType === 'azienda' ? 'Nome Referente / Ufficio Acquisti *' : 'Nome e Cognome *'}
                    </label>
                    <input
                      type="text"
                      id="full-name-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="es. Mario Rossi"
                      className={`w-full bg-[#0d1420] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                        formErrors.fullName ? 'border-rose-500' : 'border-[#1c2433]'
                      }`}
                    />
                    {formErrors.fullName && <span className="text-[10px] text-rose-400">{formErrors.fullName}</span>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">E-mail per Notifica & Conferma *</label>
                      <input
                        type="email"
                        id="email-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nome@dominio.it"
                        className={`w-full bg-[#0d1420] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                          formErrors.email ? 'border-rose-500' : 'border-[#1c2433]'
                        }`}
                      />
                      {formErrors.email && <span className="text-[10px] text-rose-400">{formErrors.email}</span>}
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Telefono (per il corriere) *</label>
                      <input
                        type="tel"
                        id="phone-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+39 ..."
                        className={`w-full bg-[#0d1420] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                          formErrors.phone ? 'border-rose-500' : 'border-[#1c2433]'
                        }`}
                      />
                      {formErrors.phone && <span className="text-[10px] text-rose-400">{formErrors.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* 3. MODALITA CONSEGNA / RITIRO */}
                <div className="bg-[#0d1420] border border-[#1c2433] rounded-2xl p-3.5 space-y-3">
                  <label className="block text-slate-400 font-bold mb-1">
                    Modalità di Consegna / Ricezione Merci:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="delivery-courier-btn"
                      onClick={() => setDeliveryOption('corriere')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        deliveryOption === 'corriere'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/60 shadow-xs'
                          : 'bg-[#0d1420] text-slate-500 border-[#1c2433] hover:text-white'
                      }`}
                    >
                      <Truck className="w-4 h-4 text-sky-400" />
                      <span>Spedizione Corriere</span>
                    </button>

                    <button
                      type="button"
                      id="delivery-pickup-btn"
                      onClick={() => setDeliveryOption('ritiro_sede')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        deliveryOption === 'ritiro_sede'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/60 shadow-xs'
                          : 'bg-[#0d1420] text-slate-500 border-[#1c2433] hover:text-white'
                      }`}
                    >
                      <Store className="w-4 h-4 text-amber-400" />
                      <span>Ritiro in Sede</span>
                    </button>
                  </div>

                  {deliveryOption === 'corriere' ? (
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Indirizzo di Spedizione (Via / Piazza e N. Civico) *</label>
                        <input
                          type="text"
                          id="street-input"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="es. Via Roma 12"
                          className={`w-full bg-[#0d1420] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                            formErrors.street ? 'border-rose-500' : 'border-[#1c2433]'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[11px] text-slate-400 mb-1">CAP *</label>
                          <input
                            type="text"
                            id="postal-code-input"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="00100"
                            className="w-full bg-[#0d1420] border border-[#1c2433] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[11px] text-slate-400 mb-1">Città *</label>
                          <input
                            type="text"
                            id="city-input"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Roma"
                            className="w-full bg-[#0d1420] border border-[#1c2433] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[11px] text-slate-400 mb-1">Prov. *</label>
                          <input
                            type="text"
                            id="province-input"
                            value={province}
                            onChange={(e) => setProvince(e.target.value.toUpperCase())}
                            placeholder="RM"
                            maxLength={2}
                            className="w-full bg-[#0d1420] border border-[#1c2433] rounded-xl px-3 py-2 text-white uppercase placeholder-slate-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Note per il Corriere / Scarico Colli</label>
                        <input
                          type="text"
                          id="delivery-notes-input"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="es. Presenza sponda idraulica, orario 09:00 - 13:00"
                          className="w-full bg-[#0d1420] border border-[#1c2433] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#0d1420] border border-amber-500/30 text-amber-200/90 text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-amber-300">
                        <Store className="w-3.5 h-3.5" />
                        <span>Ritiro presso la sede Aurora</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Ti confermeremo indirizzo e orari di ritiro via e-mail o telefono dopo aver ricevuto l'ordine.
                      </p>
                      <p className="text-[10px] text-slate-400 pt-1">
                        Riceverai un'e-mail appena la merce sarà preparata per il ritiro.
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. MODALITA DI PAGAMENTO: SOLO ALLA CONSEGNA */}
                <div className="bg-[#0d1420] border border-[#1c2433] rounded-2xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-300 font-bold">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Modalità di pagamento:</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    ✓ Pagamento alla consegna. Nessun pagamento online e nessun addebito con carta.
                  </p>
                </div>
              </div>

              {/* Form Footer */}
              <div className="p-4 sm:p-5 border-t border-[#1c2433] bg-[#0d1420] space-y-3">
                {sendError && (
                  <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 text-xs leading-relaxed">
                    {sendError}
                    {failedOrder && <OrderSendFallback order={failedOrder} />}
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">
                    {isAzienda && vatPercent > 0 ? `Totale Fornitura (IVA ${vatPercent}% inc.):` : 'Totale Ordine:'}
                  </span>
                  <span className={`text-base font-bold font-mono ${isAzienda ? 'text-sky-400' : 'text-emerald-400'}`}>
                    €{total.toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    id="back-to-cart-items-btn"
                    onClick={() => setStep('cart')}
                    className="px-4 py-3 rounded-xl bg-[#0d1420] hover:bg-[#1a2230] text-slate-400 text-xs font-bold transition-colors"
                  >
                    Indietro
                  </button>

                  <button
                    type="submit"
                    id="confirm-send-order-email-btn"
                    disabled={isSending}
                    className="flex-1 bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-60 disabled:cursor-wait text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'Invio in corso…' : `Invia Richiesta Ordine (${items.reduce((acc, i) => acc + i.quantity, 0)} colli)`}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION STATE */}
          {step === 'success' && (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center overflow-y-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h4 className="text-xl font-bold text-white mb-1.5">Richiesta Ordine Inviata!</h4>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm mb-3">
                Il tuo ordine è stato inviato ad Aurora. Ti contatteremo presto al recapito indicato (<strong className="text-sky-300">{email}</strong>) per confermare consegna e pagamento.
              </p>

              <div className="bg-[#0d1420] border border-[#1c2433] rounded-2xl p-4 w-full text-left space-y-2 mb-4 text-xs">
                <div className="flex justify-between border-b border-[#1c2433] pb-2">
                  <span className="text-slate-400">Codice Ordine:</span>
                  <span className="font-mono text-sky-400 font-bold">{lastSubmittedOrder?.id}</span>
                </div>
                <div className="flex justify-between border-b border-[#1c2433] pb-2">
                  <span className="text-slate-400">Intestatario:</span>
                  <span className="text-white font-medium">
                    {lastSubmittedOrder?.shippingAddress?.companyName || lastSubmittedOrder?.shippingAddress?.recipient}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#1c2433] pb-2">
                  <span className="text-slate-400">Modalità Consegna:</span>
                  <span className="text-slate-300">
                    {lastSubmittedOrder?.shippingAddress?.deliveryOption === 'ritiro_sede' ? 'Ritiro in Sede' : 'Spedizione Corriere'}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">Totale Documento:</span>
                  <span className="text-sky-400 font-bold font-mono">€{lastSubmittedOrder?.total.toFixed(2)}</span>
                </div>
              </div>

              <button
                id="close-order-success-btn"
                type="button"
                onClick={handleCompleteAndClose}
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors"
              >
                Torna al Catalogo Prodotti
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Order Template Modal */}
      <OrderTemplateModal
        isOpen={isTemplateModalOpen}
        initialMode={templateModalMode}
        onClose={() => setIsTemplateModalOpen(false)}
        cartItems={items}
        onApplyTemplate={(template, mode) => {
          if (onApplyTemplate) {
            onApplyTemplate(template, mode);
          }
          setTemplateFeedbackMsg(
            isIt
              ? `Modello "${template.name}" caricato nel carrello!`
              : `Template "${template.name}" loaded into cart!`
          );
          setTimeout(() => setTemplateFeedbackMsg(null), 3500);
        }}
        onTemplateSaved={(template) => {
          setTemplateFeedbackMsg(
            isIt
              ? `Modello "${template.name}" salvato con successo!`
              : `Template "${template.name}" successfully saved!`
          );
          setTimeout(() => setTemplateFeedbackMsg(null), 3500);
        }}
      />
    </div>
  );
};
