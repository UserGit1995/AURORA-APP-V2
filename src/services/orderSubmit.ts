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
 * Vercel e recapita l'email a gruppo.aurora.ordini@gmail.com.
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

export const SHOP_EMAIL = 'gruppo.aurora.ordini@gmail.com';

const eur = (n: number) => '€ ' + (Number(n) || 0).toFixed(2).replace('.', ',');

/** Riepilogo dell'ordine in semplice testo (per email, copia/incolla, ecc.) */
export function orderToPlainText(order: Order, maxItems = 1000): string {
  const a = order.shippingAddress || ({} as Order['shippingAddress']);
  const lines: string[] = [
    `ORDINE ${order.id}`,
    '',
    `Cliente: ${a.companyName || a.recipient || ''}`,
    a.companyName && a.recipient ? `Referente: ${a.recipient}` : '',
    a.email ? `Email: ${a.email}` : '',
    a.phone ? `Telefono: ${a.phone}` : '',
    a.vatNumber ? `P.IVA: ${a.vatNumber}` : '',
    a.fiscalCode ? `Codice fiscale: ${a.fiscalCode}` : '',
    a.deliveryOption === 'ritiro_sede'
      ? 'Consegna: ritiro in sede'
      : `Indirizzo: ${[a.street, [a.postalCode, a.city].filter(Boolean).join(' '), a.province].filter(Boolean).join(', ')}`,
    a.deliveryNotes ? `Note: ${a.deliveryNotes}` : '',
    '',
    'ARTICOLI:',
  ].filter((l, i, arr) => l !== '' || arr[i - 1] !== '');
  order.items.slice(0, maxItems).forEach((i) => {
    lines.push(`- ${i.productName}${i.code ? ` [${i.code}]` : ''} x${i.qty}  ${eur(i.price * i.qty)}`);
  });
  if (order.items.length > maxItems) lines.push(`... e altri ${order.items.length - maxItems} articoli`);
  lines.push('', `TOTALE: ${eur(order.total)}`, 'Pagamento alla consegna');
  return lines.join('\n');
}

/**
 * Link "mailto:" pronto per l'app email del cliente: ultima risorsa se l'invio
 * automatico non riesce, così NESSUN cliente (registrato o no) resta bloccato.
 * Le app email accettano link di lunghezza limitata: se l'ordine è lungo,
 * l'elenco articoli viene accorciato (il testo completo si può copiare).
 */
export function orderMailtoHref(order: Order): string {
  const a = order.shippingAddress;
  const subject = `Ordine ${order.id} - ${a?.companyName || a?.recipient || 'Cliente'}`;
  let n = order.items.length;
  let body = orderToPlainText(order, n);
  while (n > 1 && encodeURIComponent(body).length > 1600) {
    n = Math.max(1, Math.floor(n * 0.8));
    body = orderToPlainText(order, n) + '\n(elenco abbreviato: ordine completo da confermare)';
  }
  return `mailto:${SHOP_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
