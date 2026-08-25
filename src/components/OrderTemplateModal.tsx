import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bookmark,
  BookmarkPlus,
  BookmarkCheck,
  RotateCw,
  Plus,
  Trash2,
  Check,
  Search,
  Sparkles,
  Layers,
  Calendar,
  Building2,
  ShoppingBag,
  Info,
  CheckCircle2,
  ArrowRight,
  Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, OrderTemplate, Product } from '../types';
import { PRODUCTS } from '../data/catalog';
import {
  getSavedTemplates,
  saveOrderTemplate,
  deleteOrderTemplate,
  PRESET_ORDER_TEMPLATES,
} from '../data/orderTemplates';
import { useLanguage } from '../context/LanguageContext';

interface OrderTemplateModalProps {
  isOpen: boolean;
  initialMode?: 'save' | 'load';
  onClose: () => void;
  cartItems: CartItem[];
  onApplyTemplate: (template: OrderTemplate, mode: 'replace' | 'merge') => void;
  onTemplateSaved?: (template: OrderTemplate) => void;
}

const POPULAR_TAGS = [
  'Settimanale',
  'Mensile',
  'Cucina & HACCP',
  'Bagni & Igiene',
  'Reception & Cura',
  'Scorta Standard',
];

export const OrderTemplateModal: React.FC<OrderTemplateModalProps> = ({
  isOpen,
  initialMode = 'load',
  onClose,
  cartItems,
  onApplyTemplate,
  onTemplateSaved,
}) => {
  const { language, t } = useLanguage();
  const isIt = language === 'it';

  const [activeTab, setActiveTab] = useState<'load' | 'save'>(initialMode);
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [loadMode, setLoadMode] = useState<'replace' | 'merge'>('replace');

  // Save form fields
  const [templateName, setTemplateName] = useState('');
  const [templateTag, setTemplateTag] = useState('Settimanale');
  const [templateDesc, setTemplateDesc] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load templates on open / tab change
  useEffect(() => {
    if (isOpen) {
      const loaded = getSavedTemplates();
      setTemplates(loaded);
      setActiveTab(initialMode);
      setSaveSuccessMsg(null);
      setDeleteConfirmId(null);

      // Auto-suggest name for save mode based on cart items
      if (cartItems.length > 0) {
        const topNames = cartItems.slice(0, 2).map((ci) => ci.product.name).join(' + ');
        const totalUnits = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);
        setTemplateName(`Rifornimento ${topNames} (${totalUnits} colli)`);
        setTemplateDesc(`Configurazione salvata con ${cartItems.length} referenze e ${totalUnits} colli.`);
      }

      if (loaded.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(loaded[0].id);
      }
    }
  }, [isOpen, initialMode, cartItems]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchSearch =
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tpl.description && tpl.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tpl.tag && tpl.tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTag =
        selectedTagFilter === 'all' ||
        (selectedTagFilter === 'custom' && !tpl.isPreset) ||
        (selectedTagFilter === 'preset' && tpl.isPreset) ||
        tpl.tag === selectedTagFilter;

      return matchSearch && matchTag;
    });
  }, [templates, searchQuery, selectedTagFilter]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || filteredTemplates[0] || null;
  }, [templates, selectedTemplateId, filteredTemplates]);

  // Calculate template stats
  const getTemplateStats = (tpl: OrderTemplate) => {
    let totalItems = 0;
    let totalCost = 0;
    const resolvedProducts: { product: Product; quantity: number }[] = [];

    tpl.items.forEach((item) => {
      const product = PRODUCTS.find((p) => p.id === item.productId);
      if (product) {
        totalItems += item.quantity;
        totalCost += product.price * item.quantity;
        resolvedProducts.push({ product, quantity: item.quantity });
      }
    });

    return { totalItems, totalCost, resolvedProducts };
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || cartItems.length === 0) return;

    const newTemplate: OrderTemplate = {
      id: `tpl-custom-${Date.now()}`,
      name: templateName.trim(),
      description: templateDesc.trim() || undefined,
      tag: templateTag || 'Personalizzato',
      isPreset: false,
      createdAt: new Date().toISOString().split('T')[0],
      items: cartItems.map((ci) => ({
        productId: ci.product.id,
        quantity: ci.quantity,
      })),
    };

    const updated = saveOrderTemplate(newTemplate);
    setTemplates(updated);
    setSelectedTemplateId(newTemplate.id);

    const success = isIt
      ? `Modello "${newTemplate.name}" salvato con successo!`
      : `Template "${newTemplate.name}" successfully saved!`;
    setSaveSuccessMsg(success);

    if (onTemplateSaved) {
      onTemplateSaved(newTemplate);
    }

    setTimeout(() => {
      setSaveSuccessMsg(null);
      setActiveTab('load');
    }, 1200);
  };

  const handleDeleteTemplate = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = deleteOrderTemplate(id);
    setTemplates(updated);
    setDeleteConfirmId(null);
    if (selectedTemplateId === id) {
      setSelectedTemplateId(updated[0]?.id || null);
    }
  };

  const handleApply = (tpl: OrderTemplate) => {
    onApplyTemplate(tpl, loadMode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-xs"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-2xl bg-[#071120] border border-[#183154] rounded-3xl shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#142848] bg-[#09152b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/25">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {isIt ? 'Modelli di Riordino B2B' : 'B2B Restock Templates'}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-500/30">
                  {templates.length} {isIt ? 'modelli' : 'templates'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isIt
                  ? 'Salva e carica configurazioni di colli ricorrenti per velocizzare le forniture'
                  : 'Save and load recurring item configurations for fast B2B reordering'}
              </p>
            </div>
          </div>

          <button
            id="close-template-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#0e203c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-5 pt-3 pb-2 bg-[#060d19] border-b border-[#132542] flex items-center gap-2">
          <button
            id="tab-load-templates-btn"
            onClick={() => setActiveTab('load')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'load'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a182e]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isIt ? 'Carica Modello Riordino' : 'Load Restock Template'}</span>
            <span className="ml-1 px-1.5 py-0.2 bg-[#0e2240] text-sky-300 rounded text-[10px]">
              {templates.length}
            </span>
          </button>

          <button
            id="tab-save-template-btn"
            onClick={() => setActiveTab('save')}
            disabled={cartItems.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              cartItems.length === 0 ? 'opacity-40 cursor-not-allowed text-slate-500' : ''
            } ${
              activeTab === 'save'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a182e]'
            }`}
            title={
              cartItems.length === 0
                ? isIt
                  ? 'Aggiungi prodotti al carrello per poterli salvare come modello'
                  : 'Add items to cart to save them as a template'
                : ''
            }
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>{isIt ? 'Salva Carrello Corrente' : 'Save Current Cart'}</span>
            {cartItems.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-500/30 rounded text-[10px]">
                {cartItems.length} {isIt ? 'art.' : 'items'}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: LOAD TEMPLATE */}
          {activeTab === 'load' && (
            <div className="space-y-4">
              {/* Search & Tag filter bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="search-template-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isIt ? 'Cerca per nome, tag o frequenza...' : 'Search by name, tag or frequency...'
                    }
                    className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Filter tags */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {[
                    { id: 'all', label: isIt ? 'Tutti' : 'All' },
                    { id: 'preset', label: isIt ? 'Preimpostati' : 'Presets' },
                    { id: 'custom', label: isIt ? 'Personalizzati' : 'Custom' },
                    { id: 'Settimanale', label: 'Settimanale' },
                    { id: 'Mensile', label: 'Mensile' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedTagFilter(filter.id)}
                      className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        selectedTagFilter === filter.id
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'bg-[#08152c] text-slate-400 hover:text-white border border-[#122544]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates Grid / Split View */}
              {filteredTemplates.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-[#050c18] border border-[#122544] rounded-2xl p-6">
                  <Bookmark className="w-10 h-10 stroke-1 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">
                    {t('cart.noTemplatesFound', 'Nessun modello trovato')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchQuery
                      ? isIt
                        ? 'Prova a modificare i termini di ricerca o i filtri.'
                        : 'Try adjusting your search terms or filters.'
                      : isIt
                      ? 'Salva la configurazione attuale del carrello per creare il tuo primo modello personalizzato.'
                      : 'Save your current cart configuration to create your first custom template.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                  {/* Left Column: Template Cards List (5 cols) */}
                  <div className="md:col-span-5 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {filteredTemplates.map((tpl) => {
                      const stats = getTemplateStats(tpl);
                      const isSelected = selectedTemplate?.id === tpl.id;

                      return (
                        <div
                          key={tpl.id}
                          id={`template-card-${tpl.id}`}
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className={`cursor-pointer rounded-2xl p-3 border transition-all text-left relative ${
                            isSelected
                              ? 'bg-sky-500/15 border-sky-500 text-white ring-1 ring-sky-500/40 shadow-md shadow-sky-950/50'
                              : 'bg-[#050c18] border-[#132542] text-slate-300 hover:border-slate-700 hover:bg-[#08152c]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-xs font-bold text-white line-clamp-1 flex items-center gap-1.5">
                              {tpl.name}
                            </h4>
                            {tpl.isPreset ? (
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-500/30">
                                B2B Predefinito
                              </span>
                            ) : (
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                                Personalizzato
                              </span>
                            )}
                          </div>

                          {tpl.tag && (
                            <div className="inline-flex items-center gap-1 text-[10px] text-sky-400 font-medium mb-1.5">
                              <Calendar className="w-3 h-3" />
                              <span>{tpl.tag}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-[#11223e]">
                            <span>
                              {stats.totalItems} {isIt ? 'colli totali' : 'units'} ({tpl.items.length} {isIt ? 'rif.' : 'items'})
                            </span>
                            <span className="font-mono text-white font-bold">
                              €{stats.totalCost.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Selected Template Detail Preview (7 cols) */}
                  {selectedTemplate && (
                    <div className="md:col-span-7 bg-[#050c18] border border-[#132542] rounded-2xl p-4 flex flex-col justify-between">
                      <div>
                        {/* Header preview */}
                        <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#122544] mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                {selectedTemplate.tag || 'B2B Restock'}
                              </span>
                              {selectedTemplate.isPreset && (
                                <span className="text-[10px] text-slate-400">
                                  {isIt ? 'Configurazione verificata Aurora' : 'Aurora certified preset'}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white">{selectedTemplate.name}</h4>
                            {selectedTemplate.description && (
                              <p className="text-xs text-slate-400 mt-1 leading-snug">
                                {selectedTemplate.description}
                              </p>
                            )}
                          </div>

                          {!selectedTemplate.isPreset && (
                            <div>
                              {deleteConfirmId === selectedTemplate.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                                    className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold px-2 py-1"
                                    title="Conferma eliminazione"
                                  >
                                    {isIt ? 'Elimina' : 'Confirm'}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="p-1 rounded bg-slate-800 text-slate-300 text-[10px] px-1.5 py-1"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(selectedTemplate.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                                  title={isIt ? 'Elimina questo modello' : 'Delete this template'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Items preview list */}
                        <div className="space-y-2 mb-4 max-h-[190px] overflow-y-auto pr-1">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                            {isIt ? 'Prodotti e Quantità Preimpostate:' : 'Pre-set Products & Quantities:'}
                          </label>

                          {getTemplateStats(selectedTemplate).resolvedProducts.map(({ product, quantity }) => (
                            <div
                              key={product.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#08152c] border border-[#112442] text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-[#050c18] p-0.5 shrink-0 flex items-center justify-center">
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-medium truncate text-xs">{product.name}</p>
                                  <p className="text-[10px] text-slate-400">{product.packageQty}</p>
                                </div>
                              </div>

                              <div className="text-right shrink-0 flex items-center gap-3">
                                <span className="font-bold px-2 py-0.5 rounded-md bg-sky-950 text-sky-300 border border-sky-500/30 text-xs">
                                  {quantity} {isIt ? 'colli' : 'units'}
                                </span>
                                <span className="font-mono text-white text-xs font-semibold">
                                  €{(product.price * quantity).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Load Mode & Action footer */}
                      <div className="pt-3 border-t border-[#122544] space-y-3">
                        {/* Option: Replace or Append */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-400">{isIt ? 'Modalità caricamento:' : 'Load Mode:'}</span>
                          <div className="flex items-center gap-1 bg-[#09152b] p-1 rounded-xl border border-[#132542]">
                            <button
                              type="button"
                              onClick={() => setLoadMode('replace')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                loadMode === 'replace'
                                  ? 'bg-sky-500 text-white shadow-xs'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {t('cart.replaceCart', 'Sostituisci carrello')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setLoadMode('merge')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                loadMode === 'merge'
                                  ? 'bg-sky-500 text-white shadow-xs'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {t('cart.mergeCart', 'Aggiungi al carrello')}
                            </button>
                          </div>
                        </div>

                        {/* Apply Button */}
                        <button
                          id="apply-template-btn"
                          onClick={() => handleApply(selectedTemplate)}
                          className="w-full bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60 transition-all hover:scale-[1.01]"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>
                            {loadMode === 'replace'
                              ? isIt
                                ? `Carica Modello (${getTemplateStats(selectedTemplate).totalItems} colli)`
                                : `Load Template (${getTemplateStats(selectedTemplate).totalItems} units)`
                              : isIt
                              ? `Aggiungi Modello al Carrello (+${getTemplateStats(selectedTemplate).totalItems} colli)`
                              : `Append Template to Cart (+${getTemplateStats(selectedTemplate).totalItems} units)`}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVE TEMPLATE FORM */}
          {activeTab === 'save' && (
            <form onSubmit={handleSaveTemplate} className="space-y-4">
              {saveSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-950/40">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold">{saveSuccessMsg}</span>
                </div>
              )}

              {/* Cart contents summary being saved */}
              <div className="bg-[#050c18] border border-[#132542] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isIt ? 'Contenuto del Carrello da Salvare:' : 'Cart Items Being Saved:'}</span>
                  </h4>
                  <span className="text-xs font-bold text-sky-300">
                    {cartItems.reduce((sum, ci) => sum + ci.quantity, 0)} {isIt ? 'colli totali' : 'total units'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {cartItems.map((ci) => (
                    <div
                      key={ci.product.id}
                      className="p-2 rounded-xl bg-[#08152c] border border-[#112442] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-sky-950 text-sky-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-sky-500/30">
                          {ci.quantity}x
                        </span>
                        <span className="text-slate-200 font-medium truncate text-xs">{ci.product.name}</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px] shrink-0">
                        €{(ci.product.price * ci.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('cart.templateName', 'Nome del Modello')} *
                  </label>
                  <input
                    type="text"
                    id="template-name-input"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    required
                    placeholder={
                      isIt
                        ? 'es. Rifornimento Settimanale Bagni & Reception'
                        : 'e.g. Weekly Restock Restrooms & Offices'
                    }
                    className="w-full bg-[#050c18] border border-[#14294d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('cart.templateCategory', 'Categoria / Frequenza')}
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {POPULAR_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTemplateTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          templateTag === tag
                            ? 'bg-sky-500 text-white shadow-xs'
                            : 'bg-[#08152c] text-slate-400 hover:text-white border border-[#132542]'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    id="template-tag-custom-input"
                    value={templateTag}
                    onChange={(e) => setTemplateTag(e.target.value)}
                    placeholder={isIt ? 'Oppure scrivi un tag personalizzato...' : 'Or enter custom tag...'}
                    className="w-full bg-[#050c18] border border-[#14294d] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('cart.templateDesc', 'Descrizione / Note')}
                  </label>
                  <textarea
                    rows={2}
                    id="template-desc-input"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder={
                      isIt
                        ? 'es. Ordine programmato per la sanificazione inizio mese.'
                        : 'e.g. Scheduled order for beginning of the month sanitization.'
                    }
                    className="w-full bg-[#050c18] border border-[#14294d] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Submit Save */}
              <div className="pt-3 border-t border-[#142848] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('load')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0e203c] text-slate-300 hover:bg-[#142d54]"
                >
                  {isIt ? 'Annulla' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  id="save-template-submit-btn"
                  disabled={!templateName.trim() || cartItems.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02]"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>{isIt ? 'Salva nel Registro Modelli' : 'Save into Template Registry'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
