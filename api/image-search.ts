/**
 * Funzione serverless Vercel: cerca su Google Immagini (tramite Serper) le foto
 * candidate per un prodotto. Serve allo strumento "Trova immagini" del pannello admin.
 *
 * La chiave API di Serper NON è scritta nel codice (il sito è pubblico): la inserisce
 * l'admin nel pannello e viene inviata qui nell'intestazione "x-serper-key" a ogni ricerca.
 * Se qualcuno chiama questo indirizzo senza una chiave valida non ottiene nulla.
 *
 * Nessuna configurazione richiesta su Vercel.
 */

const SERPER_URL = 'https://google.serper.dev/images';

// ---- limitatore semplice (per istanza serverless "calda") -----------------
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 500) hits.clear();
  return arr.length > 400;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Metodo non consentito' });
    return;
  }

  const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) {
    res.status(429).json({ ok: false, error: 'Troppe richieste, riprova tra qualche minuto.' });
    return;
  }

  const key = String(req.headers?.['x-serper-key'] || '').trim();
  if (!key || key.length < 16 || key.length > 100 || !/^[\w-]+$/.test(key)) {
    res.status(401).json({ ok: false, error: 'Chiave Serper mancante o non valida.' });
    return;
  }

  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const q = String(body?.q ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!q) {
    res.status(400).json({ ok: false, error: 'Testo di ricerca mancante.' });
    return;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const resp = await fetch(SERPER_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, gl: 'it', hl: 'it', num: 10 }),
    });

    if (resp.status === 401 || resp.status === 403) {
      res.status(401).json({ ok: false, error: 'Chiave Serper non accettata: controlla di averla copiata per intero.' });
      return;
    }
    if (resp.status === 402 || resp.status === 429) {
      res.status(429).json({ ok: false, error: 'Le ricerche gratuite di Serper sono finite (o troppo veloci): riprova tra poco.' });
      return;
    }
    if (!resp.ok) {
      res.status(502).json({ ok: false, error: `Serper ha risposto con un errore (${resp.status}).` });
      return;
    }

    const data: any = await resp.json();
    const images = (Array.isArray(data?.images) ? data.images : [])
      .map((i: any) => ({
        imageUrl: String(i?.imageUrl || ''),
        thumbnailUrl: String(i?.thumbnailUrl || ''),
        title: String(i?.title || '').slice(0, 160),
        source: String(i?.source || '').slice(0, 80),
        width: Number(i?.imageWidth) || 0,
        height: Number(i?.imageHeight) || 0,
      }))
      .filter((i: any) => /^https?:\/\//i.test(i.imageUrl))
      .slice(0, 10);

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, images });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      res.status(504).json({ ok: false, error: 'La ricerca ha impiegato troppo tempo, riprova.' });
    } else {
      console.error('image-search error:', e);
      res.status(502).json({ ok: false, error: 'Ricerca non riuscita, riprova.' });
    }
  } finally {
    clearTimeout(timer);
  }
}
