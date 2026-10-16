import React, { useMemo, useState } from 'react';
import { useAdmin } from '../../../context/AdminContext';
import { Order, Product } from '../../../types';
import { COMPANY } from '../../../config/company';
import { Ic, Bi, eur, vib } from '../../Icona';
import {
  CLIENTE_VUOTO, Cliente, DatiAzienda, Ddt, Fattura, NATURE, PAGAMENTI, RigaDdt, RigaFattura, TIPI_DOC,
  dataIt, nomeCliente, oggiIso, prossimoNumero, remove, save, soloCifre, totaliFattura, useArchivio, useAzienda,
} from './store';
import { controllaFattura, creaXml, nomeFileXml } from './fatturaXml';
import { registraMovimento } from './Magazzino';
import { ClienteSheet } from './Clienti';
import { Area, ClientPicker, Count, F, Group, ProductPicker, Sel, Sheet, Toggle, condividi, iniziali, scarica } from './ui';

/* DDT e fatture elettroniche, con PDF col logo in rilievo e XML per lo SDI. */

const anno = () => new Date().getFullYear();
const oraAdesso = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const pdfLib = () => import('./docPdf');

/** I dati azienda: quelli salvati, altrimenti quelli già presenti nell'app */
export const useDatiAzienda = () => {
  const { systemSettings } = useAdmin();
  const m = COMPANY.address.match(/^(.*?)\s+([\d/]+[A-Za-z]?),\s*(\d{5})\s+(.*?)\s*\((\w{2})\)/);
  return useAzienda({
    denominazione: systemSettings.companyName || COMPANY.name,
    piva: systemSettings.vatNumber || COMPANY.vatNumber,
    cf: systemSettings.vatNumber || COMPANY.vatNumber,
    indirizzo: m?.[1] || '',
    civico: m?.[2] || '',
    cap: m?.[3] || '',
    comune: m?.[4] || '',
    provincia: m?.[5] || '',
    telefono: COMPANY.phone,
    email: systemSettings.contactEmail || COMPANY.email,
  });
};

/** Cliente dalla rubrica che corrisponde all'ordine, altrimenti uno nuovo con i dati dell'ordine */
const clienteDaOrdine = (o: Order, rubrica: Cliente[]): Cliente => {
  const a = o.shippingAddress;
  const nome = a?.companyName || a?.recipient || 'Cliente';
  const tel = soloCifre(a?.phone || '').slice(-9);
  const found = rubrica.find(
    (c) => (tel.length >= 6 && soloCifre(c.telefono).slice(-9) === tel) || (a?.vatNumber && soloCifre(c.piva) === soloCifre(a.vatNumber)) || nomeCliente(c).toLowerCase() === nome.toLowerCase()
  );
  if (found) return found;
  const civ = (a?.street || '').match(/^(.*?)[,\s]+(\d+[\w/]*)$/);
  return {
    ...CLIENTE_VUOTO,
    id: '',
    createdAt: '',
    tipoSoggetto: a?.customerType === 'privato' ? 'privato' : 'azienda',
    ragioneSociale: nome,
    nome: a?.customerType === 'privato' ? (a?.recipient || '').split(' ')[0] || '' : '',
    cognome: a?.customerType === 'privato' ? (a?.recipient || '').split(' ').slice(1).join(' ') : '',
    piva: /^\d{11}$/.test(soloCifre(a?.vatNumber || '')) ? soloCifre(a?.vatNumber || '') : '',
    cf: a?.fiscalCode || (a?.vatNumber && !/^\d{11}$/.test(soloCifre(a.vatNumber)) ? a.vatNumber : ''),
    sdi: a?.sdiCode && /^[A-Za-z0-9]{7}$/.test(a.sdiCode) ? a.sdiCode.toUpperCase() : '',
    pec: a?.sdiCode && /@/.test(a.sdiCode) ? a.sdiCode : '',
    indirizzo: civ ? civ[1] : a?.street || '',
    civico: civ ? civ[2] : '',
    cap: a?.postalCode || '',
    comune: a?.city || '',
    provincia: (a?.province || '').toUpperCase().slice(0, 2),
    telefono: a?.phone || '',
    email: a?.email || '',
    fonte: 'manuale',
  };
};

/** Scelta di un ordine dell'app da cui partire */
const OrdinePicker: React.FC<{ onPick: (o: Order) => void; onClose: () => void }> = ({ onPick, onClose }) => {
  const { ordersList } = useAdmin();
  const list = useMemo(() => ordersList.filter((o) => o.status !== 'Annullato').slice(0, 60), [ordersList]);
  return (
    <Sheet title="Parti da un ordine" onClose={onClose}>
      {list.map((o) => (
        <button key={o.id} type="button" className="a-row" onClick={() => onPick(o)}>
          <span className="a-oav">{iniziali(o.shippingAddress?.companyName || o.shippingAddress?.recipient || 'C')}</span>
          <span className="a-tx">
            <b>{o.shippingAddress?.companyName || o.shippingAddress?.recipient || 'Cliente'}</b>
            <small>{[o.id, o.date, `${o.items.length} articoli`].join(' · ')}</small>
          </span>
          <span className="a-amt">{eur(o.total || 0)}</span>
        </button>
      ))}
      {list.length === 0 && <div className="a-empty">Nessun ordine.</div>}
    </Sheet>
  );
};

/** Campo numerico con la virgola: si conferma uscendo dal campo */
const NumIn: React.FC<{ value: number; onChange: (v: number) => void; placeholder?: string; blank?: boolean }> = ({ value, onChange, placeholder, blank }) => {
  const fmt = (v: number) => (blank && !v ? '' : String(v).replace('.', ','));
  const [t, setT] = useState(fmt(value));
  const focus = React.useRef(false);
  React.useEffect(() => {
    if (!focus.current) setT(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const commit = (x: string) => {
    const v = parseFloat(x.includes(',') ? x.replace(/\./g, '').replace(',', '.') : x);
    onChange(isNaN(v) ? 0 : v);
  };
  return (
    <input
      inputMode="decimal"
      value={t}
      placeholder={placeholder}
      onFocus={() => (focus.current = true)}
      onChange={(e) => {
        setT(e.target.value);
        commit(e.target.value);
      }}
      onBlur={() => {
        focus.current = false;
        setT(fmt(value));
      }}
    />
  );
};

/** Tabella righe modificabile (comune a DDT e fatture) */
function RigheEditor<T extends RigaDdt | RigaFattura>({
  righe, setRighe, fattura, products, ivaDef,
}: { righe: T[]; setRighe: (r: T[]) => void; fattura: boolean; products: Product[]; ivaDef: number }) {
  const upd = (i: number, k: string, v: string | number) => setRighe(righe.map((r, j) => (j === i ? ({ ...r, [k]: v } as T) : r)));
  const add = (p?: Product) => {
    const base: RigaDdt = { productId: p?.id, code: p?.code || '', descrizione: p?.name || '', um: p?.unit || 'pz', qty: 1, prezzo: p?.price };
    const r = fattura ? ({ ...base, prezzo: p?.price || 0, sconto: 0, iva: ivaDef, natura: '' } as RigaFattura) : base;
    setRighe([...righe, r as T]);
  };
  return (
    <div className="a-righe">
      {righe.map((r, i) => {
        const rf = r as RigaFattura;
        return (
          <div key={i} className="a-riga">
            <div className="a-riga-top">
              <span className="a-rn">{i + 1}</span>
              <input className="a-rdesc" value={r.descrizione} onChange={(e) => upd(i, 'descrizione', e.target.value)} placeholder="Descrizione" />
              <button type="button" className="a-rx" aria-label="Togli riga" onClick={() => setRighe(righe.filter((_, j) => j !== i))}><Ic n="x" s={14} /></button>
            </div>
            <div className={`a-riga-f${fattura ? ' a-riga-ff' : ''}`}>
              <label><span>Codice</span><input value={r.code} onChange={(e) => upd(i, 'code', e.target.value)} /></label>
              <label><span>Q.tà</span><NumIn value={r.qty} onChange={(v) => upd(i, 'qty', v)} /></label>
              <label><span>U.M.</span><input value={r.um} onChange={(e) => upd(i, 'um', e.target.value)} /></label>
              {fattura && (
                <>
                  <label><span>Prezzo €</span><NumIn value={rf.prezzo} onChange={(v) => upd(i, 'prezzo', v)} /></label>
                  <label><span>Sconto %</span><NumIn value={rf.sconto || 0} blank placeholder="0" onChange={(v) => upd(i, 'sconto', v)} /></label>
                  <label>
                    <span>IVA</span>
                    <select value={rf.iva ? String(rf.iva) : rf.natura || '0'} onChange={(e) => {
                      const v = e.target.value;
                      if (/^N/.test(v)) setRighe(righe.map((x, j) => (j === i ? ({ ...x, iva: 0, natura: v } as T) : x)));
                      else setRighe(righe.map((x, j) => (j === i ? ({ ...x, iva: parseFloat(v), natura: '' } as T) : x)));
                    }}>
                      {[22, 10, 5, 4].map((x) => <option key={x} value={x}>{x}%</option>)}
                      {Object.entries(NATURE).map(([k, t]) => <option key={k} value={k}>0% {t}</option>)}
                    </select>
                  </label>
                </>
              )}
            </div>
            {fattura && <div className="a-riga-tot">{eur(Math.round(r.qty * rf.prezzo * (1 - (rf.sconto || 0) / 100) * 100) / 100)}</div>}
          </div>
        );
      })}
      <ProductPicker products={products} onPick={(p) => add(p)} onFree={() => add()} />
    </div>
  );
}

const statoPill = (t: string, cls: string) => <span className={`a-pill ${cls}`}><i />{t}</span>;

/* =========================== DDT =========================== */
export const DdtView: React.FC<{ toast: (t: string) => void; onFattura: (d: Ddt) => void }> = ({ toast, onFattura }) => {
  const { rows, ready, error } = useArchivio('ddt');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Partial<Ddt> | null>(null);
  const [daOrdine, setDaOrdine] = useState(false);
  const { rows: rubrica } = useArchivio('cliente');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((d) => `${d.numero}/${d.anno}`.includes(s) || nomeCliente(d.cliente).toLowerCase().includes(s)) : rows;
  }, [rows, q]);
  const quest = rows.filter((d) => d.anno === anno());

  const nuovo = (extra: Partial<Ddt> = {}): Partial<Ddt> => ({
    anno: anno(),
    numero: prossimoNumero(rows, anno()),
    data: oggiIso(),
    ora: oraAdesso(),
    clienteId: '',
    cliente: null,
    destinazione: '',
    causale: 'Vendita',
    trasporto: 'Mittente',
    vettore: '',
    porto: 'Franco',
    aspetto: 'Scatole',
    colli: '',
    peso: '',
    righe: [],
    note: '',
    scaricato: false,
    ...extra,
  });

  return (
    <>
      <div className="a-kpis a-kpis3">
        <div className="a-card a-kpi"><Bi n="truck" s={30} /><p className="a-v"><Count v={quest.length} /></p><p>DDT nel {anno()}</p></div>
        <div className="a-card a-kpi"><Bi n="invoice" s={30} /><p className="a-v"><Count v={quest.filter((d) => !d.fatturaId).length} /></p><p>Da fatturare</p></div>
        <div className="a-card a-kpi"><Bi n="boxes" s={30} /><p className="a-v"><Count v={quest.reduce((s, d) => s + d.righe.length, 0)} /></p><p>Righe di merce spedite</p></div>
      </div>
      <div className="a-tool">
        <label className="a-fin">
          <Ic n="search" s={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per numero o cliente" />
        </label>
        <button type="button" className="a-btn a-gh a-sm" onClick={() => setDaOrdine(true)}><Ic n="orders" s={15} /> Da un ordine</button>
        <button type="button" className="a-btn a-prim a-sm" onClick={() => setEdit(nuovo())}><Ic n="plus" s={15} /> Nuovo DDT</button>
      </div>
      {error && <div className="a-card a-warn"><Ic n="shield" s={18} />{error}</div>}
      <div className="a-card a-list">
        <div className="a-ch"><h2>Documenti di trasporto</h2></div>
        {!ready && <div className="a-empty">Caricamento…</div>}
        {ready && list.length === 0 && <div className="a-empty">Ancora nessun DDT.</div>}
        {list.map((d, i) => (
          <button key={d.id} type="button" className="a-row a-crow" style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }} onClick={() => setEdit(d)}>
            <span className="a-docn"><small>DDT</small>{d.numero}</span>
            <span className="a-tx">
              <b>{nomeCliente(d.cliente) || 'Senza cliente'}</b>
              <small>{[dataIt(d.data), `${d.righe.length} ${d.righe.length === 1 ? 'riga' : 'righe'}`, d.causale].join(' · ')}</small>
            </span>
            <span className="a-rt">{d.fatturaId ? statoPill('Fatturato', 'a-p-done') : statoPill('Da fatturare', 'a-p-new')}</span>
          </button>
        ))}
      </div>
      {daOrdine && (
        <OrdinePicker
          onClose={() => setDaOrdine(false)}
          onPick={(o) => {
            setDaOrdine(false);
            const c = clienteDaOrdine(o, rubrica);
            setEdit(
              nuovo({
                cliente: c,
                clienteId: c.id,
                orderId: o.id,
                note: `Rif. ordine ${o.id} del ${o.date}`,
                righe: o.items.map((it) => ({ productId: it.productId, code: it.code || '', descrizione: it.productName, um: 'pz', qty: it.qty, prezzo: it.price })),
              })
            );
          }}
        />
      )}
      {edit && <DdtSheet d={edit} onClose={() => setEdit(null)} toast={toast} onFattura={(d) => { setEdit(null); onFattura(d); }} />}
    </>
  );
};

const DdtSheet: React.FC<{ d: Partial<Ddt>; onClose: () => void; toast: (t: string) => void; onFattura: (d: Ddt) => void }> = ({ d: start, onClose, toast, onFattura }) => {
  const { productsList, updateProduct } = useAdmin();
  const { rows: rubrica } = useArchivio('cliente');
  const { azienda } = useDatiAzienda();
  const [d, setD] = useState<Partial<Ddt>>(start);
  const [scarica_, setScarica] = useState(!start.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [nuovoCli, setNuovoCli] = useState(false);
  const set = <K extends keyof Ddt>(k: K) => (v: Ddt[K]) => setD((x) => ({ ...x, [k]: v }));

  const salva = async (): Promise<Ddt | null> => {
    if (!d.cliente) {
      toast('Scegli il destinatario');
      return null;
    }
    if (!d.righe?.length) {
      toast('Aggiungi almeno un articolo');
      return null;
    }
    setBusy('salva');
    try {
      let cli = d.cliente;
      if (!cli.id) cli = await save('cliente', cli); // cliente arrivato da un ordine: lo metto in rubrica
      let row = await save('ddt', { ...(d as Ddt), cliente: cli, clienteId: cli.id });
      if (scarica_ && !row.scaricato) {
        const stock: Record<string, number> = {};
        for (const r of row.righe) {
          const p = r.productId ? productsList.find((x) => x.id === r.productId) : undefined;
          if (!p) continue;
          const cur = stock[p.id] ?? p.stock ?? 0;
          stock[p.id] = await registraMovimento(updateProduct, { ...p, stock: cur }, 'scarico', r.qty, 'Vendita', `DDT ${row.numero}/${row.anno}`);
        }
        row = await save('ddt', { ...row, scaricato: true });
      }
      setD(row);
      vib(10);
      toast(d.id ? 'DDT aggiornato' : `DDT n. ${row.numero} salvato`);
      return row;
    } catch (e) {
      toast((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const pdf = async (share: boolean) => {
    const row = await salva();
    if (!row) return;
    setBusy('pdf');
    try {
      const { pdfDdt, nomePdf } = await pdfLib();
      const doc = await pdfDdt(row, azienda);
      const nome = nomePdf('DDT', row.numero, row.anno, nomeCliente(row.cliente));
      const blob = doc.output('blob');
      if (share) await condividi(blob, nome, `DDT n. ${row.numero} del ${dataIt(row.data)}`);
      else scarica(blob, nome);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const elimina = async () => {
    if (!d.id) return;
    if (!window.confirm(`Eliminare il DDT n. ${d.numero}/${d.anno}?${d.scaricato ? ' Le quantità scaricate NON vengono ricaricate in automatico.' : ''}`)) return;
    try {
      await remove('ddt', d.id);
      toast('DDT eliminato');
      onClose();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <Sheet
      wide
      title={d.id ? `DDT n. ${d.numero}/${d.anno}` : 'Nuovo DDT'}
      onClose={onClose}
      footer={
        <>
          {d.id ? <button type="button" className="a-btn a-gh a-del" onClick={elimina} aria-label="Elimina"><Ic n="x" s={16} /></button> : null}
          <button type="button" className="a-btn a-gh" disabled={!!busy} onClick={() => pdf(false)}><Ic n="download" s={15} /> PDF</button>
          <button type="button" className="a-btn a-gh a-hide-d" disabled={!!busy} onClick={() => pdf(true)}><Ic n="whats" s={15} /> Invia</button>
          <button type="button" className="a-btn a-prim" disabled={!!busy} onClick={salva}>{busy === 'salva' ? 'Salvo…' : 'Salva'}</button>
        </>
      }
    >
      <div className="a-three a-dt">
        <F label="Numero" value={String(d.numero || '')} onChange={(v) => set('numero')(parseInt(v, 10) || 0)} inputMode="numeric" />
        <F label="Data" type="date" value={d.data || ''} onChange={(v) => setD((x) => ({ ...x, data: v, anno: parseInt(v.slice(0, 4), 10) || x.anno }))} />
        <F label="Ora partenza" type="time" value={d.ora || ''} onChange={set('ora')} />
      </div>
      <Group title="Destinatario">
        <ClientPicker clienti={rubrica} value={d.cliente || null} onPick={(c) => setD((x) => ({ ...x, cliente: c, clienteId: c?.id || '' }))} onNew={() => setNuovoCli(true)} />
        <Area label="Luogo di destinazione (se diverso)" value={d.destinazione || ''} onChange={set('destinazione')} rows={2} placeholder={'es. Punto vendita\nVia Roma 10, 00100 Roma'} />
      </Group>
      <Group title="Trasporto">
        <div className="a-two">
          <Sel label="Causale" value={d.causale || 'Vendita'} onChange={set('causale')} options={['Vendita', 'Conto visione', 'Tentata vendita', 'Reso', 'Omaggio', 'Riparazione', 'Conto deposito'].map((x) => [x, x])} />
          <Sel label="Trasporto a cura del" value={d.trasporto || 'Mittente'} onChange={(v) => set('trasporto')(v as Ddt['trasporto'])} options={[['Mittente', 'Mittente'], ['Destinatario', 'Destinatario'], ['Vettore', 'Vettore']]} />
        </div>
        {d.trasporto === 'Vettore' && <F label="Vettore (nome e indirizzo)" value={d.vettore || ''} onChange={set('vettore')} placeholder="es. BRT S.p.A." />}
        <div className="a-four">
          <Sel label="Porto" value={d.porto || 'Franco'} onChange={(v) => set('porto')(v as Ddt['porto'])} options={[['Franco', 'Franco'], ['Assegnato', 'Assegnato']]} />
          <F label="Aspetto dei beni" value={d.aspetto || ''} onChange={set('aspetto')} />
          <F label="Colli" value={d.colli || ''} onChange={set('colli')} inputMode="numeric" />
          <F label="Peso kg" value={d.peso || ''} onChange={set('peso')} inputMode="decimal" />
        </div>
      </Group>
      <Group title="Merce" right={<small className="a-chs">{d.righe?.length || 0} righe</small>}>
        <RigheEditor righe={d.righe || []} setRighe={(r) => set('righe')(r)} fattura={false} products={productsList} ivaDef={azienda.ivaPredefinita} />
      </Group>
      <Area label="Note" value={d.note || ''} onChange={set('note')} rows={2} />
      {d.scaricato ? (
        <div className="a-hint"><Ic n="check" s={16} />Le quantità di questo DDT sono già state scaricate dal magazzino.</div>
      ) : (
        <Toggle label="Scarica le quantità dal magazzino" sub="Al salvataggio, una sola volta" on={scarica_} onChange={setScarica} />
      )}
      {d.id && !d.fatturaId && (
        <button type="button" className="a-full" onClick={() => onFattura(d as Ddt)}>Crea la fattura da questo DDT <Ic n="chev" s={14} /></button>
      )}
      {nuovoCli && (
        <ClienteSheet c={{}} toast={toast} onClose={() => setNuovoCli(false)} onSaved={(c) => setD((x) => ({ ...x, cliente: c, clienteId: c.id }))} />
      )}
    </Sheet>
  );
};

/* =========================== FATTURE =========================== */
export const FattureView: React.FC<{ toast: (t: string) => void; daDdt: Ddt | null; onDaDdtUsed: () => void }> = ({ toast, daDdt, onDaDdtUsed }) => {
  const { rows, ready, error } = useArchivio('fattura');
  const { rows: ddts } = useArchivio('ddt');
  const { rows: rubrica } = useArchivio('cliente');
  const { azienda } = useDatiAzienda();
  const { productsList } = useAdmin();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Partial<Fattura> | null>(null);
  const [daOrdine, setDaOrdine] = useState(false);
  const [sceltaDdt, setSceltaDdt] = useState(false);

  const nuova = (extra: Partial<Fattura> = {}): Partial<Fattura> => ({
    anno: anno(),
    numero: prossimoNumero(rows, anno()),
    data: oggiIso(),
    tipoDoc: 'TD01',
    clienteId: '',
    cliente: null,
    righe: [],
    ddtRif: [],
    fatturaRif: '',
    pagamento: 'MP05',
    scadenza: '',
    causale: '',
    note: '',
    stato: 'bozza',
    ...extra,
  });

  const daDdts = (lista: Ddt[]) => {
    const c = lista[0].cliente;
    return nuova({
      tipoDoc: 'TD24',
      cliente: c,
      clienteId: c?.id || '',
      ddtRif: lista.map((x) => ({ id: x.id, numero: x.numero, data: x.data })),
      righe: lista.flatMap((x) =>
        x.righe.map((r) => {
          const p = r.productId ? productsList.find((y) => y.id === r.productId) : undefined;
          return { productId: r.productId, code: r.code, descrizione: r.descrizione, um: r.um, qty: r.qty, prezzo: r.prezzo ?? p?.price ?? 0, sconto: 0, iva: azienda.ivaPredefinita, natura: '' };
        })
      ),
    });
  };

  React.useEffect(() => {
    if (daDdt) {
      setEdit(daDdts([daDdt]));
      onDaDdtUsed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daDdt]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((f) => `${f.numero}/${f.anno}`.includes(s) || nomeCliente(f.cliente).toLowerCase().includes(s)) : rows;
  }, [rows, q]);
  const quest = rows.filter((f) => f.anno === anno() && f.stato === 'emessa');
  const fatturato = quest.reduce((s, f) => s + totaliFattura(f.righe).totale * (f.tipoDoc === 'TD04' ? -1 : 1), 0);
  const mese = new Date().getMonth();
  const fattMese = quest.filter((f) => parseInt(f.data.slice(5, 7), 10) - 1 === mese).reduce((s, f) => s + totaliFattura(f.righe).totale * (f.tipoDoc === 'TD04' ? -1 : 1), 0);

  return (
    <>
      <div className="a-kpis a-kpis3">
        <div className="a-card a-kpi"><Bi n="invoice" s={30} /><p className="a-v"><Count v={fatturato} fmt={(x) => eur(x)} /></p><p>Fatturato {anno()}, IVA inclusa</p></div>
        <div className="a-card a-kpi"><Bi n="receipt" s={30} /><p className="a-v"><Count v={fattMese} fmt={(x) => eur(x)} /></p><p>Fatturato del mese</p></div>
        <div className="a-card a-kpi"><Bi n="seal" s={30} /><p className="a-v"><Count v={rows.filter((f) => f.stato === 'bozza').length} /></p><p>Bozze da emettere</p></div>
      </div>
      <div className="a-tool">
        <label className="a-fin">
          <Ic n="search" s={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per numero o cliente" />
        </label>
        <button type="button" className="a-btn a-gh a-sm" onClick={() => setSceltaDdt(true)}><Ic n="truck" s={15} /> Da DDT</button>
        <button type="button" className="a-btn a-gh a-sm" onClick={() => setDaOrdine(true)}><Ic n="orders" s={15} /> Da un ordine</button>
        <button type="button" className="a-btn a-prim a-sm" onClick={() => setEdit(nuova())}><Ic n="plus" s={15} /> Nuova fattura</button>
      </div>
      <div className="a-card a-howto">
        <Ic n="shield" s={20} />
        <span>
          <b>Come si invia allo SDI, gratis</b>
          <small>Emetti la fattura, scarica il file XML e caricalo su "Fatture e Corrispettivi" dell'Agenzia delle Entrate (Fatturazione elettronica → Trasmissione → Upload del file). Il PDF col tuo logo lo mandi al cliente.</small>
        </span>
        <a className="a-btn a-gh a-sm" href="https://ivaservizi.agenziaentrate.gov.it/portale/" target="_blank" rel="noreferrer">Apri il portale</a>
      </div>
      {error && <div className="a-card a-warn"><Ic n="shield" s={18} />{error}</div>}
      <div className="a-card a-list">
        <div className="a-ch"><h2>Fatture</h2></div>
        {!ready && <div className="a-empty">Caricamento…</div>}
        {ready && list.length === 0 && <div className="a-empty">Ancora nessuna fattura.</div>}
        {list.map((f, i) => (
          <button key={f.id} type="button" className="a-row a-crow" style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }} onClick={() => setEdit(f)}>
            <span className={`a-docn${f.tipoDoc === 'TD04' ? ' a-docn-nc' : ''}`}><small>{f.tipoDoc === 'TD04' ? 'NC' : 'FT'}</small>{f.numero}</span>
            <span className="a-tx">
              <b>{nomeCliente(f.cliente) || 'Senza cliente'}</b>
              <small>{[dataIt(f.data), TIPI_DOC[f.tipoDoc]].join(' · ')}</small>
            </span>
            <span className="a-rt">
              <span className="a-amt">{eur(totaliFattura(f.righe).totale)}</span>
              {f.stato === 'emessa' ? statoPill('Emessa', 'a-p-done') : statoPill('Bozza', 'a-p-new')}
            </span>
          </button>
        ))}
      </div>
      {daOrdine && (
        <OrdinePicker
          onClose={() => setDaOrdine(false)}
          onPick={(o) => {
            setDaOrdine(false);
            const c = clienteDaOrdine(o, rubrica);
            setEdit(
              nuova({
                cliente: c,
                clienteId: c.id,
                orderId: o.id,
                causale: `Ordine ${o.id} del ${o.date}`,
                righe: o.items.map((it) => ({ productId: it.productId, code: it.code || '', descrizione: it.productName, um: 'pz', qty: it.qty, prezzo: it.price, sconto: 0, iva: azienda.ivaPredefinita, natura: '' })),
              })
            );
          }}
        />
      )}
      {sceltaDdt && <SceltaDdt ddts={ddts.filter((d) => !d.fatturaId)} onClose={() => setSceltaDdt(false)} onPick={(l) => { setSceltaDdt(false); setEdit(daDdts(l)); }} />}
      {edit && <FatturaSheet f={edit} azienda={azienda} onClose={() => setEdit(null)} toast={toast} />}
    </>
  );
};

const SceltaDdt: React.FC<{ ddts: Ddt[]; onClose: () => void; onPick: (l: Ddt[]) => void }> = ({ ddts, onClose, onPick }) => {
  const [sel, setSel] = useState<string[]>([]);
  const cli = sel.length ? ddts.find((d) => d.id === sel[0])?.clienteId : null;
  return (
    <Sheet
      title="Fattura da DDT"
      onClose={onClose}
      footer={<button type="button" className="a-btn a-prim" disabled={!sel.length} onClick={() => onPick(ddts.filter((d) => sel.includes(d.id)))}>Crea fattura{sel.length > 1 ? ` da ${sel.length} DDT` : ''}</button>}
    >
      <p className="a-p">Scegli uno o più DDT dello stesso cliente: diventano una fattura differita.</p>
      {ddts.map((d) => {
        const on = sel.includes(d.id);
        const off = !!cli && d.clienteId !== cli;
        return (
          <button key={d.id} type="button" className={`a-row${on ? ' a-on' : ''}`} disabled={off} onClick={() => setSel((s) => (on ? s.filter((x) => x !== d.id) : [...s, d.id]))}>
            <span className={`a-chk${on ? ' a-on' : ''}`}>{on ? <Ic n="check" s={13} /> : null}</span>
            <span className="a-tx"><b>DDT {d.numero}/{d.anno} · {nomeCliente(d.cliente)}</b><small>{dataIt(d.data)} · {d.righe.length} righe</small></span>
          </button>
        );
      })}
      {ddts.length === 0 && <div className="a-empty">Nessun DDT da fatturare.</div>}
    </Sheet>
  );
};

const FatturaSheet: React.FC<{ f: Partial<Fattura>; azienda: DatiAzienda; onClose: () => void; toast: (t: string) => void }> = ({ f: start, azienda, onClose, toast }) => {
  const { productsList } = useAdmin();
  const { rows: rubrica } = useArchivio('cliente');
  const { rows: ddts } = useArchivio('ddt');
  const [f, setF] = useState<Partial<Fattura>>(start);
  const [busy, setBusy] = useState<string | null>(null);
  const [nuovoCli, setNuovoCli] = useState(false);
  const set = <K extends keyof Fattura>(k: K) => (v: Fattura[K]) => setF((x) => ({ ...x, [k]: v }));
  const tot = totaliFattura(f.righe || []);
  const problemi = controllaFattura(f as Fattura, azienda);
  const emessa = f.stato === 'emessa';

  const salva = async (stato?: Fattura['stato']): Promise<Fattura | null> => {
    if (!f.cliente) {
      toast('Scegli il cliente');
      return null;
    }
    if (stato === 'emessa' && problemi.length) {
      toast('Prima sistema: ' + problemi[0]);
      return null;
    }
    setBusy('salva');
    try {
      let cli = f.cliente;
      if (!cli.id) cli = await save('cliente', cli);
      const row = await save('fattura', { ...(f as Fattura), cliente: cli, clienteId: cli.id, stato: stato || f.stato || 'bozza' });
      // segno i DDT come fatturati
      for (const r of row.ddtRif) {
        const d = ddts.find((x) => x.id === r.id);
        if (d && d.fatturaId !== row.id) await save('ddt', { ...d, fatturaId: row.id });
      }
      setF(row);
      vib(10);
      toast(stato === 'emessa' ? `Fattura n. ${row.numero} emessa` : 'Fattura salvata');
      return row;
    } catch (e) {
      toast((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const pdf = async (share: boolean) => {
    const row = emessa ? (f as Fattura) : await salva();
    if (!row) return;
    setBusy('pdf');
    try {
      const { pdfFattura, nomePdf } = await pdfLib();
      const doc = await pdfFattura(row, azienda);
      const nome = nomePdf(row.tipoDoc === 'TD04' ? 'Nota di credito' : 'Fattura', row.numero, row.anno, nomeCliente(row.cliente));
      const blob = doc.output('blob');
      if (share) await condividi(blob, nome, `${TIPI_DOC[row.tipoDoc]} n. ${row.numero} del ${dataIt(row.data)}`);
      else scarica(blob, nome);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const xml = () => {
    if (!emessa) return toast('Prima emetti la fattura');
    const row = f as Fattura;
    scarica(new Blob([creaXml(row, azienda)], { type: 'application/xml' }), nomeFileXml(row, azienda));
    toast('File XML scaricato: caricalo sul portale');
  };

  const elimina = async () => {
    if (!f.id) return;
    if (!window.confirm(emessa ? 'Questa fattura è già emessa: se è già stata inviata allo SDI non va eliminata, si fa una nota di credito. Eliminarla comunque?' : 'Eliminare la bozza?')) return;
    try {
      for (const r of (f.ddtRif || [])) {
        const d = ddts.find((x) => x.id === r.id);
        if (d && d.fatturaId === f.id) await save('ddt', { ...d, fatturaId: undefined });
      }
      await remove('fattura', f.id);
      toast('Fattura eliminata');
      onClose();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const ro = emessa;
  return (
    <Sheet
      wide
      title={f.id ? `${TIPI_DOC[f.tipoDoc || 'TD01']} n. ${f.numero}/${f.anno}` : 'Nuova fattura'}
      onClose={onClose}
      footer={
        <>
          {f.id ? <button type="button" className="a-btn a-gh a-del" onClick={elimina} aria-label="Elimina"><Ic n="x" s={16} /></button> : null}
          <button type="button" className="a-btn a-gh" disabled={!!busy} onClick={() => pdf(false)}><Ic n="download" s={15} /> PDF</button>
          <button type="button" className="a-btn a-gh a-hide-d" disabled={!!busy} onClick={() => pdf(true)}><Ic n="whats" s={15} /> Invia</button>
          {emessa ? (
            <button type="button" className="a-btn a-prim" onClick={xml}><Ic n="download" s={15} /> XML per lo SDI</button>
          ) : (
            <>
              <button type="button" className="a-btn a-gh" disabled={!!busy} onClick={() => salva('bozza')}>Bozza</button>
              <button type="button" className="a-btn a-prim" disabled={!!busy} onClick={() => salva('emessa')}>{busy === 'salva' ? 'Salvo…' : 'Emetti'}</button>
            </>
          )}
        </>
      }
    >
      {emessa && (
        <div className="a-hint"><Ic n="check" s={16} />Fattura emessa: non si modifica più. Per correggerla fai una nota di credito.</div>
      )}
      <fieldset disabled={ro} className="a-fs">
        <div className="a-four">
          <Sel label="Tipo" value={f.tipoDoc || 'TD01'} onChange={(v) => set('tipoDoc')(v as Fattura['tipoDoc'])} options={Object.entries(TIPI_DOC).map(([k, t]) => [k, t])} />
          <F label="Numero" value={String(f.numero || '')} onChange={(v) => set('numero')(parseInt(v, 10) || 0)} inputMode="numeric" />
          <F label="Data" type="date" value={f.data || ''} onChange={(v) => setF((x) => ({ ...x, data: v, anno: parseInt(v.slice(0, 4), 10) || x.anno }))} />
          {f.tipoDoc === 'TD04' ? <F label="Rif. fattura n." value={f.fatturaRif || ''} onChange={set('fatturaRif')} placeholder="es. 12/2026" /> : <F label="Causale" value={f.causale || ''} onChange={set('causale')} placeholder="Vendita merce" />}
        </div>
        <Group title="Cliente">
          <ClientPicker clienti={rubrica} value={f.cliente || null} onPick={(c) => setF((x) => ({ ...x, cliente: c, clienteId: c?.id || '' }))} onNew={() => setNuovoCli(true)} />
          {f.cliente && f.cliente.id && (
            <button type="button" className="a-link" onClick={() => setNuovoCli(true)}><Ic n="edit" s={14} /> Completa i dati fiscali del cliente</button>
          )}
        </Group>
        {(f.ddtRif?.length || 0) > 0 && (
          <div className="a-hint"><Ic n="truck" s={16} />Riferita a {f.ddtRif!.map((x) => `DDT ${x.numero} del ${dataIt(x.data)}`).join(', ')}</div>
        )}
        <Group title="Righe" right={<small className="a-chs">{f.righe?.length || 0} righe</small>}>
          <RigheEditor righe={f.righe || []} setRighe={(r) => set('righe')(r)} fattura products={productsList} ivaDef={azienda.ivaPredefinita} />
        </Group>
        <div className="a-totbox">
          <span><small>Imponibile</small>{eur(tot.imponibile)}</span>
          <span><small>IVA</small>{eur(tot.imposta)}</span>
          <span className="a-totbig"><small>Totale documento</small>{eur(tot.totale)}</span>
        </div>
        <Group title="Pagamento">
          <div className="a-two">
            <Sel label="Modalità" value={f.pagamento || 'MP05'} onChange={(v) => set('pagamento')(v as Fattura['pagamento'])} options={Object.entries(PAGAMENTI).map(([k, t]) => [k, t])} />
            <F label="Scadenza" type="date" value={f.scadenza || ''} onChange={set('scadenza')} />
          </div>
        </Group>
        <Area label="Note (stampate sul documento)" value={f.note || ''} onChange={set('note')} rows={2} />
      </fieldset>
      {!emessa && problemi.length > 0 && (f.righe?.length || 0) > 0 && (
        <div className="a-probs">
          <b>Da sistemare prima di emettere</b>
          {problemi.map((p) => <span key={p}><i />{p}</span>)}
        </div>
      )}
      {nuovoCli && (
        <ClienteSheet
          c={f.cliente && f.cliente.id ? f.cliente : f.cliente || {}}
          toast={toast}
          onClose={() => setNuovoCli(false)}
          onSaved={(c) => setF((x) => ({ ...x, cliente: c, clienteId: c.id }))}
        />
      )}
    </Sheet>
  );
};

/* =========================== DATI AZIENDA =========================== */
export const AziendaView: React.FC<{ toast: (t: string) => void }> = ({ toast }) => {
  const { azienda, ready } = useDatiAzienda();
  const [a, setA] = useState<DatiAzienda | null>(null);
  const [busy, setBusy] = useState(false);
  React.useEffect(() => {
    if (ready && !a) setA(azienda);
  }, [ready, azienda, a]);
  if (!a) return <div className="a-empty">Caricamento…</div>;
  const set = (k: keyof DatiAzienda) => (v: string) => setA((x) => (x ? { ...x, [k]: v } : x));
  return (
    <div className="a-card a-form">
      <p className="a-p">Questi dati vanno in testa a DDT e fatture e dentro il file XML per lo SDI. Controllali bene una volta: poi restano salvati.</p>
      <Group title="Azienda">
        <F label="Ragione sociale" value={a.denominazione} onChange={set('denominazione')} />
        <div className="a-three a-eq">
          <F label="Partita IVA" value={a.piva} onChange={set('piva')} inputMode="numeric" />
          <F label="Codice fiscale" value={a.cf} onChange={set('cf')} upper />
          <Sel label="Regime fiscale" value={a.regimeFiscale} onChange={set('regimeFiscale')} options={[['RF01', 'RF01 - Ordinario'], ['RF02', 'RF02 - Contribuenti minimi'], ['RF19', 'RF19 - Forfettario']]} />
        </div>
      </Group>
      <Group title="Sede">
        <div className="a-two a-two-wide">
          <F label="Via / Piazza" value={a.indirizzo} onChange={set('indirizzo')} />
          <F label="Civico" value={a.civico} onChange={set('civico')} />
        </div>
        <div className="a-three">
          <F label="CAP" value={a.cap} onChange={set('cap')} inputMode="numeric" />
          <F label="Comune" value={a.comune} onChange={set('comune')} />
          <F label="Prov." value={a.provincia} onChange={(v) => set('provincia')(v.toUpperCase().slice(0, 2))} />
        </div>
      </Group>
      <Group title="Contatti">
        <div className="a-three a-eq">
          <F label="Telefono" value={a.telefono} onChange={set('telefono')} type="tel" />
          <F label="Email" value={a.email} onChange={set('email')} type="email" />
          <F label="PEC" value={a.pec} onChange={set('pec')} type="email" />
        </div>
      </Group>
      <Group title="Registro imprese (facoltativo)">
        <div className="a-three a-eq">
          <F label="Ufficio REA (provincia)" value={a.reaUfficio} onChange={(v) => set('reaUfficio')(v.toUpperCase().slice(0, 2))} placeholder="RM" />
          <F label="Numero REA" value={a.reaNumero} onChange={set('reaNumero')} />
          <F label="Capitale sociale €" value={a.capitale} onChange={set('capitale')} inputMode="decimal" />
        </div>
      </Group>
      <Group title="Pagamenti">
        <div className="a-two">
          <F label="IBAN" value={a.iban} onChange={(v) => set('iban')(v.toUpperCase())} />
          <F label="Banca" value={a.banca} onChange={set('banca')} />
        </div>
        <Sel label="IVA proposta sulle nuove righe" value={String(a.ivaPredefinita)} onChange={(v) => setA((x) => (x ? { ...x, ivaPredefinita: parseFloat(v) } : x))} options={[['22', '22%'], ['10', '10%'], ['5', '5%'], ['4', '4%']]} />
        <F label="Testo a piè di pagina (facoltativo)" value={a.piede} onChange={set('piede')} placeholder="es. Grazie per averci scelto" />
      </Group>
      <div className="a-sf a-sf-in">
        <button
          type="button"
          className="a-btn a-prim"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setA(await save('config', a));
              vib(10);
              toast('Dati azienda salvati');
            } catch (e) {
              toast((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Salvo…' : 'Salva i dati'}
        </button>
      </div>
    </div>
  );
};
