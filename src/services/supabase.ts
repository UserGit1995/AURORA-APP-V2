import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Order, Category, SystemSettings, Subcategory } from '../types';
import { CATEGORIES as LOCAL_CATEGORIES } from '../data/catalog';

// Valore di riserva noto e corretto per questo progetto: l'URL e la chiave "anon"
// non sono segreti (sono pensati per essere pubblici nel browser), quindi qui
// li fissiamo per evitare che una variabile d'ambiente sbagliata su Vercel
// blocchi il salvataggio senza che nessuno se ne accorga.
const FALLBACK_URL = "https://hkpqvggvqzvpkzeqmtga.supabase.co";
const FALLBACK_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcHF2Z2d2cXp2cGt6ZXFtdGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2ODc3MjUsImV4cCI6MjEwMDI2MzcyNX0.1Lgr756jgYTo-dKsrlAOQpRkwvyULbV5Dt-xnpPrxss";

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
    // In offerta da volantino `price` è già il prezzo scontato: niente doppio calcolo.
    discount_price: p.originalPrice ? null : p.discountPercent ? +(p.price * (1 - p.discountPercent / 100)).toFixed(2) : null,
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
      originalPrice: p.originalPrice ?? null,
      offerNote: p.offerNote ?? null,
      specs: p.specs ?? null,
      isEco: p.isEco ?? false,
      isMedicalDevice: p.isMedicalDevice ?? false,
      isBestseller: p.isBestseller ?? false,
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
    isEco: !!extra.isEco,
    isMedicalDevice: !!extra.isMedicalDevice,
    isBestseller: !!extra.isBestseller,
    discountPercent: extra.discountPercent ?? undefined,
    originalPrice: extra.originalPrice != null ? Number(extra.originalPrice) : undefined,
    offerNote: extra.offerNote || undefined,
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
  runPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
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

// ---------------------------------------------------------------------------
// ORDINI
// La tabella "orders" del database ha colonne diverse dall'oggetto Order usato
// dall'app (order_number, customer_name, customer_email, status "nuovo"...).
// Prima l'app provava a salvare l'oggetto Order così com'era: il database lo
// rifiutava e l'ordine spariva senza errori visibili. Ora si traduce in
// entrambe le direzioni. L'ordine completo viene anche conservato (come JSON)
// nel campo "notes", così niente si perde nel passaggio.
// ---------------------------------------------------------------------------

const ORDER_NOTES_MARK = '__aurora_order_v1__';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Numero ordine leggibile e praticamente senza collisioni, es. ORD-260929-K7Q2 */
export function newOrderNumber(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `ORD-${yy}${mm}${dd}-${rand}`;
}

function orderStatusToDb(status: Order['status']): string {
  switch (status) {
    case 'Annullato':
      return 'annullato';
    case 'Spedito':
    case 'Consegnato':
      return 'evaso';
    default:
      return 'nuovo';
  }
}

function orderToRow(order: Order, userId: string | null) {
  const a = order.shippingAddress;
  const address = [a?.street, [a?.postalCode, a?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return {
    order_number: order.id,
    user_id: userId,
    customer_name: a?.companyName || a?.recipient || 'Cliente',
    customer_email: a?.email || '-',
    customer_phone: a?.phone || '-',
    customer_address: address || '-',
    customer_province: a?.province || '-',
    notes: ORDER_NOTES_MARK + JSON.stringify(order),
    status: orderStatusToDb(order.status),
    total: Number(order.total) || 0,
  };
}

function rowToOrder(row: any): Order | null {
  try {
    const notes: string = row?.notes || '';
    let base: Order | null = null;
    if (notes.startsWith(ORDER_NOTES_MARK)) {
      base = JSON.parse(notes.slice(ORDER_NOTES_MARK.length)) as Order;
    }
    if (!base) {
      // Ordine inserito a mano nel database (senza JSON completo): ricostruiamo il minimo.
      const items = (row.order_items ?? []).map((it: any) => ({
        productId: it.product_id ?? undefined,
        productName: it.product_name,
        qty: it.quantity,
        price: Number(it.unit_price),
      }));
      base = {
        id: row.order_number || row.id,
        date: row.created_at ? new Date(row.created_at).toLocaleDateString('it-IT') : '',
        status: 'In elaborazione',
        estimatedDelivery: '',
        total: Number(row.total) || 0,
        itemsCount: items.reduce((n: number, i: any) => n + (i.qty || 0), 0),
        items,
        shippingAddress: {
          recipient: row.customer_name,
          email: row.customer_email,
          phone: row.customer_phone,
          street: row.customer_address,
          city: '',
          province: row.customer_province,
          postalCode: '',
          country: 'Italia',
        },
      };
    }
    // Lo stato scritto nel database (es. cambiato da un admin) ha la precedenza
    if (row.status === 'annullato') base.status = 'Annullato';
    else if (row.status === 'evaso' && base.status === 'In elaborazione') base.status = 'Spedito';
    if (row.created_at && (!base.date || base.date === 'Oggi' || base.date.startsWith('Oggi'))) {
      base.date = new Date(row.created_at).toLocaleDateString('it-IT');
    }
    return base;
  } catch {
    return null;
  }
}

/**
 * Fetch orders from Supabase table 'orders'.
 * Un cliente registrato vede solo i propri ordini, un admin tutti (regole RLS).
 */
export async function fetchSupabaseOrders(): Promise<Order[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) return null;
    const mapped = (data ?? []).map(rowToOrder).filter(Boolean) as Order[];
    return mapped.length > 0 ? mapped : null;
  } catch {
    return null;
  }
}

/**
 * Salva un NUOVO ordine (cliente registrato o ospite NON registrato) su Supabase.
 *
 * 1) Prima prova la funzione "submit_order" del database (vedi la migrazione
 *    20260929120000_submit_order_rpc.sql): salva ordine + articoli anche per chi
 *    non ha un account.
 * 2) Se la funzione non è ancora stata installata nel database, ripiega sul
 *    salvataggio diretto (solo testata ordine: l'ordine completo è comunque
 *    conservato per intero nel campo "notes").
 * Ripetere lo stesso ordine (stesso numero) non crea doppioni.
 */
export async function insertSupabaseOrder(order: Order): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase non configurato' };
  try {
    let userId: string | null = null;
    try {
      const { data } = await sb.auth.getSession();
      userId = data.session?.user?.id ?? null;
    } catch {
      userId = null;
    }

    const row = orderToRow(order, userId);
    const items = order.items.map((it) => ({
      product_id: it.productId && UUID_RE.test(it.productId) ? it.productId : null,
      product_name: it.productName,
      quantity: Math.max(1, Math.round(it.qty) || 1),
      unit_price: Number(it.price) || 0,
    }));

    // --- 1) funzione del database (consigliata) ---
    const { user_id: _u, ...orderForRpc } = row;
    const rpc = await sb.rpc('submit_order', { p_order: orderForRpc, p_items: items });
    if (!rpc.error) return { ok: true };
    console.warn('submit_order non disponibile, uso il salvataggio diretto:', rpc.error.message);

    // --- 2) salvataggio diretto (compatibile con il database com'era prima) ---
    const orderId = newDbId();
    const { error } = await sb.from('orders').insert({ id: orderId, ...row });
    if (error) {
      // 23505 = numero ordine già presente: l'ordine è già stato salvato
      if ((error as any).code === '23505') return { ok: true };
      console.error('Supabase insert order FAILED:', error.message);
      return { ok: false, error: error.message };
    }

    // Righe articolo (best effort: l'ordine è già salvato con tutti i dettagli in "notes")
    const buildItems = (withProductId: boolean) =>
      items.map((it) => ({
        order_id: orderId,
        product_id: withProductId ? it.product_id : null,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        subtotal: +(it.unit_price * it.quantity).toFixed(2),
      }));
    let itemsRes = await sb.from('order_items').insert(buildItems(true));
    if (itemsRes.error) {
      itemsRes = await sb.from('order_items').insert(buildItems(false));
      if (itemsRes.error) console.warn('Supabase insert order_items notice:', itemsRes.error.message);
    }
    return { ok: true };
  } catch (e: any) {
    console.error('Supabase insert order error:', e);
    return { ok: false, error: e?.message || 'errore' };
  }
}

/**
 * Aggiorna un ordine esistente (solo admin: stato, note, ecc.)
 */
export async function syncSupabaseOrder(order: Order): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const row = orderToRow(order, null);
    const { user_id: _omit, order_number: _num, ...changes } = row;
    const { error } = await sb.from('orders').update(changes).eq('order_number', order.id);
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
    image_url: s.image || null,
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
    image: row.image_url || '',
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
