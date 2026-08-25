import React from 'react';
import { Scale, X, ArrowRight, Trash2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

interface CompareFloatingBarProps {
  comparedProducts: Product[];
  onRemoveFromCompare: (productId: string) => void;
  onClearCompare: () => void;
  onOpenCompare: () => void;
  maxCompare?: number;
}

export const CompareFloatingBar: React.FC<CompareFloatingBarProps> = ({
  comparedProducts,
  onRemoveFromCompare,
  onClearCompare,
  onOpenCompare,
  maxCompare = 4,
}) => {
  if (comparedProducts.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="compare-floating-dock"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl"
      >
        <div className="bg-[#071328]/95 backdrop-blur-md border border-[#1d3d6e] rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl shadow-black/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Indicator & Thumbnails */}
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0 shadow-xs">
              <Scale className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">
                  Confronto Prodotti
                </span>
                <span className="text-[11px] font-semibold bg-[#112444] text-sky-300 px-2 py-0.5 rounded-full border border-[#1b3b6c]">
                  {comparedProducts.length}/{maxCompare}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                {comparedProducts.length < 2 
                  ? 'Seleziona almeno un altro articolo per confrontare' 
                  : 'Specifiche pronte per il confronto affiancato'}
              </p>
            </div>

            {/* Product item previews */}
            <div className="flex items-center gap-2 ml-auto sm:ml-2">
              {comparedProducts.map((product) => (
                <div
                  key={product.id}
                  className="group relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#091832] border border-[#183560] p-1 shrink-0 flex items-center justify-center"
                  title={product.name}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                  <button
                    id={`remove-from-dock-${product.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromCompare(product.id);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md transition-transform scale-90 group-hover:scale-110"
                    title={`Rimuovi ${product.name} dal confronto`}
                  >
                    <X className="w-2.5 h-2.5 stroke-[3]" />
                  </button>
                </div>
              ))}

              {/* Empty placeholder slots */}
              {Array.from({ length: Math.max(0, maxCompare - comparedProducts.length) }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-dashed border-[#183560] bg-[#061022]/60 flex items-center justify-center text-slate-600 text-[10px] shrink-0"
                  title="Aggiungi altri articoli dal catalogo"
                >
                  +
                </div>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              id="clear-compare-dock-btn"
              onClick={onClearCompare}
              className="p-2 sm:px-2.5 sm:py-2 text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
              title="Azzera lista di confronto"
            >
              <Trash2 className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Svuota</span>
            </button>

            <motion.button
              id="open-compare-view-dock-btn"
              whileTap={{ scale: 0.96 }}
              onClick={onOpenCompare}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all ${
                comparedProducts.length >= 2
                  ? 'bg-gradient-to-r from-[#0284c7] via-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] text-white shadow-sky-900/40 animate-pulse'
                  : 'bg-[#0f2444] text-slate-300 hover:text-white border border-[#1d3d6e]'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Confronta ({comparedProducts.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
