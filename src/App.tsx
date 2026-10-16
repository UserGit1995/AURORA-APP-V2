import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, RefreshCw, MessageCircle } from 'lucide-react';
import type { NavTab } from './components/Sidebar';
import { DeveloperProfileView } from './components/DeveloperProfileView';
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
import { BrandDetailView } from './components/BrandDetailView';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { PersonalizzaView } from './components/PersonalizzaView';
import { LegalView } from './components/LegalView';
import { CookieBanner } from './components/CookieBanner';
import { warmSearchIndex } from './utils/productSearch';
import { OPEN_REMOVE_BG_EVENT } from './components/AdminRemoveBgButton';
import { CustomizationTrackingView } from './components/CustomizationTrackingView';
import { loadChatSession, fetchClientUnread, adminUnreadCount } from './services/chat';
import { parseInitialRoute, syncUrlWithTab, sharedProductIdFromUrl, clearSharedProductUrl } from './utils/deepLinks';

import { Product, CartItem, Order, NotificationItem, OrderTemplate } from './types';
import { useAdmin } from './context/AdminContext';
import { NuovaShell } from './nuova/NuovaShell';
import { NuovaHome, NuovaCatalogTop, NuovaCategoryHero, NuovaBrandsPage, NuovaOffersPage } from './nuova/NuovaHome';
import { NuovaProductSheet } from './nuova/NuovaProductSheet';
import { Ic } from './nuova/Icona';
import { NuovaChat } from './nuova/NuovaChat';
import { NuovaConsegne, NuovaLegale, NuovaInstalla, NuovaConsenso } from './nuova/NuovaPagine';
// Il pannello admin (e le sue schermate) pesa parecchio (grafici, editor
// immagini, gestione ordini/sottocategorie): lo carichiamo solo quando serve
// davvero, così i clienti normali non lo scaricano mai. Il sito resta uguale,
// solo più leggero e veloce da aprire.
const AdminControlPanel = React.lazy(() =>
  import('./components/AdminControlPanel').then((m) => ({ default: m.AdminControlPanel }))
);
const QrScannerModal = React.lazy(() =>
  import('./components/QrScannerModal').then((m) => ({ default: m.QrScannerModal }))
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
    currentUser,
    logout,
    isBusinessCustomer,
    vatFactor,
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
  const [isQrOpen, setIsQrOpen] = useState(false);

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

  // Grafica nuova: quantità di ogni prodotto nel carrello (per il pulsante + / − sulle schede)
  const cartQtyById = useMemo(() => {
    const m: Record<string, number> = {};
    for (const item of cart) m[item.product.id] = item.quantity;
    return m;
  }, [cart]);

  // Grafica nuova: cambio pagina dal menu, dalla barra in basso e dai link in alto
  const navNuova = (tab: NavTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedBrandName(null);
    setShowAllBrands(false);
    if (tab === 'home' || tab === 'categorie') setSelectedCategoryId(null);
    window.scrollTo({ top: 0 });
  };

  // Contenuto della pagina attiva: è lo stesso per le due grafiche
  const cartDrawer = (
      <CartDrawer
      isOpen={isCartOpen}
      onClose={() => setIsCartOpen(false)}
      items={cart}
      onUpdateQuantity={handleUpdateCartQuantity}
      onRemoveItem={handleRemoveFromCart}
      onClearCart={handleClearCart}
      onApplyTemplate={handleApplyTemplate}
      nuova
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
  );

  const pageContent = (
    <>
          {activeTab === 'tracking' && trackingToken ? (
            <CustomizationTrackingView token={trackingToken} onBackToHome={() => setActiveTab('home')} />
          ) : activeTab === 'personalizza' ? (
            <>
              <section className="n-pers-hero">
                <header className="bar">
                  <button type="button" aria-label="Indietro" onClick={() => setActiveTab('home')}>
                    <Ic n="chevl" s={22} />
                  </button>
                  <b>Personalizza packaging</b>
                  <button
                    type="button"
                    aria-label="Cerca"
                    onClick={() => window.dispatchEvent(new Event('n-open-search'))}
                  >
                    <Ic n="search" s={20} />
                  </button>
                </header>
                <div className="img">
                  <img src="/nuova/cat-asporto.webp" alt="" />
                </div>
                <div className="hd">
                  <h1>Personalizza il tuo packaging</h1>
                  <p>Il tuo logo su sacchetti, scatole, shopper e bicchieri. Ti mandiamo il preventivo prima di produrre.</p>
                </div>
              </section>
              <PersonalizzaView
                hideIntro
                onBackToHome={() => setActiveTab('home')}
                onOpenLegal={(page) => setActiveTab(page)}
              />
            </>
          ) : activeTab === 'creatore' ? (
            <DeveloperProfileView onBack={() => setActiveTab('home')} onOpenPrivacy={() => setActiveTab('privacy')} />
          ) : activeTab === 'chat' ? (
            <NuovaChat onOpenPrivacy={() => setActiveTab('privacy')} />
          ) : activeTab === 'privacy' || activeTab === 'termini' ? (
            <NuovaLegale
              page={activeTab}
              onBack={() => setActiveTab('home')}
              onOpenLegal={(page) => setActiveTab(page)}
            />
          ) : activeTab === 'consegne' ? (
            <NuovaConsegne onBack={() => setActiveTab('home')} />
          ) : activeTab === 'installa' ? (
            <NuovaInstalla onBack={() => setActiveTab('home')} />
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
            <NuovaBrandsPage
              categories={categoriesList}
              subcategories={subcategoriesList}
              products={productsList}
              onSelectBrand={(name) => {
                setSelectedBrandName(name);
                window.scrollTo({ top: 0 });
              }}
              onBack={() => setShowAllBrands(false)}
            />
          ) : activeTab === 'home' ? (
            <NuovaHome
              products={productsList}
              categories={categoriesList}
              subcategories={subcategoriesList}
              favorites={favorites}
              comparedIds={comparedProductIds}
              cartQty={cartQtyById}
              priceFactor={isBusinessCustomer ? vatFactor : 1}
              onOpenCatalog={() => navNuova('categorie')}
              onSelectCategory={(id) => {
                setSelectedCategoryId(id);
                setActiveTab('categorie');
                window.scrollTo({ top: 0 });
              }}
              onOpenOffers={() => navNuova('offerte')}
              onPersonalizza={() => navNuova('personalizza')}
              onChat={() => navNuova('chat')}
              onOpenOrders={() => navNuova('ordini')}
              onHowItWorks={() => navNuova('consegne')}
              onInstall={() => navNuova('installa')}
              onQuickReorder={() => setIsQuickReorderOpen(true)}
              onSelectBrand={(name) => {
                setSelectedBrandName(name);
                window.scrollTo({ top: 0 });
              }}
              onAllBrands={() => {
                navNuova('categorie');
                window.setTimeout(() => {
                  const el = document.getElementById('n-marche');
                  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
                }, 350);
              }}
              onOpenHoreca={(categoryId, subcategoryId) => {
                setInitialSubcategoryId(subcategoryId);
                setSelectedCategoryId(categoryId);
                setActiveTab('categorie');
                window.scrollTo({ top: 0 });
              }}
              onSelectProduct={setSelectedProduct}
              onAdd={(p) => handleAddToCart(p, 1)}
              onRemoveOne={(p) => handleUpdateCartQuantity(p.id, -1)}
              onToggleFavorite={handleToggleFavorite}
              onToggleCompare={handleToggleCompare}
            />
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
    </>
  );

  // Finestre, carrello, pannello admin e pulsanti flottanti: in comune alle due grafiche
  const overlays = (
    <>
      <ScrollToTopButton />

      {/* Barra carrello flottante: sempre in vista quando ci sono articoli */}
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
      <NuovaProductSheet
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
      {isQrOpen && (
        <React.Suspense fallback={null}>
          <QrScannerModal
            isOpen={isQrOpen}
            onClose={() => setIsQrOpen(false)}
            products={productsList}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
          />
        </React.Suspense>
      )}

      <CookieBanner onOpenPrivacy={() => setActiveTab('privacy')} />
      <NuovaConsenso onOpenPrivacy={() => setActiveTab('privacy')} paused={activeTab === 'privacy'} />

      {/* SuperAdmin Master Control Panel Modal - STRICTLY FOR AUTHENTICATED ADMIN ONLY */}
      {isAdmin && (
        <React.Suspense fallback={null}>
          <AdminControlPanel
            isOpen={isAdminPanelOpen}
            onClose={() => setIsAdminPanelOpen(false)}
            removeBgRequest={removeBgRequest}
            chatRequest={chatAdminRequest}
            onChatUnreadChange={setAdminChatUnread}
            nuova
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
    </>
  );

  const showingHome =
    activeTab === 'home' && productsList.length > 0 && !searchQuery.trim() && !selectedBrandName && !showAllBrands;
  const showingCategoryHero =
    activeTab === 'categorie' && selectedCategoryId && productsList.length > 0 && !searchQuery.trim() && !selectedBrandName && !showAllBrands
      ? categoriesList.find((c) => c.id === selectedCategoryId) || null
      : null;
  const showingOffers =
    activeTab === 'offerte' && productsList.length > 0 && !searchQuery.trim() && !selectedBrandName && !showAllBrands;
  const showingCatalogTop =
    activeTab === 'categorie' && !selectedCategoryId && productsList.length > 0 && !searchQuery.trim() && !selectedBrandName && !showAllBrands;
  const layout = (
        <NuovaShell
          activeTab={activeTab}
          isHome={showingHome}
          onNavigate={navNuova}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          cartCount={cartCount}
          cartTotal={cartSubtotal}
          onOpenCart={() => setIsCartOpen(true)}
          cartOpen={isCartOpen}
          bareTop={showingCatalogTop || showingOffers}
          overlay={cartDrawer}
          onCloseCart={() => setIsCartOpen(false)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
          onOpenContact={() => setIsContactOpen(true)}
          onOpenQr={() => setIsQrOpen(true)}
          favoritesCount={favorites.length}
          comparedCount={comparedProductIds.length}
          chatUnread={chatUnread}
          isAdmin={isAdmin}
          currentUser={currentUser}
          onLogout={logout}
          minimumOrderEur={minimumOrderEur}
          cardEnv={{
            cartQty: cartQtyById,
            favorites,
            comparedIds: comparedProductIds,
            priceFactor: isBusinessCustomer ? vatFactor : 1,
            onOpen: setSelectedProduct,
            onAdd: (p) => handleAddToCart(p, 1),
            onRemoveOne: (p) => handleUpdateCartQuantity(p.id, -1),
            onToggleFavorite: handleToggleFavorite,
            onToggleCompare: handleToggleCompare,
          }}
        >
          {showingHome ? (
            pageContent
          ) : (
            <div className="n-page">
              {showingCategoryHero && <NuovaCategoryHero category={showingCategoryHero} />}
              {showingCatalogTop ? (
                <NuovaCatalogTop
                  categories={categoriesList}
                  subcategories={subcategoriesList}
                  products={productsList}
                  onPick={(id) => {
                    setSelectedCategoryId(id);
                    window.scrollTo({ top: 0 });
                  }}
                  onSelectBrand={(name) => {
                    setSelectedBrandName(name);
                    window.scrollTo({ top: 0 });
                  }}
                  onSearch={() => window.dispatchEvent(new Event('n-open-search'))}
                />
              ) : showingOffers ? (
                <NuovaOffersPage products={productsList} />
              ) : (
                pageContent
              )}
            </div>
          )}
        </NuovaShell>
  );

  return (
    <>
      {layout}
      <div className="text-white font-sans">{overlays}</div>
    </>
  );
}
