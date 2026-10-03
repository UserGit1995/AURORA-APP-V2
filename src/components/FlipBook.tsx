import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { loadScript } from '../utils/loadScript';

export interface FlipBookHandle {
  next: () => void;
  prev: () => void;
  goTo: (page: number) => void;
}

interface FlipBookProps {
  pages: string[];
  maxWidth?: number; // larghezza massima di UNA pagina in pixel
  startPage?: number;
  onPageChange?: (page: number) => void;
  onReady?: (total: number) => void;
}

// Libreria libera per l'effetto "sfoglia" (mouse e touch), caricata da /public/vendor
const PAGE_FLIP_SRC = '/vendor/page-flip.browser.js';

const loadImageSize = (src: string) =>
  new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 595, h: img.naturalHeight || 842 });
    img.onerror = () => resolve({ w: 595, h: 842 });
    img.src = src;
  });

export const FlipBook = forwardRef<FlipBookHandle, FlipBookProps>(
  ({ pages, maxWidth = 560, startPage = 0, onPageChange, onReady }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const flipRef = useRef<any>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useImperativeHandle(ref, () => ({
      next: () => flipRef.current?.flipNext(),
      prev: () => flipRef.current?.flipPrev(),
      goTo: (p: number) => flipRef.current?.turnToPage(p),
    }));

    useEffect(() => {
      if (!pages.length || !hostRef.current) return;
      let cancelled = false;
      const host = hostRef.current;
      // La libreria gestisce da sola questo elemento: lo creiamo noi, fuori da React
      const el = document.createElement('div');
      host.appendChild(el);
      setLoading(true);
      setError('');

      (async () => {
        try {
          const [, size] = await Promise.all([loadScript(PAGE_FLIP_SRC), loadImageSize(pages[0])]);
          if (cancelled) return;
          const St = (window as any).St;
          if (!St?.PageFlip) throw new Error('Libreria sfoglia non disponibile');
          const ratio = size.h / size.w;
          const pf = new St.PageFlip(el, {
            width: maxWidth,
            height: Math.round(maxWidth * ratio),
            size: 'stretch',
            // sotto i 2×260px di spazio mostra una pagina alla volta (cellulare)
            minWidth: 260,
            maxWidth,
            minHeight: Math.round(260 * ratio),
            maxHeight: Math.round(maxWidth * ratio),
            showCover: false,
            usePortrait: true,
            mobileScrollSupport: true,
            flippingTime: 700,
            maxShadowOpacity: 0.45,
            drawShadow: true,
            startPage,
          });
          pf.loadFromImages(pages);
          pf.on('flip', (e: any) => onPageChange?.(Number(e.data) || 0));
          flipRef.current = pf;
          setLoading(false);
          onReady?.(pages.length);
        } catch (e: any) {
          if (!cancelled) {
            setError('Non è stato possibile aprire il volantino. Riprova più tardi.');
            setLoading(false);
          }
        }
      })();

      return () => {
        cancelled = true;
        try {
          flipRef.current?.destroy();
        } catch {
          /* niente */
        }
        flipRef.current = null;
        host.innerHTML = '';
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pages.join('|'), maxWidth]);

    return (
      <div className="relative w-full">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 min-h-[200px]">
            Caricamento volantino…
          </div>
        )}
        {error && <p className="text-sm text-rose-400 text-center py-10">{error}</p>}
        <div ref={hostRef} className="w-full mx-auto" />
      </div>
    );
  }
);
FlipBook.displayName = 'FlipBook';
