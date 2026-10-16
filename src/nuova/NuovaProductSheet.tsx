import React, { useEffect, useRef, useState } from 'react';
import { Product } from '../types';
import { useAdmin } from '../context/AdminContext';
import { useCloseOnBack } from '../utils/useCloseOnBack';
import { AdminImageFinderButton } from '../components/AdminImageFinderButton';
import { AdminRemoveBgButton } from '../components/AdminRemoveBgButton';
import { ShareProductButton } from '../components/ShareProductButton';
import { PLACEHOLDER_IMAGE } from '../utils/imageRepair';
import { Ic, Bi, vib, eur } from './Icona';
import { flyToCart, toast, burst } from './fx';

export interface NuovaProductSheetProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  isCompared?: boolean;
  onToggleCompare?: (productId: string) => void;
  onOpenRestockAnalysis?: (focusProductId?: string) => void;
  onEditProduct?: (product: Product) => void;
}

/**
 * Scheda prodotto della grafica nuova: sul telefono sale dal basso (si chiude
 * anche trascinandola giù), sul computer è una finestra a due colonne.
 * Stesse funzioni della scheda classica: preferiti, confronto, riordino,
 * condividi, modifica (admin), quantità e aggiunta al carrello.
 */
export const NuovaProductSheet: React.FC<NuovaProductSheetProps> = ({
  product,
  onClose,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
  isCompared = false,
  onToggleCompare,
  onOpenRestockAnalysis,
  onEditProduct,
}) => {
  const { isBusinessCustomer, vatFactor, vatPercent, minimumOrderEur } = useAdmin();
  const open = !!product;
  useCloseOnBack(open, onClose);
  // tengo l'ultimo prodotto mentre la scheda scende, così non sparisce di colpo
  const [shown, setShown] = useState<Product | null>(product);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [drag, setDrag] = useState(0);
  const y0 = useRef<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const heartRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (product) {
      setShown(product);
      setQty(1);
      setAdded(false);
      bodyRef.current?.scrollTo({ top: 0 });
    }
  }, [product]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const p = product || shown;
  if (!p) return null;

  const f = isBusinessCustomer ? vatFactor : 1;
  const unit = p.price * f;
  const total = unit * qty;
  const old = p.originalPrice && p.originalPrice > p.price ? p.originalPrice * f : 0;
  const img = p.image || PLACEHOLDER_IMAGE;
  const tag = p.isOffer || p.discountPercent || old ? 'Offerta' : p.isEco ? 'Eco e bio' : '';

  const add = () => {
    vib(12);
    flyToCart(imgRef.current);
    onAddToCart(p, qty);
    toast(qty > 1 ? `${qty} pezzi aggiunti al carrello` : 'Aggiunto al carrello', img);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className={`n-ov n-pd-wrap${open ? ' on' : ''}`} aria-hidden={!open}>
      <div className="n-pd-scrim" onClick={onClose} />
      <section
        className="n-pd"
        role="dialog"
        aria-modal="true"
        aria-label={p.name}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        <div
          className="n-pd-grab"
          onTouchStart={(e) => (y0.current = e.touches[0].clientY)}
          onTouchMove={(e) => y0.current != null && setDrag(Math.max(0, e.touches[0].clientY - y0.current))}
          onTouchEnd={() => {
            if (drag > 90) onClose();
            setDrag(0);
            y0.current = null;
          }}
        >
          <i />
          <div className="n-pd-head">
            <h3>Scheda prodotto</h3>
            <button type="button" className="n-pd-x" onClick={onClose} aria-label="Chiudi">
              <Ic n="x" s={18} />
            </button>
          </div>
        </div>

        <div className="n-pd-body" ref={bodyRef}>
          <div className="n-pd-cols">
            <div className="n-pd-stage">
              <img ref={imgRef} data-autozoom src={img} alt={p.name} referrerPolicy="no-referrer" />
              {p.discountPercent ? <span className="n-tag sale">-{p.discountPercent}%</span> : old ? <span className="n-tag">Offerta</span> : null}
              <AdminImageFinderButton product={p} className="bottom-3 left-3" />
              <AdminRemoveBgButton product={p} className="bottom-3 right-3" />
            </div>

            <div className="n-pd-info">
              <p className="n-pd-cat">{p.category}{tag ? ` · ${tag}` : ''}</p>
              <h2>{p.name}</h2>
              <div className="n-pd-price">
                <p className="big">
                  {eur(unit)}<span>/{p.unit || 'pz'}</span>
                </p>
                <p className="n-pd-stock">
                  <i />
                  Disponibile
                </p>
              </div>

              {onEditProduct && (
                <button type="button" className="n-pd-edit" onClick={() => { onEditProduct(p); onClose(); }}>
                  <Ic n="edit" s={16} /> Modifica prodotto (solo admin)
                </button>
              )}

              <div className="n-specs">
                <div><small>Formato</small><b>{p.specs?.format || '—'}</b></div>
                <div><small>Confezione</small><b>{p.packageQty || '1'} {p.unit || 'pz'}</b></div>
                <div><small>Prezzo</small><b>{isBusinessCustomer && vatPercent > 0 ? 'IVA inclusa' : 'IVA esclusa'}</b></div>
                <div><small>Disponibilità</small><b>In magazzino</b></div>
              </div>

              <div className="n-dlv">
                <Bi n="truck" s={30} />
                <span>
                  <b>Consegna gratuita a Roma</b>
                  <small>Con i nostri furgoni, in 24/48 ore</small>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="n-pd-foot">
          <div className="n-qty">
            <button type="button" onClick={() => { setQty((q) => Math.max(1, q - 1)); vib(5); }} aria-label="Meno">
              <Ic n="minus" s={18} />
            </button>
            <b>{qty}</b>
            <button type="button" onClick={() => { setQty((q) => q + 1); vib(5); }} aria-label="Più">
              <Ic n="plus" s={18} />
            </button>
          </div>
          <button type="button" className={`n-btn ${added ? 'ok' : 'dark'} n-pd-add`} onClick={add}>
            {added ? (
              <>
                <Ic n="check" s={18} /> Aggiunto
              </>
            ) : (
              <>
                <Ic n="bag" s={18} /> Aggiungi · {eur(total)}
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
};
