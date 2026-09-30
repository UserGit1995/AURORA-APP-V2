/**
 * Servizio per la "Personalizzazione Packaging":
 *  - prezzi base per misura (tabella `packaging_prices`, modificabili dall'admin)
 *  - invio richieste di personalizzazione (tabella `customization_requests`)
 *  - upload del logo nello storage (bucket `customization-logos`)
 *
 * Nella nuova app non ci sono "server function": tutto passa dal client
 * Supabase, protetto dalle policy RLS definite nella migrazione
 * `20260930120000_customization_and_packaging.sql`.
 */
import { getSupabase } from './supabase';
import { postToShop } from './orderSubmit';

export interface PackagingPriceRow {
  category_id: string;
  size_key: string;
  base_price_per_unit: number;
  moq: number;
}

export type LegacyProductType = 'bicchieri' | 'tovagliette' | 'bustine' | 'scatole';

export interface CustomizationRequestInput {
  productType: LegacyProductType;
  quantity: number;
  printColors: number;
  logoFile: File;
  notes: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerPhone: string;
  privacyConsent: true;
}

export const LOGO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const LOGO_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const LOGO_BUCKET = 'customization-logos';

/** Prezzi impostati dall'admin. In caso di errore restituisce [] (si usano i prezzi di default). */
export async function fetchPackagingPrices(): Promise<PackagingPriceRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('packaging_prices')
      .select('category_id, size_key, base_price_per_unit, moq');
    if (error) {
      console.warn('fetchPackagingPrices:', error.message);
      return [];
    }
    return (data ?? []).map((r: any) => ({
      category_id: r.category_id,
      size_key: r.size_key,
      base_price_per_unit: Number(r.base_price_per_unit),
      moq: Number(r.moq),
    }));
  } catch (e) {
    console.warn('fetchPackagingPrices error:', e);
    return [];
  }
}

/** Salva (crea o aggiorna) il prezzo base e il minimo d'ordine di una misura. Solo admin (RLS). */
export async function savePackagingPrice(
  categoryId: string,
  sizeKey: string,
  basePricePerUnit: number,
  moq: number,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Database non configurato.' };
  if (!(basePricePerUnit > 0)) return { ok: false, error: 'Il prezzo deve essere maggiore di zero.' };
  if (!Number.isInteger(moq) || moq < 1) return { ok: false, error: 'Il minimo d\'ordine deve essere un intero ≥ 1.' };

  const { error } = await sb.from('packaging_prices').upsert(
    {
      category_id: categoryId,
      size_key: sizeKey,
      base_price_per_unit: basePricePerUnit,
      moq,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'category_id,size_key' },
  );
  if (error) {
    // 42501 = permesso negato da RLS: l'utente non è admin nel database
    const denied = (error as any).code === '42501' || /row-level security/i.test(error.message);
    return {
      ok: false,
      error: denied
        ? 'Permesso negato: accedi con un account admin (tabella user_roles) per modificare i prezzi.'
        : error.message,
    };
  }
  return { ok: true };
}

function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // fallback per browser molto vecchi
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function validateLogoFile(file: File): string | null {
  if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
    return 'Formato non supportato: carica un logo PNG, JPG, WebP o SVG.';
  }
  if (file.size > LOGO_MAX_BYTES) {
    return 'Il file è troppo grande (massimo 5 MB).';
  }
  return null;
}

async function uploadLogo(file: File): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non configurato.');
  const rawExt = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ext = rawExt.slice(0, 5) || 'png';
  const path = `loghi/${newUuid()}.${ext}`;

  const { error } = await sb.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) {
    throw new Error(
      `Caricamento del logo non riuscito (${error.message}). Riprova o scrivici direttamente il logo via email.`,
    );
  }
  return sb.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Carica il logo e registra la richiesta. Restituisce id e token di consultazione.
 * L'id e il token sono generati qui perché l'utente pubblico può solo inserire,
 * non rileggere la riga (RLS): così non serve una SELECT dopo l'INSERT.
 */
export async function submitCustomizationRequest(
  input: CustomizationRequestInput,
): Promise<{ id: string; accessToken: string; emailSent: boolean }> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non configurato.');

  const fileError = validateLogoFile(input.logoFile);
  if (fileError) throw new Error(fileError);

  const logoUrl = await uploadLogo(input.logoFile);

  const id = newUuid();
  const accessToken = newUuid();

  const { error } = await sb.from('customization_requests').insert({
    id,
    access_token: accessToken,
    product_type: input.productType,
    quantity: input.quantity,
    print_colors: input.printColors,
    logo_url: logoUrl,
    notes: input.notes || null,
    customer_name: input.customerName.trim(),
    customer_company: input.customerCompany.trim() || null,
    customer_email: input.customerEmail.trim(),
    customer_phone: input.customerPhone.trim(),
    status: 'new',
    privacy_consent: input.privacyConsent,
  });

  if (error) {
    throw new Error(`Invio della richiesta non riuscito: ${error.message}`);
  }

  // Email automatiche (avviso al negozio + conferma al cliente). Se falliscono la
  // richiesta resta comunque salvata: l'admin la vede nel pannello.
  const mail = await postToShop({ kind: 'customization', token: accessToken, website: '' });
  return { id, accessToken, emailSent: mail.ok };
}

// ---------------------------------------------------------------------------
// Stato richiesta per il cliente (pagina /personalizzazione/<token>)
// ---------------------------------------------------------------------------
export interface PublicCustomization {
  id: string;
  product_type: string;
  quantity: number;
  print_colors: number;
  logo_url: string;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Restituisce la richiesta o null se il token non esiste / non è valido. Lancia solo per errori di rete. */
export async function getCustomizationByToken(token: string): Promise<PublicCustomization | null> {
  if (!UUID_RE.test(token)) return null;
  const sb = getSupabase();
  if (!sb) throw new Error('Database non configurato.');
  const { data, error } = await sb.rpc('get_customization_by_token', { p_access_token: token });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Gestione admin delle richieste
// ---------------------------------------------------------------------------
export type CustomizationStatus = 'new' | 'processing' | 'delivered' | 'cancelled';

export interface CustomizationRequestRow extends PublicCustomization {
  customer_name: string;
  customer_company: string | null;
  customer_email: string;
  customer_phone: string;
  access_token: string;
  updated_at: string | null;
}

export async function listCustomizationRequests(): Promise<CustomizationRequestRow[]> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non configurato.');
  const { data, error } = await sb
    .from('customization_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomizationRequestRow[];
}

function friendlyAdminError(error: { code?: string; message: string }): string {
  const denied = error.code === '42501' || /row-level security/i.test(error.message);
  return denied
    ? 'Permesso negato: accedi con un account admin (tabella user_roles) per gestire le richieste.'
    : error.message;
}

export async function updateCustomizationStatus(
  id: string,
  status: CustomizationStatus,
  adminNotes?: string | null,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non configurato.');
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (adminNotes !== undefined) update.admin_notes = adminNotes;
  // .select() per accorgersi se RLS ha bloccato l'update senza errore (0 righe modificate)
  const { data, error } = await sb.from('customization_requests').update(update).eq('id', id).select('id');
  if (error) throw new Error(friendlyAdminError(error));
  if (!data || data.length === 0) {
    throw new Error('Modifica non applicata: verifica di essere collegato come admin.');
  }
}

export async function deleteCustomizationRequest(id: string, logoUrl?: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non configurato.');
  const { data, error } = await sb.from('customization_requests').delete().eq('id', id).select('id');
  if (error) throw new Error(friendlyAdminError(error));
  if (!data || data.length === 0) {
    throw new Error('Eliminazione non applicata: verifica di essere collegato come admin.');
  }
  // Pulizia del file logo dallo storage (se fallisce non è grave)
  try {
    const marker = `/${LOGO_BUCKET}/`;
    const idx = logoUrl ? logoUrl.indexOf(marker) : -1;
    if (logoUrl && idx !== -1) {
      const path = decodeURIComponent(logoUrl.slice(idx + marker.length).split('?')[0]);
      await sb.storage.from(LOGO_BUCKET).remove([path]);
    }
  } catch (e) {
    console.warn('Pulizia logo non riuscita:', e);
  }
}

export const STATUS_LABELS: Record<string, string> = {
  new: 'Nuova',
  processing: 'In lavorazione',
  delivered: 'Consegnata',
  cancelled: 'Annullata',
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  bicchieri: 'Bicchieri',
  tovagliette: 'Tovagliette',
  bustine: 'Bustine',
  scatole: 'Scatole',
};
