/**
 * Condizioni di consegna Aurora (un solo punto da modificare se cambiano).
 * - Roma e provincia (RM): consegna gratuita entro 24/48 ore lavorative.
 * - Resto del Lazio: entro 24/48 ore lavorative, € 3,50.
 * - Resto d'Italia: spedizione € 6,90.
 * - Sabato e domenica non si consegna.
 */
export const LAZIO_PROVINCES = ['RM', 'LT', 'FR', 'VT', 'RI'];

export const SHIPPING_ROMA_TEXT = 'Roma e provincia (RM): consegna gratuita entro 24/48 ore lavorative';
export const SHIPPING_LAZIO_TEXT = 'Resto del Lazio: consegna entro 24/48 ore lavorative, € 3,50';
export const SHIPPING_ITALIA_TEXT = 'Resto d\'Italia: spedizione € 6,90';
export const SHIPPING_DAYS_TEXT = 'Consegne e spedizioni nei giorni lavorativi, esclusi sabato e domenica';

export type ShippingZone = 'roma' | 'lazio' | 'italia' | null;

export function shippingZone(province?: string | null): ShippingZone {
  const p = (province || '').trim().toUpperCase();
  if (!p) return null;
  if (p === 'RM' || p === 'ROMA') return 'roma';
  return LAZIO_PROVINCES.includes(p) ? 'lazio' : 'italia';
}

/** Costo di consegna da mostrare per la provincia indicata. */
export function shippingCostLabel(province?: string | null): string {
  const z = shippingZone(province);
  if (z === 'roma') return 'Gratuita';
  if (z === 'lazio') return '€ 3,50';
  if (z === 'italia') return '€ 6,90';
  return 'Roma gratis · Lazio € 3,50 · Italia € 6,90';
}

/** Costo di consegna in euro da aggiungere al totale (0 = gratuita o provincia non ancora indicata). */
export const SHIPPING_COST_LAZIO = 3.5;
export const SHIPPING_COST_ITALIA = 6.9;
export function shippingCost(province?: string | null): number {
  const z = shippingZone(province);
  if (z === 'lazio') return SHIPPING_COST_LAZIO;
  if (z === 'italia') return SHIPPING_COST_ITALIA;
  return 0;
}

/** Tempi di consegna da mostrare per la provincia indicata. */
export function shippingTimeLabel(province?: string | null): string {
  const z = shippingZone(province);
  if (z === 'roma' || z === 'lazio') return 'Consegna entro 24/48 ore lavorative (esclusi sabato e domenica)';
  if (z === 'italia') return 'Spedizione in giorni lavorativi (esclusi sabato e domenica)';
  return SHIPPING_DAYS_TEXT;
}
