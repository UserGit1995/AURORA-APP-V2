import React, { useState } from 'react';
import { 
  Scale, 
  X, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Boxes, 
  Droplet, 
  FileSpreadsheet, 
  SlidersHorizontal,
  Info,
  ExternalLink,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

interface CompareViewProps {
  comparedProducts: Product[];
  allProducts: Product[];
  onRemoveFromCompare: (productId: string) => void;
  onClearCompare: () => void;
  onToggleCompare: (productId: string) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  onSelectProduct: (product: Product) => void;
  onBackToHome: () => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  comparedProducts,
  allProducts,
  onRemoveFromCompare,
  onClearCompare,
  onToggleCompare,
  onAddToCart,
  onSelectProduct,
  onBackToHome,
}) => {
  const [highlightDifferences, setHighlightDifferences] = useState(false);
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const handleAddToCartLocal = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onAddToCart(product);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1500);
  };

  // Helper to check if a spec row differs between items
  const isRowDifferent = (values: (string | number | undefined)[]) => {
    if (values.length <= 1) return false;
    const first = JSON.stringify(values[0]);
    return values.some((val) => JSON.stringify(val) !== first);
  };

  // Products available to add to comparison (not currently in compared list)
  const availableToAdd = allProducts.filter(
    (p) => !comparedProducts.some((cp) => cp.id === p.id)
  );

  return (
    <div className="w-full animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/25">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Confronto Specifiche & Schede Tecniche
              </h2>
              {comparedProducts.length > 0 && (
                <span className="text-xs font-bold bg-[#112444] text-sky-300 px-2.5 py-1 rounded-full border border-[#1d3d6e]">
                  {comparedProducts.length} referenze
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Analisi comparativa affiancata di dosaggi, formati, certificazioni HACCP e prezzi all'ingrosso.
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onBackToHome}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 px-3.5 py-2 rounded-xl bg-[#0a182e] border border-[#173056] hover:border-sky-500/40 transition-colors"
          >
            ← Torna al catalogo
          </button>

          {comparedProducts.length > 0 && (
            <button
              id="clear-all-compare-btn"
              onClick={onClearCompare}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-300 px-3.5 py-2 rounded-xl bg-[#091325] border border-[#162846] hover:border-rose-500/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Svuota lista</span>
            </button>
          )}

          {comparedProducts.length < 4 && (
            <button
              id="open-add-product-picker-btn"
              onClick={() => setIsAddPickerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi prodotto ({comparedProducts.length}/4)</span>
            </button>
          )}
        </div>
      </div>

      {/* When Empty (0 products) */}
      {comparedProducts.length === 0 ? (
        <div className="bg-[#081326] border border-[#142646] rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-4">
            <Scale className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
            Nessun prodotto selezionato per il confronto
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            Seleziona fino a 4 articoli dal catalogo cliccando sul pulsante <strong>"Confronta"</strong> su qualsiasi scheda prodotto per visualizzare le loro specifiche tecniche e prezzi affiancati.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <button
              id="compare-explore-catalog-btn"
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Esplora Catalogo Prodotti</span>
            </button>
            <button
              id="compare-quick-picker-open"
              onClick={() => setIsAddPickerOpen(true)}
              className="inline-flex items-center gap-2 bg-[#0d1e38] hover:bg-[#142e54] text-sky-300 border border-[#1c3c6a] text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Scegli referenze da confrontare</span>
            </button>
          </div>

          {/* Quick suggestions to compare */}
          <div className="w-full max-w-3xl pt-6 border-t border-[#122340]">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-left">
              Suggeriti per il confronto rapido:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {allProducts.slice(0, 3).map((prod) => (
                <div
                  key={prod.id}
                  className="bg-[#050c18] border border-[#142848] rounded-2xl p-3 flex items-center justify-between gap-3 text-left"
                >
                  <img
                    src={prod.image}
                    alt={prod.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 object-contain rounded-lg bg-[#09152b] p-1 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{prod.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">€{prod.price.toFixed(2)} +IVA</p>
                  </div>
                  <button
                    id={`quick-add-compare-${prod.id}`}
                    onClick={() => onToggleCompare(prod.id)}
                    className="p-1.5 rounded-lg bg-[#0e213e] hover:bg-[#0284c7] text-sky-400 hover:text-white transition-colors"
                    title="Aggiungi al confronto"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls Bar: Highlight Diff Toggle & Add slot */}
          <div className="bg-[#081326] border border-[#142646] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <label 
                htmlFor="toggle-highlight-diff"
                className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                <div className="relative">
                  <input
                    id="toggle-highlight-diff"
                    type="checkbox"
                    checked={highlightDifferences}
                    onChange={(e) => setHighlightDifferences(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-9 h-5 rounded-full transition-colors ${highlightDifferences ? 'bg-[#0284c7]' : 'bg-[#152744]'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${highlightDifferences ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                  <span>Evidenzia solo le differenze</span>
                </div>
              </label>

              {comparedProducts.length === 1 && (
                <span className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  <span>Aggiungi almeno un altro prodotto per visualizzare le differenze affiancate</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Confrontando <strong>{comparedProducts.length}</strong> su massimo <strong>4</strong> prodotti</span>
            </div>
          </div>

          {/* Comparative Table Container */}
          <div className="bg-[#071120] border border-[#142848] rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[640px]">
                {/* 1. Header Row: Product Summaries & Action Cards */}
                <thead>
                  <tr className="border-b border-[#142848] bg-[#050c18]">
                    <th className="p-4 sm:p-5 w-48 sm:w-60 text-xs font-bold text-slate-400 uppercase tracking-wider align-top bg-[#060e1b] border-r border-[#122340]">
                      <div className="flex items-center gap-2 text-sky-400 mb-1">
                        <Layers className="w-4 h-4" />
                        <span>Referenze a confronto</span>
                      </div>
                      <span className="text-[10.5px] text-slate-500 font-normal normal-case">
                        Selezionati per l'analisi tecnica
                      </span>
                    </th>

                    {comparedProducts.map((product) => {
                      const isJustAdded = addedProductId === product.id;
                      const isLowStock = product.stock <= (product.lowStockThreshold ?? 100);

                      return (
                        <th
                          key={product.id}
                          className="p-4 sm:p-5 min-w-[220px] max-w-[280px] align-top relative group border-r last:border-r-0 border-[#122340]"
                        >
                          {/* Remove button */}
                          <button
                            id={`remove-compared-col-${product.id}`}
                            onClick={() => onRemoveFromCompare(product.id)}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-[#0d1d36] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-[#19355e] transition-colors"
                            title={`Rimuovi ${product.name} dal confronto`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          {/* Image */}
                          <div 
                            onClick={() => onSelectProduct(product)}
                            className="cursor-pointer aspect-square w-full max-w-[140px] mx-auto rounded-2xl bg-gradient-to-b from-[#081326] to-[#0a1830] border border-[#142848] p-3 mb-3 flex items-center justify-center hover:border-sky-500/40 transition-colors"
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform"
                            />
                          </div>

                          {/* Title and Category */}
                          <div className="text-left">
                            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                              {product.category}
                            </span>
                            <h3 
                              onClick={() => onSelectProduct(product)}
                              className="text-sm font-bold text-white truncate group-hover:text-sky-300 cursor-pointer transition-colors"
                              title={product.name}
                            >
                              {product.name}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Cod: {product.code}
                            </p>

                            {/* Price */}
                            <div className="mt-2.5 flex items-baseline gap-1.5">
                              <span className="text-lg font-extrabold text-white font-mono">
                                €{product.price.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                +IVA / {product.unit}
                              </span>
                            </div>

                            {/* Add to Cart CTA */}
                            <motion.button
                              id={`compare-add-cart-${product.id}`}
                              whileTap={{ scale: 0.96 }}
                              onClick={(e) => handleAddToCartLocal(product, e)}
                              className={`mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                isJustAdded
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sky-950/40'
                              }`}
                            >
                              {isJustAdded ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Aggiunto!</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>Ordina collo</span>
                                </>
                              )}
                            </motion.button>
                          </div>
                        </th>
                      );
                    })}

                    {/* Placeholder Column if less than 4 */}
                    {comparedProducts.length < 4 && (
                      <th className="p-4 sm:p-5 min-w-[200px] align-middle text-center bg-[#040914]/50">
                        <button
                          id="add-more-compare-slot-btn"
                          onClick={() => setIsAddPickerOpen(true)}
                          className="w-full h-full min-h-[220px] rounded-2xl border-2 border-dashed border-[#162d50] hover:border-sky-500/50 bg-[#060e1d]/50 hover:bg-[#08152e] flex flex-col items-center justify-center p-4 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#0d1e38] text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                            Aggiungi prodotto
                          </span>
                          <span className="text-[10.5px] text-slate-500 mt-0.5">
                            Slot {comparedProducts.length + 1} di 4
                          </span>
                        </button>
                      </th>
                    )}
                  </tr>
                </thead>

                {/* 2. Comparative Specs Rows */}
                <tbody className="divide-y divide-[#102340] text-xs">
                  
                  {/* SECTION 1: DATI ECONOMICI */}
                  <tr className="bg-[#09152b]/80">
                    <td 
                      colSpan={comparedProducts.length + (comparedProducts.length < 4 ? 2 : 1)}
                      className="px-4 py-2.5 font-bold text-sky-300 uppercase tracking-wider text-[11px]"
                    >
                      1. Listino & Condizioni Economiche B2B
                    </td>
                  </tr>

                  {/* Prezzo Imponibile */}
                  {(() => {
                    const values = comparedProducts.map((p) => p.price);
                    const diff = isRowDifferent(values);
                    if (highlightDifferences && !diff) return null;

                    return (
                      <tr className={`hover:bg-[#09152b]/50 ${diff && highlightDifferences ? 'bg-amber-500/10' : ''}`}>
                        <td className="p-3.5 sm:p-4 font-semibold text-slate-400 bg-[#060e1b] border-r border-[#122340]">
                          Prezzo Unitario Netto
                        </td>
                        {comparedProducts.map((p) => (
                          <td key={p.id} className="p-3.5 sm:p-4 font-mono font-bold text-white border-r last:border-r-0 border-[#122340]">
                            €{p.price.toFixed(2)}
                            {diff && (
                              <span className="ml-2 text-[10px] text-slate-400 font-normal">/ {p.unit}</span>
                            )}
                          </td>
                        ))}
                        {comparedProducts.length < 4 && <td className="bg-[#040914]/50" />}
                      </tr>
                    );
                  })()}

                  {/* Prezzo con IVA */}
                  {(() => {
                    const values = comparedProducts.map((p) => p.price * 1.22);
                    const diff = isRowDifferent(values);
                    if (highlightDifferences && !diff) return null;

                    return (
                      <tr className={`hover:bg-[#09152b]/50 ${diff && highlightDifferences ? 'bg-amber-500/10' : ''}`}>
                        <td className="p-3.5 sm:p-4 font-semibold text-slate-400 bg-[#060e1b] border-r border-[#122340]">
                          Prezzo IVA 22% inclusa
                        </td>
                        {comparedProducts.map((p) => (
                          <td key={p.id} className="p-3.5 sm:p-4 font-mono text-slate-300 border-r last:border-r-0 border-[#122340]">
                            €{(p.price * 1.22).toFixed(2)}
                          </td>
                        ))}
                        {comparedProducts.length < 4 && <td className="bg-[#040914]/50" />}
                      </tr>
                    );
                  })()}

                  {/* Sconti & Promozioni attive */}
                  {(() => {
                    const values = comparedProducts.map((p) => p.discountPercent || 0);
                    const diff = isRowDifferent(values);
                    if (highlightDifferences && !diff) return null;

                    return (
                      <tr className={`hover:bg-[#09152b]/50 ${diff && highlightDifferences ? 'bg-amber-500/10' : ''}`}>
                        <td className="p-3.5 sm:p-4 font-semibold text-slate-400 bg-[#060e1b] border-r border-[#122340]">
                          Promozione Quantità
                        </td>
                        {comparedProducts.map((p) => (
                          <td key={p.id} className="p-3.5 sm:p-4 border-r last:border-r-0 border-[#122340]">
                            {p.discountPercent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                                Sconto -{p.discountPercent}%
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">Listino base standard</span>
                            )}
                          </td>
                        ))}
                        {comparedProducts.length < 4 && <td className="bg-[#040914]/50" />}
                      </tr>
                    );
                  })()}

                  {/* SECTION 2: CONFEZIONAMENTO & FORMATO */}
                  <tr className="bg-[#09152b]/80">
                    <td 
                      colSpan={comparedProducts.length + (comparedProducts.length < 4 ? 2 : 1)}
                      className="px-4 py-2.5 font-bold text-sky-300 uppercase tracking-wider text-[11px]"
                    >
                      2. Formati & Confezionamento B2B
                    </td>
                  </tr>

                  {/* Packaging */}
                  {(() => {
                    const values = comparedProducts.map((p) => p.packageQty);
                    const diff = isRowDifferent(values);
                    if (highlightDifferences && !diff) return null;

                    return (
                      <tr className={`hover:bg-[#09152b]/50 ${diff && highlightDifferences ? 'bg-amber-500/10' : ''}`}>
                        <td className="p-3.5 sm:p-4 font-semibold text-slate-400 bg-[#060e1b] border-r border-[#122340]">
                          Confezionamento Primario
                        </td>
                        {comparedProducts.map((p) => (
                          <td key={p.id} className="p-3.5 sm:p-4 font-medium text-white border-r last:border-r-0 border-[#122340]">
                            <div className="flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span>{p.packageQty}</span>
                            </div>
                          </td>
                        ))}
                        {comparedProducts.length < 4 && <td className="bg-[#040914]/50" />}
                      </tr>
                    );
                  })()}

                  {/* Formato tecnico / Volume */}
                  {(() => {
                    const values = comparedProducts.map((p) => p.specs.format);
                    const diff = isRowDifferent(values);
                    if (highlightDifferences && !diff) return null;

                    return (
                      <tr className={`hover:bg-[#09152b]/50 ${diff && highlightDifferences ? 'bg-amber-500/10' : ''}`}>
                        <td className="p-3.5 sm:p-4 font-semibold text-slate-400 bg-[#060e1b] border-r border-[#122340]">
                          Formato Unitario / Resa
                        </td>
                        {comparedProducts.map((p) => (
                          <td key={p.id} className="p-3.5 sm:p-4 text-slate-200 border-r last:border-r-0 border-[#122340]">
                            {p.specs.format}
                          </td>
                        ))}
                        {comparedProducts.length < 4 && <td className="bg-[#040914]/50" />}
                      </tr>
                    );
                  })()}

                  {/* Fragranza */}
                  {(() => {
                    const values = comparedProducts.map((p) => p.specs.fragrance || 'Inodore / Neutro');
                    const diff = isRowDifferent(values);
                    if (highlightDifferences && !diff) return null;

                    return (
                      <tr className={`hover:bg-[#09152b]/50 ${diff && highlightDifferences ? 'bg-amber-500/10' : ''}`}>
                        <td className="p-3.5 sm:p-4 font-semibold text-slate-400 bg-[#060e1b] border-r border-[#122340]">
                          Fragranza / Note Olfattive
                        </td>
                        {comparedProducts.map((p) => (
                          <td key={p.id} className="p-3.5 sm:p-4 text-slate-300 border-r last:border-r-0 border-[#122340]">
                            {p.specs.fragrance ? (
                              <div className="flex items-center gap-1.5 text-sky-200">
                                <Droplet className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span>{p.specs.fragrance}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">Inodore / Non profumato</span>
                            )}
                          </td>
                        ))}
                        {comparedProducts.length < 4 && <td className="bg-[#040914]/50" />}
                      </tr>
                    );
                  })()}

                  {/* SECTION 3: QUALITÀ, CERTIFICAZIONI & NORMATIVE */}
                  <tr className="bg-[#09152b]/80">
                    <td 
                      colSpan={comparedProducts.length + (comparedProducts.length < 4 ? 2 : 1)}
                      className="px-4 py-2.5 font-bold text-sky-300 uppercase tracking-wider text-[11px]"
                    >
                      3. Certificazioni, Normative & Sicurezza
                    </td>
                  </tr>

                  {/* Certificazioni */}
                  {(() => {
                    const values = comparedProducts.map((p) => (p.specs.certifications || []).join(', '));
                    const diff = isRowDifferent(values);
                    if (highlightDifferences && !diff) return null;

                    return (
                      <tr className={`hover:bg-[#09152b]/50 ${diff && highlightDifferences ? 'bg-amber-500/10' : ''}`}>
                        <td className="p-3.5 sm:p-4 font-semibold text-slate-400 bg-[#060e1b] border-r border-[#122340]">
                          Conformità & Certificati
                        </td>
                        {comparedProducts.map((p) => (
                          <td key={p.id} className="p-3.5 sm:p-4 border-r last:border-r-0 border-[#122340]">
                            {p.specs.certifications && p.specs.certifications.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {p.specs.certifications.map((cert, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 bg-[#0d213f] text-sky-300 border border-[#1a3f72] px-2 py-0.5 rounded-md text-[10.5px] font-medium"
                                  >
                                    <ShieldCheck className="w-3 h-3 text-sky-400" />
                                    <span>{cert}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500">Standard CE</span>
                            )}
                          </td>
                        ))}
                        {comparedProducts.length < 4 && <td className="bg-[#040914]/50" />}
                      </tr>
                    );
                  })()}

                  {/* Disponibilità Magazzino */}
                  {(() => {
                    const values = comparedProducts.map((p) => p.stock);
                    const diff = isRowDifferent(values);
                    if (highlightDifferences && !diff) return null;

                    return (
                      <tr className={`hover:bg-[#09152b]/50 ${diff && highlightDifferences ? 'bg-amber-500/10' : ''}`}>
                        <td className="p-3.5 sm:p-4 font-semibold text-slate-400 bg-[#060e1b] border-r border-[#122340]">
                          Disponibilità a Magazzino
                        </td>
                        {comparedProducts.map((p) => {
                          const isLowStock = p.stock <= (p.lowStockThreshold ?? 100);
                          return (
                            <td key={p.id} className="p-3.5 sm:p-4 border-r last:border-r-0 border-[#122340]">
                              {isLowStock ? (
                                <span className="inline-flex items-center gap-1.5 text-rose-300 bg-rose-500/10 border border-rose-500/25 px-2 py-1 rounded-lg text-xs font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                                  <span>Scorte basse ({p.stock} colli)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-lg text-xs font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>Disponibile ({p.stock} colli)</span>
                                </span>
                              )}
                            </td>
                          );
                        })}
                        {comparedProducts.length < 4 && <td className="bg-[#040914]/50" />}
                      </tr>
                    );
                  })()}

                  {/* Descrizione & Impiego */}
                  {(() => {
                    return (
                      <tr className="hover:bg-[#09152b]/50">
                        <td className="p-3.5 sm:p-4 font-semibold text-slate-400 bg-[#060e1b] border-r border-[#122340]">
                          Descrizione & Destinazione d'Uso
                        </td>
                        {comparedProducts.map((p) => (
                          <td key={p.id} className="p-3.5 sm:p-4 text-slate-300 leading-relaxed border-r last:border-r-0 border-[#122340] text-xs">
                            {p.description}
                          </td>
                        ))}
                        {comparedProducts.length < 4 && <td className="bg-[#040914]/50" />}
                      </tr>
                    );
                  })()}

                  {/* Scheda Tecnica di Sicurezza SDS */}
                  <tr className="hover:bg-[#09152b]/50">
                    <td className="p-3.5 sm:p-4 font-semibold text-slate-400 bg-[#060e1b] border-r border-[#122340]">
                      Documentazione Tecnica
                    </td>
                    {comparedProducts.map((p) => (
                      <td key={p.id} className="p-3.5 sm:p-4 border-r last:border-r-0 border-[#122340]">
                        <button
                          onClick={() => alert(`Download Scheda Dati di Sicurezza (SDS) per ${p.name} (${p.code})`)}
                          className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 hover:underline font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Scarica Scheda SDS (PDF)</span>
                        </button>
                      </td>
                    ))}
                    {comparedProducts.length < 4 && <td className="bg-[#040914]/50" />}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal / Quick Picker */}
      <AnimatePresence>
        {isAddPickerOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddPickerOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-[#071120] border border-[#183154] rounded-3xl p-5 sm:p-6 shadow-2xl z-10 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#142848] mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Aggiungi al Confronto</h3>
                    <p className="text-xs text-slate-400">Seleziona un prodotto dal catalogo per affiancarlo ({comparedProducts.length}/4)</p>
                  </div>
                </div>
                <button
                  id="close-compare-picker-modal"
                  onClick={() => setIsAddPickerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#0e203c]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable list of available products */}
              <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                {availableToAdd.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Tutti i prodotti del catalogo sono già stati aggiunti al confronto.
                  </div>
                ) : (
                  availableToAdd.map((product) => (
                    <div
                      key={product.id}
                      className="bg-[#050c18] hover:bg-[#0a1830] border border-[#142848] rounded-2xl p-3 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 object-contain rounded-xl bg-[#09152b] p-1 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                            {product.category}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {product.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono">
                            €{product.price.toFixed(2)} +IVA • {product.specs.format}
                          </p>
                        </div>
                      </div>

                      <button
                        id={`picker-add-${product.id}`}
                        onClick={() => {
                          onToggleCompare(product.id);
                          if (comparedProducts.length + 1 >= 4) {
                            setIsAddPickerOpen(false);
                          }
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0284c7] hover:bg-[#0369a1] text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Aggiungi</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#142848] flex justify-end">
                <button
                  onClick={() => setIsAddPickerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0e203c] text-slate-300 hover:text-white"
                >
                  Chiudi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
