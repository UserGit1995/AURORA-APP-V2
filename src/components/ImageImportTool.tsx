import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Check, X, AlertTriangle, Search } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Product } from '../types';

interface ParsedRow {
  sourceName: string;
  imageUrl: string;
  matchedProductId: string | null;
  confidence: number; // 0-100
  confirmed: boolean;
}

// Similarità semplice tra due stringhe (normalizzate), sufficiente per
// suggerire abbinamenti senza applicarli mai automaticamente da sola.
function similarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  let common = 0;
  wordsA.forEach((w) => { if (wordsB.has(w) && w.length > 1) common++; });
  const total = Math.max(wordsA.size, wordsB.size);
  return total > 0 ? Math.round((common / total) * 100) : 0;
}

function parseCsv(text: string): { name: string; imageUrl: string }[] {
  const sep = text.includes(';') && !text.includes(',') ? ';' : ',';
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase().split(sep).map((h) => h.trim().replace(/^"|"$/g, ''));
  const nameIdx = header.findIndex((h) => h.includes('nome') || h.includes('name') || h.includes('descrizione'));
  const urlIdx = header.findIndex((h) => h.includes('immagine') || h.includes('image') || h.includes('foto') || h.includes('url'));
  const startRow = nameIdx !== -1 && urlIdx !== -1 ? 1 : 0;
  const nIdx = nameIdx !== -1 ? nameIdx : 0;
  const uIdx = urlIdx !== -1 ? urlIdx : 1;

  return lines.slice(startRow).map((line) => {
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    return { name: cols[nIdx] || '', imageUrl: cols[uIdx] || '' };
  }).filter((r) => r.name && r.imageUrl);
}

export const ImageImportTool: React.FC = () => {
  const { productsList, updateProduct } = useAdmin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(0);
  const [searchOverride, setSearchOverride] = useState<Record<number, string>>({});

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCsv(text);
      const withMatches: ParsedRow[] = parsed.map((p) => {
        let best: Product | null = null;
        let bestScore = 0;
        for (const prod of productsList) {
          const score = similarity(p.name, prod.name);
          if (score > bestScore) {
            bestScore = score;
            best = prod;
          }
        }
        return {
          sourceName: p.name,
          imageUrl: p.imageUrl,
          matchedProductId: best?.id || null,
          confidence: bestScore,
          confirmed: bestScore >= 70, // solo le corrispondenze molto forti partono già spuntate
        };
      });
      setRows(withMatches);
      setApplied(0);
    };
    reader.readAsText(file, 'utf-8');
  };

  const productById = (id: string | null) => productsList.find((p) => p.id === id) || null;

  const toggleConfirm = (idx: number) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, confirmed: !r.confirmed } : r)));
  };

  const overrideMatch = (idx: number, productId: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, matchedProductId: productId, confidence: 100, confirmed: true } : r)));
  };

  const handleApply = () => {
    setApplying(true);
    let count = 0;
    for (const row of rows) {
      if (!row.confirmed || !row.matchedProductId) continue;
      const product = productById(row.matchedProductId);
      if (!product) continue;
      updateProduct({ ...product, image: row.imageUrl });
      count++;
    }
    setApplied(count);
    setApplying(false);
  };

  const confirmedCount = rows.filter((r) => r.confirmed).length;

  return (
    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-amber-400" />
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Importa immagini in blocco</h3>
      </div>

      <div className="bg-[#08152b] border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
        <p>Carica un file CSV con almeno due colonne: <b className="text-white">Nome</b> e <b className="text-white">Immagine</b> (link o percorso).</p>
        <p>Ogni riga viene confrontata con i tuoi articoli già caricati. <b className="text-amber-300">Nulla si applica finché non confermi</b> — controlla ogni abbinamento prima.</p>
      </div>

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Scegli file CSV
        </button>
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between bg-[#071329] border border-slate-800 rounded-xl p-3">
            <span className="text-xs text-slate-300">
              {rows.length} righe lette — <b className="text-amber-300">{confirmedCount}</b> pronte per essere applicate
            </span>
            <button
              onClick={handleApply}
              disabled={applying || confirmedCount === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Applica {confirmedCount} immagini confermate
            </button>
          </div>

          {applied > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl p-3">
              ✓ {applied} immagini salvate.
            </div>
          )}

          <div className="space-y-2">
            {rows.map((row, idx) => {
              const matched = productById(row.matchedProductId);
              const isStrong = row.confidence >= 70;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs flex items-center gap-3 ${
                    row.confirmed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 bg-[#071329]'
                  }`}
                >
                  <img src={row.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-900 shrink-0" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.2')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 truncate">File: <span className="text-slate-200">{row.sourceName}</span></p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {isStrong ? (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                      <span className={`truncate ${isStrong ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {matched ? matched.name : 'Nessuna corrispondenza trovata'} ({row.confidence}%)
                      </span>
                    </div>
                    <select
                      value={row.matchedProductId || ''}
                      onChange={(e) => overrideMatch(idx, e.target.value)}
                      className="mt-1.5 w-full bg-[#0c1c38] border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white outline-none"
                    >
                      <option value="">— Correggi manualmente, scegli il prodotto giusto —</option>
                      {productsList.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => toggleConfirm(idx)}
                    disabled={!row.matchedProductId}
                    className={`shrink-0 p-2 rounded-lg ${
                      row.confirmed ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                    } disabled:opacity-30`}
                    title={row.confirmed ? 'Confermato — clicca per annullare' : 'Conferma questo abbinamento'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
