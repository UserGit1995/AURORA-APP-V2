import React, { useEffect, useState } from 'react';
import { BookOpen, Upload, Trash2, Eye, EyeOff, Loader2, FileText, Pencil, Check, X } from 'lucide-react';
import { loadScript } from '../utils/loadScript';
import {
  Flyer,
  fetchAllFlyers,
  insertFlyer,
  updateFlyer,
  deleteFlyer,
  uploadFlyerPage,
  shortDate,
} from '../services/flyers';

const MAX_WIDTH = 1600; // larghezza delle pagine salvate (buona per lo zoom, file leggeri)
const inputCls =
  'w-full bg-[#0d1420] border border-[#1c2433] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500';
const labelCls = 'block text-xs font-semibold text-slate-400 mb-1';
const cardCls = 'bg-[#111a2b] border border-[#1c2433] rounded-xl';

const canvasToJpeg = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversione non riuscita'))), 'image/jpeg', 0.88)
  );

/** Trasforma ogni pagina del PDF in un'immagine */
async function pdfToImages(file: File, onProgress: (done: number, total: number) => void): Promise<Blob[]> {
  await loadScript('/vendor/pdf.min.js');
  const pdfjs = (window as any).pdfjsLib;
  pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const out: Blob[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: MAX_WIDTH / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    out.push(await canvasToJpeg(canvas));
    onProgress(i, pdf.numPages);
  }
  return out;
}

/** Ridimensiona un'immagine caricata e la salva in JPG */
async function imageToJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error(`Immagine non valida: ${file.name}`));
      i.src = url;
    });
    const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await canvasToJpeg(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const newId = () =>
  (crypto as any).randomUUID?.() ||
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

export const FlyerAdminPanel: React.FC = () => {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [loadError, setLoadError] = useState('');
  const [title, setTitle] = useState('Volantino offerte');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [replaceOld, setReplaceOld] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: '', validFrom: '', validTo: '' });

  const reload = async () => {
    const res = await fetchAllFlyers();
    setFlyers(res.flyers);
    setLoadError(res.error ? res.error : '');
  };

  useEffect(() => {
    reload();
  }, []);

  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list).sort((a, b) => a.name.localeCompare(b.name, 'it', { numeric: true }));
    setFiles(arr);
    setError('');
    setOkMsg('');
  };

  const publish = async () => {
    setError('');
    setOkMsg('');
    if (files.length === 0) return setError('Scegli il PDF del volantino oppure le immagini delle pagine.');
    if (validFrom && validTo && validTo < validFrom) return setError('La data di fine deve essere dopo quella di inizio.');
    const pdfs = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length > 1) return setError('Carica un solo PDF alla volta.');

    setBusy(true);
    try {
      let blobs: Blob[] = [];
      if (pdfs.length === 1) {
        setProgress('Preparazione delle pagine del PDF…');
        blobs = await pdfToImages(pdfs[0], (d, t) => setProgress(`Preparazione pagine: ${d} di ${t}`));
      } else {
        for (let i = 0; i < files.length; i++) {
          setProgress(`Preparazione pagine: ${i + 1} di ${files.length}`);
          blobs.push(await imageToJpeg(files[i]));
        }
      }

      const id = newId();
      const urls: string[] = [];
      for (let i = 0; i < blobs.length; i++) {
        setProgress(`Caricamento pagine: ${i + 1} di ${blobs.length}`);
        urls.push(await uploadFlyerPage(id, i, blobs[i]));
      }

      setProgress('Pubblicazione…');
      if (replaceOld) {
        for (const f of flyers.filter((x) => x.active)) await updateFlyer(f.id, { active: false });
      }
      await insertFlyer({
        id,
        title: title.trim() || 'Volantino offerte',
        validFrom: validFrom || null,
        validTo: validTo || null,
        pages: urls,
        active: true,
      });
      setOkMsg(`Volantino pubblicato (${urls.length} pagine). È già visibile nella home.`);
      setFiles([]);
      await reload();
    } catch (e: any) {
      setError(`Non è stato possibile pubblicare il volantino: ${e?.message || e}`);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const toggleActive = async (f: Flyer) => {
    try {
      await updateFlyer(f.id, { active: !f.active });
      await reload();
    } catch (e: any) {
      alert(`Operazione non riuscita: ${e?.message || e}`);
    }
  };

  const remove = async (f: Flyer) => {
    if (!confirm(`Eliminare definitivamente "${f.title}"?`)) return;
    try {
      await deleteFlyer(f);
      await reload();
    } catch (e: any) {
      alert(`Eliminazione non riuscita: ${e?.message || e}`);
    }
  };

  const startEdit = (f: Flyer) => {
    setEditingId(f.id);
    setEdit({ title: f.title, validFrom: f.validFrom || '', validTo: f.validTo || '' });
  };

  const saveEdit = async (f: Flyer) => {
    try {
      await updateFlyer(f.id, {
        title: edit.title.trim() || 'Volantino offerte',
        validFrom: edit.validFrom || null,
        validTo: edit.validTo || null,
      });
      setEditingId(null);
      await reload();
    } catch (e: any) {
      alert(`Salvataggio non riuscito: ${e?.message || e}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left text-sm">
      <div className={`${cardCls} p-4 space-y-4`}>
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Upload className="w-4 h-4 text-sky-400" />
          Carica un nuovo volantino
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className={labelCls}>Titolo</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Valido dal</label>
            <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Valido fino al</label>
            <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>File del volantino</label>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#1c2433] hover:border-sky-500 rounded-xl p-6 cursor-pointer text-center">
            <FileText className="w-6 h-6 text-sky-400" />
            <span className="text-sm text-white font-semibold">Scegli il PDF oppure le immagini delle pagine</span>
            <span className="text-xs text-slate-500">
              PDF (tutte le pagine vengono preparate da sole) oppure JPG/PNG, una per pagina, in ordine di nome
            </span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => onPickFiles(e.target.files)}
              disabled={busy}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 text-xs text-slate-300 space-y-0.5">
              {files.map((f) => (
                <li key={f.name} className="truncate">
                  • {f.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={replaceOld} onChange={(e) => setReplaceOld(e.target.checked)} className="accent-sky-500" />
          <span className="text-xs text-slate-300">Togli dalla home il volantino precedente (resta in archivio)</span>
        </label>

        {progress && (
          <p className="text-xs text-sky-300 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {progress}
          </p>
        )}
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {okMsg && <p className="text-xs text-emerald-400">{okMsg}</p>}

        <button
          type="button"
          onClick={publish}
          disabled={busy || files.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          Pubblica volantino
        </button>
      </div>

      <div className={`${cardCls} p-4 space-y-3`}>
        <h3 className="text-sm font-semibold text-white">Volantini caricati ({flyers.length})</h3>
        {loadError && (
          <p className="text-xs text-rose-400">
            Elenco non disponibile ({loadError}). Se è la prima volta, esegui su Supabase lo script supabase/volantino.sql.
          </p>
        )}
        {!loadError && flyers.length === 0 && <p className="text-xs text-slate-500">Nessun volantino caricato.</p>}

        <div className="space-y-2">
          {flyers.map((f) => (
            <div key={f.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#0d1420] border border-[#1c2433] rounded-lg p-3">
              {f.pages[0] && (
                <img src={f.pages[0]} alt="" className="w-14 h-20 object-cover rounded-md border border-[#1c2433] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {editingId === f.id ? (
                  <div className="space-y-2">
                    <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className={inputCls} />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={edit.validFrom}
                        onChange={(e) => setEdit({ ...edit, validFrom: e.target.value })}
                        className={inputCls}
                      />
                      <input
                        type="date"
                        value={edit.validTo}
                        onChange={(e) => setEdit({ ...edit, validTo: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white font-semibold truncate">{f.title}</span>
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                          f.active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                        }`}
                      >
                        {f.active ? 'In home' : 'Nascosto'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {f.pages.length} pagine
                      {f.validFrom || f.validTo
                        ? ` · valido ${f.validFrom ? `dal ${shortDate(f.validFrom)} ` : ''}${f.validTo ? `al ${shortDate(f.validTo)}` : ''}`
                        : ''}
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {editingId === f.id ? (
                  <>
                    <button type="button" onClick={() => saveEdit(f)} title="Salva" className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} title="Annulla" className="p-2 rounded-lg bg-[#161f30] text-slate-300">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleActive(f)}
                      title={f.active ? 'Nascondi dalla home' : 'Mostra in home'}
                      className={`p-2 rounded-lg ${f.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}
                    >
                      {f.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button type="button" onClick={() => startEdit(f)} title="Modifica titolo e date" className="p-2 rounded-lg bg-[#161f30] text-slate-300 hover:text-white">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => remove(f)} title="Elimina" className="p-2 rounded-lg bg-rose-500/15 text-rose-400 hover:text-rose-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">
          In home viene mostrato il volantino più recente tra quelli con l'occhio verde.
        </p>
      </div>
    </div>
  );
};
