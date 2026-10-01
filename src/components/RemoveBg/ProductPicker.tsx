import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, XCircle, Check, ImageOff } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { searchProducts } from '../../utils/productSearch';
import { hasRealImage } from '../../utils/bgRemoval/productImage';
import type { Product } from '../../types';

interface ProductPickerProps {
  /** true = selezione multipla (batch), false = si sceglie un solo prodotto */
  multiple: boolean;
  /** nasconde/blocca i prodotti senza foto (utile per il batch) */
  requireImage?: boolean;
  /** prodotti già in coda (non selezionabili di nuovo) */
  excludeIds?: Set<string>;
  onConfirm: (products: Product[]) => void;
  onClose: () => void;
}

const PAGE_SIZE = 60;

export const ProductPicker: React.FC<ProductPickerProps> = ({
  multiple,
  requireImage = false,
  excludeIds,
  onConfirm,
  onClose,
}) => {
  const { productsList } = useAdmin();
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Map<string, Product>>(new Map());

  const results = useMemo(() => searchProducts(productsList, query), [productsList, query]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query]);

  const isSelectable = (p: Product) =>
    !(excludeIds && excludeIds.has(p.id)) && (!requireImage || hasRealImage(p.image));

  const selectableResults = useMemo(
    () => results.filter(isSelectable),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results, requireImage, excludeIds]
  );

  const toggle = (p: Product) => {
    if (!isSelectable(p)) return;
    if (!multiple) {
      onConfirm([p]);
      return;
    }
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.set(p.id, p);
      return next;
    });
  };

  const selectAllResults = () => {
    setSelected((prev) => {
      const next = new Map(prev);
      selectableResults.forEach((p) => next.set(p.id, p));
      return next;
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-[#0d1420] border border-[#1c2433] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[#1c2433] flex items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white">
              {multiple ? 'Scegli i prodotti da scontornare' : 'Scegli il prodotto da ritoccare'}
            </h3>
            <p className="text-xs text-slate-400">
              {multiple
                ? 'Seleziona uno o più articoli: la foto attuale verrà messa in coda.'
                : 'Si apre la foto attuale del prodotto.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-[#1a2230] transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 pb-2 shrink-0 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per nome, codice/SKU, categoria o marca..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#0d1420] border border-[#1c2433] rounded-lg text-white text-sm outline-none focus:border-emerald-400/60 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                aria-label="Cancella ricerca"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {results.length} articol{results.length === 1 ? 'o' : 'i'}
              {query ? ` trovati su ${productsList.length}` : ''}
            </span>
            {multiple && selectableResults.length > 0 && (
              <button
                type="button"
                onClick={selectAllResults}
                className="font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Seleziona tutti i risultati ({selectableResults.length})
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
          {results.slice(0, visible).map((p) => {
            const ok = isSelectable(p);
            const checked = selected.has(p.id);
            const alreadyIn = !!excludeIds && excludeIds.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={!ok}
                onClick={() => toggle(p)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                  checked
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : ok
                    ? 'border-[#1c2433] bg-[#0d1420] hover:border-emerald-500/40'
                    : 'border-[#1c2433] bg-[#0d1420] opacity-45 cursor-not-allowed'
                }`}
              >
                {hasRealImage(p.image) ? (
                  <img
                    src={p.image}
                    alt=""
                    className="w-11 h-11 rounded-lg object-contain bg-[#0e1b30]/40 border border-[#1c2433] shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-[#0e1b30]/40 border border-[#1c2433] flex items-center justify-center shrink-0">
                    <ImageOff className="w-5 h-5 text-slate-600" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{p.code}</span>
                    <span className="text-[11px] text-slate-500 truncate">{p.category}</span>
                  </div>
                  <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                  {alreadyIn && <div className="text-[11px] text-amber-400">Già in coda</div>}
                  {!alreadyIn && requireImage && !hasRealImage(p.image) && (
                    <div className="text-[11px] text-slate-500">Nessuna foto da elaborare</div>
                  )}
                </div>
                {multiple && (
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                      checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5 text-slate-950" />}
                  </div>
                )}
              </button>
            );
          })}
          {results.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Nessun articolo trovato per questa ricerca.</p>
          )}
          {visible < results.length && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="px-3 py-1.5 rounded-lg bg-[#0d1420] hover:bg-[#1a2230] text-slate-300 text-sm font-medium border border-[#1c2433] transition-colors"
              >
                Carica altri ({results.length - visible} rimanenti)
              </button>
            </div>
          )}
        </div>

        {multiple && (
          <div className="p-4 border-t border-[#1c2433] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSelected(new Map())}
              disabled={selected.size === 0}
              className="text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40"
            >
              Deseleziona tutto
            </button>
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => onConfirm(Array.from(selected.values()))}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors disabled:opacity-40"
            >
              Aggiungi alla coda ({selected.size})
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
