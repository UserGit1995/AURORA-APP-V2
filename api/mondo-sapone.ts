/**
 * Funzione serverless Vercel: aggiornamento automatico dal fornitore Mondo Sapone
 * (portale Yollgo, negozio 1270).
 *
 * Cosa fa ogni giorno (cron di Vercel, vedi vercel.json) e quando premi "Aggiorna ora":
 *   * legge tutto il catalogo di Mondo Sapone
 *   * prezzi: prezzo Mondo Sapone + 30% (i prodotti in volantino non vengono toccati)
 *   * prodotti tolti da Mondo Sapone -> "Non disponibile" (non vengono cancellati)
 *   * prodotti tornati -> di nuovo disponibili
 *   * prodotti nuovi -> lista "Nuovi dal fornitore" nel pannello, da approvare
 *   * riepilogo su WhatsApp (CallMeBot) ed email, solo se è cambiato qualcosa
 *
 * NON salva la password di Yollgo: l'accesso si fa dal pannello e qui arriva solo il
 * "pass" (token) che Yollgo rilascia. Quando Yollgo lo fa scadere arriva un avviso.
 *
 * Serve: SUPABASE_SERVICE_ROLE_KEY (già presente) e lo script supabase/mondo_sapone.sql.
 * Riepiloghi: CALLMEBOT_APIKEY e GMAIL_USER + GMAIL_APP_PASSWORD (già presenti).
 * Facoltativa: CRON_SECRET (se c'è, il controllo automatico parte solo dal cron di Vercel).
 */
import crypto from 'node:crypto';

const SHOP = '1270';
const YOLLGO = 'https://ssl.freex.es';
const IMG = 'https://img-eu-2.freex.es/img';
const RICARICO = 1.3;
const DEFAULT_TO = 'gruppo.aurora.ordini@gmail.com';
const SUPABASE_FALLBACK_URL = 'https://hkpqvggvqzvpkzeqmtga.supabase.co';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// codici pubblici dell'app web di Yollgo (gli stessi che il loro sito usa nel browser)
const dec = (a: number[]) => a.map((c, i) => String.fromCharCode(c - (i % 10))).join('');
const Y_APPID = 'com.gl1721.FreeX.web';
const Y_APPKEY = dec([53, 72, 74, 105, 110, 121, 56, 60, 108, 60, 100, 80, 68, 108, 74, 58, 60, 104, 90, 60, 76, 55, 52, 87, 94, 117, 57, 95, 114, 64, 115, 87, 57, 112, 105, 54, 76, 97, 112, 80]);
const Y_SIGN = dec([50, 81, 54, 117, 110, 73, 59, 107, 78, 99, 72, 75, 50, 122, 83, 109, 123, 61, 57, 98, 66, 83, 58, 101, 101, 82, 61, 88, 117, 82, 65, 103, 69, 60, 73, 80, 116, 93, 86, 85]);
const Y_VER = '2.1.7';

const md5 = (s: string) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

// ---------------------------------------------------------------------------
// Yollgo
// ---------------------------------------------------------------------------
export interface YAuth { kehuId: string; token: string; udid: string }
export interface YItem {
  artId: string; usercode?: string; bianhao?: string; namees?: string; precio?: number;
  baozhuangshu?: number; zhuangxiangshu?: number; imageHash?: string; is_promote?: number | boolean;
  _cat: string;
}
export interface YCat { muluID: string; muluSubID: string; namees?: string }

/** Intestazioni firmate come fa il sito di Yollgo. GET: si firma il percorso; POST: il corpo JSON. */
export function yHeaders(a: YAuth, signed: string, h: (s: string) => string = md5): Record<string, string> {
  const ts = String(Date.now()).slice(0, 10);
  const nonce = crypto.randomUUID();
  const sign = `key=${Y_SIGN}&udid=${a.udid}&ver=${Y_VER}&timestamp=${ts}&nonce=${nonce}&kehuid=${a.kehuId}&data=${h(signed)}`;
  const out: Record<string, string> = {
    'fx-signature': h(sign),
    'fx-nonce': nonce,
    'fx-timestamp': ts,
    'Content-Type': 'application/json',
    'fx-appid': Y_APPID,
    'fx-appkey': Y_APPKEY,
    'fx-api': Y_VER,
    'fx-udid': a.udid,
    'fx-language': 'en',
  };
  if (a.kehuId && a.token) out.Authorization = 'Basic ' + Buffer.from(`${a.kehuId}:${a.token}`).toString('base64');
  return out;
}

class AuthError extends Error {}

export async function yCall(a: YAuth, path: string, body?: unknown): Promise<any> {
  const str = body === undefined ? path : JSON.stringify(body);
  let last: any = null;
  for (let tent = 0; tent < 3; tent++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(YOLLGO + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: yHeaders(a, str),
        body: body === undefined ? undefined : str,
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const j: any = await r.json();
      if (j?.code === 1000) return j;
      if (j?.code === 401 || j?.code === 403) throw new AuthError(String(j?.message || 'accesso scaduto'));
      last = new Error(`Yollgo ${j?.code}: ${String(j?.message || '').slice(0, 80)}`);
    } catch (e: any) {
      if (e instanceof AuthError) throw e;
      last = e;
    }
    await new Promise((ok) => setTimeout(ok, 600 * (tent + 1)));
  }
  throw last || new Error('Yollgo non risponde');
}

/** Tutto il catalogo di Mondo Sapone. complete=false se qualche categoria non ha risposto. */
export async function yCatalog(a: YAuth): Promise<{ items: YItem[]; cats: Map<string, string>; complete: boolean }> {
  const c = await yCall(a, `/api/v2/mulus/${SHOP}`);
  const list: YCat[] = Array.isArray(c?.mulu_lists) ? c.mulu_lists : [];
  if (!list.length) throw new Error('Yollgo: nessuna categoria');
  const topName = new Map(list.filter((x) => !x.muluSubID).map((x) => [x.muluID, String(x.namees || '')]));
  const withSub = new Set(list.filter((x) => x.muluSubID).map((x) => x.muluID));
  const jobs = list.filter((x) => x.muluSubID || !withSub.has(x.muluID));
  const cats = new Map<string, string>();
  for (const j of jobs) {
    const top = pulisci(topName.get(j.muluID) || '');
    const sub = j.muluSubID ? pulisci(String(j.namees || '')) : '';
    cats.set(`${j.muluID}_${j.muluSubID || ''}`, [top, sub].filter(Boolean).join(' › '));
  }
  const out = new Map<string, YItem>();
  let complete = true;
  let i = 0;
  const worker = async () => {
    while (i < jobs.length) {
      const j = jobs[i++];
      try {
        const r = await yCall(a, `/api/articulos/${SHOP}`, { shopid: SHOP, muluid: j.muluID, submuluid: j.muluSubID || '' });
        for (const it of (r.articulo_lists || []) as YItem[]) {
          if (it?.artId && !out.has(String(it.artId))) out.set(String(it.artId), { ...it, artId: String(it.artId), _cat: `${j.muluID}_${j.muluSubID || ''}` });
        }
      } catch (e) {
        if (e instanceof AuthError) throw e;
        complete = false;
      }
    }
  };
  await Promise.all(Array.from({ length: 12 }, worker));
  return { items: [...out.values()], cats, complete };
}

/** Nomi delle categorie di Yollgo: "0001..NATALE" -> "NATALE", toglie le scritte in cinese. */
function pulisci(s: string): string {
  return s
    .replace(/[　-鿿＀-￯]+/g, ' ')
    .replace(/^[0-9A-Z]{3,5}\.+/, '')
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9)]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Confronto (funzione pura: si prova anche senza rete)
// ---------------------------------------------------------------------------
export interface SiteProduct {
  id: string; name: string; sku: string | null; price: number; in_stock: boolean;
  extra_data: any; category_id: string | null; subcategory_id: string | null;
  fornitore_id: string | null; fornitore_assente: boolean;
}
export interface Op { id: string; op: 'collega' | 'prezzo' | 'assente' | 'torna'; fid?: string; price?: number }
export interface Change { id: string; nome: string; prima?: number; dopo?: number }
export interface Plan {
  ops: Op[];
  prezzi: Change[];
  /** cambi troppo grandi (più del 50% in su o in giù): non applicati, da controllare a mano */
  sospetti: Change[];
  assenti: Change[];
  tornati: Change[];
  inOfferta: number;
  collegatiOra: number;
  collegati: number;
  nuovi: { art: YItem; category_id: string | null; subcategory_id: string | null }[];
  daControllare: string[];
  bloccati: number;
  motivoBlocco: string;
}

export const prezzoSito = (precio: number) => +(precio * RICARICO).toFixed(2);
export const normNome = (s: string) =>
  String(s || '').toUpperCase().replace(/^\*+/, '').replace(/[^A-Z0-9]+/g, ' ').trim();
const isHoreca = (p: SiteProduct) => /^horeca/i.test(String(p.extra_data?.source || ''));
const isEan = (s: string) => /^\d{8,14}$/.test(s);

export function computePlan(site: SiteProduct[], items: YItem[], complete: boolean, ignorati: string[], totalePrima: number, fissi: string[] = []): Plan {
  const fissiSet = new Set(fissi);
  const byArt = new Map(items.map((y) => [y.artId, y]));
  const byEan = new Map<string, YItem>();
  const byName = new Map<string, YItem[]>();
  for (const y of items) {
    const e = String(y.usercode || '').trim();
    if (e) byEan.set(e, y);
    const n = normNome(String(y.namees || ''));
    if (n) byName.set(n, [...(byName.get(n) || []), y]);
  }
  const ops: Op[] = [];
  const plan: Plan = { ops, prezzi: [], assenti: [], tornati: [], sospetti: [], inOfferta: 0, collegatiOra: 0, collegati: 0, nuovi: [], daControllare: [], bloccati: 0, motivoBlocco: '' };
  const usati = new Set<string>();
  const linked: { p: SiteProduct; fid: string }[] = [];

  for (const p of site) {
    let fid = p.fornitore_id ? String(p.fornitore_id) : '';
    if (!fid && !isHoreca(p)) {
      const sku = String(p.sku || '').trim();
      let y: YItem | undefined = sku ? byEan.get(sku) : undefined;
      if (!y && (!sku || !isEan(sku))) {
        const c = byName.get(normNome(p.name));
        if (c && c.length === 1) y = c[0];
      }
      if (y) {
        fid = y.artId;
        ops.push({ id: p.id, op: 'collega', fid });
        plan.collegatiOra++;
      }
    }
    if (fid) linked.push({ p, fid });
    else if (!isHoreca(p) && !ignorati.includes(p.id)) plan.daControllare.push(p.id);
  }
  plan.collegati = linked.length;

  // protezione: se Mondo Sapone risponde a metà non si spegne niente
  const mancanti = linked.filter((l) => !byArt.has(l.fid) && !l.p.fornitore_assente).length;
  let bloccaAssenti = false;
  if (!complete) { bloccaAssenti = true; plan.motivoBlocco = 'Mondo Sapone non ha risposto per alcune categorie'; }
  else if (totalePrima > 0 && items.length < totalePrima * 0.7) { bloccaAssenti = true; plan.motivoBlocco = `Mondo Sapone mostra solo ${items.length} prodotti (prima ${totalePrima})`; }
  else if (linked.length > 50 && mancanti > linked.length * 0.2) { bloccaAssenti = true; plan.motivoBlocco = `${mancanti} prodotti spariti tutti insieme`; }

  for (const { p, fid } of linked) {
    usati.add(fid);
    const y = byArt.get(fid);
    if (!y) {
      if (p.fornitore_assente) continue;
      if (bloccaAssenti) { plan.bloccati++; continue; }
      ops.push({ id: p.id, op: 'assente' });
      plan.assenti.push({ id: p.id, nome: p.name });
      continue;
    }
    if (p.fornitore_assente) {
      ops.push({ id: p.id, op: 'torna' });
      plan.tornati.push({ id: p.id, nome: p.name });
    }
    const precio = Number(y.precio);
    if (!(precio > 0)) continue;
    const nuovo = prezzoSito(precio);
    // differenze di 1 centesimo: solo arrotondamenti, non si tocca niente
    if (Math.abs(Number(p.price) - nuovo) < 0.015) continue;
    if (p.extra_data?.originalPrice != null) { plan.inOfferta++; continue; } // in volantino: non si tocca
    if (fissiSet.has(p.id)) continue; // hai scelto di tenere il tuo prezzo
    const rapporto = Number(p.price) > 0 ? nuovo / Number(p.price) : 1;
    if (rapporto > 1.5 || rapporto < 0.67) { plan.sospetti.push({ id: p.id, nome: p.name, prima: Number(p.price), dopo: nuovo }); continue; }
    ops.push({ id: p.id, op: 'prezzo', price: nuovo });
    plan.prezzi.push({ id: p.id, nome: p.name, prima: Number(p.price), dopo: nuovo });
  }

  // categoria suggerita per i nuovi: quella dei prodotti già collegati della stessa categoria di Mondo Sapone
  const voti = new Map<string, Map<string, number>>();
  for (const { p, fid } of linked) {
    const y = byArt.get(fid);
    if (!y || !p.category_id) continue;
    for (const k of [y._cat, y._cat.split('_')[0] + '_*']) {
      const m = voti.get(k) || new Map<string, number>();
      const key = `${p.category_id}|${p.subcategory_id || ''}`;
      m.set(key, (m.get(key) || 0) + 1);
      voti.set(k, m);
    }
  }
  const migliore = (k: string) => {
    const m = voti.get(k);
    if (!m) return null;
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };
  for (const y of items) {
    if (usati.has(y.artId)) continue;
    const best = migliore(y._cat) || migliore(y._cat.split('_')[0] + '_*');
    const [cat, sub] = best ? best.split('|') : ['', ''];
    plan.nuovi.push({ art: y, category_id: cat || null, subcategory_id: sub || null });
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
function serviceHeaders(): Record<string, string> {
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return key.startsWith('eyJ') ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}
function supaUrl(): string {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_FALLBACK_URL).replace(/\/+$/, '');
}
async function rest(path: string, init: RequestInit = {}): Promise<any> {
  const r = await fetch(`${supaUrl()}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), 'Content-Type': 'application/json', ...(init.headers as Record<string, string> || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Database ${r.status}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

async function isAdminToken(token: string): Promise<boolean> {
  if (!token) return false;
  const u = await fetch(`${supaUrl()}/auth/v1/user`, { headers: { ...serviceHeaders(), Authorization: `Bearer ${token}` } });
  if (!u.ok) return false;
  const user = (await u.json()) as { id?: string };
  if (!user?.id || !UUID_RE.test(user.id)) return false;
  const rows = await rest(`user_roles?select=role&user_id=eq.${user.id}&role=eq.admin`).catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

interface SyncRow {
  kehu_id: string | null; token: string | null; udid: string | null; stato: string;
  collegato_il: string | null; ultimo_avvio: string | null; ultimo_ok: string | null; avvisato_il: string | null;
  risultato: any; da_controllare: string[]; ignorati: string[]; prezzi_fissi: string[]; totale_fornitore: number;
}
async function loadState(): Promise<SyncRow> {
  const rows = await rest('fornitore_sync?id=eq.1&select=*');
  if (!rows?.[0]) {
    await rest('fornitore_sync', { method: 'POST', body: JSON.stringify({ id: 1 }), headers: { Prefer: 'resolution=ignore-duplicates' } });
    return (await rest('fornitore_sync?id=eq.1&select=*'))[0];
  }
  return rows[0];
}
const saveState = (patch: Partial<SyncRow>) =>
  rest('fornitore_sync?id=eq.1', { method: 'PATCH', body: JSON.stringify(patch), headers: { Prefer: 'return=minimal' } });

async function loadSite(): Promise<SiteProduct[]> {
  const out: SiteProduct[] = [];
  for (let from = 0; from < 100000; from += 1000) {
    const rows = await rest(
      `products?select=id,name,sku,price,in_stock,extra_data,category_id,subcategory_id,fornitore_id,fornitore_assente&order=id&offset=${from}&limit=1000`
    );
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

async function applica(ops: Op[]): Promise<number> {
  let n = 0;
  for (let i = 0; i < ops.length; i += 1500) {
    n += Number(await rest('rpc/fornitore_applica', { method: 'POST', body: JSON.stringify({ p_rows: ops.slice(i, i + 1500) }) })) || 0;
  }
  return n;
}

const imgUrl = (y: YItem) => (y.imageHash ? `${IMG}/${SHOP}/${y.artId}/300x300/${y.imageHash}` : null);
const nomePulito = (s: string) => String(s || '').replace(/^\*+\s*/, '').trim();

async function saveNuovi(plan: Plan, cats: Map<string, string>, runAt: string): Promise<number> {
  const prima = new Set<string>(((await rest('fornitore_nuovi?select=art_id&limit=100000')) as { art_id: string }[]).map((r) => r.art_id));
  const rows = plan.nuovi.map(({ art: y, category_id, subcategory_id }) => ({
    art_id: y.artId,
    nome: nomePulito(String(y.namees || '')) || `Articolo ${y.artId}`,
    ean: String(y.usercode || '').trim() || null,
    prezzo_fornitore: Number(y.precio) || 0,
    confezione: Number(y.baozhuangshu) || null,
    categoria_fornitore: cats.get(y._cat) || null,
    category_id,
    subcategory_id,
    immagine: imgUrl(y),
    ultimo_visto: runAt,
  }));
  for (let i = 0; i < rows.length; i += 1000) {
    await rest('fornitore_nuovi?on_conflict=art_id', {
      method: 'POST',
      body: JSON.stringify(rows.slice(i, i + 1000)),
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    });
  }
  // quelli spariti di nuovo da Mondo Sapone prima di essere approvati: via dalla lista
  await rest(`fornitore_nuovi?stato=eq.nuovo&ultimo_visto=lt.${encodeURIComponent(runAt)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  return rows.filter((r) => !prima.has(r.art_id)).length;
}

// ---------------------------------------------------------------------------
// Avvisi (WhatsApp con CallMeBot, email con Gmail o Resend)
// ---------------------------------------------------------------------------
async function notifyWhatsApp(text: string): Promise<boolean> {
  if (!process.env.CALLMEBOT_APIKEY) return false;
  const phone = String(process.env.WHATSAPP_ADMIN_PHONE || '393456000865').replace(/[^0-9]/g, '');
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(text.slice(0, 1500))}&apikey=${encodeURIComponent(String(process.env.CALLMEBOT_APIKEY).trim())}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    const body = (await r.text()).slice(0, 300);
    return r.ok && !/error|invalid|not (been )?activated/i.test(body);
  } catch {
    return false;
  }
}

async function sendEmail(subject: string, html: string, text: string): Promise<boolean> {
  const to = process.env.ORDERS_TO_EMAIL || DEFAULT_TO;
  try {
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const nodemailer: any = (await import('nodemailer')).default;
      const user = process.env.GMAIL_USER as string;
      const tr = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass: String(process.env.GMAIL_APP_PASSWORD).replace(/\s+/g, '') } });
      await tr.sendMail({ from: `"Aurora Ordini" <${user}>`, to, subject, text, html });
      return true;
    }
    if (process.env.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.RESEND_FROM || 'Aurora Ordini <onboarding@resend.dev>', to: [to], subject, html, text }),
      });
      return r.ok;
    }
  } catch (e: any) {
    console.error('email riepilogo', e?.message || e);
  }
  return false;
}

const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const euro = (n?: number) => (n == null ? '' : `€ ${n.toFixed(2).replace('.', ',')}`);
const oggi = () => new Date().toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' });

export function riepilogo(r: any): { wa: string; subject: string; html: string; text: string } {
  const righe = [
    `Mondo Sapone – aggiornamento del ${oggi()}`,
    `• Prezzi cambiati: ${r.prezzi}`,
    `• Non più disponibili: ${r.assenti}`,
    `• Tornati disponibili: ${r.tornati}`,
    `• Nuovi da approvare: ${r.nuoviOggi} (in lista ${r.nuoviTotale})`,
  ];
  if (r.sospetti) righe.push(`⚠️ ${r.sospetti} prezzi cambiati di molto: NON applicati, controllali nel pannello`);
  if (r.bloccati) righe.push(`⚠️ ${r.bloccati} prodotti NON spenti per sicurezza: ${r.motivoBlocco}`);
  righe.push('', 'Pannello → Catalogo → Mondo Sapone');
  const lista = (t: string, l: Change[], prezzi = false) =>
    l.length
      ? `<h3 style="margin:18px 0 6px;font:600 15px Arial">${t} (${l.length})</h3><table style="border-collapse:collapse;font:13px Arial">${l
          .slice(0, 150)
          .map((c) => `<tr><td style="padding:3px 10px 3px 0">${esc(c.nome)}</td>${prezzi ? `<td style="padding:3px 8px;color:#777;text-decoration:line-through">${euro(c.prima)}</td><td style="padding:3px 0;font-weight:600">${euro(c.dopo)}</td>` : ''}</tr>`)
          .join('')}</table>${l.length > 150 ? `<p style="font:12px Arial;color:#777">…e altri ${l.length - 150}</p>` : ''}`
      : '';
  const html = `<div style="font:14px Arial;color:#222"><h2 style="font:700 18px Arial">${esc(righe[0])}</h2><p>${righe.slice(1, 5).map(esc).join('<br>')}</p>${righe.slice(5, -2).map((x) => `<p style="color:#b45309">${esc(x)}</p>`).join('')}${lista('Prezzi cambiati', r.listaPrezzi || [], true)}${lista('Non più disponibili', r.listaAssenti || [])}${lista('Tornati disponibili', r.listaTornati || [])}${lista('Prezzi cambiati di molto (non applicati)', r.listaSospetti || [], true)}<p style="margin-top:18px;color:#777">I nuovi prodotti li trovi nel pannello: Catalogo → Mondo Sapone → Nuovi dal fornitore.</p></div>`;
  return { wa: righe.join('\n'), subject: `Mondo Sapone: ${r.prezzi} prezzi, ${r.assenti} non disponibili, ${r.nuoviOggi} nuovi`, html, text: righe.join('\n') };
}

// ---------------------------------------------------------------------------
// Aggiornamento completo
// ---------------------------------------------------------------------------
async function runSync(st: SyncRow, opts: { avvisa: boolean }): Promise<any> {
  const runAt = new Date().toISOString();
  await saveState({ ultimo_avvio: runAt });
  if (!st.token || !st.kehu_id) return { ok: false, error: 'scollegato' };
  const auth: YAuth = { kehuId: st.kehu_id, token: st.token, udid: st.udid || crypto.randomUUID() };
  let cat;
  try {
    cat = await yCatalog(auth);
  } catch (e: any) {
    if (e instanceof AuthError) {
      await saveState({ stato: 'scaduto' });
      const giaAvvisato = st.avvisato_il && Date.now() - new Date(st.avvisato_il).getTime() < 20 * 3600e3;
      if (opts.avvisa && !giaAvvisato) {
        const msg = `Mondo Sapone: Yollgo ti ha fatto uscire, quindi oggi i prezzi NON sono stati aggiornati.\nRientra una volta dal pannello: Catalogo → Mondo Sapone → Accedi.`;
        await Promise.all([notifyWhatsApp(msg), sendEmail('Mondo Sapone: devi rientrare in Yollgo', `<p style="font:14px Arial">${esc(msg).replace(/\n/g, '<br>')}</p>`, msg)]);
        await saveState({ avvisato_il: runAt });
      }
      return { ok: false, error: 'scaduto' };
    }
    throw e;
  }
  const site = await loadSite();
  const plan = computePlan(site, cat.items, cat.complete, Array.isArray(st.ignorati) ? st.ignorati : [], st.totale_fornitore || 0, Array.isArray(st.prezzi_fissi) ? st.prezzi_fissi : []);
  await applica(plan.ops);
  const nuoviOggi = await saveNuovi(plan, cat.cats, runAt);
  const r = {
    quando: runAt,
    totaleFornitore: cat.items.length,
    collegati: plan.collegati,
    collegatiOra: plan.collegatiOra,
    prezzi: plan.prezzi.length,
    assenti: plan.assenti.length,
    tornati: plan.tornati.length,
    sospetti: plan.sospetti.length,
    inOfferta: plan.inOfferta,
    bloccati: plan.bloccati,
    motivoBlocco: plan.motivoBlocco,
    nuoviOggi,
    nuoviTotale: plan.nuovi.length,
    daControllare: plan.daControllare.length,
    listaPrezzi: plan.prezzi.slice(0, 300),
    listaAssenti: plan.assenti.slice(0, 300),
    listaTornati: plan.tornati.slice(0, 300),
    listaSospetti: plan.sospetti.slice(0, 300),
  };
  await saveState({
    stato: 'collegato',
    udid: auth.udid,
    ultimo_ok: runAt,
    risultato: r,
    da_controllare: plan.daControllare,
    totale_fornitore: cat.complete ? cat.items.length : st.totale_fornitore,
  });
  let avvisi = { whatsapp: false, email: false };
  const qualcosa = r.prezzi || r.assenti || r.tornati || r.nuoviOggi || r.bloccati || r.sospetti;
  if (opts.avvisa && qualcosa) {
    const m = riepilogo(r);
    const [w, e] = await Promise.all([notifyWhatsApp(m.wa), sendEmail(m.subject, m.html, m.text)]);
    avvisi = { whatsapp: w, email: e };
  }
  return { ok: true, risultato: r, avvisi };
}

function statoPubblico(st: SyncRow) {
  return {
    collegato: !!st.token,
    stato: st.stato,
    collegatoIl: st.collegato_il,
    ultimoAvvio: st.ultimo_avvio,
    ultimoOk: st.ultimo_ok,
    risultato: st.risultato || {},
    daControllare: st.da_controllare || [],
    ignorati: st.ignorati || [],
    prezziFissi: st.prezzi_fissi || [],
  };
}

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ids = (v: unknown, re: RegExp) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && re.test(x)).slice(0, 500) : []) as string[];

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ ok: false, error: 'Manca SUPABASE_SERVICE_ROLE_KEY su Vercel' });
    return;
  }
  try {
    // controllo automatico giornaliero (cron di Vercel)
    if (req.method === 'GET') {
      const secret = process.env.CRON_SECRET;
      if (secret && req.headers?.authorization !== `Bearer ${secret}`) {
        res.status(401).json({ ok: false });
        return;
      }
      const st = await loadState();
      if (st.ultimo_avvio && Date.now() - new Date(st.ultimo_avvio).getTime() < 6 * 3600e3) {
        res.status(200).json({ ok: true, saltato: 'già fatto da poco' });
        return;
      }
      const out = await runSync(st, { avvisa: true });
      res.status(200).json({ ok: out.ok, error: out.error, prezzi: out.risultato?.prezzi });
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Metodo non consentito' });
      return;
    }
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    if (!(await isAdminToken(str(body?.accessToken, 4000)))) {
      res.status(401).json({ ok: false, error: 'Solo per l\'amministratore' });
      return;
    }
    const action = str(body.action, 30);
    const st = await loadState();

    if (action === 'stato') {
      const nuovi = await rest('fornitore_nuovi?select=*&stato=in.(nuovo,scartato)&order=visto_il.desc,nome.asc&limit=20000');
      res.status(200).json({ ok: true, ...statoPubblico(st), nuovi });
      return;
    }

    if (action === 'collega') {
      const kehuId = str(body.kehuId, 40);
      const token = str(body.token, 400);
      if (!/^\d{3,20}$/.test(kehuId) || token.length < 8) {
        res.status(400).json({ ok: false, error: 'Dati di accesso non validi' });
        return;
      }
      const udid = UUID_RE.test(str(body.udid, 40)) ? str(body.udid, 40) : st.udid || crypto.randomUUID();
      try {
        await yCall({ kehuId, token, udid }, `/api/v2/mulus/${SHOP}`);
      } catch (e: any) {
        res.status(400).json({ ok: false, error: e instanceof AuthError ? 'Yollgo non ha accettato l\'accesso' : 'Yollgo non risponde, riprova' });
        return;
      }
      await saveState({ kehu_id: kehuId, token, udid, stato: 'collegato', collegato_il: new Date().toISOString(), avvisato_il: null });
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'scollega') {
      await saveState({ token: null, kehu_id: null, stato: 'scollegato' });
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'aggiorna') {
      const out = await runSync(st, { avvisa: body.avvisa === true });
      const now = await loadState();
      res.status(200).json({ ...out, ...statoPubblico(now) });
      return;
    }

    if (action === 'aggiungi') {
      const arts = ids(body.artIds, /^\d{1,20}$/);
      const scelte = (body.categorie && typeof body.categorie === 'object') ? body.categorie : {};
      if (!arts.length) {
        res.status(400).json({ ok: false, error: 'Nessun prodotto' });
        return;
      }
      const rows = (await rest(`fornitore_nuovi?art_id=in.(${arts.join(',')})&select=*`)) as any[];
      const creati: any[] = [];
      for (const n of rows) {
        if (n.stato === 'aggiunto' && n.product_id) continue;
        const sc = scelte[n.art_id] || {};
        const cat = UUID_RE.test(String(sc.category_id || '')) ? sc.category_id : n.category_id;
        const sub = sc.subcategory_id === null ? null : UUID_RE.test(String(sc.subcategory_id || '')) ? sc.subcategory_id : (cat === n.category_id ? n.subcategory_id : null);
        const prod = {
          name: n.nome,
          description: null,
          category_id: cat || null,
          subcategory_id: sub || null,
          price: prezzoSito(Number(n.prezzo_fornitore) || 0),
          image_url: n.immagine,
          sku: n.ean,
          in_stock: true,
          is_featured: false,
          is_new: false,
          is_on_offer: false,
          active: true,
          fornitore_id: n.art_id,
          extra_data: { unit: 'pz', packageQty: String(n.confezione || 1), stock: 999, specs: { format: '' }, isEco: false, isMedicalDevice: false, isBestseller: false, source: 'mondo-sapone' },
        };
        const [p] = await rest('products?select=*,categories(name)', { method: 'POST', body: JSON.stringify(prod), headers: { Prefer: 'return=representation' } });
        await rest(`fornitore_nuovi?art_id=eq.${n.art_id}`, { method: 'PATCH', body: JSON.stringify({ stato: 'aggiunto', product_id: p.id }), headers: { Prefer: 'return=minimal' } });
        creati.push(p);
      }
      res.status(200).json({ ok: true, creati });
      return;
    }

    if (action === 'scarta' || action === 'rimetti') {
      const arts = ids(body.artIds, /^\d{1,20}$/);
      if (arts.length) {
        await rest(`fornitore_nuovi?art_id=in.(${arts.join(',')})&stato=neq.aggiunto`, {
          method: 'PATCH',
          body: JSON.stringify({ stato: action === 'scarta' ? 'scartato' : 'nuovo' }),
          headers: { Prefer: 'return=minimal' },
        });
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'prezzo') {
      const pid = ids([body.productId], UUID_RE)[0];
      const price = Math.round(Number(body.price) * 100) / 100;
      if (!pid || !(price > 0) || price > 100000) {
        res.status(400).json({ ok: false, error: 'Richiesta non valida' });
        return;
      }
      if (body.tieni === true) {
        // tiene il suo prezzo: Mondo Sapone non lo cambia più per questo prodotto
        const f = new Set(Array.isArray(st.prezzi_fissi) ? st.prezzi_fissi : []);
        f.add(pid);
        await saveState({ prezzi_fissi: [...f] });
      } else await applica([{ id: pid, op: 'prezzo', price }]);
      const r0 = st.risultato || {};
      if (Array.isArray(r0.listaSospetti)) {
        r0.listaSospetti = r0.listaSospetti.filter((c: Change) => c.id !== pid);
        r0.sospetti = r0.listaSospetti.length;
        await saveState({ risultato: r0 });
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'controllo') {
      const pid = ids(body.productIds, UUID_RE);
      const scelta = str(body.scelta, 20);
      if (!pid.length || !['assente', 'torna', 'ignora', 'riprendi'].includes(scelta)) {
        res.status(400).json({ ok: false, error: 'Richiesta non valida' });
        return;
      }
      if (scelta === 'assente' || scelta === 'torna') await applica(pid.map((id) => ({ id, op: scelta as 'assente' | 'torna' })));
      else {
        const ign = new Set(Array.isArray(st.ignorati) ? st.ignorati : []);
        pid.forEach((id) => (scelta === 'ignora' ? ign.add(id) : ign.delete(id)));
        await saveState({ ignorati: [...ign] });
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ ok: false, error: 'Azione sconosciuta' });
  } catch (e: any) {
    console.error('mondo-sapone', e?.message || e);
    const msg = String(e?.message || '');
    res.status(500).json({ ok: false, error: /fornitore_|42P01|42703|PGRST20/.test(msg) ? 'Manca lo script supabase/mondo_sapone.sql su Supabase' : 'Errore: ' + msg.slice(0, 160) });
  }
}
