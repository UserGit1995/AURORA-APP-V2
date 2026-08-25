import React, { useState } from 'react';
import { X, Phone, Mail, MessageSquare, Clock, MapPin, Send, CheckCircle2 } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Aurora Distributi',
    email: 'ordini@auroradistribuzione.it',
    phone: '+39 02 8945 1200',
    subject: 'Richiesta Listino Personalizzato / Offerta Quantità',
    message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div 
        className="relative w-full max-w-lg bg-[#071124] border border-[#162a4c] rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-contact-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#0d1c38] text-slate-400 hover:text-white border border-[#1b345b] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="inline-flex p-2 rounded-xl bg-sky-500/15 text-sky-400 mb-2">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-white">Assistenza e Supporto B2B</h3>
          <p className="text-xs text-slate-400 mt-1">
            Il nostro team di consulenti commerciali è a tua disposizione per listini, preventivi colli o assistenza tecnica.
          </p>
        </div>

        {submitted ? (
          <div className="py-10 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h4 className="text-lg font-bold text-white">Messaggio Inviato!</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Un nostro commerciale ti contatterà entro 30 minuti lavorativi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Quick Contacts Bar */}
            <div className="grid grid-cols-2 gap-2 bg-[#09152b] border border-[#142646] p-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="font-mono text-[11px] truncate">800 912 345</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-[11px] truncate">Lun - Ven 08:30 - 18:30</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Oggetto richiesta</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-[#091428] border border-[#162a4d] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Messaggio o Note Ordine</label>
              <textarea
                required
                rows={3}
                placeholder="Scrivi qui la tua richiesta dettagliata..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-[#091428] border border-[#162a4d] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-400 resize-none"
              />
            </div>

            <button
              id="submit-contact-btn"
              type="submit"
              className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Invia Messaggio al Supporto</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
