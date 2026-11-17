/**
 * Funzione serverless Vercel: invia via email gli ordini (e i messaggi) dei
 * clienti a gruppo.aurora.ordini@gmail.com.
 *
 * Il destinatario è FISSATO qui sul server (non arriva mai dal browser), così
 * nessuno può usare questo endpoint per spedire email a indirizzi a caso.
 *
 * Configurazione (Vercel -> Settings -> Environment Variables), UNA delle due:
 *   A) Gmail (consigliato, gratis):  GMAIL_USER  +  GMAIL_APP_PASSWORD
 *   B) Resend:                       RESEND_API_KEY
 * Facoltativa: ORDERS_TO_EMAIL (default: gruppo.aurora.ordini@gmail.com)
 * Notifiche sul telefono per ogni ordine: VAPID_PRIVATE_KEY + SUPABASE_SERVICE_ROLE_KEY
 * Notifiche della chat (cliente -> admin e admin -> cliente, + email al cliente): stesse chiavi,
 * più lo script supabase/chat_notifiche.sql.
 * Richieste di lavori grafici (kind: 'design', pagina "Simone Aricò"): vanno all'indirizzo
 * scritto in DESIGN_TO_EMAIL (solo su Vercel, mai nel codice); se manca, a ORDERS_TO_EMAIL.
 *
 * Richieste di personalizzazione (kind: 'customization'): l'email di conferma al
 * cliente legge i dati dal database, quindi servono anche VITE_SUPABASE_URL e
 * VITE_SUPABASE_ANON_KEY (le stesse già usate dall'app) tra le variabili di Vercel.
 * Facoltativa: APP_URL (es. https://appaurorav2updated.vercel.app) per il link di
 * tracking nelle email; se assente si usa il dominio della richiesta.
 */

const DEFAULT_TO = 'gruppo.aurora.ordini@gmail.com';

// ---- limitatore molto semplice (per istanza serverless "calda") -----------
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 500) hits.clear();
  return arr.length > 20;
}

// ---- utilità ---------------------------------------------------------------
const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const str = (v: unknown, max = 300): string => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const eur = (n: number): string => '€ ' + n.toFixed(2).replace('.', ',');
const isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

interface CleanItem { name: string; code: string; pack: string; qty: number; price: number }

function cleanItems(raw: unknown): CleanItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 300).map((i: any) => ({
    name: str(i?.productName ?? i?.name, 200) || 'Articolo',
    code: str(i?.code, 60),
    pack: str(i?.packageQty, 60),
    qty: Math.max(1, Math.min(100000, Math.round(num(i?.qty ?? i?.quantity) || 1))),
    price: num(i?.price),
  }));
}

function row(label: string, value: string): string {
  if (!value) return '';
  return `<tr><td style="padding:4px 12px 4px 0;color:#64748b;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:4px 0;color:#0f172a"><b>${esc(value)}</b></td></tr>`;
}

// ---- costruzione email -----------------------------------------------------
function buildOrderEmail(body: any) {
  const o = body?.order || {};
  const a = o.shippingAddress || {};
  const items = cleanItems(o.items);
  if (items.length === 0) throw new Error('Ordine senza articoli');

  const orderId = str(o.id, 60) || 'ORDINE';
  const customer = str(a.companyName, 120) || str(a.recipient, 120) || 'Cliente';
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = num(o.total) || subtotal;
  const vat = num(o.vatAmount);
  const discount = num(o.discountAmount);
  const discountLabel = str(o.discountLabel, 120) || 'Sconto riservato al cliente';
  const shipping = num(o.shippingCost);
  const email = str(a.email, 120);
  const pickup = a.deliveryOption === 'ritiro_sede';
  const delivery = pickup ? 'Ritiro in sede' : 'Spedizione con corriere';
  const shippingText = pickup ? 'Ritiro in sede' : shipping > 0 ? eur(shipping) : 'Gratuita';
  const address = [str(a.street, 200), [str(a.postalCode, 12), str(a.city, 80), a.province ? `(${str(a.province, 6)})` : ''].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const source = body?.source === 'riordino-rapido' ? 'Riordino Rapido' : 'Carrello';

  const itemRows = items
    .map(
      (i) => `<tr>
<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${esc(i.name)}${i.code ? `<br><span style="color:#64748b;font-size:12px">Cod. ${esc(i.code)}</span>` : ''}</td>
<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${i.qty}${i.pack ? `<br><span style="color:#64748b;font-size:12px">${esc(i.pack)}</span>` : ''}</td>
<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${eur(i.price)}</td>
<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${eur(i.price * i.qty)}</td></tr>`
    )
    .join('');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:auto;color:#0f172a">
<h2 style="margin:0 0 4px">Nuovo ordine ${esc(orderId)}</h2>
<p style="margin:0 0 16px;color:#475569">Ricevuto da: ${esc(source)} &middot; ${esc(new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' }))}</p>
<h3 style="margin:16px 0 6px">Cliente</h3>
<table style="border-collapse:collapse;font-size:14px">
${row('Tipo', a.customerType === 'azienda' ? 'Azienda / Attività' : 'Privato')}
${row('Ragione sociale', str(a.companyName, 120))}
${row('Referente', str(a.recipient, 120))}
${row('Email', email)}
${row('Telefono', str(a.phone, 40))}
${row('P.IVA', str(a.vatNumber, 40))}
${row('Codice fiscale', str(a.fiscalCode, 40))}
${row('Codice SDI / PEC', str(a.sdiCode, 80))}
${row('Consegna', delivery)}
${row('Indirizzo', address)}
${row('Note consegna', str(a.deliveryNotes, 600))}
</table>
<h3 style="margin:20px 0 6px">Articoli</h3>
<table style="border-collapse:collapse;width:100%;font-size:14px">
<tr style="background:#f1f5f9"><th style="padding:6px 8px;text-align:left">Prodotto</th><th style="padding:6px 8px">Q.tà</th><th style="padding:6px 8px;text-align:right">Prezzo</th><th style="padding:6px 8px;text-align:right">Importo</th></tr>
${itemRows}
</table>
<table style="border-collapse:collapse;font-size:14px;margin:12px 0 0 auto">
<tr><td style="padding:3px 12px;color:#64748b">Imponibile</td><td style="padding:3px 0;text-align:right">${eur(subtotal)}</td></tr>
${discount ? `<tr><td style="padding:3px 12px;color:#b45309">${esc(discountLabel)}</td><td style="padding:3px 0;text-align:right;color:#b45309">- ${eur(discount)}</td></tr>` : ''}
${vat ? `<tr><td style="padding:3px 12px;color:#64748b">IVA</td><td style="padding:3px 0;text-align:right">${eur(vat)}</td></tr>` : ''}
<tr><td style="padding:3px 12px;color:#64748b">Consegna</td><td style="padding:3px 0;text-align:right">${esc(shippingText)}</td></tr>
<tr><td style="padding:6px 12px;font-weight:bold">TOTALE</td><td style="padding:6px 0;text-align:right;font-weight:bold;font-size:16px">${eur(total)}</td></tr>
</table>
<p style="margin-top:20px;color:#64748b;font-size:12px">Per rispondere al cliente premi "Rispondi": l'indirizzo di risposta è quello inserito dal cliente${email ? '' : ' (non indicato)'}.</p>
</div>`;

  const text = [
    `NUOVO ORDINE ${orderId}  (${source})`,
    '',
    `Cliente: ${customer}`,
    a.recipient ? `Referente: ${str(a.recipient, 120)}` : '',
    email ? `Email: ${email}` : '',
    a.phone ? `Telefono: ${str(a.phone, 40)}` : '',
    a.vatNumber ? `P.IVA: ${str(a.vatNumber, 40)}` : '',
    a.fiscalCode ? `Codice fiscale: ${str(a.fiscalCode, 40)}` : '',
    `Consegna: ${delivery}`,
    address ? `Indirizzo: ${address}` : '',
    a.deliveryNotes ? `Note: ${str(a.deliveryNotes, 600)}` : '',
    '',
    'ARTICOLI:',
    ...items.map((i) => `- ${i.name}${i.code ? ` [${i.code}]` : ''}  x${i.qty}  ${eur(i.price)}  = ${eur(i.price * i.qty)}`),
    '',
    `Imponibile: ${eur(subtotal)}`,
    discount ? `${discountLabel}: - ${eur(discount)}` : '',
    vat ? `IVA: ${eur(vat)}` : '',
    `Consegna: ${shippingText}`,
    `TOTALE: ${eur(total)}`,
  ]
    .filter((l) => l !== '')
    .join('\n');

  return {
    subject: `🛒 Nuovo ordine ${orderId} - ${customer} - ${eur(total)}`,
    html,
    text,
    replyTo: isEmail(email) ? email : '',
  };
}

function buildMessageEmail(body: any) {
  const kind = body?.kind === 'inquiry' ? 'Richiesta su ordine' : 'Messaggio dal sito';
  const name = str(body?.name, 120) || 'Cliente';
  const email = str(body?.email, 120);
  const phone = str(body?.phone, 40);
  const subject = str(body?.subject, 200) || kind;
  const message = str(body?.message, 5000);
  const orderRef = str(body?.orderId, 60);
  if (!message) throw new Error('Messaggio vuoto');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;color:#0f172a">
<h2 style="margin:0 0 12px">${esc(kind)}</h2>
<table style="border-collapse:collapse;font-size:14px">
${row('Oggetto', subject)}${row('Ordine', orderRef)}${row('Nome', name)}${row('Email', email)}${row('Telefono', phone)}
</table>
<p style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:14px">${esc(message)}</p>
</div>`;
  const text = [`${kind.toUpperCase()}`, `Oggetto: ${subject}`, orderRef ? `Ordine: ${orderRef}` : '', `Nome: ${name}`, email ? `Email: ${email}` : '', phone ? `Telefono: ${phone}` : '', '', message]
    .filter((l) => l !== '')
    .join('\n');
  return { subject: `✉️ ${kind}: ${subject}${orderRef ? ` (${orderRef})` : ''}`, html, text, replyTo: isEmail(email) ? email : '' };
}

// ---- richieste di personalizzazione ---------------------------------------
const PRODUCT_LABELS: Record<string, string> = {
  bicchieri: 'Bicchieri',
  tovagliette: 'Tovagliette',
  bustine: 'Bustine / Sacchetti',
  scatole: 'Scatole',
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Legge la richiesta dal database (funzione SQL get_customization_for_notification).
 * Il destinatario della conferma cliente arriva SEMPRE da qui, mai dal browser,
 * e la funzione risponde solo per 30 minuti dopo la creazione e solo con il token.
 */
async function loadCustomization(token: string): Promise<any | null> {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) throw new Error('SUPABASE_NOT_CONFIGURED');
  const r = await fetch(`${url}/rest/v1/rpc/get_customization_for_notification`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_access_token: token }),
  });
  if (!r.ok) throw new Error(`SUPABASE_${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

function baseUrl(req: any): string {
  if (process.env.APP_URL) return String(process.env.APP_URL).replace(/\/+$/, '');
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim();
  return host ? `https://${host}` : '';
}

function buildCustomizationEmails(c: any, trackingUrl: string): { admin: Mail; customer: Mail } {
  const product = PRODUCT_LABELS[String(c.product_type)] || str(c.product_type, 60);
  const colors = num(c.print_colors);
  const qty = num(c.quantity);
  const name = str(c.customer_name, 120) || 'Cliente';
  const company = str(c.customer_company, 120);
  const email = str(c.customer_email, 120);
  const phone = str(c.customer_phone, 40);
  const notes = str(c.notes, 3000);
  const logo = /^https:\/\//.test(String(c.logo_url)) ? String(c.logo_url) : '';
  const summary = `${product} · ${qty} pz · ${colors} ${colors === 1 ? 'colore' : 'colori'}`;

  const adminHtml = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;color:#0f172a">
<h2 style="margin:0 0 4px">Nuova richiesta di personalizzazione</h2>
<p style="margin:0 0 16px;color:#475569">${esc(new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' }))}</p>
<table style="border-collapse:collapse;font-size:14px">
${row('Prodotto', product)}${row('Quantità', `${qty} pz`)}${row('Colori di stampa', String(colors))}
${row('Nome', name)}${row('Azienda', company)}${row('Email', email)}${row('Telefono', phone)}
</table>
${logo ? `<p style="margin:16px 0 4px"><a href="${esc(logo)}">Apri il logo caricato</a></p><img src="${esc(logo)}" alt="Logo" style="max-height:140px;border:1px solid #e2e8f0;border-radius:8px;padding:6px">` : ''}
${notes ? `<h3 style="margin:18px 0 6px">Configurazione e note</h3><pre style="white-space:pre-wrap;font-family:inherit;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:0">${esc(notes)}</pre>` : ''}
<p style="margin-top:18px;color:#64748b;font-size:12px">Gestiscila dal Pannello Gestione &rarr; Personalizzazioni. Per rispondere al cliente premi "Rispondi".</p>
</div>`;
  const adminText = [
    'NUOVA RICHIESTA DI PERSONALIZZAZIONE',
    `Prodotto: ${summary}`,
    `Cliente: ${name}${company ? ` (${company})` : ''}`,
    email ? `Email: ${email}` : '',
    phone ? `Telefono: ${phone}` : '',
    logo ? `Logo: ${logo}` : '',
    '',
    notes,
  ].filter((l) => l !== '').join('\n');

  const customerHtml = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#0f172a">
<h2 style="margin:0 0 8px">Abbiamo ricevuto la tua richiesta</h2>
<p>Ciao ${esc(name)}, grazie per aver scelto Aurora. Un nostro grafico ti ricontatterà a breve con la bozza e il preventivo definitivo (la cifra mostrata sul sito è solo una stima).</p>
<p style="background:#f1f5f9;border-radius:8px;padding:10px 12px"><b>${esc(summary)}</b></p>
${trackingUrl ? `<p>Puoi controllare lo stato della richiesta in qualsiasi momento da qui:<br><a href="${esc(trackingUrl)}">${esc(trackingUrl)}</a></p>` : ''}
<p style="color:#64748b;font-size:12px">Se non hai inviato tu questa richiesta puoi ignorare questo messaggio.</p>
</div>`;
  const customerText = [
    `Ciao ${name}, abbiamo ricevuto la tua richiesta di personalizzazione.`,
    `Riepilogo: ${summary}`,
    'Un nostro grafico ti ricontatterà a breve con la bozza e il preventivo definitivo.',
    trackingUrl ? `Controlla lo stato qui: ${trackingUrl}` : '',
  ].filter((l) => l !== '').join('\n');

  return {
    admin: {
      subject: `🎨 Nuova personalizzazione - ${name} - ${summary}`,
      html: adminHtml,
      text: adminText,
      replyTo: isEmail(email) ? email : '',
    },
    customer: {
      subject: 'Abbiamo ricevuto la tua richiesta di personalizzazione - Aurora',
      html: customerHtml,
      text: customerText,
      replyTo: process.env.ORDERS_TO_EMAIL || DEFAULT_TO,
    },
  };
}

// ---- richiesta lavori grafici (pagina profilo Simone Aricò) ------------------
function buildDesignEmail(body: any) {
  const name = str(body?.name, 120);
  const contact = str(body?.contact, 120);
  const message = str(body?.message, 3000);
  const services = (Array.isArray(body?.services) ? body.services : []).map((x: unknown) => str(x, 60)).filter(Boolean).slice(0, 12);
  if (!name || !contact || message.length < 5) throw new Error('Messaggio vuoto');
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px">
<h2 style="margin:0 0 12px">Nuova richiesta di lavoro</h2>
<table style="border-collapse:collapse;font-size:14px">${row('Nome', name)}${row('Contatto', contact)}${row('Lavoro richiesto', services.join(', '))}</table>
<p style="margin:16px 0 6px;color:#64748b;font-size:13px">Descrizione</p>
<div style="white-space:pre-wrap;font-size:14px;color:#0f172a;background:#f1f5f9;border-radius:8px;padding:12px">${esc(message)}</div>
<p style="margin-top:16px;color:#94a3b8;font-size:12px">Inviata dalla pagina profilo nell'app Aurora.</p></div>`;
  const text = ['NUOVA RICHIESTA DI LAVORO', `Nome: ${name}`, `Contatto: ${contact}`, `Lavoro: ${services.join(', ')}`, '', message].join('\n');
  return { subject: `🎨 Richiesta lavoro: ${services[0] || 'grafica'} - ${name}`, html, text, replyTo: isEmail(contact) ? contact : '' };
}

// ---- notifiche push sul telefono (iPhone/Android) per ogni nuovo ordine --------
// Standard Web Push (VAPID + crittografia aes128gcm), senza librerie esterne.
// Su Vercel servono: VAPID_PRIVATE_KEY e SUPABASE_SERVICE_ROLE_KEY.
// La chiave pubblica qui sotto è la stessa scritta nell'app (src/services/push.ts).
const VAPID_PUBLIC_KEY = 'BI6U5HZj2mN0LJt9SKqyOdonqSUcUUlzKpLGJoeWzT6W-qRT78k9eHny3BiBpv0l9f-t6tS6tbioao13hzwCJ9Q';
const VAPID_SUBJECT = 'mailto:gruppo.aurora.ordini@gmail.com';
const SUPABASE_FALLBACK_URL = 'https://hkpqvggvqzvpkzeqmtga.supabase.co';

function pushConfigured(): boolean {
  return !!(process.env.VAPID_PRIVATE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function serviceHeaders(): Record<string, string> {
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  // le chiavi nuove "sb_secret_..." vanno solo in apikey; quelle classiche (JWT) anche in Authorization
  return key.startsWith('eyJ') ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

function supaUrl(): string {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_FALLBACK_URL).replace(/\/+$/, '');
}

interface PushSub { endpoint: string; p256dh: string; auth: string }

async function loadPushSubs(): Promise<PushSub[]> {
  const r = await fetch(`${supaUrl()}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth`, { headers: serviceHeaders() });
  if (!r.ok) throw new Error(`push_subscriptions ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as PushSub[];
}

async function deletePushSub(endpoint: string, table = 'push_subscriptions'): Promise<void> {
  await fetch(`${supaUrl()}/rest/v1/${table}?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
    headers: serviceHeaders(),
  }).catch(() => {});
}

async function webPushRequest(sub: PushSub, payload: string): Promise<Response> {
  const crypto: any = await import('node:crypto');
  const b64u = (b: Buffer) => b.toString('base64url');
  const fromB64u = (s: string) => Buffer.from(s, 'base64url');
  const hmac = (key: Buffer, data: Buffer) => crypto.createHmac('sha256', key).update(data).digest() as Buffer;

  // VAPID: firma JWT ES256 con la chiave privata del server
  const pub = fromB64u(VAPID_PUBLIC_KEY);
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: String(process.env.VAPID_PRIVATE_KEY).trim(),
    x: b64u(pub.subarray(1, 33)),
    y: b64u(pub.subarray(33, 65)),
  };
  const privateKey = crypto.createPrivateKey({ key: jwk, format: 'jwk' });
  const aud = new URL(sub.endpoint).origin;
  const header = b64u(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(Buffer.from(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: VAPID_SUBJECT })));
  const sig = crypto.sign('sha256', Buffer.from(`${header}.${claims}`), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  const jwt = `${header}.${claims}.${b64u(sig)}`;

  // Crittografia del contenuto (RFC 8291, aes128gcm)
  const uaPublic = fromB64u(sub.p256dh);
  const authSecret = fromB64u(sub.auth);
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const asPublic: Buffer = ecdh.getPublicKey();
  const shared: Buffer = ecdh.computeSecret(uaPublic);
  const prkKey = hmac(authSecret, shared);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]);
  const ikm = hmac(prkKey, keyInfo).subarray(0, 32);
  const salt: Buffer = crypto.randomBytes(16);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01', 'binary')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01', 'binary')).subarray(0, 12);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const enc = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  const body = Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, enc]);

  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      TTL: '86400',
      Urgency: 'high',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    },
    body,
  });
}

type PushNote = { title: string; body: string; url?: string; tag?: string };

/** Manda la notifica a una lista di telefoni; quelli disattivati vengono tolti dalla tabella. */
async function pushToSubs(subs: PushSub[], note: PushNote, table: string): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  const payload = JSON.stringify({ title: note.title, body: note.body, url: note.url || '/home', tag: note.tag });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        const r = await webPushRequest(sub, payload);
        if (r.status === 404 || r.status === 410) {
          await deletePushSub(sub.endpoint, table); // telefono disattivato o app rimossa
          failed++;
        } else if (!r.ok) {
          console.error('push: invio fallito', r.status, (await r.text()).slice(0, 200));
          failed++;
        } else sent++;
      } catch (e: any) {
        console.error('push: errore', e?.message || e);
        failed++;
      }
    })
  );
  return { sent, failed };
}

/** Manda la notifica a tutti i telefoni dell'admin. Non blocca mai l'ordine: errori solo nei log. */
async function notifyPhones(note: PushNote): Promise<{ sent: number; failed: number }> {
  if (!pushConfigured()) return { sent: 0, failed: 0 };
  try {
    return await pushToSubs(await loadPushSubs(), note, 'push_subscriptions');
  } catch (e: any) {
    console.error('push: impossibile leggere i telefoni registrati:', e?.message || e);
    return { sent: 0, failed: 0 };
  }
}

function orderNotification(body: any) {
  const o = body?.order || {};
  const a = o.shippingAddress || {};
  const items = cleanItems(o.items);
  const customer = str(a.companyName, 80) || str(a.recipient, 80) || 'Cliente';
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = num(o.total) || subtotal;
  const pieces = items.reduce((s, i) => s + i.qty, 0);
  const place = [str(a.city, 40), str(a.province, 4) ? `(${str(a.province, 4)})` : ''].filter(Boolean).join(' ');
  const pickup = a.deliveryOption === 'ritiro_sede';
  const names = items.slice(0, 3).map((i) => i.name.slice(0, 40)).join(', ') + (items.length > 3 ? ` e altri ${items.length - 3}` : '');
  // Come le notifiche delle app: titolo in grassetto + testo su più righe (icona Aurora a sinistra)
  return {
    title: `🛒 Nuovo ordine da ${customer} · ${eur(total)}`,
    body: [
      pickup ? 'Ritiro in sede' : place ? `Consegna a ${place}` : '',
      `${pieces} ${pieces === 1 ? 'pezzo' : 'pezzi'}: ${names}`,
      'Tocca per aprire Aurora e confermare l\'ordine.',
    ]
      .filter(Boolean)
      .join('\n'),
    url: '/home',
    tag: `ordine-${str(o.id, 60)}`,
  };
}

/** Verifica che il token appartenga a un admin (per la notifica di prova). */
async function isAdminToken(token: string): Promise<boolean> {
  if (!token) return false;
  const u = await fetch(`${supaUrl()}/auth/v1/user`, { headers: { ...serviceHeaders(), Authorization: `Bearer ${token}` } });
  if (!u.ok) return false;
  const user = (await u.json()) as { id?: string };
  if (!user?.id || !UUID_RE.test(user.id)) return false;
  const r = await fetch(`${supaUrl()}/rest/v1/user_roles?select=role&user_id=eq.${user.id}&role=eq.admin`, { headers: serviceHeaders() });
  if (!r.ok) return false;
  const rows = (await r.json()) as unknown[];
  return Array.isArray(rows) && rows.length > 0;
}


// ---- notifiche della chat clienti ---------------------------------------------
// chat-new:   il cliente ha scritto  -> notifica sui telefoni dell'admin
// chat-reply: l'admin ha risposto     -> notifica sui dispositivi del cliente + email (se l'ha lasciata)
// Tabelle: chat_conversations, chat_messages, chat_push_subs (script supabase/chat_notifiche.sql)

interface ChatConv { id: string; token: string; name: string; phone: string; email: string | null; last_email_at: string | null; last_message: string | null }

async function loadChatConv(id: string): Promise<ChatConv | null> {
  const r = await fetch(
    `${supaUrl()}/rest/v1/chat_conversations?id=eq.${id}&select=id,token,name,phone,email,last_email_at,last_message`,
    { headers: serviceHeaders() }
  );
  if (!r.ok) {
    // colonne email/last_email_at assenti: script chat_notifiche.sql non ancora eseguito
    const r2 = await fetch(`${supaUrl()}/rest/v1/chat_conversations?id=eq.${id}&select=id,token,name,phone,last_message`, { headers: serviceHeaders() });
    if (!r2.ok) throw new Error(`chat_conversations ${r2.status}`);
    const rows2 = (await r2.json()) as any[];
    return rows2[0] ? { ...rows2[0], email: null, last_email_at: null } : null;
  }
  const rows = (await r.json()) as ChatConv[];
  return rows[0] || null;
}

async function lastAdminMessage(id: string): Promise<string> {
  const r = await fetch(
    `${supaUrl()}/rest/v1/chat_messages?conversation_id=eq.${id}&sender=eq.admin&select=body&order=created_at.desc&limit=1`,
    { headers: serviceHeaders() }
  );
  if (!r.ok) return '';
  const rows = (await r.json()) as { body: string }[];
  return str(rows[0]?.body, 2000);
}

async function loadChatSubs(id: string): Promise<PushSub[]> {
  const r = await fetch(`${supaUrl()}/rest/v1/chat_push_subs?conversation_id=eq.${id}&select=endpoint,p256dh,auth`, { headers: serviceHeaders() });
  if (!r.ok) return []; // tabella non ancora creata
  return (await r.json()) as PushSub[];
}

const short = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);

// limite per conversazione (oltre al limite del database sui messaggi)
const chatHits = new Map<string, number[]>();
function chatLimited(key: string, max: number): boolean {
  const now = Date.now();
  const arr = (chatHits.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  chatHits.set(key, arr);
  if (chatHits.size > 1000) chatHits.clear();
  return arr.length > max;
}

function buildChatReplyEmail(c: ChatConv, reply: string, chatUrl: string): Mail {
  const name = str(c.name, 80) || 'Cliente';
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#0f172a">
<h2 style="margin:0 0 4px;color:#0b1a2e">Aurora ti ha risposto in chat</h2>
<p style="margin:0 0 16px;color:#64748b;font-size:14px">Ciao ${esc(name)}, abbiamo risposto al tuo messaggio:</p>
<div style="white-space:pre-wrap;font-size:15px;line-height:1.5;color:#0f172a;background:#eef6fc;border-left:4px solid #2c96d8;border-radius:8px;padding:14px 16px">${esc(reply)}</div>
${chatUrl ? `<p style="margin:22px 0"><a href="${esc(chatUrl)}" style="background:#2c96d8;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:24px;display:inline-block">Apri la chat</a></p>
<p style="margin:0;color:#64748b;font-size:12px">Apri il link dal telefono o dal computer con cui ci hai scritto per continuare la conversazione.</p>` : ''}
<p style="margin-top:22px;color:#94a3b8;font-size:12px">Aurora S.r.l.s · Ricevi questa email perché l'hai lasciata nella chat del sito. Per non riceverne più, cancellala dalla chat oppure scrivicelo.</p></div>`;
  const text = [`Ciao ${name}, Aurora ti ha risposto in chat:`, '', reply, '', chatUrl ? `Apri la chat: ${chatUrl}` : ''].join('\n');
  return { subject: 'Aurora ti ha risposto in chat', html, text, replyTo: '' };
}

/** Gestisce le notifiche della chat. Restituisce true se la richiesta era della chat. */
async function handleChatNotify(body: any, req: any, res: any): Promise<boolean> {
  if (body?.kind !== 'chat-new' && body?.kind !== 'chat-reply') return false;
  const id = str(body.id, 60);
  if (!UUID_RE.test(id)) {
    res.status(400).json({ ok: false, error: 'Chat non valida' });
    return true;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ ok: false, error: 'push_not_configured' });
    return true;
  }
  const conv = await loadChatConv(id);
  if (!conv) {
    res.status(404).json({ ok: false, error: 'not_found' });
    return true;
  }

  if (body.kind === 'chat-new') {
    // solo chi ha il codice segreto della chat può far partire l'avviso
    if (str(body.token, 60) !== conv.token) {
      res.status(403).json({ ok: false, error: 'forbidden' });
      return true;
    }
    if (chatLimited('new:' + id, 30)) {
      res.status(200).json({ ok: true, sent: 0, limited: true });
      return true;
    }
    const name = str(conv.name, 80) || 'Cliente';
    const result = await notifyPhones({
      title: `💬 ${name} ti ha scritto`,
      body: short(str(conv.last_message, 140) || 'Nuovo messaggio in chat', 140) + '\nTocca per rispondere.',
      url: '/admin-chat',
      tag: `chat-${id}`,
    });
    res.status(200).json({ ok: true, ...result });
    return true;
  }

  // chat-reply: solo l'amministratore
  if (!(await isAdminToken(str(body.accessToken, 4000)))) {
    res.status(403).json({ ok: false, error: 'forbidden' });
    return true;
  }
  if (chatLimited('reply:' + id, 60)) {
    res.status(200).json({ ok: true, sent: 0, emailed: false, limited: true });
    return true;
  }
  const reply = (await lastAdminMessage(id)) || str(conv.last_message, 2000);
  let sent = 0;
  let failed = 0;
  if (pushConfigured()) {
    const r = await pushToSubs(await loadChatSubs(id), {
      title: 'Aurora ti ha risposto',
      body: short(reply || 'Hai una nuova risposta in chat', 160) + '\nTocca per leggere.',
      url: '/chat',
      tag: 'aurora-chat',
    }, 'chat_push_subs');
    sent = r.sent;
    failed = r.failed;
  }
  // email: al massimo una ogni 10 minuti per chat (se scrivi più messaggi di fila arriva una sola email)
  let emailed = false;
  const email = str(conv.email, 120);
  const recent = conv.last_email_at && Date.now() - new Date(conv.last_email_at).getTime() < 10 * 60 * 1000;
  if (isEmail(email) && !recent && transportKind()) {
    try {
      const base = baseUrl(req);
      await deliver(buildChatReplyEmail(conv, reply, base ? `${base}/chat` : ''), email);
      emailed = true;
      await fetch(`${supaUrl()}/rest/v1/chat_conversations?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...serviceHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ last_email_at: new Date().toISOString() }),
      }).catch(() => {});
    } catch (e: any) {
      console.error('chat: email al cliente non inviata:', e?.message || e);
    }
  }
  res.status(200).json({ ok: true, sent, failed, emailed, hasEmail: isEmail(email), devices: sent + failed });
  return true;
}

// ---- invio -----------------------------------------------------------------
type Mail = { subject: string; html: string; text: string; replyTo: string };

function transportKind(): 'gmail' | 'resend' | null {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return 'gmail';
  if (process.env.RESEND_API_KEY) return 'resend';
  return null;
}

async function deliver(mail: Mail, to: string): Promise<void> {
  const kind = transportKind();
  if (kind === 'gmail') {
    const nodemailer: any = (await import('nodemailer')).default;
    const user = process.env.GMAIL_USER as string;
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass: String(process.env.GMAIL_APP_PASSWORD).replace(/\s+/g, '') },
    });
    await transporter.sendMail({
      from: `"Aurora Ordini" <${user}>`,
      to,
      replyTo: mail.replyTo || undefined,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return;
  }
  if (kind === 'resend') {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Aurora Ordini <onboarding@resend.dev>',
        to: [to],
        reply_to: mail.replyTo || undefined,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return;
  }
  throw new Error('NOT_CONFIGURED');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  // Controllo rapido di configurazione: apri /api/send-order nel browser.
  if (req.method === 'GET') {
    const kind = transportKind();
    res.status(200).json({
      ok: true,
      emailConfigured: !!kind,
      transport: kind,
      pushConfigured: pushConfigured(),
      recipient: process.env.ORDERS_TO_EMAIL || DEFAULT_TO,
    });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Metodo non consentito' });
    return;
  }

  try {
    // Notifiche della chat: limite proprio per conversazione, non tolgono "posti" agli ordini
    {
      let early = req.body;
      if (typeof early === 'string') {
        try { early = JSON.parse(early); } catch { early = null; }
      }
      if (early && (early.kind === 'chat-new' || early.kind === 'chat-reply')) {
        await handleChatNotify(early, req, res);
        return;
      }
    }

    const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
    if (rateLimited(ip)) {
      res.status(429).json({ ok: false, error: 'Troppe richieste, riprova tra qualche minuto.' });
      return;
    }

    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    if (!body || typeof body !== 'object') {
      res.status(400).json({ ok: false, error: 'Richiesta non valida' });
      return;
    }
    // Campo trappola per i bot: gli utenti veri non lo compilano mai.
    if (str(body.website, 50)) {
      res.status(200).json({ ok: true });
      return;
    }

    const to = process.env.ORDERS_TO_EMAIL || DEFAULT_TO;

    // Notifica di prova dal pannello admin ("Invia notifica di prova")
    if (body.kind === 'push-test') {
      if (!pushConfigured()) {
        res.status(503).json({ ok: false, error: 'push_not_configured' });
        return;
      }
      if (!(await isAdminToken(str(body.accessToken, 4000)))) {
        res.status(403).json({ ok: false, error: 'forbidden' });
        return;
      }
      const result = await notifyPhones({ title: '🔔 Notifiche attive', body: 'Da ora ricevi qui un avviso per ogni nuovo ordine e per ogni messaggio in chat.', tag: 'aurora-test' });
      res.status(200).json({ ok: true, ...result });
      return;
    }

    // Richiesta di personalizzazione: avviso al negozio + conferma al cliente.
    if (body.kind === 'customization') {
      const token = str(body.token, 60);
      if (!UUID_RE.test(token)) {
        res.status(400).json({ ok: false, error: 'Token non valido' });
        return;
      }
      if (!transportKind()) {
        console.error('send-order: nessun servizio email configurato');
        res.status(503).json({ ok: false, error: 'not_configured' });
        return;
      }
      const c = await loadCustomization(token);
      if (!c) {
        // richiesta inesistente oppure oltre la finestra di 30 minuti
        res.status(404).json({ ok: false, error: 'not_found' });
        return;
      }
      const base = baseUrl(req);
      const { admin, customer } = buildCustomizationEmails(c, base ? `${base}/personalizzazione/${token}` : '');
      await deliver(admin, to); // se questa fallisce: errore (502) e il client lo segnala
      let customerSent = false;
      if (isEmail(str(c.customer_email, 120))) {
        try {
          await deliver(customer, str(c.customer_email, 120));
          customerSent = true;
        } catch (e: any) {
          console.error('send-order: conferma cliente non inviata:', e?.message || e);
        }
      }
      res.status(200).json({ ok: true, customerSent });
      return;
    }

    if (body.kind === 'design') {
      const mail = buildDesignEmail(body);
      if (!transportKind()) {
        res.status(503).json({ ok: false, error: 'not_configured' });
        return;
      }
      await deliver(mail, process.env.DESIGN_TO_EMAIL || to);
      res.status(200).json({ ok: true });
      return;
    }

    const isMessage = body.kind === 'contact' || body.kind === 'inquiry';
    const mail = isMessage ? buildMessageEmail(body) : buildOrderEmail(body);

    // Nuovo ordine: notifica sul telefono, anche se l'email non è configurata o non parte
    const phoneNote = isMessage ? Promise.resolve(null) : notifyPhones(orderNotification(body));

    if (!transportKind()) {
      console.error('send-order: nessun servizio email configurato (GMAIL_USER/GMAIL_APP_PASSWORD o RESEND_API_KEY)');
      await phoneNote;
      res.status(503).json({ ok: false, error: 'not_configured' });
      return;
    }

    try {
      await deliver(mail, to);
    } finally {
      await phoneNote; // la funzione resta attiva finché la notifica non è partita
    }
    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('send-order errore:', err?.message || err);
    const validation = /Ordine senza articoli|Messaggio vuoto|JSON/.test(String(err?.message));
    if (/^SUPABASE_/.test(String(err?.message))) {
      res.status(503).json({ ok: false, error: 'supabase_not_configured' });
      return;
    }
    res.status(validation ? 400 : 502).json({ ok: false, error: validation ? String(err.message) : 'send_failed' });
  }
}
