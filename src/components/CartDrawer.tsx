import React, { useState, useMemo } from 'react';
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
import { PRESET_ORDER_TEMPLATES } from '../data/orderTemplates';
import { PRODUCTS } from '../data/catalog';
import { useLanguage } from '../context/LanguageContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckoutSuccess?: (order: Order) => void;
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

  // Step in checkout: 'cart' -> 'form' -> 'success'
  const [step, setStep] = useState<'cart' | 'form' | 'success'>('cart');
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState<Order | null>(null);

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateModalMode, setTemplateModalMode] = useState<'save' | 'load'>('load');
  const [templateFeedbackMsg, setTemplateFeedbackMsg] = useState<string | null>(null);

  // Form State
  const [customerType, setCustomerType] = useState<CustomerType>('azienda');
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('corriere');

  
  // Fields
  const [companyName, setCompanyName] = useState('AURORA Retail & Facility Service S.r.l.');
  const [vatNumber, setVatNumber] = useState('IT09876543210');
  const [sdiCode, setSdiCode] = useState('AUR789K');
  
  // Private / Common Fields
  const [fullName, setFullName] = useState('Simone Aricò');
  const [fiscalCode, setFiscalCode] = useState('RCISMN85T10F205Z');
  const [email, setEmail] = useState('simonearico10@gmail.com');
  const [phone, setPhone] = useState('+39 340 1234567');
  
  // Delivery Address
  const [street, setStreet] = useState('Via dell\'Industria 45, Palazzina B');
  const [city, setCity] = useState('Milano');
  const [province, setProvince] = useState('MI');
  const [postalCode, setPostalCode] = useState('20145');
  const [deliveryNotes, setDeliveryNotes] = useState('Consegna standard con orario magazzino.');

  // Form Validation Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const vat = subtotal * 0.22;
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

  const handleSendOrderRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const orderId = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: orderId,
      date: 'Oggi',
      status: 'In elaborazione',
      estimatedDelivery: deliveryOption === 'ritiro_sede' 
        ? 'Pronto per il ritiro in sede (entro 24h)' 
        : 'Spedizione programmata in 24/48h',
      courier: deliveryOption === 'ritiro_sede' 
        ? 'Ritiro diretto presso Magazzino Aurora' 
        : 'GLS Logistics Express B2B',
      trackingNumber: deliveryOption === 'ritiro_sede' 
        ? 'RITIRO-SEDE' 
        : `GLS-IT-${Math.floor(1000000 + Math.random() * 9000000)}`,
      total: total,
      subtotal: subtotal,
      vatAmount: vat,
      shippingCost: 0.00,
      paymentMethod: customerType === 'azienda' 
        ? 'Fattura B2B con Bonifico 30/60 gg d.f. / Ri.Ba.' 
        : 'Pagamento alla Consegna / Bonifico su Ricevuta',
      shippingAddress: {
        customerType: customerType,
        companyName: customerType === 'azienda' ? companyName : undefined,
        recipient: fullName,
        email: email,
        phone: phone,
        street: deliveryOption === 'ritiro_sede' ? 'Ritiro Sede Centrale Aurora - Via dell\'Industria 45' : street,
        city: deliveryOption === 'ritiro_sede' ? 'Milano' : city,
        province: deliveryOption === 'ritiro_sede' ? 'MI' : province,
        postalCode: deliveryOption === 'ritiro_sede' ? '20145' : postalCode,
        country: 'Italia',
        vatNumber: customerType === 'azienda' ? vatNumber : undefined,
        fiscalCode: customerType === 'privato' ? fiscalCode : undefined,
        sdiCode: customerType === 'azienda' ? sdiCode : undefined,
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

    setLastSubmittedOrder(newOrder);
    setStep('success');

    if (onCheckoutSuccess) {
      onCheckoutSuccess(newOrder);
    }
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
        <div className="w-screen max-w-lg bg-[#060e1d] border-l border-[#132746] shadow-2xl flex flex-col justify-between overflow-hidden">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#122442] flex items-center justify-between bg-[#081326]">
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
                    ? `${items.length} articoli da ordinare • Nessun pagamento con carta richiesto` 
                    : step === 'form'
                    ? 'Aziende e Privati • Fattura / Ricevuta per consegna o ritiro'
                    : `Codice: ${lastSubmittedOrder?.id || 'ORD-2026'}`}
                </p>
              </div>
            </div>
            <button
              id="close-cart-drawer-btn"
              onClick={step === 'success' ? handleCompleteAndClose : onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0f1e38] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* STEP 1: CART LIST VIEW */}
          {step === 'cart' && (
            <>
              {/* Free shipping banner */}
              <div className="px-5 py-2.5 bg-[#0a152b] border-b border-[#122442]">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">
                    {remainingForFreeShipping === 0 
                      ? '🎉 Consegna Gratuita inclusa!' 
                      : `Aggiungi €${remainingForFreeShipping.toFixed(2)} per la spedizione gratuita`}
                  </span>
                  <span className="text-sky-400 font-bold">
                    {Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#0e1d38] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Template Quick Toolbar */}
              <div className="px-4 py-2.5 bg-[#08152c] border-b border-[#122442] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    id="cart-open-templates-btn"
                    onClick={() => {
                      setTemplateModalMode('load');
                      setIsTemplateModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e2240] hover:bg-[#132d54] text-sky-300 hover:text-white border border-sky-500/30 text-xs font-semibold transition-all shadow-xs"
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-semibold transition-all shadow-xs"
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
                      className="text-emerald-400 hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Items List / Empty State */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {items.length === 0 ? (
                  <div className="space-y-5">
                    {/* Empty cart banner */}
                    <div className="py-6 flex flex-col items-center justify-center text-center text-slate-400 bg-[#050c18] border border-[#112442] rounded-2xl p-4">
                      <div className="p-3 rounded-2xl bg-[#09152b] text-slate-500 mb-2 border border-[#132542]">
                        <ShoppingBag className="w-8 h-8 stroke-1" />
                      </div>
                      <p className="text-sm font-semibold text-slate-200">{t('cart.empty', 'La lista d\'ordine è vuota')}</p>
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
                          className="text-xs text-slate-400 hover:text-white transition-colors"
                        >
                          {isIt ? 'Tutti i modelli →' : 'All templates →'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {PRESET_ORDER_TEMPLATES.slice(0, 3).map((tpl) => {
                          let totalItems = 0;
                          let totalCost = 0;
                          tpl.items.forEach((item) => {
                            const prod = PRODUCTS.find((p) => p.id === item.productId);
                            if (prod) {
                              totalItems += item.quantity;
                              totalCost += prod.price * item.quantity;
                            }
                          });

                          return (
                            <div
                              key={tpl.id}
                              className="p-3 rounded-2xl bg-[#08152c] border border-[#14284d] hover:border-sky-500/40 transition-all text-left flex items-center justify-between gap-3 group"
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
                      className="bg-[#091428] border border-[#142646] rounded-2xl p-3 flex gap-3 items-center"
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#060c17] p-1 shrink-0 flex items-center justify-center">
                        <img 
                          src={item.product.image} 
                          alt={item.product.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{item.product.name}</h4>
                        <p className="text-[11px] text-slate-400">{item.product.packageQty}</p>
                        <p className="text-xs font-bold text-sky-400 mt-1">
                          €{(item.product.price * item.quantity).toFixed(2)}
                          <span className="text-[10px] text-slate-500 font-normal ml-1">(€{item.product.price.toFixed(2)}/cad)</span>
                        </p>
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
                        <div className="flex items-center bg-[#0d1c38] border border-[#182f55] rounded-lg px-1 py-0.5">
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
                <div className="p-4 sm:p-5 border-t border-[#122442] bg-[#050c18] space-y-3">
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>Imponibile Netto:</span>
                      <span className="font-mono text-white font-medium">€{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA (22%):</span>
                      <span className="font-mono text-white font-medium">€{vat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-[#122442]">
                      <span>Totale Fornitura:</span>
                      <span className="text-sky-400 font-mono">€{total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="save-cart-template-footer-btn"
                      type="button"
                      onClick={() => {
                        setTemplateModalMode('save');
                        setIsTemplateModalOpen(true);
                      }}
                      className="px-3.5 py-3 rounded-xl bg-[#091730] hover:bg-[#0f244a] text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
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
                    <span>Nessun pagamento con carta • Ordine via E-mail / Consegna</span>
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
                <div className="bg-[#09152b] border border-[#14294d] rounded-2xl p-3.5">
                  <label className="block text-slate-300 font-bold mb-2">
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
                          : 'bg-[#060e1d] text-slate-400 border-[#142646] hover:text-white'
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
                          : 'bg-[#060e1d] text-slate-400 border-[#142646] hover:text-white'
                      }`}
                    >
                      <User className="w-4 h-4 text-emerald-400" />
                      <span>Privato / Privata</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {customerType === 'azienda'
                      ? '✓ Emette fattura elettronica B2B con Codice SDI / PEC'
                      : '✓ Emette ricevuta fiscale / fattura a privato con Codice Fiscale'}
                  </p>
                </div>

                {/* 2. DATI INTESTAZIONE */}
                <div className="bg-[#09152b] border border-[#14294d] rounded-2xl p-3.5 space-y-3">
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
                          placeholder="es. AURORA Retail & Facility Service S.r.l."
                          className={`w-full bg-[#060e1d] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                            formErrors.companyName ? 'border-rose-500' : 'border-[#14294d]'
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
                            placeholder="es. IT09876543210"
                            className={`w-full bg-[#060e1d] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                              formErrors.vatNumber ? 'border-rose-500' : 'border-[#14294d]'
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
                            placeholder="es. AUR789K o PEC"
                            className="w-full bg-[#060e1d] border border-[#14294d] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
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
                        placeholder="es. RCISMN85T10F205Z"
                        className={`w-full bg-[#060e1d] border rounded-xl px-3 py-2 text-white uppercase placeholder-slate-500 focus:outline-none focus:border-emerald-400 ${
                          formErrors.fiscalCode ? 'border-rose-500' : 'border-[#14294d]'
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
                      placeholder="es. Simone Aricò"
                      className={`w-full bg-[#060e1d] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                        formErrors.fullName ? 'border-rose-500' : 'border-[#14294d]'
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
                        className={`w-full bg-[#060e1d] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                          formErrors.email ? 'border-rose-500' : 'border-[#14294d]'
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
                        className={`w-full bg-[#060e1d] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                          formErrors.phone ? 'border-rose-500' : 'border-[#14294d]'
                        }`}
                      />
                      {formErrors.phone && <span className="text-[10px] text-rose-400">{formErrors.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* 3. MODALITA CONSEGNA / RITIRO */}
                <div className="bg-[#09152b] border border-[#14294d] rounded-2xl p-3.5 space-y-3">
                  <label className="block text-slate-300 font-bold mb-1">
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
                          : 'bg-[#060e1d] text-slate-400 border-[#142646] hover:text-white'
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
                          : 'bg-[#060e1d] text-slate-400 border-[#142646] hover:text-white'
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
                          placeholder="es. Via dell'Industria 45, Palazzina B"
                          className={`w-full bg-[#060e1d] border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 ${
                            formErrors.street ? 'border-rose-500' : 'border-[#14294d]'
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
                            placeholder="20145"
                            className="w-full bg-[#060e1d] border border-[#14294d] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[11px] text-slate-400 mb-1">Città *</label>
                          <input
                            type="text"
                            id="city-input"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Milano"
                            className="w-full bg-[#060e1d] border border-[#14294d] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[11px] text-slate-400 mb-1">Prov. *</label>
                          <input
                            type="text"
                            id="province-input"
                            value={province}
                            onChange={(e) => setProvince(e.target.value.toUpperCase())}
                            placeholder="MI"
                            maxLength={2}
                            className="w-full bg-[#060e1d] border border-[#14294d] rounded-xl px-3 py-2 text-white uppercase placeholder-slate-500 focus:outline-none"
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
                          className="w-full bg-[#060e1d] border border-[#14294d] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#060e1d] border border-amber-500/30 text-amber-200/90 text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-amber-300">
                        <Store className="w-3.5 h-3.5" />
                        <span>Punto di Ritiro Magazzino Centrale Aurora</span>
                      </p>
                      <p className="text-[11px] text-slate-300">
                        Via dell'Industria 45, 20145 Milano (MI) • Orari: Lun-Ven 08:00 - 18:00
                      </p>
                      <p className="text-[10px] text-slate-400 pt-1">
                        Riceverai un'e-mail appena la merce sarà preparata per il ritiro.
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. MODALITA DI PAGAMENTO B2B (NO CARTE DI CREDITO) */}
                <div className="bg-[#09152b] border border-[#14294d] rounded-2xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-300 font-bold">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Modalità di Pagamento Convenzionata:</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    {customerType === 'azienda'
                      ? '✓ Fatturazione B2B differita (Bonifico Bancario 30/60 gg d.f. / Ri.Ba.) senza anticipo con carta.'
                      : '✓ Pagamento alla consegna / Bonifico Bancario su ricevuta fornitura (Nessun addebito con carta online).'}
                  </p>
                </div>
              </div>

              {/* Form Footer */}
              <div className="p-4 sm:p-5 border-t border-[#122442] bg-[#050c18] space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Totale Fornitura (IVA inc.):</span>
                  <span className="text-base font-bold text-sky-400 font-mono">€{total.toFixed(2)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    id="back-to-cart-items-btn"
                    onClick={() => setStep('cart')}
                    className="px-4 py-3 rounded-xl bg-[#0e203c] hover:bg-[#152e54] text-slate-300 text-xs font-bold transition-colors"
                  >
                    Indietro
                  </button>

                  <button
                    type="submit"
                    id="confirm-send-order-email-btn"
                    className="flex-1 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60"
                  >
                    <Send className="w-4 h-4" />
                    <span>Invia Richiesta Ordine ({items.reduce((acc, i) => acc + i.quantity, 0)} colli)</span>
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
              <p className="text-slate-300 text-xs leading-relaxed max-w-sm mb-3">
                Il tuo ordine è stato registrato nel sistema logistico Aurora. Abbiamo inviato la copia di conferma via e-mail all'indirizzo <strong className="text-sky-300">{email}</strong>.
              </p>

              <div className="bg-[#09152b] border border-[#14284b] rounded-2xl p-4 w-full text-left space-y-2 mb-4 text-xs">
                <div className="flex justify-between border-b border-[#122340] pb-2">
                  <span className="text-slate-400">Codice Ordine:</span>
                  <span className="font-mono text-sky-400 font-bold">{lastSubmittedOrder?.id}</span>
                </div>
                <div className="flex justify-between border-b border-[#122340] pb-2">
                  <span className="text-slate-400">Intestatario:</span>
                  <span className="text-white font-medium">
                    {lastSubmittedOrder?.shippingAddress?.companyName || lastSubmittedOrder?.shippingAddress?.recipient}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#122340] pb-2">
                  <span className="text-slate-400">Modalità Consegna:</span>
                  <span className="text-slate-200">
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
