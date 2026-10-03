import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Search, Loader2, X, KeyRound, Check } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { getSupabase } from '../services/supabase';
import { Product } from '../types';

// Stessa chiave e stesso contatore dello strumento "Trova immagini" del pannello admin
const KEY_STORAGE = 'aurora_serper_key';
const USED_STORAGE = 'aurora_serper_used';
const FREE_LIMIT = 2500;

interface Candidate {
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  source: string;
  width: number;
  height: number;
}

const readLS = (k: string) => {
  try {
    return localStorage.getItem(k) || '';
  } catch {
    return '';
  }
};
const writeLS = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* niente */
  }
};

/** Ridimensiona (max 900px) e salva in JPEG su fondo bianco */
async function toJpeg(blob: Blob, maxDim = 900): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Immagine non leggibile'));
      i.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Immagine non elaborabile'))), 'image/jpeg', 0.85)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

const FinderModal: React.FC<{ product: Product; onClose: () => void }> = ({ product, onClose }) => {
  const { productsList, updateProduct } = useAdmin();
  const [apiKey, setApiKey] = useState(() => readLS(KEY_STORAGE));
  const [keyDraft, setKeyDraft] = useState('');
  const [used, setUsed] = useState(() => Number(readLS(USED_STORAGE)) || 0);
  const [query, setQuery] = useState(product.name);
  const [results, setResults] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const reqId = useRef(0);
  const hasImage = !!(product.image && product.image.trim());

  const search = async (q: string) => {
    const text = q.trim();
    if (!text || !apiKey) return;
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const resp = await fetch('/api/image-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-serper-key': apiKey },
        body: JSON.stringify({ q: text }),
      });
      const data = await resp.json().catch(() => null);
      if (id !== reqId.current) return;
      if (!resp.ok || !data?.ok) {
        setError(data?.error || 'Ricerca non riuscita, riprova.');
      } else {
        const images: Candidate[] = data.images || [];
        setResults(images);
        if (!images.length) setError('Nessuna immagine trovata: prova a cambiare il testo di ricerca.');
        setUsed((n) => {
          writeLS(USED_STORAGE, String(n + 1));
          return n + 1;
        });
      }
    } catch {
      if (id === reqId.current) setError('Connessione non riuscita, riprova.');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  };

  // Cerca subito con il nome del prodotto
  useEffect(() => {
    if (apiKey) search(product.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Blocca lo scorrimento della pagina sotto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const saveKey = () => {
    const k = keyDraft.trim();
    if (k.length < 16) return setError('La chiave sembra incompleta: copiala per intero da serper.dev.');
    writeLS(KEY_STORAGE, k);
    setApiKey(k);
    setKeyDraft('');
    setError('');
  };

  const choose = async (c: Candidate) => {
    if (saving) return;
    const fresh = productsList.find((p) => p.id === product.id);
    if (!fresh) return;
    if (fresh.image && fresh.image.trim() && !confirm('Questo prodotto ha già una foto. Vuoi sostituirla con quella scelta?')) return;
    setSaving(c.imageUrl);
    setError('');
    try {
      const resp = await fetch(`/api/image-proxy?url=${encodeURIComponent(c.imageUrl)}`);
      if (!resp.ok) {
        let msg = "Questa foto non si può scaricare: scegline un'altra.";
        try {
          const j = await resp.json();
          if (j?.error) msg = `${j.error} Scegline un'altra.`;
        } catch {
          /* messaggio standard */
        }
        throw new Error(msg);
      }
      const jpeg = await toJpeg(await resp.blob());
      const sb = getSupabase();
      if (!sb) throw new Error('Database non raggiungibile: riprova.');
      const path = `found/${fresh.id}-${Date.now()}.jpg`;
      const { error: upErr } = await sb.storage.from('aurora-images').upload(path, jpeg, { upsert: true, contentType: 'image/jpeg' });
      if (upErr) throw new Error(`Salvataggio non riuscito: ${upErr.message}`);
      const { data: pub } = sb.storage.from('aurora-images').getPublicUrl(path);
      // Cambia SOLO l'immagine del prodotto
      updateProduct({ ...fresh, image: pub.publicUrl });
      setDone(true);
      setTimeout(onClose, 900);
    } catch (e: any) {
      setError(e?.message || "Non sono riuscito a salvare questa foto, scegline un'altra.");
    } finally {
      setSaving(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#0b1526] border border-[#1c2433] rounded-2xl shadow-2xl text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-4 border-b border-[#1c2433]">
          <div className="w-14 h-14 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
            {hasImage ? (
              <img src={product.image} alt="" className="max-w-full max-h-full object-contain" />
            ) : (
              <ImagePlus className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-sky-300 font-semibold">Trova immagine</p>
            <p className="text-sm text-white font-bold leading-snug line-clamp-2">{product.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ricerche gratuite rimaste circa: {Math.max(0, FREE_LIMIT - used)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#121c2e]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {!apiKey ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                Chiave Serper (la incolli una volta sola, resta salvata su questo dispositivo)
              </label>
              <div className="flex gap-2">
                <input
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="Incolla qui la chiave di serper.dev"
                  className="flex-1 bg-[#0d1420] border border-[#1c2433] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
                <button type="button" onClick={saveKey} className="px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold">
                  Salva
                </button>
              </div>
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                search(query);
              }}
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-[#0d1420] border border-[#1c2433] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Cerca
              </button>
            </form>
          )}

          {error && <p className="text-xs text-rose-400">{error}</p>}
          {done && (
            <p className="text-sm text-emerald-400 font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Immagine salvata sul prodotto.
            </p>
          )}
          {loading && <p className="text-xs text-slate-400">Cerco le immagini…</p>}

          {results.length > 0 && (
            <>
              <p className="text-[11px] text-slate-500">
                Tocca la foto giusta: controlla che sia lo stesso articolo (marca, formato e variante).
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {results.map((c) => (
                  <button
                    key={c.imageUrl}
                    type="button"
                    disabled={!!saving}
                    onClick={() => choose(c)}
                    className="group relative rounded-xl overflow-hidden bg-white border-2 border-transparent hover:border-sky-500 disabled:opacity-60 text-left"
                  >
                    <div className="aspect-square flex items-center justify-center p-2">
                      <img src={c.thumbnailUrl || c.imageUrl} alt={c.title} referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="px-2 py-1 bg-[#0d1420] text-[10px] text-slate-400 truncate">
                      {c.width && c.height ? `${c.width}×${c.height} · ` : ''}
                      {c.source}
                    </div>
                    {saving === c.imageUrl && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * Pulsante visibile SOLO all'amministratore sulle schede prodotto:
 * apre la ricerca immagini (Serper) per quel prodotto e salva la foto scelta.
 */
export const AdminImageFinderButton: React.FC<{ product: Product; className?: string }> = ({ product, className = '' }) => {
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  if (!isAdmin) return null;
  const missing = !(product.image && product.image.trim());

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        title={missing ? 'Trova immagine (solo admin)' : 'Cambia immagine (solo admin)'}
        aria-label="Trova immagine"
        className={`absolute z-10 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold shadow-md transition-colors ${
          missing ? 'bg-amber-500 text-slate-900 hover:bg-amber-400' : 'bg-slate-900/80 text-white hover:bg-slate-900'
        } ${className}`}
      >
        <ImagePlus className="w-3.5 h-3.5" />
        {missing && <span>Trova immagine</span>}
      </button>
      {open && <FinderModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
};
