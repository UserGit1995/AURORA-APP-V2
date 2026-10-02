/**
 * Funzione serverless Vercel: "ponte" per leggere le foto dei prodotti ospitate su ALTRI siti.
 *
 * Perché serve: lo strumento Rimuovi sfondo deve leggere i pixel della foto, ma il browser lo
 * permette solo se il sito che la ospita lo consente (CORS). Molti siti non lo consentono:
 * la foto si VEDE nel catalogo ma non si può modificare. Questa funzione scarica la foto dal
 * server e la restituisce dallo stesso indirizzo dell'app, così il browser la accetta.
 *
 * Sicurezza (è un endpoint pubblico, quindi è volutamente restrittivo):
 *   - accetta solo indirizzi http/https e solo risposte di tipo immagine;
 *   - rifiuta indirizzi interni (localhost, reti private, metadati cloud);
 *   - massimo 4 reindirizzamenti, 8 secondi di attesa, ~4 MB (limite di Vercel);
 *   - limite di richieste per indirizzo IP.
 *
 * Nessuna configurazione richiesta.
 */

import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_BYTES = 4_400_000; // Vercel limita la risposta delle funzioni a ~4,5 MB
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 4;

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

class ProxyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** true se l'indirizzo IP è interno/riservato (non deve mai essere raggiunto da qui). */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local + metadati cloud
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast / riservati
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;
    if (v.startsWith('fc') || v.startsWith('fd')) return true; // unique local
    if (v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return true; // link-local
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  return true; // non riconosciuto: meglio rifiutare
}

/** Trasforma i link di condivisione Google Drive / Dropbox in link diretti all'immagine. */
export function toDirectUrl(raw: string): string {
  const url = raw.trim();
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/i);
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}`;
  if (/dropbox\.com/i.test(url)) {
    return url
      .replace(/^http:/i, 'https:')
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace(/([?&])dl=0&?/i, '$1')
      .replace(/[?&]$/, '');
  }
  return url;
}

async function assertPublicHost(hostname: string, allowPrivate: boolean): Promise<void> {
  if (allowPrivate) return;
  const host = hostname.replace(/^\[|\]$/g, '');
  if (host.toLowerCase() === 'localhost' || host.toLowerCase().endsWith('.localhost')) {
    throw new ProxyError(400, 'Indirizzo non consentito.');
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new ProxyError(400, 'Indirizzo non consentito.');
    return;
  }
  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new ProxyError(502, 'Il sito della foto non è raggiungibile (indirizzo inesistente).');
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new ProxyError(400, 'Indirizzo non consentito.');
  }
}

export interface RemoteImage {
  buffer: Buffer;
  contentType: string;
}

/**
 * Scarica un'immagine remota con tutte le protezioni sopra descritte.
 * `allowPrivate` serve solo ai test automatici: l'endpoint HTTP non lo imposta mai.
 */
export async function fetchRemoteImage(rawUrl: string, allowPrivate = false): Promise<RemoteImage> {
  let current: URL;
  try {
    current = new URL(toDirectUrl(rawUrl));
  } catch {
    throw new ProxyError(400, 'Indirizzo dell\'immagine non valido.');
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== 'http:' && current.protocol !== 'https:') {
      throw new ProxyError(400, 'Sono consentiti solo indirizzi http o https.');
    }
    await assertPublicHost(current.hostname, allowPrivate);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch(current.toString(), {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: {
          Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        },
      });
    } catch (e: any) {
      clearTimeout(timer);
      if (e?.name === 'AbortError') throw new ProxyError(504, 'Il sito della foto non risponde (tempo scaduto).');
      // http:// che non risponde: ritenta una volta in https://
      if (current.protocol === 'http:' && hop === 0) {
        current = new URL(current.toString().replace(/^http:/i, 'https:'));
        continue;
      }
      throw new ProxyError(502, 'Il sito della foto non è raggiungibile.');
    }

    if (resp.status >= 300 && resp.status < 400) {
      clearTimeout(timer);
      const loc = resp.headers.get('location');
      if (!loc) throw new ProxyError(502, 'Reindirizzamento non valido.');
      current = new URL(loc, current);
      continue;
    }

    if (!resp.ok) {
      clearTimeout(timer);
      if (resp.status === 404 || resp.status === 410) {
        throw new ProxyError(404, 'La foto non esiste più a questo indirizzo (errore 404): il link nel prodotto va aggiornato.');
      }
      if (resp.status === 401 || resp.status === 403) {
        throw new ProxyError(403, 'Il sito che ospita la foto ne vieta l\'uso. Scarica la foto e caricala con «Carica Foto».');
      }
      throw new ProxyError(502, `Il sito della foto ha risposto con un errore (${resp.status}).`);
    }

    const type = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!type.startsWith('image/')) {
      clearTimeout(timer);
      throw new ProxyError(415, 'Questo indirizzo non porta a un\'immagine (è una pagina web o un file diverso).');
    }
    if (type === 'image/svg+xml') {
      clearTimeout(timer);
      throw new ProxyError(415, 'Le immagini SVG non sono supportate.');
    }

    const declared = Number(resp.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) {
      clearTimeout(timer);
      throw new ProxyError(413, 'La foto è troppo pesante (oltre 4 MB). Riducila e caricala con «Carica Foto».');
    }

    try {
      const reader = resp.body?.getReader();
      if (!reader) throw new ProxyError(502, 'Risposta vuota dal sito della foto.');
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          ctrl.abort();
          throw new ProxyError(413, 'La foto è troppo pesante (oltre 4 MB). Riducila e caricala con «Carica Foto».');
        }
        chunks.push(value);
      }
      return { buffer: Buffer.concat(chunks), contentType: type };
    } catch (e: any) {
      if (e instanceof ProxyError) throw e;
      if (e?.name === 'AbortError') throw new ProxyError(504, 'Il sito della foto non risponde (tempo scaduto).');
      throw new ProxyError(502, 'Lettura della foto interrotta.');
    } finally {
      clearTimeout(timer);
    }
  }

  throw new ProxyError(502, 'Troppi reindirizzamenti.');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Metodo non consentito' });
    return;
  }

  const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) {
    res.status(429).json({ ok: false, error: 'Troppe richieste, riprova tra qualche minuto.' });
    return;
  }

  const raw = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  if (!raw || typeof raw !== 'string' || raw.length > 2000) {
    res.status(400).json({ ok: false, error: 'Indirizzo dell\'immagine mancante.' });
    return;
  }

  try {
    const img = await fetchRemoteImage(raw);
    res.setHeader('Content-Type', img.contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(img.buffer);
  } catch (e: any) {
    if (e instanceof ProxyError) {
      res.status(e.status).json({ ok: false, error: e.message });
    } else {
      console.error('image-proxy error:', e);
      res.status(502).json({ ok: false, error: 'Impossibile scaricare la foto.' });
    }
  }
}
