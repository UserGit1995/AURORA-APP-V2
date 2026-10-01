/**
 * Utility canvas usate dallo strumento Remove BG (rimozione sfondo AI).
 * Portate dalla Pixlr Creative Suite: qui c'è solo ciò che serve al Remove BG.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Dimensione massima (lato lungo) con cui si lavora: oltre, la foto viene ridotta. */
export const MAX_WORK_DIM = 1600;

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/** Contesto 2D ottimizzato per letture/scritture frequenti dei pixel (pennello, bacchetta, undo). */
export function pixelCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // data: e blob: sono locali; per i link esterni serve CORS per poter leggere i pixel
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          "Impossibile leggere l'immagine. Se è un link di un altro sito, potrebbe bloccare l'accesso: scarica la foto e caricala con «Carica Foto»."
        )
      );
    img.src = src;
  });
}

/** Disegna l'immagine su un canvas, riducendola se supera maxDim sul lato lungo. */
export function imageToCanvas(img: HTMLImageElement, maxDim = MAX_WORK_DIM): HTMLCanvasElement {
  const nw = img.naturalWidth || img.width || 800;
  const nh = img.naturalHeight || img.height || 600;
  const scale = Math.min(1, maxDim / Math.max(nw, nh));
  const canvas = createCanvas(nw * scale, nh * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Riduce un canvas (senza mai ingrandirlo) in modo che il lato lungo sia ≤ maxDim. */
export function fitCanvas(source: HTMLCanvasElement, maxDim: number): HTMLCanvasElement {
  const longest = Math.max(source.width, source.height);
  if (longest <= maxDim) return source;
  const scale = maxDim / longest;
  const out = createCanvas(source.width * scale, source.height * scale);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

export function cropCanvas(source: HTMLCanvasElement, rect: Rect): HTMLCanvasElement {
  const out = createCanvas(rect.w, rect.h);
  out.getContext('2d')!.drawImage(source, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return out;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Esportazione immagine non riuscita.'))),
      type,
      quality
    );
  });
}

export async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(blob);
    const canvas = createCanvas(bmp.width, bmp.height);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0);
    if (typeof bmp.close === 'function') bmp.close();
    return canvas;
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    return imageToCanvas(img, Number.MAX_SAFE_INTEGER);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Nome file sicuro: minuscolo, senza accenti né simboli. */
export function slugify(input: string): string {
  const s = String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s.slice(0, 60) || 'immagine';
}
