import React, { useEffect, useRef } from 'react';
import { Product } from '../types';
import { Ic, vib, eur } from './Icona';
import { flyToCart, toast, burst } from './fx';
import { AdminImageFinderButton } from '../components/AdminImageFinderButton';
import { AdminRemoveBgButton } from '../components/AdminRemoveBgButton';
import { PLACEHOLDER_IMAGE } from '../utils/imageRepair';

export interface NuovaCardProps {
  product: Product;
  qty: number;
  isFavorite: boolean;
  isCompared: boolean;
  /** Prezzo da mostrare (già con IVA se il cliente è un'attività, come nella grafica classica) */
  priceFactor: number;
  onOpen: (p: Product) => void;
  onAdd: (p: Product) => void;
  onRemoveOne: (p: Product) => void;
  onToggleFavorite: (id: string) => void;
  onToggleCompare?: (id: string) => void;
}

const tagOf = (p: Product): { text: string; cls: string } | null => {
  if (p.isOffer || p.discountPercent || (p.originalPrice && p.originalPrice > p.price)) return { text: 'Offerta', cls: '' };
  if (p.isEco) return { text: 'Eco e bio', cls: 'eco' };
  return null;
};

/** Scheda prodotto della grafica nuova: foto su fondo bianco, cuore, confronto e pulsante + che diventa contatore. */
export const NuovaCard: React.FC<NuovaCardProps> = ({
  product: p,
  qty,
  isFavorite,
  isCompared,
  priceFactor,
  onOpen,
  onAdd,
  onRemoveOne,
  onToggleFavorite,
  onToggleCompare,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const heartRef = useRef<HTMLButtonElement>(null);
  const qvRef = useRef<HTMLSpanElement>(null);
  const prevQty = useRef(qty);
  useEffect(() => {
    if (prevQty.current !== qty && qvRef.current) {
      const v = qvRef.current;
      v.classList.remove('tick');
      void v.offsetWidth;
      v.classList.add('tick');
    }
    prevQty.current = qty;
  }, [qty]);

  const tag = tagOf(p);
  const price = p.price * priceFactor;
  const old = p.originalPrice && p.originalPrice > p.price ? p.originalPrice * priceFactor : 0;
  const img = p.image || PLACEHOLDER_IMAGE;

  return (
    <article
      className={`n-card${qty > 0 ? ' incart' : ''}${isCompared ? ' cmp' : ''}`}
      onClick={() => onOpen(p)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(p);
      }}
      tabIndex={0}
      aria-label={p.name}
    >
      <div className="n-stage">
        <img ref={imgRef} className="pi" data-autozoom loading="lazy" decoding="async" src={img} alt="" referrerPolicy="no-referrer" />
        {tag && <span className={`n-tag ${tag.cls}`}>{tag.text}</span>}
        <div className="n-cardbtns">
          <button
            ref={heartRef}
            type="button"
            className={`n-heart${isFavorite ? ' on' : ''}`}
            aria-label={isFavorite ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}
            aria-pressed={isFavorite}
            onClick={(e) => {
              e.stopPropagation();
              const h = heartRef.current;
              if (h) {
                h.classList.remove('pop');
                void h.offsetWidth;
                h.classList.add('pop');
              }
              if (!isFavorite) {
                burst(h);
                toast('Salvato nei preferiti', img);
              } else toast('Tolto dai preferiti', img);
              vib(8);
              onToggleFavorite(p.id);
            }}
          >
            <Ic n="heart" s={17} />
          </button>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <AdminImageFinderButton product={p} className="bottom-1.5 left-1.5" />
          <AdminRemoveBgButton product={p} className="bottom-1.5 right-1.5" />
        </div>
      </div>
      <div className="n-cb">
        <p className="n-meta">
          {p.category}
        </p>
        <h4>{p.name}</h4>
        <div className="n-row">
          <p className="n-price">
            {eur(price)}
            <span>/{p.unit || 'pz'}</span>
            {old ? <s>{eur(old)}</s> : null}
          </p>
          <span className={`n-add${qty > 0 ? ' has' : ''}`} role="group" aria-label="Quantità nel carrello" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="minus"
              aria-label="Togli uno"
              tabIndex={qty > 0 ? 0 : -1}
              onClick={() => {
                vib(6);
                onRemoveOne(p);
              }}
            >
              <Ic n="minus" s={16} />
            </button>
            <span className="qv" ref={qvRef}>{qty}</span>
            <button
              type="button"
              className="plus"
              aria-label="Aggiungi al carrello"
              onClick={() => {
                vib(12);
                flyToCart(imgRef.current);
                if (qty === 0) toast('Aggiunto al carrello', img);
                onAdd(p);
              }}
            >
              <Ic n="plus" s={17} />
            </button>
          </span>
        </div>
      </div>
    </article>
  );
};
