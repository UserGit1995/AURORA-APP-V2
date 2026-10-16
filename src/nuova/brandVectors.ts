import { useEffect, useState } from 'react';

/** Loghi delle marche ridisegnati a vettore (bianchi sulla scheda scura), per nome marca in minuscolo. */
/** s = parti più marcate del logo (la forma d resta più tenue), c = riquadro del logo dentro l'immagine originale (x, y, larghezza, altezza in frazioni), u = inizio del link da cui è stato ricavato. */
export type BrandVec = { w: number; h: number; d: string; s?: string; c?: number[]; u?: string };
let cache: Record<string, BrandVec> | null = null;
let loading: Promise<Record<string, BrandVec>> | null = null;

function load() {
  if (!loading) {
    loading = fetch('/nuova/marche-vettoriali.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((d) => (cache = d || {}));
  }
  return loading;
}

export function useBrandVectors(): Record<string, BrandVec> {
  const [v, setV] = useState<Record<string, BrandVec>>(cache || {});
  useEffect(() => {
    if (cache) return;
    let alive = true;
    load().then((d) => alive && setV(d));
    return () => {
      alive = false;
    };
  }, []);
  return v;
}

export const vecKey = (name: string) => name.trim().toLowerCase();
