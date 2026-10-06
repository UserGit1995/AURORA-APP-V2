import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, SystemSettings, Product, Order, Category, Subcategory } from '../types';
import { PRODUCTS as DEMO_PRODUCTS, INITIAL_ORDERS as DEMO_ORDERS, CATEGORIES as DEMO_CATEGORIES } from '../data/catalog';
import { submitOrder, SubmitResult } from '../services/orderSubmit';
import { 
  isSupabaseConfigured, 
  fetchSupabaseProducts, 
  fetchSupabaseCategories, 
  fetchSupabaseOrders,
  fetchSupabaseSubcategories,
  buildCategoryTree,
  enrichProductsWithSubcategoryTree,
  syncSupabaseProduct,
  deleteSupabaseProduct,
  syncSupabaseCategory,
  deleteSupabaseCategory,
  syncSupabaseSubcategory,
  deleteSupabaseSubcategory,
  syncSupabaseOrder,
  syncSupabaseSettings,
  fetchSupabasePublicSetting,
  newDbId
} from '../services/supabase';
import { applyFlashOffers, flashLiveKey, stripFlashFields } from '../utils/flashOffers';

interface AdminContextType {
  currentUser: UserProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSupabaseConnected: boolean;
  // true = cliente "attività" (o admin): vede i prezzi con IVA, coerente con il carrello
  isBusinessCustomer: boolean;
  // IVA impostata dall'admin (0 = nessuna) e moltiplicatore pronto all'uso (1 + IVA/100)
  vatPercent: number;
  /** Importo minimo (imponibile, in €) sotto cui l'ordine non può partire. 0 = nessun minimo. */
  minimumOrderEur: number;
  vatFactor: number;
  // true finché il catalogo non è stato scaricato dal cloud almeno una volta
  catalogLoading: boolean;
  loginAsAdmin: (customAdmin?: Partial<UserProfile>) => void;
  loginAsUser: (userData: UserProfile) => void;
  logout: () => void;
  toggleAdminMode: () => void;
  
  // Master Editable Data States
  productsList: Product[];
  categoriesList: Category[];
  subcategoriesList: Subcategory[];
  addSubcategory: (s: Omit<Subcategory, 'id'>) => Subcategory;
  updateSubcategory: (s: Subcategory) => void;
  deleteSubcategory: (id: string) => void;
  ordersList: Order[];
  systemSettings: SystemSettings;
  
  // Product CRUD
  updateProduct: (updated: Product) => void;
  addProduct: (newProd: Omit<Product, 'id'>) => Product;
  deleteProduct: (productId: string) => void;
  
  // Category CRUD
  updateCategory: (updated: Category) => void;
  addCategory: (newCat: Omit<Category, 'id'>) => Category;
  deleteCategory: (categoryId: string) => void;
  
  // Order Management
  updateOrder: (updated: Order) => void;
  deleteOrder: (orderId: string) => void;
  // Registra l'ordine: email al negozio + salvataggio su database. Restituisce l'esito reale.
  createOrder: (newOrder: Order, source?: 'carrello' | 'riordino-rapido') => Promise<SubmitResult>;
  
  // System Settings Management
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  // Offerte a tempo: listino senza offerte applicate (per l'admin) e interruttore generale
  baseProductsList: Product[];
  flashOffersEnabled: boolean;
  setFlashOffersEnabled: (enabled: boolean) => void;
  refreshFromCloud: () => Promise<void>;
}

const DEFAULT_ADMIN: UserProfile = {
  id: 'admin-master',
  name: 'Amministratore',
  email: 'admin@aurora.app',
  company: 'Aurora S.r.l.s',
  piva: '15399421005',
  sdi: '',
  pec: '',
  role: 'superadmin',
  avatarInitials: 'AD',
  phone: '345 600 0865',
  address: 'Via di Prato Lungo Casilino 128/130',
  city: 'Roma',
  postalCode: '00132',
  province: 'RM',
  country: 'Italia',
  permissions: {
    canEditCatalog: true,
    canEditPrices: true,
    canEditStock: true,
    canEditOrders: true,
    canEditUsers: true,
    canEditCompanyInfo: true,
    canDeleteRecords: true,
    canOverrideDiscounts: true,
  }
};

const DEFAULT_SETTINGS: SystemSettings = {
  companyName: 'Aurora S.r.l.s',
  brandTitle: 'AURORA - Casalinghi & Detergenza',
  contactEmail: 'gruppo.aurora.ordini@gmail.com',
  contactPhone: '345 600 0865',
  vatNumber: '15399421005',
  sdiCode: '',
  address: 'Via di Prato Lungo Casilino 128/130, 00132 Roma (RM)',
  minimumOrderEur: 50.00,
  freeShippingThresholdEur: 150.00,
  standardShippingEur: 9.90,
  vatRatePercent: 22,
  vatPercent: 0,
  allowDirectOrderEdit: true,
  allowPriceOverride: true,
  announcementBannerText: '🔥 Spedizione Rapida • Casalinghi e Detergenza per Casa e Attività',
  enableAnnouncementBanner: true,
};

// Dati di esempio (prodotti "p1", ordini demo...) che una vecchia versione salvava
// nel browser dei visitatori: li scartiamo, così nessun cliente vede roba finta.
const DEMO_PRODUCT_IDS = new Set(DEMO_PRODUCTS.map((p) => p.id));
const DEMO_ORDER_IDS = new Set(DEMO_ORDERS.map((o) => o.id));
const DEMO_CATEGORY_IDS = new Set(DEMO_CATEGORIES.map((c) => c.id));
const OLD_DEMO_EMAILS = new Set(['info@auroracasalinghi.it', 'ordini.aurorasrls@gmail.com']);

function loadSaved<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved state from localStorage or start as null (not logged in)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('aurora_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [productsList, setProductsList] = useState<Product[]>(() =>
    loadSaved<Product[]>('aurora_admin_products', []).filter((p) => !DEMO_PRODUCT_IDS.has(p.id))
  );

  const [categoriesList, setCategoriesList] = useState<Category[]>(() =>
    // Le categorie d'esempio non compaiono più: si usano solo quelle vere del database
    loadSaved<Category[]>('aurora_admin_categories', []).filter((c) => !DEMO_CATEGORY_IDS.has(c.id))
  );

  const [subcategoriesList, setSubcategoriesList] = useState<Subcategory[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_admin_subcategories');
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

  const [ordersList, setOrdersList] = useState<Order[]>(() =>
    loadSaved<Order[]>('aurora_admin_orders', []).filter((o) => !DEMO_ORDER_IDS.has(o.id))
  );

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = loadSaved<SystemSettings | null>('aurora_admin_settings', null);
    if (!saved) return DEFAULT_SETTINGS;
    return OLD_DEMO_EMAILS.has(saved.contactEmail)
      ? { ...saved, contactEmail: DEFAULT_SETTINGS.contactEmail }
      : saved;
  });
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Sync state to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('aurora_auth_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('aurora_auth_user');
      }
    } catch (e) {
      console.warn('Storage sync failed', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      // Con un catalogo grande la copia nel browser non entra (limite ~5 MB) e salvarla
      // bloccava il telefono a ogni modifica: si tiene solo per cataloghi piccoli.
      if (productsList.length <= 1500) {
        localStorage.setItem('aurora_admin_products', JSON.stringify(productsList));
      } else {
        localStorage.removeItem('aurora_admin_products');
      }
    } catch (e) {
      console.warn('Product sync failed', e);
    }
  }, [productsList]);

  useEffect(() => {
    try {
      localStorage.setItem('aurora_admin_categories', JSON.stringify(categoriesList));
    } catch (e) {
      console.warn('Category sync failed', e);
    }
  }, [categoriesList]);

  useEffect(() => {
    try {
      localStorage.setItem('aurora_admin_subcategories', JSON.stringify(subcategoriesList));
    } catch (e) {
      console.warn('Subcategory sync failed', e);
    }
  }, [subcategoriesList]);

  useEffect(() => {
    try {
      localStorage.setItem('aurora_admin_orders', JSON.stringify(ordersList));
    } catch (e) {
      console.warn('Order sync failed', e);
    }
  }, [ordersList]);

  useEffect(() => {
    try {
      localStorage.setItem('aurora_admin_settings', JSON.stringify(systemSettings));
    } catch (e) {
      console.warn('Settings sync failed', e);
    }
  }, [systemSettings]);

  const isSupabaseConnected = isSupabaseConfigured();

  // Al caricamento scarica il catalogo dal cloud. Se il primo tentativo non
  // riesce (rete lenta, telefono in campagna...) riprova da solo fino a 3 volte.
  const refreshFromCloud = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCatalogLoading(false);
      return;
    }
    try {
      let cloudProducts: Product[] | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        cloudProducts = await fetchSupabaseProducts();
        if (cloudProducts && cloudProducts.length > 0) break;
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      }
      const [cloudCategories, cloudSubcategories, cloudOrders] = await Promise.all([
        fetchSupabaseCategories(),
        fetchSupabaseSubcategories(),
        fetchSupabaseOrders(),
      ]);

      // Le sottocategorie sono organizzate su 2 livelli (marca -> tipologia).
      // Montiamo l'albero su categorie e prodotti QUI, una sola volta dopo
      // che entrambe le liste sono arrivate dal cloud, così CatalogView.tsx
      // trova sempre marche/tipologie e prodotti correttamente collegati.
      const subs = cloudSubcategories ?? [];

      if (cloudCategories && cloudCategories.length > 0) {
        setCategoriesList(subs.length > 0 ? buildCategoryTree(cloudCategories, subs) : cloudCategories);
      }
      // Interruttore generale delle offerte a tempo (uguale per tutti i clienti)
      const [flashFlag, promoLabel, promoValue, promoAuto] = await Promise.all([
        fetchSupabasePublicSetting('flashOffersEnabled'),
        fetchSupabasePublicSetting('promoBadgeLabel'),
        fetchSupabasePublicSetting('promoBadgeValue'),
        fetchSupabasePublicSetting('promoBadgeAuto'),
      ]);
      setSystemSettings((prev) => ({
        ...prev,
        ...(flashFlag !== null ? { flashOffersEnabled: flashFlag !== 'false' } : {}),
        ...(promoLabel !== null && promoLabel !== 'undefined' ? { promoBadgeLabel: promoLabel } : {}),
        ...(promoValue !== null && promoValue !== 'undefined' ? { promoBadgeValue: promoValue } : {}),
        ...(promoAuto !== null && promoAuto !== 'undefined' ? { promoBadgeAuto: promoAuto === 'true' } : {}),
      }));
      if (cloudProducts && cloudProducts.length > 0) {
        setProductsList(subs.length > 0 ? enrichProductsWithSubcategoryTree(cloudProducts, subs) : cloudProducts);
      }
      if (cloudSubcategories) {
        setSubcategoriesList(cloudSubcategories);
      }
      if (cloudOrders && cloudOrders.length > 0) {
        // Uniamo gli ordini del database con quelli rimasti solo su questo dispositivo
        // (es. inviati via email quando il salvataggio online non era riuscito).
        setOrdersList((prev) => {
          const cloudIds = new Set(cloudOrders.map((o) => o.id));
          return [...cloudOrders, ...prev.filter((o) => !cloudIds.has(o.id))];
        });
      }
    } catch (err) {
      console.warn('Cloud data fetch notice:', err);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFromCloud();
  }, [refreshFromCloud]);

  // Se le sottocategorie cambiano (caricamento cloud, o modifica da admin:
  // nuova marca/tipologia, rinomina, cancellazione...), ricostruiamo subito
  // l'albero su categorie e prodotti, così i filtri del catalogo restano
  // sempre coerenti senza bisogno di un refresh manuale della pagina.
  useEffect(() => {
    if (subcategoriesList.length === 0) return;
    setCategoriesList((prev) => buildCategoryTree(prev, subcategoriesList));
    setProductsList((prev) => enrichProductsWithSubcategoryTree(prev, subcategoriesList));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcategoriesList]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const isSuperAdmin = currentUser?.role === 'superadmin';
  // Stessa regola del carrello: attività e admin vedono l'IVA solo se impostata, i privati mai.
  const isBusinessCustomer = currentUser?.customerType === 'attivita' || isAdmin;
  // Nessuna IVA automatica: si applica solo se l'admin la imposta in Impostazioni.
  const vatPercent = Math.max(0, Number(systemSettings.vatPercent ?? 0) || 0);
  const vatFactor = 1 + vatPercent / 100;
  // Ordine minimo (sull'imponibile): 50 € se non diversamente impostato
  const rawMin = Number(systemSettings.minimumOrderEur);
  const minimumOrderEur = Number.isFinite(rawMin) && rawMin >= 0 ? rawMin : 50;

  const loginAsAdmin = (customAdmin?: Partial<UserProfile>) => {
    const adminUser: UserProfile = {
      ...DEFAULT_ADMIN,
      ...customAdmin,
      role: 'superadmin',
    };
    setCurrentUser(adminUser);
  };

  const loginAsUser = (userData: UserProfile) => {
    const isSuper = userData.role === 'superadmin' || userData.role === 'admin';

    if (isSuper) {
      const adminUser: UserProfile = {
        ...userData,
        role: 'superadmin',
        permissions: {
          canEditCatalog: true,
          canEditPrices: true,
          canEditStock: true,
          canEditOrders: true,
          canEditUsers: true,
          canEditCompanyInfo: true,
          canDeleteRecords: true,
          canOverrideDiscounts: true,
        }
      };
      setCurrentUser(adminUser);
    } else {
      // Standard regular client / user
      const regularUser: UserProfile = {
        ...userData,
        role: 'user',
        permissions: {
          canEditCatalog: false,
          canEditPrices: false,
          canEditStock: false,
          canEditOrders: false,
          canEditUsers: false,
          canEditCompanyInfo: false,
          canDeleteRecords: false,
          canOverrideDiscounts: false,
        }
      };
      setCurrentUser(regularUser);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('aurora_auth_user');
    } catch {}
  };

  const toggleAdminMode = () => {
    if (isAdmin) {
      logout();
    }
  };

  // Product CRUD
  // Quando un prodotto viene salvato dall'admin cambiando la sua sottocategoria
  // (subcategoryId), ricalcoliamo subito subCategoryId/subSubCategoryId dallo
  // stesso albero marca->tipologia, così il prodotto risulta subito filtrabile
  // nel catalogo senza dover aspettare un refresh completo dal cloud.
  const withSubcategoryTree = (p: Product): Product =>
    subcategoriesList.length > 0 ? enrichProductsWithSubcategoryTree([p], subcategoriesList)[0] : p;

  const updateProduct = (incoming: Product) => {
    const base = productsList.find((p) => p.id === incoming.id);
    const effective = effectiveProducts.find((p) => p.id === incoming.id);
    const updated = base && effective && base !== effective ? stripFlashFields(incoming, base, effective) : incoming;
    const enriched = withSubcategoryTree(updated);
    setProductsList((prev) => prev.map((p) => (p.id === enriched.id ? enriched : p)));
    syncSupabaseProduct(enriched);
  };

  const addProduct = (newProd: Omit<Product, 'id'>): Product => {
    const id = newDbId();
    const fullProduct: Product = withSubcategoryTree({
      ...newProd,
      id,
    } as Product);
    setProductsList((prev) => [fullProduct, ...prev]);
    syncSupabaseProduct(fullProduct);
    return fullProduct;
  };

  const deleteProduct = (productId: string) => {
    setProductsList((prev) => prev.filter((p) => p.id !== productId));
    deleteSupabaseProduct(productId);
  };

  // Category CRUD
  const updateCategory = (updated: Category) => {
    setCategoriesList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    syncSupabaseCategory(updated);
  };

  const addCategory = (newCat: Omit<Category, 'id'>): Category => {
    const id = newDbId();
    const fullCategory: Category = {
      ...newCat,
      id,
    };
    setCategoriesList((prev) => [...prev, fullCategory]);
    syncSupabaseCategory(fullCategory);
    return fullCategory;
  };

  const deleteCategory = (categoryId: string) => {
    setCategoriesList((prev) => prev.filter((c) => c.id !== categoryId));
    deleteSupabaseCategory(categoryId);
  };

  // Subcategory CRUD (parentSubcategoryId presente = sotto-sottocategoria)
  const addSubcategory = (newSub: Omit<Subcategory, 'id'>): Subcategory => {
    const full: Subcategory = { ...newSub, id: newDbId() };
    setSubcategoriesList((prev) => [...prev, full]);
    syncSupabaseSubcategory(full);
    return full;
  };

  const updateSubcategory = (updated: Subcategory) => {
    setSubcategoriesList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    syncSupabaseSubcategory(updated);
  };

  const deleteSubcategory = (id: string) => {
    // Elimina anche eventuali sotto-sottocategorie figlie (in locale; il
    // database lo fa già da solo grazie a ON DELETE CASCADE)
    setSubcategoriesList((prev) => prev.filter((s) => s.id !== id && s.parentSubcategoryId !== id));
    deleteSupabaseSubcategory(id);
  };

  // Order CRUD
  const updateOrder = (updated: Order) => {
    setOrdersList((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    syncSupabaseOrder(updated);
  };

  const deleteOrder = (orderId: string) => {
    setOrdersList((prev) => prev.filter((o) => o.id !== orderId));
  };

  const createOrder = async (
    newOrder: Order,
    source: 'carrello' | 'riordino-rapido' = 'carrello'
  ): Promise<SubmitResult> => {
    // Controllo di sicurezza comune a carrello e riordino rapido: sotto il minimo l'ordine non parte
    const goods = Number(newOrder.subtotal ?? newOrder.total) || 0;
    if (minimumOrderEur > 0 && Math.round(goods * 100) < Math.round(minimumOrderEur * 100)) {
      return {
        ok: false,
        emailSent: false,
        saved: false,
        error: `Ordine minimo € ${minimumOrderEur.toFixed(2)}: mancano € ${(minimumOrderEur - goods).toFixed(2)}.`,
      };
    }
    // Prima il tentativo REALE di consegna (email al negozio + database)...
    const result = await submitOrder(newOrder, source);
    // ...e solo se l'ordine è davvero partito lo mostriamo nello storico.
    if (result.ok) {
      setOrdersList((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
    }
    return result;
  };

  // ---------- Offerte a tempo ----------
  const flashOffersEnabled = systemSettings.flashOffersEnabled !== false;
  const [flashKey, setFlashKey] = useState(() => flashLiveKey(productsList, flashOffersEnabled, new Date()));
  useEffect(() => {
    const check = () => {
      const key = flashLiveKey(productsList, flashOffersEnabled, new Date());
      setFlashKey((prev) => (prev === key ? prev : key));
    };
    check();
    // Controllo ogni 20 secondi: le offerte partono e si chiudono da sole all'orario stabilito
    const timer = window.setInterval(check, 20000);
    return () => window.clearInterval(timer);
  }, [productsList, flashOffersEnabled]);
  const effectiveProducts = useMemo(
    () => applyFlashOffers(productsList, flashOffersEnabled, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productsList, flashOffersEnabled, flashKey]
  );

  // Settings
  const updateSystemSettings = (settings: Partial<SystemSettings>) => {
    setSystemSettings((prev) => {
      const updated = { ...prev, ...settings };
      syncSupabaseSettings(updated);
      return updated;
    });
  };

  return (
    <AdminContext.Provider
      value={{
        currentUser,
        isAdmin,
        isSuperAdmin,
        isSupabaseConnected,
        isBusinessCustomer,
        catalogLoading,
        loginAsAdmin,
        loginAsUser,
        logout,
        toggleAdminMode,
        productsList: effectiveProducts,
        categoriesList,
        subcategoriesList,
        ordersList,
        systemSettings,
        vatPercent,
        minimumOrderEur,
        vatFactor,
        updateProduct,
        addProduct,
        deleteProduct,
        updateCategory,
        addCategory,
        deleteCategory,
        addSubcategory,
        updateSubcategory,
        deleteSubcategory,
        updateOrder,
        deleteOrder,
        createOrder,
        updateSystemSettings,
        refreshFromCloud,
        baseProductsList: productsList,
        flashOffersEnabled,
        setFlashOffersEnabled: (enabled: boolean) => updateSystemSettings({ flashOffersEnabled: enabled }),
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
