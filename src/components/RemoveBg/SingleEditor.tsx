import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Scissors,
  Download,
  Sparkles,
  RefreshCw,
  Eraser,
  Paintbrush,
  Check,
  Crop,
  Undo2,
  Redo2,
  Wand2,
  Upload,
  ZoomIn,
  ZoomOut,
  Save,
  FolderOpen,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  createCanvas,
  pixelCtx,
  loadImage,
  imageToCanvas,
  cropCanvas,
  canvasToBlob,
  downloadBlob,
  slugify,
} from '../../utils/bgRemoval/canvasHelpers';
import {
  performAIBackgroundRemoval,
  getContentBounds,
  magicWandSelectAndModify,
  type CutoutProgress,
} from '../../utils/bgRemoval/aiBackgroundRemoval';
import {
  composeScene,
  hasTransparentBackdrop,
  DEFAULT_SCENE,
  STUDIO_COLORS,
  GRADIENTS,
  gradientCss,
  type SceneOptions,
  type SceneCache,
} from '../../utils/bgRemoval/composeScene';
import { canvasToStoredImage } from '../../utils/bgRemoval/saveImage';

export interface LoadRequest {
  url: string;
  name: string;
  /** cambia a ogni nuova richiesta di caricamento */
  nonce: number;
}

export interface StudioProduct {
  id: string;
  name: string;
  code?: string;
}

interface SingleEditorProps {
  request: LoadRequest | null;
  product: StudioProduct | null;
  /** testo del pulsante di salvataggio; se assente il pulsante non compare */
  saveLabel?: string;
  onSave?: (imageUrl: string) => Promise<void> | void;
  onPickFromCatalog?: () => void;
  onUnsavedChange: (unsaved: boolean) => void;
  notify: (type: 'ok' | 'err', text: string) => void;
  /** selettore Foto Singola / Batch, mostrato nella barra */
  modeSwitcher: React.ReactNode;
}

type FineTuneTool = 'none' | 'draw' | 'magic' | 'lasso';
type BrushMode = 'erase' | 'restore';
type Status = 'empty' | 'processing' | 'ready' | 'error';

interface HistoryEntry {
  data: ImageData;
  original: HTMLCanvasElement;
}

const HISTORY_LIMIT = 12;

export const SingleEditor: React.FC<SingleEditorProps> = ({
  request,
  product,
  saveLabel,
  onSave,
  onPickFromCatalog,
  onUnsavedChange,
  notify,
  modeSwitcher,
}) => {
  // ---- canvas e dati di lavoro (non in state: cambiano a ogni pennellata) ----
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const originalRef = useRef<HTMLCanvasElement | null>(null);
  const cutoutRef = useRef<HTMLCanvasElement | null>(null);
  const versionRef = useRef(0);
  const cacheRef = useRef<SceneCache>({});

  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIdxRef = useRef(-1);
  const [, setTick] = useState(0);
  const refreshUi = () => setTick((t) => t + 1);

  // ---- stato interfaccia ----
  const [status, setStatus] = useState<Status>('empty');
  const [progress, setProgress] = useState<CutoutProgress>({ stage: 'Inizializzazione AI...', percent: 10 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // strumenti di rifinitura
  const [activeFineTune, setActiveFineTune] = useState<FineTuneTool>('none');
  const [brushMode, setBrushMode] = useState<BrushMode>('erase');
  const [brushSize, setBrushSize] = useState(30);
  const [magicTolerance, setMagicTolerance] = useState(30);
  const [magicContiguous, setMagicContiguous] = useState(true);

  // sfondo ed effetti
  const [scene, setScene] = useState<SceneOptions>(DEFAULT_SCENE);

  // zoom e viewport
  const [zoom, setZoom] = useState(1);
  const [viewport, setViewport] = useState({ w: 900, h: 600 });

  // ---- riferimenti sempre aggiornati per i gestori eventi ----
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const loadIdRef = useRef(0);
  const lastSourceRef = useRef<{ url: string; name: string } | null>(null);
  const interactingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const lassoRef = useRef<{ x: number; y: number }[]>([]);
  const strokePatternRef = useRef<CanvasPattern | null>(null);
  const rafRef = useRef<number | null>(null);

  const updateScene = (patch: Partial<SceneOptions>) => setScene((s) => ({ ...s, ...patch }));

  // ---------------------------------------------------------------- rendering
  const renderScene = useCallback((lite = false) => {
    const target = canvasRef.current;
    const cutout = cutoutRef.current;
    const orig = originalRef.current;
    if (!target || !cutout || !orig) return;
    composeScene(target, cutout, orig, sceneRef.current, {
      lite,
      cache: cacheRef.current,
      cutoutVersion: versionRef.current,
    });
  }, []);

  // durante il disegno si ridisegna al massimo una volta per frame
  const scheduleLiteRender = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      renderScene(true);
    });
  }, [renderScene]);

  const cancelScheduledRender = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const clearOverlay = () => {
    const o = overlayRef.current;
    if (!o) return;
    o.getContext('2d')?.clearRect(0, 0, o.width, o.height);
  };

  // ridisegna quando cambiano sfondo/effetti o a ritaglio pronto
  useEffect(() => {
    if (status === 'ready') renderScene(false);
  }, [status, scene, renderScene]);

  // l'overlay (pennello/lazo) ha la stessa risoluzione della scena
  useEffect(() => {
    const o = overlayRef.current;
    if (o && size) {
      o.width = size.w;
      o.height = size.h;
    }
  }, [size, status]);

  // dimensioni dell'area di lavoro (per adattare l'immagine allo schermo)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const read = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => cancelScheduledRender(), []);

  // cambiando strumento si toglie l'anello del pennello / il tracciato del lazo
  useEffect(() => {
    clearOverlay();
  }, [activeFineTune]);

  // le foto caricate dal PC vivono come link temporanei: si liberano alla chiusura
  const objectUrlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  // ----------------------------------------------------------------- cronologia
  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current < historyRef.current.length - 1;

  const pushHistory = () => {
    const c = cutoutRef.current;
    const o = originalRef.current;
    if (!c || !o) return;
    const data = pixelCtx(c).getImageData(0, 0, c.width, c.height);
    const list = historyRef.current.slice(0, historyIdxRef.current + 1);
    list.push({ data, original: o });
    while (list.length > HISTORY_LIMIT) list.shift();
    historyRef.current = list;
    historyIdxRef.current = list.length - 1;
    refreshUi();
  };

  const applyEntry = (entry: HistoryEntry) => {
    const c = cutoutRef.current;
    if (!c) return;
    c.width = entry.data.width;
    c.height = entry.data.height;
    pixelCtx(c).putImageData(entry.data, 0, 0);
    originalRef.current = entry.original;
    versionRef.current += 1;
    setSize({ w: c.width, h: c.height });
    renderScene(false);
    refreshUi();
  };

  const handleUndo = () => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    applyEntry(historyRef.current[historyIdxRef.current]);
    onUnsavedChange(true);
  };

  const handleRedo = () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    applyEntry(historyRef.current[historyIdxRef.current]);
    onUnsavedChange(true);
  };

  // scorciatoie: Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+Maiusc+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // --------------------------------------------------------- caricamento + AI
  const runCutout = useCallback(
    async (url: string, name: string) => {
      const myId = ++loadIdRef.current;
      lastSourceRef.current = { url, name };
      setStatus('processing');
      setErrorMsg(null);
      setUsedFallback(false);
      setActiveFineTune('none');
      setProgress({ stage: 'Caricamento immagine...', percent: 6 });

      try {
        const img = await loadImage(url);
        if (myId !== loadIdRef.current) return;

        const orig = imageToCanvas(img);
        const result = await performAIBackgroundRemoval(orig, (p) => {
          if (myId === loadIdRef.current) setProgress(p);
        });
        if (myId !== loadIdRef.current) return;

        originalRef.current = orig;
        cutoutRef.current = result.canvas;
        versionRef.current += 1;
        cacheRef.current = {};
        historyRef.current = [];
        historyIdxRef.current = -1;
        pushHistory();

        setSourceName(name);
        setSize({ w: result.canvas.width, h: result.canvas.height });
        setUsedFallback(result.usedFallback);
        setZoom(1);
        setStatus('ready');
        onUnsavedChange(true);
      } catch (err) {
        if (myId !== loadIdRef.current) return;
        console.error('Rimozione sfondo non riuscita:', err);
        setErrorMsg(err instanceof Error ? err.message : 'Rimozione sfondo non riuscita.');
        setStatus(cutoutRef.current ? 'ready' : 'error');
        if (cutoutRef.current) notify('err', err instanceof Error ? err.message : 'Rimozione sfondo non riuscita.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // nuova richiesta dal guscio (prodotto scelto dal catalogo o foto iniziale)
  useEffect(() => {
    if (request) runCutout(request.url, request.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce]);

  const loadFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('err', 'Il file selezionato non è un\'immagine.');
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    runCutout(url, file.name);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    loadFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    loadFile(e.dataTransfer.files?.[0]);
  };

  // ------------------------------------------------------------------ Auto-Crop
  const handleAutoCrop = () => {
    const cutout = cutoutRef.current;
    const orig = originalRef.current;
    if (!cutout || !orig) return;

    const pad = Math.max(12, Math.round(Math.max(cutout.width, cutout.height) * 0.02));
    const rect = getContentBounds(cutout, pad);
    if (!rect) {
      notify('err', 'Nessun soggetto trovato da ritagliare.');
      return;
    }
    if (rect.x === 0 && rect.y === 0 && rect.w === cutout.width && rect.h === cutout.height) {
      notify('ok', 'Il soggetto occupa già tutta l\'immagine.');
      return;
    }

    // si ritaglia IDENTICAMENTE ritaglio e originale, così il pennello "Ripristina" resta allineato
    const newCutout = cropCanvas(cutout, rect);
    const newOrig = cropCanvas(orig, rect);
    const ctx = pixelCtx(cutout);
    cutout.width = newCutout.width;
    cutout.height = newCutout.height;
    ctx.drawImage(newCutout, 0, 0);
    originalRef.current = newOrig;

    versionRef.current += 1;
    setSize({ w: cutout.width, h: cutout.height });
    pushHistory();
    renderScene(false);
    onUnsavedChange(true);
  };

  // ------------------------------------------------------------------ interazione
  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
      scale,
    };
  };

  const strokeSegment = (x0: number, y0: number, x1: number, y1: number, scale: number) => {
    const cutout = cutoutRef.current;
    if (!cutout) return;
    const ctx = pixelCtx(cutout);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize * scale;
    if (brushMode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = '#000';
    } else if (strokePatternRef.current) {
      ctx.strokeStyle = strokePatternRef.current;
    }
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
    versionRef.current += 1;
  };

  const drawBrushRing = (x: number, y: number, scale: number) => {
    const o = overlayRef.current;
    if (!o) return;
    const ctx = o.getContext('2d')!;
    ctx.clearRect(0, 0, o.width, o.height);
    ctx.save();
    ctx.lineWidth = Math.max(1, scale * 1.5);
    ctx.strokeStyle = brushMode === 'erase' ? 'rgba(244,63,94,0.95)' : 'rgba(16,185,129,0.95)';
    ctx.beginPath();
    ctx.arc(x, y, (brushSize * scale) / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const drawLassoPath = (scale: number) => {
    const o = overlayRef.current;
    const pts = lassoRef.current;
    if (!o || pts.length < 2) return;
    const ctx = o.getContext('2d')!;
    ctx.clearRect(0, 0, o.width, o.height);
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = Math.max(1, scale * 2);
    ctx.setLineDash([4 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeFineTune === 'none' || !cutoutRef.current || !originalRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const c = getCoords(e);
    interactingRef.current = true;
    lastPosRef.current = { x: c.x, y: c.y };

    if (activeFineTune === 'draw') {
      strokePatternRef.current =
        brushMode === 'restore' ? pixelCtx(cutoutRef.current).createPattern(originalRef.current, 'no-repeat') : null;
      strokeSegment(c.x, c.y, c.x + 0.01, c.y + 0.01, c.scale);
      scheduleLiteRender();
    } else if (activeFineTune === 'magic') {
      magicWandSelectAndModify(
        cutoutRef.current,
        originalRef.current,
        Math.round(c.x),
        Math.round(c.y),
        magicTolerance,
        brushMode,
        magicContiguous
      );
      versionRef.current += 1;
      pushHistory();
      renderScene(false);
      onUnsavedChange(true);
      interactingRef.current = false;
    } else if (activeFineTune === 'lasso') {
      lassoRef.current = [{ x: c.x, y: c.y }];
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeFineTune === 'none' || !cutoutRef.current) return;
    const c = getCoords(e);

    if (!interactingRef.current) {
      if (activeFineTune === 'draw') drawBrushRing(c.x, c.y, c.scale);
      return;
    }

    if (activeFineTune === 'draw') {
      strokeSegment(lastPosRef.current.x, lastPosRef.current.y, c.x, c.y, c.scale);
      lastPosRef.current = { x: c.x, y: c.y };
      drawBrushRing(c.x, c.y, c.scale);
      scheduleLiteRender();
    } else if (activeFineTune === 'lasso') {
      lassoRef.current.push({ x: c.x, y: c.y });
      drawLassoPath(c.scale);
    }
  };

  const finishInteraction = () => {
    if (!interactingRef.current) return;
    interactingRef.current = false;
    const cutout = cutoutRef.current;
    const orig = originalRef.current;

    if (activeFineTune === 'draw') {
      cancelScheduledRender();
      strokePatternRef.current = null;
      pushHistory();
      renderScene(false);
      onUnsavedChange(true);
    } else if (activeFineTune === 'lasso') {
      const pts = lassoRef.current;
      lassoRef.current = [];
      clearOverlay();
      if (cutout && orig && pts.length > 2) {
        const ctx = pixelCtx(cutout);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        if (brushMode === 'erase') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fill();
        } else {
          const pattern = ctx.createPattern(orig, 'no-repeat');
          if (pattern) {
            ctx.fillStyle = pattern;
            ctx.fill();
          }
        }
        ctx.restore();
        versionRef.current += 1;
        pushHistory();
        renderScene(false);
        onUnsavedChange(true);
      }
    }
  };

  const handlePointerLeave = () => {
    if (!interactingRef.current) clearOverlay();
  };

  // ------------------------------------------------------------ esporta / salva
  const composeFinal = (): HTMLCanvasElement | null => {
    const cutout = cutoutRef.current;
    const orig = originalRef.current;
    if (!cutout || !orig) return null;
    const out = createCanvas(cutout.width, cutout.height);
    composeScene(out, cutout, orig, sceneRef.current, { lite: false, cutoutVersion: versionRef.current });
    return out;
  };

  const baseName = () => slugify(product?.code || product?.name || sourceName || 'immagine');

  const handleDownload = async () => {
    const out = composeFinal();
    if (!out) return;
    try {
      const transparent = hasTransparentBackdrop(sceneRef.current);
      const blob = await canvasToBlob(out, 'image/png');
      downloadBlob(blob, `${baseName()}_${transparent ? 'senza-sfondo' : 'sfondo'}.png`);
      notify('ok', 'Immagine scaricata.');
    } catch (e) {
      notify('err', e instanceof Error ? e.message : 'Download non riuscito.');
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    const out = composeFinal();
    if (!out) return;
    setSaving(true);
    try {
      const stored = await canvasToStoredImage(out, {
        transparent: hasTransparentBackdrop(sceneRef.current),
        key: product?.id || 'nuovo',
      });
      await onSave(stored.url);
      onUnsavedChange(false);
      notify(
        'ok',
        stored.storage === 'cloud'
          ? 'Immagine salvata sul prodotto.'
          : 'Immagine salvata sul prodotto (incorporata nella scheda).'
      );
    } catch (e) {
      notify('err', e instanceof Error ? e.message : 'Salvataggio non riuscito.');
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------ layout
  const fitScale = size
    ? Math.min(Math.max(viewport.w - 48, 120) / size.w, Math.max(viewport.h - 110, 120) / size.h, 2)
    : 1;
  const dispW = size ? Math.max(1, Math.round(size.w * fitScale * zoom)) : 0;
  const dispH = size ? Math.max(1, Math.round(size.h * fitScale * zoom)) : 0;
  const showGrid = hasTransparentBackdrop(scene);
  const ready = status === 'ready';
  const downloadLabel = showGrid ? 'Scarica Trasparente (PNG)' : 'Scarica PNG';

  const toolBtn = (tool: FineTuneTool, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setActiveFineTune(activeFineTune === tool ? 'none' : tool)}
      disabled={!ready}
      className={`py-2 px-1 rounded-lg border text-center transition cursor-pointer flex flex-col items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
        activeFineTune === tool
          ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-bold'
          : 'border-[#292e40] bg-[#1b1e2c] text-slate-400 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const backdropBtn = (type: SceneOptions['backdropType'], label: string, swatch: React.ReactNode) => (
    <button
      type="button"
      onClick={() => updateScene({ backdropType: type })}
      className={`p-2.5 rounded-xl border font-semibold flex items-center gap-2 transition cursor-pointer ${
        scene.backdropType === type
          ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
          : 'border-[#262939] bg-[#181a24] text-slate-400 hover:bg-[#202330]'
      }`}
    >
      {swatch}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#101218] overflow-hidden select-none">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

      {/* Barra strumenti */}
      <div className="min-h-11 border-b border-[#242838] bg-[#161822] px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
            <Scissors className="w-4 h-4" />
            AURORA REMOVE BG
          </span>

          {modeSwitcher}

          <div className="flex items-center gap-1 pl-2 border-l border-[#282d3e]">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Annulla modifica (Ctrl+Z)"
              className="p-1 rounded hover:bg-[#252a3a] disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Ripeti modifica (Ctrl+Y)"
              className="p-1 rounded hover:bg-[#252a3a] disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAutoCrop}
            disabled={!ready}
            className="px-2.5 py-1 rounded bg-[#202434] hover:bg-[#2a3044] text-slate-200 font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Ritaglia automaticamente i bordi vuoti"
          >
            <Crop className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Auto-Crop</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded bg-[#202434] hover:bg-[#2a3044] text-slate-200 font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Carica Foto</span>
          </button>

          {onPickFromCatalog && (
            <button
              type="button"
              onClick={onPickFromCatalog}
              className="px-2.5 py-1 rounded bg-[#202434] hover:bg-[#2a3044] text-slate-200 font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Scegli un prodotto del catalogo"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden lg:inline">Dal catalogo</span>
            </button>
          )}

          {onSave && saveLabel && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!ready || saving}
              className="px-2.5 py-1 rounded bg-[#1f2538] hover:bg-[#2b334c] text-cyan-300 font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
              title={saveLabel}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline">{saveLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={!ready}
            className="px-3.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadLabel}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Pannello sinistro */}
        <aside className="w-full md:w-84 max-h-[42vh] md:max-h-none border-b md:border-b-0 md:border-r border-[#242838] bg-[#141620] flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
          {/* Rifinitura di precisione */}
          <div className="p-3.5 rounded-xl bg-[#191c28] border border-[#272b3b] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Rifinitura di Precisione</span>
              </span>
              {activeFineTune !== 'none' && (
                <button
                  type="button"
                  onClick={() => setActiveFineTune('none')}
                  className="text-[10px] text-amber-300 hover:underline"
                >
                  Disattiva
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
              {toolBtn('draw', 'Pennello', <Paintbrush className="w-3.5 h-3.5" />)}
              {toolBtn('magic', 'Bacchetta', <Sparkles className="w-3.5 h-3.5" />)}
              {toolBtn('lasso', 'Lazo', <Scissors className="w-3.5 h-3.5" />)}
            </div>

            {activeFineTune !== 'none' && (
              <div className="pt-2 border-t border-[#262a3a] space-y-2.5">
                <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBrushMode('erase')}
                    className={`py-1.5 rounded-lg border flex items-center justify-center gap-1 transition cursor-pointer ${
                      brushMode === 'erase'
                        ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                        : 'border-[#292e40] bg-[#1b1e2c] text-slate-400'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Rimuovi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrushMode('restore')}
                    className={`py-1.5 rounded-lg border flex items-center justify-center gap-1 transition cursor-pointer ${
                      brushMode === 'restore'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : 'border-[#292e40] bg-[#1b1e2c] text-slate-400'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Ripristina</span>
                  </button>
                </div>

                {activeFineTune === 'draw' && (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>Dimensione Pennello:</span>
                      <span className="font-mono text-amber-300">{brushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="120"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                )}

                {activeFineTune === 'magic' && (
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5">
                        <span>Tolleranza Colore:</span>
                        <span className="font-mono text-amber-300">{magicTolerance}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="80"
                        value={magicTolerance}
                        onChange={(e) => setMagicTolerance(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </div>
                    <label className="flex items-center justify-between text-slate-300 cursor-pointer pt-1">
                      <span>Pixel Contigui</span>
                      <input
                        type="checkbox"
                        checked={magicContiguous}
                        onChange={(e) => setMagicContiguous(e.target.checked)}
                        className="accent-amber-400 rounded"
                      />
                    </label>
                    <p className="text-[11px] text-amber-300/90 leading-tight">
                      Clicca sull'immagine: viene {brushMode === 'erase' ? 'rimossa' : 'recuperata'} l'area di colore
                      simile.
                    </p>
                  </div>
                )}

                {activeFineTune === 'lasso' && (
                  <p className="text-[11px] text-amber-300/90 leading-tight">
                    Clicca e trascina sull'immagine per tracciare una selezione ad anello da{' '}
                    {brushMode === 'erase' ? 'eliminare' : 'recuperare'}.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sostituzione sfondo */}
          <div className="space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300 block">Sostituzione Sfondo</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {backdropBtn(
                'transparent',
                'Trasparente',
                <div className="w-4 h-4 rounded bg-transparency-grid shrink-0 border border-slate-700" />
              )}
              {backdropBtn(
                'color',
                'Tinta Unita',
                <div
                  className="w-4 h-4 rounded shrink-0 border border-slate-700"
                  style={{ backgroundColor: scene.color === 'transparent' ? '#181a24' : scene.color }}
                />
              )}
              {backdropBtn(
                'gradient',
                'Sfumatura',
                <div
                  className="w-4 h-4 rounded shrink-0 border border-slate-700"
                  style={{ background: gradientCss(GRADIENTS.find((g) => g.id === scene.gradientId) ?? GRADIENTS[0]) }}
                />
              )}
              {backdropBtn('blur', 'Sfocatura Bokeh', <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />)}
            </div>

            {scene.backdropType === 'color' && (
              <div className="space-y-2 pt-2 border-t border-[#222533]">
                <span className="text-xs text-slate-400">Palette Studio:</span>
                <div className="grid grid-cols-4 gap-2">
                  {STUDIO_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c.hex}
                      title={c.name}
                      onClick={() => updateScene({ color: c.hex })}
                      className={`h-9 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                        scene.color === c.hex ? 'border-amber-400 scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.hex === 'transparent' ? '#181a24' : c.hex }}
                    >
                      {scene.color === c.hex && (
                        <Check
                          className={`w-4 h-4 ${
                            c.hex === '#ffffff' || c.hex === '#fde047' || c.hex === '#a7f3d0' || c.hex === '#fbcfe8'
                              ? 'text-slate-900'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scene.backdropType === 'gradient' && (
              <div className="space-y-1.5 pt-2 border-t border-[#222533]">
                {GRADIENTS.map((g) => (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => updateScene({ gradientId: g.id })}
                    className={`w-full p-2 rounded-xl text-xs flex items-center justify-between font-bold transition cursor-pointer ${
                      g.id === 'studio' ? 'text-slate-800' : 'text-white'
                    } ${scene.gradientId === g.id ? 'ring-2 ring-white' : ''}`}
                    style={{ background: gradientCss(g) }}
                  >
                    <span>{g.name}</span>
                    {scene.gradientId === g.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}

            {scene.backdropType === 'blur' && (
              <div className="space-y-1 pt-2 border-t border-[#222533]">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Intensità Sfocatura</span>
                  <span className="font-mono text-emerald-400">{scene.blurAmount}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="45"
                  value={scene.blurAmount}
                  onChange={(e) => updateScene({ blurAmount: Number(e.target.value) })}
                  className="w-full accent-emerald-400"
                />
              </div>
            )}
          </div>

          {/* Effetti soggetto */}
          <div className="space-y-3 pt-3 border-t border-[#222533]">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300 block">Effetti Soggetto</span>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Ombra da Contatto Studio</span>
              <input
                type="checkbox"
                checked={scene.shadow}
                onChange={(e) => updateScene({ shadow: e.target.checked })}
                className="rounded accent-emerald-400"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Contorno Adesivo (Sticker)</span>
              <input
                type="checkbox"
                checked={scene.stroke}
                onChange={(e) => updateScene({ stroke: e.target.checked })}
                className="rounded accent-emerald-400"
              />
            </label>

            {scene.stroke && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="color"
                  value={scene.strokeColor}
                  onChange={(e) => updateScene({ strokeColor: e.target.value })}
                  className="w-7 h-7 rounded border border-slate-600 bg-transparent cursor-pointer"
                />
                <input
                  type="range"
                  min="2"
                  max="18"
                  value={scene.strokeWidth}
                  onChange={(e) => updateScene({ strokeWidth: Number(e.target.value) })}
                  className="flex-1 accent-emerald-400"
                />
                <span className="text-xs font-mono">{scene.strokeWidth}px</span>
              </div>
            )}
          </div>
        </aside>

        {/* Area di lavoro */}
        <main
          className={`flex-1 min-w-0 min-h-[50vh] md:min-h-0 bg-[#0b0c10] relative ${
            dragOver ? 'ring-2 ring-inset ring-emerald-400' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div ref={viewportRef} className="absolute inset-0 overflow-auto flex">
            {usedFallback && ready && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-md w-[calc(100%-2rem)] flex items-start gap-2 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs shadow-xl backdrop-blur">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  Il modello AI non è stato raggiunto (serve internet la prima volta): ho usato il metodo semplice,
                  che funziona bene solo con sfondi uniformi. Rifinisci con Pennello e Bacchetta oppure riprova.
                  <button
                    type="button"
                    onClick={() => lastSourceRef.current && runCutout(lastSourceRef.current.url, lastSourceRef.current.name)}
                    className="ml-2 font-bold underline hover:text-white"
                  >
                    Riprova con l'AI
                  </button>
                </div>
              </div>
            )}

            {status === 'processing' && (
              <div className="m-auto flex flex-col items-center gap-4 text-slate-200 p-6">
                <div className="w-14 h-14 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin shadow-lg" />
                <div className="text-center space-y-1">
                  <h4 className="text-base font-bold text-white">{progress.stage}</h4>
                  <p className="text-xs text-slate-400">Rilevamento profondo del soggetto e isolamento trasparente PNG</p>
                </div>
                <div className="w-64 h-2 bg-[#1e2332] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {status === 'empty' && (
              <div className="m-auto flex flex-col items-center gap-4 text-center p-6 max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Scissors className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">
                    {product ? `Nessuna foto per «${product.name}»` : 'Carica una foto da scontornare'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Trascina qui un'immagine oppure scegli un file: l'AI toglie lo sfondo in pochi secondi.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Carica Foto</span>
                  </button>
                  {onPickFromCatalog && (
                    <button
                      type="button"
                      onClick={onPickFromCatalog}
                      className="px-4 py-2 rounded-xl bg-[#202434] hover:bg-[#2a3044] text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4 text-cyan-300" />
                      <span>Scegli dal catalogo</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="m-auto flex flex-col items-center gap-3 text-center p-6 max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-rose-400" />
                </div>
                <h4 className="text-base font-bold text-white">Non sono riuscito a elaborare la foto</h4>
                <p className="text-xs text-slate-400">{errorMsg}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Carica un'altra foto</span>
                  </button>
                  {lastSourceRef.current && (
                    <button
                      type="button"
                      onClick={() => runCutout(lastSourceRef.current!.url, lastSourceRef.current!.name)}
                      className="px-4 py-2 rounded-xl bg-[#202434] hover:bg-[#2a3044] text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Riprova</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {ready && size && (
              <div className="m-auto p-6">
                <div
                  className={`relative shadow-2xl rounded-xl overflow-hidden border border-[#272b3b] ${
                    showGrid ? 'bg-transparency-grid' : ''
                  }`}
                  style={{ width: dispW, height: dispH }}
                >
                  <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={finishInteraction}
                    onPointerCancel={finishInteraction}
                    onPointerLeave={handlePointerLeave}
                    style={{
                      width: dispW,
                      height: dispH,
                      touchAction: activeFineTune !== 'none' ? 'none' : 'auto',
                    }}
                    className={`block ${activeFineTune !== 'none' ? 'cursor-crosshair' : 'cursor-default'}`}
                  />
                  <canvas
                    ref={overlayRef}
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: dispW, height: dispH }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Barra zoom */}
          {ready && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#171923]/90 backdrop-blur-md border border-[#272b3b] rounded-xl px-3 py-1.5 flex items-center gap-3 text-xs text-slate-300 shadow-xl z-20">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.3, Math.round((z - 0.1) * 100) / 100))}
                className="p-1 rounded hover:bg-[#232738] transition cursor-pointer"
                aria-label="Riduci zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-12 text-center font-mono font-bold text-emerald-400">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4, Math.round((z + 0.1) * 100) / 100))}
                className="p-1 rounded hover:bg-[#232738] transition cursor-pointer"
                aria-label="Aumenta zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="px-2 py-0.5 rounded hover:bg-[#232738] text-[11px] font-semibold text-slate-300 transition cursor-pointer"
              >
                100%
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
