import React, { useMemo, useRef, useState } from 'react';
import { Download, Pause, Play, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { getSupabase } from '../services/supabase';
import { isSupplierImage } from '../utils/imageFirst';
import { Product } from '../types';

/**
 * COPIA FOTO FORNITORE
 * Le foto dei prodotti importati da Yollgo sono collegate al loro sito e spesso non si vedono.
 * Questo strumento le scarica (passando dal nostro server), le salva nel nostro spazio
 * e le collega al prodotto. Se una foto non si può scaricare, il prodotto resta senza foto
 * (così non compare un riquadro vuoto) e si può sistemare con "Trova immagine".
 */

const CONCURRENCY = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversione non riuscita'))), 'image/jpeg', 0.88)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Outcome = 'ok' | 'fail' | 'retry';

export const SupplierPhotosPanel: React.FC = () => {
  const { baseProductsList, updateProduct } = useAdmin();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const [status, setStatus] = useState('');
  const stopRef = useRef(false);

  const todo = useMemo(() => baseProductsList.filter((p) => isSupplierImage(p.image)), [baseProductsList]);

  const copyOne = async (p: Product): Promise<Outcome> => {
    const sb = getSupabase();
    if (!sb) return 'retry';
    let resp: Response;
    try {
      resp = await fetch(`/api/image-proxy?url=${encodeURIComponent(p.image)}`);
    } catch {
      return 'retry';
    }
    if (resp.status === 429) return 'retry';
    if (!resp.ok) {
      // foto non scaricabile: tolgo il collegamento rotto, così non si vede un riquadro vuoto
      updateProduct({ ...p, image: '' });
      return 'fail';
    }
    try {
      const jpeg = await toJpeg(await resp.blob());
      const path = `fornitore/${p.id}.jpg`;
      const { error } = await sb.storage.from('aurora-images').upload(path, jpeg, { upsert: true, contentType: 'image/jpeg' });
      if (error) return 'retry';
      const url = sb.storage.from('aurora-images').getPublicUrl(path).data.publicUrl;
      updateProduct({ ...p, image: url });
      return 'ok';
    } catch {
      updateProduct({ ...p, image: '' });
      return 'fail';
    }
  };

  const start = async () => {
    if (running || todo.length === 0) return;
    stopRef.current = false;
    setRunning(true);
    setStatus('');
    const queue = [...todo];
    const worker = async () => {
      while (queue.length && !stopRef.current) {
        const p = queue.shift()!;
        let outcome = await copyOne(p);
        // il server ha un limite di richieste: se si raggiunge, aspetto e riprovo
        let tries = 0;
        while (outcome === 'retry' && !stopRef.current && tries < 6) {
          setStatus('Pausa automatica di un minuto (limite del server), poi riprendo da solo…');
          await sleep(60000);
          setStatus('');
          outcome = await copyOne(p);
          tries++;
        }
        if (outcome === 'ok') setDone((n) => n + 1);
        else setFailed((n) => n + 1);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
    setStatus(stopRef.current ? 'In pausa: premi "Avvia" per continuare da dove eri.' : 'Finito.');
  };

  const total = todo.length + done + failed;
  const pct = total ? Math.round(((done + failed) / total) * 100) : 100;

  return (
    <div className="p-4 sm:p-6 space-y-4 text-left text-sm">
      <div className="bg-[#0d1420] border border-[#1c2433] rounded-2xl p-4 sm:p-5 space-y-3">
        <p className="text-white font-semibold">
          Foto ancora collegate al sito del fornitore: <span className="text-amber-300">{todo.length}</span>
        </p>
        <p className="text-xs text-slate-400">
          Queste foto spesso non si vedono perché il sito del fornitore non le mostra fuori dal suo catalogo. Premendo
          "Avvia", l'app le scarica una per una, le salva nel tuo spazio e le collega al prodotto. Puoi lasciarla lavorare
          da sola con questa pagina aperta (meglio dal computer): se il server chiede una pausa, aspetta e riprende in
          automatico. Se una foto non si può scaricare, il prodotto resta senza foto e lo sistemi con "Trova immagine".
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {!running ? (
            <button
              type="button"
              onClick={start}
              disabled={todo.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold"
            >
              <Play className="w-4 h-4" /> Avvia
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (stopRef.current = true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16213a] border border-[#26324a] text-white text-sm font-semibold"
            >
              <Pause className="w-4 h-4" /> Pausa
            </button>
          )}
          {running && <Loader2 className="w-4 h-4 text-sky-300 animate-spin" />}
        </div>

        {(running || done > 0 || failed > 0) && (
          <div className="space-y-1.5">
            <div className="h-2 rounded-full bg-[#16213a] overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Copiate: {done}
              </span>
              <span className="flex items-center gap-1 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" /> Non scaricabili: {failed}
              </span>
              <span>Rimaste: {todo.length}</span>
            </p>
          </div>
        )}
        {status && (
          <p className="text-xs text-sky-300 flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> {status}
          </p>
        )}
      </div>
    </div>
  );
};
