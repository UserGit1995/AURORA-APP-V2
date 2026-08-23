import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Menu,
  Bell,
  Home as HomeIcon,
  LayoutGrid,
  Search,
  ClipboardList,
  Phone,
  X,
  Tag,
  Sparkles,
  Info,
  MapPin,
  FileText,
  LogIn,
  LogOut,
  Shield,
  ShoppingBag,
  Heart,
  Scale,
} from "lucide-react";
import { AuroraLogo } from "./AuroraLogo";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/lib/cart-context";

export function MobileShell({ children, onOpenCart }: { children: ReactNode; onOpenCart: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { session, isAdmin, signOut } = useAuth();
  const { count, isPulsing } = useCart();

  return (
    <div className="min-h-screen bg-background flex flex-col lg:min-h-0 lg:contents">
      <header className="lg:hidden sticky top-0 z-30 h-16 px-4 flex items-center justify-between bg-background/95 backdrop-blur border-b border-border">
        <button onClick={() => setMenuOpen(true)} aria-label="Menu" className="text-foreground">
          <Menu size={22} />
        </button>
        <AuroraLogo size="md" />
        <div className="flex items-center gap-3">
          <button aria-label="Notifiche" className="text-foreground">
            <Bell size={20} />
          </button>
          <button onClick={onOpenCart} aria-label="Carrello" className={`relative text-foreground ${isPulsing ? "text-primary" : ""}`}>
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-card border-t border-border grid grid-cols-5 z-30">
        <TabItem to="/home" icon={<HomeIcon size={20} />} label="Home" active={path === "/home"} />
        <TabItem to="/categorie" icon={<LayoutGrid size={20} />} label="Categorie" active={path.startsWith("/categorie")} />
        <TabItem to="/cerca" icon={<Search size={20} />} label="Cerca" active={path === "/cerca"} />
        <TabItem to="/i-miei-ordini" icon={<ClipboardList size={20} />} label="Ordini" active={path === "/i-miei-ordini"} />
        <TabItem to="/contatti" icon={<Phone size={20} />} label="Contatti" active={path === "/contatti"} />
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <aside className="w-[82%] max-w-sm bg-sidebar h-full overflow-y-auto p-5 flex flex-col gap-1 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-6">
              <AuroraLogo size="lg" />
              <button onClick={() => setMenuOpen(false)} className="text-sidebar-foreground">
                <X size={22} />
              </button>
            </div>
            <MenuLink to="/home" icon={<HomeIcon size={18} />} onClose={() => setMenuOpen(false)}>Home</MenuLink>
            <MenuLink to="/categorie" icon={<LayoutGrid size={18} />} onClose={() => setMenuOpen(false)}>Categorie</MenuLink>
            <MenuLink to="/offerte" icon={<Tag size={18} />} onClose={() => setMenuOpen(false)}>Offerte</MenuLink>
            <MenuLink to="/novita" icon={<Sparkles size={18} />} onClose={() => setMenuOpen(false)}>Novità</MenuLink>
            <MenuLink to="/preferiti" icon={<Heart size={18} />} onClose={() => setMenuOpen(false)}>Preferiti</MenuLink>
            <MenuLink to="/confronta" icon={<Scale size={18} />} onClose={() => setMenuOpen(false)}>Confronta</MenuLink>
            <MenuLink to="/i-miei-ordini" icon={<ClipboardList size={18} />} onClose={() => setMenuOpen(false)}>I miei ordini</MenuLink>
            <MenuLink to="/consegne" icon={<Info size={18} />} onClose={() => setMenuOpen(false)}>Informazioni consegne</MenuLink>
            <MenuLink to="/contatti" icon={<Phone size={18} />} onClose={() => setMenuOpen(false)}>Contatti</MenuLink>
            <MenuLink to="/chi-siamo" icon={<Info size={18} />} onClose={() => setMenuOpen(false)}>Chi siamo</MenuLink>
            <MenuLink to="/dove-siamo" icon={<MapPin size={18} />} onClose={() => setMenuOpen(false)}>Dove siamo</MenuLink>
            <MenuLink to="/cataloghi" icon={<FileText size={18} />} onClose={() => setMenuOpen(false)}>Cataloghi PDF</MenuLink>
            <div className="mt-4 pt-4 border-t border-sidebar-border">
              {isAdmin && (
                <MenuLink to="/admin" icon={<Shield size={18} />} onClose={() => setMenuOpen(false)}>Pannello admin</MenuLink>
              )}
              {session ? (
                <button
                  onClick={async () => { await signOut(); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent w-full text-left"
                >
                  <LogOut size={18} /> Esci
                </button>
              ) : (
                <MenuLink to="/auth" icon={<LogIn size={18} />} onClose={() => setMenuOpen(false)}>Accedi / Registrati</MenuLink>
              )}
            </div>
          </aside>
          <div className="flex-1 bg-black/60" onClick={() => setMenuOpen(false)} />
        </div>
      )}
    </div>
  );
}

function TabItem({ to, icon, label, active }: { to: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-1 text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MenuLink({ to, icon, children, onClose }: { to: string; icon: ReactNode; children: ReactNode; onClose: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path === to;
  return (
    <Link
      to={to}
      onClick={onClose}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
    >
      {icon}
      <span className="text-sm">{children}</span>
    </Link>
  );
}