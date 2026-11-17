/**
 * Funzione serverless Vercel: registra una visita al sito.
 *
 * Paese, regione e città li ricava Vercel dall'indirizzo IP (intestazioni x-vercel-ip-*),
 * quindi la posizione è APPROSSIMATIVA (zona del gestore internet, non l'indirizzo di casa).
 * La visita viene scritta nella tabella "visite" con la chiave SUPABASE_SERVICE_ROLE_KEY
 * (già presente su Vercel per le notifiche): dal browser nessuno può scrivere o leggere la tabella.
 */

const SUPABASE_FALLBACK_URL = 'https://hkpqvggvqzvpkzeqmtga.supabase.co';

// codice provincia (sigla) -> regione
const PROV: Record<string, string> = {
  AG:'Sicilia',CL:'Sicilia',CT:'Sicilia',EN:'Sicilia',ME:'Sicilia',PA:'Sicilia',RG:'Sicilia',SR:'Sicilia',TP:'Sicilia',
  AL:'Piemonte',AT:'Piemonte',BI:'Piemonte',CN:'Piemonte',NO:'Piemonte',TO:'Piemonte',VB:'Piemonte',VC:'Piemonte',
  AN:'Marche',AP:'Marche',FM:'Marche',MC:'Marche',PU:'Marche',
  AO:"Valle d'Aosta",
  AQ:'Abruzzo',CH:'Abruzzo',PE:'Abruzzo',TE:'Abruzzo',
  AR:'Toscana',FI:'Toscana',GR:'Toscana',LI:'Toscana',LU:'Toscana',MS:'Toscana',PI:'Toscana',PO:'Toscana',PT:'Toscana',SI:'Toscana',
  AV:'Campania',BN:'Campania',CE:'Campania',NA:'Campania',SA:'Campania',
  BA:'Puglia',BR:'Puglia',BT:'Puglia',FG:'Puglia',LE:'Puglia',TA:'Puglia',
  BG:'Lombardia',BS:'Lombardia',CO:'Lombardia',CR:'Lombardia',LC:'Lombardia',LO:'Lombardia',MB:'Lombardia',MI:'Lombardia',MN:'Lombardia',PV:'Lombardia',SO:'Lombardia',VA:'Lombardia',
  BL:'Veneto',PD:'Veneto',RO:'Veneto',TV:'Veneto',VE:'Veneto',VI:'Veneto',VR:'Veneto',
  BO:'Emilia-Romagna',FC:'Emilia-Romagna',FE:'Emilia-Romagna',MO:'Emilia-Romagna',PC:'Emilia-Romagna',PR:'Emilia-Romagna',RA:'Emilia-Romagna',RE:'Emilia-Romagna',RN:'Emilia-Romagna',
  BZ:'Trentino-Alto Adige',TN:'Trentino-Alto Adige',
  CA:'Sardegna',NU:'Sardegna',OR:'Sardegna',SS:'Sardegna',SU:'Sardegna',
  CB:'Molise',IS:'Molise',
  CS:'Calabria',CZ:'Calabria',KR:'Calabria',RC:'Calabria',VV:'Calabria',
  FR:'Lazio',LT:'Lazio',RI:'Lazio',RM:'Lazio',VT:'Lazio',
  GE:'Liguria',IM:'Liguria',SP:'Liguria',SV:'Liguria',
  GO:'Friuli-Venezia Giulia',PN:'Friuli-Venezia Giulia',TS:'Friuli-Venezia Giulia',UD:'Friuli-Venezia Giulia',
  MT:'Basilicata',PZ:'Basilicata',
  PG:'Umbria',TR:'Umbria',
};
// codici numerici ISO delle regioni italiane
const REG: Record<string, string> = {
  '21':'Piemonte','23':"Valle d'Aosta",'25':'Lombardia','32':'Trentino-Alto Adige','34':'Veneto','36':'Friuli-Venezia Giulia',
  '42':'Liguria','45':'Emilia-Romagna','52':'Toscana','55':'Umbria','57':'Marche','62':'Lazio','65':'Abruzzo','67':'Molise',
  '72':'Campania','75':'Puglia','77':'Basilicata','78':'Calabria','82':'Sicilia','88':'Sardegna',
};

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|lighthouse|headless|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|vercel/i;

const h = (req: any, k: string): string => {
  const v = req.headers?.[k];
  return String(Array.isArray(v) ? v[0] : v ?? '').trim();
};
const dec = (s: string) => {
  try { return decodeURIComponent(s); } catch { return s; }
};
const cut = (v: unknown, n: number) => String(v ?? '').replace(/[\u0000-\u001F]/g, '').trim().slice(0, n);

function paeseIt(code: string): string {
  if (!code) return '';
  try {
    return new Intl.DisplayNames(['it'], { type: 'region' }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

function dispositivo(ua: string): string {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'Tablet';
  if (/mobi|iphone|ipod|android/i.test(ua)) return 'Telefono';
  return 'Computer';
}
function browser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Altro';
}
function sistema(ua: string): string {
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os/i.test(ua)) return 'Mac';
  if (/linux/i.test(ua)) return 'Linux';
  return '';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }
  const ua = h(req, 'user-agent');
  if (!ua || BOT.test(ua)) {
    res.status(200).json({ ok: true, skip: 'bot' });
    return;
  }
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!key) {
    res.status(503).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY mancante' });
    return;
  }
  let body: any = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const ip = (h(req, 'x-real-ip') || h(req, 'x-forwarded-for').split(',')[0] || '').trim();
  const country = h(req, 'x-vercel-ip-country');
  const regCode = h(req, 'x-vercel-ip-country-region').toUpperCase();
  const regione = country === 'IT' ? (PROV[regCode] || REG[regCode] || regCode) : regCode;
  const provincia = country === 'IT' && PROV[regCode] ? regCode : '';

  const row = {
    visitatore: cut(body.visitatore, 64),
    ip: cut(ip, 64),
    paese: paeseIt(country),
    regione: cut(regione, 80),
    provincia,
    citta: cut(dec(h(req, 'x-vercel-ip-city')), 80),
    cap: cut(h(req, 'x-vercel-ip-postal-code'), 12),
    lat: Number(h(req, 'x-vercel-ip-latitude')) || null,
    lon: Number(h(req, 'x-vercel-ip-longitude')) || null,
    pagina: cut(body.pagina, 200),
    provenienza: cut(body.provenienza, 300),
    dispositivo: dispositivo(ua),
    browser: browser(ua),
    sistema: sistema(ua),
  };

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_FALLBACK_URL).replace(/\/+$/, '');
  try {
    const r = await fetch(`${url}/rest/v1/visite`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    res.status(r.ok ? 200 : 500).json({ ok: r.ok });
  } catch {
    res.status(500).json({ ok: false });
  }
}
