import {
  createCanvas,
  pixelCtx,
  canvasToBlob,
  blobToCanvas,
  type Rect,
} from './canvasHelpers';

export interface CutoutProgress {
  stage: string;
  percent: number;
}

export interface CutoutResult {
  canvas: HTMLCanvasElement;
  /** true se la rete neurale non ha funzionato ed è stato usato il metodo semplice */
  usedFallback: boolean;
}

/**
 * Rimuove lo sfondo con la rete neurale (@imgly/background-removal, gira nel browser).
 * La libreria è caricata solo al primo utilizzo, così non pesa sul resto dell'app.
 * Se la rete neurale non parte (es. modello non raggiungibile), ripiega sul metodo
 * semplice "saliency matting", che funziona bene solo con sfondi uniformi.
 */
export async function performAIBackgroundRemoval(
  source: HTMLCanvasElement,
  onProgress?: (progress: CutoutProgress) => void
): Promise<CutoutResult> {
  const inputBlob = await canvasToBlob(source, 'image/png');

  onProgress?.({ stage: 'Inizializzazione rete neurale AI...', percent: 12 });

  try {
    const { removeBackground } = await import('@imgly/background-removal');

    const outputBlob = await removeBackground(inputBlob, {
      model: 'isnet_fp16',
      output: { format: 'image/png' },
      progress: (key: string, current: number, total: number) => {
        const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0.5;
        if (key.startsWith('fetch')) {
          onProgress?.({
            stage: 'Caricamento modello AI (solo la prima volta)...',
            percent: Math.round(15 + ratio * 45),
          });
        } else {
          onProgress?.({
            stage: 'Elaborazione bordi e dettagli...',
            percent: Math.round(60 + ratio * 35),
          });
        }
      },
    });

    onProgress?.({ stage: 'Finalizzazione trasparenza...', percent: 97 });

    const decoded = await blobToCanvas(outputBlob);
    // canvas di lavoro con lettura pixel ottimizzata (pennello, bacchetta, undo)
    const canvas = createCanvas(decoded.width, decoded.height);
    pixelCtx(canvas).drawImage(decoded, 0, 0);

    onProgress?.({ stage: 'Completato!', percent: 100 });
    return { canvas, usedFallback: false };
  } catch (error) {
    console.warn('Rete neurale non disponibile, uso il metodo semplice:', error);
    onProgress?.({ stage: 'Elaborazione con metodo semplice...', percent: 60 });

    const canvas = createCanvas(source.width, source.height);
    pixelCtx(canvas).drawImage(source, 0, 0);
    const result = advancedSaliencyMatting(canvas);

    onProgress?.({ stage: 'Completato!', percent: 100 });
    return { canvas: result, usedFallback: true };
  }
}

/**
 * Metodo semplice di rimozione sfondo: campiona i colori del bordo dell'immagine,
 * li considera "sfondo" e rende trasparente ciò che gli assomiglia.
 */
export function advancedSaliencyMatting(
  sourceCanvas: HTMLCanvasElement,
  edgeSensitivity = 30
): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const result = createCanvas(w, h);
  const ctx = pixelCtx(result);
  ctx.drawImage(sourceCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const perimeterPoints: { x: number; y: number }[] = [];
  const stepX = Math.max(1, Math.floor(w / 20));
  const stepY = Math.max(1, Math.floor(h / 20));

  for (let x = 0; x < w; x += stepX) {
    perimeterPoints.push({ x, y: 0 });
    perimeterPoints.push({ x, y: h - 1 });
  }
  for (let y = 0; y < h; y += stepY) {
    perimeterPoints.push({ x: 0, y });
    perimeterPoints.push({ x: w - 1, y });
  }

  const bgColors: [number, number, number][] = perimeterPoints.map((pt) => {
    const idx = (pt.y * w + pt.x) * 4;
    return [data[idx], data[idx + 1], data[idx + 2]];
  });

  const mask = new Uint8Array(w * h);
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      let minDiff = 999999;
      for (const [br, bg, bb] of bgColors) {
        const dr = r - br;
        const dg = g - bg;
        const db = b - bb;
        const dist = Math.sqrt(dr * dr * 2 + dg * dg * 4 + db * db * 3);
        if (dist < minDiff) minDiff = dist;
      }

      // il soggetto di solito è al centro
      const distFromCenter = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxR;
      const centerFactor = 1 - distFromCenter * 0.45;
      const effectiveThreshold = edgeSensitivity * centerFactor;

      if (minDiff < effectiveThreshold * 0.8) {
        mask[y * w + x] = 0;
      } else if (minDiff > effectiveThreshold * 1.4) {
        mask[y * w + x] = 255;
      } else {
        const t = (minDiff - effectiveThreshold * 0.8) / (effectiveThreshold * 0.6);
        mask[y * w + x] = Math.round(Math.min(255, Math.max(0, t * 255)));
      }
    }
  }

  // leggera sfumatura per eliminare il rumore a singolo pixel
  const smoothed = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += mask[(y + dy) * w + (x + dx)];
        }
      }
      smoothed[y * w + x] = Math.round(sum / 9);
    }
  }

  for (let i = 0; i < w * h; i++) {
    data[i * 4 + 3] = smoothed[i];
  }

  ctx.putImageData(imgData, 0, 0);
  return result;
}

/**
 * Rettangolo che contiene tutti i pixel visibili (non trasparenti), con un margine.
 * Restituisce null se l'immagine è completamente trasparente.
 */
export function getContentBounds(
  canvas: HTMLCanvasElement,
  padding = 24,
  alphaThreshold = 15
): Rect | null {
  const w = canvas.width;
  const h = canvas.height;
  const data = pixelCtx(canvas).getImageData(0, 0, w, h).data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (data[(row + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;

  const x0 = Math.max(0, minX - padding);
  const y0 = Math.max(0, minY - padding);
  const x1 = Math.min(w, maxX + 1 + padding);
  const y1 = Math.min(h, maxY + 1 + padding);

  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}

/**
 * Bacchetta magica: con un clic rimuove (o ripristina) i pixel di colore simile,
 * contigui oppure su tutta l'immagine. Il colore si confronta con la foto originale.
 */
export function magicWandSelectAndModify(
  targetCanvas: HTMLCanvasElement,
  originalCanvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  tolerance = 30,
  mode: 'erase' | 'restore' = 'erase',
  contiguous = true
): void {
  const w = targetCanvas.width;
  const h = targetCanvas.height;
  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return;

  const targetCtx = pixelCtx(targetCanvas);
  const targetData = targetCtx.getImageData(0, 0, w, h);
  const origData = pixelCtx(originalCanvas).getImageData(0, 0, w, h);

  const td = targetData.data;
  const od = origData.data;

  const startIdx = (startY * w + startX) * 4;
  const targetR = od[startIdx];
  const targetG = od[startIdx + 1];
  const targetB = od[startIdx + 2];
  const limit = tolerance * 2.5;

  const colorMatch = (idx: number) => {
    const dr = od[idx] - targetR;
    const dg = od[idx + 1] - targetG;
    const db = od[idx + 2] - targetB;
    return Math.sqrt(dr * dr * 2 + dg * dg * 4 + db * db * 3) <= limit;
  };

  const apply = (idx: number) => {
    if (mode === 'erase') {
      td[idx + 3] = 0;
    } else {
      td[idx] = od[idx];
      td[idx + 1] = od[idx + 1];
      td[idx + 2] = od[idx + 2];
      td[idx + 3] = 255;
    }
  };

  if (contiguous) {
    const visited = new Uint8Array(w * h);
    // pila di indici pixel (più veloce che creare array per ogni pixel)
    const stack = new Int32Array(w * h);
    let sp = 0;
    const start = startY * w + startX;
    stack[sp++] = start;
    visited[start] = 1;

    while (sp > 0) {
      const p = stack[--sp];
      const x = p % w;
      const y = (p - x) / w;
      apply(p * 4);

      if (x + 1 < w) {
        const n = p + 1;
        if (!visited[n] && colorMatch(n * 4)) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
      if (x > 0) {
        const n = p - 1;
        if (!visited[n] && colorMatch(n * 4)) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
      if (y + 1 < h) {
        const n = p + w;
        if (!visited[n] && colorMatch(n * 4)) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
      if (y > 0) {
        const n = p - w;
        if (!visited[n] && colorMatch(n * 4)) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
    }
  } else {
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      if (colorMatch(idx)) apply(idx);
    }
  }

  targetCtx.putImageData(targetData, 0, 0);
}
