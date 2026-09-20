import React, { useState } from 'react';
import { ImageOff, AlertTriangle, PlayCircle, Download, Loader2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

interface AuditRow {
  id: string;
  name: string;
  code?: string;
  category: string;
  reason: 'Mancante' | 'Non si carica';
}

/**
 * Controlla, direttamente nel browser di chi lo usa (quindi con accesso
 * reale a internet per verificare i link), quali prodotti non hanno
 * un'immagine oppure hanno un indirizzo immagine che non si apre più
 * (link rotto/corrotto). Non modifica nulla: è solo un controllo.
 */
export const ImageAuditPanel: React.FC = () => {
  const { productsList } = useAdmin();
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AuditRow[]>([]);

  const checkOne = (url: string): Promise<boolean> =>
    new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => resolve(false), 8000); // timeout = considerata rotta
      img.onload = () => {
        clearTimeout(timer);
        resolve(true);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      img.referrerPolicy = 'no-referrer';
      img.src = url;
    });

  const runAudit = async () => {
    setStatus('running');
    setProgress(0);
    const found: AuditRow[] = [];
    const total = productsList.length;
    const CONCURRENCY = 6;
    let index = 0;

    const worker = async () => {
      while (index < productsList.length) {
        const current = productsList[index];
        index += 1;
        if (!current.image || current.image.trim() === '') {
          found.push({
            id: current.id,
            name: current.name,
            code: current.code,
            category: current.category,
            reason: 'Mancante',
          });
        } else {
          const ok = await checkOne(current.image);
          if (!ok) {
            found.push({
              id: current.id,
              name: current.name,
              code: current.code,
              category: current.category,
              reason: 'Non si carica',
            });
          }
        }
        setProgress(Math.round((index / total) * 100));
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    found.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    setResults(found);
    setStatus('done');
  };

  const exportCsv = () => {
    const header = 'Nome;Codice;Categoria;Problema\n';
    const rows = results
      .map((r) => `${r.name.replace(/;/g, ',')};${r.code ?? ''};${r.category.replace(/;/g, ',')};${r.reason}`)
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prodotti_senza_immagine.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0d1420] border border-[#1c2433] rounded-2xl p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
            <ImageOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Controllo immagini prodotto</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Verifica quali prodotti non hanno una foto o hanno un link immagine rotto.
            </p>
          </div>
        </div>

        {status !== 'running' && (
          <button
            type="button"
            onClick={runAudit}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold transition-colors shrink-0"
          >
            <PlayCircle className="w-4 h-4" />
            {status === 'done' ? 'Ricontrolla' : 'Avvia controllo'}
          </button>
        )}
      </div>

      {status === 'running' && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Controllo in corso… {progress}% ({productsList.length} prodotti totali)</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#0e1b30] overflow-hidden">
            <div className="h-full bg-sky-500 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              {results.length === 0
                ? 'Nessun problema trovato: tutte le immagini si caricano correttamente.'
                : `${results.length} prodotti con problemi su ${productsList.length} totali`}
            </div>
            {results.length > 0 && (
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1b30] hover:bg-[#1a2230] border border-[#1c2433] text-slate-300 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Esporta CSV
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div className="max-h-96 overflow-y-auto rounded-xl border border-[#1c2433]">
              <table className="w-full text-xs">
                <thead className="bg-[#0e1b30] sticky top-0">
                  <tr className="text-left text-slate-400">
                    <th className="px-3 py-2 font-semibold">Prodotto</th>
                    <th className="px-3 py-2 font-semibold">Codice</th>
                    <th className="px-3 py-2 font-semibold">Categoria</th>
                    <th className="px-3 py-2 font-semibold">Problema</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-t border-[#1c2433] text-slate-300">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 font-mono text-slate-500">{r.code ?? '—'}</td>
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                            r.reason === 'Mancante'
                              ? 'bg-slate-500/15 text-slate-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {r.reason}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
