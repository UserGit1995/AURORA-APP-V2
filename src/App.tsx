import React, { useState, useMemo } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategorySection } from './components/CategorySection';
import { PromoBanner } from './components/PromoBanner';
import { FeaturedProductsSection } from './components/FeaturedProductsSection';
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

import { 
  CATEGORIES, 
  PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_NOTIFICATIONS 
} from './data/catalog';
import { Product, CartItem, Order, NotificationItem, OrderTemplate } from './types';
import { useAdmin } from './context/AdminContext';
import { AdminControlPanel } from './components/AdminControlPanel';
import { ProductEditModal } from './components/ProductEditModal';

export default function App() {
  const { 
    productsList, 
    categoriesList, 
    ordersList, 
    updateProduct, 
    isAdmin,
    loginAsUser,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Selected product for modal detail
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Cart state: Preloaded with items from productsList
  const [cart, setCart] = useState<CartItem[]>([
    { product: productsList[0] || PRODUCTS[0], quantity: 2 },
    { product: productsList[2] || PRODUCTS[2], quantity: 3 },
    { product: productsList[4] || PRODUCTS[4], quantity: 1 },
  ]);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(['p1', 'p4']);

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
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [isCartPulsing, setIsCartPulsing] = useState(false);

  // Cart total items count
  const cartCount = useMemo(() => {
    return cart.length;
  }, [cart]);

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
          product = PRODUCTS.find((p) => p.id === item.productId);
        }
        if (!product) {
          product = PRODUCTS.find(
            (p) =>
              item.productName.toLowerCase().includes(p.name.toLowerCase()) ||
              p.name.toLowerCase().includes(item.productName.toLowerCase())
          );
        }
        if (!product) {
          product = PRODUCTS[0];
        }

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
        const product = PRODUCTS.find((p) => p.id === item.productId);
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
    <div className="min-h-screen bg-[#040813] text-slate-100 flex font-sans">
      {/* Fixed Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'home') setSelectedCategoryId(null);
        }}
        onOpenContact={() => setIsContactOpen(true)}
        onOpenQuickReorder={() => setIsQuickReorderOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        favoritesCount={favorites.length}
        comparedCount={comparedProductIds.length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
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
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          unreadNotificationsCount={unreadNotificationsCount}
          isCartPulsing={isCartPulsing}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24">
          {searchQuery.trim() ? (
            /* Search results mode */
            <CatalogView
              viewType="categorie"
              categories={categoriesList}
              products={productsList}
              selectedCategoryId={selectedCategoryId}
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
          ) : activeTab === 'home' ? (
            /* EXACT SCREENSHOT REPLICA: Home View */
            <div className="space-y-6">
              {/* 1. Hero Banner */}
              <HeroBanner
                onExploreCatalog={() => {
                  setActiveTab('categorie');
                  setSelectedCategoryId(null);
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

              {/* 3. Offerte del mese Promo Banner */}
              <PromoBanner
                onDiscoverOffers={() => {
                  setActiveTab('offerte');
                }}
              />

              {/* 4. Prodotti in evidenza */}
              <FeaturedProductsSection
                products={productsList}
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
        onEditProduct={(p) => setEditingProduct(p)}
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
          setOrders((prev) => [newOrder, ...prev]);
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
      />

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
              type: 'system',
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
          setOrders((prev) => [newOrder, ...prev]);
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

      {/* SuperAdmin Master Control Panel Modal - STRICTLY FOR AUTHENTICATED ADMIN ONLY */}
      {isAdmin && (
        <AdminControlPanel
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
        />
      )}

      {/* Direct Product Quick Edit Modal (Admin only) */}
      {isAdmin && editingProduct && (
        <ProductEditModal
          isOpen={!!editingProduct}
          product={editingProduct}
          categories={categoriesList}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}
