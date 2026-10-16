import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getSupabase } from '../../../services/supabase';

/*
 * Archivio del gestionale (clienti, movimenti, DDT, fatture, dati azienda).
 * Tutto sta nella tabella gest_archivio (vedi supabase/gestionale.sql).
 */

export type Tipo = 'cliente' | 'movimento' | 'ddt' | 'fattura' | 'config';

export interface Cliente {
  id: string;
  tipoSoggetto: 'azienda' | 'privato';
  ragioneSociale: string;
  nome: string;
  cognome: string;
  piva: string;
  cf: string;
  sdi: string;
  pec: string;
  indirizzo: string;
  civico: string;
  cap: string;
  comune: string;
  provincia: string;
  nazione: string;
  telefono: string;
  email: string;
  note: string;
  fonte: 'manuale' | 'chat' | 'whatsapp' | 'rubrica';
  createdAt: string;
}

export interface Movimento {
  id: string;
  productId: string;
  productName: string;
  code: string;
  tipo: 'carico' | 'scarico' | 'rettifica';
  qty: number;
  prima: number;
  dopo: number;
  causale: string;
  docRef: string;
  data: string;
  createdAt: string;
}

export interface RigaDdt {
  productId?: string;
  code: string;
  descrizione: string;
  um: string;
  qty: number;
  prezzo?: number;
}

export interface Ddt {
  id: string;
  anno: number;
  numero: number;
  data: string; // yyyy-mm-dd
  ora: string; // hh:mm inizio trasporto
  clienteId: string;
  cliente: Cliente | null;
  destinazione: string;
  causale: string;
  trasporto: 'Mittente' | 'Destinatario' | 'Vettore';
  vettore: string;
  porto: 'Franco' | 'Assegnato';
  aspetto: string;
  colli: string;
  peso: string;
  righe: RigaDdt[];
  note: string;
  scaricato: boolean;
  orderId?: string;
  fatturaId?: string;
  createdAt: string;
}

export interface RigaFattura {
  productId?: string;
  code: string;
  descrizione: string;
  um: string;
  qty: number;
  prezzo: number;
  sconto: number; // %
  iva: number; // %
  natura: string; // se iva = 0 (es. N2.2)
}

export interface Fattura {
  id: string;
  anno: number;
  numero: number;
  data: string;
  tipoDoc: 'TD01' | 'TD04' | 'TD24';
  clienteId: string;
  cliente: Cliente | null;
  righe: RigaFattura[];
  ddtRif: { id: string; numero: number; data: string }[];
  fatturaRif: string; // per le note di credito
  pagamento: 'MP01' | 'MP02' | 'MP05' | 'MP08' | 'MP12';
  scadenza: string;
  causale: string;
  note: string;
  stato: 'bozza' | 'emessa';
  orderId?: string;
  createdAt: string;
}

export interface DatiAzienda {
  id: string;
  denominazione: string;
  piva: string;
  cf: string;
  regimeFiscale: string;
  indirizzo: string;
  civico: string;
  cap: string;
  comune: string;
  provincia: string;
  telefono: string;
  email: string;
  pec: string;
  reaUfficio: string;
  reaNumero: string;
  capitale: string;
  iban: string;
  banca: string;
  ivaPredefinita: number;
  piede: string;
}

type ByTipo = { cliente: Cliente; movimento: Movimento; ddt: Ddt; fattura: Fattura; config: DatiAzienda };

/* ---------------- stato condiviso in memoria ---------------- */
type State = {
  loaded: Partial<Record<Tipo, boolean>>;
  rows: { [K in Tipo]: ByTipo[K][] };
  error: string | null;
};
let state: State = { loaded: {}, rows: { cliente: [], movimento: [], ddt: [], fattura: [], config: [] }, error: null };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const set = (s: Partial<State>) => {
  state = { ...state, ...s };
  emit();
};

const sb = () => {
  const c = getSupabase();
  if (!c) throw new Error('Connessione al database non disponibile');
  return c;
};

const friendly = (e: { message?: string; code?: string } | null): string => {
  const m = e?.message || 'Errore sconosciuto';
  if (e?.code === '42P01' || e?.code === 'PGRST205' || /gest_archivio/.test(m))
    return 'Manca la tabella del gestionale: lancia una volta il file gestionale.sql in Supabase (SQL Editor).';
  if (e?.code === '23505') return 'Questo numero è già usato da un altro documento dello stesso anno.';
  if (/row-level security|permission/i.test(m)) return 'Solo un amministratore può salvare nel gestionale.';
  return m;
};

const sortRows = <K extends Tipo>(t: K, l: ByTipo[K][]): ByTipo[K][] => {
  if (t === 'ddt' || t === 'fattura')
    return [...l].sort((a, b) => {
      const x = a as unknown as Ddt, y = b as unknown as Ddt;
      return y.anno - x.anno || y.numero - x.numero;
    });
  if (t === 'cliente')
    return [...l].sort((a, b) => nomeCliente(a as unknown as Cliente).localeCompare(nomeCliente(b as unknown as Cliente), 'it'));
  return [...l].sort((a, b) => ((b as unknown as Movimento).createdAt > (a as unknown as Movimento).createdAt ? 1 : -1));
};

const loading: Partial<Record<Tipo, Promise<void>>> = {};

export function load<K extends Tipo>(t: K, force = false): Promise<void> {
  if (!force && (state.loaded[t] || loading[t])) return loading[t] || Promise.resolve();
  const p = (async () => {
    try {
      let all: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb()
          .from('gest_archivio')
          .select('id, anno, numero, dati, created_at')
          .eq('tipo', t)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        all = all.concat(data || []);
        if (!data || data.length < 1000) break;
      }
      const rows = all.map((r) => ({
        ...(r.dati || {}),
        id: r.id,
        ...(r.numero != null ? { anno: r.anno, numero: r.numero } : {}),
        createdAt: r.dati?.createdAt || r.created_at,
      }));
      set({ rows: { ...state.rows, [t]: sortRows(t, rows) }, loaded: { ...state.loaded, [t]: true }, error: null });
    } catch (e) {
      set({ error: friendly(e as any), loaded: { ...state.loaded, [t]: true } });
    } finally {
      delete loading[t];
    }
  })();
  loading[t] = p;
  return p;
}

const newId = () =>
  (crypto as any).randomUUID
    ? (crypto as any).randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 3) | 8).toString(16);
      });

/** Salva (nuovo o modifica). Restituisce la riga salvata. */
export async function save<K extends Tipo>(t: K, row: Partial<ByTipo[K]> & { id?: string }): Promise<ByTipo[K]> {
  const id = row.id || newId();
  const createdAt = (row as any).createdAt || new Date().toISOString();
  const full = { ...row, id, createdAt } as ByTipo[K];
  const numbered = t === 'ddt' || t === 'fattura';
  const { error } = await sb()
    .from('gest_archivio')
    .upsert({
      id,
      tipo: t,
      anno: numbered ? (full as any).anno : null,
      numero: numbered ? (full as any).numero : null,
      dati: full,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(friendly(error));
  const list = state.rows[t] as ByTipo[K][];
  const i = list.findIndex((x) => (x as any).id === id);
  const next = i >= 0 ? list.map((x, j) => (j === i ? full : x)) : [full, ...list];
  set({ rows: { ...state.rows, [t]: sortRows(t, next) }, error: null });
  return full;
}

export async function remove(t: Tipo, id: string): Promise<void> {
  const { error } = await sb().from('gest_archivio').delete().eq('id', id);
  if (error) throw new Error(friendly(error));
  set({ rows: { ...state.rows, [t]: (state.rows[t] as any[]).filter((x) => x.id !== id) } });
}

/** Lista di un tipo, caricata alla prima richiesta */
export function useArchivio<K extends Tipo>(t: K): { rows: ByTipo[K][]; ready: boolean; error: string | null; reload: () => void } {
  const snap = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state
  );
  useEffect(() => {
    load(t);
  }, [t]);
  const reload = useCallback(() => {
    load(t, true);
  }, [t]);
  return { rows: snap.rows[t], ready: !!snap.loaded[t], error: snap.error, reload };
}

/** Clienti già caricati (per controlli veloci fuori dalle schermate) */
export const clientiCaricati = () => state.rows.cliente;

/* ---------------- dati azienda ---------------- */
export const AZIENDA_VUOTA: DatiAzienda = {
  id: '',
  denominazione: '',
  piva: '',
  cf: '',
  regimeFiscale: 'RF01',
  indirizzo: '',
  civico: '',
  cap: '',
  comune: '',
  provincia: '',
  telefono: '',
  email: '',
  pec: '',
  reaUfficio: '',
  reaNumero: '',
  capitale: '',
  iban: '',
  banca: '',
  ivaPredefinita: 22,
  piede: '',
};

export function useAzienda(defaults: Partial<DatiAzienda>) {
  const { rows, ready } = useArchivio('config');
  return { azienda: { ...AZIENDA_VUOTA, ...defaults, ...(rows[0] || {}) } as DatiAzienda, ready };
}

/* ---------------- utilità ---------------- */
export const nomeCliente = (c: Partial<Cliente> | null | undefined) =>
  !c ? '' : c.tipoSoggetto === 'privato' || !c.ragioneSociale ? [c.nome, c.cognome].filter(Boolean).join(' ') || c.ragioneSociale || '' : c.ragioneSociale;

export const CLIENTE_VUOTO: Omit<Cliente, 'id' | 'createdAt'> = {
  tipoSoggetto: 'azienda',
  ragioneSociale: '',
  nome: '',
  cognome: '',
  piva: '',
  cf: '',
  sdi: '',
  pec: '',
  indirizzo: '',
  civico: '',
  cap: '',
  comune: '',
  provincia: '',
  nazione: 'IT',
  telefono: '',
  email: '',
  note: '',
  fonte: 'manuale',
};

export const soloCifre = (s: string) => (s || '').replace(/\D/g, '');

/** Numero per i link WhatsApp: prefisso 39 se manca */
export const numeroWa = (tel: string) => {
  let d = soloCifre(tel);
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length >= 6 && d.length <= 10 && !d.startsWith('39')) d = '39' + d;
  return d;
};

export const oggiIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const dataIt = (iso: string) => {
  const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || '';
};

export const prossimoNumero = (l: { anno: number; numero: number }[], anno: number) =>
  l.filter((x) => x.anno === anno).reduce((m, x) => Math.max(m, x.numero || 0), 0) + 1;

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Totali di una fattura, con riepilogo per aliquota (come vuole lo SDI) */
export function totaliFattura(righe: RigaFattura[]) {
  const per: Record<string, { iva: number; natura: string; imponibile: number; imposta: number }> = {};
  let imponibile = 0;
  for (const r of righe) {
    const tot = r2(r.qty * r.prezzo * (1 - (r.sconto || 0) / 100));
    imponibile += tot;
    const k = `${r.iva}|${r.iva ? '' : r.natura}`;
    per[k] = per[k] || { iva: r.iva, natura: r.iva ? '' : r.natura, imponibile: 0, imposta: 0 };
    per[k].imponibile = r2(per[k].imponibile + tot);
  }
  let imposta = 0;
  for (const k of Object.keys(per)) {
    per[k].imposta = r2((per[k].imponibile * per[k].iva) / 100);
    imposta += per[k].imposta;
  }
  imponibile = r2(imponibile);
  imposta = r2(imposta);
  return { imponibile, imposta, totale: r2(imponibile + imposta), riepilogo: Object.values(per) };
}

export const TIPI_DOC: Record<Fattura['tipoDoc'], string> = {
  TD01: 'Fattura',
  TD24: 'Fattura differita',
  TD04: 'Nota di credito',
};
export const PAGAMENTI: Record<Fattura['pagamento'], string> = {
  MP01: 'Contanti',
  MP02: 'Assegno',
  MP05: 'Bonifico',
  MP08: 'Carta di pagamento',
  MP12: 'RIBA',
};
export const NATURE: Record<string, string> = {
  'N1': 'N1 - Escluse ex art. 15',
  'N2.1': 'N2.1 - Non soggette (artt. 7-7septies)',
  'N2.2': 'N2.2 - Non soggette, altri casi',
  'N3.1': 'N3.1 - Non imponibili, esportazioni',
  'N3.5': "N3.5 - Non imponibili, dichiarazione d'intento",
  'N4': 'N4 - Esenti',
  'N5': 'N5 - Regime del margine',
  'N6.1': 'N6.1 - Inversione contabile, rottami',
  'N7': 'N7 - IVA assolta in altro stato UE',
};
export const REGIMI: Record<string, string> = {
  RF01: 'RF01 - Ordinario',
  RF02: 'RF02 - Contribuenti minimi',
  RF19: 'RF19 - Forfettario',
};

