import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { hasRealImage } from '../../utils/bgRemoval/productImage';
import { SingleEditor, type LoadRequest, type StudioProduct } from './SingleEditor';
import { BatchEditor } from './BatchEditor';
import { ProductPicker } from './ProductPicker';
import type { Product } from '../../types';

interface RemoveBgStudioProps {
  /** Prodotto del catalogo da aprire (es. dal pulsante «Rimuovi sfondo» nella lista prodotti) */
  initialProductId?: string | null;
  /** Cambia ogni volta che si vuole (ri)aprire initialProductId, anche se è lo stesso prodotto */
  openToken?: number;
  /** Immagine da aprire subito, anche se non ancora salvata (es. dentro la scheda prodotto) */
  initialImage?: { url: string; name: string } | null;
  /** Prodotto a cui si riferisce l'immagine (serve solo per i nomi dei file scaricati) */
  productHint?: StudioProduct | null;
  /**
   * Se presente, il "Salva sul prodotto" NON scrive sul catalogo ma restituisce
   * l'immagine al chiamante (usato dentro la scheda prodotto, prima del salvataggio).
   */
  onApplyImage?: (imageUrl: string) => void;
  /** Mostra il selettore Foto Singola / Batch e il catalogo. Default true. */
  allowBatch?: boolean;
  /** Altezza del contenitore. Default: riempie lo spazio disponibile. */
  className?: string;
}

type Mode = 'single' | 'batch';
type Toast = { id: number; type: 'ok' | 'err'; text: string } | null;

export const RemoveBgStudio: React.FC<RemoveBgStudioProps> = ({
  initialProductId = null,
  openToken = 0,
  initialImage = null,
  productHint = null,
  onApplyImage,
  allowBatch = true,
  className = 'flex-1 min-h-0',
}) => {
  const { productsList, updateProduct } = useAdmin();

  const [mode, setMode] = useState<Mode>('single');
  const [product, setProduct] = useState<StudioProduct | null>(productHint);
  const [request, setRequest] = useState<LoadRequest | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [picker, setPicker] = useState<null | 'single' | 'batch'>(null);
  const [incoming, setIncoming] = useState<{ nonce: number; products: Product[] } | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nonceRef = useRef(0);
  const openedInitialRef = useRef<string | null>(null);

  const notify = useCallback((type: 'ok' | 'err', text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), type, text });
    toastTimer.current = setTimeout(() => setToast(null), type === 'err' ? 6000 : 3500);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  // avviso se si chiude la scheda con modifiche non salvate
  useEffect(() => {
    if (!unsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsaved]);

  const openProduct = useCallback(
    (p: Product) => {
      if (unsaved && !window.confirm('Hai modifiche non salvate sulla foto attuale. Vuoi sostituirla?')) return;
      setProduct({ id: p.id, name: p.name, code: p.code });
      if (hasRealImage(p.image)) {
        nonceRef.current += 1;
        setRequest({ url: p.image, name: p.name, nonce: nonceRef.current });
      } else {
        setRequest(null);
        notify('err', 'Questo prodotto non ha ancora una foto: caricane una con «Carica Foto».');
      }
      setUnsaved(false);
    },
    [unsaved, notify]
  );

  // prodotto passato dall'esterno: si apre una volta per ogni openToken
  useEffect(() => {
    if (!initialProductId) return;
    const stamp = `${initialProductId}:${openToken}`;
    if (openedInitialRef.current === stamp) return;
    const p = productsList.find((x) => x.id === initialProductId);
    if (!p) return; // catalogo non ancora caricato: riprova quando arriva
    if (openedInitialRef.current && unsaved && !window.confirm('Hai modifiche non salvate sulla foto attuale. Vuoi sostituirla?')) {
      openedInitialRef.current = stamp;
      return;
    }
    openedInitialRef.current = stamp;
    setProduct({ id: p.id, name: p.name, code: p.code });
    setMode('single');
    if (hasRealImage(p.image)) {
      nonceRef.current += 1;
      setRequest({ url: p.image, name: p.name, nonce: nonceRef.current });
    } else {
      setRequest(null);
    }
    setUnsaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProductId, openToken, productsList.length]);

  // immagine passata dall'esterno (scheda prodotto): si apre una volta sola
  useEffect(() => {
    if (!initialImage || !initialImage.url) return;
    nonceRef.current += 1;
    setRequest({ url: initialImage.url, name: initialImage.name, nonce: nonceRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (imageUrl: string) => {
    if (onApplyImage) {
      onApplyImage(imageUrl);
      return;
    }
    if (!product) return;
    const current = productsList.find((p) => p.id === product.id);
    if (!current) throw new Error('Prodotto non trovato nel catalogo.');
    updateProduct({ ...current, image: imageUrl });
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (next === 'batch' && unsaved && !window.confirm('Hai modifiche non salvate sulla foto attuale. Vuoi continuare?')) {
      return;
    }
    setMode(next);
  };

  const modeSwitcher = allowBatch ? (
    <div className="flex items-center rounded-lg bg-[#202434] p-0.5 border border-[#2e3448]">
      {(['single', 'batch'] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => switchMode(m)}
          className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
            mode === m ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          {m === 'single' ? 'Foto Singola' : 'Batch Multi-Foto'}
        </button>
      ))}
    </div>
  ) : null;

  const saveLabel = onApplyImage
    ? 'Usa questa immagine'
    : product
    ? 'Salva sul prodotto'
    : undefined;

  const alreadyQueued = new Set<string>();

  return (
    <div className={`relative flex flex-col bg-[#101218] text-slate-100 ${className}`}>
      {product && mode === 'single' && (
        <div className="px-4 py-1.5 bg-[#12151f] border-b border-[#242838] text-xs text-slate-400 flex items-center gap-2">
          <span>Stai modificando la foto di</span>
          {product.code && <span className="font-mono text-slate-300">{product.code}</span>}
          <span className="font-semibold text-white truncate">{product.name}</span>
        </div>
      )}

      {mode === 'single' || !allowBatch ? (
        <SingleEditor
          request={request}
          product={product}
          saveLabel={saveLabel}
          onSave={saveLabel ? handleSave : undefined}
          onPickFromCatalog={allowBatch ? () => setPicker('single') : undefined}
          onUnsavedChange={setUnsaved}
          notify={notify}
          modeSwitcher={modeSwitcher}
        />
      ) : (
        <BatchEditor
          notify={notify}
          onPickFromCatalog={() => setPicker('batch')}
          incoming={incoming}
          modeSwitcher={modeSwitcher}
        />
      )}

      {picker && (
        <ProductPicker
          multiple={picker === 'batch'}
          requireImage={picker === 'batch'}
          excludeIds={alreadyQueued}
          onClose={() => setPicker(null)}
          onConfirm={(products) => {
            const which = picker;
            setPicker(null);
            if (which === 'single') {
              openProduct(products[0]);
            } else {
              nonceRef.current += 1;
              setIncoming({ nonce: nonceRef.current, products });
            }
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          className={`absolute bottom-4 right-4 z-30 max-w-sm flex items-start gap-2 px-3.5 py-2.5 rounded-xl border shadow-2xl text-xs font-medium ${
            toast.type === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
          }`}
        >
          {toast.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          )}
          <span className="flex-1">{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="opacity-70 hover:opacity-100"
            aria-label="Chiudi messaggio"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
