import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileShell } from "./MobileShell";
import { CartDrawer } from "./CartDrawer";
import { OrderForm } from "./OrderForm";
import { CompareFloatingBar } from "./CompareFloatingBar";
import { OrderTemplateModal } from "./OrderTemplateModal";
import { ToastProvider } from "./ToastContainer";
import { CartProvider } from "@/lib/cart-context";
import { FavoritesProvider } from "@/lib/favorites-context";
import { CompareProvider } from "@/lib/compare-context";

export function AppShell({ children }: { children: ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  return (
    <ToastProvider>
      <CartProvider>
        <FavoritesProvider>
          <CompareProvider>
            <div className="lg:flex lg:min-h-screen bg-background">
              <Sidebar onOpenTemplates={() => setTemplatesOpen(true)} />
              <div className="flex-1 min-w-0 flex flex-col">
                <Header onOpenCart={() => setCartOpen(true)} onOpenTemplates={() => setTemplatesOpen(true)} />
                <MobileShell onOpenCart={() => setCartOpen(true)} onOpenTemplates={() => setTemplatesOpen(true)}>
                  {children}
                </MobileShell>
              </div>
            </div>
            <CartDrawer
              open={cartOpen}
              onClose={() => setCartOpen(false)}
              onOrder={() => {
                setCartOpen(false);
                setOrderOpen(true);
              }}
              onSaveTemplate={() => {
                setCartOpen(false);
                setTemplatesOpen(true);
              }}
            />
            <OrderForm open={orderOpen} onClose={() => setOrderOpen(false)} />
            <OrderTemplateModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
            <CompareFloatingBar />
          </CompareProvider>
        </FavoritesProvider>
      </CartProvider>
    </ToastProvider>
  );
}
