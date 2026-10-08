/**
 * Condizioni di consegna Aurora (un solo punto da modificare se cambiano).
 * - Roma e provincia (RM): consegna gratuita entro 24/48 ore lavorative.
 * - Resto del Lazio: entro 24/48 ore lavorative, € 3,50 o € 4,50 in base alla zona.
 * - Resto d'Italia: spedizione € 7,00.
 * - Sabato e domenica non si consegna.
 */
export const LAZIO_PROVINCES = ['RM', 'LT', 'FR', 'VT', 'RI'];

export const SHIPPING_ROMA_TEXT = 'Roma e provincia (RM): consegna gratuita entro 24/48 ore lavorative';
export const SHIPPING_LAZIO_TEXT = 'Resto del Lazio: consegna entro 24/48 ore lavorative, € 3,50 o € 4,50 in base alla zona';
export const SHIPPING_ITALIA_TEXT = 'Resto d\'Italia: spedizione € 7,00';
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
  if (z === 'lazio') return '€ 3,50 / € 4,50 (in base alla zona)';
  if (z === 'italia') return '€ 7,00';
  return 'Roma gratis · Lazio € 3,50 / € 4,50 · Italia € 7,00';
}

/** Tempi di consegna da mostrare per la provincia indicata. */
export function shippingTimeLabel(province?: string | null): string {
  const z = shippingZone(province);
  if (z === 'roma' || z === 'lazio') return 'Consegna entro 24/48 ore lavorative (esclusi sabato e domenica)';
  if (z === 'italia') return 'Spedizione in giorni lavorativi (esclusi sabato e domenica)';
  return SHIPPING_DAYS_TEXT;
}
