import React from 'react';
import { Scissors } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Product } from '../types';

/** Evento che apre il pannello admin direttamente su "Rimuovi sfondo" con il prodotto scelto */
export const OPEN_REMOVE_BG_EVENT = 'aurora-open-remove-bg';

export const requestRemoveBg = (productId: string) =>
  window.dispatchEvent(new CustomEvent(OPEN_REMOVE_BG_EVENT, { detail: { productId } }));

/**
 * Pulsante visibile SOLO all'amministratore sulle schede prodotto con una foto:
 * apre subito lo studio "Rimuovi sfondo" già caricato con quel prodotto.
 */
export const AdminRemoveBgButton: React.FC<{ product: Product; className?: string }> = ({ product, className = '' }) => {
  const { isAdmin } = useAdmin();
  if (!isAdmin || !(product.image && product.image.trim())) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        requestRemoveBg(product.id);
      }}
      title="Rimuovi / modifica sfondo (solo admin)"
      aria-label="Rimuovi sfondo"
      className={`absolute z-10 inline-flex items-center justify-center rounded-lg px-2 py-1 shadow-md bg-indigo-600 text-white hover:bg-indigo-500 transition-colors ${className}`}
    >
      <Scissors className="w-3.5 h-3.5" />
    </button>
  );
};
