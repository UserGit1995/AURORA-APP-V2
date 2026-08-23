import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Home as HomeIcon,
  LayoutGrid,
  Tag,
  Sparkles,
  ClipboardList,
  Scale,
  Info,
  MapPin,
  FileText,
  Phone,
  LogIn,
  LogOut,
  Shield,
  Heart,
} from "lucide-react";
import { AuroraLogo } from "./AuroraLogo";
import { useAuth } from "@/hooks/useAuth";

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { session, isAdmin, signOut } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border overflow-y-auto">
      <div className="px-5 py-6">
        <AuroraLogo size="lg" />
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <SidebarLink to="/home" icon={<HomeIcon size={18} />} active={path === "/home"}>
          Home
        </SidebarLink>
        <SidebarLink to="/categorie" icon={<LayoutGrid size={18} />} active={path.startsWith("/categorie")}>
          Categorie
        </SidebarLink>
        <SidebarLink to="/offerte" icon={<Tag size={18} />} active={path === "/offerte"}>
          Offerte
        </SidebarLink>
        <SidebarLink to="/novita" icon={<Sparkles size={18} />} active={path === "/novita"}>
          Novità
        </SidebarLink>
        <SidebarLink to="/preferiti" icon={<Heart size={18} />} active={path === "/preferiti"}>
          Preferiti
        </SidebarLink>
        <SidebarLink to="/confronta" icon={<Scale size={18} />} active={path === "/confronta"}>
          Confronta
        </SidebarLink>
        <SidebarLink to="/i-miei-ordini" icon={<ClipboardList size={18} />} active={path === "/i-miei-ordini"}>
          I miei ordini
        </SidebarLink>

        <div className="pt-4 mt-4 border-t border-sidebar-border space-y-1">
          <SidebarLink to="/consegne" icon={<Info size={18} />} active={path === "/consegne"}>
            Informazioni consegne
          </SidebarLink>
          <SidebarLink to="/contatti" icon={<Phone size={18} />} active={path === "/contatti"}>
            Contatti
          </SidebarLink>
          <SidebarLink to="/chi-siamo" icon={<Info size={18} />} active={path === "/chi-siamo"}>
            Chi siamo
          </SidebarLink>
          <SidebarLink to="/dove-siamo" icon={<MapPin size={18} />} active={path === "/dove-siamo"}>
            Dove siamo
          </SidebarLink>
          <SidebarLink to="/cataloghi" icon={<FileText size={18} />} active={path === "/cataloghi"}>
            Cataloghi PDF
          </SidebarLink>
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        {isAdmin && (
          <SidebarLink to="/admin" icon={<Shield size={18} />} active={path.startsWith("/admin")}>
            Pannello admin
          </SidebarLink>
        )}
        {session ? (
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent w-full text-left text-sm"
          >
            <LogOut size={18} /> Esci
          </button>
        ) : (
          <SidebarLink to="/auth" icon={<LogIn size={18} />} active={path === "/auth"}>
            Accedi / Registrati
          </SidebarLink>
        )}
      </div>
    </aside>
  );
}

function SidebarLink({ to, icon, children, active }: { to: string; icon: ReactNode; children: ReactNode; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
          : "text-sidebar-foreground hover:bg-sidebar-accent"
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
