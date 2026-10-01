import { getSupabase } from '../../services/supabase';
import { canvasToBlob, fitCanvas } from './canvasHelpers';

/** Stesso lato massimo usato dal caricamento foto prodotto (ProductImageUploader). */
export const PRODUCT_IMAGE_MAX_DIM = 1200;

const BUCKET = 'aurora-images';

export interface StoredImage {
  url: string;
  /** 'cloud' = file sullo Storage Supabase; 'inline' = incorporata nella scheda prodotto (base64) */
  storage: 'cloud' | 'inline';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Lettura immagine non riuscita.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Prepara l'immagine finale per il prodotto:
 *  - la riduce a max 1200 px sul lato lungo (come le foto caricate dall'admin);
 *  - PNG se deve restare trasparente, altrimenti JPEG (più leggero);
 *  - se il cloud Supabase è collegato la carica sullo Storage e restituisce il link,
 *    altrimenti (o se il caricamento fallisce) la restituisce incorporata (base64),
 *    esattamente come fa già il caricamento foto dal PC.
 */
export async function canvasToStoredImage(
  canvas: HTMLCanvasElement,
  opts: { transparent: boolean; key: string; maxDim?: number }
): Promise<StoredImage> {
  const fitted = fitCanvas(canvas, opts.maxDim ?? PRODUCT_IMAGE_MAX_DIM);
  const type = opts.transparent ? 'image/png' : 'image/jpeg';
  const ext = opts.transparent ? 'png' : 'jpg';
  const blob = await canvasToBlob(fitted, type, 0.92);

  const sb = getSupabase();
  if (sb) {
    try {
      const safeKey = opts.key.replace(/[^a-zA-Z0-9_-]/g, '_') || 'prodotto';
      const path = `products/${safeKey}-${Date.now()}.${ext}`;
      const { error } = await sb.storage
        .from(BUCKET)
        .upload(path, blob, { upsert: true, contentType: type });
      if (error) throw error;
      const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
      if (data?.publicUrl) return { url: data.publicUrl, storage: 'cloud' };
    } catch (e) {
      console.warn('Caricamento sullo Storage non riuscito, uso l\'immagine incorporata:', e);
    }
  }

  return { url: await blobToDataUrl(blob), storage: 'inline' };
}
