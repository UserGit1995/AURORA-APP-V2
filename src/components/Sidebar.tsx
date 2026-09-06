import React from 'react';
import { 
  Home, 
  LayoutGrid, 
  Tag, 
  Sparkles, 
  Flame, 
  ClipboardList, 
  Heart, 
  Scale, 
  Menu, 
  X, 
  RotateCw,
  LogIn,
  SlidersHorizontal
} from 'lucide-react';
import { AuroraLogo } from './AuroraLogo';
import { useLanguage } from '../context/LanguageContext';
import { useAdmin } from '../context/AdminContext';

export type NavTab = 'home' | 'categorie' | 'offerte' | 'novita' | 'piu-venduti' | 'ordini' | 'preferiti' | 'confronta';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenContact: () => void;
  onOpenQuickReorder?: () => void;
  onOpenLogin?: () => void;
  onOpenAdminPanel?: () => void;
  favoritesCount: number;
  comparedCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenContact,
  onOpenQuickReorder,
  onOpenLogin,
  onOpenAdminPanel,
  favoritesCount,
  comparedCount = 0,
  isOpenMobile,
  onCloseMobile
}) => {
  const { t } = useLanguage();
  const { isAdmin } = useAdmin();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    { id: 'home', label: t('nav.home', 'Home'), icon: <Home className="w-[18px] h-[18px]" /> },
    { id: 'categorie', label: t('nav.categories', 'Categorie'), icon: <LayoutGrid className="w-[18px] h-[18px]" /> },
    { id: 'offerte', label: t('nav.deals', 'Offerte'), icon: <Tag className="w-[18px] h-[18px]" /> },
    { id: 'novita', label: t('nav.news', 'Novità'), icon: <Sparkles className="w-[18px] h-[18px]" /> },
    { id: 'piu-venduti', label: t('nav.bestsellers', 'I più venduti'), icon: <Flame className="w-[18px] h-[18px]" /> },
    { id: 'ordini', label: t('nav.orders', 'Ordini'), icon: <ClipboardList className="w-[18px] h-[18px]" /> },
    { 
      id: 'preferiti', 
      label: t('nav.favorites', 'Preferiti'), 
      icon: <Heart className="w-[18px] h-[18px]" />,
      badge: favoritesCount > 0 ? favoritesCount : undefined
    },
    {
      id: 'confronta',
      label: t('nav.compare', 'Confronta'),
      icon: <Scale className="w-[18px] h-[18px]" />,
      badge: comparedCount > 0 ? comparedCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-700'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-60 bg-white border-r border-slate-200 overflow-y-auto p-4 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="min-h-full flex flex-col justify-between pb-6">
          {/* Top Logo and Header */}
          <div>
            <div className="flex items-center justify-between px-2 pt-2 pb-4">
              <AuroraLogo size="md" />
              {isOpenMobile && (
                <button 
                  onClick={onCloseMobile}
                  className="lg:hidden text-slate-400 hover:text-slate-700 p-1"
                  aria-label="Chiudi menu"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5 mt-2">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => {
                      onSelectTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : item.badgeColor 
                            ? item.badgeColor 
                            : 'bg-sky-100 text-sky-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Reorder, B2B Portal Login & Bottom Help Card */}
          <div className="pt-6 space-y-2.5 mt-auto">
            {isAdmin && onOpenAdminPanel && (
              <button
                id="sidebar-superadmin-control-btn"
                type="button"
                onClick={() => {
                  onOpenAdminPanel();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Pannello di gestione</span>
                </div>
              </button>
            )}

            {onOpenLogin && (
              <button
                id="sidebar-b2b-login-btn"
                type="button"
                onClick={() => {
                  onOpenLogin();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-between shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <LogIn className="w-3.5 h-3.5 text-sky-600" />
                  <span>{t('nav.login', 'Accedi / Registrati')}</span>
                </div>
                <span className="text-[10px] text-sky-700 font-mono bg-sky-100 px-1.5 py-0.5 rounded">ACCOUNT</span>
              </button>
            )}

            {onOpenQuickReorder && (
              <button
                id="sidebar-quick-reorder-btn"
                type="button"
                onClick={() => {
                  onOpenQuickReorder();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full bg-sky-600 hover:bg-sky-500 border border-sky-600 text-white text-xs font-bold py-2.5 px-3 rounded-2xl transition-all flex items-center justify-between group text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-white/15 text-white">
                    <RotateCw className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="block text-white text-xs font-bold">{t('nav.quickReorder', 'Riordino Rapido')}</span>
                    <span className="block text-[10px] text-sky-100 font-medium">{t('nav.quickReorderSub', '1-Click • Senza Carte')}</span>
                  </div>
                </div>
                <span className="text-white group-hover:translate-x-1 transition-transform text-xs font-bold">→</span>
              </button>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
              <h4 className="text-slate-900 text-xs font-semibold tracking-wide">
                {t('nav.helpTitle', 'Hai bisogno di aiuto?')}
              </h4>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-1">
                {t('nav.helpSub', 'Il nostro team è a tua disposizione')}
              </p>
              <button
                id="sidebar-contact-button"
                type="button"
                onClick={onOpenContact}
                className="mt-3.5 w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors duration-150 text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {t('nav.contactUs', 'Contattaci')}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
