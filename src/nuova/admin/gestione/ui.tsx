import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Product } from '../../../types';
import { searchProducts } from '../../../utils/productSearch';
import { hasProductImage } from '../../../utils/imageFirst';
import { Ic, vib } from '../../Icona';
import { Cliente, nomeCliente } from './store';

/* Pezzi comuni delle schermate del gestionale (stessa grafica del pannello). */

export const iniziali = (s: string) =>
  s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

/** Pannello che sale dal basso (telefono) o entra da destra (PC) */
export const Sheet: React.FC<{
  title: string;
  onClose: () => void;
  wide?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, onClose, wide, footer, children }) => {
  const [on, setOn] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const t = requestAnimationFrame(() => setOn(true));
    const k = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', k);
    return () => {
      cancelAnimationFrame(t);
      window.removeEventListener('keydown', k);
    };
  }, []);
  return (
    <>
      <div className={`a-scrim${on ? ' a-on' : ''}`} onClick={onClose} />
      <section className={`a-sheet${wide ? ' a-wide' : ''}${on ? ' a-on' : ''}`} aria-label={title}>
        <div className="a-sh">
          <h3>{title}</h3>
          <button type="button" className="a-ib" aria-label="Chiudi" onClick={onClose}><Ic n="x" s={18} /></button>
        </div>
        <div className="a-sb">{children}</div>
        {footer ? <div className="a-sf">{footer}</div> : null}
      </section>
    </>
  );
};

type FProps = {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  wide?: boolean;
  upper?: boolean;
};
export const F: React.FC<FProps> = ({ label, value, onChange, placeholder, type, inputMode, upper }) => (
  <label className="a-fld">
    <span>{label}</span>
    <input
      type={type || 'text'}
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
    />
  </label>
);

export const Sel: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: [string, string][] }> = ({
  label, value, onChange, options,
}) => (
  <label className="a-fld">
    <span>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  </label>
);

export const Area: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }> = ({
  label, value, onChange, placeholder, rows = 3,
}) => (
  <label className="a-fld">
    <span>{label}</span>
    <textarea value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  </label>
);

export const Toggle: React.FC<{ label: string; sub?: string; on: boolean; onChange: (v: boolean) => void }> = ({ label, sub, on, onChange }) => (
  <div className="a-optrow">
    <span>{label}{sub ? <small>{sub}</small> : null}</span>
    <button type="button" className={`a-tg${on ? ' a-on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => { onChange(!on); vib(8); }} />
  </div>
);

export const Group: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <div className="a-grp">
    <div className="a-grph"><b>{title}</b>{right}</div>
    {children}
  </div>
);

/** Numero che sale fino al valore (micro animazione leggera, solo quando cambia) */
export const Count: React.FC<{ v: number; fmt?: (n: number) => string }> = ({ v, fmt = (n) => Math.round(n).toLocaleString('it-IT') }) => {
  const [shown, setShown] = useState(v);
  const from = useRef(v);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(v);
      return;
    }
    const a = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(a + (v - a) * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = v;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [v]);
  return <>{fmt(shown)}</>;
};

/** Ricerca prodotto da aggiungere a un documento */
export const ProductPicker: React.FC<{ products: Product[]; onPick: (p: Product) => void; onFree?: () => void }> = ({ products, onPick, onFree }) => {
  const [q, setQ] = useState('');
  const res = useMemo(() => (q.trim().length >= 2 ? searchProducts(products, q).slice(0, 30) : []), [products, q]);
  return (
    <div className="a-pick">
      <label className="a-fin">
        <Ic n="search" s={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Aggiungi un articolo: nome o codice" />
        {q && <button type="button" aria-label="Svuota" onClick={() => setQ('')}><Ic n="x" s={15} /></button>}
      </label>
      {res.length > 0 && (
        <div className="a-pickl">
          {res.map((p) => (
            <button
              key={p.id}
              type="button"
              className="a-row"
              onClick={() => {
                onPick(p);
                setQ('');
                vib(6);
              }}
            >
              <span className="a-mth">{hasProductImage(p) ? <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Ic n="package" s={16} />}</span>
              <span className="a-tx"><b>{p.name}</b><small>{[p.code, `giacenza ${p.stock}`].filter(Boolean).join(' · ')}</small></span>
              <Ic n="plus" s={16} />
            </button>
          ))}
        </div>
      )}
      {onFree && (
        <button type="button" className="a-link" onClick={onFree}><Ic n="plus" s={14} /> Riga libera (articolo non in catalogo)</button>
      )}
    </div>
  );
};

/** Scelta del cliente dalla rubrica */
export const ClientPicker: React.FC<{ clienti: Cliente[]; value: Cliente | null; onPick: (c: Cliente | null) => void; onNew?: () => void }> = ({
  clienti, value, onPick, onNew,
}) => {
  const [open, setOpen] = useState(!value);
  const [q, setQ] = useState('');
  const res = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? clienti.filter((c) => [nomeCliente(c), c.piva, c.cf, c.comune, c.telefono].some((x) => (x || '').toLowerCase().includes(s))) : clienti).slice(0, 40);
  }, [clienti, q]);
  if (value && !open)
    return (
      <div className="a-cpick">
        <span className="a-oav">{iniziali(nomeCliente(value))}</span>
        <span className="a-tx">
          <b>{nomeCliente(value)}</b>
          <small>{[value.piva && `P.IVA ${value.piva}`, value.comune].filter(Boolean).join(' · ') || 'Dati fiscali da completare'}</small>
        </span>
        <button type="button" className="a-btn a-gh a-sm" onClick={() => setOpen(true)}>Cambia</button>
      </div>
    );
  return (
    <div className="a-pick">
      <label className="a-fin">
        <Ic n="search" s={18} />
        <input value={q} autoFocus={!value} onChange={(e) => setQ(e.target.value)} placeholder="Cerca il cliente in rubrica" />
      </label>
      <div className="a-pickl">
        {res.map((c) => (
          <button key={c.id} type="button" className="a-row" onClick={() => { onPick(c); setOpen(false); vib(6); }}>
            <span className="a-oav">{iniziali(nomeCliente(c))}</span>
            <span className="a-tx"><b>{nomeCliente(c)}</b><small>{[c.comune, c.telefono].filter(Boolean).join(' · ')}</small></span>
          </button>
        ))}
        {res.length === 0 && <div className="a-empty">Nessun cliente trovato.</div>}
      </div>
      {onNew && <button type="button" className="a-link" onClick={onNew}><Ic n="plus" s={14} /> Nuovo cliente</button>}
      {value && <button type="button" className="a-link" onClick={() => setOpen(false)}>Annulla</button>}
    </div>
  );
};

/** Scarica un file (PDF, XML…) */
export const scarica = (blob: Blob, nome: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
};

/** Invia un file con la condivisione del telefono (WhatsApp, email…); se non c'è, lo scarica */
export const condividi = async (blob: Blob, nome: string, testo: string) => {
  const file = new File([blob], nome, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: nome, text: testo });
      return true;
    } catch {
      return false;
    }
  }
  scarica(blob, nome);
  return false;
};
