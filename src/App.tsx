import React, { useState, useMemo, useEffect } from 'react';
import { RotateCcw, ArrowRight, Loader2, RefreshCw, ShoppingBag, MessageCircle } from 'lucide-react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { BackgroundRotator } from './components/BackgroundRotator';
import { FlyerSection } from './components/FlyerSection';
import { CategorySection } from './components/CategorySection';
import { PromoBanner } from './components/PromoBanner';
import { FeaturedProductsSection } from './components/FeaturedProductsSection';
import { HORECA_CATEGORY_IDS, isHorecaCategory } from './lib/horeca';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { ContactModal } from './components/ContactModal';
import { NotificationsModal } from './components/NotificationsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { OrdersView } from './components/OrdersView';
import { FavoritesView } from './components/FavoritesView';
import { CatalogView } from './components/CatalogView';
import { CompareView } from './components/CompareView';
import { CompareFloatingBar } from './components/CompareFloatingBar';
import { RestockAnalysisModal } from './components/RestockAnalysisModal';
import { QuickReorderModal } from './components/QuickReorderModal';
import { LoginModal } from './components/LoginModal';
import { BrandsSection } from './components/BrandsSection';
import { HorecaSection } from './components/HorecaSection';
import { AllBrandsView } from './components/AllBrandsView';
import { BrandDetailView } from './components/BrandDetailView';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { PersonalizzaView } from './components/PersonalizzaView';
import { LegalView } from './components/LegalView';
import { CookieBanner } from './components/CookieBanner';
import { warmSearchIndex } from './utils/productSearch';
import { OPEN_REMOVE_BG_EVENT } from './components/AdminRemoveBgButton';
import { CustomizationTrackingView } from './components/CustomizationTrackingView';
import { ChatView } from './components/chat/ChatView';
import { loadChatSession, fetchClientUnread, adminUnreadCount } from './services/chat';
import { parseInitialRoute, syncUrlWithTab, sharedProductIdFromUrl, clearSharedProductUrl } from './utils/deepLinks';

import { Product, CartItem, Order, NotificationItem, OrderTemplate } from './types';
import { useAdmin } from './context/AdminContext';
// Il pannello admin (e le sue schermate) pesa parecchio (grafici, editor
// immagini, gestione ordini/sottocategorie): lo carichiamo solo quando serve
// davvero, così i clienti normali non lo scaricano mai. Il sito resta uguale,
// solo più leggero e veloce da aprire.
const AdminControlPanel = React.lazy(() =>
  import('./components/AdminControlPanel').then((m) => ({ default: m.AdminControlPanel }))
);
const ProductEditModal = React.lazy(() =>
  import('./components/ProductEditModal').then((m) => ({ default: m.ProductEditModal }))
);

export default function App() {
  const { 
    productsList, 
    categoriesList, 
    subcategoriesList,
    ordersList, 
    updateProduct, 
    isAdmin,
    loginAsUser,
    catalogLoading,
    refreshFromCloud,
    minimumOrderEur,
  } = useAdmin();

  // Indirizzi "profondi": /personalizza, /privacy, /termini-vendita e i link di
  // tracking /personalizzazione/<token> (quelli che arrivano nelle email ai clienti).
  const [initialRoute] = useState(parseInitialRoute);
  const [activeTab, setActiveTab] = useState<NavTab>(initialRoute.tab);
  const [trackingToken] = useState<string | null>(initialRoute.trackingToken);
  useEffect(() => {
    syncUrlWithTab(activeTab, trackingToken);
  }, [activeTab, trackingToken]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandName, setSelectedBrandName] = useState<string | null>(null);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  // Badge Ho.Re.Ca cliccato dalla home: apre la categoria già filtrata su quella tipologia
  const [initialSubcategoryId, setInitialSubcategoryId] = useState<string | null>(null);

  // Selected product for modal detail
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Chat: risposte non lette per il cliente, messaggi nuovi per l'admin
  const [chatUnread, setChatUnread] = useState(0);
  const [adminChatUnread, setAdminChatUnread] = useState(0);
  const [chatAdminRequest, setChatAdminRequest] = useState(0);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      if (isAdmin) {
        const n = await adminUnreadCount();
        if (alive) setAdminChatUnread(n);
      }
      const s = loadChatSession();
      if (s && activeTab !== 'chat') {
        const n = await fetchClientUnread(s);
        if (alive) setChatUnread(n);
      } else if (alive) setChatUnread(0);
    };
    check();
    const t = window.setInterval(check, 20000);
    return () => { alive = false; window.clearInterval(t); };
  }, [isAdmin, activeTab]);

  // Link condiviso /prodotto/<id>: appena arriva il catalogo apre proprio quel prodotto
  const [sharedProductId, setSharedProductId] = useState<string | null>(sharedProductIdFromUrl);
  useEffect(() => {
    if (!sharedProductId || productsList.length === 0) return;
    const found = productsList.find((p) => p.id === sharedProductId);
    if (found) {
      setSelectedProduct(found);
      setSharedProductId(null);
    } else if (!catalogLoading) {
      // prodotto non più in catalogo: resta la home
      setSharedProductId(null);
      clearSharedProductUrl();
    }
  }, [sharedProductId, productsList, catalogLoading]);
  useEffect(() => {
    if (!selectedProduct && !sharedProductId) clearSharedProductUrl();
  }, [selectedProduct, sharedProductId]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  // Forbici sulle schede prodotto: apre il pannello admin su "Rimuovi sfondo" con quel prodotto
  const [removeBgRequest, setRemoveBgRequest] = useState<{ productId: string; token: number } | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => {
      const productId = (e as CustomEvent).detail?.productId;
      if (!productId) return;
      setSelectedProduct(null);
      setRemoveBgRequest({ productId, token: Date.now() });
      setIsAdminPanelOpen(true);
    };
    window.addEventListener(OPEN_REMOVE_BG_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_REMOVE_BG_EVENT, onOpen);
  }, []);

  // Cart state: Preloaded with items from productsList
  const [cart, setCart] = useState<CartItem[]>([]);

  // Il carrello segue sempre il prezzo attuale: quando un'offerta a tempo
  // inizia o finisce, anche i prodotti già nel carrello si aggiornano.
  useEffect(() => {
    setCart((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((item) => {
        const fresh = productsList.find((p) => p.id === item.product.id);
        if (fresh && fresh !== item.product) {
          changed = true;
          return { ...item, product: fresh };
        }
        return item;
      });
      return changed ? next : prev;
    });
  }, [productsList]);

  // Prepara la ricerca in sottofondo appena arriva il catalogo (prima ricerca subito veloce)
  useEffect(() => {
    if (productsList.length === 0) return;
    return warmSearchIndex(productsList);
  }, [productsList]);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>([]);

  // Comparison state
  const [comparedProductIds, setComparedProductIds] = useState<string[]>([]);

  // Restock Analysis state
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockFocusProductId, setRestockFocusProductId] = useState<string | null>(null);

  // Quick Reorder state
  const [isQuickReorderOpen, setIsQuickReorderOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const handleOpenRestockAnalysis = (focusProductId?: string) => {
    setRestockFocusProductId(focusProductId || null);
    setIsRestockModalOpen(true);
  };

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Notifications & Orders state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [isCartPulsing, setIsCartPulsing] = useState(false);

  // Cart total items count
  const cartCount = useMemo(() => {
    return cart.length;
  }, [cart]);

  // Totali del carrello (colli e imponibile) per pulsante, barra flottante e minimo d'ordine
  const cartColli = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const cartSubtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [cart]
  );

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Toggle favorite product
  const handleToggleFavorite = (productId: string) => {
    setFavorites((prev) => 
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // Toggle compare product (max 4 products)
  const handleToggleCompare = (productId: string) => {
    setComparedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 4) {
        // If at max 4 items, replace the oldest one
        return [...prev.slice(1), productId];
      }
      return [...prev, productId];
    });
  };

  const handleRemoveFromCompare = (productId: string) => {
    setComparedProductIds((prev) => prev.filter((id) => id !== productId));
  };

  const handleClearCompare = () => {
    setComparedProductIds([]);
  };

  // Add to cart handler
  const handleAddToCart = (product: Product, quantityOrEvent?: number | React.MouseEvent) => {
    const qty = typeof quantityOrEvent === 'number' ? quantityOrEvent : 1;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });

    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1200);

    // Trigger subtle cart pulse animation
    setIsCartPulsing(true);
    setTimeout(() => {
      setIsCartPulsing(false);
    }, 700);
  };

  // Bulk add multiple products to cart
  const handleBulkAddToCart = (productsToBuy: Product[]) => {
    if (!productsToBuy.length) return;
    setCart((prev) => {
      let updatedCart = [...prev];
      productsToBuy.forEach((product) => {
        const existingIndex = updatedCart.findIndex((ci) => ci.product.id === product.id);
        if (existingIndex > -1) {
          updatedCart[existingIndex] = {
            ...updatedCart[existingIndex],
            quantity: updatedCart[existingIndex].quantity + 1,
          };
        } else {
          updatedCart.push({
            product,
            quantity: 1,
          });
        }
      });
      return updatedCart;
    });

    setIsCartPulsing(true);
    setTimeout(() => {
      setIsCartPulsing(false);
    }, 700);
  };

  // Bulk add multiple products to favorites
  const handleBulkAddToFavorites = (productIds: string[]) => {
    if (!productIds.length) return;
    setFavorites((prev) => {
      const set = new Set(prev);
      productIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  // Reorder entire past order items back into the shopping cart
  const handleReorder = (order: Order) => {
    setCart((prev) => {
      let updatedCart = [...prev];

      order.items.forEach((item) => {
        let product: Product | undefined;
        if (item.productId) {
          product = productsList.find((p) => p.id === item.productId);
        }
        if (!product && item.productName) {
          const wanted = item.productName.toLowerCase();
          product = productsList.find((p) => p.name.toLowerCase() === wanted);
        }
        // Se il prodotto non esiste più nel catalogo lo saltiamo (prima veniva
        // sostituito con un prodotto a caso: ordini sbagliati).
        if (!product) return;

        const existingIndex = updatedCart.findIndex((ci) => ci.product.id === product!.id);
        if (existingIndex > -1) {
          updatedCart[existingIndex] = {
            ...updatedCart[existingIndex],
            quantity: updatedCart[existingIndex].quantity + item.qty,
          };
        } else {
          updatedCart.push({
            product: product!,
            quantity: item.qty,
          });
        }
      });

      return updatedCart;
    });

    setIsCartPulsing(true);
    setTimeout(() => {
      setIsCartPulsing(false);
    }, 700);
  };

  // Cart quantity update
  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove from cart
  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Clear cart on checkout
  const handleClearCart = () => {
    setCart([]);
  };

  // Apply saved order template (replace or merge pre-set quantities)
  const handleApplyTemplate = (template: OrderTemplate, mode: 'replace' | 'merge' = 'replace') => {
    const loadedCartItems: CartItem[] = template.items
      .map((item) => {
        const product = productsList.find((p) => p.id === item.productId);
        if (!product) return null;
        return {
          product,
          quantity: item.quantity,
        };
      })
      .filter(Boolean) as CartItem[];

    if (mode === 'replace') {
      setCart(loadedCartItems);
    } else {
      setCart((prev) => {
        const updated = [...prev];
        loadedCartItems.forEach((newItem) => {
          const idx = updated.findIndex((ci) => ci.product.id === newItem.product.id);
          if (idx > -1) {
            updated[idx] = {
              ...updated[idx],
              quantity: updated[idx].quantity + newItem.quantity,
            };
          } else {
            updated.push(newItem);
          }
        });
        return updated;
      });
    }

    setIsCartPulsing(true);
    setTimeout(() => {
      setIsCartPulsing(false);
    }, 700);
  };

  // Mark all notifications as read
  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Switch category and jump to view
  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    if (categoryId) {
      setActiveTab('categorie');
    }
  };

  // Filtered favorite products
  const favoriteProducts = useMemo(() => {
    return productsList.filter((p) => favorites.includes(p.id));
  }, [productsList, favorites]);

  // Compared products list
  const comparedProducts = useMemo(() => {
    return comparedProductIds
      .map((id) => productsList.find((p) => p.id === id))
      .filter(Boolean) as Product[];
  }, [comparedProductIds, productsList]);

  return (
    <div className="min-h-screen text-white flex font-sans">
      <BackgroundRotator />
      {/* Fixed Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'home') setSelectedCategoryId(null);
          // Le pagine Personalizza / Privacy / Termini non devono restare
          // coperte da una ricerca, un brand o una vista marchi ancora aperti.
          if (tab === 'personalizza' || tab === 'privacy' || tab === 'termini' || tab === 'chat') {
            setSearchQuery('');
            setSelectedBrandName(null);
            setShowAllBrands(false);
          }
        }}
        onOpenContact={() => setIsContactOpen(true)}
        onOpenQuickReorder={() => setIsQuickReorderOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        favoritesCount={favorites.length}
        comparedCount={comparedProductIds.length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        chatUnread={chatUnread}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        {/* Sticky Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
          }}
          cartCount={cartCount}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
          onOpenQuickReorder={() => setIsQuickReorderOpen(true)}
          onOpenContact={() => setIsContactOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          unreadNotificationsCount={unreadNotificationsCount}
          unreadInquiriesCount={chatUnread}
          isCartPulsing={isCartPulsing}
          cartTotal={cartSubtotal}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24">
          {activeTab === 'tracking' && trackingToken ? (
            <CustomizationTrackingView token={trackingToken} onBackToHome={() => setActiveTab('home')} />
          ) : activeTab === 'personalizza' ? (
            <PersonalizzaView
              onBackToHome={() => setActiveTab('home')}
              onOpenLegal={(page) => setActiveTab(page)}
            />
          ) : activeTab === 'chat' ? (
            <ChatView onBack={() => setActiveTab('home')} onOpenPrivacy={() => setActiveTab('privacy')} />
          ) : activeTab === 'privacy' || activeTab === 'termini' ? (
            <LegalView
              page={activeTab}
              onBack={() => setActiveTab('home')}
              onOpenLegal={(page) => setActiveTab(page)}
            />
          ) : productsList.length === 0 ? (
            /* Catalogo non ancora arrivato dal cloud (o connessione assente) */
            <div className="py-24 flex flex-col items-center text-center text-slate-300 space-y-3">
              {catalogLoading || isRetrying ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                  <p className="text-sm font-semibold">Caricamento del catalogo in corso…</p>
                  <p className="text-xs text-slate-500">Ci vuole solo qualche istante.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">Non riusciamo a caricare il catalogo.</p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Controlla la connessione a internet e riprova.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsRetrying(true);
                      await refreshFromCloud();
                      setIsRetrying(false);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Riprova</span>
                  </button>
                </>
              )}
            </div>
          ) : searchQuery.trim() ? (
            /* Search results mode: la ricerca è sempre su TUTTO il catalogo (prima restava
               limitata all'ultima categoria aperta, e "non trovava" i prodotti delle altre) */
            <CatalogView
              viewType="categorie"
              categories={categoriesList}
              products={productsList}
              selectedCategoryId={null}
              onSelectCategory={setSelectedCategoryId}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              comparedProductIds={comparedProductIds}
              onToggleCompare={handleToggleCompare}
              onSelectProduct={setSelectedProduct}
              onAddToCart={handleAddToCart}
              onBulkAddToCart={handleBulkAddToCart}
              onBulkAddToFavorites={handleBulkAddToFavorites}
              searchQuery={searchQuery}
            />
          ) : selectedBrandName ? (
            <BrandDetailView
              brandName={selectedBrandName}
              brandImage={subcategoriesList.find((s) => !s.parentSubcategoryId && s.name === selectedBrandName)?.image}
              categories={categoriesList}
              subcategories={subcategoriesList}
              products={productsList}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              comparedProductIds={comparedProductIds}
              onToggleCompare={handleToggleCompare}
              onSelectProduct={setSelectedProduct}
              onAddToCart={handleAddToCart}
              onBack={() => setSelectedBrandName(null)}
            />
          ) : showAllBrands ? (
            <AllBrandsView
              categories={categoriesList}
              subcategories={subcategoriesList}
              products={productsList}
              onSelectBrand={(name) => {
                setSelectedBrandName(name);
              }}
              onBack={() => setShowAllBrands(false)}
            />
          ) : activeTab === 'home' ? (
            /* EXACT SCREENSHOT REPLICA: Home View */
            <div className="space-y-6">
              {/* 1. Hero Banner */}
              <HeroBanner
                onExploreCatalog={() => {
                  setActiveTab('categorie');
                  setSelectedCategoryId(null);
                }}
                onPersonalizza={() => {
                  setActiveTab('personalizza');
                  setSearchQuery('');
                  setSelectedBrandName(null);
                  setShowAllBrands(false);
                  window.scrollTo({ top: 0 });
                }}
              />

              {/* 2. Categorie principali */}
              <CategorySection
                categories={categoriesList}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleSelectCategory}
                onViewAll={() => {
                  setActiveTab('categorie');
                  setSelectedCategoryId(null);
                }}
              />

              {/* Volantino offerte sfogliabile */}
              <FlyerSection />

              {/* 2.1 Marche */}
              <BrandsSection
                categories={categoriesList}
                subcategories={subcategoriesList}
                products={productsList}
                onSelectBrand={(name) => setSelectedBrandName(name)}
                onViewAllBrands={() => setShowAllBrands(true)}
              />

              {/* 2.2 Ho.Re.Ca - Monouso (categorie trasferite dall'app Ho.Re.Ca) */}
              <HorecaSection
                categories={categoriesList}
                subcategories={subcategoriesList}
                products={productsList}
                onOpen={(categoryId, subcategoryId) => {
                  setInitialSubcategoryId(subcategoryId);
                  setSelectedCategoryId(categoryId);
                  setActiveTab('categorie');
                }}
              />

              {/* 2.5 Quick Reorder Highlight Banner Card (Mobile only, matches smartphone mockup) */}
              <div
                id="home-quick-reorder-banner"
                onClick={() => setIsQuickReorderOpen(true)}
                className="md:hidden w-full bg-gradient-to-r from-[#051d41] via-[#052a5a] to-[#051d41] border border-sky-500/30 hover:border-sky-500/60 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all duration-200 shadow-sm group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <RotateCcw className="w-4.5 h-4.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-white text-xs sm:text-sm font-bold leading-tight flex items-center gap-1.5">
                      <span>Riordino Rapido</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                        1-Click
                      </span>
                    </h3>
                    <p className="text-sky-400 text-[11px] font-semibold mt-0.5">
                      Riordini veloci • Si paga alla consegna
                    </p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-[#0e1b30] border border-sky-500/30 text-slate-500 group-hover:text-sky-400 group-hover:border-sky-500/60 flex items-center justify-center transition-all">
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* 3. Offerte del mese Promo Banner */}
              <PromoBanner
                onDiscoverOffers={() => {
                  setActiveTab('offerte');
                }}
              />

              {/* 4. Prodotti in evidenza (marche, senza Ho.Re.Ca) */}
              <FeaturedProductsSection
                className="w-full mt-7"
                products={productsList.filter((p) => !isHorecaCategory(p.categoryId))}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                comparedProductIds={comparedProductIds}
                onToggleCompare={handleToggleCompare}
                onSelectProduct={setSelectedProduct}
                onAddToCart={handleAddToCart}
                onViewAll={() => {
                  setActiveTab('categorie');
                }}
                addedProductId={addedProductId}
              />

              {/* 5. Prodotti in evidenza Ho.Re.Ca - Monouso */}
              <FeaturedProductsSection
                sectionId="featured-horeca"
                title="Prodotti in evidenza Ho.Re.Ca - Monouso"
                products={productsList.filter((p) => isHorecaCategory(p.categoryId))}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                comparedProductIds={comparedProductIds}
                onToggleCompare={handleToggleCompare}
                onSelectProduct={setSelectedProduct}
                onAddToCart={handleAddToCart}
                onViewAll={() => {
                  setInitialSubcategoryId(null);
                  setSelectedCategoryId(HORECA_CATEGORY_IDS[1]);
                  setActiveTab('categorie');
                }}
                addedProductId={addedProductId}
              />
            </div>
          ) : activeTab === 'ordini' ? (
            <OrdersView 
              orders={ordersList} 
              products={productsList}
              onBackToHome={() => setActiveTab('home')}
              onReorder={handleReorder}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenRestockAnalysis={handleOpenRestockAnalysis}
              onOpenQuickReorder={() => setIsQuickReorderOpen(true)}
            />
          ) : activeTab === 'preferiti' ? (
            <FavoritesView
              favoriteProducts={favoriteProducts}
              onToggleFavorite={handleToggleFavorite}
              comparedProductIds={comparedProductIds}
              onToggleCompare={handleToggleCompare}
              onSelectProduct={setSelectedProduct}
              onAddToCart={handleAddToCart}
              onBackToHome={() => setActiveTab('home')}
            />
          ) : activeTab === 'confronta' ? (
            <CompareView
              comparedProducts={comparedProducts}
              allProducts={productsList}
              onRemoveFromCompare={handleRemoveFromCompare}
              onClearCompare={handleClearCompare}
              onToggleCompare={handleToggleCompare}
              onAddToCart={handleAddToCart}
              onSelectProduct={setSelectedProduct}
              onBackToHome={() => setActiveTab('home')}
            />
          ) : (
            /* Categorie / Offerte / Novità / I più venduti views */
            <CatalogView
              viewType={activeTab}
              categories={categoriesList}
              products={productsList}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              initialSubcategoryId={initialSubcategoryId}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              comparedProductIds={comparedProductIds}
              onToggleCompare={handleToggleCompare}
              onSelectProduct={setSelectedProduct}
              onAddToCart={handleAddToCart}
              onBulkAddToCart={handleBulkAddToCart}
              onBulkAddToFavorites={handleBulkAddToFavorites}
              searchQuery={searchQuery}
              onOpenRestockAnalysis={handleOpenRestockAnalysis}
            />
          )}
        </main>
      </div>

      <ScrollToTopButton />

      {/* Barra carrello flottante: sempre in vista quando ci sono articoli */}
      {cartColli > 0 && !isCartOpen && (
        <button
          id="floating-cart-bar"
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="fixed z-40 right-4 bottom-40 sm:right-6 sm:bottom-24 flex items-center gap-3 pl-3.5 pr-3 py-2.5 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-xl shadow-sky-950/70 border border-sky-300/30 active:scale-95 transition-all cursor-pointer"
          aria-label="Apri il carrello"
        >
          <span className="relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 bg-amber-400 text-slate-900 text-[10px] font-extrabold rounded-full flex items-center justify-center">
              {cartColli}
            </span>
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[11px] font-semibold text-sky-100">Vedi carrello</span>
            <span className="block text-sm font-extrabold font-mono">€{cartSubtotal.toFixed(2)}</span>
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${
              minimumOrderEur > 0 && Math.round(cartSubtotal * 100) < Math.round(minimumOrderEur * 100)
                ? 'bg-amber-400 text-slate-900'
                : 'bg-emerald-400 text-slate-900'
            }`}
          >
            {minimumOrderEur > 0 && Math.round(cartSubtotal * 100) < Math.round(minimumOrderEur * 100)
              ? `Mancano €${(minimumOrderEur - cartSubtotal).toFixed(2)}`
              : 'Pronto da inviare'}
          </span>
        </button>
      )}

      {/* Floating Compare Dock (shown when there are items to compare and not in compare view) */}
      {activeTab !== 'confronta' && (
        <CompareFloatingBar
          comparedProducts={comparedProducts}
          onRemoveFromCompare={handleRemoveFromCompare}
          onClearCompare={handleClearCompare}
          onOpenCompare={() => setActiveTab('confronta')}
        />
      )}

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        isFavorite={selectedProduct ? favorites.includes(selectedProduct.id) : false}
        onToggleFavorite={handleToggleFavorite}
        isCompared={selectedProduct ? comparedProductIds.includes(selectedProduct.id) : false}
        onToggleCompare={handleToggleCompare}
        onOpenRestockAnalysis={handleOpenRestockAnalysis}
        onEditProduct={isAdmin ? (p) => setEditingProduct(p) : undefined}
      />

      <RestockAnalysisModal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        orders={ordersList}
        products={productsList}
        focusProductId={restockFocusProductId}
        onAddToCart={handleAddToCart}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onApplyTemplate={handleApplyTemplate}
        onCheckoutSuccess={(newOrder) => {
          setNotifications((prev) => [
            {
              id: `notif-${Date.now()}`,
              title: `Nuovo Ordine ${newOrder.id}`,
              message: `Il tuo ordine di ${newOrder.itemsCount} colli è stato registrato ed è in elaborazione. Consegna stimata: ${newOrder.estimatedDelivery}.`,
              time: 'Adesso',
              read: false,
              type: 'order',
            },
            ...prev,
          ]);
        }}
      />

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        onOpenChat={() => { setSelectedProduct(null); setActiveTab('chat'); }}
      />

      {/* Admin: avviso messaggi nuovi dei clienti */}
      {isAdmin && adminChatUnread > 0 && !isAdminPanelOpen && (
        <button
          id="admin-chat-alert"
          onClick={() => { setChatAdminRequest(Date.now()); setIsAdminPanelOpen(true); }}
          className="fixed left-4 bottom-24 lg:bottom-6 lg:left-64 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-2xl animate-in fade-in"
          style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
        >
          <MessageCircle className="w-4 h-4" />
          {adminChatUnread === 1 ? '1 nuovo messaggio' : `${adminChatUnread} nuovi messaggi`}
        </button>
      )}

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(userData) => {
          loginAsUser(userData);
          const isSuper = userData.role === 'superadmin' || userData.role === 'admin';
          setNotifications((prev) => [
            {
              id: `notif-auth-${Date.now()}`,
              title: isSuper ? 'Accesso Amministratore Effettuato' : 'Accesso Account Effettuato',
              message: isSuper
                ? `Benvenuto ${userData.name}! Tutte le funzioni di amministrazione, prezzi e catalogo sono sbloccate.`
                : `Benvenuto ${userData.name}! Listino dedicato e promozioni attive.`,
              time: 'Adesso',
              read: false,
              type: 'info',
            },
            ...prev,
          ]);
        }}
      />

      {/* Quick Reorder Modal (NO PAY / NO CHECKOUT / 1-CLICK SUPPLY REQUEST) */}
      <QuickReorderModal
        isOpen={isQuickReorderOpen}
        onClose={() => setIsQuickReorderOpen(false)}
        orders={ordersList}
        onOrderCreated={(newOrder) => {
          setNotifications((prev) => [
            {
              id: `notif-${Date.now()}`,
              title: `Nuovo Riordino Rapido ${newOrder.id}`,
              message: `Riordino di ${newOrder.itemsCount} colli registrato e confermato. Allestimento logistico immediato.`,
              time: 'Adesso',
              read: false,
              type: 'order',
            },
            ...prev,
          ]);
        }}
        onSelectProduct={setSelectedProduct}
      />

      {/* Banner cookie: si attiva solo da src/config/cookies.ts (oggi spento, non serve) */}
      <CookieBanner onOpenPrivacy={() => setActiveTab('privacy')} />

      {/* SuperAdmin Master Control Panel Modal - STRICTLY FOR AUTHENTICATED ADMIN ONLY */}
      {isAdmin && (
        <React.Suspense fallback={null}>
          <AdminControlPanel
            isOpen={isAdminPanelOpen}
            onClose={() => setIsAdminPanelOpen(false)}
            removeBgRequest={removeBgRequest}
            chatRequest={chatAdminRequest}
            onChatUnreadChange={setAdminChatUnread}
          />
        </React.Suspense>
      )}

      {/* Direct Product Quick Edit Modal (Admin only) */}
      {isAdmin && editingProduct && (
        <React.Suspense fallback={null}>
          <ProductEditModal
            isOpen={!!editingProduct}
            product={editingProduct}
            categories={categoriesList}
            onClose={() => setEditingProduct(null)}
          />
        </React.Suspense>
      )}
    </div>
  );
}
