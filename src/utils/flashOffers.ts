import { FlashOffer, Product } from '../types';

export type FlashStatus = 'disattivata' | 'programmata' | 'in_corso' | 'in_pausa' | 'scaduta';

const toMinutes = (hhmm?: string): number | null => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const hasDailyWindow = (fo: FlashOffer) => toMinutes(fo.dailyFrom) !== null && toMinutes(fo.dailyTo) !== null;

/** true se "adesso" cade nella fascia oraria giornaliera (gestisce anche fasce a cavallo della mezzanotte) */
const inDailyWindow = (fo: FlashOffer, now: Date): boolean => {
  const from = toMinutes(fo.dailyFrom);
  const to = toMinutes(fo.dailyTo);
  if (from === null || to === null) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  return from <= to ? cur >= from && cur < to : cur >= from || cur < to;
};

export function getFlashStatus(fo: FlashOffer | undefined, now: Date): FlashStatus {
  if (!fo || !fo.active) return 'disattivata';
  const start = new Date(fo.startAt).getTime();
  const end = new Date(fo.endAt).getTime();
  const t = now.getTime();
  if (isNaN(start) || isNaN(end) || t >= end) return 'scaduta';
  if (t < start) return 'programmata';
  return inDailyWindow(fo, now) ? 'in_corso' : 'in_pausa';
}

export const isFlashLive = (p: Product, now: Date): boolean =>
  !!p.flashOffer && p.flashOffer.price > 0 && p.flashOffer.price < p.price && getFlashStatus(p.flashOffer, now) === 'in_corso';

/** Chiave che cambia solo quando cambia l'insieme delle offerte attive (o il giorno): evita ricalcoli inutili */
export function flashLiveKey(products: Product[], enabled: boolean, now: Date): string {
  if (!enabled) return 'off';
  const ids: string[] = [];
  for (const p of products) if (p.flashOffer && isFlashLive(p, now)) ids.push(p.id);
  return `${now.toDateString()}|${ids.join(',')}`;
}

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Testo mostrato ai clienti sotto il prezzo */
export function flashNote(fo: FlashOffer, now: Date): string {
  const end = new Date(fo.endAt);
  if (hasDailyWindow(fo)) {
    const sameDay = end.toDateString() === now.toDateString();
    const dayEnd = fo.dailyTo || '';
    return sameDay && hhmm(end) < dayEnd
      ? `Offerta a tempo · oggi fino alle ${hhmm(end)}`
      : `Offerta a tempo · oggi fino alle ${dayEnd}`;
  }
  if (end.toDateString() === now.toDateString()) return `Offerta a tempo · fino alle ${hhmm(end)} di oggi`;
  return `Offerta a tempo · fino al ${pad(end.getDate())}/${pad(end.getMonth() + 1)} alle ${hhmm(end)}`;
}

/** Applica le offerte a tempo attive: prezzo scontato, prezzo pieno barrato, badge e nota */
export function applyFlashOffers(products: Product[], enabled: boolean, now: Date): Product[] {
  if (!enabled) return products;
  return products.map((p) => {
    if (!p.flashOffer || !isFlashLive(p, now)) return p;
    const fo = p.flashOffer;
    return {
      ...p,
      price: fo.price,
      originalPrice: p.price,
      isOffer: true,
      discountPercent: Math.round((1 - fo.price / p.price) * 100) || undefined,
      offerNote: flashNote(fo, now),
    };
  });
}

/**
 * Quando un prodotto "in offerta a tempo" viene salvato, rimette i valori veri
 * (prezzo normale ecc.) al posto di quelli dell'offerta, così il listino non si rovina.
 * Se l'admin ha cambiato a mano uno di quei campi, la sua modifica viene tenuta.
 */
export function stripFlashFields(edited: Product, base: Product, effective: Product): Product {
  const keys = ['price', 'originalPrice', 'isOffer', 'discountPercent', 'offerNote'] as const;
  const out: Product = { ...edited };
  for (const k of keys) {
    if (edited[k] === effective[k]) (out as any)[k] = base[k];
  }
  return out;
}
