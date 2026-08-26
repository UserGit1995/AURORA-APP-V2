import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, SystemSettings, Product, Order, Category, SubCategory, SubSubCategory } from '../types';
import { PRODUCTS, CATEGORIES, INITIAL_ORDERS } from '../data/catalog';
import { 
  isSupabaseConfigured, 
  fetchSupabaseProducts, 
  fetchSupabaseCategories, 
  fetchSupabaseOrders,
  syncSupabaseProduct,
  deleteSupabaseProduct,
  syncSupabaseCategory,
  syncSupabaseOrder,
  syncSupabaseSettings
} from '../services/supabase';
import { persistentStorage } from '../services/storage';

export interface PriceCalculation {
  basePrice: number;
  displayPrice: number;
  formattedDisplayPrice: string;
  vatAmount: number;
  totalWithVat: number;
  formattedTotal: string;
  vatLabel: string;
  isWithVat: boolean;
  vatRatePercent: number;
}

interface AdminContextType {
  currentUser: UserProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSupabaseConnected: boolean;
  loginAsAdmin: (customAdmin?: Partial<UserProfile>) => void;
  loginAsUser: (userData: UserProfile) => void;
  logout: () => void;
  toggleAdminMode: () => void;
  
  // VAT & Pricing Rules (Utenti normali = Senza IVA; Fornitori / Attività = Con IVA 22%)
  isBusinessCustomer: boolean;
  isPrivateCustomer: boolean;
  customerVatRate: number;
  formatProductPrice: (basePrice: number, qty?: number) => PriceCalculation;

  // Master Editable Data States
  productsList: Product[];
  categoriesList: Category[];
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

  // Subcategory (Level 2) CRUD
  addSubCategory: (categoryId: string, newSubCat: Omit<SubCategory, 'id' | 'categoryId'>) => SubCategory;
  updateSubCategory: (categoryId: string, updatedSubCat: SubCategory) => void;
  deleteSubCategory: (categoryId: string, subCategoryId: string) => void;

  // Sub-subcategory (Level 3) CRUD
  addSubSubCategory: (categoryId: string, subCategoryId: string, newSubSubCat: Omit<SubSubCategory, 'id' | 'categoryId' | 'subCategoryId'>) => SubSubCategory;
  updateSubSubCategory: (categoryId: string, subCategoryId: string, updatedSubSubCat: SubSubCategory) => void;
  deleteSubSubCategory: (categoryId: string, subCategoryId: string, subSubCatId: string) => void;

  // Update Image from PC for any level
  updateCategoryImageFromPc: (
    target: { level: 'category' | 'subcategory' | 'subsubcategory'; categoryId: string; subCategoryId?: string; subSubCategoryId?: string },
    imageDataUri: string
  ) => void;
  
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return persistentStorage.getItemSync<UserProfile | null>('aurora_auth_user', null);
  });

  const [productsList, setProductsList] = useState<Product[]>(() => {
    return persistentStorage.getItemSync<Product[]>('aurora_admin_products', PRODUCTS);
  });

  const [categoriesList, setCategoriesList] = useState<Category[]>(() => {
    return persistentStorage.getItemSync<Category[]>('aurora_admin_categories', CATEGORIES);
  });

  const [ordersList, setOrdersList] = useState<Order[]>(() => {
    return persistentStorage.getItemSync<Order[]>('aurora_admin_orders', INITIAL_ORDERS);
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    return persistentStorage.getItemSync<SystemSettings>('aurora_admin_settings', DEFAULT_SETTINGS);
  });

  // Asynchronously hydrate complete data from IndexedDB on startup (loads base64 images & unlimited products)
  useEffect(() => {
    let isMounted = true;
    async function hydrateFromIndexedDB() {
      try {
        const [savedUser, savedProds, savedCats, savedOrds, savedSettings] = await Promise.all([
          persistentStorage.getItem<UserProfile | null>('aurora_auth_user', null),
          persistentStorage.getItem<Product[] | null>('aurora_admin_products', null),
          persistentStorage.getItem<Category[] | null>('aurora_admin_categories', null),
          persistentStorage.getItem<Order[] | null>('aurora_admin_orders', null),
          persistentStorage.getItem<SystemSettings | null>('aurora_admin_settings', null),
        ]);

        if (!isMounted) return;

        if (savedUser) setCurrentUser(savedUser);
        if (savedProds && savedProds.length > 0) setProductsList(savedProds);
        if (savedCats && savedCats.length > 0) setCategoriesList(savedCats);
        if (savedOrds && savedOrds.length > 0) setOrdersList(savedOrds);
        if (savedSettings) setSystemSettings(savedSettings);
      } catch (err) {
        console.warn('IndexedDB initial hydration notice:', err);
      }
    }

    hydrateFromIndexedDB();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync state changes permanently to high-capacity storage
  useEffect(() => {
    if (currentUser) {
      persistentStorage.setItem('aurora_auth_user', currentUser);
    } else {
      persistentStorage.removeItem('aurora_auth_user');
    }
  }, [currentUser]);

  useEffect(() => {
    persistentStorage.setItem('aurora_admin_products', productsList);
  }, [productsList]);

  useEffect(() => {
    persistentStorage.setItem('aurora_admin_categories', categoriesList);
  }, [categoriesList]);

  useEffect(() => {
    persistentStorage.setItem('aurora_admin_orders', ordersList);
  }, [ordersList]);

  useEffect(() => {
    persistentStorage.setItem('aurora_admin_settings', systemSettings);
  }, [systemSettings]);

  const isSupabaseConnected = isSupabaseConfigured();

  // On mount, if Supabase is configured, attempt to load cloud data seamlessly
  const refreshFromCloud = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const [cloudProducts, cloudCategories, cloudOrders] = await Promise.all([
        fetchSupabaseProducts(),
        fetchSupabaseCategories(),
        fetchSupabaseOrders(),
      ]);

      if (cloudProducts && cloudProducts.length > 0) {
        setProductsList(cloudProducts);
      }
      if (cloudCategories && cloudCategories.length > 0) {
        setCategoriesList(cloudCategories);
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
  const updateProduct = (updated: Product) => {
    setProductsList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    syncSupabaseProduct(updated);
  };

  const addProduct = (newProd: Omit<Product, 'id'>): Product => {
    const id = `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const fullProduct: Product = {
      ...newProd,
      id,
    };
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
    setCategoriesList((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      return next;
    });
    syncSupabaseCategory(updated);
  };

  const addCategory = (newCat: Omit<Category, 'id'>): Category => {
    const id = newCat.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `cat_${Date.now()}`;
    const fullCategory: Category = {
      ...newCat,
      id,
      subCategories: newCat.subCategories || [],
    };
    setCategoriesList((prev) => [...prev, fullCategory]);
    syncSupabaseCategory(fullCategory);
    return fullCategory;
  };

  const deleteCategory = (categoryId: string) => {
    setCategoriesList((prev) => prev.filter((c) => c.id !== categoryId));
  };

  // Subcategory (Level 2) CRUD
  const addSubCategory = (categoryId: string, newSubCat: Omit<SubCategory, 'id' | 'categoryId'>): SubCategory => {
    const id = newSubCat.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `sub_${Date.now()}`;
    const fullSubCat: SubCategory = {
      ...newSubCat,
      id,
      categoryId,
      subSubCategories: newSubCat.subSubCategories || [],
    };

    setCategoriesList((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          const updatedCat = {
            ...cat,
            subCategories: [...(cat.subCategories || []), fullSubCat],
          };
          syncSupabaseCategory(updatedCat);
          return updatedCat;
        }
        return cat;
      })
    );

    return fullSubCat;
  };

  const updateSubCategory = (categoryId: string, updatedSubCat: SubCategory) => {
    setCategoriesList((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          const updatedCat = {
            ...cat,
            subCategories: (cat.subCategories || []).map((sub) => (sub.id === updatedSubCat.id ? updatedSubCat : sub)),
          };
          syncSupabaseCategory(updatedCat);
          return updatedCat;
        }
        return cat;
      })
    );
  };

  const deleteSubCategory = (categoryId: string, subCategoryId: string) => {
    setCategoriesList((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          const updatedCat = {
            ...cat,
            subCategories: (cat.subCategories || []).filter((sub) => sub.id !== subCategoryId),
          };
          syncSupabaseCategory(updatedCat);
          return updatedCat;
        }
        return cat;
      })
    );
  };

  // Sub-subcategory (Level 3) CRUD
  const addSubSubCategory = (
    categoryId: string,
    subCategoryId: string,
    newSubSubCat: Omit<SubSubCategory, 'id' | 'categoryId' | 'subCategoryId'>
  ): SubSubCategory => {
    const id = newSubSubCat.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `micro_${Date.now()}`;
    const fullSubSubCat: SubSubCategory = {
      ...newSubSubCat,
      id,
      categoryId,
      subCategoryId,
    };

    setCategoriesList((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          const updatedCat = {
            ...cat,
            subCategories: (cat.subCategories || []).map((sub) => {
              if (sub.id === subCategoryId) {
                return {
                  ...sub,
                  subSubCategories: [...(sub.subSubCategories || []), fullSubSubCat],
                };
              }
              return sub;
            }),
          };
          syncSupabaseCategory(updatedCat);
          return updatedCat;
        }
        return cat;
      })
    );

    return fullSubSubCat;
  };

  const updateSubSubCategory = (categoryId: string, subCategoryId: string, updatedSubSubCat: SubSubCategory) => {
    setCategoriesList((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          const updatedCat = {
            ...cat,
            subCategories: (cat.subCategories || []).map((sub) => {
              if (sub.id === subCategoryId) {
                return {
                  ...sub,
                  subSubCategories: (sub.subSubCategories || []).map((micro) =>
                    micro.id === updatedSubSubCat.id ? updatedSubSubCat : micro
                  ),
                };
              }
              return sub;
            }),
          };
          syncSupabaseCategory(updatedCat);
          return updatedCat;
        }
        return cat;
      })
    );
  };

  const deleteSubSubCategory = (categoryId: string, subCategoryId: string, subSubCatId: string) => {
    setCategoriesList((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          const updatedCat = {
            ...cat,
            subCategories: (cat.subCategories || []).map((sub) => {
              if (sub.id === subCategoryId) {
                return {
                  ...sub,
                  subSubCategories: (sub.subSubCategories || []).filter((micro) => micro.id !== subSubCatId),
                };
              }
              return sub;
            }),
          };
          syncSupabaseCategory(updatedCat);
          return updatedCat;
        }
        return cat;
      })
    );
  };

  // Upload/Set Image from PC for Category, SubCategory, or SubSubCategory
  const updateCategoryImageFromPc = (
    target: { level: 'category' | 'subcategory' | 'subsubcategory'; categoryId: string; subCategoryId?: string; subSubCategoryId?: string },
    imageDataUri: string
  ) => {
    setCategoriesList((prev) =>
      prev.map((cat) => {
        if (cat.id !== target.categoryId) return cat;

        let updatedCat: Category;
        if (target.level === 'category') {
          updatedCat = { ...cat, image: imageDataUri };
        } else if (target.level === 'subcategory' && target.subCategoryId) {
          updatedCat = {
            ...cat,
            subCategories: (cat.subCategories || []).map((sub) =>
              sub.id === target.subCategoryId ? { ...sub, image: imageDataUri } : sub
            ),
          };
        } else if (target.level === 'subsubcategory' && target.subCategoryId && target.subSubCategoryId) {
          updatedCat = {
            ...cat,
            subCategories: (cat.subCategories || []).map((sub) => {
              if (sub.id !== target.subCategoryId) return sub;
              return {
                ...sub,
                subSubCategories: (sub.subSubCategories || []).map((micro) =>
                  micro.id === target.subSubCategoryId ? { ...micro, image: imageDataUri } : micro
                ),
              };
            }),
          };
        } else {
          return cat;
        }

        syncSupabaseCategory(updatedCat);
        return updatedCat;
      })
    );
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

  // VAT Rules:
  // - Utenti normali (privati o visitatori): prezzo SENZA IVA (IVA 0%, nessuna maggiorazione)
  // - Fornitori / Attività (aziende, B2B, negozianti): prezzo CON IVA (IVA 22% applicata)
  const isBusinessCustomer = currentUser?.customerType === 'attivita' || currentUser?.role === 'superadmin';
  const isPrivateCustomer = !isBusinessCustomer;
  const customerVatRate = isBusinessCustomer ? 0.22 : 0;

  const formatProductPrice = useCallback(
    (basePrice: number, qty: number = 1): PriceCalculation => {
      const quantity = Math.max(1, qty);
      const netTotal = basePrice * quantity;
      
      if (isBusinessCustomer) {
        const vatAmount = netTotal * 0.22;
        const totalWithVat = netTotal + vatAmount;
        return {
          basePrice,
          displayPrice: basePrice * 1.22,
          formattedDisplayPrice: `€ ${(basePrice * 1.22).toFixed(2)}`,
          vatAmount,
          totalWithVat,
          formattedTotal: `€ ${totalWithVat.toFixed(2)}`,
          vatLabel: 'con IVA (22%)',
          isWithVat: true,
          vatRatePercent: 22,
        };
      }

      return {
        basePrice,
        displayPrice: basePrice,
        formattedDisplayPrice: `€ ${basePrice.toFixed(2)}`,
        vatAmount: 0,
        totalWithVat: netTotal,
        formattedTotal: `€ ${netTotal.toFixed(2)}`,
        vatLabel: 'senza IVA',
        isWithVat: false,
        vatRatePercent: 0,
      };
    },
    [isBusinessCustomer]
  );

  return (
    <AdminContext.Provider
      value={{
        currentUser,
        isAdmin,
        isSuperAdmin,
        isSupabaseConnected,
        isBusinessCustomer,
        isPrivateCustomer,
        customerVatRate,
        formatProductPrice,
        loginAsAdmin,
        loginAsUser,
        logout,
        toggleAdminMode,
        productsList,
        categoriesList,
        ordersList,
        systemSettings,
        updateProduct,
        addProduct,
        deleteProduct,
        updateCategory,
        addCategory,
        deleteCategory,
        addSubCategory,
        updateSubCategory,
        deleteSubCategory,
        addSubSubCategory,
        updateSubSubCategory,
        deleteSubSubCategory,
        updateCategoryImageFromPc,
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
