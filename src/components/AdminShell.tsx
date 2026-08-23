import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, Tag, ShoppingBag, Users, Mail, Truck, Shield, LogOut, Settings, BarChart3, FolderTree, Layers } from "lucide-react";
import { AuroraLogo } from "./AuroraLogo";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

const items = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/prodotti", icon: Package, label: "Prodotti" },
  { to: "/admin/categorie", icon: FolderTree, label: "Categorie" },
  { to: "/admin/sottocategorie", icon: Layers, label: "Sottocategorie" },
  { to: "/admin/ordini", icon: ShoppingBag, label: "Ordini" },
  { to: "/admin/clienti", icon: Users, label: "Clienti" },
  { to: "/admin/utenti", icon: Shield, label: "Utenti Admin" },
  { to: "/admin/impostazioni", icon: Settings, label: "Impostazioni" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-5 border-b border-sidebar-border"><AuroraLogo size="md" /></div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((i) => {
            const active = path === i.to || (i.to !== "/admin" && path.startsWith(i.to));
            return (
              <Link key={i.to} to={i.to} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                <i.icon size={16} /> {i.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={signOut} className="m-3 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent">
          <LogOut size={16} /> Logout
        </button>
      </aside>
      <main className="flex-1 overflow-x-auto">
        <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-background">
          <h1 className="text-lg font-semibold text-foreground">Dashboard admin</h1>
          <Link to="/home" className="text-xs text-primary">← Torna all'app</Link>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}