import { Product } from '../types';

/** Foto collegate al sito del fornitore (Yollgo): spesso non si vedono, finché non vengono copiate nel nostro spazio */
export const isSupplierImage = (url?: string) => !!url && /(^|\.)freex\.es\//i.test(url.replace(/^https?:\/\//, ''));

/** true se il prodotto ha una foto che si vede davvero (salvata nel nostro spazio o comunque non del fornitore) */
export const hasProductImage = (p: Product) => !!(p.image && p.image.trim()) && !isSupplierImage(p.image);

/**
 * Prima i prodotti con una foto visibile, poi quelli con la foto ancora del fornitore,
 * in fondo quelli senza foto. Per il resto resta l'ordine già scelto (popolarità, prezzo, nome...).
 */
export function imageFirst<T extends Product>(list: T[]): T[] {
  const good: T[] = [];
  const supplier: T[] = [];
  const none: T[] = [];
  for (const p of list) {
    if (hasProductImage(p)) good.push(p);
    else if (p.image && p.image.trim()) supplier.push(p);
    else none.push(p);
  }
  return supplier.length === 0 && none.length === 0 ? list : [...good, ...supplier, ...none];
}
