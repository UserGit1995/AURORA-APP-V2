import React, { useEffect, useRef, useState } from 'react';
import { Scissors, Download, Star, RefreshCw, Upload, FileArchive, FolderOpen, Trash2, Save, Square, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  createCanvas,
  loadImage,
  imageToCanvas,
  cropCanvas,
  canvasToBlob,
  blobToCanvas,
  downloadBlob,
  slugify,
} from '../../utils/bgRemoval/canvasHelpers';
import { performAIBackgroundRemoval, getContentBounds } from '../../utils/bgRemoval/aiBackgroundRemoval';
import { canvasToStoredImage } from '../../utils/bgRemoval/saveImage';
import { useAdmin } from '../../context/AdminContext';
import type { Product } from '../../types';

interface BatchEditorProps {
  notify: (type: 'ok' | 'err', text: string) => void;
  onPickFromCatalog: () => void;
  /** prodotti scelti dal catalogo da aggiungere alla coda (cambia a ogni scelta) */
  incoming: { nonce: number; products: Product[] } | null;
  modeSwitcher: React.ReactNode;
}

type ItemStatus = 'idle' | 'processing' | 'done' | 'error';

interface BatchItem {
  id: string;
  name: string;
  /** codice articolo, se arriva dal catalogo */
  code?: string;
  productId?: string;
  source: { kind: 'file'; file: File } | { kind: 'url'; url: string };
  previewUrl: string;
  status: ItemStatus;
  /** ritaglio trasparente (PNG) */
  resultBlob?: Blob;
  resultUrl?: string;
  error?: string;
  applied?: boolean;
}

const uid = () => `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const BatchEditor: React.FC<BatchEditorProps> = ({ notify, onPickFromCatalog, incoming, modeSwitcher }) => {
  const { productsList, updateProduct } = useAdmin();

  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [whiteBackdrop, setWhiteBackdrop] = useState(false);
  const [autoCrop, setAutoCrop] = useState(true);
  const [applying, setApplying] = useState(false);
  const [zipping, setZipping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<BatchItem[]>([]);
  itemsRef.current = items;
  const stopRef = useRef(false);
  const optsRef = useRef({ autoCrop, whiteBackdrop });
  optsRef.current = { autoCrop, whiteBackdrop };

  const patchItem = (id: string, patch: Partial<BatchItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  // libera i link temporanei alla chiusura
  useEffect(
    () => () => {
      stopRef.current = true;
      itemsRef.current.forEach((it) => {
        if (it.source.kind === 'file') URL.revokeObjectURL(it.previewUrl);
        if (it.resultUrl) URL.revokeObjectURL(it.resultUrl);
      });
    },
    []
  );

  // prodotti scelti dal catalogo -> coda
  useEffect(() => {
    if (!incoming || incoming.products.length === 0) return;
    setItems((prev) => {
      const have = new Set(prev.map((i) => i.productId).filter(Boolean));
      const fresh: BatchItem[] = incoming.products
        .filter((p) => p.image && !have.has(p.id))
        .map((p) => ({
          id: uid(),
          name: p.name,
          code: p.code,
          productId: p.id,
          source: { kind: 'url', url: p.image },
          previewUrl: p.image,
          status: 'idle',
        }));
      return [...prev, ...fresh];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.nonce]);

  const addFiles = (fileList: FileList | File[] | null) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    const fresh: BatchItem[] = files.map((f) => ({
      id: uid(),
      name: f.name,
      source: { kind: 'file', file: f },
      previewUrl: URL.createObjectURL(f),
      status: 'idle',
    }));
    setItems((prev) => [...prev, ...fresh]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const it = prev.find((i) => i.id === id);
      if (it) {
        if (it.source.kind === 'file') URL.revokeObjectURL(it.previewUrl);
        if (it.resultUrl) URL.revokeObjectURL(it.resultUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAll = () => {
    if (running) return;
    items.forEach((it) => {
      if (it.source.kind === 'file') URL.revokeObjectURL(it.previewUrl);
      if (it.resultUrl) URL.revokeObjectURL(it.resultUrl);
    });
    setItems([]);
  };

  // ----------------------------------------------------------------- elaborazione
  const processOne = async (item: BatchItem) => {
    patchItem(item.id, { status: 'processing', error: undefined });
    let tempUrl: string | null = null;
    try {
      let src: string;
      if (item.source.kind === 'file') {
        src = item.previewUrl;
      } else {
        src = item.source.url;
      }
      const img = await loadImage(src);
      let work = imageToCanvas(img);

      const result = await performAIBackgroundRemoval(work);
      let cutout = result.canvas;

      if (optsRef.current.autoCrop) {
        const pad = Math.max(12, Math.round(Math.max(cutout.width, cutout.height) * 0.02));
        const rect = getContentBounds(cutout, pad);
        if (rect) cutout = cropCanvas(cutout, rect);
      }

      const blob = await canvasToBlob(cutout, 'image/png');
      const resultUrl = URL.createObjectURL(blob);
      patchItem(item.id, { status: 'done', resultBlob: blob, resultUrl });
      work = null as unknown as HTMLCanvasElement;
      if (result.usedFallback) {
        notify('err', 'Modello di scontorno non raggiunto: per alcune foto è stato usato il metodo semplice.');
      }
    } catch (err) {
      console.error('Errore elaborazione batch:', err);
      patchItem(item.id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Elaborazione non riuscita',
      });
    } finally {
      if (tempUrl) URL.revokeObjectURL(tempUrl);
    }
  };

  const handleRunBatch = async () => {
    const queue = itemsRef.current.filter((i) => i.status === 'idle' || i.status === 'error');
    if (queue.length === 0) return;
    stopRef.current = false;
    setRunning(true);
    for (const it of queue) {
      if (stopRef.current) break;
      await processOne(it);
    }
    setRunning(false);
  };

  const handleStop = () => {
    stopRef.current = true;
  };

  // ---------------------------------------------------------------------- export
  /** Ritaglio + eventuale sfondo bianco, come impostato nelle opzioni. */
  const buildExport = async (item: BatchItem): Promise<{ blob: Blob; ext: 'png' | 'jpg'; canvas: HTMLCanvasElement }> => {
    if (!item.resultBlob) throw new Error('Nessun risultato da esportare.');
    const cutout = await blobToCanvas(item.resultBlob);
    if (!whiteBackdrop) {
      return { blob: item.resultBlob, ext: 'png', canvas: cutout };
    }
    const flat = createCanvas(cutout.width, cutout.height);
    const ctx = flat.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(cutout, 0, 0);
    const blob = await canvasToBlob(flat, 'image/jpeg', 0.95);
    return { blob, ext: 'jpg', canvas: flat };
  };

  const fileNameFor = (item: BatchItem, ext: string) =>
    `${slugify(item.code || item.name)}${whiteBackdrop ? '_sfondo-bianco' : '_senza-sfondo'}.${ext}`;

  const handleDownloadOne = async (item: BatchItem) => {
    try {
      const { blob, ext } = await buildExport(item);
      downloadBlob(blob, fileNameFor(item, ext));
    } catch (e) {
      notify('err', e instanceof Error ? e.message : 'Download non riuscito.');
    }
  };

  const handleDownloadZip = async () => {
    const done = items.filter((i) => i.resultBlob);
    if (done.length === 0) return;
    setZipping(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const used = new Set<string>();
      for (const it of done) {
        const { blob, ext } = await buildExport(it);
        let name = fileNameFor(it, ext);
        let n = 2;
        while (used.has(name)) name = fileNameFor(it, ext).replace(`.${ext}`, `-${n++}.${ext}`);
        used.add(name);
        zip.file(name, blob);
      }
      const out = await zip.generateAsync({ type: 'blob' });
      downloadBlob(out, 'aurora-senza-sfondo.zip');
      notify('ok', `ZIP scaricato (${done.length} immagini).`);
    } catch (e) {
      notify('err', e instanceof Error ? e.message : 'Creazione ZIP non riuscita.');
    } finally {
      setZipping(false);
    }
  };

  // ------------------------------------------------------- applica ai prodotti
  const applyToProduct = async (item: BatchItem): Promise<boolean> => {
    if (!item.productId || !item.resultBlob) return false;
    const product = productsList.find((p) => p.id === item.productId);
    if (!product) return false;
    const { canvas } = await buildExport(item);
    const stored = await canvasToStoredImage(canvas, {
      transparent: !whiteBackdrop,
      key: item.productId,
    });
    updateProduct({ ...product, image: stored.url });
    patchItem(item.id, { applied: true });
    return true;
  };

  const handleApplyOne = async (item: BatchItem) => {
    setApplying(true);
    try {
      const ok = await applyToProduct(item);
      notify(ok ? 'ok' : 'err', ok ? `Foto aggiornata: ${item.name}` : 'Prodotto non trovato nel catalogo.');
    } catch (e) {
      notify('err', e instanceof Error ? e.message : 'Salvataggio non riuscito.');
    } finally {
      setApplying(false);
    }
  };

  const applicable = items.filter((i) => i.productId && i.status === 'done' && !i.applied);

  const handleApplyAll = async () => {
    if (applicable.length === 0) return;
    const ok = window.confirm(
      `Sostituire la foto di ${applicable.length} prodott${applicable.length === 1 ? 'o' : 'i'} con la versione senza sfondo?`
    );
    if (!ok) return;
    setApplying(true);
    let done = 0;
    let failed = 0;
    for (const it of applicable) {
      try {
        if (await applyToProduct(it)) done += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    setApplying(false);
    notify(failed === 0 ? 'ok' : 'err', `${done} prodotti aggiornati${failed ? `, ${failed} non riusciti` : ''}.`);
  };

  const pending = items.filter((i) => i.status === 'idle' || i.status === 'error').length;
  const doneCount = items.filter((i) => i.status === 'done').length;
  const doneTotal = items.filter((i) => i.status === 'done' || i.status === 'error').length;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#101218] overflow-hidden select-none">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Barra strumenti */}
      <div className="min-h-11 border-b border-[#242838] bg-[#161822] px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
            <Scissors className="w-4 h-4" />
            AURORA REMOVE BG
          </span>
          {modeSwitcher}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 rounded bg-[#202434] hover:bg-[#2a3044] text-white font-bold flex items-center gap-1 cursor-pointer transition"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aggiungi File</span>
          </button>

          <button
            type="button"
            onClick={onPickFromCatalog}
            className="px-3 py-1 rounded bg-[#202434] hover:bg-[#2a3044] text-white font-bold flex items-center gap-1 cursor-pointer transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-300" />
            <span>Dal catalogo</span>
          </button>

          {running ? (
            <button
              type="button"
              onClick={handleStop}
              className="px-3 py-1 rounded bg-rose-500 hover:bg-rose-400 text-white font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Ferma</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunBatch}
              disabled={pending === 0}
              className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer transition shadow-sm disabled:opacity-50"
            >
              <Star className="w-3.5 h-3.5" />
              <span>Scontorna Tutto ({pending})</span>
            </button>
          )}

          {doneCount > 0 && (
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={zipping}
              className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer transition shadow-sm disabled:opacity-60"
            >
              {zipping ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileArchive className="w-3.5 h-3.5" />}
              <span>Scarica ZIP</span>
            </button>
          )}

          {applicable.length > 0 && (
            <button
              type="button"
              onClick={handleApplyAll}
              disabled={applying || running}
              className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer transition shadow-sm disabled:opacity-60"
            >
              {applying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Applica ai prodotti ({applicable.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Contenuto */}
      <div
        className="flex-1 min-h-0 bg-[#0b0c10] flex flex-col p-4 sm:p-6 overflow-hidden"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex flex-wrap items-center gap-2">
              <span>Scontorno Multiplo — Elaborazione in blocco</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                {items.length} foto in coda
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggiungi più foto (dal PC o dal catalogo): lo sfondo viene tolto a tutte. Poi scarichi un unico ZIP oppure
              sostituisci direttamente le foto dei prodotti.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCrop}
                onChange={(e) => setAutoCrop(e.target.checked)}
                disabled={running}
                className="rounded accent-emerald-400"
              />
              <span>Auto-Crop</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={whiteBackdrop}
                onChange={(e) => setWhiteBackdrop(e.target.checked)}
                className="rounded accent-emerald-400"
              />
              <span>Sfondo bianco (JPG)</span>
            </label>
            {items.length > 0 && !running && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 font-semibold text-slate-400 hover:text-rose-300 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Svuota coda</span>
              </button>
            )}
          </div>
        </div>

        {running && (
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-300">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>
              Scontorno in corso… {doneTotal}/{items.length}. Non chiudere questa finestra.
            </span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Upload className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">La coda è vuota</h4>
                <p className="text-xs text-slate-400">
                  Trascina qui più immagini, scegli i file dal PC oppure seleziona i prodotti del catalogo da rifare.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Upload className="w-4 h-4" />
                  <span>Carica Foto per Batch</span>
                </button>
                <button
                  type="button"
                  onClick={onPickFromCatalog}
                  className="px-4 py-2 rounded-xl bg-[#202434] hover:bg-[#2a3044] text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-cyan-300" />
                  <span>Scegli dal catalogo</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1 content-start">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#272b3b] bg-[#141620] overflow-hidden flex flex-col justify-between"
              >
                <div className="aspect-[4/3] bg-transparency-grid relative overflow-hidden flex items-center justify-center">
                  <img
                    src={item.resultUrl || item.previewUrl}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain"
                    style={item.resultUrl && whiteBackdrop ? { backgroundColor: '#ffffff' } : undefined}
                  />
                  {item.status === 'processing' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 text-white text-xs font-bold">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Scontorno in corso...</span>
                    </div>
                  )}
                  {item.status === 'done' && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950">
                      SCONTORNATO
                    </span>
                  )}
                  {item.applied && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-400 text-slate-950 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      APPLICATA
                    </span>
                  )}
                  {item.status === 'error' && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1 p-3 text-center">
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                      <span className="text-[11px] text-rose-200 leading-tight">{item.error}</span>
                    </div>
                  )}
                  {!running && item.status !== 'processing' && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="absolute bottom-2 right-2 p-1 rounded bg-black/60 text-slate-300 hover:text-rose-300 transition"
                      aria-label="Rimuovi dalla coda"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="p-3 border-t border-[#222533] flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    {item.code && <div className="font-mono text-[10px] text-slate-500">{item.code}</div>}
                    <span className="font-bold text-slate-200 truncate block">{item.name}</span>
                  </div>
                  {item.resultBlob && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.productId && !item.applied && (
                        <button
                          type="button"
                          onClick={() => handleApplyOne(item)}
                          disabled={applying}
                          title="Sostituisci la foto del prodotto"
                          className="p-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownloadOne(item)}
                        title="Scarica"
                        className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export type { Product };
