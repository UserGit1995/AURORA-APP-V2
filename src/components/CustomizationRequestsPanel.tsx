import React, { useCallback, useEffect, useState } from 'react';
import { Palette, Loader2, AlertCircle, Mail, Phone, Trash2, Check, RefreshCw, ExternalLink } from 'lucide-react';
import {
  listCustomizationRequests,
  updateCustomizationStatus,
  deleteCustomizationRequest,
  CustomizationRequestRow,
  CustomizationStatus,
  STATUS_LABELS,
  PRODUCT_TYPE_LABELS,
} from '../services/customization';

const PANEL_CARD = 'bg-[#0d1420] border border-[#1c2433] rounded-2xl';
const STATUS_STYLES: Record<string, string> = {
  new: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  processing: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-300 border-red-500/30',
};
const FILTERS: { id: 'all' | CustomizationStatus; label: string }[] = [
  { id: 'all', label: 'Tutte' },
  { id: 'new', label: 'Nuove' },
  { id: 'processing', label: 'In lavorazione' },
  { id: 'delivered', label: 'Consegnate' },
  { id: 'cancelled', label: 'Annullate' },
];

interface Props {
  /** Avvisa il pannello quando cambia il numero di richieste "nuove" (per il badge sulla tab). */
  onNewCountChange?: (count: number) => void;
}

export const CustomizationRequestsPanel: React.FC<Props> = ({ onNewCountChange }) => {
  const [requests, setRequests] = useState<CustomizationRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | CustomizationStatus>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listCustomizationRequests();
      setRequests(rows);
      onNewCountChange?.(rows.filter((r) => r.status === 'new').length);
    } catch (e: any) {
      setError(e?.message ?? 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [onNewCountChange]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(r: CustomizationRequestRow, status: CustomizationStatus, adminNotes?: string) {
    setActionError(null);
    setBusyId(r.id);
    try {
      await updateCustomizationStatus(r.id, status, adminNotes);
      setSavedId(r.id);
      setTimeout(() => setSavedId((cur) => (cur === r.id ? null : cur)), 2000);
      await load();
    } catch (e: any) {
      setActionError(e?.message ?? 'Errore');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(r: CustomizationRequestRow) {
    if (!window.confirm('Eliminare questa richiesta di personalizzazione? L\'operazione non si può annullare.')) return;
    setActionError(null);
    setBusyId(r.id);
    try {
      await deleteCustomizationRequest(r.id, r.logo_url);
      await load();
    } catch (e: any) {
      setActionError(e?.message ?? 'Errore');
    } finally {
      setBusyId(null);
    }
  }

  const visible = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Palette className="w-5 h-5 text-sky-400" /> Richieste di Personalizzazione
        </h2>
        <button
          type="button" onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#081326] border border-[#1c2433] text-xs text-slate-300 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Aggiorna
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.id === 'all' ? requests.length : requests.filter((r) => r.status === f.id).length;
          return (
            <button
              key={f.id} type="button" onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-sky-600 border-sky-500 text-white'
                  : 'bg-[#081326] border-[#1c2433] text-slate-400 hover:text-white'
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Errore nel caricamento delle richieste</p>
            <p className="mt-1 text-xs">{error}</p>
            <p className="mt-1 text-xs text-red-300/80">
              Se l'errore parla di permessi, accedi con un account admin (ruolo "admin" in user_roles).
              Se dice che la tabella non esiste, esegui le migrazioni SQL della personalizzazione.
            </p>
          </div>
        </div>
      )}

      {actionError && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{actionError}</span>
        </div>
      )}

      {loading && requests.length === 0 && !error && (
        <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carico…</p>
      )}

      {!loading && !error && visible.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-8">
          {requests.length === 0 ? 'Nessuna richiesta di personalizzazione ancora.' : 'Nessuna richiesta in questo stato.'}
        </p>
      )}

      <div className="space-y-3">
        {visible.map((r) => {
          const isOpen = expanded === r.id;
          const notes = notesDraft[r.id] ?? r.admin_notes ?? '';
          const busy = busyId === r.id;
          return (
            <div key={r.id} className={`${PANEL_CARD} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${STATUS_STYLES[r.status] ?? STATUS_STYLES.new}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                    <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString('it-IT')}</span>
                    <span className="px-2 py-0.5 rounded-md border border-[#1c2433] text-[11px] text-slate-300">
                      {PRODUCT_TYPE_LABELS[r.product_type] ?? r.product_type}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-white text-sm">
                    {r.customer_name}{r.customer_company ? ` — ${r.customer_company}` : ''} · {r.quantity} pz,{' '}
                    {r.print_colors} {r.print_colors === 1 ? 'colore' : 'colori'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <a href={`mailto:${r.customer_email}`} className="inline-flex items-center gap-1 text-sky-400 hover:underline">
                      <Mail className="w-3 h-3" /> {r.customer_email}
                    </a>
                    <a href={`tel:${r.customer_phone}`} className="inline-flex items-center gap-1 text-sky-400 hover:underline">
                      <Phone className="w-3 h-3" /> {r.customer_phone}
                    </a>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button" onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="px-3 py-1.5 rounded-lg border border-[#1c2433] bg-[#081326] text-xs text-slate-200 hover:text-white"
                  >
                    {isOpen ? 'Chiudi' : 'Dettagli'}
                  </button>
                  <button
                    type="button" onClick={() => remove(r)} disabled={busy} aria-label="Elimina richiesta"
                    className="px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 grid gap-4 border-t border-[#1c2433] pt-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <img
                      src={r.logo_url} alt="Logo cliente"
                      className="max-h-40 rounded-lg border border-[#1c2433] bg-white/5 object-contain p-2"
                    />
                    <a
                      href={r.logo_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Apri il logo a schermo intero
                    </a>
                    {r.notes && (
                      <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 bg-[#081326] border border-[#1c2433] rounded-lg p-3">
                        {r.notes}
                      </pre>
                    )}
                    <a
                      href={`/personalizzazione/${r.access_token}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-sky-300"
                    >
                      <ExternalLink className="w-3 h-3" /> Pagina che vede il cliente
                    </a>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">Stato</label>
                      <select
                        value={r.status} disabled={busy}
                        onChange={(e) => changeStatus(r, e.target.value as CustomizationStatus)}
                        className="w-full bg-[#081326] border border-[#1c2433] rounded-lg px-3 py-2 text-sm text-white"
                      >
                        {(Object.keys(STATUS_LABELS) as CustomizationStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">
                        Nota (visibile anche al cliente)
                      </label>
                      <textarea
                        rows={3} maxLength={2000} value={notes}
                        onChange={(e) => setNotesDraft({ ...notesDraft, [r.id]: e.target.value })}
                        className="w-full bg-[#081326] border border-[#1c2433] focus:border-sky-500 focus:outline-none rounded-lg px-3 py-2 text-sm text-white"
                      />
                      <button
                        type="button" disabled={busy}
                        onClick={() => changeStatus(r, r.status as CustomizationStatus, notes)}
                        className="mt-2 px-4 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedId === r.id ? <Check className="w-3.5 h-3.5" /> : null}
                        {savedId === r.id ? 'Salvato' : 'Salva nota'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
