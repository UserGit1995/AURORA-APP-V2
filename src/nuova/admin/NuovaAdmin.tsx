import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Order, Product } from '../../types';
import { hasProductImage } from '../../utils/imageFirst';
import {
  ChatConversation, ChatMessage, adminDeleteChat, adminFetchChat, adminListChats, adminSendChat, adminUnreadCount,
  formatChatTime, mergeMessages,
} from '../../services/chat';
import { listCustomizationRequests } from '../../services/customization';
import { Ic, Bi, eur, vib } from '../Icona';
import { ClientiView } from './gestione/Clienti';
import { MagazzinoView } from './gestione/Magazzino';
import { AziendaView, DdtView, FattureView } from './gestione/Documenti';
import { CLIENTE_VUOTO, Ddt, clientiCaricati, save as gSave, load as gLoad, soloCifre } from './gestione/store';
import './nuova-admin.css';

/*
 * Pannello di gestione con la grafica del prototipo "Aurora Pannello Admin".
 * Panoramica, Prodotti, Ordini e Chat sono rifatti come nel prototipo e usano i dati veri;
 * le altre sezioni hanno l'intestazione del prototipo e sotto gli strumenti di sempre.
 */

export type AdmTab =
  | 'overview' | 'products' | 'orders' | 'categories' | 'subcategories' | 'images' | 'removebg' | 'requests'
  | 'packaging' | 'flash' | 'flyer' | 'backup' | 'supplierphotos' | 'settings' | 'chat'
  | 'clienti' | 'magazzino' | 'ddt' | 'fatture' | 'azienda';

type Go = (id: AdmTab | 'more') => void;

const fmtN = (n: number) => n.toLocaleString('it-IT');

function parseDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}

const STATUS: Order['status'][] = ['In elaborazione', 'Spedito', 'Consegnato'];
const PILL: Record<Order['status'], string> = {
  'In elaborazione': 'a-p-new',
  Spedito: 'a-p-ship',
  Consegnato: 'a-p-done',
  Annullato: 'a-p-bad',
};
const Pill: React.FC<{ s: Order['status'] }> = ({ s }) => (
  <span className={`a-pill ${PILL[s]}`}><i />{s}</span>
);

const clientOf = (o: Order) => o.shippingAddress?.companyName || o.shippingAddress?.recipient || 'Cliente';
const zoneOf = (o: Order) => {
  const a = o.shippingAddress;
  if (!a) return '';
  if (a.deliveryOption === 'ritiro_sede') return 'Ritiro in sede';
  return [a.city, a.province].filter(Boolean).join(', ');
};

const isLow = (p: Product) => p.stock > 0 && p.stock < ((p.lowStockThreshold ?? 0) > 0 ? (p.lowStockThreshold as number) : 20);

/* ---------------- menu ---------------- */
type NavItem = { id: AdmTab; icon: string; label: string; badge?: string; hot?: boolean; desc: string; big?: string; em?: string };

export interface NuovaAdminProps {
  activeTab: AdmTab;
  onGo: (id: AdmTab) => void;
  onClose: () => void;
  chatUnread: number;
  onChatUnread: (n: number) => void;
  newRequests: number;
  onNewRequests: (n: number) => void;
  onNewProduct: () => void;
  onEditProductFull: (p: Product) => void;
  onEditOrderFull: (o: Order) => void;
  onRemoveBg: (productId: string | null) => void;
  supplierPhotos: number;
  backupDue: boolean;
  /** contenuto delle sezioni che restano quelle di sempre */
  children?: React.ReactNode;
  /** schede complete di prodotto e ordine */
  modals?: React.ReactNode;
}

export const NuovaAdmin: React.FC<NuovaAdminProps> = (p) => {
  const { currentUser, productsList, categoriesList, subcategoriesList, ordersList, logout } = useAdmin();
  const [more, setMore] = useState(false);
  const [side, setSide] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastT = useRef(0);
  const toast = useCallback((t: string) => {
    setToastMsg(t);
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToastMsg(null), 1900);
  }, []);

  // contatori che servono anche quando la sezione non è aperta
  useEffect(() => {
    let alive = true;
    const load = () => {
      adminUnreadCount().then((n) => alive && p.onChatUnread(n)).catch(() => {});
    };
    load();
    listCustomizationRequests()
      .then((rows) => alive && p.onNewRequests(rows.filter((r) => r.status === 'new').length))
      .catch(() => {});
    const t = window.setInterval(() => document.visibilityState === 'visible' && load(), 15000);
    return () => { alive = false; window.clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toDo = ordersList.filter((o) => o.status === 'In elaborazione').length;
  const noPhoto = useMemo(() => productsList.filter((x) => !hasProductImage(x)).length, [productsList]);

  const NAV: [string, NavItem[]][] = [
    ['Generale', [{ id: 'overview', icon: 'dash', label: 'Panoramica', desc: 'Riepilogo di vendite, ordini e avvisi.' }]],
    ['Catalogo', [
      { id: 'products', icon: 'package', label: 'Prodotti', badge: fmtN(productsList.length), desc: 'Modifica prezzi, giacenze, schede tecniche e foto.', big: 'boxes', em: `${fmtN(productsList.length)} prodotti` },
      { id: 'categories', icon: 'folder', label: 'Categorie', badge: fmtN(categoriesList.length), desc: 'Crea, rinomina e ordina le categorie principali del catalogo.', big: 'catalog', em: `${fmtN(categoriesList.length)} categorie` },
      { id: 'subcategories', icon: 'tree', label: 'Sottocategorie', badge: fmtN(subcategoriesList.length), desc: 'Gestisci marche, tipologie e sottosezioni di ogni categoria.', em: `${fmtN(subcategoriesList.length)} sottocategorie` },
    ]],
    ['Vendite e promozioni', [
      { id: 'orders', icon: 'orders', label: 'Ordini', badge: toDo ? String(toDo) : undefined, hot: true, desc: 'Controlla e aggiorna lo stato degli ordini.', big: 'invoice', em: toDo ? `${toDo} da evadere` : undefined },
      { id: 'flash', icon: 'timer', label: 'Offerte a tempo', desc: 'Programma prezzi in offerta con inizio e fine.', big: 'clock' },
      { id: 'flyer', icon: 'book', label: 'Volantino', desc: 'Carica il volantino sfogliabile della home.' },
    ]],
    ['Clienti', [
      { id: 'chat', icon: 'chat', label: 'Chat clienti', badge: p.chatUnread ? String(p.chatUnread) : undefined, hot: true, desc: 'Leggi e rispondi ai messaggi dei clienti.', big: 'chat', em: p.chatUnread ? `${p.chatUnread} da leggere` : undefined },
      { id: 'clienti', icon: 'user', label: 'Portafoglio clienti', desc: 'Rubrica dei clienti: salvali dalla chat, da WhatsApp o dal telefono.', big: 'whats' },
    ]],
    ['Gestionale', [
      { id: 'magazzino', icon: 'grid', label: 'Magazzino', desc: 'Giacenze, carichi, scarichi e storico dei movimenti.', big: 'boxes' },
      { id: 'ddt', icon: 'truck', label: 'DDT', desc: 'Documenti di trasporto in PDF col tuo logo.', big: 'truck' },
      { id: 'fatture', icon: 'doc', label: 'Fatture elettroniche', desc: 'Fatture e note di credito: PDF col logo e file XML per lo SDI.', big: 'invoice' },
      { id: 'azienda', icon: 'home', label: 'Dati azienda', desc: 'Intestazione, partita IVA e IBAN usati nei documenti.' },
    ]],
    ['Personalizzazioni', [
      { id: 'requests', icon: 'palette', label: 'Richieste', badge: p.newRequests ? String(p.newRequests) : undefined, hot: true, desc: 'Richieste di packaging personalizzato inviate dai clienti.', big: 'palette', em: p.newRequests ? `${p.newRequests} nuove` : undefined },
      { id: 'packaging', icon: 'tag', label: 'Prezzi personalizzazione', desc: 'Listino e opzioni per il packaging personalizzato.' },
    ]],
    ['Immagini', [
      { id: 'images', icon: 'image', label: 'Immagini prodotti', desc: 'Importa, cerca e controlla le foto dei prodotti.', em: noPhoto ? `${fmtN(noPhoto)} senza foto` : undefined },
      { id: 'supplierphotos', icon: 'copy', label: 'Copia foto fornitore', badge: p.supplierPhotos ? fmtN(p.supplierPhotos) : undefined, desc: 'Salva nel tuo spazio le foto collegate al sito del fornitore.' },
      { id: 'removebg', icon: 'scissors', label: 'Rimuovi sfondo', desc: 'Scontorna le foto dei prodotti, una alla volta o in blocco.' },
    ]],
    ['Impostazioni', [
      { id: 'settings', icon: 'sliders', label: 'Parametri', desc: 'Dati aziendali, soglie commerciali e impostazioni generali.' },
      { id: 'backup', icon: 'db', label: 'Backup e ripristino', badge: p.backupDue ? 'da fare' : undefined, hot: p.backupDue, desc: 'Salva una copia di sicurezza di dati e immagini.' },
    ]],
  ];
  const all = NAV.flatMap(([g, it]) => it.map((i) => ({ ...i, group: g })));
  const cur = more ? null : all.find((i) => i.id === p.activeTab) || all[0];

  const go: Go = (id) => {
    vib(6);
    setSide(false);
    if (id === 'more') {
      setMore(true);
      return;
    }
    setMore(false);
    if (id === 'removebg') p.onRemoveBg(null);
    else p.onGo(id);
  };

  // barra in basso
  const TABS: { id: AdmTab | 'more'; icon: string; label: string; b?: number }[] = [
    { id: 'overview', icon: 'dash', label: 'Panoramica' },
    { id: 'products', icon: 'package', label: 'Prodotti' },
    { id: 'orders', icon: 'orders', label: 'Ordini', b: toDo },
    { id: 'chat', icon: 'whats', label: 'Chat', b: p.chatUnread },
    { id: 'more', icon: 'more', label: 'Altro' },
  ];
  const tabIdx = more ? 4 : Math.max(0, TABS.findIndex((t) => t.id === p.activeTab)) === 0 && p.activeTab !== 'overview' ? 4 : TABS.findIndex((t) => t.id === p.activeTab);
  const tabRef = useRef<HTMLElement>(null);
  const [indLeft, setIndLeft] = useState(0);
  useLayoutEffect(() => {
    const place = () => {
      const b = tabRef.current?.querySelectorAll('button')[tabIdx < 0 ? 4 : tabIdx] as HTMLElement | undefined;
      if (b) setIndLeft(b.offsetLeft + b.offsetWidth / 2 - 28);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [tabIdx]);

  // Esc chiude il cassetto
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setSide(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const viewRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (viewRef.current) viewRef.current.scrollTop = 0;
  }, [p.activeTab, more]);

  const [prodQ, setProdQ] = useState('');
  const searchAll = () => {
    go('products');
    window.setTimeout(() => (document.getElementById('a-pq') as HTMLInputElement | null)?.focus(), 250);
  };

  const [daDdt, setDaDdt] = useState<Ddt | null>(null);
  const userName = currentUser?.name || 'Amministratore';
  const view = more ? (
    <MoreView nav={NAV} go={go} />
  ) : p.activeTab === 'overview' ? (
    <DashView go={go} onNewProduct={p.onNewProduct} chatUnread={p.chatUnread} newRequests={p.newRequests} noPhoto={noPhoto} />
  ) : p.activeTab === 'products' ? (
    <ProductsView q={prodQ} setQ={setProdQ} onNew={p.onNewProduct} onFull={p.onEditProductFull} onRemoveBg={(id) => p.onRemoveBg(id)} toast={toast} />
  ) : p.activeTab === 'orders' ? (
    <OrdersView go={go} onFull={p.onEditOrderFull} toast={toast} />
  ) : p.activeTab === 'chat' ? (
    <ChatView onUnread={p.onChatUnread} toast={toast} />
  ) : p.activeTab === 'clienti' ? (
    <ClientiView toast={toast} />
  ) : p.activeTab === 'magazzino' ? (
    <MagazzinoView toast={toast} />
  ) : p.activeTab === 'ddt' ? (
    <DdtView toast={toast} onFattura={(d) => { setDaDdt(d); go('fatture'); }} />
  ) : p.activeTab === 'fatture' ? (
    <FattureView toast={toast} daDdt={daDdt} onDaDdtUsed={() => setDaDdt(null)} />
  ) : p.activeTab === 'azienda' ? (
    <AziendaView toast={toast} />
  ) : cur ? (
    <SectionHead item={cur} />
  ) : null;
  const custom = more || ['overview', 'products', 'orders', 'chat', 'clienti', 'magazzino', 'ddt', 'fatture', 'azienda'].includes(p.activeTab);

  return (
    <div className="na">
      <div className="a-aur" aria-hidden="true"><i className="a-r1" /><i className="a-r2" /></div>
      <div className={`a-scrim${side ? ' a-on' : ''}`} onClick={() => setSide(false)} />
      <aside className={`a-side${side ? ' a-on' : ''}`}>
        <img className="a-emb" src="/nuova/emblem.svg" alt="" />
        <div className="a-brand">
          <img src="/nuova/logo.svg" alt="Aurora" />
          <button type="button" className="a-ib a-mb a-closeside" aria-label="Chiudi" onClick={() => setSide(false)}><Ic n="x" s={18} /></button>
        </div>
        <span className="a-role"><i />Pannello di gestione</span>
        <nav className="a-nav">
          {NAV.map(([g, items]) => (
            <div className="a-ng" key={g}>
              <p>{g}</p>
              {items.map((it) => (
                <button key={it.id} type="button" className={`a-ni${!more && p.activeTab === it.id ? ' a-on' : ''}`} onClick={() => go(it.id)}>
                  <Ic n={it.icon} s={19} />
                  <span>{it.label}</span>
                  {it.badge ? <em className={it.hot ? 'a-hot' : ''}>{it.badge}</em> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="a-me">
          <span className="a-av">{initials(userName)}</span>
          <span><b>{userName}</b><small>Amministratore</small></span>
          <button type="button" aria-label="Esci" title="Esci" onClick={() => { logout(); p.onClose(); }}><Ic n="logout" s={18} /></button>
        </div>
      </aside>
      <main className="a-main">
        <img className="a-bgemb" src="/nuova/emblem.svg" alt="" aria-hidden="true" />
        <header className="a-top">
          <button type="button" className="a-ib a-mb" aria-label="Menu" onClick={() => { setSide(true); vib(6); }}><Ic n="menu" s={20} /></button>
          <img className="a-tlogo" src="/nuova/logo.svg" alt="Aurora" />
          <div className="a-crumb">
            <small>{more ? 'Pannello' : cur?.group}</small>
            <h1>{more ? 'Tutte le sezioni' : cur?.label}</h1>
          </div>
          <button type="button" className="a-tsearch" onClick={searchAll}><Ic n="search" s={18} /><span>Cerca prodotti, ordini, clienti</span></button>
          <button type="button" className="a-ib" aria-label="Vai al negozio" title="Vai al negozio" onClick={p.onClose}><Ic n="storefront" s={19} /></button>
          <button type="button" className="a-ib" aria-label="Notifiche" onClick={() => go('overview')}>
            <Ic n="bell" s={19} />
            {toDo + p.chatUnread + p.newRequests > 0 && <b>{toDo + p.chatUnread + p.newRequests}</b>}
          </button>
          <button type="button" className="a-btn a-prim a-newbtn" onClick={p.onNewProduct}><Ic n="plus" s={16} /> Nuovo prodotto</button>
        </header>
        <div className="a-views">
          <section className="a-view a-on" ref={viewRef}>
            <div className="a-vin" key={more ? 'more' : p.activeTab}>{view}</div>
            {/* le altre sezioni restano montate (es. Rimuovi sfondo non perde il lavoro) */}
            <div className="a-legacy" style={custom ? { display: 'none' } : undefined}>{p.children}</div>
          </section>
        </div>
      </main>
      <nav className="a-tab" ref={tabRef} style={side ? { visibility: 'hidden' } : undefined}>
        <span className="a-ind" style={{ left: indLeft }} />
        {TABS.map((t, i) => (
          <button key={t.id} type="button" className={i === (tabIdx < 0 ? 4 : tabIdx) ? 'a-on' : ''} onClick={() => go(t.id)}>
            <Ic n={t.icon} s={22} />
            {t.label}
            {t.b ? <b>{t.b}</b> : null}
          </button>
        ))}
      </nav>
      <div className={`a-toast${toastMsg ? ' a-on' : ''}`}><i><Ic n="check" s={15} /></i><span>{toastMsg}</span></div>
      {p.modals}
    </div>
  );
};

/* ---------------- intestazione delle altre sezioni ---------------- */
const SectionHead: React.FC<{ item: NavItem }> = ({ item }) => (
  <div className="a-card a-shead">
    {item.big ? (
      <Bi n={item.big} s={46} />
    ) : (
      <span className="a-shic"><Ic n={item.icon} s={28} /></span>
    )}
    <span><b>{item.label}</b><small>{item.desc}</small></span>
  </div>
);

/* ---------------- Altro ---------------- */
const MoreView: React.FC<{ nav: [string, NavItem[]][]; go: Go }> = ({ nav, go }) => (
  <>
    {nav.map(([g, items]) => (
      <React.Fragment key={g}>
        <h2 className="a-moreh">{g}</h2>
        <div className="a-tiles">
          {items.map((it) => (
            <button key={it.id} type="button" className="a-card a-tile" onClick={() => go(it.id)}>
              {it.big ? <Bi n={it.big} s={34} /> : <Ic n={it.icon} s={26} />}
              <b>{it.label}</b>
              <small>{it.desc}</small>
              {it.em ? <em>{it.em}</em> : null}
            </button>
          ))}
        </div>
      </React.Fragment>
    ))}
    <div style={{ height: 10 }} />
  </>
);

/* ---------------- Panoramica ---------------- */
const Spark: React.FC<{ v: number[] }> = ({ v }) => {
  const m = Math.max(1, ...v);
  const d = v.map((x, i) => `${i ? 'L' : 'M'}${((i * 100) / Math.max(1, v.length - 1)).toFixed(1)} ${(38 - (x / m) * 30).toFixed(1)}`).join(' ');
  return (
    <svg className="a-spark" viewBox="0 0 100 40" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="#4cb8ef" strokeWidth="2" strokeOpacity=".55" />
    </svg>
  );
};

const Chart: React.FC<{ v: number[] }> = ({ v }) => {
  const W = 600, H = 190, pad = 24;
  const top = Math.max(300, Math.ceil(Math.max(...v, 1) / 300) * 300);
  const step = (W - pad * 2) / Math.max(1, v.length - 1);
  const pts = v.map((x, i) => [pad + i * step, H - pad - (x / top) * (H - pad * 2)]);
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const grid = [0, top / 3, (top * 2) / 3, top];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Vendite degli ultimi 14 giorni">
      <defs>
        <linearGradient id="a-ga" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4cb8ef" stopOpacity=".35" />
          <stop offset="1" stopColor="#4cb8ef" stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((g) => {
        const y = H - pad - (g / top) * (H - pad * 2);
        return (
          <React.Fragment key={g}>
            <line x1={pad} x2={W - pad} y1={y} y2={y} stroke="rgba(143,180,214,.12)" />
            <text x="0" y={y + 4} fill="#7f94ab" fontSize="10" fontFamily="Sora">{Math.round(g)}</text>
          </React.Fragment>
        );
      })}
      <path d={`${d} L${last[0]} ${H - pad} L${pad} ${H - pad}Z`} fill="url(#a-ga)" />
      <path d={d} fill="none" stroke="#4cb8ef" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="5" fill="#fff" stroke="#4cb8ef" strokeWidth="3" />
    </svg>
  );
};

const OrderRow: React.FC<{ o: Order; on?: boolean; onClick: () => void }> = ({ o, on, onClick }) => (
  <button type="button" className="a-row" style={on ? { background: 'rgba(76,184,239,.1)' } : undefined} onClick={onClick}>
    <span className="a-oav">{initials(clientOf(o))}</span>
    <span className="a-tx">
      <b>{clientOf(o)}</b>
      <small>{[o.id, zoneOf(o), o.date].filter(Boolean).join(' · ')}</small>
    </span>
    <span className="a-rt">
      <span className="a-amt">{eur(o.total || 0)}</span>
      <Pill s={o.status} />
    </span>
  </button>
);

const DashView: React.FC<{ go: Go; onNewProduct: () => void; chatUnread: number; newRequests: number; noPhoto: number }> = ({
  go, onNewProduct, chatUnread, newRequests, noPhoto,
}) => {
  const { ordersList, productsList } = useAdmin();
  const d = useMemo(() => {
    const today = dayStart(new Date());
    const days = Array.from({ length: 14 }, () => ({ total: 0, count: 0 }));
    let prevWeek = 0;
    for (const o of ordersList) {
      if (o.status === 'Annullato') continue;
      const dt = parseDate(o.date);
      if (!dt) continue;
      const ago = Math.round((today - dayStart(dt)) / 86400000);
      if (ago >= 0 && ago < 14) {
        days[13 - ago].total += o.total || 0;
        days[13 - ago].count++;
      }
      if (ago >= 7 && ago < 14) prevWeek += o.total || 0;
    }
    const week = days.slice(7);
    const weekTotal = week.reduce((s, x) => s + x.total, 0);
    const weekCount = week.reduce((s, x) => s + x.count, 0);
    const pct = prevWeek > 0 ? Math.round(((weekTotal - prevWeek) / prevWeek) * 100) : null;
    const toDo = ordersList.filter((o) => o.status === 'In elaborazione').length;
    const out = productsList.filter((p) => p.stock <= 0);
    const low = productsList.filter(isLow);
    const offers = productsList.filter((p) => p.isOffer || p.flashOffer?.active).length;
    const recent = [...ordersList].sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0)).slice(0, 4);
    return { days, week, weekTotal, weekCount, pct, toDo, out, low, offers, recent };
  }, [ordersList, productsList]);
  const names = (l: Product[]) => l.slice(0, 3).map((p) => p.name.split(/\s+/).slice(0, 2).join(' ')).join(', ');

  return (
    <>
      <div className="a-kpis">
        <div className="a-card a-kpi">
          <Bi n="invoice" s={30} />
          {d.pct !== null && <span className={`a-d ${d.pct >= 0 ? 'a-up' : 'a-at'}`}>{d.pct >= 0 ? '+' : ''}{d.pct}%</span>}
          <p className="a-v">{eur(d.weekTotal)}</p>
          <p>Incassato questa settimana</p>
          <Spark v={d.week.map((x) => x.total)} />
        </div>
        <div className="a-card a-kpi">
          <Bi n="boxes" s={30} />
          {d.toDo > 0 && <span className="a-d a-at">{d.toDo} da evadere</span>}
          <p className="a-v">{d.weekCount}</p>
          <p>Ordini questa settimana</p>
          <Spark v={d.week.map((x) => x.count)} />
        </div>
        <div className="a-card a-kpi">
          <Bi n="chat" s={30} />
          <p className="a-v">{chatUnread}</p>
          <p>Messaggi in chat da leggere</p>
        </div>
        <div className="a-card a-kpi">
          <Bi n="palette" s={30} />
          <p className="a-v">{newRequests}</p>
          <p>Richieste di packaging nuove</p>
        </div>
      </div>
      <div className="a-dgrid">
        <div className="a-card">
          <div className="a-ch"><h2>Vendite, ultimi 14 giorni</h2></div>
          <div className="a-chart"><Chart v={d.days.map((x) => x.total)} /></div>
        </div>
        <div className="a-card">
          <div className="a-ch"><h2>Azioni rapide</h2></div>
          <div className="a-qa">
            <button type="button" onClick={onNewProduct}><Ic n="plus" s={20} />Nuovo prodotto</button>
            <button type="button" onClick={() => go('flash')}><Ic n="timer" s={20} />Offerta a tempo</button>
            <button type="button" onClick={() => go('flyer')}><Ic n="book" s={20} />Carica volantino</button>
            <button type="button" onClick={() => go('removebg')}><Ic n="scissors" s={20} />Scontorna foto</button>
            <button type="button" onClick={() => go('images')}><Ic n="image" s={20} />Foto mancanti</button>
            <button type="button" onClick={() => go('backup')}><Ic n="db" s={20} />Backup ora</button>
          </div>
        </div>
      </div>
      <div className="a-dgrid">
        <div className="a-card">
          <div className="a-ch"><h2>Ultimi ordini</h2><button type="button" className="a-l" onClick={() => go('orders')}>Tutti <Ic n="chev" s={14} /></button></div>
          {d.recent.length ? d.recent.map((o) => <OrderRow key={o.id} o={o} onClick={() => go('orders')} />) : <div className="a-empty">Nessun ordine per ora.</div>}
        </div>
        <div className="a-card">
          <div className="a-ch"><h2>Da controllare</h2></div>
          <button type="button" className="a-row" onClick={() => go('products')}>
            <Ic n="package" s={20} />
            <span className="a-tx"><b>{d.out.length === 1 ? '1 prodotto esaurito' : `${fmtN(d.out.length)} prodotti esauriti`}</b><small>{d.out.length ? names(d.out) : 'Nessuno'}</small></span>
            <Ic n="chev" s={16} />
          </button>
          <button type="button" className="a-row" onClick={() => go('products')}>
            <Ic n="trend" s={20} />
            <span className="a-tx"><b>{fmtN(d.low.length)} prodotti con poche scorte</b><small>{d.low.length ? names(d.low) : 'Nessuno'}</small></span>
            <Ic n="chev" s={16} />
          </button>
          <button type="button" className="a-row" onClick={() => go('images')}>
            <Ic n="image" s={20} />
            <span className="a-tx"><b>{fmtN(noPhoto)} prodotti senza foto</b><small>Usa "Immagini prodotti" per trovarle</small></span>
            <Ic n="chev" s={16} />
          </button>
          <button type="button" className="a-row" onClick={() => go('flash')}>
            <Ic n="timer" s={20} />
            <span className="a-tx"><b>{fmtN(d.offers)} prodotti in offerta</b><small>Offerte del mese e offerte a tempo</small></span>
            <Ic n="chev" s={16} />
          </button>
        </div>
      </div>
    </>
  );
};

/* ---------------- Prodotti ---------------- */
const Seg: React.FC<{ items: string[]; value: string; onPick: (v: string) => void }> = ({ items, value, onPick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 4, width: 0 });
  useLayoutEffect(() => {
    const place = () => {
      const b = ref.current?.querySelector('button.a-on') as HTMLElement | null;
      if (b) setPos({ left: b.offsetLeft, width: b.offsetWidth });
    };
    place();
    document.fonts?.ready.then(place);
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [value]);
  return (
    <div className="a-seg" ref={ref}>
      <span className="a-sp" style={pos} />
      {items.map((i) => (
        <button key={i} type="button" className={i === value ? 'a-on' : ''} onClick={() => { onPick(i); vib(5); }}>{i}</button>
      ))}
    </div>
  );
};

const PAGE = 80;

const ProductsView: React.FC<{
  q: string;
  setQ: (s: string) => void;
  onNew: () => void;
  onFull: (p: Product) => void;
  onRemoveBg: (id: string) => void;
  toast: (t: string) => void;
}> = ({ q, setQ, onNew, onFull, onRemoveBg, toast }) => {
  const { productsList, updateProduct } = useAdmin();
  const [f, setF] = useState('Tutti');
  const [n, setN] = useState(PAGE);
  const [edit, setEdit] = useState<Product | null>(null);
  useEffect(() => setN(PAGE), [q, f]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    let l = s
      ? productsList.filter((p) =>
          [p.name, p.code, p.category, p.subCategoryName, p.subSubCategoryName].some((x) => (x || '').toLowerCase().includes(s))
        )
      : productsList;
    if (f === 'In offerta') l = l.filter((p) => p.isOffer);
    if (f === 'Poche scorte') l = l.filter((p) => p.stock <= 0 || isLow(p));
    if (f === 'Senza foto') l = l.filter((p) => !hasProductImage(p));
    return l;
  }, [productsList, q, f]);

  const toggleOffer = (p: Product) => {
    const on = !p.isOffer;
    updateProduct({ ...p, isOffer: on });
    vib(8);
    toast(on ? 'Messo in offerta del mese' : 'Tolto dalle offerte');
  };

  return (
    <>
      <div className="a-tool">
        <label className="a-fin">
          <Ic n="search" s={18} />
          <input id="a-pq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome, codice o marca" />
        </label>
        <Seg items={['Tutti', 'In offerta', 'Poche scorte', 'Senza foto']} value={f} onPick={setF} />
        <button type="button" className="a-btn a-prim a-sm" onClick={onNew}><Ic n="plus" s={15} /> Nuovo</button>
      </div>
      <div className="a-card a-ptable">
        <div className="a-pr a-hd"><span /><span>Prodotto</span><span>Categoria</span><span>Prezzo</span><span>Giacenza</span><span>In offerta</span></div>
        {list.slice(0, n).map((p) => (
          <div key={p.id} role="button" tabIndex={0} className="a-pr" onClick={() => setEdit(p)} onKeyDown={(e) => e.key === 'Enter' && setEdit(p)}>
            <span className="a-th">{hasProductImage(p) ? <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Ic n="image" s={20} />}</span>
            <span className="a-nm"><b>{p.name}</b><small>{eur(p.price)}/{p.unit || 'pz'}{p.isOffer ? ' · in offerta' : ''}</small></span>
            <span className="a-c">{p.category}</span>
            <span className="a-pz">{eur(p.price)}{p.originalPrice && p.originalPrice > p.price ? <s>{eur(p.originalPrice)}</s> : null}</span>
            <span className={`a-stk${p.stock <= 0 ? ' a-out' : isLow(p) ? ' a-low' : ''}`}>{p.stock <= 0 ? 'Esaurito' : `${fmtN(p.stock)} ${p.unit || 'pz'}`}</span>
            <span className="a-tgw">
              <span className="a-tgl">In offerta del mese</span>
              <span
                className={`a-tg${p.isOffer ? ' a-on' : ''}`}
                role="switch"
                aria-checked={!!p.isOffer}
                onClick={(e) => { e.stopPropagation(); toggleOffer(p); }}
              />
            </span>
          </div>
        ))}
        {list.length === 0 && <div className="a-empty">Nessun prodotto trovato.</div>}
        {list.length > n && (
          <button type="button" className="a-row a-moreb" onClick={() => setN((x) => x + PAGE)}>
            <span className="a-tx"><b>Mostra altri prodotti</b><small>{fmtN(n)} di {fmtN(list.length)}</small></span>
            <Ic n="chev" s={16} />
          </button>
        )}
      </div>
      {edit && (
        <ProductSheet
          p={edit}
          onClose={() => setEdit(null)}
          onFull={() => { const x = edit; setEdit(null); onFull(x); }}
          onRemoveBg={() => { const x = edit; setEdit(null); onRemoveBg(x.id); }}
          onSaved={(t) => { setEdit(null); toast(t); }}
        />
      )}
    </>
  );
};

const num = (s: string) => {
  const v = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return isNaN(v) ? NaN : v;
};
const money = (v?: number) => (v || v === 0 ? v.toFixed(2).replace('.', ',') : '');

const ProductSheet: React.FC<{
  p: Product;
  onClose: () => void;
  onFull: () => void;
  onRemoveBg: () => void;
  onSaved: (t: string) => void;
}> = ({ p, onClose, onFull, onRemoveBg, onSaved }) => {
  const { updateProduct, categoriesList } = useAdmin();
  const [name, setName] = useState(p.name);
  const [price, setPrice] = useState(money(p.price));
  const [old, setOld] = useState(p.originalPrice ? money(p.originalPrice) : '');
  const [stock, setStock] = useState(String(p.stock ?? 0));
  const [unit, setUnit] = useState(p.unit || 'pz');
  const [catId, setCatId] = useState(p.categoryId);
  const [offer, setOffer] = useState(!!p.isOffer);
  const [err, setErr] = useState<string | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setOn(true));
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => { cancelAnimationFrame(t); window.removeEventListener('keydown', k); };
  }, [onClose]);

  const save = () => {
    const pr = num(price);
    if (!name.trim()) return setErr('Scrivi il nome');
    if (isNaN(pr)) return setErr('Scrivi il prezzo');
    const o = num(old);
    const cat = categoriesList.find((c) => c.id === catId);
    updateProduct({
      ...p,
      name: name.trim(),
      price: pr,
      originalPrice: isNaN(o) || !old.trim() ? undefined : o,
      stock: parseInt(stock, 10) || 0,
      unit: unit.trim() || 'pz',
      categoryId: cat ? cat.id : p.categoryId,
      category: cat ? cat.name : p.category,
      isOffer: offer,
    });
    vib(8);
    onSaved('Modifiche salvate');
  };

  return (
    <>
      <div className={`a-scrim${on ? ' a-on' : ''}`} onClick={onClose} />
      <section className={`a-sheet${on ? ' a-on' : ''}`} aria-label="Modifica prodotto">
        <div className="a-sh">
          <h3>Modifica prodotto</h3>
          <button type="button" className="a-ib" aria-label="Chiudi" onClick={onClose}><Ic n="x" s={18} /></button>
        </div>
        <div className="a-sb">
          <div className="a-ph">
            {hasProductImage(p) ? <img src={p.image} alt="" referrerPolicy="no-referrer" /> : <span className="a-phn"><Ic n="image" s={34} />Nessuna foto</span>}
            <div className="a-ibs">
              <button type="button" onClick={onFull}><Ic n="image" s={14} /> Cambia foto</button>
              <button type="button" onClick={onRemoveBg}><Ic n="scissors" s={14} /> Scontorna</button>
            </div>
          </div>
          <label className="a-fld"><span>Nome prodotto</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className="a-two">
            <label className="a-fld"><span>Prezzo (€, IVA esclusa)</span><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
            <label className="a-fld"><span>Prezzo prima dell'offerta</span><input inputMode="decimal" placeholder="Facoltativo" value={old} onChange={(e) => setOld(e.target.value)} /></label>
          </div>
          <div className="a-two">
            <label className="a-fld"><span>Giacenza</span><input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} /></label>
            <label className="a-fld"><span>Unità di vendita</span><input value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
          </div>
          <label className="a-fld">
            <span>Categoria</span>
            <select value={catId} onChange={(e) => setCatId(e.target.value)}>
              {categoriesList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="a-optrow">
            <span>In offerta del mese<small>Compare nella sezione Offerte</small></span>
            <button type="button" className={`a-tg${offer ? ' a-on' : ''}`} role="switch" aria-checked={offer} aria-label="In offerta" onClick={() => { setOffer((x) => !x); vib(8); }} />
          </div>
          <button type="button" className="a-full" onClick={onFull}>Apri la scheda completa (codice, descrizione, marca, foto…) <Ic n="chev" s={14} /></button>
        </div>
        <div className="a-sf">
          <button type="button" className="a-btn a-gh" onClick={onClose}>Annulla</button>
          <button type="button" className="a-btn a-prim" onClick={save}>{err || 'Salva modifiche'}</button>
        </div>
      </section>
    </>
  );
};

/* ---------------- Ordini ---------------- */
const OrdersView: React.FC<{ go: Go; onFull: (o: Order) => void; toast: (t: string) => void }> = ({ go, onFull, toast }) => {
  const { ordersList, updateOrder, productsList } = useAdmin();
  const [f, setF] = useState('Tutti');
  const [q, setQ] = useState('');
  const sorted = useMemo(
    () => [...ordersList].sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0)),
    [ordersList]
  );
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    let l = s ? sorted.filter((o) => o.id.toLowerCase().includes(s) || clientOf(o).toLowerCase().includes(s)) : sorted;
    if (f === 'Da evadere') l = l.filter((o) => o.status === 'In elaborazione');
    if (f === 'Spediti') l = l.filter((o) => o.status === 'Spedito');
    if (f === 'Consegnati') l = l.filter((o) => o.status === 'Consegnato');
    return l;
  }, [sorted, q, f]);
  const [sel, setSel] = useState<string | null>(sorted[0]?.id || null);
  const o = ordersList.find((x) => x.id === sel) || list[0] || null;
  const detRef = useRef<HTMLDivElement>(null);
  const [track, setTrack] = useState('');
  useEffect(() => {
    setTrack(o ? [o.courier, o.trackingNumber].filter((x) => x && x !== 'RITIRO-SEDE').join(' · ') : '');
  }, [o?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id: string) => {
    setSel(id);
    vib(6);
    if (window.innerWidth <= 860) window.setTimeout(() => detRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };
  const setStatus = (s: Order['status']) => {
    if (!o || o.status === s) return;
    updateOrder({ ...o, status: s });
    toast('Stato aggiornato: ' + s);
    vib(8);
  };
  const saveTrack = () => {
    if (!o) return;
    const [courier, ...rest] = track.split('·').map((x) => x.trim());
    const tn = rest.join(' ').trim();
    if ((courier || '') === (o.courier || '') && (tn || '') === (o.trackingNumber || '')) return;
    updateOrder({ ...o, courier: courier || o.courier, trackingNumber: tn || o.trackingNumber });
    toast('Tracciamento salvato');
  };
  const stepIdx = o ? STATUS.indexOf(o.status) : -1;

  return (
    <>
      <div className="a-tool">
        <label className="a-fin">
          <Ic n="search" s={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per cliente o numero ordine" />
        </label>
        <Seg items={['Tutti', 'Da evadere', 'Spediti', 'Consegnati']} value={f} onPick={setF} />
      </div>
      <div className="a-split">
        <div className="a-card a-olist">
          <div className="a-ch"><h2>{list.length} ordini</h2></div>
          {list.map((x) => <OrderRow key={x.id} o={x} on={o?.id === x.id} onClick={() => pick(x.id)} />)}
          {list.length === 0 && <div className="a-empty">Nessun ordine.</div>}
        </div>
        <div className="a-card" ref={detRef}>
          {o ? (
            <>
              <div className="a-ch"><h2>Ordine {o.id}</h2><Pill s={o.status} /></div>
              <div className="a-row" style={{ borderTop: 0 }}>
                <span className="a-oav">{initials(clientOf(o))}</span>
                <span className="a-tx"><b>{clientOf(o)}</b><small>{[zoneOf(o), o.date].filter(Boolean).join(' · ')}</small></span>
                <button type="button" className="a-btn a-gh a-sm" onClick={() => go('chat')}><Ic n="chat" s={15} /> Scrivi</button>
              </div>
              <div className="a-ch" style={{ paddingTop: 6 }}><h2 style={{ fontSize: 14, color: 'var(--mu)' }}>Stato</h2></div>
              <div className="a-steps">
                {STATUS.map((s, i) => (
                  <button key={s} type="button" className={`${i <= stepIdx ? 'a-done' : ''}${i === stepIdx ? ' a-cur' : ''}`} onClick={() => setStatus(s)}>
                    <i>{i <= stepIdx ? <Ic n="check" s={13} /> : null}</i>
                    {s}
                  </button>
                ))}
              </div>
              {stepIdx >= 1 && (
                <label className="a-fld">
                  <span>Corriere e codice di tracciamento</span>
                  <input value={track} onChange={(e) => setTrack(e.target.value)} onBlur={saveTrack} placeholder="es. BRT · 0582 3391 2207" />
                </label>
              )}
              <div className="a-oitems">
                {o.items.map((it, i) => {
                  const pr = it.productId ? productsList.find((x) => x.id === it.productId) : undefined;
                  return (
                    <div className="a-row" key={i}>
                      {pr && hasProductImage(pr) ? <img src={pr.image} alt="" referrerPolicy="no-referrer" /> : <span className="a-noimg"><Ic n="package" s={18} /></span>}
                      <span className="a-tx"><b>{it.productName}</b><small>{it.qty} × {eur(it.price)}{pr?.unit ? `/${pr.unit}` : ''}</small></span>
                      <span className="a-amt">{eur(it.qty * it.price)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="a-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--mu)', fontSize: 13 }}>Totale IVA esclusa</span>
                <span className="a-amt" style={{ fontSize: 18 }}>{eur(o.subtotal ?? o.total)}</span>
              </div>
              <button type="button" className="a-full" onClick={() => onFull(o)}>Apri l'ordine completo (dati cliente, PDF, annulla…) <Ic n="chev" s={14} /></button>
            </>
          ) : (
            <div className="a-empty">Seleziona un ordine.</div>
          )}
        </div>
      </div>
    </>
  );
};

/* ---------------- Chat ---------------- */
const TPL = ['Sì, disponibile', 'Consegniamo domani', 'Le mando il preventivo'];

const ChatView: React.FC<{ onUnread: (n: number) => void; toast: (t: string) => void }> = ({ onUnread, toast }) => {
  const [list, setList] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    try {
      const rows = await adminListChats();
      setList(rows);
      setErr(null);
      setOpenId((cur) => cur || (window.innerWidth > 860 ? rows[0]?.id || null : null));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [onUnread]);
  useEffect(() => {
    onUnread(list.reduce((s, r) => s + (r.unread_admin || 0), 0));
  }, [list, onUnread]);
  useEffect(() => {
    loadList();
    const t = window.setInterval(() => document.visibilityState === 'visible' && loadList(), 6000);
    return () => window.clearInterval(t);
  }, [loadList]);

  const lastAt = useRef<string | null>(null);
  lastAt.current = msgs.length ? msgs[msgs.length - 1].created_at : null;
  useEffect(() => {
    if (!openId) return;
    let alive = true;
    setMsgs([]);
    const load = async (full: boolean) => {
      try {
        const add = await adminFetchChat(openId, full ? null : lastAt.current);
        if (!alive) return;
        setMsgs((prev) => (full ? add : mergeMessages(prev, add)));
        setList((prev) => prev.map((c) => (c.id === openId ? { ...c, unread_admin: 0 } : c)));
      } catch { /* riprova al prossimo giro */ }
    };
    load(true);
    const t = window.setInterval(() => document.visibilityState === 'visible' && load(false), 4000);
    return () => { alive = false; window.clearInterval(t); };
  }, [openId]);
  useLayoutEffect(() => {
    const b = boxRef.current;
    if (b) b.scrollTop = b.scrollHeight;
  }, [msgs.length]);

  const open = list.find((c) => c.id === openId) || null;
  const send = async (t: string) => {
    const body = t.trim();
    if (!body || !openId) return;
    try {
      const m = await adminSendChat(openId, body);
      setMsgs((prev) => mergeMessages(prev, [m]));
      setList((prev) => prev.map((c) => (c.id === openId ? { ...c, last_message: body, last_message_at: m.created_at } : c)));
      setText('');
      vib(8);
    } catch (e) {
      toast((e as Error).message || 'Messaggio non inviato');
    }
  };
  const salvaRubrica = async () => {
    if (!open) return;
    try {
      await gLoad('cliente');
      const rows = clientiCaricati();
      const tel = soloCifre(open.phone).slice(-9);
      if (rows.some((c) => soloCifre(c.telefono).slice(-9) === tel)) return toast('Già nel portafoglio clienti');
      await gSave('cliente', { ...CLIENTE_VUOTO, ragioneSociale: open.name, telefono: open.phone, fonte: 'chat' });
      vib(10);
      toast('Salvato nel portafoglio clienti');
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const del = async () => {
    if (!open) return;
    if (!window.confirm(`Eliminare definitivamente la chat con ${open.name}? I messaggi spariranno anche dal telefono del cliente.`)) return;
    try {
      await adminDeleteChat(open.id);
      setList((prev) => prev.filter((c) => c.id !== open.id));
      setOpenId(null);
      setMobileOpen(false);
      toast('Chat eliminata');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <div className={`a-card a-chatw${mobileOpen ? ' a-open' : ''}`}>
      <div className="a-clist">
        {loading && <div className="a-empty">Caricamento…</div>}
        {!loading && list.length === 0 && <div className="a-empty">{err ? 'Connessione assente, riprovo…' : 'Ancora nessun messaggio dai clienti.'}</div>}
        {list.map((c) => (
          <button key={c.id} type="button" className={`a-row${c.id === openId ? ' a-on' : ''}`} onClick={() => { setOpenId(c.id); setMobileOpen(true); vib(6); }}>
            <span className="a-oav">{initials(c.name)}</span>
            <span className="a-tx"><b>{c.name}</b><small>{c.last_message || c.phone}</small></span>
            {c.unread_admin ? <span className="a-un">{c.unread_admin}</span> : null}
          </button>
        ))}
      </div>
      <div className="a-thread">
        {open ? (
          <>
            <div className="a-thh">
              <button type="button" className="a-ib a-mb a-cback" aria-label="Indietro" onClick={() => setMobileOpen(false)}><Ic n="chevl" s={18} /></button>
              <span className="a-oav">{initials(open.name)}</span>
              <span className="a-tx"><b style={{ font: '600 14.5px var(--display)' }}>{open.name}</b><small style={{ display: 'block', color: 'var(--mu)', fontSize: 12 }}>{open.phone}</small></span>
              <button type="button" className="a-ib a-sib" title="Salva in rubrica" aria-label="Salva in rubrica" onClick={salvaRubrica}><Ic n="user" s={17} /></button>
              <a className="a-ib a-sib" href={`tel:${open.phone}`} title="Chiama" aria-label="Chiama"><Ic n="phone" s={17} /></a>
              <button type="button" className="a-ib a-sib" title="Elimina la chat" aria-label="Elimina la chat" onClick={del}><Ic n="x" s={17} /></button>
            </div>
            <div className="a-msgs" ref={boxRef}>
              {msgs.map((m) => (
                <div key={m.id} className={`a-msg${m.sender === 'admin' ? ' a-me' : ''}`}>
                  {m.body}
                  <small>{formatChatTime(m.created_at)}</small>
                </div>
              ))}
            </div>
            <div className="a-tpl">{TPL.map((t) => <button key={t} type="button" onClick={() => send(t)}>{t}</button>)}</div>
            <form className="a-cin" onSubmit={(e) => { e.preventDefault(); send(text); }}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi una risposta" autoComplete="off" />
              <button className="a-send" aria-label="Invia"><Ic n="arrow" s={19} /></button>
            </form>
          </>
        ) : (
          <div className="a-empty" style={{ margin: 'auto' }}>Scegli una conversazione.</div>
        )}
      </div>
    </div>
  );
};
