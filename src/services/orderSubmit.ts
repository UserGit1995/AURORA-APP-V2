import { Order } from '../types';
import { insertSupabaseOrder } from './supabase';

export interface SubmitResult {
  ok: boolean; // true se l'ordine è arrivato ALMENO in un posto sicuro (email o database)
  emailSent: boolean;
  saved: boolean;
  error?: string;
}

interface ShopMailResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Invia una richiesta alla funzione serverless /api/send-order, che gira su
 * Vercel e recapita l'email a ordini.aurorasrls@gmail.com.
 * Il destinatario è deciso dal server, mai dal browser.
 */
export async function postToShop(payload: Record<string, unknown>): Promise<ShopMailResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch('/api/send-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (res.ok && json?.ok) return { ok: true, status: res.status };
    return { ok: false, status: res.status, error: json?.error || `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, error: e?.name === 'AbortError' ? 'timeout' : e?.message || 'rete' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Registra un ordine: lo manda via email al negozio E lo salva su Supabase.
 * Basta che UNO dei due riesca perché l'ordine non vada perso; se falliscono
 * entrambi restituisce ok:false così l'interfaccia può avvisare il cliente
 * (invece di mostrare un finto "Ordine inviato").
 */
export async function submitOrder(order: Order, source: 'carrello' | 'riordino-rapido'): Promise<SubmitResult> {
  const [mail, db] = await Promise.all([
    postToShop({ kind: 'order', source, order }),
    insertSupabaseOrder(order),
  ]);

  if (!mail.ok) console.warn('Invio email ordine non riuscito:', mail.error);
  if (!db.ok) console.warn('Salvataggio ordine su database non riuscito:', db.error);

  const ok = mail.ok || db.ok;
  return {
    ok,
    emailSent: mail.ok,
    saved: db.ok,
    error: ok ? undefined : mail.error || db.error || 'errore',
  };
}
