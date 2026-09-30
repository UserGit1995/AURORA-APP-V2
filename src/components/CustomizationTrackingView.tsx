import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle, SearchX } from 'lucide-react';
import {
  getCustomizationByToken,
  PublicCustomization,
  PRODUCT_TYPE_LABELS,
} from '../services/customization';

interface Props {
  token: string;
  onBackToHome: () => void;
}

// Per il cliente "new" = "Ricevuta" (non "Nuova" come lato admin)
const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  new: 'Ricevuta',
  processing: 'In lavorazione',
  delivered: 'Consegnata',
  cancelled: 'Annullata',
};
const STATUS_STYLES: Record<string, string> = {
  new: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  processing: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export const CustomizationTrackingView: React.FC<Props> = ({ token, onBackToHome }) => {
  const [request, setRequest] = useState<PublicCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getCustomizationByToken(token)
      .then((r) => alive && setRequest(r))
      .catch((e) => alive && setError(e?.message ?? 'Errore di connessione.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <button
        onClick={onBackToHome}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-300 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Vai alla Home
      </button>

      <h1 className="mb-6 text-2xl font-bold text-white font-heading">La tua richiesta di personalizzazione</h1>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> Carico la tua richiesta…
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="flex items-start gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Non riusciamo a caricare la richiesta in questo momento ({error}). Riprova tra poco.</span>
        </div>
      )}

      {!loading && !error && !request && (
        <div className="bg-[#0d1420] border border-[#1c2433] rounded-3xl p-6 flex items-start gap-3 text-sm text-slate-400">
          <SearchX className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <p>
            Non troviamo nessuna richiesta con questo link. Controlla di aver copiato l'indirizzo per
            intero dall'email, oppure contattaci se il problema persiste.
          </p>
        </div>
      )}

      {!loading && request && (
        <div className="bg-[#0d1420] border border-[#1c2433] rounded-3xl p-6">
          <span
            className={`inline-block mb-4 px-3 py-1 rounded-full border text-xs font-bold ${
              STATUS_STYLES[request.status] ?? STATUS_STYLES.new
            }`}
          >
            {CUSTOMER_STATUS_LABELS[request.status] ?? request.status}
          </span>

          <img
            src={request.logo_url}
            alt="Il tuo logo"
            className="mb-4 max-h-32 rounded-xl border border-[#1c2433] bg-white/5 object-contain p-2"
          />

          <p className="mb-1 text-slate-200">
            <span className="text-slate-400">Prodotto:</span>{' '}
            {PRODUCT_TYPE_LABELS[request.product_type] ?? request.product_type}
            {' · '}{request.quantity} pz · {request.print_colors} {request.print_colors === 1 ? 'colore' : 'colori'}
          </p>
          <p className="mb-1 text-xs text-slate-500">
            Ricevuta il {new Date(request.created_at).toLocaleString('it-IT')}
          </p>

          {request.admin_notes && (
            <p className="mt-4 text-sm text-slate-200">
              <span className="text-slate-400">Nota da parte nostra:</span> {request.admin_notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
