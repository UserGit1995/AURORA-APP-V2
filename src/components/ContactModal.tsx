import React, { useState } from 'react';
import { X, Mail, MessageSquare, Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { postToShop } from '../services/orderSubmit';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHOP_EMAIL = 'ordini.aurorasrls@gmail.com';

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAdmin();
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    subject: 'Richiesta listino / preventivo',
    message: '',
    website: '', // campo trappola anti-bot: deve restare vuoto
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Inserisci un indirizzo e-mail valido, così possiamo risponderti.');
      return;
    }
    setError(null);
    setSending(true);
    const result = await postToShop({ kind: 'contact', ...formData });
    setSending(false);

    if (!result.ok) {
      setError(`Non siamo riusciti a inviare il messaggio. Riprova tra poco oppure scrivici a ${SHOP_EMAIL}.`);
      return;
    }
    setSubmitted(true);
    setFormData((prev) => ({ ...prev, message: '' }));
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2600);
  };

  const inputClass =
    'w-full bg-[#0d1420] border border-[#1c2433] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-[#0d1420] border border-[#1c2433] rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-7 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="close-contact-modal"
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute top-4 right-4 p-2 rounded-full bg-[#0d1420] text-slate-400 hover:text-white border border-[#1c2433] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="inline-flex p-2 rounded-xl bg-sky-500/15 text-sky-400 mb-2">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-white">Assistenza e Supporto</h3>
          <p className="text-xs text-slate-400 mt-1">
            Scrivici per listini, preventivi o assistenza: ti rispondiamo appena possibile.
          </p>
        </div>

        {submitted ? (
          <div className="py-10 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h4 className="text-lg font-bold text-white">Messaggio inviato!</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Ti risponderemo all'indirizzo indicato il prima possibile.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="flex items-center gap-2 bg-[#0d1420] border border-[#1c2433] p-2.5 rounded-xl text-xs text-slate-400">
              <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-[11px] truncate">{SHOP_EMAIL}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome / Ditta</label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Telefono (facoltativo)</label>
              <input
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Oggetto</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Messaggio</label>
              <textarea
                required
                rows={4}
                placeholder="Scrivi qui la tua richiesta..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Trappola per i bot: invisibile agli utenti */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="hidden"
            />

            {error && (
              <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="submit-contact-btn"
              type="submit"
              disabled={sending}
              className="w-full bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-60 disabled:cursor-wait text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{sending ? 'Invio in corso…' : 'Invia messaggio'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
