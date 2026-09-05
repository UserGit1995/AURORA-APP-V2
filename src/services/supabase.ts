import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Order, Category, SystemSettings, Subcategory } from '../types';
import { CATEGORIES as LOCAL_CATEGORIES } from '../data/catalog';

// Valore di riserva noto e corretto per questo progetto: l'URL e la chiave "anon"
// non sono segreti (sono pensati per essere pubblici nel browser), quindi qui
// li fissiamo per evitare che una variabile d'ambiente sbagliata su Vercel
// blocchi il salvataggio senza che nessuno se ne accorga.
const FALLBACK_URL = "https://hkpqvggvqzvpkzeqmtga.supabase.co";
const FALLBACK_ANON_KEY = "sb_publishable_VsQKGL806R1Jkh9Q70zMLQ_BPiUa4g";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || FALLBACK_URL;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || FALLBACK_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Supabase initialization error:', err);
      supabaseInstance = null;
    }
  }
  return supabaseInstance;
}

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));
};

// ---------------------------------------------------------------------------
// Adattatori: l'app usa nomi di campo diversi da quelli reali del database
// (es. "image" invece di "image_url", "categoryId" invece di "category_id").
// Queste funzioni traducono in entrambe le direzioni, così i dati arrivano
// e tornano indietro correttamente invece di sparire in silenzio.
// ---------------------------------------------------------------------------

function productToRow(p: Product) {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    category_id: p.categoryId || null,
    subcategory_id: p.subcategoryId || null,
    price: p.price,
    discount_price: p.discountPercent ? +(p.price * (1 - p.discountPercent / 100)).toFixed(2) : null,
    image_url: p.image || null,
    sku: p.code || null,
    in_stock: (p.stock ?? 0) > 0,
    is_featured: !!p.isFeatured,
    is_new: false,
    is_on_offer: !!p.isOffer,
    active: true,
    extra_data: {
      unit: p.unit ?? null,
      packageQty: p.packageQty ?? null,
      stock: p.stock ?? null,
      lowStockThreshold: p.lowStockThreshold ?? null,
      discountPercent: p.discountPercent ?? null,
      specs: p.specs ?? null,
    },
  };
}

function rowToProduct(row: any, categoryName?: string): Product {
  const extra = row.extra_data || {};
  return {
    id: row.id,
    name: row.name,
    category: categoryName || '',
    categoryId: row.category_id || '',
    subcategoryId: row.subcategory_id || null,
    image: row.image_url || '',
    price: Number(row.price),
    unit: extra.unit || 'pz',
    packageQty: extra.packageQty || '1',
    code: row.sku || '',
    isFeatured: !!row.is_featured,
    isOffer: !!row.is_on_offer,
    discountPercent: extra.discountPercent ?? undefined,
    stock: extra.stock ?? (row.in_stock ? 999 : 0),
    lowStockThreshold: extra.lowStockThreshold ?? undefined,
    description: row.description || '',
    specs: extra.specs || { format: '' },
  };
}

function categoryToRow(c: Category) {
  const slug = (c.id && /^[a-z0-9-]+$/.test(c.id) ? c.id : c.name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return {
    id: c.id,
    name: c.name,
    slug,
    image_url: c.image || null,
    description: c.description ?? null,
    active: true,
  };
}

function rowToCategory(row: any, countNumber = 0): Category {
  // Se la categoria nel database non ha ancora un'immagine caricata (es. è
  // stata creata dalla query di importazione iniziale), usiamo l'immagine
  // locale della categoria di esempio con lo stesso nome, così non sparisce.
  const localFallback = LOCAL_CATEGORIES.find(
    (lc) => lc.name.trim().toLowerCase() === (row.name || '').trim().toLowerCase()
  );
  return {
    id: row.id,
    name: row.name,
    count: `${countNumber} prodott${countNumber === 1 ? 'o' : 'i'}`,
    countNumber,
    image: row.image_url || localFallback?.image || '',
    description: row.description || '',
  };
}

/**
 * Genera un ID valido per il database (UUID reale). L'app generava prima ID
 * come "p_172..." o slug di testo, che il database rifiutava perché la colonna
 * richiede un vero UUID: per questo nulla veniva mai salvato davvero.
 */
export function newDbId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback per browser molto vecchi senza crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Supabase/PostgREST restituisce al massimo un numero limitato di righe per
 * richiesta (di norma 1000, anche senza un .limit() esplicito nel codice).
 * Con più di 1000 prodotti in tabella, metà catalogo spariva silenziosamente
 * da tutta l'app (nessun errore, solo dati mancanti). Questa funzione pagina
 * automaticamente con .range() finché non riceve una pagina più corta della
 * dimensione richiesta, garantendo di leggere SEMPRE tutte le righe reali.
 */
async function fetchAllRows<T>(
  runPage: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  let all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await runPage(from, from + pageSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    all = all.concat(batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

/**
 * Fetch products from Supabase table 'products'
 */
export async function fetchSupabaseProducts(): Promise<Product[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const rows = await fetchAllRows<any>((from, to) =>
      sb
        .from('products')
        .select('*, categories(name)')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .range(from, to)
    );
    if (!rows || rows.length === 0) return null;
    return rows.map((row: any) => rowToProduct(row, row.categories?.name));
  } catch (e) {
    console.warn('Supabase products fetch failed:', e);
    return null;
  }
}

/**
 * Upsert product to Supabase
 */
export async function syncSupabaseProduct(product: Product): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('products').upsert(productToRow(product));
    if (error) {
      console.error('Supabase sync product FAILED:', error.message, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase sync product error:', e);
    return false;
  }
}

/**
 * Delete product from Supabase
 */
export async function deleteSupabaseProduct(productId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('products').delete().eq('id', productId);
    if (error) {
      console.error('Supabase delete product FAILED:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase delete product error:', e);
    return false;
  }
}

/**
 * Fetch orders from Supabase table 'orders'
 */
export async function fetchSupabaseOrders(): Promise<Order[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (error) return null;
    return data && data.length > 0 ? (data as unknown as Order[]) : null;
  } catch {
    return null;
  }
}

/**
 * Upsert order to Supabase
 */
export async function syncSupabaseOrder(order: Order): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('orders').upsert(order as any);
    if (error) {
      console.error('Supabase sync order FAILED:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase sync order error:', e);
    return false;
  }
}

/**
 * Fetch categories from Supabase table 'categories', con conteggio prodotti reale
 */
export async function fetchSupabaseCategories(): Promise<Category[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('categories').select('*').eq('active', true).order('sort_order');
    if (error) return null;
    if (!data || data.length === 0) return null;

    const productRows = await fetchAllRows<any>((from, to) =>
      sb.from('products').select('category_id').eq('active', true).range(from, to)
    );
    const counts: Record<string, number> = {};
    for (const row of productRows ?? []) {
      if (!row.category_id) continue;
      counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
    }

    return data.map((row: any) => rowToCategory(row, counts[row.id] ?? 0));
  } catch {
    return null;
  }
}

/**
 * Sync category to Supabase
 */
export async function syncSupabaseCategory(category: Category): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('categories').upsert(categoryToRow(category));
    if (error) {
      console.error('Supabase sync category FAILED:', error.message, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase sync category error:', e);
    return false;
  }
}

/**
 * Delete category from Supabase
 */
export async function deleteSupabaseCategory(categoryId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('categories').delete().eq('id', categoryId);
    if (error) {
      console.error('Supabase delete category FAILED:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase delete category error:', e);
    return false;
  }
}

/**
 * Sync system settings to Supabase
 */
// ---------------------------------------------------------------------------
// Sottocategorie (e sotto-sottocategorie tramite parentSubcategoryId)
// ---------------------------------------------------------------------------

function subcategoryToRow(s: Subcategory) {
  const slug = (s.slug || s.name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return {
    id: s.id,
    category_id: s.categoryId,
    parent_subcategory_id: s.parentSubcategoryId || null,
    name: s.name,
    slug,
    sort_order: s.sortOrder ?? 0,
    active: s.active ?? true,
  };
}

function rowToSubcategory(row: any): Subcategory {
  return {
    id: row.id,
    categoryId: row.category_id,
    parentSubcategoryId: row.parent_subcategory_id || null,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order ?? 0,
    active: !!row.active,
  };
}

/**
 * Le sottocategorie sono organizzate su 2 livelli tramite parentSubcategoryId:
 * marca (nessun parent) -> tipologia (parent = id della marca). I prodotti
 * salvano solo l'id della tipologia (subcategory_id). CatalogView.tsx però si
 * aspetta un albero già montato: category.subCategories (le marche) ognuna
 * con subSubCategories (le tipologie figlie). Questa funzione costruisce
 * quell'albero, e va richiamata ogni volta che categorie o sottocategorie
 * cambiano (dopo il caricamento cloud, o dopo una modifica in admin).
 */
export function buildCategoryTree(categories: Category[], subcategories: Subcategory[]): Category[] {
  return categories.map((cat) => {
    const brands = subcategories
      .filter((s) => s.categoryId === cat.id && !s.parentSubcategoryId)
      .map((brand) => ({
        ...brand,
        subSubCategories: subcategories
          .filter((s) => s.parentSubcategoryId === brand.id)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }));
    return {
      ...cat,
      subCategories: brands.sort((a, b) => a.sortOrder - b.sortOrder),
    } as Category;
  });
}

/**
 * Arricchisce ogni prodotto con subCategoryId/subSubCategoryId (e i nomi
 * corrispondenti) derivandoli dalla tipologia reale salvata in
 * subcategoryId, così i filtri "Sottocategorie" e "Micro-categorie" del
 * catalogo (CatalogView.tsx) trovano davvero i prodotti invece di restare
 * sempre vuoti.
 */
export function enrichProductsWithSubcategoryTree(products: Product[], subcategories: Subcategory[]): Product[] {
  const byId = new Map(subcategories.map((s) => [s.id, s]));
  return products.map((p) => {
    if (!p.subcategoryId) return p;
    const own = byId.get(p.subcategoryId);
    if (!own) return p;
    if (own.parentSubcategoryId) {
      // own è una tipologia (livello 2): il genitore è la marca (livello 1)
      const parent = byId.get(own.parentSubcategoryId);
      return {
        ...p,
        subCategoryId: parent?.id ?? own.id,
        subCategoryName: parent?.name,
        subSubCategoryId: own.id,
        subSubCategoryName: own.name,
      } as Product;
    }
    // own è già una marca senza tipologie proprie
    return {
      ...p,
      subCategoryId: own.id,
      subCategoryName: own.name,
    } as Product;
  });
}

export async function fetchSupabaseSubcategories(): Promise<Subcategory[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('subcategories').select('*').eq('active', true).order('sort_order');
    if (error) {
      console.warn('Supabase fetch subcategories notice:', error.message);
      return null;
    }
    return (data ?? []).map(rowToSubcategory);
  } catch (e) {
    console.warn('Supabase subcategories fetch failed:', e);
    return null;
  }
}

export async function syncSupabaseSubcategory(sub: Subcategory): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('subcategories').upsert(subcategoryToRow(sub));
    if (error) {
      console.error('Supabase sync subcategory FAILED:', error.message, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase sync subcategory error:', e);
    return false;
  }
}

export async function deleteSupabaseSubcategory(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('subcategories').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete subcategory FAILED:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase delete subcategory error:', e);
    return false;
  }
}

export async function syncSupabaseSettings(settings: SystemSettings): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('settings').upsert(
      Object.entries(settings).map(([key, value]) => ({ key, value: String(value) })),
      { onConflict: 'key' }
    );
    if (error) {
      console.error('Supabase sync settings FAILED:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase sync settings error:', e);
    return false;
  }
}
