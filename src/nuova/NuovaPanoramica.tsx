import React, { useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { Order } from '../types';
import { hasProductImage } from '../utils/imageFirst';
import { Bi, Ic, eur } from './Icona';

/** "dd/mm/yyyy" (o data ISO) → Date; null se non leggibile */
function parseDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const STATUS_STYLE: Record<Order['status'], string> = {
  'In elaborazione': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Spedito: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Consegnato: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Annullato: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

type Go = (id: any) => void;

/**
 * Pannello admin, grafica nuova: prima schermata "Panoramica" con i numeri
 * del giorno e del mese, gli ultimi ordini e le cose da controllare.
 * Legge solo i dati già caricati: non modifica nulla.
 */
export const NuovaPanoramica: React.FC<{ onGo: Go; chatUnread: number; newRequests: number }> = ({ onGo, chatUnread, newRequests }) => {
  const { ordersList, productsList, categoriesList } = useAdmin();

  const data = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let todayCount = 0;
    let monthTotal = 0;
    let monthCount = 0;
    let working = 0;
    const days: { label: string; total: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today - i * 86400000);
      days.push({ label: d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', ''), total: 0, count: 0 });
    }
    for (const o of ordersList) {
      if (o.status === 'In elaborazione') working++;
      if (o.status === 'Annullato') continue;
      const d = parseDate(o.date);
      if (!d) continue;
      const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (t === today) todayCount++;
      if (t >= monthStart) {
        monthTotal += o.total || 0;
        monthCount++;
      }
      const idx = 6 - Math.round((today - t) / 86400000);
      if (idx >= 0 && idx <= 6) {
        days[idx].total += o.total || 0;
        days[idx].count++;
      }
    }
    const noImage = productsList.filter((p) => !hasProductImage(p)).length;
    const lowStock = productsList.filter((p) => p.stock <= (p.lowStockThreshold ?? 0) && (p.lowStockThreshold ?? 0) > 0).length;
    const recent = [...ordersList]
      .sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0))
      .slice(0, 6);
    const max = Math.max(1, ...days.map((d) => d.total));
    return { todayCount, monthTotal, monthCount, working, days, max, noImage, lowStock, recent };
  }, [ordersList, productsList]);

  const monthName = new Date().toLocaleDateString('it-IT', { month: 'long' });

  return (
    <div className="p-4 sm:p-6 space-y-5 text-left">
      <div className="n-kpis">
        <button type="button" className="n-kpi text-left" onClick={() => onGo('orders')}>
          <Bi n="boxes" s={28} />
          <small>Ordini di oggi</small>
          <b>{data.todayCount}</b>
          <em>{data.working} da lavorare</em>
        </button>
        <div className="n-kpi">
          <Bi n="invoice" s={28} />
          <small>Ordinato a {monthName}</small>
          <b>{eur(data.monthTotal)}</b>
          <em>{data.monthCount} ordini</em>
        </div>
        <button type="button" className="n-kpi text-left" onClick={() => onGo('products')}>
          <Bi n="catalog" s={28} />
          <small>Prodotti in catalogo</small>
          <b>{productsList.length.toLocaleString('it-IT')}</b>
          <em>{categoriesList.length} categorie</em>
        </button>
        <button type="button" className="n-kpi text-left" onClick={() => onGo('chat')}>
          <Bi n="chat" s={28} />
          <small>Chat clienti</small>
          <b>{chatUnread}</b>
          <em>{chatUnread === 1 ? 'messaggio nuovo' : 'messaggi nuovi'}</em>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl border border-[#1c2433] bg-[#0d1420] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Ultimi 7 giorni</h3>
            <span className="text-xs text-slate-400">totale ordini, escluso annullati</span>
          </div>
          <div className="mt-4 flex items-end gap-2 h-40">
            {data.days.map((d, i) => (
              <div key={i} className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10.5px] text-slate-400 whitespace-nowrap">{d.count ? eur(d.total).replace('€ ', '€') : ''}</span>
                <div
                  className="w-full rounded-lg"
                  style={{
                    height: `${Math.max(4, (d.total / data.max) * 100)}%`,
                    background: d.total ? 'linear-gradient(180deg,#5cc4f5,#1d6fb8)' : 'rgba(143,180,214,.15)',
                  }}
                  title={`${d.count} ordini · ${eur(d.total)}`}
                />
                <span className="text-[11px] text-slate-400 capitalize">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-[#1c2433] bg-[#0d1420] p-4">
          <h3 className="text-sm font-semibold text-white">Azioni rapide</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { id: 'products', label: 'Nuovo articolo', icon: 'catalog' },
              { id: 'flash', label: 'Offerte a tempo', icon: 'clock' },
              { id: 'flyer', label: 'Volantino', icon: 'receipt' },
              { id: 'settings', label: 'Parametri', icon: 'seal' },
            ].map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onGo(a.id)}
                className="flex items-center gap-2.5 rounded-xl border border-[#1c2433] bg-[#0d1420] hover:border-sky-500/50 px-3 py-3 text-left text-xs font-semibold text-white"
              >
                <Bi n={a.icon} s={26} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl border border-[#1c2433] bg-[#0d1420] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Ultimi ordini</h3>
            <button type="button" onClick={() => onGo('orders')} className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1">
              Tutti gli ordini <Ic n="chev" s={14} />
            </button>
          </div>
          {data.recent.length === 0 ? (
            <p className="mt-4 text-xs text-slate-400">Nessun ordine ancora.</p>
          ) : (
            <div className="mt-3 divide-y divide-[#1c2433]">
              {data.recent.map((o) => (
                <button key={o.id} type="button" onClick={() => onGo('orders')} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-[#1a2230] rounded-lg px-1">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white truncate">
                      {o.id} {o.shippingAddress?.recipient ? `· ${o.shippingAddress.recipient}` : ''}
                    </span>
                    <span className="block text-xs text-slate-400">{o.date} · {o.itemsCount} colli</span>
                  </span>
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[o.status] || ''}`}>{o.status}</span>
                  <span className="shrink-0 w-20 text-right text-sm font-bold text-white">{eur(o.total || 0)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-[#1c2433] bg-[#0d1420] p-4">
          <h3 className="text-sm font-semibold text-white">Da controllare</h3>
          <div className="mt-3 space-y-2">
            {[
              { show: data.working > 0, text: `${data.working} ordini da lavorare`, go: 'orders' },
              { show: newRequests > 0, text: `${newRequests} richieste di personalizzazione nuove`, go: 'requests' },
              { show: chatUnread > 0, text: `${chatUnread} messaggi in chat da leggere`, go: 'chat' },
              { show: data.noImage > 0, text: `${data.noImage} prodotti senza foto`, go: 'images' },
              { show: data.lowStock > 0, text: `${data.lowStock} prodotti con scorte basse`, go: 'products' },
            ]
              .filter((x) => x.show)
              .map((x) => (
                <button
                  key={x.text}
                  type="button"
                  onClick={() => onGo(x.go)}
                  className="w-full flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-left text-xs font-semibold text-amber-200"
                >
                  {x.text} <Ic n="chev" s={14} />
                </button>
              ))}
            {data.working === 0 && newRequests === 0 && chatUnread === 0 && data.noImage === 0 && data.lowStock === 0 && (
              <p className="text-xs text-emerald-300 font-semibold">Tutto in ordine.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
