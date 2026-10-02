import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SkipForward, Loader2, KeyRound, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { getSupabase } from '../services/supabase';

interface Candidate {
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  source: string;
  width: number;
  height: number;
}

const KEY_STORAGE = 'aurora_serper_key';
const USED_STORAGE = 'aurora_serper_used';
const FREE_LIMIT = 2500;

const readLS = (k: string): string => {
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
    /* ignora: lo strumento funziona comunque, la chiave va solo reinserita */
  }
};

const noImage = (image?: string) => !image || image.trim() === '';

/** Ridimensiona (max 900px) e ricomprime in JPEG su fondo bianco, come fa già il caricamento foto. */
async function toJpeg(blob: Blob, maxDim = 900): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Immagine non leggibile'));
      i.src = url;
    });
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    if (!srcW || !srcH) throw new Error('Immagine non leggibile');
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Immagine non elaborabile');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Immagine non elaborabile'))), 'image/jpeg', 0.85),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Trova le foto dei prodotti che NON ne hanno una.
 * Per ogni prodotto cerca online le immagini più adatte al nome e te le mostra:
 * scegli tu quella giusta con un click (oppure salti). Nulla viene assegnato da solo.
 * Tocca solo prodotti senza immagine: se un prodotto ha già una foto non viene mai sostituita.
 * La foto scelta viene salvata nello Storage (aurora-images) e collegata al prodotto;
 * di tutto il prodotto cambia solo il campo immagine.
 */
export const ImageFinderPanel: React.FC = () => {
  const { productsList, updateProduct } = useAdmin();

  const [apiKey, setApiKey] = useState<string>(() => readLS(KEY_STORAGE));
  const [keyDraft, setKeyDraft] = useState('');
  const [editingKey, setEditingKey] = useState(false);
  const [used, setUsed] = useState<number>(() => Number(readLS(USED_STORAGE)) || 0);

  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [savedCount, setSavedCount] = useState(0);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const reqId = useRef(0);

  const missing = useMemo(() => productsList.filter((p) => noImage(p.image)), [productsList]);
  const queue = useMemo(
    () =>
      missing
        .filter((p) => !skipped.has(p.id))
        .sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name)),
    [missing, skipped],
  );
  const current = queue[0] || null;

  const runSearch = async (q: string) => {
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
        if (images.length === 0) setError('Nessuna immagine trovata: prova a cambiare il testo di ricerca.');
        setUsed((prev) => {
          const next = prev + 1;
          writeLS(USED_STORAGE, String(next));
          return next;
        });
      }
    } catch {
      if (id === reqId.current) setError('Connessione non riuscita, riprova.');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  };

  // Appena compare un nuovo prodotto da sistemare, cerca da solo con il suo nome.
  useEffect(() => {
    if (!current || !apiKey) {
      setResults([]);
      setError('');
      return;
    }
    setQuery(current.name);
    runSearch(current.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, apiKey]);

  const saveKey = () => {
    const k = keyDraft.trim();
    if (k.length < 16) {
      setError('La chiave sembra incompleta: copiala per intero da serper.dev.');
      return;
    }
    writeLS(KEY_STORAGE, k);
    setApiKey(k);
    setKeyDraft('');
    setEditingKey(false);
    setError('');
  };

  const choose = async (c: Candidate) => {
    if (!current || saving) return;
    // Controllo di sicurezza: se nel frattempo il prodotto ha già una foto, non la sostituisco mai.
    const fresh = productsList.find((p) => p.id === current.id);
    if (!fresh) return;
    if (!noImage(fresh.image)) {
      setError('Questo prodotto ha già un\'immagine: non la sostituisco.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const resp = await fetch(`/api/image-proxy?url=${encodeURIComponent(c.imageUrl)}`);
      if (!resp.ok) {
        let msg = 'Questa foto non si può scaricare: scegline un\'altra.';
        try {
          const j = await resp.json();
          if (j?.error) msg = `${j.error} Scegline un'altra.`;
        } catch {
          /* usa il messaggio standard */
        }
        throw new Error(msg);
      }
      const jpeg = await toJpeg(await resp.blob());

      const sb = getSupabase();
      if (!sb) throw new Error('Database non raggiungibile: riprova.');
      const path = `found/${fresh.id}-${Date.now()}.jpg`;
      const { error: upErr } = await sb.storage.from('aurora-images').upload(path, jpeg, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      if (upErr) throw new Error(`Salvataggio non riuscito: ${upErr.message}`);
      const { data: pub } = sb.storage.from('aurora-images').getPublicUrl(path);

      // Cambia SOLO l'immagine: tutto il resto del prodotto resta com'è.
      updateProduct({ ...fresh, image: pub.publicUrl });
      setSavedCount((n) => n + 1);
    } catch (e: any) {
      setError(e?.message || 'Non sono riuscito a salvare questa foto, scegline un\'altra.');
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    if (!current) return;
    setSkipped((prev) => new Set(prev).add(current.id));
  };

  const remainingFree = Math.max(0, FREE_LIMIT - used);

  return (
    <div className="p-4 sm:p-6 space-y-4 text-left">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-sky-400" />
        <h3 className="text-sm font-bold text-white">Trova immagini mancanti</h3>
      </div>

      <div className="bg-[#0e1b30] border border-[#1c2433] rounded-2xl p-4 text-xs text-slate-500 space-y-2">
        <p>
          Per ogni prodotto <b className="text-white">senza foto</b> cerco online le immagini che corrispondono al nome:
          tu clicchi quella giusta e passi al prodotto dopo. <b className="text-amber-400">Non viene assegnato nulla da solo.</b>
        </p>
        <p>
          I prodotti che hanno già una foto non vengono mai toccati; di ogni prodotto cambia solo l'immagine.
          Controlla che sia proprio lo stesso articolo (stessa marca, formato e variante).
        </p>
      </div>

      {/* Chiave */}
      {(!apiKey || editingKey) && (
        <div className="bg-[#0e1b30] border border-[#1c2433] rounded-2xl p-4 space-y-2">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-sky-400" />
            Chiave Serper (la incolli una volta sola, resta salvata solo su questo browser)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="Incolla qui la chiave API di serper.dev"
              className="flex-1 min-w-0 bg-[#0b1422] border border-[#1c2433] rounded-lg px-3 py-2 text-xs text-white outline-none"
            />
            <button
              type="button"
              onClick={saveKey}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg"
            >
              Salva
            </button>
          </div>
        </div>
      )}

      {apiKey && !editingKey && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0e1b30] border border-[#1c2433] rounded-xl p-3 text-xs text-slate-400">
          <span>
            Senza foto: <b className="text-white">{missing.length}</b>
            {skipped.size > 0 && <> (saltati {skipped.size})</>} · Salvate ora: <b className="text-emerald-400">{savedCount}</b> ·
            Ricerche usate: <b className="text-white">{used}</b>/{FREE_LIMIT}
            {remainingFree < 150 && <span className="text-amber-400"> (stanno finendo)</span>}
          </span>
          <button
            type="button"
            onClick={() => setEditingKey(true)}
            className="text-slate-500 hover:text-slate-300 underline"
          >
            Cambia chiave
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {apiKey && !editingKey && missing.length === 0 && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4" /> Tutti i prodotti hanno già un'immagine.
        </div>
      )}

      {apiKey && !editingKey && missing.length > 0 && !current && (
        <div className="bg-[#0e1b30] border border-[#1c2433] text-slate-300 text-xs rounded-xl p-3">
          Hai passato tutti i prodotti senza foto. I {skipped.size} saltati restano senza immagine.
          <button type="button" onClick={() => setSkipped(new Set())} className="ml-2 underline text-sky-400">
            Riprova con i saltati
          </button>
        </div>
      )}

      {apiKey && !editingKey && current && (
        <div className="bg-[#0e1b30] border border-[#1c2433] rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-[11px] text-slate-500">
              Prodotto da sistemare{current.category ? ` · ${current.category}` : ''}
              {current.code ? ` · cod. ${current.code}` : ''}
            </p>
            <p className="text-sm font-bold text-white break-words">{current.name}</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch(query);
              }}
              className="flex-1 min-w-0 bg-[#0b1422] border border-[#1c2433] rounded-lg px-3 py-2 text-xs text-white outline-none"
              placeholder="Testo di ricerca"
            />
            <button
              type="button"
              onClick={() => runSearch(query)}
              disabled={loading || saving}
              className="px-3 py-2 bg-[#161f30] hover:bg-[#1c2740] disabled:opacity-50 border border-[#1c2433] text-slate-200 font-semibold text-xs rounded-lg flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              Cerca
            </button>
            <button
              type="button"
              onClick={skip}
              disabled={saving}
              className="px-3 py-2 bg-[#161f30] hover:bg-[#1c2740] disabled:opacity-50 border border-[#1c2433] text-slate-200 font-semibold text-xs rounded-lg flex items-center gap-1.5"
              title="Lascia questo prodotto senza foto e vai al prossimo"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Salta
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Cerco le immagini…
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="relative">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {results.map((c, i) => (
                  <button
                    key={`${c.imageUrl}-${i}`}
                    type="button"
                    onClick={() => choose(c)}
                    disabled={saving}
                    className="group text-left bg-white rounded-xl overflow-hidden border-2 border-transparent hover:border-sky-500 disabled:opacity-50 transition"
                    title={c.title}
                  >
                    <div className="aspect-square bg-white flex items-center justify-center">
                      <img
                        src={c.thumbnailUrl || c.imageUrl}
                        alt={c.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-contain"
                        onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.15')}
                      />
                    </div>
                    <div className="bg-[#0b1422] px-2 py-1.5">
                      <p className="text-[10px] text-slate-400 truncate">{c.source || 'sito web'}</p>
                      {c.width > 0 && (
                        <p className="text-[10px] text-slate-600">
                          {c.width}×{c.height}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {saving && (
                <div className="absolute inset-0 bg-[#0e1b30]/70 flex items-center justify-center gap-2 text-xs text-white rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin" /> Salvo la foto…
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
