/**
 * Utenti registrati, profilo cliente nel database, bonus acquisto e sconti personali.
 * Tabelle/funzioni create da UTENTI_E_BONUS.sql: profiles (email, customer_type),
 * admin_list_users() (solo admin), user_benefits, use_benefit().
 */
import { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { getSupabase } from './supabase';

// ---------------------------------------------------------------------------
// Profilo del cliente nel database
// ---------------------------------------------------------------------------

export interface DbProfile {
  full_name: string | null;
  phone: string | null;
  company: string | null;
  customer_type: string | null;
  piva: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  email: string | null;
}

const PROFILE_COLS = 'full_name, phone, company, customer_type, piva, address, city, postal_code, province, email';
const PRIVATE_PLACEHOLDER = /^Cliente Privato/i;

/** Dati del cliente nel formato della tabella profiles (solo i campi compilati). */
function toDbFields(u: Partial<UserProfile>): Partial<DbProfile> {
  const out: Partial<DbProfile> = {};
  const put = (k: keyof DbProfile, v?: string | null) => {
    const s = (v || '').trim();
    if (s) out[k] = s;
  };
  put('full_name', u.name);
  put('phone', u.phone);
  if (u.company && !PRIVATE_PLACEHOLDER.test(u.company)) put('company', u.company);
  put('customer_type', u.customerType);
  put('piva', u.piva);
  put('address', u.address);
  put('city', u.city);
  put('postal_code', u.postalCode);
  put('province', u.province ? u.province.toUpperCase() : '');
  put('email', u.email);
  return out;
}

/**
 * Allinea il profilo del cliente nel database: completa SOLO i campi vuoti
 * (non sovrascrive mai quello che c'è già) e restituisce i dati del database,
 * utili per completare il profilo su un telefono nuovo.
 */
export async function syncMyProfile(u: Partial<UserProfile>): Promise<DbProfile | null> {
  const sb = getSupabase();
  if (!sb || !u.id) return null;
  try {
    const { data: auth } = await sb.auth.getSession();
    if (auth.session?.user?.id !== u.id) return null; // non loggato davvero: niente da fare
    const { data: row, error } = await sb.from('profiles').select(PROFILE_COLS).eq('id', u.id).maybeSingle();
    if (error) return null;
    const local = toDbFields(u);
    const missing: Partial<DbProfile> = {};
    (Object.keys(local) as (keyof DbProfile)[]).forEach((k) => {
      if (!row || !(row as any)[k]) missing[k] = local[k] as any;
    });
    if (Object.keys(missing).length) {
      if (row) await sb.from('profiles').update(missing).eq('id', u.id);
      else await sb.from('profiles').insert({ id: u.id, ...missing });
    }
    return { ...(row as DbProfile | null ?? ({} as DbProfile)), ...missing } as DbProfile;
  } catch {
    return null;
  }
}

/** Completa un profilo locale con i dati del database (solo dove mancano). */
export function mergeDbProfile(u: UserProfile, db: DbProfile | null): UserProfile {
  if (!db) return u;
  const pick = (cur: string | undefined, v: string | null) => (cur && cur.trim() ? cur : v || cur || '');
  const company = u.company && !PRIVATE_PLACEHOLDER.test(u.company) ? u.company : db.company || u.company;
  return {
    ...u,
    name: u.name && u.name !== (u.email || '').split('@')[0] ? u.name : db.full_name || u.name,
    phone: pick(u.phone, db.phone),
    company,
    customerType: db.customer_type === 'attivita' || db.customer_type === 'privato' ? db.customer_type : u.customerType,
    piva: pick(u.piva, db.piva),
    address: pick(u.address, db.address),
    city: pick(u.city, db.city),
    postalCode: pick(u.postalCode, db.postal_code),
    province: pick(u.province, db.province),
  };
}

// ---------------------------------------------------------------------------
// Lista utenti (solo admin)
// ---------------------------------------------------------------------------

export interface RegisteredUser {
  id: string;
  email: string;
  registeredAt: string;
  lastSignInAt: string | null;
  confirmed: boolean;
  name: string;
  phone: string;
  company: string;
  customerType: 'privato' | 'attivita' | '';
  piva: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  ordersCount: number;
  ordersTotal: number;
  lastOrderAt: string | null;
  isAdmin: boolean;
}

export async function adminListUsers(): Promise<RegisteredUser[]> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non disponibile.');
  const { data, error } = await sb.rpc('admin_list_users');
  if (error) {
    if (/admin_list_users|schema cache|could not find/i.test(error.message)) {
      throw new Error('Manca la funzione della lista utenti: esegui lo script UTENTI_E_BONUS.sql su Supabase.');
    }
    if (/solo admin|42501|permission/i.test(error.message)) throw new Error('Devi essere entrato come amministratore.');
    throw new Error('Lista utenti non disponibile: ' + error.message);
  }
  return ((data as any[]) || []).map((r) => ({
    id: r.id,
    email: r.email || '',
    registeredAt: r.registered_at,
    lastSignInAt: r.last_sign_in_at,
    confirmed: !!r.confirmed,
    name: r.full_name || '',
    phone: r.phone || '',
    company: r.company && !PRIVATE_PLACEHOLDER.test(r.company) ? r.company : '',
    customerType: r.customer_type === 'attivita' || r.customer_type === 'privato' ? r.customer_type : '',
    piva: r.piva || '',
    address: r.address || '',
    city: r.city || '',
    postalCode: r.postal_code || '',
    province: r.province || '',
    ordersCount: Number(r.orders_count) || 0,
    ordersTotal: Number(r.orders_total) || 0,
    lastOrderAt: r.last_order_at,
    isAdmin: !!r.is_admin,
  }));
}

// ---------------------------------------------------------------------------
// Bonus acquisto e sconti personali
// ---------------------------------------------------------------------------

export interface Benefit {
  id: string;
  userId: string;
  kind: 'bonus' | 'sconto';
  amount: number; // bonus in euro
  percent: number; // sconto %
  once: boolean; // solo il prossimo ordine
  note: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedOrder: string | null;
  createdAt: string;
}

const mapBenefit = (r: any): Benefit => ({
  id: r.id,
  userId: r.user_id,
  kind: r.kind,
  amount: Number(r.amount) || 0,
  percent: Number(r.percent) || 0,
  once: r.once !== false,
  note: r.note || '',
  expiresAt: r.expires_at,
  usedAt: r.used_at,
  usedOrder: r.used_order,
  createdAt: r.created_at,
});

export const benefitActive = (b: Benefit, now = Date.now()) =>
  !(b.once && b.usedAt) && !(b.expiresAt && new Date(b.expiresAt).getTime() < now);

export const eur = (n: number) => '€ ' + n.toFixed(2).replace('.', ',');
export const benefitLabel = (b: Benefit) =>
  b.kind === 'bonus' ? `Bonus acquisto ${eur(b.amount)}` : `Sconto ${String(b.percent).replace('.', ',')}%${b.once ? ' sul prossimo ordine' : ''}`;

const tableMissing = (m: string) => /user_benefits|schema cache|relation/i.test(m);

export async function listBenefits(userId?: string): Promise<Benefit[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb.from('user_benefits').select('*').order('created_at', { ascending: false });
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) {
    if (tableMissing(error.message)) throw new Error('Manca la tabella dei bonus: esegui lo script UTENTI_E_BONUS.sql su Supabase.');
    throw new Error(error.message);
  }
  return ((data as any[]) || []).map(mapBenefit);
}

export async function addBenefit(b: {
  userId: string;
  kind: 'bonus' | 'sconto';
  value: number;
  once: boolean;
  note?: string;
  expiresAt?: string | null;
}): Promise<Benefit> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non disponibile.');
  const row = {
    user_id: b.userId,
    kind: b.kind,
    amount: b.kind === 'bonus' ? Math.round(b.value * 100) / 100 : null,
    percent: b.kind === 'sconto' ? Math.round(b.value * 100) / 100 : null,
    once: b.kind === 'bonus' ? true : b.once,
    note: (b.note || '').trim() || null,
    expires_at: b.expiresAt || null,
  };
  const { data, error } = await sb.from('user_benefits').insert(row).select('*').single();
  if (error) {
    if (tableMissing(error.message)) throw new Error('Manca la tabella dei bonus: esegui lo script UTENTI_E_BONUS.sql su Supabase.');
    throw new Error('Salvataggio non riuscito: ' + error.message);
  }
  return mapBenefit(data);
}

export async function deleteBenefit(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non disponibile.');
  const { error } = await sb.from('user_benefits').delete().eq('id', id);
  if (error) throw new Error('Eliminazione non riuscita: ' + error.message);
}

/** Segna come usati i bonus/sconti "una volta sola" applicati a un ordine. */
export async function consumeBenefits(ids: string[], orderId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb || !ids.length) return;
  await Promise.all(ids.map((id) => sb.rpc('use_benefit', { p_id: id, p_order: orderId }).then(() => undefined, () => undefined)));
}

/** Bonus e sconti validi del cliente loggato (si aggiorna quando cambia utente). */
export function useMyBenefits(user: UserProfile | null): Benefit[] {
  const [list, setList] = useState<Benefit[]>([]);
  const isCustomer = !!user && user.role !== 'superadmin' && user.role !== 'admin';
  useEffect(() => {
    let alive = true;
    if (!isCustomer) {
      setList([]);
      return;
    }
    listBenefits()
      .then((all) => alive && setList(all.filter((b) => b.userId === user!.id && benefitActive(b))))
      .catch(() => alive && setList([]));
    return () => {
      alive = false;
    };
  }, [user?.id, isCustomer]);
  return list;
}

export interface AppliedDiscount {
  /** sconto % applicato (il migliore valido) */
  percent: number;
  percentAmount: number;
  bonusAmount: number;
  total: number;
  label: string;
  /** id dei vantaggi "una volta sola" da segnare come usati dopo l'invio */
  consumeIds: string[];
}

/** Calcola sconto % e bonus € sul totale dei prodotti (IVA e consegna escluse). */
export function applyBenefits(goods: number, benefits: Benefit[]): AppliedDiscount {
  const none: AppliedDiscount = { percent: 0, percentAmount: 0, bonusAmount: 0, total: 0, label: '', consumeIds: [] };
  if (!(goods > 0) || !benefits.length) return none;
  const sconti = benefits.filter((b) => b.kind === 'sconto' && b.percent > 0);
  const best = sconti.sort((a, b) => b.percent - a.percent)[0];
  const percentAmount = best ? Math.round(goods * best.percent) / 100 : 0;
  const left = Math.max(0, goods - percentAmount);
  const bonuses = benefits.filter((b) => b.kind === 'bonus' && b.amount > 0);
  const bonusAmount = Math.min(left, bonuses.reduce((s, b) => s + b.amount, 0));
  const total = Math.round((percentAmount + bonusAmount) * 100) / 100;
  const parts = [best ? `sconto ${String(best.percent).replace('.', ',')}%` : '', bonusAmount > 0 ? `bonus ${eur(bonusAmount)}` : ''].filter(Boolean);
  return {
    percent: best?.percent || 0,
    percentAmount,
    bonusAmount,
    total,
    label: parts.length ? 'Riservato a te: ' + parts.join(' + ') : '',
    consumeIds: [...(best && best.once ? [best.id] : []), ...(bonusAmount > 0 ? bonuses.map((b) => b.id) : [])],
  };
}
