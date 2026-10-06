import { Product } from '../types';

/** true se il prodotto ha una foto */
export const hasProductImage = (p: Product) => !!(p.image && p.image.trim());

/**
 * Mette prima i prodotti CON foto e in fondo quelli senza,
 * mantenendo per il resto l'ordine già scelto (popolarità, prezzo, nome...).
 */
export function imageFirst<T extends Product>(list: T[]): T[] {
  const withImg: T[] = [];
  const without: T[] = [];
  for (const p of list) (hasProductImage(p) ? withImg : without).push(p);
  return without.length === 0 ? list : [...withImg, ...without];
}
