/**
 * Ingrandimento automatico delle foto prodotto "piccole".
 *
 * Alcune foto hanno il prodotto minuscolo in mezzo a tanto bianco: nelle schede
 * sembra piccolissimo. Per le immagini marcate con l'attributo `data-autozoom`
 * questo modulo guarda dove sta davvero il prodotto e, SOLO se occupa poco spazio,
 * mostra la foto ritagliata intorno al prodotto (con un po' di margine).
 *
 * NON modifica in alcun modo il database né le immagini salvate: agisce solo su
 * come la foto viene mostrata sullo schermo. Se una foto non si può analizzare
 * (sito che non lo permette, errore...) resta esattamente com'era.
 */

const SMALL_LIMIT = 0.72; // il prodotto occupa meno del 72% del lato più grande -> si ingrandisce
const MARGIN = 0.06; // margine bianco lasciato intorno al prodotto
const ANALYSIS_SIZE = 240; // lato massimo della copia usata per capire dove sta il prodotto
const MAX_OUT = 900; // lato massimo della foto ritagliata
const MAX_PARALLEL = 4;

type Result = string | null; // indirizzo della foto ritagliata, oppure null = lasciare l'originale
const cache = new Map<string, Promise<Result>>();
const made = new Set<string>(); // indirizzi creati da noi (per non rianalizzarli)

let running = 0;
const queue: Array<() => void> = [];
function schedule<T>(job: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      running++;
      job()
        .then(resolve, reject)
        .finally(() => {
          running--;
          const next = queue.shift();
          if (next) next();
        });
    };
    if (running < MAX_PARALLEL) run();
    else queue.push(run);
  });
}

function loadCors(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    const timer = setTimeout(() => reject(new Error('timeout')), 15000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('non leggibile'));
    };
    img.src = src;
  });
}

/** Rettangolo occupato dal prodotto (in frazioni 0..1), oppure null se la foto è vuota. */
function findProduct(img: HTMLImageElement) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  if (!W || !H) return null;
  const s = Math.min(1, ANALYSIS_SIZE / Math.max(W, H));
  const w = Math.max(1, Math.round(W * s));
  const h = Math.max(1, Math.round(H * s));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data; // lancia un errore se il sito non permette la lettura
  const cols = new Uint16Array(w);
  const rows = new Uint16Array(h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = d[i + 3];
      if (a < 24) continue; // trasparente = sfondo
      if (d[i] > 236 && d[i + 1] > 236 && d[i + 2] > 236) continue; // bianco = sfondo
      cols[x]++;
      rows[y]++;
    }
  }
  // ignora puntini isolati (rumore della foto)
  const minCol = Math.max(1, Math.round(h * 0.01));
  const minRow = Math.max(1, Math.round(w * 0.01));
  let x0 = 0;
  while (x0 < w && cols[x0] < minCol) x0++;
  let x1 = w - 1;
  while (x1 > x0 && cols[x1] < minCol) x1--;
  let y0 = 0;
  while (y0 < h && rows[y0] < minRow) y0++;
  let y1 = h - 1;
  while (y1 > y0 && rows[y1] < minRow) y1--;
  if (x0 >= w || y0 >= h || x1 - x0 < 3 || y1 - y0 < 3) return null;
  return { x: x0 / w, y: y0 / h, w: (x1 - x0 + 1) / w, h: (y1 - y0 + 1) / h };
}

async function analyse(src: string): Promise<Result> {
  try {
    const img = await loadCors(src);
    const box = findProduct(img);
    if (!box) return null;
    if (Math.max(box.w, box.h) >= SMALL_LIMIT) return null; // non è piccola: si lascia com'è
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const m = Math.max(box.w * W, box.h * H) * MARGIN;
    const sx = Math.max(0, box.x * W - m);
    const sy = Math.max(0, box.y * H - m);
    const sw = Math.min(W - sx, box.w * W + 2 * m);
    const sh = Math.min(H - sy, box.h * H + 2 * m);
    const k = Math.min(MAX_OUT / Math.max(sw, sh), 3);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(sw * k));
    c.height = Math.max(1, Math.round(sh * k));
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/png'));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    made.add(url);
    return url;
  } catch {
    return null; // foto non leggibile o sito che non lo permette: resta l'originale
  }
}

function handle(el: HTMLImageElement) {
  if (!el.hasAttribute('data-autozoom')) return;
  const src = el.getAttribute('src') || '';
  if (!src || src.startsWith('data:image/svg') || made.has(src)) return;
  let job = cache.get(src);
  if (!job) {
    job = schedule(() => analyse(src));
    cache.set(src, job);
  }
  job.then((url) => {
    // la scheda potrebbe aver cambiato prodotto nel frattempo
    if (url && el.isConnected && el.getAttribute('src') === src) el.setAttribute('src', url);
  });
}

export function installAutoZoom(): void {
  if (typeof document === 'undefined') return;
  document.addEventListener(
    'load',
    (ev) => {
      const el = ev.target as HTMLImageElement | null;
      if (el && el.tagName === 'IMG') handle(el);
    },
    true
  );
}
