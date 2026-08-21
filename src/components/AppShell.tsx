import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileShell } from "./MobileShell";
import { CartDrawer } from "./CartDrawer";
import { CartProvider } from "@/lib/cart-context";
import { FavoritesProvider } from "@/lib/favorites-context";

export function AppShell({ children }: { children: ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <CartProvider>
      <FavoritesProvider>
        <div className="lg:flex lg:min-h-screen bg-background">
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <Header onOpenCart={() => setCartOpen(true)} />
            <MobileShell onOpenCart={() => setCartOpen(true)}>{children}</MobileShell>
          </div>
        </div>
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </FavoritesProvider>
    </CartProvider>
  );
}
