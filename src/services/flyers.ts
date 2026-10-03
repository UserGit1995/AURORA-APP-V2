import { getSupabase } from './supabase';

export interface Flyer {
  id: string;
  title: string;
  validFrom: string | null; // 'YYYY-MM-DD'
  validTo: string | null;
  pages: string[]; // indirizzi delle immagini delle pagine, in ordine
  active: boolean;
  createdAt: string;
}

const BUCKET = 'aurora-images';

const rowToFlyer = (r: any): Flyer => ({
  id: r.id,
  title: r.title || 'Volantino offerte',
  validFrom: r.valid_from,
  validTo: r.valid_to,
  pages: Array.isArray(r.pages) ? r.pages : [],
  active: !!r.active,
  createdAt: r.created_at,
});

/** Il volantino da mostrare in home: il più recente tra quelli attivi */
export async function fetchActiveFlyer(): Promise<Flyer | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('flyers')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return rowToFlyer(data[0]);
}

export async function fetchAllFlyers(): Promise<{ flyers: Flyer[]; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { flyers: [], error: 'Database non collegato' };
  const { data, error } = await sb.from('flyers').select('*').order('created_at', { ascending: false });
  if (error) return { flyers: [], error: error.message };
  return { flyers: (data || []).map(rowToFlyer) };
}

/** Carica l'immagine di una pagina nello spazio file e restituisce il suo indirizzo pubblico */
export async function uploadFlyerPage(flyerId: string, index: number, blob: Blob): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non collegato');
  const path = `volantini/${flyerId}/pagina-${String(index + 1).padStart(2, '0')}-${Date.now()}.jpg`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw new Error(error.message);
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function insertFlyer(f: Omit<Flyer, 'createdAt'>): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non collegato');
  const { error } = await sb.from('flyers').insert({
    id: f.id,
    title: f.title,
    valid_from: f.validFrom,
    valid_to: f.validTo,
    pages: f.pages,
    active: f.active,
  });
  if (error) throw new Error(error.message);
}

export async function updateFlyer(id: string, changes: Partial<Pick<Flyer, 'title' | 'validFrom' | 'validTo' | 'active'>>) {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non collegato');
  const row: Record<string, unknown> = {};
  if (changes.title !== undefined) row.title = changes.title;
  if (changes.validFrom !== undefined) row.valid_from = changes.validFrom;
  if (changes.validTo !== undefined) row.valid_to = changes.validTo;
  if (changes.active !== undefined) row.active = changes.active;
  const { error } = await sb.from('flyers').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteFlyer(f: Flyer) {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non collegato');
  // Prova a cancellare anche le immagini delle pagine (se non riesce, il volantino viene comunque eliminato)
  const marker = `/${BUCKET}/`;
  const paths = f.pages.map((u) => (u.includes(marker) ? u.split(marker)[1] : '')).filter(Boolean);
  if (paths.length) await sb.storage.from(BUCKET).remove(paths).catch(() => undefined);
  const { error } = await sb.from('flyers').delete().eq('id', f.id);
  if (error) throw new Error(error.message);
}

/** Data italiana breve: 2026-10-05 -> 05/10 */
export const shortDate = (d: string | null) => {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};
