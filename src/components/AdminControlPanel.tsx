import React, { useState, useMemo } from 'react';
import {
  X,
  Cloud,
  CloudOff,
  Package,
  ListOrdered,
  FolderTree,
  Image as ImageIcon,
  SlidersHorizontal,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
  Check,
  Save,
  Search,
  XCircle,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { ProductEditModal } from './ProductEditModal';
import { OrderEditModal } from './OrderEditModal';
import { ProductImageUploader } from './ProductImageUploader';
import { SubcategoryManager } from './SubcategoryManager';
import { ImageImportTool } from './ImageImportTool';
import { Product, Order } from '../types';

interface AdminControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Stessa struttura/logica di sempre: qui cambia solo l'aspetto — via gradienti,
// scritte tutte maiuscole e badge finti, dentro una gerarchia visiva più semplice
// da leggere: un solo colore d'accento (indigo), colori di stato usati solo dove
// hanno un vero significato (stock basso, ordine spedito, ecc.).
const TAB_BUTTON = (active: boolean) =>
  `flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
    active ? 'border-indigo-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
  }`;

const PANEL_CARD = 'bg-[#111826] border border-[#232b3a] rounded-2xl';
const INPUT = 'bg-[#0b111c] border border-[#232b3a] rounded-lg px-3.5 py-2 text-white text-sm outline-none focus:border-indigo-400/60 transition-colors';
const LABEL = 'block text-xs font-medium text-slate-400 mb-1';
const BTN_PRIMARY = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer';
const BTN_SECONDARY = 'px-3 py-1.5 rounded-lg bg-[#1a2230] hover:bg-[#212b3c] text-slate-300 text-sm font-medium border border-[#2a3444] transition-colors flex items-center gap-1.5';
const ICON_BTN = 'p-1.5 rounded-lg bg-[#1a2230] text-slate-400 hover:text-white transition-colors';
const ICON_BTN_DANGER = 'p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors';

export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    isSupabaseConnected,
    productsList,
    categoriesList,
    subcategoriesList,
    ordersList,
    systemSettings,
    updateSystemSettings,
    updateCategory,
    addCategory,
    deleteCategory,
    resetToDefaults,
    refreshFromCloud,
  } = useAdmin();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'categories' | 'subcategories' | 'images' | 'settings'>('products');
  const [productSearch, setProductSearch] = useState('');

  // Ricerca articoli nel pannello admin: nome, codice/SKU, categoria, marca/tipologia.
  const filteredAdminProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return productsList;
    return productsList.filter((p) => {
      return (
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.subCategoryName?.toLowerCase().includes(q) ||
        p.subSubCategoryName?.toLowerCase().includes(q)
      );
    });
  }, [productsList, productSearch]);

  // Modals inside admin
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Category Edit State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImage, setNewCatImage] = useState('/logo-login.png');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');
  const [editCategoryImage, setEditCategoryImage] = useState('');

  // Settings State Form
  const [settingsForm, setSettingsForm] = useState(systemSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  React.useEffect(() => {
    setSettingsForm(systemSettings);
  }, [systemSettings]);

  if (!isOpen) return null;

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleOpenEditOrder = (ord: Order) => {
    setEditingOrder(ord);
    setIsOrderModalOpen(true);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory({
      name: newCatName.trim(),
      description: newCatDesc.trim() || 'Forniture e detergenti professionali',
      count: '0 prodotti',
      countNumber: 0,
      image: newCatImage || '/logo-login.png',
    });
    setNewCatName('');
    setNewCatDesc('');
    setNewCatImage('/logo-login.png');
  };

  const handleSaveCategory = (catId: string) => {
    const existing = categoriesList.find((c) => c.id === catId);
    if (!existing) return;
    updateCategory({
      ...existing,
      name: editCategoryName || existing.name,
      description: editCategoryDesc || existing.description,
      image: editCategoryImage || existing.image || '/logo-login.png',
    });
    setEditingCategoryId(null);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemSettings(settingsForm);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-5xl bg-[#0b0f17] border border-[#232b3a] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1c2433] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Pannello di gestione
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="truncate">{currentUser?.name} · {currentUser?.role}</span>
                <span className="text-slate-600">•</span>
                {isSupabaseConnected ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Cloud className="w-3.5 h-3.5" /> Cloud connesso
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-500">
                    <CloudOff className="w-3.5 h-3.5" /> Modalità locale
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSupabaseConnected && (
              <button
                type="button"
                onClick={async () => {
                  setIsRefreshing(true);
                  await refreshFromCloud();
                  setTimeout(() => setIsRefreshing(false), 500);
                }}
                disabled={isRefreshing}
                className={BTN_SECONDARY}
                title="Sincronizza e scarica dati da Supabase"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isRefreshing ? 'Sincronizzo…' : 'Aggiorna dati'}</span>
              </button>
            )}
            <button
              onClick={resetToDefaults}
              className={BTN_SECONDARY}
              title="Ripristina i valori originali del database di test"
            >
              <span className="hidden md:inline">Ripristina dati di test</span>
              <span className="md:hidden">Ripristina</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-[#1a2230] text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector Navigation */}
        <div className="px-4 sm:px-6 border-b border-[#1c2433] bg-[#0b0f17] flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          <button type="button" onClick={() => setActiveTab('products')} className={TAB_BUTTON(activeTab === 'products')}>
            <Package className="w-4 h-4" />
            <span>Prodotti ({productsList.length})</span>
          </button>
          <button type="button" onClick={() => setActiveTab('orders')} className={TAB_BUTTON(activeTab === 'orders')}>
            <ListOrdered className="w-4 h-4" />
            <span>Ordini ({ordersList.length})</span>
          </button>
          <button type="button" onClick={() => setActiveTab('categories')} className={TAB_BUTTON(activeTab === 'categories')}>
            <FolderTree className="w-4 h-4" />
            <span>Categorie ({categoriesList.length})</span>
          </button>
          <button type="button" onClick={() => setActiveTab('subcategories')} className={TAB_BUTTON(activeTab === 'subcategories')}>
            <FolderTree className="w-4 h-4" />
            <span>Sottocategorie ({subcategoriesList.length})</span>
          </button>
          <button type="button" onClick={() => setActiveTab('images')} className={TAB_BUTTON(activeTab === 'images')}>
            <ImageIcon className="w-4 h-4" />
            <span>Immagini</span>
          </button>
          <button type="button" onClick={() => setActiveTab('settings')} className={TAB_BUTTON(activeTab === 'settings')}>
            <SlidersHorizontal className="w-4 h-4" />
            <span>Parametri</span>
          </button>
        </div>

        {/* Tab: Prodotti */}
        {activeTab === 'products' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-left">
            <div className={`flex flex-wrap items-center justify-between gap-3 ${PANEL_CARD} p-4`}>
              <div>
                <h3 className="text-sm font-semibold text-white">Catalogo articoli</h3>
                <p className="text-xs text-slate-400">Modifica prezzi, giacenze, schede tecniche e foto.</p>
              </div>
              <button type="button" onClick={handleOpenNewProduct} className={BTN_PRIMARY}>
                <Plus className="w-4 h-4" />
                Nuovo articolo
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Cerca per nome, codice/SKU, categoria o marca..."
                className={`w-full pl-10 pr-9 py-2.5 ${INPUT}`}
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  aria-label="Cancella ricerca"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            {productSearch && (
              <p className="text-xs text-slate-500 -mt-1">
                {filteredAdminProducts.length} articol{filteredAdminProducts.length === 1 ? 'o trovato' : 'i trovati'} su {productsList.length}
              </p>
            )}

            <div className="grid grid-cols-1 gap-2">
              {filteredAdminProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 rounded-xl bg-[#111826] border border-[#1c2433] hover:border-[#2f3b50] transition-colors text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={prod.image || '/logo-login.png'}
                      alt={prod.name}
                      className="w-11 h-11 rounded-lg object-cover bg-white/5 border border-[#232b3a] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">{prod.code}</span>
                        <span className="text-[11px] text-slate-500">{prod.category}</span>
                      </div>
                      <h4 className="font-semibold text-white truncate">{prod.name}</h4>
                      <p className="text-xs text-slate-400">{prod.unit} • {prod.packageQty}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Prezzo</span>
                      <span className="text-sm font-bold text-white font-mono">€ {prod.price.toFixed(2)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Giacenza</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        prod.stock <= (prod.lowStockThreshold || 20)
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}>
                        {prod.stock} pz
                      </span>
                    </div>

                    <button type="button" onClick={() => handleOpenEditProduct(prod)} className={BTN_SECONDARY}>
                      <Edit3 className="w-3.5 h-3.5" />
                      Modifica
                    </button>
                  </div>
                </div>
              ))}
              {filteredAdminProducts.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">Nessun articolo trovato per questa ricerca.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab: Ordini */}
        {activeTab === 'orders' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-left">
            <div className={`${PANEL_CARD} p-4`}>
              <h3 className="text-sm font-semibold text-white">Ordini e tracciabilità</h3>
              <p className="text-xs text-slate-400">Cambia lo stato di spedizione, assegna corriere/tracking e modifica le quantità.</p>
            </div>

            <div className="space-y-2">
              {ordersList.map((ord) => (
                <div key={ord.id} className="p-4 rounded-xl bg-[#111826] border border-[#1c2433] hover:border-[#2f3b50] transition-colors text-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2433] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-white">#{ord.id}</span>
                      <span className="text-slate-500">• {ord.date}</span>
                      <span className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${
                        ord.status === 'Consegnato'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : ord.status === 'Spedito'
                          ? 'bg-sky-500/15 text-sky-300'
                          : ord.status === 'Annullato'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}>
                        {ord.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white font-mono">€ {ord.total.toFixed(2)}</span>
                      <button type="button" onClick={() => handleOpenEditOrder(ord)} className={BTN_SECONDARY}>
                        <Edit3 className="w-3.5 h-3.5" />
                        Modifica
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300 text-xs">
                    <div>
                      <span className="text-slate-500 block">Destinatario</span>
                      <p className="font-medium text-white">{ord.shippingAddress?.companyName || ord.shippingAddress?.recipient || 'Cliente B2B'}</p>
                      <p className="text-slate-400 truncate">{ord.shippingAddress?.street}, {ord.shippingAddress?.city}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Logistica</span>
                      <p className="font-medium text-sky-300">{ord.courier || 'Da assegnare'}</p>
                      <p className="font-mono text-slate-400">{ord.trackingNumber || 'Nessun tracking'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Articoli ({ord.itemsCount} pz)</span>
                      <p className="truncate text-slate-300">{ord.items.map((i) => `${i.qty}x ${i.productName}`).join(', ')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Categorie */}
        {activeTab === 'categories' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left">
            <form onSubmit={handleAddCategory} className={`${PANEL_CARD} p-4 space-y-3`}>
              <h3 className="text-sm font-semibold text-white">Nuova categoria</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nome categoria (es. Disinfezione ospedaliera)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className={INPUT}
                />
                <input
                  type="text"
                  placeholder="Descrizione breve"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className={INPUT}
                />
              </div>
              <button type="submit" className={BTN_PRIMARY}>
                <Plus className="w-3.5 h-3.5" />
                Crea categoria
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoriesList.map((cat) => (
                <div key={cat.id} className="p-3.5 rounded-xl bg-[#111826] border border-[#1c2433] space-y-2 text-sm">
                  {editingCategoryId === cat.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className={`w-full ${INPUT} border-indigo-400/60`}
                      />
                      <input
                        type="text"
                        value={editCategoryDesc}
                        onChange={(e) => setEditCategoryDesc(e.target.value)}
                        className={`w-full ${INPUT}`}
                      />
                      <ProductImageUploader
                        currentImage={editCategoryImage || cat.image || '/logo-login.png'}
                        onImageChange={(img) => setEditCategoryImage(img)}
                      />
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => handleSaveCategory(cat.id)} className={`${BTN_PRIMARY} py-1.5 text-xs`}>
                          Salva
                        </button>
                        <button type="button" onClick={() => setEditingCategoryId(null)} className={`${BTN_SECONDARY} py-1.5 text-xs`}>
                          Annulla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={cat.image || '/logo-login.png'}
                          alt={cat.name}
                          className="w-9 h-9 rounded-lg object-contain bg-white/5 border border-[#232b3a] shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white truncate">{cat.name}</h4>
                          <p className="text-xs text-slate-400 truncate">{cat.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(cat.id);
                            setEditCategoryName(cat.name);
                            setEditCategoryDesc(cat.description || '');
                            setEditCategoryImage(cat.image || '/logo-login.png');
                          }}
                          className={ICON_BTN}
                          title="Modifica"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Eliminare la categoria "${cat.name}"?`)) deleteCategory(cat.id);
                          }}
                          className={ICON_BTN_DANGER}
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Sottocategorie */}
        {activeTab === 'subcategories' && (
          <SubcategoryManager
            onViewProducts={(query) => {
              setProductSearch(query);
              setActiveTab('products');
            }}
          />
        )}

        {/* Tab: Importa immagini */}
        {activeTab === 'images' && <ImageImportTool />}

        {/* Tab: Parametri */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left text-sm">
            <div className={`${PANEL_CARD} p-4 space-y-4`}>
              <h3 className="text-sm font-semibold text-white">Parametri aziendali e soglie commerciali</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Ragione sociale azienda</label>
                  <input
                    type="text"
                    value={settingsForm.companyName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })}
                    className={`w-full ${INPUT}`}
                  />
                </div>
                <div>
                  <label className={LABEL}>Email di contatto / ordini</label>
                  <input
                    type="email"
                    value={settingsForm.contactEmail}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                    className={`w-full ${INPUT}`}
                  />
                </div>
                <div>
                  <label className={LABEL}>Partita IVA</label>
                  <input
                    type="text"
                    value={settingsForm.vatNumber}
                    onChange={(e) => setSettingsForm({ ...settingsForm, vatNumber: e.target.value })}
                    className={`w-full ${INPUT} font-mono`}
                  />
                </div>
                <div>
                  <label className={LABEL}>Codice univoco SDI</label>
                  <input
                    type="text"
                    value={settingsForm.sdiCode}
                    onChange={(e) => setSettingsForm({ ...settingsForm, sdiCode: e.target.value })}
                    className={`w-full ${INPUT} font-mono`}
                  />
                </div>
                <div>
                  <label className={LABEL}>Soglia spedizione gratuita (€)</label>
                  <input
                    type="number"
                    step="1"
                    value={settingsForm.freeShippingThresholdEur}
                    onChange={(e) => setSettingsForm({ ...settingsForm, freeShippingThresholdEur: parseFloat(e.target.value) || 0 })}
                    className={`w-full ${INPUT}`}
                  />
                </div>
                <div>
                  <label className={LABEL}>Costo spedizione standard (€)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={settingsForm.standardShippingEur}
                    onChange={(e) => setSettingsForm({ ...settingsForm, standardShippingEur: parseFloat(e.target.value) || 0 })}
                    className={`w-full ${INPUT}`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Testo banner annunci in evidenza</label>
                  <input
                    type="text"
                    value={settingsForm.announcementBannerText}
                    onChange={(e) => setSettingsForm({ ...settingsForm, announcementBannerText: e.target.value })}
                    className={`w-full ${INPUT}`}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {settingsSaved && (
                <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" /> Impostazioni aggiornate
                </span>
              )}
              <button type="submit" className={BTN_PRIMARY}>
                <Save className="w-4 h-4" />
                Salva parametri
              </button>
            </div>
          </form>
        )}

        {/* Sub-modals for Product & Order Editing */}
        {isProductModalOpen && (
          <ProductEditModal
            isOpen={isProductModalOpen}
            product={editingProduct}
            categories={categoriesList}
            onClose={() => {
              setIsProductModalOpen(false);
              setEditingProduct(null);
            }}
          />
        )}

        {isOrderModalOpen && (
          <OrderEditModal
            isOpen={isOrderModalOpen}
            order={editingOrder}
            products={productsList}
            onClose={() => {
              setIsOrderModalOpen(false);
              setEditingOrder(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
