import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Home as HomeIcon,
  LayoutGrid,
  Tag,
  Sparkles,
  Flame,
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
  RotateCw,
  User,
} from "lucide-react";
import { AuroraLogo } from "./AuroraLogo";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/lib/favorites-context";
import { useCompare } from "@/lib/compare-context";

export function Sidebar({ onOpenTemplates }: { onOpenTemplates: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { session, isAdmin, signOut } = useAuth();
  const { favorites } = useFavorites();
  const { comparedIds } = useCompare();

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
        <SidebarLink to="/piu-venduti" icon={<Flame size={18} />} active={path === "/piu-venduti"}>
          I più venduti
        </SidebarLink>
        <SidebarLink to="/i-miei-ordini" icon={<ClipboardList size={18} />} active={path === "/i-miei-ordini"}>
          Ordini
        </SidebarLink>
        <SidebarLink to="/preferiti" icon={<Heart size={18} />} active={path === "/preferiti"} badge={favorites.length}>
          Preferiti
        </SidebarLink>
        <SidebarLink
          to="/confronta"
          icon={<Scale size={18} />}
          active={path === "/confronta"}
          badge={comparedIds.length}
          badgeColor="bg-amber-500/20 text-amber-300"
        >
          Confronta
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

      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        {session && (
          <SidebarLink to="/account" icon={<User size={18} />} active={path === "/account"}>
            Il mio profilo
          </SidebarLink>
        )}
        {isAdmin && (
          <SidebarLink to="/admin" icon={<Shield size={18} />} active={path.startsWith("/admin")}>
            Pannello admin
          </SidebarLink>
        )}

        {!session && (
          <Link
            to="/auth"
            className="w-full bg-[#081730] hover:bg-[#0c2247] border border-sky-500/25 text-slate-200 hover:text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2">
              <LogIn className="w-3.5 h-3.5 text-sky-400" />
              <span>Portale Login B2B</span>
            </div>
            <span className="text-[10px] text-sky-400 font-mono bg-sky-500/15 px-1.5 py-0.5 rounded">SDI</span>
          </Link>
        )}

        <button
          onClick={onOpenTemplates}
          className="w-full bg-[#09152b] hover:bg-[#0e2142] border border-sky-500/30 hover:border-sky-400/60 text-white text-xs font-bold py-2.5 px-3 rounded-2xl transition-all flex items-center justify-between shadow-md shadow-sky-950/30 group text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30">
              <RotateCw className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="block text-white text-xs font-bold">Riordino Rapido</span>
              <span className="block text-[10px] text-sky-400 font-medium">1-Click • Senza Carte</span>
            </div>
          </div>
          <span className="text-sky-400 group-hover:translate-x-1 transition-transform text-xs font-bold">→</span>
        </button>

        <div className="bg-[#091325] border border-[#162846] rounded-2xl p-4 text-left shadow-md">
          <h4 className="text-white text-xs font-semibold tracking-wide">Hai bisogno di aiuto?</h4>
          <p className="text-slate-400 text-[11px] leading-relaxed mt-1">Il nostro team è a tua disposizione</p>
          <Link
            to="/contatti"
            className="mt-3.5 w-full bg-primary hover:bg-sky-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors duration-150 text-center flex items-center justify-center gap-1.5 shadow-sm"
          >
            Contattaci
          </Link>
        </div>

        {session && (
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent w-full text-left text-sm"
          >
            <LogOut size={18} /> Esci
          </button>
        )}
      </div>
    </aside>
  );
}

function SidebarLink({
  to,
  icon,
  children,
  active,
  badge,
  badgeColor,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  active: boolean;
  badge?: number;
  badgeColor?: string;
}) {
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
      <span className="flex-1">{children}</span>
      {!!badge && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor ?? "bg-primary/20 text-primary"}`}>
          {badge}
        </span>
      )}
    </Link>
  );
}
