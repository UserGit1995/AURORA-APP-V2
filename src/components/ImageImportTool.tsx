import React, { useState, useRef } from 'react';
import { Upload, FolderOpen, Image as ImageIcon, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
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

// Stessa identica compressione usata da ProductImageUploader.tsx (ridimensiona
// e ricomprime lato browser), così le immagini in blocco restano leggere.
function processAndResizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const MAX_DIM = 900;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_DIM) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
          } else {
            if (height > MAX_DIM) { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(dataUrl); return; }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => reject(new Error('Immagine non leggibile'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('File non leggibile'));
    reader.readAsDataURL(file);
  });
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

export const ImageImportTool: React.FC = () => {
  const { productsList, updateProduct } = useAdmin();
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(0);
  const [isReadingFolder, setIsReadingFolder] = useState(false);
  const [folderProgress, setFolderProgress] = useState({ done: 0, total: 0 });

  const matchRows = (parsed: { name: string; imageUrl: string }[]) => {
    const withMatches: ParsedRow[] = parsed.map((p) => {
      let best: Product | null = null;
      let bestScore = 0;
      for (const prod of productsList) {
        const score = similarity(p.name, prod.name);
        if (score > bestScore) { bestScore = score; best = prod; }
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

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => matchRows(parseCsv(String(reader.result || '')));
    reader.readAsText(file, 'utf-8');
  };

  // Legge un'intera cartella scelta dal PC (con le sue sottocartelle per
  // marca): ogni immagine diventa una riga da abbinare, esattamente come per
  // il CSV. Il nome del prodotto è il nome del file (senza estensione).
  const handleFolder = async (fileList: FileList) => {
    const imageFiles = Array.from(fileList).filter((f) => IMAGE_EXT.test(f.name));
    if (imageFiles.length === 0) return;
    setIsReadingFolder(true);
    setFolderProgress({ done: 0, total: imageFiles.length });

    const parsed: { name: string; imageUrl: string }[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      try {
        const dataUri = await processAndResizeImage(file);
        const name = file.name.replace(IMAGE_EXT, '').replace(/[_-]+/g, ' ').trim();
        parsed.push({ name, imageUrl: dataUri });
      } catch {
        // immagine illeggibile: la saltiamo
      }
      if (i % 10 === 0 || i === imageFiles.length - 1) {
        setFolderProgress({ done: i + 1, total: imageFiles.length });
        // lascia respirare l'interfaccia ogni tanto invece di bloccarla
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    matchRows(parsed);
    setIsReadingFolder(false);
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
      // Aggiorna SOLO l'immagine: nome, prezzo, categoria e tutto il resto
      // del prodotto restano esattamente come sono, non vengono toccati.
      updateProduct({ ...product, image: row.imageUrl });
      count++;
    }
    setApplied(count);
    setApplying(false);
  };

  const confirmedCount = rows.filter((r) => r.confirmed).length;
  const unmatchedCount = rows.filter((r) => !r.matchedProductId).length;

  return (
    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-sky-600" />
        <h3 className="text-sm font-bold text-slate-900">Importa immagini in blocco</h3>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 space-y-2">
        <p>
          Scegli la cartella con le foto salvate sul tuo PC (va bene anche con le sottocartelle per marca) oppure un
          file CSV con colonne <b className="text-slate-900">Nome</b> e <b className="text-slate-900">Immagine</b>.
        </p>
        <p>
          Ogni foto viene confrontata con i tuoi articoli già caricati.{' '}
          <b className="text-amber-600">Non viene applicato nulla finché non confermi tu</b> — controlla ogni
          abbinamento prima. Solo l'immagine viene aggiornata: nome, prezzo, categoria e tutto il resto del prodotto
          restano invariati.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <input
          ref={folderRef}
          type="file"
          // @ts-ignore - attributo non standard ma supportato dai browser Chromium/Safari
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) handleFolder(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => folderRef.current?.click()}
          disabled={isReadingFolder}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2"
        >
          {isReadingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
          {isReadingFolder ? `Leggo le foto… ${folderProgress.done}/${folderProgress.total}` : 'Scegli cartella immagini dal PC'}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleCsvFile(f);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isReadingFolder}
          className="px-4 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          oppure scegli file CSV
        </button>
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-3">
            <span className="text-xs text-slate-600">
              {rows.length} immagini lette — <b className="text-emerald-600">{confirmedCount}</b> pronte da applicare
              {unmatchedCount > 0 && <span className="text-amber-600"> · {unmatchedCount} senza corrispondenza</span>}
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
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3">
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
                    row.confirmed ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <img src={row.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.2')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 truncate">File: <span className="text-slate-700">{row.sourceName}</span></p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {isStrong ? (
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                      )}
                      <span className={`truncate ${isStrong ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {matched ? matched.name : 'Nessuna corrispondenza trovata'} ({row.confidence}%)
                      </span>
                    </div>
                    <select
                      value={row.matchedProductId || ''}
                      onChange={(e) => overrideMatch(idx, e.target.value)}
                      className="mt-1.5 w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-900 outline-none"
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
                      row.confirmed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
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
