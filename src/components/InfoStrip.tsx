import React from 'react';
import { ShoppingBag, Truck } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

/** Fascia sempre visibile in cima all'app: ordine minimo e consegna gratuita su Roma. */
export const InfoStrip: React.FC = () => {
  const { minimumOrderEur } = useAdmin();
  const min = minimumOrderEur > 0 ? `€ ${minimumOrderEur.toFixed(0)}` : null;
  return (
    <div id="info-strip" className="w-full bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#0284c7] text-white">
      <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-center gap-x-4 gap-y-0.5 flex-wrap text-[11.5px] sm:text-xs font-semibold text-center">
        {min && (
          <span className="inline-flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            ORDINE MINIMO <strong className="font-extrabold">{min}</strong>
          </span>
        )}
        <span className="hidden sm:inline opacity-60">•</span>
        <span className="inline-flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 shrink-0" />
          Consegna gratuita su Roma (RM)
        </span>
      </div>
    </div>
  );
};
