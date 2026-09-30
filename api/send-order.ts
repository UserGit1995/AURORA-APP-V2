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
  const shipping = num(o.shippingCost);
  const email = str(a.email, 120);
  const delivery = a.deliveryOption === 'ritiro_sede' ? 'Ritiro in sede' : 'Spedizione con corriere';
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
${vat ? `<tr><td style="padding:3px 12px;color:#64748b">IVA</td><td style="padding:3px 0;text-align:right">${eur(vat)}</td></tr>` : ''}
${shipping ? `<tr><td style="padding:3px 12px;color:#64748b">Spedizione</td><td style="padding:3px 0;text-align:right">${eur(shipping)}</td></tr>` : ''}
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
    vat ? `IVA: ${eur(vat)}` : '',
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
      recipient: process.env.ORDERS_TO_EMAIL || DEFAULT_TO,
    });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Metodo non consentito' });
    return;
  }

  try {
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

    const mail = body.kind === 'contact' || body.kind === 'inquiry' ? buildMessageEmail(body) : buildOrderEmail(body);

    if (!transportKind()) {
      console.error('send-order: nessun servizio email configurato (GMAIL_USER/GMAIL_APP_PASSWORD o RESEND_API_KEY)');
      res.status(503).json({ ok: false, error: 'not_configured' });
      return;
    }

    await deliver(mail, to);
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
