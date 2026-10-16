import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './nuova.css';
import './nuova-pagine.css';
import './skin.css';
import { Ic, Bi, vib, eur } from './Icona';
import { TOAST_EVENT } from './fx';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import type { NavTab } from '../components/Sidebar';
import type { Product } from '../types';
import { CardRendererContext } from './cardContext';
import { NuovaCard } from './NuovaCard';

/** Dati che servono alle schede prodotto della grafica nuova in tutte le pagine */
export interface CardEnv {
  cartQty: Record<string, number>;
  favorites: string[];
  comparedIds: string[];
  priceFactor: number;
  onOpen: (p: Product) => void;
  onAdd: (p: Product) => void;
  onRemoveOne: (p: Product) => void;
  onToggleFavorite: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

export const LOGO = '/nuova/logo.svg';
export const EMBLEM = '/nuova/emblem.svg';

export interface NuovaShellProps {
  activeTab: NavTab;
  isHome: boolean;
  onNavigate: (tab: NavTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  onOpenAdminPanel: () => void;
  onOpenContact: () => void;
  onOpenQr: () => void;
  /** carrello aperto: si illumina la voce Carrello e gli altri tasti lo chiudono */
  cartOpen?: boolean;
  /** Catalogo e Offerte: come nel prototipo, senza intestazione in alto (solo telefono) */
  bareTop?: boolean;
  /** livello sopra la pagina ma sotto la barra in basso (es. il carrello) */
  overlay?: React.ReactNode;
  onCloseCart?: () => void;
  favoritesCount: number;
  comparedCount: number;
  chatUnread: number;
  isAdmin: boolean;
  currentUser: { name?: string; avatarInitials?: string } | null;
  onLogout: () => void;
  minimumOrderEur: number;
  cardEnv: CardEnv;
  children: React.ReactNode;
}

const isInstalledApp = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    /AuroraApp\//.test(window.navigator.userAgent));

/** Logo Aurora con i giochi di luce (alone, riflesso che passa, scintille). */
export const LogoAnimato: React.FC<{ className?: string }> = ({ className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => el.style.setProperty('--w', `${el.offsetWidth}px`);
    set();
    const img = el.querySelector('img');
    img?.addEventListener('load', set);
    window.addEventListener('resize', set);
    return () => {
      img?.removeEventListener('load', set);
      window.removeEventListener('resize', set);
    };
  }, []);
  return (
    <span ref={ref} className={`n-lw${className ? ' ' + className : ''}`} role="img" aria-label="Aurora">
      <span className="n-halo"><i /></span>
      <img className="n-hlogo" src={LOGO} alt="" />
      <span className="n-shine"><b /></span>
      <span className="n-tw s1" />
      <span className="n-tw s2" />
      <span className="n-tw s3" />
    </span>
  );
};

/** Logo "SA" di Simone Aricò con solo il riflesso di luce. */
export const FirmaSA: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" className="n-sal" onClick={onClick} aria-label="Simone Aricò, web design e coding">
    <span className="n-sglow" />
    <img src="/nuova/sa-logo.svg" alt="" />
    <span className="n-sshine"><b /></span>
  </button>
);

const Toast: React.FC = () => {
  const [state, setState] = useState<{ text: string; img?: string; on: boolean }>({ text: '', on: false });
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const onToast = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      setState({ text: d.text || '', img: d.img, on: true });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState((s) => ({ ...s, on: false })), 1800);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      window.clearTimeout(timer.current);
    };
  }, []);
  return (
    <div className={`n-toast${state.on ? ' on' : ''}`} role="status" aria-live="polite">
      {state.img ? <img src={state.img} alt="" /> : null}
      <span>{state.text}</span>
    </div>
  );
};

const TABS: { tab: NavTab | 'cart'; label: string; icon: string }[] = [
  { tab: 'home', label: 'Home', icon: 'home' },
  { tab: 'categorie', label: 'Catalogo', icon: 'grid' },
  { tab: 'offerte', label: 'Offerte', icon: 'tag' },
  { tab: 'chat', label: 'Chat', icon: 'whats' },
  { tab: 'cart', label: 'Carrello', icon: 'bag' },
];

const DESK_LINKS: { tab: NavTab; label: string }[] = [
  { tab: 'home', label: 'Home' },
  { tab: 'categorie', label: 'Catalogo' },
  { tab: 'offerte', label: 'Offerte' },
  { tab: 'novita', label: 'Novità eco e bio' },
  { tab: 'piu-venduti', label: 'I più venduti' },
  { tab: 'ordini', label: 'I miei ordini' },
  { tab: 'chat', label: 'Chat con noi' },
  { tab: 'personalizza', label: 'Personalizza packaging' },
];

/** pagine che, come nel prototipo, hanno la loro barra in alto al posto dell'intestazione (solo telefono) */
const PAGE_TABS: string[] = ['personalizza', 'chat', 'privacy', 'termini', 'consegne', 'installa'];

export const NuovaShell: React.FC<NuovaShellProps> = (p) => {
  const [drawer, setDrawer] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  // pagine senza intestazione: la lente della pagina la fa ricomparire per cercare
  const [reveal, setReveal] = useState(false);
  useEffect(() => setReveal(false), [p.activeTab, p.bareTop]);
  useEffect(() => {
    const open = () => {
      if (PAGE_TABS.includes(p.activeTab)) p.onNavigate('home');
      setReveal(true);
      window.scrollTo({ top: 0 });
      window.setTimeout(() => searchRef.current?.focus(), 150);
    };
    window.addEventListener('n-open-search', open);
    return () => window.removeEventListener('n-open-search', open);
  }, [p.activeTab]);
  const searchRef = useRef<HTMLInputElement>(null);
  const tabRef = useRef<HTMLElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const voice = useVoiceSearch((text) => p.onSearchChange(text));

  // Colore di fondo della pagina (anche dietro la barra del telefono) e caratteri della grafica nuova
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('ng-on');
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute('content');
    meta?.setAttribute('content', '#07111f');
    return () => {
      html.classList.remove('ng-on');
      if (meta && prev) meta.setAttribute('content', prev);
    };
  }, []);

  // Header che si nasconde scorrendo in giù e torna scorrendo in su
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setSolid(y > 40);
        const typing = document.activeElement === searchRef.current;
        if (y < 140 || typing) setHidden(false);
        else if (y > lastY + 6) setHidden(true);
        else if (y < lastY - 6) setHidden(false);
        if (Math.abs(y - lastY) > 6 || y < 140) lastY = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Effetto "onda" sui pulsanti principali
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const b = (e.target as HTMLElement)?.closest?.('.ng .n-btn, .ng .n-act') as HTMLElement | null;
      if (!b) return;
      const r = b.getBoundingClientRect();
      const s = Math.max(r.width, r.height);
      const d = document.createElement('span');
      d.className = 'n-ripple';
      d.style.width = d.style.height = `${s}px`;
      d.style.left = `${e.clientX - r.left - s / 2}px`;
      d.style.top = `${e.clientY - r.top - s / 2}px`;
      b.appendChild(d);
      window.setTimeout(() => d.remove(), 650);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  // Menu: chiusura con Esc e pagina ferma sotto il menu aperto
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  const tabIndex = p.cartOpen
    ? TABS.findIndex((t) => t.tab === 'cart')
    : TABS.findIndex((t) => t.tab === p.activeTab && !(p.activeTab === 'home' && !p.isHome));

  // Indicatore che scivola sotto la voce attiva della barra in basso
  useLayoutEffect(() => {
    const nav = tabRef.current;
    const ind = indRef.current;
    if (!nav || !ind) return;
    const place = () => {
      const btns = nav.querySelectorAll<HTMLButtonElement>('button');
      const b = tabIndex >= 0 ? btns[tabIndex] : null;
      if (!b) {
        ind.style.opacity = '0';
        return;
      }
      ind.style.opacity = '1';
      ind.style.transform = `translateX(${b.offsetLeft + b.offsetWidth / 2 - 28}px)`;
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [tabIndex]);

  const go = (tab: NavTab) => {
    setDrawer(false);
    vib(6);
    if (p.cartOpen) p.onCloseCart?.();
    if (tab === p.activeTab && p.isHome && tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    p.onNavigate(tab);
  };

  const installed = isInstalledApp();
  const NAV: { id: NavTab | 'installa' | 'contatti'; label: string; icon: string; count?: number }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'categorie', label: 'Categorie', icon: 'grid' },
    { id: 'offerte', label: 'Offerte speciali', icon: 'tag' },
    { id: 'novita', label: 'Novità eco e bio', icon: 'leaf' },
    { id: 'piu-venduti', label: 'I più venduti', icon: 'flame' },
    { id: 'ordini', label: 'I miei ordini', icon: 'orders' },
    { id: 'chat', label: 'Chat con noi', icon: 'chat', count: p.chatUnread || undefined },
    { id: 'preferiti', label: 'Preferiti', icon: 'heart', count: p.favoritesCount || undefined },
    { id: 'confronta', label: 'Confronta', icon: 'compare', count: p.comparedCount || undefined },
    { id: 'personalizza', label: 'Personalizza packaging', icon: 'palette' },
    ...(installed ? [] : [{ id: 'installa' as const, label: "Scarica l'app", icon: 'download' }]),
    { id: 'termini', label: 'Termini e condizioni', icon: 'doc' },
    { id: 'privacy', label: 'Informativa privacy', icon: 'shield' },
  ];

  const initials = (p.currentUser?.avatarInitials || p.currentUser?.name || '?').slice(0, 2).toUpperCase();

  return (
    <div className="ng">
      <div className="n-aur" aria-hidden="true"><i className="r1" /><i className="r2" /><i className="r3" /><i className="r4" /></div>

      <header className={`n-hdr${hidden && !drawer ? ' hide' : ''}${solid ? ' solid' : ''}${(PAGE_TABS.includes(p.activeTab) || p.bareTop) && !reveal ? ' gone' : ''}`}>
        <div className="n-wrap">
          <div className="n-hrow">
            <div className="n-hside">
              <button type="button" className="n-ibtn" onClick={() => { setDrawer(true); vib(6); }} aria-label="Apri il menu">
                <Ic n="menu" s={22} />
              </button>
            </div>
            <button type="button" className="n-logo" onClick={() => go('home')} aria-label="Torna alla home">
              <LogoAnimato />
            </button>
            <label className="n-sbar">
              <Ic n="search" s={19} />
              <input
                ref={searchRef}
                type="text"
                autoComplete="off"
                inputMode="search"
                enterKeyHint="search"
                value={p.searchQuery}
                onChange={(e) => p.onSearchChange(e.target.value)}
                placeholder={voice.isListening ? 'Parla adesso…' : 'Cerca articoli, marche e codici'}
                aria-label="Cerca nel catalogo"
              />
              {p.searchQuery ? (
                <button type="button" className="q" onClick={() => p.onSearchChange('')} aria-label="Cancella la ricerca">
                  <Ic n="x" s={16} />
                </button>
              ) : null}
              {voice.isSupported && (
                <button type="button" className={`q${voice.isListening ? ' rec' : ''}`} onClick={voice.toggle} aria-label="Ricerca vocale">
                  <Ic n="mic" s={18} />
                </button>
              )}
              <button type="button" className="q" onClick={p.onOpenQr} aria-label="Scansiona il codice di un prodotto">
                <Ic n="qr" s={18} />
              </button>
            </label>
            <div className="n-hside r">
              <button type="button" className="n-ibtn" onClick={p.onOpenNotifications} aria-label="Notifiche">
                <Ic n="bell" s={21} />
                {p.unreadNotificationsCount > 0 && <span className="n-badge">{p.unreadNotificationsCount}</span>}
              </button>
              <button type="button" className="n-ibtn n-cartbtn-m" onClick={p.onOpenCart} aria-label="Carrello">
                <Ic n="bag" s={21} />
                {p.cartCount > 0 && <span className="n-badge">{p.cartCount}</span>}
              </button>
              <button type="button" className="n-cartpill" data-ng-cart onClick={p.onOpenCart} aria-label="Apri il carrello">
                <Ic n="bag" s={19} />
                <span>{p.cartCount > 0 ? eur(p.cartTotal) : 'Carrello'}</span>
                {p.cartCount > 0 && <span className="n-badge">{p.cartCount}</span>}
              </button>
            </div>
          </div>
          {voice.error && <p className="n-serr">{voice.error}</p>}
          <nav className="n-dlinks" aria-label="Sezioni">
            {DESK_LINKS.map((l) => (
              <button key={l.tab} type="button" className={p.activeTab === l.tab && (l.tab !== 'home' || p.isHome) ? 'on' : ''} onClick={() => go(l.tab)}>
                {l.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="n-main">
        <CardRendererContext.Provider
          value={(x: Product) => (
            <NuovaCard
              key={x.id}
              product={x}
              qty={p.cardEnv.cartQty[x.id] || 0}
              isFavorite={p.cardEnv.favorites.includes(x.id)}
              isCompared={p.cardEnv.comparedIds.includes(x.id)}
              priceFactor={p.cardEnv.priceFactor}
              onOpen={p.cardEnv.onOpen}
              onAdd={p.cardEnv.onAdd}
              onRemoveOne={p.cardEnv.onRemoveOne}
              onToggleFavorite={p.cardEnv.onToggleFavorite}
            />
          )}
        >
          {p.children}
        </CardRendererContext.Provider>
      </main>

      <footer className={`n-foot${PAGE_TABS.includes(p.activeTab) ? ' pg' : ''}`}>
        <div className="n-frow">
          <span>© {new Date().getFullYear()} Aurora S.r.l.s</span>
          <FirmaSA onClick={() => go('creatore')} />
          <button type="button" className="crea" onClick={() => go('creatore')}>
            <span className="n-sa">SA</span>Simone Aricò
          </button>
        </div>
      </footer>

      {p.overlay}
      <nav className={`n-tab${PAGE_TABS.includes(p.activeTab) && p.activeTab !== 'chat' && !p.cartOpen ? ' off' : ''}`} ref={tabRef} aria-label="Navigazione principale">
        <span className="ind" ref={indRef} />
        {TABS.map((t, i) => (
          <button
            key={t.tab}
            type="button"
            className={i === tabIndex ? 'on' : ''}
            onClick={() => (t.tab === 'cart' ? (vib(6), p.onOpenCart()) : go(t.tab as NavTab))}
            {...(t.tab === 'cart' ? { 'data-ng-cart': '' } : {})}
            aria-current={i === tabIndex ? 'page' : undefined}
          >
            <Ic n={t.icon} s={22} />
            {t.label}
            {t.tab === 'chat' && p.chatUnread > 0 && <span className="n-badge">{p.chatUnread}</span>}
            {t.tab === 'cart' && p.cartCount > 0 && <span className="n-badge">{p.cartCount}</span>}
          </button>
        ))}
      </nav>

      <div className={`n-scrim${drawer ? ' on' : ''}`} onClick={() => setDrawer(false)} />
      <aside className={`n-drawer${drawer ? ' on' : ''}`} aria-hidden={!drawer} aria-label="Menu">
        <img className="emb" src={EMBLEM} alt="" />
        <div className="n-dh">
          <img src={LOGO} alt="Aurora" />
          <button type="button" className="n-xb" onClick={() => setDrawer(false)} aria-label="Chiudi il menu">
            <Ic n="x" s={18} />
          </button>
        </div>
        {p.currentUser ? (
          <div className="n-dacc">
            <span className="n-av">{initials}</span>
            <button type="button" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => { setDrawer(false); p.onOpenProfile(); }}>
              <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.currentUser.name}</b>
              <small>Il mio profilo</small>
            </button>
            <button type="button" className="out" onClick={() => { setDrawer(false); p.onLogout(); }} aria-label="Esci" title="Esci">
              <Ic n="logout" s={19} />
            </button>
          </div>
        ) : (
          <button type="button" className="n-dacc" onClick={() => { setDrawer(false); p.onOpenLogin(); }}>
            <span className="n-av"><Ic n="user" s={20} /></span>
            <span><b>Accedi o registrati</b><small>Ordini, preferiti e riordino rapido</small></span>
          </button>
        )}
        {p.isAdmin && (
          <button type="button" className="n-dadmin" onClick={() => { setDrawer(false); p.onOpenAdminPanel(); }}>
            <Ic n="sliders" s={19} /> Pannello di gestione
          </button>
        )}
        <nav className="n-dnav">
          {NAV.map((item, k) => (
            <button
              key={item.id}
              type="button"
              className={p.activeTab === item.id && (item.id !== 'home' || p.isHome) ? 'on' : ''}
              style={{ transitionDelay: drawer ? `${0.05 + k * 0.025}s` : '0s' }}
              onClick={() => {
                if (item.id === 'installa') {
                  go('installa');
                  return;
                }
                if (item.id === 'contatti') {
                  setDrawer(false);
                  p.onOpenContact();
                  return;
                }
                go(item.id);
              }}
            >
              <Ic n={item.icon} s={19} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="n-dcrea" onClick={() => go('creatore')}>
          <span className="n-sa">SA</span>
          <span><small>Ideata e sviluppata da</small><b>Simone Aricò</b></span>
        </button>
      </aside>

      <Toast />
    </div>
  );
};
