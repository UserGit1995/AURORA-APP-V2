/**
 * Collegamento con il fornitore Mondo Sapone (portale Yollgo).
 *
 * L'accesso a Yollgo si fa da qui, nel browser dell'amministratore: telefono e password
 * vanno SOLO a Yollgo e non vengono salvati da nessuna parte. Al server (api/mondo-sapone.ts)
 * arriva soltanto il "pass" che Yollgo rilascia, per l'aggiornamento automatico di ogni giorno.
 */
import { getSupabase } from './supabase';

// ---- md5 (serve per la firma richiesta da Yollgo) ---------------------------
export function md5(input: string): string {
  const s = unescape(encodeURIComponent(input));
  const K: number[] = [];
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
  const n = ((s.length + 8) >> 6) + 1;
  const x = new Array(n * 16).fill(0);
  let i = 0;
  for (; i < s.length; i++) x[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
  x[i >> 2] |= 0x80 << ((i % 4) * 8);
  x[n * 16 - 2] = s.length * 8;
  const h = [1732584193, -271733879, -1732584194, 271733878];
  for (let o = 0; o < x.length; o += 16) {
    let [a, b, c, d] = h;
    for (i = 0; i < 64; i++) {
      const r = i >> 4;
      let f: number, g: number;
      if (r === 0) { f = (b & c) | (~b & d); g = i; }
      else if (r === 1) { f = (b & d) | (c & ~d); g = (5 * i + 1) % 16; }
      else if (r === 2) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const t = d;
      d = c;
      c = b;
      const y = (a + f + K[i] + x[o + g]) | 0;
      const sh = S[r * 4 + (i % 4)];
      b = (b + ((y << sh) | (y >>> (32 - sh)))) | 0;
      a = t;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
  }
  let out = '';
  for (i = 0; i < 4; i++) for (let j = 0; j < 4; j++) out += ((h[i] >>> (j * 8)) & 255).toString(16).padStart(2, '0');
  return out;
}

// codici pubblici dell'app web di Yollgo (gli stessi del loro sito)
const dec = (a: number[]) => a.map((c, i) => String.fromCharCode(c - (i % 10))).join('');
const Y_APPID = 'com.gl1721.FreeX.web';
const Y_APPKEY = dec([53, 72, 74, 105, 110, 121, 56, 60, 108, 60, 100, 80, 68, 108, 74, 58, 60, 104, 90, 60, 76, 55, 52, 87, 94, 117, 57, 95, 114, 64, 115, 87, 57, 112, 105, 54, 76, 97, 112, 80]);
const Y_SIGN = dec([50, 81, 54, 117, 110, 73, 59, 107, 78, 99, 72, 75, 50, 122, 83, 109, 123, 61, 57, 98, 66, 83, 58, 101, 101, 82, 61, 88, 117, 82, 65, 103, 69, 60, 73, 80, 116, 93, 86, 85]);
const Y_VER = '2.1.7';

function udid(): string {
  try {
    const v = localStorage.getItem('aurora_ms_udid');
    if (v) return v;
    const n = crypto.randomUUID();
    localStorage.setItem('aurora_ms_udid', n);
    return n;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Accesso a Yollgo con telefono e password (come sul loro sito).
 * Restituisce il "pass" da consegnare al server; la password non esce da questa funzione.
 */
export async function loginYollgo(prefisso: string, telefono: string, password: string): Promise<{ kehuId: string; token: string; udid: string }> {
  const u = udid();
  // descrizione del dispositivo, come la manda il sito di Yollgo (senza non accetta l'accesso)
  const ua = navigator.userAgent;
  const br = ua.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+.*$/);
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac/.test(ua) ? 'Mac' : 'Linux';
  let canvas = '';
  try {
    canvas = localStorage.getItem('aurora_ms_canvas') || '';
    if (!canvas) { canvas = crypto.randomUUID().replace(/-/g, '').slice(0, 8); localStorage.setItem('aurora_ms_canvas', canvas); }
  } catch { canvas = crypto.randomUUID().replace(/-/g, '').slice(0, 8); }
  const terminal = {
    width: String(window.innerWidth), height: String(window.innerHeight), udid: u, model: br ? br[0] : ua.slice(-60),
    identifier: Y_APPID, systemVersion: (ua.match(/(?:Windows NT|Android|OS) ([\d._]+)/)?.[1] || '').split(/[._]/)[0], version: Y_VER,
    name: os, canvasid: canvas, plugins: Array.from(navigator.plugins || []).map((p) => p.name),
  };
  const data = JSON.stringify({ name: telefono.replace(/\s+/g, ''), password: md5(md5(password)), code: prefisso.trim(), terminal });
  const ts = String(Date.now()).slice(0, 10);
  const nonce = crypto.randomUUID();
  const sign = `key=${Y_SIGN}&udid=${u}&ver=${Y_VER}&timestamp=${ts}&nonce=${nonce}&kehuid=&data=${md5(data)}`;
  let j: any;
  try {
    const r = await fetch('https://ssl.freex.es/api/login', {
      method: 'POST',
      headers: {
        'fx-signature': md5(sign), 'fx-nonce': nonce, 'fx-timestamp': ts, 'Content-Type': 'application/json',
        'fx-appid': Y_APPID, 'fx-appkey': Y_APPKEY, 'fx-api': Y_VER, 'fx-udid': u, 'fx-language': 'en',
      },
      body: data,
    });
    j = await r.json();
  } catch {
    throw new Error('Yollgo non risponde: controlla la connessione e riprova.');
  }
  if (j?.code === 3000) throw new Error('Yollgo chiede il codice di verifica. Entra una volta da app.yollgo.com su questo computer, poi riprova da qui.');
  if (j?.code === 1001) throw new Error('Telefono o password non corretti (sono gli stessi che usi su Yollgo).');
  if (j?.code !== 1000) throw new Error(j?.message ? `Yollgo: ${String(j.message).slice(0, 120)}` : 'Accesso non riuscito, riprova.');
  const user = j.user || j;
  const kehuId = String(user?.kehuId ?? user?.id ?? '');
  const token = String(user?.token ?? '');
  if (!kehuId || !token) throw new Error('Yollgo ha risposto in modo inatteso, riprova.');
  return { kehuId, token, udid: u };
}

// ---- server ---------------------------------------------------------------
export interface MsChange { id: string; nome: string; prima?: number; dopo?: number }
export interface MsRisultato {
  quando?: string; totaleFornitore?: number; collegati?: number; collegatiOra?: number;
  prezzi?: number; assenti?: number; tornati?: number; sospetti?: number; inOfferta?: number;
  bloccati?: number; motivoBlocco?: string; nuoviOggi?: number; nuoviTotale?: number; daControllare?: number;
  listaPrezzi?: MsChange[]; listaAssenti?: MsChange[]; listaTornati?: MsChange[]; listaSospetti?: MsChange[];
}
export interface MsNuovo {
  art_id: string; nome: string; ean: string | null; prezzo_fornitore: number; confezione: number | null;
  categoria_fornitore: string | null; category_id: string | null; subcategory_id: string | null;
  immagine: string | null; stato: 'nuovo' | 'scartato' | 'aggiunto'; visto_il: string;
}
export interface MsStato {
  collegato: boolean; stato: string; collegatoIl: string | null; ultimoAvvio: string | null; ultimoOk: string | null;
  risultato: MsRisultato; daControllare: string[]; ignorati: string[]; prezziFissi: string[]; nuovi: MsNuovo[];
}

export async function msApi<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const sb = getSupabase();
  const accessToken = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
  let r: Response;
  try {
    r = await fetch('/api/mondo-sapone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, accessToken: accessToken || '', ...payload }),
    });
  } catch {
    throw new Error('Connessione assente, riprova.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) {
    if (j.error === 'scollegato') throw new Error('Prima accedi a Mondo Sapone.');
    if (j.error === 'scaduto') throw new Error('Yollgo ti ha fatto uscire: accedi di nuovo.');
    throw new Error(j.error || `Errore ${r.status}`);
  }
  return j as T;
}

export const prezzoSito = (precio: number) => +(precio * 1.3).toFixed(2);
