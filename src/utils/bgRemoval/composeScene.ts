import { createCanvas } from './canvasHelpers';

export type BackdropType = 'transparent' | 'color' | 'gradient' | 'blur';

export interface SceneOptions {
  backdropType: BackdropType;
  /** colore esadecimale oppure 'transparent' */
  color: string;
  gradientId: string;
  blurAmount: number;
  shadow: boolean;
  stroke: boolean;
  strokeColor: string;
  strokeWidth: number;
}

export const DEFAULT_SCENE: SceneOptions = {
  backdropType: 'transparent',
  color: '#ffffff',
  gradientId: 'tramonto',
  blurAmount: 18,
  shadow: false,
  stroke: false,
  strokeColor: '#ffffff',
  strokeWidth: 6,
};

/** Palette Studio (stessi colori dello strumento originale) */
export const STUDIO_COLORS = [
  { name: 'Trasparente', hex: 'transparent' },
  { name: 'Bianco Puro', hex: '#ffffff' },
  { name: 'Nero Profondo', hex: '#000000' },
  { name: 'Grigio Studio', hex: '#64748b' },
  { name: 'Blu E-commerce', hex: '#3b82f6' },
  { name: 'Pesca Pastello', hex: '#fbcfe8' },
  { name: 'Menta Fresca', hex: '#a7f3d0' },
  { name: 'Giallo Caldo', hex: '#fde047' },
] as const;

export interface GradientDef {
  id: string;
  name: string;
  kind: 'linear' | 'radial';
  from: string;
  to: string;
}

export const GRADIENTS: GradientDef[] = [
  { id: 'tramonto', name: 'Tramonto Arancio', kind: 'linear', from: '#f97316', to: '#ec4899' },
  { id: 'cyber', name: 'Cyberpunk Neon', kind: 'linear', from: '#06b6d4', to: '#a855f7' },
  { id: 'smeraldo', name: 'Smeraldo Notturno', kind: 'linear', from: '#059669', to: '#0284c7' },
  { id: 'studio', name: 'Luce Studio Soft', kind: 'radial', from: '#ffffff', to: '#cbd5e1' },
  { id: 'oro', name: 'Oro Luxury', kind: 'linear', from: '#f59e0b', to: '#b45309' },
];

export function gradientCss(g: GradientDef): string {
  return g.kind === 'radial'
    ? `radial-gradient(circle, ${g.from} 0%, ${g.to} 100%)`
    : `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)`;
}

/** true se il risultato conserva la trasparenza (si esporta in PNG con canale alpha) */
export function hasTransparentBackdrop(o: SceneOptions): boolean {
  return o.backdropType === 'transparent' || (o.backdropType === 'color' && o.color === 'transparent');
}

/** Cache dei livelli costosi (sfocatura sfondo e contorno), per non ricalcolarli a ogni pennellata. */
export interface SceneCache {
  blurKey?: string;
  blur?: HTMLCanvasElement;
  outlineKey?: string;
  outline?: HTMLCanvasElement;
}

export interface ComposeMeta {
  /** true durante il disegno col pennello: salta ombra e contorno per restare fluidi */
  lite?: boolean;
  cache?: SceneCache;
  /** numero che cambia ogni volta che il ritaglio (cutout) viene modificato */
  cutoutVersion?: number;
}

const ids = new WeakMap<object, number>();
let nextId = 1;
function idOf(obj: object): number {
  let id = ids.get(obj);
  if (!id) {
    id = nextId++;
    ids.set(obj, id);
  }
  return id;
}

/** Sfocatura: usa ctx.filter se esiste, altrimenti riduce e reingrandisce (funziona anche su Safari). */
function makeBlurred(src: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = createCanvas(w, h);
  const ctx = out.getContext('2d')!;
  const pad = Math.ceil(amount * 2);

  // Safari più vecchi non hanno ctx.filter: in quel caso si usa il metodo "riduci e reingrandisci"
  const fctx = ctx as CanvasRenderingContext2D & { filter?: string };
  if (typeof fctx.filter === 'string') {
    fctx.filter = `blur(${amount}px)`;
    ctx.drawImage(src, -pad, -pad, w + pad * 2, h + pad * 2);
    fctx.filter = 'none';
    return out;
  }

  const factor = Math.max(2, amount / 2);
  const small = createCanvas(w / factor, h / factor);
  const sctx = small.getContext('2d')!;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(src, 0, 0, small.width, small.height);
  const tiny = createCanvas(small.width / 2, small.height / 2);
  tiny.getContext('2d')!.drawImage(small, 0, 0, tiny.width, tiny.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tiny, -pad, -pad, w + pad * 2, h + pad * 2);
  return out;
}

/** Contorno adesivo: la sagoma del soggetto "ingrossata" e colorata. */
function makeOutline(cutout: HTMLCanvasElement, width: number, color: string): HTMLCanvasElement {
  const w = cutout.width;
  const h = cutout.height;
  const out = createCanvas(w, h);
  const ctx = out.getContext('2d')!;
  const r = Math.max(1, width);
  const steps = Math.max(16, Math.min(40, Math.round(r * 3)));

  for (const ring of [r, r * 0.5]) {
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      ctx.drawImage(cutout, Math.cos(a) * ring, Math.sin(a) * ring);
    }
  }
  ctx.drawImage(cutout, 0, 0);

  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  return out;
}

/**
 * Compone la scena finale: sfondo scelto + (ombra) + (contorno) + soggetto ritagliato.
 * Il canvas di destinazione viene ridimensionato come il ritaglio.
 */
export function composeScene(
  target: HTMLCanvasElement,
  cutout: HTMLCanvasElement,
  original: HTMLCanvasElement,
  opts: SceneOptions,
  meta: ComposeMeta = {}
): void {
  const w = cutout.width;
  const h = cutout.height;
  if (target.width !== w) target.width = w;
  if (target.height !== h) target.height = h;

  const ctx = target.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);

  // gli effetti si adattano alla dimensione dell'immagine
  const k = Math.max(w, h) / 900;
  const cache = meta.cache;

  // 1. Sfondo
  if (opts.backdropType === 'color' && opts.color !== 'transparent') {
    ctx.fillStyle = opts.color;
    ctx.fillRect(0, 0, w, h);
  } else if (opts.backdropType === 'gradient') {
    const def = GRADIENTS.find((g) => g.id === opts.gradientId) ?? GRADIENTS[0];
    const grad =
      def.kind === 'radial'
        ? ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
        : ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, def.from);
    grad.addColorStop(1, def.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (opts.backdropType === 'blur') {
    const amount = Math.max(1, opts.blurAmount * k);
    const key = `${idOf(original)}|${w}x${h}|${Math.round(amount * 10)}`;
    let blurred = cache?.blurKey === key ? cache.blur : undefined;
    if (!blurred) {
      blurred = makeBlurred(original, amount);
      if (cache) {
        cache.blurKey = key;
        cache.blur = blurred;
      }
    }
    ctx.drawImage(blurred, 0, 0);
  }

  // 2. Ombra da contatto
  if (opts.shadow && !meta.lite) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24 * k;
    ctx.shadowOffsetY = 12 * k;
    ctx.drawImage(cutout, 0, 0);
    ctx.restore();
  }

  // 3. Contorno adesivo
  if (opts.stroke && !meta.lite) {
    const width = Math.max(1, opts.strokeWidth * k);
    const key = `${idOf(cutout)}|${meta.cutoutVersion ?? 0}|${Math.round(width * 10)}|${opts.strokeColor}`;
    let outline = cache?.outlineKey === key ? cache.outline : undefined;
    if (!outline) {
      outline = makeOutline(cutout, width, opts.strokeColor);
      if (cache) {
        cache.outlineKey = key;
        cache.outline = outline;
      }
    }
    ctx.drawImage(outline, 0, 0);
  }

  // 4. Soggetto
  ctx.drawImage(cutout, 0, 0);
}
