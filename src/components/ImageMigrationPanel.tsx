import React, { useState } from 'react';
import { HardDriveDownload, AlertTriangle, PlayCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { getSupabase } from '../services/supabase';

interface FailRow {
  name: string;
  error: string;
}

/**
 * Le immagini caricate con "Importa immagini" vengono salvate come testo
 * (base64) dentro la riga del prodotto: con centinaia/migliaia di prodotti
 * così, il catalogo diventa pesantissimo da scaricare per il telefono
 * (spesso con RAM e rete più limitate di un PC), ed è la causa più probabile
 * per cui le immagini non compaiono da mobile.
 *
 * Questo strumento sposta ogni immagine base64 in un file vero nello
 * Storage di Supabase (bucket aurora-images) e lascia nel prodotto solo
 * il link leggero, com'è già per le immagini caricate in altri modi.
 * Non tocca in alcun modo prodotti che hanno già un link normale.
 */
export const ImageMigrationPanel: React.FC = () => {
  const { productsList, updateProduct } = useAdmin();
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [migrated, setMigrated] = useState(0);
  const [fails, setFails] = useState<FailRow[]>([]);

  const candidates = productsList.filter((p) => p.image && p.image.startsWith('data:image'));

  const dataUrlToBlob = (dataUrl: string): { blob: Blob; ext: string } => {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/data:(.*);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { blob: new Blob([bytes], { type: mime }), ext };
  };

  const runMigration = async () => {
    const sb = getSupabase();
    if (!sb) return;

    setStatus('running');
    setProgress(0);
    setMigrated(0);
    setFails([]);

    let done = 0;
    const total = candidates.length;
    const failList: FailRow[] = [];

    for (const product of candidates) {
      try {
        const { blob, ext } = dataUrlToBlob(product.image);
        const path = `migrated/${product.id}.${ext}`;
        const { error: uploadError } = await sb.storage
          .from('aurora-images')
          .upload(path, blob, { upsert: true, contentType: blob.type });

        if (uploadError) throw uploadError;

        const { data: pub } = sb.storage.from('aurora-images').getPublicUrl(path);
        updateProduct({ ...product, image: pub.publicUrl });
        setMigrated((m) => m + 1);
      } catch (e: any) {
        failList.push({ name: product.name, error: e?.message ?? 'errore sconosciuto' });
      }
      done += 1;
      setProgress(Math.round((done / total) * 100));
    }

    setFails(failList);
    setStatus('done');
  };

  return (
    <div className="bg-[#0d1420] border border-[#1c2433] rounded-2xl p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
            <HardDriveDownload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Alleggerisci immagini (fix caricamento da mobile)</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {candidates.length === 0
                ? 'Nessuna immagine "pesante" trovata: il catalogo è già leggero.'
                : `${candidates.length} prodotti hanno l'immagine salvata dentro la scheda (pesante) invece che come link.`}
            </p>
          </div>
        </div>

        {status !== 'running' && candidates.length > 0 && (
          <button
            type="button"
            onClick={runMigration}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shrink-0"
          >
            <PlayCircle className="w-4 h-4" />
            {status === 'done' ? 'Rilancia' : 'Avvia alleggerimento'}
          </button>
        )}
      </div>

      {status === 'running' && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>
              In corso… {progress}% ({migrated}/{candidates.length} spostate) — non chiudere questa pagina.
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#0e1b30] overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="mt-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {migrated} immagini alleggerite correttamente
          </div>
          {fails.length > 0 && (
            <div className="mt-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                {fails.length} non riuscite (nessun dato perso, riprova più tardi su queste)
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-[#1c2433] text-xs">
                {fails.map((f, i) => (
                  <div key={i} className="px-3 py-1.5 border-t border-[#1c2433] first:border-t-0 text-slate-300">
                    {f.name} — <span className="text-slate-500">{f.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
