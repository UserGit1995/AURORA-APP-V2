import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Sparkles, 
  Sliders, 
  Package, 
  Tag, 
  Building2, 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Check, 
  Save,
  Users,
  Settings,
  DollarSign
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { ProductEditModal } from './ProductEditModal';
import { OrderEditModal } from './OrderEditModal';
import { ProductImageUploader } from './ProductImageUploader';
import { SubcategoryManager } from './SubcategoryManager';
import { ImageImportTool } from './ImageImportTool';
import { Product, Order, Category } from '../types';

interface AdminControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    isAdmin,
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
    loginAsAdmin,
    logout,
  } = useAdmin();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'categories' | 'subcategories' | 'images' | 'settings' | 'user'>('products');
  
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-5xl bg-[#050b17] border-2 border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top SuperAdmin Banner */}
        <div className="p-4 sm:p-5 border-b border-amber-500/30 bg-gradient-to-r from-[#0a152e] via-[#102347] to-[#0a152e] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xl shadow-lg shadow-amber-950/50 shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10.5px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> SuperAdmin Unlimited Root
                </span>
                {isSupabaseConnected ? (
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Supabase Cloud Sync Attivo
                  </span>
                ) : (
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Storage Mode Locale
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  Utente: <strong className="text-white">{currentUser?.name}</strong> ({currentUser?.role})
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                Pannello di Controllo & Modifica Totale Sistema
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSupabaseConnected && (
              <button
                type="button"
                onClick={async () => {
                  setIsRefreshing(true);
                  await refreshFromCloud();
                  setTimeout(() => setIsRefreshing(false), 500);
                }}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition-all flex items-center gap-1"
                title="Sincronizza e scarica dati da Supabase"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isRefreshing ? 'Sincronizzazione...' : 'Sync Cloud'}</span>
              </button>
            )}
            <button
              onClick={resetToDefaults}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1"
              title="Ripristina valori originali del database di test"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset Dati</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-[#0d1c38] text-slate-400 hover:text-white border border-[#1b345b] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-[#122340] bg-[#071122] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4 text-amber-400" />
            <span>Prodotti & Prezzi ({productsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Ordini & Stati ({ordersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'categories'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4 text-amber-400" />
            <span>Categorie Catalogo ({categoriesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subcategories')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'subcategories'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4 text-amber-400" />
            <span>Sottocategorie ({subcategoriesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'images'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4 text-amber-400" />
            <span>Importa Immagini</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Parametri B2B & Spedizioni</span>
          </button>
        </div>

        {/* Tab 1: Products Full Master CRUD */}
        {activeTab === 'products' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#08152b] p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Gestione Completa Catalogo Articoli
                </h3>
                <p className="text-xs text-slate-400">
                  Modifica prezzi, giacenze stock, schede tecniche e foto in tempo reale.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewProduct}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nuovo Articolo
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {productsList.map((prod) => (
                <div
                  key={prod.id}
                  className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#071329] border border-slate-800 hover:border-amber-500/30 transition-all text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={prod.image || '/logo-login.png'}
                      alt={prod.name}
                      className="w-12 h-12 rounded-xl object-cover bg-white/5 border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {prod.code}
                        </span>
                        <span className="text-[11px] text-slate-400">{prod.category}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm truncate mt-0.5">{prod.name}</h4>
                      <p className="text-[11px] text-slate-400">{prod.unit} • {prod.packageQty}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">Prezzo Listino</span>
                      <span className="text-base font-black text-amber-400 font-mono">
                        € {prod.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">Giacenza</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        prod.stock <= (prod.lowStockThreshold || 20)
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {prod.stock} pz
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditProduct(prod)}
                      className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Modifica
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Orders Full Master CRUD */}
        {activeTab === 'orders' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-left">
            <div className="bg-[#08152b] p-4 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Gestione Master Ordini & Tracciabilità
              </h3>
              <p className="text-xs text-slate-400">
                Cambia stato di spedizione, assegna corriere/tracking e modifica le quantità degli ordini dei clienti.
              </p>
            </div>

            <div className="space-y-3">
              {ordersList.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-[#071329] border border-slate-800 hover:border-amber-500/30 transition-all text-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">#{ord.id}</span>
                      <span className="text-slate-400">• {ord.date}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10.5px] ${
                        ord.status === 'Consegnato'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : ord.status === 'Spedito'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : ord.status === 'Annullato'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {ord.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-amber-400 font-mono">
                        € {ord.total.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditOrder(ord)}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Modifica Ordine
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Destinatario:</span>
                      <p className="font-semibold text-white">
                        {ord.shippingAddress?.companyName || ord.shippingAddress?.recipient || 'Cliente B2B'}
                      </p>
                      <p className="text-slate-400 truncate">{ord.shippingAddress?.street}, {ord.shippingAddress?.city}</p>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Logistica & Tracking:</span>
                      <p className="font-semibold text-sky-300">{ord.courier || 'Da assegnare'}</p>
                      <p className="font-mono text-slate-400">{ord.trackingNumber || 'Nessun tracking'}</p>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Articoli ({ord.itemsCount} pz):</span>
                      <p className="truncate text-slate-300">
                        {ord.items.map((i) => `${i.qty}x ${i.productName}`).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Categories CRUD */}
        {activeTab === 'categories' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left">
            {/* Create Category Form */}
            <form onSubmit={handleAddCategory} className="bg-[#08152b] p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Aggiungi Nuova Categoria Merceologica
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nome Categoria (es. Disinfezione Ospedaliera)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
                <input
                  type="text"
                  placeholder="Descrizione breve"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Crea Categoria
              </button>
            </form>

            {/* Categories List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoriesList.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl bg-[#071329] border border-slate-800 space-y-2 text-xs"
                >
                  {editingCategoryId === cat.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="w-full bg-[#0c1c38] border border-amber-400 rounded-lg px-2 py-1 text-white text-xs"
                      />
                      <input
                        type="text"
                        value={editCategoryDesc}
                        onChange={(e) => setEditCategoryDesc(e.target.value)}
                        className="w-full bg-[#0c1c38] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                      />
                      <ProductImageUploader
                        currentImage={editCategoryImage || cat.image || '/logo-login.png'}
                        onImageChange={(img) => setEditCategoryImage(img)}
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveCategory(cat.id)}
                          className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Salva
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategoryId(null)}
                          className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                        >
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
                          className="w-9 h-9 rounded-lg object-contain bg-white/5 border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{cat.name}</h4>
                          <p className="text-[11px] text-slate-400 truncate">{cat.description}</p>
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
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                          title="Modifica"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Eliminare categoria ${cat.name}?`)) {
                              deleteCategory(cat.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
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
        {activeTab === 'subcategories' && <SubcategoryManager />}

        {/* Tab: Importa Immagini */}
        {activeTab === 'images' && <ImageImportTool />}

        {/* Tab 4: System B2B Settings */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left text-sm">
            <div className="bg-[#08152b] p-4 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Parametri Aziendali e Soglie Commerciali
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Ragione Sociale Azienda
                  </label>
                  <input
                    type="text"
                    value={settingsForm.companyName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })}
                    className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Email di Contatto / Ordini
                  </label>
                  <input
                    type="email"
                    value={settingsForm.contactEmail}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                    className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Partita IVA
                  </label>
                  <input
                    type="text"
                    value={settingsForm.vatNumber}
                    onChange={(e) => setSettingsForm({ ...settingsForm, vatNumber: e.target.value })}
                    className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Codice Univoco SDI
                  </label>
                  <input
                    type="text"
                    value={settingsForm.sdiCode}
                    onChange={(e) => setSettingsForm({ ...settingsForm, sdiCode: e.target.value })}
                    className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Soglia Spedizione Gratuita (€)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={settingsForm.freeShippingThresholdEur}
                    onChange={(e) => setSettingsForm({ ...settingsForm, freeShippingThresholdEur: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Costo Spedizione Standard (€)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={settingsForm.standardShippingEur}
                    onChange={(e) => setSettingsForm({ ...settingsForm, standardShippingEur: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Testo Banner Annunci in Evidenza
                  </label>
                  <input
                    type="text"
                    value={settingsForm.announcementBannerText}
                    onChange={(e) => setSettingsForm({ ...settingsForm, announcementBannerText: e.target.value })}
                    className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {settingsSaved && (
                <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Impostazioni aggiornate!
                </span>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Salva Parametri
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
