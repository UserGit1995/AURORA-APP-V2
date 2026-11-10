/**
 * Condizioni di consegna Aurora (un solo punto da modificare se cambiano).
 * - Roma città (comune di Roma, CAP 00118-00199): consegna gratuita entro 24/48 ore lavorative.
 * - Provincia di Roma (comuni fuori Roma) e resto del Lazio: entro 24/48 ore lavorative, € 3,50.
 * - Resto d'Italia: spedizione € 6,90.
 * - Sabato e domenica non si consegna.
 */
export const LAZIO_PROVINCES = ['RM', 'LT', 'FR', 'VT', 'RI'];

export const SHIPPING_ROMA_TEXT = 'Roma città: consegna gratuita entro 24/48 ore lavorative';
export const SHIPPING_LAZIO_TEXT = 'Provincia di Roma e resto del Lazio: consegna entro 24/48 ore lavorative, € 3,50';
export const SHIPPING_ITALIA_TEXT = 'Resto d\'Italia: spedizione € 6,90';
export const SHIPPING_DAYS_TEXT = 'Consegne e spedizioni nei giorni lavorativi, esclusi sabato e domenica';

/** roma = Roma città (gratis) · rm = provincia RM ma comune non ancora indicato */
export type ShippingZone = 'roma' | 'rm' | 'lazio' | 'italia' | null;

/**
 * true = comune di Roma, false = altro comune, null = non si può ancora sapere.
 * Il CAP è il dato più sicuro (Roma città: 00100 e 00118-00199, anche Ostia);
 * senza CAP si guarda il nome della città.
 */
export function isRomaCity(city?: string | null, postalCode?: string | null): boolean | null {
  const cap = (postalCode || '').replace(/\D/g, '');
  if (cap.length === 5) {
    const n = Number(cap);
    return n === 100 || (n >= 118 && n <= 199);
  }
  const c = (city || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!c) return null;
  return c === 'roma' || c === 'rome' || c === 'roma capitale';
}

export function shippingZone(province?: string | null, city?: string | null, postalCode?: string | null): ShippingZone {
  const p = (province || '').trim().toUpperCase();
  if (!p) return null;
  if (p === 'RM' || p === 'ROMA') {
    const roma = isRomaCity(city, postalCode);
    if (roma === null) return 'rm';
    return roma ? 'roma' : 'lazio';
  }
  return LAZIO_PROVINCES.includes(p) ? 'lazio' : 'italia';
}

/** Costo di consegna da mostrare per l'indirizzo indicato. */
export function shippingCostLabel(province?: string | null, city?: string | null, postalCode?: string | null): string {
  const z = shippingZone(province, city, postalCode);
  if (z === 'roma') return 'Gratuita';
  if (z === 'rm') return 'Roma città gratis · provincia € 3,50 (indica città e CAP)';
  if (z === 'lazio') return '€ 3,50';
  if (z === 'italia') return '€ 6,90';
  return 'Roma città gratis · provincia di Roma e Lazio € 3,50 · Italia € 6,90';
}

/** Costo di consegna in euro da aggiungere al totale (0 = gratuita o indirizzo non ancora completo). */
export const SHIPPING_COST_LAZIO = 3.5;
export const SHIPPING_COST_ITALIA = 6.9;
export function shippingCost(province?: string | null, city?: string | null, postalCode?: string | null): number {
  const z = shippingZone(province, city, postalCode);
  if (z === 'lazio') return SHIPPING_COST_LAZIO;
  if (z === 'italia') return SHIPPING_COST_ITALIA;
  return 0;
}

/** Tempi di consegna da mostrare per l'indirizzo indicato. */
export function shippingTimeLabel(province?: string | null, city?: string | null, postalCode?: string | null): string {
  const z = shippingZone(province, city, postalCode);
  if (z === 'roma' || z === 'rm' || z === 'lazio') return 'Consegna entro 24/48 ore lavorative (esclusi sabato e domenica)';
  if (z === 'italia') return 'Spedizione in giorni lavorativi (esclusi sabato e domenica)';
  return SHIPPING_DAYS_TEXT;
}
