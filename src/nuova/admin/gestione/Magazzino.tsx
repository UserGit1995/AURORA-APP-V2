import React, { useMemo, useState } from 'react';
import { useAdmin } from '../../../context/AdminContext';
import { Product } from '../../../types';
import { searchProducts } from '../../../utils/productSearch';
import { hasProductImage } from '../../../utils/imageFirst';
import { Ic, Bi, vib } from '../../Icona';
import { Movimento, dataIt, oggiIso, save, useArchivio } from './store';
import { Count, F, Sheet } from './ui';

/* Magazzino: giacenze con bollino, carico/scarico/rettifica e storico dei movimenti. */

const soglia = (p: Product) => ((p.lowStockThreshold ?? 0) > 0 ? (p.lowStockThreshold as number) : 20);
const stato = (p: Product): 'out' | 'low' | 'ok' => (p.stock <= 0 ? 'out' : p.stock < soglia(p) ? 'low' : 'ok');
const ETI = { out: 'Esaurito', low: 'Sotto scorta', ok: 'Disponibile' };

/** Registra un movimento e aggiorna la giacenza del prodotto. Usato anche dai DDT. */
export async function registraMovimento(
  updateProduct: (p: Product) => void,
  p: Product,
  tipo: Movimento['tipo'],
  qty: number,
  causale: string,
  docRef = ''
) {
  const prima = p.stock ?? 0;
  const dopo = tipo === 'carico' ? prima + qty : tipo === 'scarico' ? prima - qty : qty;
  await save('movimento', {
    productId: p.id,
    productName: p.name,
    code: p.code || '',
    tipo,
    qty: tipo === 'rettifica' ? dopo - prima : qty,
    prima,
    dopo,
    causale,
    docRef,
    data: oggiIso(),
  });
  updateProduct({ ...p, stock: dopo });
  return dopo;
}

export const MagazzinoView: React.FC<{ toast: (t: string) => void }> = ({ toast }) => {
  const { productsList, updateProduct } = useAdmin();
  const { rows: movimenti, error } = useArchivio('movimento');
  const [q, setQ] = useState('');
  const [f, setF] = useState<'Tutti' | 'Sotto scorta' | 'Esauriti'>('Tutti');
  const [n, setN] = useState(60);
  const [mov, setMov] = useState<{ p: Product; tipo: Movimento['tipo'] } | null>(null);

  const k = useMemo(() => {
    let valore = 0, out = 0, low = 0;
    for (const p of productsList) {
      valore += Math.max(0, p.stock || 0) * (p.price || 0);
      const s = stato(p);
      if (s === 'out') out++;
      else if (s === 'low') low++;
    }
    return { valore, out, low };
  }, [productsList]);

  const list = useMemo(() => {
    let l = q.trim() ? searchProducts(productsList, q) : productsList;
    if (f === 'Sotto scorta') l = l.filter((p) => stato(p) === 'low');
    if (f === 'Esauriti') l = l.filter((p) => stato(p) === 'out');
    return l;
  }, [productsList, q, f]);

  return (
    <>
      <div className="a-kpis">
        <div className="a-card a-kpi"><Bi n="boxes" s={30} /><p className="a-v"><Count v={productsList.length} /></p><p>Articoli a catalogo</p></div>
        <div className="a-card a-kpi"><Bi n="receipt" s={30} /><p className="a-v"><Count v={k.valore} fmt={(x) => '€ ' + Math.round(x).toLocaleString('it-IT')} /></p><p>Valore della merce a listino</p></div>
        <button type="button" className="a-card a-kpi" onClick={() => setF('Sotto scorta')}><Bi n="clock" s={30} /><p className="a-v"><Count v={k.low} /></p><p>Sotto la scorta minima</p></button>
        <button type="button" className="a-card a-kpi" onClick={() => setF('Esauriti')}><Bi n="seal" s={30} /><p className="a-v"><Count v={k.out} /></p><p>Esauriti</p></button>
      </div>
      <div className="a-tool">
        <label className="a-fin">
          <Ic n="search" s={18} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setN(60); }} placeholder="Cerca articolo per nome o codice" />
        </label>
        <div className="a-seg2">
          {(['Tutti', 'Sotto scorta', 'Esauriti'] as const).map((x) => (
            <button key={x} type="button" className={f === x ? 'a-on' : ''} onClick={() => { setF(x); setN(60); vib(5); }}>{x}</button>
          ))}
        </div>
      </div>
      {error && <div className="a-card a-warn"><Ic n="shield" s={18} />{error}</div>}
      <div className="a-dgrid a-dgrid-mag">
        <div className="a-card a-list">
          <div className="a-ch"><h2>Giacenze</h2><small className="a-chs">Tocca un articolo per carico o scarico</small></div>
          {list.slice(0, n).map((p, i) => {
            const s = stato(p);
            return (
              <div key={p.id} className="a-row a-mrow" style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}>
                <span className="a-mth">{hasProductImage(p) ? <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Ic n="package" s={16} />}</span>
                <button type="button" className="a-tx" onClick={() => setMov({ p, tipo: 'carico' })}>
                  <b>{p.name}</b>
                  <small>{[p.code, p.category].filter(Boolean).join(' · ')}</small>
                </button>
                <span className={`a-bol a-bol-${s}`} title={ETI[s]}><i />{(p.stock ?? 0).toLocaleString('it-IT')} {p.unit || 'pz'}</span>
                <span className="a-mbt">
                  <button type="button" aria-label="Scarico" title="Scarico" onClick={() => setMov({ p, tipo: 'scarico' })}><Ic n="minus" s={16} /></button>
                  <button type="button" aria-label="Carico" title="Carico" onClick={() => setMov({ p, tipo: 'carico' })}><Ic n="plus" s={16} /></button>
                </span>
              </div>
            );
          })}
          {list.length === 0 && <div className="a-empty">Nessun articolo.</div>}
          {list.length > n && (
            <button type="button" className="a-row a-moreb" onClick={() => setN((x) => x + 60)}>
              <span className="a-tx"><b>Mostra altri articoli</b><small>{n} di {list.length.toLocaleString('it-IT')}</small></span>
              <Ic n="chev" s={16} />
            </button>
          )}
        </div>
        <div className="a-card a-list">
          <div className="a-ch"><h2>Ultimi movimenti</h2></div>
          {movimenti.slice(0, 40).map((m) => (
            <div key={m.id} className="a-row">
              <span className={`a-mvi a-mvi-${m.tipo}`}><Ic n={m.tipo === 'carico' ? 'download' : m.tipo === 'scarico' ? 'upload' : 'sliders'} s={16} /></span>
              <span className="a-tx">
                <b>{m.productName}</b>
                <small>{[dataIt(m.data), m.causale, m.docRef].filter(Boolean).join(' · ')}</small>
              </span>
              <span className={`a-amt a-mq-${m.tipo}`}>{m.tipo === 'scarico' ? '−' : m.qty >= 0 ? '+' : '−'}{Math.abs(m.qty).toLocaleString('it-IT')}</span>
            </div>
          ))}
          {movimenti.length === 0 && <div className="a-empty">Ancora nessun movimento. Carichi, scarichi e DDT compaiono qui.</div>}
        </div>
      </div>
      {mov && (
        <MovimentoSheet
          p={mov.p}
          tipo={mov.tipo}
          storico={movimenti.filter((m) => m.productId === mov.p.id)}
          onClose={() => setMov(null)}
          onDone={async (tipo, qty, causale, rif) => {
            try {
              const dopo = await registraMovimento(updateProduct, mov.p, tipo, qty, causale, rif);
              vib(10);
              toast(`Giacenza aggiornata: ${dopo.toLocaleString('it-IT')} ${mov.p.unit || 'pz'}`);
              setMov(null);
            } catch (e) {
              toast((e as Error).message);
            }
          }}
        />
      )}
    </>
  );
};

const CAUSALI: Record<Movimento['tipo'], string[]> = {
  carico: ['Acquisto da fornitore', 'Reso da cliente', 'Inventario'],
  scarico: ['Vendita', 'Merce danneggiata', 'Uso interno', 'Omaggio'],
  rettifica: ['Inventario'],
};

const MovimentoSheet: React.FC<{
  p: Product;
  tipo: Movimento['tipo'];
  storico: Movimento[];
  onClose: () => void;
  onDone: (tipo: Movimento['tipo'], qty: number, causale: string, rif: string) => void;
}> = ({ p, tipo: t0, storico, onClose, onDone }) => {
  const [tipo, setTipo] = useState(t0);
  const [qty, setQty] = useState('');
  const [causale, setCausale] = useState(CAUSALI[t0][0]);
  const [rif, setRif] = useState('');
  const [busy, setBusy] = useState(false);
  const v = parseFloat(qty.replace(',', '.'));
  const prima = p.stock ?? 0;
  const dopo = isNaN(v) ? prima : tipo === 'carico' ? prima + v : tipo === 'scarico' ? prima - v : v;
  const ok = !isNaN(v) && (tipo === 'rettifica' ? v >= 0 : v > 0);
  return (
    <Sheet
      title="Movimento di magazzino"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="a-btn a-gh" onClick={onClose}>Annulla</button>
          <button
            type="button"
            className="a-btn a-prim"
            disabled={!ok || busy}
            onClick={async () => {
              setBusy(true);
              await onDone(tipo, v, causale, rif);
              setBusy(false);
            }}
          >
            {busy ? 'Salvo…' : tipo === 'carico' ? 'Registra carico' : tipo === 'scarico' ? 'Registra scarico' : 'Correggi giacenza'}
          </button>
        </>
      }
    >
      <div className="a-mhead">
        <span className="a-mth a-mth-l">{hasProductImage(p) ? <img src={p.image} alt="" referrerPolicy="no-referrer" /> : <Ic n="package" s={22} />}</span>
        <span><b>{p.name}</b><small>{[p.code, `giacenza attuale ${prima.toLocaleString('it-IT')} ${p.unit || 'pz'}`].filter(Boolean).join(' · ')}</small></span>
      </div>
      <div className="a-seg2 a-segfull">
        {(['carico', 'scarico', 'rettifica'] as const).map((x) => (
          <button key={x} type="button" className={tipo === x ? 'a-on' : ''} onClick={() => { setTipo(x); setCausale(CAUSALI[x][0]); vib(5); }}>
            {x === 'carico' ? 'Carico' : x === 'scarico' ? 'Scarico' : 'Inventario'}
          </button>
        ))}
      </div>
      <div className="a-two">
        <F label={tipo === 'rettifica' ? 'Giacenza contata' : 'Quantità'} value={qty} onChange={setQty} inputMode="decimal" placeholder="0" />
        <label className="a-fld">
          <span>Dopo il movimento</span>
          <input readOnly value={`${dopo.toLocaleString('it-IT')} ${p.unit || 'pz'}`} className={dopo < 0 ? 'a-neg' : ''} />
        </label>
      </div>
      <label className="a-fld">
        <span>Causale</span>
        <select value={causale} onChange={(e) => setCausale(e.target.value)}>
          {CAUSALI[tipo].map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <F label="Documento di riferimento (facoltativo)" value={rif} onChange={setRif} placeholder="es. fattura fornitore n. 128" />
      {storico.length > 0 && (
        <div className="a-grp">
          <div className="a-grph"><b>Storico di questo articolo</b></div>
          {storico.slice(0, 12).map((m) => (
            <div key={m.id} className="a-row a-row-s">
              <span className="a-tx"><b>{m.causale}</b><small>{[dataIt(m.data), m.docRef].filter(Boolean).join(' · ')}</small></span>
              <span className={`a-amt a-mq-${m.tipo}`}>{m.prima} → {m.dopo}</span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
};
