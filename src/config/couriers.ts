import type { Order } from '../types';

/**
 * Consegne e corrieri.
 * - Roma: consegniamo noi con i nostri mezzi (nessun codice di tracciamento).
 * - Fuori Roma: corriere scelto di volta in volta, con il suo codice di tracciamento.
 */
export const AURORA_DELIVERY = 'Consegna Aurora (nostri mezzi)';

/** Suggerimenti per il campo "Corriere" nel pannello (si può scrivere anche un altro nome). */
export const COURIER_SUGGESTIONS = [
  AURORA_DELIVERY,
  'BRT',
  'GLS',
  'SDA',
  'Poste Italiane',
  'DHL',
  'UPS',
  'FedEx / TNT',
];

export const isAuroraDelivery = (courier?: string) => !!courier && /consegna aurora|nostri mezzi|furgone/i.test(courier);

const validTracking = (code?: string) => !!code && code.trim() !== '' && code !== 'RITIRO-SEDE';

/**
 * Indirizzo dove il cliente può seguire la spedizione:
 * - il link che hai incollato tu nell'ordine (quello che manda il corriere), se c'è;
 * - altrimenti la pagina gratuita 17TRACK, che riconosce da sola il corriere dal codice.
 * Nessun link per le consegne fatte con i nostri mezzi o senza codice.
 */
export function trackingLink(order: Pick<Order, 'courier' | 'trackingNumber' | 'trackingUrl'>): string | null {
  const url = (order.trackingUrl || '').trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (isAuroraDelivery(order.courier) || !validTracking(order.trackingNumber)) return null;
  return `https://t.17track.net/it#nums=${encodeURIComponent(order.trackingNumber!.trim())}`;
}

export const hasRealTracking = (order: Pick<Order, 'courier' | 'trackingNumber'>) =>
  !isAuroraDelivery(order.courier) && validTracking(order.trackingNumber);
