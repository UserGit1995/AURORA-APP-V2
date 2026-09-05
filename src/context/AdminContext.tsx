import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, SystemSettings, Product, Order, Category, Subcategory } from '../types';
import { PRODUCTS, CATEGORIES, INITIAL_ORDERS } from '../data/catalog';
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
  newDbId
} from '../services/supabase';

interface AdminContextType {
  currentUser: UserProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSupabaseConnected: boolean;
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
  createOrder: (newOrder: Order) => void;
  
  // System Settings Management
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  resetToDefaults: () => void;
  refreshFromCloud: () => Promise<void>;
}

const DEFAULT_ADMIN: UserProfile = {
  id: 'admin-master',
  name: 'Amministratore',
  email: 'admin@aurora.app',
  company: 'AURORA Distribuzione S.r.l.',
  piva: 'IT09876543210',
  sdi: 'AUR789K',
  pec: 'amministrazione@pec.aurora.it',
  role: 'superadmin',
  avatarInitials: 'AD',
  phone: '+39 02 9876543',
  address: 'Via dell\'Industria 45',
  city: 'Milano',
  postalCode: '20145',
  province: 'MI',
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
  companyName: 'AURORA Distribuzione S.r.l.',
  brandTitle: 'AURORA - Casalinghi & Detergenza',
  contactEmail: 'info@auroracasalinghi.it',
  contactPhone: '+39 02 9876543',
  vatNumber: 'IT09876543210',
  sdiCode: 'AUR789K',
  address: 'Via dell\'Industria 45, Palazzina B, 20145 Milano (MI)',
  minimumOrderEur: 50.00,
  freeShippingThresholdEur: 150.00,
  standardShippingEur: 9.90,
  vatRatePercent: 22,
  allowDirectOrderEdit: true,
  allowPriceOverride: true,
  announcementBannerText: '🔥 Spedizione Rapida • Casalinghi e Detergenza per Casa e Attività',
  enableAnnouncementBanner: true,
};

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

  const [productsList, setProductsList] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_admin_products');
      if (saved) return JSON.parse(saved);
      return PRODUCTS;
    } catch {
      return PRODUCTS;
    }
  });

  const [categoriesList, setCategoriesList] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_admin_categories');
      if (saved) return JSON.parse(saved);
      return CATEGORIES;
    } catch {
      return CATEGORIES;
    }
  });

  const [subcategoriesList, setSubcategoriesList] = useState<Subcategory[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_admin_subcategories');
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

  const [ordersList, setOrdersList] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_admin_orders');
      if (saved) return JSON.parse(saved);
      return INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('aurora_admin_settings');
      if (saved) return JSON.parse(saved);
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

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
      localStorage.setItem('aurora_admin_products', JSON.stringify(productsList));
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

  // On mount, if Supabase is configured, attempt to load cloud data seamlessly
  const refreshFromCloud = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const [cloudProducts, cloudCategories, cloudSubcategories, cloudOrders] = await Promise.all([
        fetchSupabaseProducts(),
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
      if (cloudProducts && cloudProducts.length > 0) {
        setProductsList(subs.length > 0 ? enrichProductsWithSubcategoryTree(cloudProducts, subs) : cloudProducts);
      }
      if (cloudSubcategories) {
        setSubcategoriesList(cloudSubcategories);
      }
      if (cloudOrders && cloudOrders.length > 0) {
        setOrdersList(cloudOrders);
      }
    } catch (err) {
      console.warn('Cloud data fetch notice:', err);
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

  const updateProduct = (updated: Product) => {
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

  const createOrder = (newOrder: Order) => {
    setOrdersList((prev) => [newOrder, ...prev]);
    syncSupabaseOrder(newOrder);
  };

  // Settings
  const updateSystemSettings = (settings: Partial<SystemSettings>) => {
    setSystemSettings((prev) => {
      const updated = { ...prev, ...settings };
      syncSupabaseSettings(updated);
      return updated;
    });
  };

  const resetToDefaults = () => {
    setProductsList(PRODUCTS);
    setCategoriesList(CATEGORIES);
    setOrdersList(INITIAL_ORDERS);
    setSystemSettings(DEFAULT_SETTINGS);
    setCurrentUser(DEFAULT_ADMIN);
  };

  return (
    <AdminContext.Provider
      value={{
        currentUser,
        isAdmin,
        isSuperAdmin,
        isSupabaseConnected,
        loginAsAdmin,
        loginAsUser,
        logout,
        toggleAdminMode,
        productsList,
        categoriesList,
        subcategoriesList,
        ordersList,
        systemSettings,
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
        resetToDefaults,
        refreshFromCloud,
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
