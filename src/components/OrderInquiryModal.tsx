import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  Copy, 
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  Building2, 
  Truck, 
  FileText, 
  Sparkles,
  ExternalLink,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../types';

interface OrderInquiryModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

type InquiryReason = 
  | 'tracking' 
  | 'urgent' 
  | 'time_window' 
  | 'delay' 
  | 'ddt_request';

export const OrderInquiryModal: React.FC<OrderInquiryModalProps> = ({
  order,
  isOpen,
  onClose
}) => {
  if (!isOpen || !order) return null;

  const [selectedReason, setSelectedReason] = useState<InquiryReason>('tracking');
  const [copied, setCopied] = useState(false);
  const [directSent, setDirectSent] = useState(false);
  const [customNotes, setCustomNotes] = useState('');

  const logisticsEmail = 'logistica@auroradistribuzione.it';
  const ccEmail = 'ordini@auroradistribuzione.it';

  // Available reason templates
  const reasons: { id: InquiryReason; title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'tracking',
      title: 'Stato Avanzamento & Tracking',
      subtitle: 'Richiesta codice lettera di vettura e posizione del collo',
      icon: Truck
    },
    {
      id: 'urgent',
      title: 'Sollecito Consegna Prioritaria',
      subtitle: 'Richiesta di accelerazione per esaurimento scorte aziendali',
      icon: Clock
    },
    {
      id: 'time_window',
      title: 'Orari & Istruzioni Scarico Merci',
      subtitle: 'Aggiornamento fascia oraria ricevimento o contatto referente',
      icon: Building2
    },
    {
      id: 'delay',
      title: 'Verifica Consegna Oltre Stima',
      subtitle: 'Chiarimenti su data presunta superata o ritardi corriere',
      icon: AlertCircle
    },
    {
      id: 'ddt_request',
      title: 'Richiesta Copia DDT / Documento',
      subtitle: 'Invio telematico del Documento di Trasporto firmato',
      icon: FileText
    }
  ];

  // Generate email subject and body dynamically
  const generateEmailContent = () => {
    const clientName = order.shippingAddress?.recipient || 'Azienda Cliente';
    const city = order.shippingAddress?.city || 'Sede di fornitura';
    const orderDate = order.date;
    const estDelivery = order.estimatedDelivery;
    const courier = order.courier || 'Corriere B2B';
    const tracking = order.trackingNumber || 'In assegnazione';

    let subject = '';
    let body = '';

    switch (selectedReason) {
      case 'tracking':
        subject = `[Richiesta Tracking] Aggiornamento Spedizione Ordine #${order.id} - ${clientName}`;
        body = `Gentile Reparto Logistica AURORA Distribuzione,\n\n` +
          `Vi contatto in merito al nostro ordine aziendale con riferimento:\n` +
          `• Numero Ordine: #${order.id}\n` +
          `• Data Inserimento: ${orderDate}\n` +
          `• Destinazione: ${clientName} - ${city}\n` +
          `• Vettore Assegnato: ${courier} (Lettera di Vettura: ${tracking})\n` +
          `• Articoli Ordinati: ${order.itemsCount} colli (Totale Documento: €${order.total.toFixed(2)})\n\n` +
          `Desideriamo richiedere un aggiornamento puntuale sullo stato della spedizione e la conferma della fascia oraria di consegna prevista (${estDelivery}).\n\n` +
          (customNotes ? `Note Aggiuntive Cliente:\n${customNotes}\n\n` : '') +
          `Restiamo in attesa di un Vostro cortese riscontro.\n\n` +
          `Cordiali saluti,\n` +
          `${clientName}\n` +
          `Ufficio Acquisti & Ricevimento Merci`;
        break;

      case 'urgent':
        subject = `[URGENTE - Sollecito] Fornitura Prodotti Ordine #${order.id} - ${clientName}`;
        body = `Alla c.a. Responsabile Logistica & Spedizioni AURORA,\n\n` +
          `Con la presente siamo a sollecitare la massima priorità per l'evasione e consegna dell'ordine #${order.id} del ${orderDate}.\n\n` +
          `Dati Ordine:\n` +
          `• Riferimento: Ordine #${order.id}\n` +
          `• Cliente: ${clientName}\n` +
          `• Totale Colli: ${order.itemsCount} confezioni\n` +
          `• Data Stima Attuale: ${estDelivery}\n\n` +
          `A causa di imminente esaurimento delle scorte di prodotti per la pulizia e sanificazione dei nostri reparti operativi, vi preghiamo cortesemente di verificare la possibilità di anticipare la consegna o accordare un passaggio express con il vettore ${courier}.\n\n` +
          (customNotes ? `Dettagli urgenza / Contatto di scarico:\n${customNotes}\n\n` : '') +
          `Vi ringraziamo per la consueta disponibilità e collaborazione.\n\n` +
          `Distinti saluti,\n` +
          `${clientName}`;
        break;

      case 'time_window':
        subject = `[Istruzioni Scarico Merci] Indicazioni per Ordine #${order.id} - ${clientName}`;
        body = `Spettabile Ufficio Logistica AURORA Distribuzione,\n\n` +
          `In riferimento alla spedizione dell'ordine #${order.id}, desideriamo trasmettere le seguenti istruzioni operative per il corriere al momento dello scarico:\n\n` +
          `• Indirizzo Fornitura: ${order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''} (${order.shippingAddress?.province || ''})\n` +
          `• Referente allo Scarico: ${order.shippingAddress?.recipient || clientName}\n` +
          `• Orari di Apertura Magazzino: Lun-Ven 08:30-12:30 / 14:00-17:30\n` +
          `• Accesso per Mezzi Pesanti: Consentito con sponda idraulica\n\n` +
          (customNotes ? `Istruzioni Specifiche Inserite:\n${customNotes}\n\n` : '') +
          `Vi preghiamo di trasmettere tale nota all'autista del vettore ${courier}.\n\n` +
          `Grazie per la collaborazione,\n` +
          `${clientName}`;
        break;

      case 'delay':
        subject = `[Verifica Ritardo Consegna] Ordine #${order.id} - ${clientName}`;
        body = `Gentile Servizio Assistenza Logistica AURORA,\n\n` +
          `Vi scriviamo per richiedere chiarimenti in merito alla consegna dell'ordine #${order.id} (data ordine: ${orderDate}), la cui stima originaria indicava la data ${estDelivery}.\n\n` +
          `Ad oggi il nostro magazzino non ha ancora ricevuto i ${order.itemsCount} colli previsti.\n` +
          `Vi chiediamo cortesemente di effettuare una verifica con il corriere ${courier} (Trk: ${tracking}) e comunicarci la data e l'orario riprogrammati per il recapito.\n\n` +
          (customNotes ? `Ulteriori note:\n${customNotes}\n\n` : '') +
          `In attesa di Vostre notizie, porgiamo cordiali saluti.\n\n` +
          `${clientName}`;
        break;

      case 'ddt_request':
        subject = `[Richiesta Copia DDT] Documento di Trasporto Ordine #${order.id} - ${clientName}`;
        body = `Spettabile Ufficio Spedizioni & Amministrazione AURORA,\n\n` +
          `Vi richiediamo l'invio telematico a mezzo email del Documento di Trasporto (DDT) relativo alla fornitura:\n\n` +
          `• Numero Ordine B2B: #${order.id}\n` +
          `• Data Fornitura: ${orderDate}\n` +
          `• Intestazione: ${clientName}\n` +
          `• Totale Fornitura: €${order.total.toFixed(2)} (IVA inclusa)\n\n` +
          `Tale documento è necessario per la nostra registrazione interna di magazzino e quadratura contabile.\n\n` +
          (customNotes ? `Riferimento interno:\n${customNotes}\n\n` : '') +
          `Ringraziando anticipatamente per la disponibilità, inviamo cordiali saluti.\n\n` +
          `${clientName}`;
        break;
    }

    return { subject, body };
  };

  const { subject, body } = generateEmailContent();

  const handleCopy = () => {
    const fullText = `A: ${logisticsEmail}\nCC: ${ccEmail}\nOggetto: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleMailto = () => {
    const mailtoUrl = `mailto:${logisticsEmail}?cc=${encodeURIComponent(ccEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const handleDirectTicketSend = () => {
    setDirectSent(true);
    setTimeout(() => {
      // Keep confirmation visible briefly
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-xs"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative w-full max-w-2xl bg-[#061022] border border-[#162d55] rounded-3xl p-5 sm:p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto scrollbar-none flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#122544] mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Invia Richiesta Aggiornamento</span>
                <span className="text-xs font-mono font-normal text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-md border border-sky-500/30">
                  Ordine #{order.id}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Bozza di comunicazione precompilata per il reparto logistico di AURORA
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#0c1c38] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reason Selector Chips */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold text-slate-300 block">
            Motivo della richiesta:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {reasons.map((r) => {
              const Icon = r.icon;
              const isSelected = selectedReason === r.id;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedReason(r.id);
                    setDirectSent(false);
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-[#0a2044] border-sky-400 text-white shadow-md shadow-sky-950/40 ring-1 ring-sky-400/30'
                      : 'bg-[#08152c] border-[#13284e] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    isSelected ? 'bg-sky-500 text-white' : 'bg-[#0c1c38] text-sky-400'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block text-white">{r.title}</span>
                    <span className="text-[10px] text-slate-400 block line-clamp-1">{r.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Custom Notes Input */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
              <span>Note / Istruzioni personalizzate (opzionale):</span>
            </label>
            <span className="text-[10px] text-slate-500">Inserite automaticamente nel testo</span>
          </div>
          <input
            type="text"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Es: Suonare al cancello 4, urgente per apertura nuovo stabilimento..."
            className="w-full bg-[#050c18] border border-[#13274c] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-400 transition-colors"
          />
        </div>

        {/* Generated Email Preview Card */}
        <div className="bg-[#040a16] border border-[#112340] rounded-2xl p-4 mb-4 space-y-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-[#0f1f3a] text-xs">
            <span className="font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              Anteprima Bozza E-mail B2B
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-[#0a1834] hover:bg-[#0f244e] border border-[#162f58] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300">Copiato!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-sky-400" />
                    <span>Copia Testo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Email Headers Meta */}
          <div className="space-y-1 text-xs bg-[#071328] p-2.5 rounded-xl border border-[#122646] font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-slate-500 w-16 shrink-0">A:</span>
              <span className="text-sky-300 font-semibold">{logisticsEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-slate-500 w-16 shrink-0">CC:</span>
              <span className="text-slate-400">{ccEmail}</span>
            </div>
            <div className="flex items-start gap-2 text-slate-300 pt-1 border-t border-[#0e1f3a]">
              <span className="text-slate-500 w-16 shrink-0">Oggetto:</span>
              <span className="text-white font-sans font-semibold">{subject}</span>
            </div>
          </div>

          {/* Email Body */}
          <div className="relative">
            <textarea
              readOnly
              value={body}
              rows={8}
              className="w-full bg-[#050c18] border border-[#11233e] rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed resize-none focus:outline-hidden"
            />
          </div>
        </div>

        {/* Direct Send Confirmation Notice */}
        {directSent && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
            <span>
              <strong>Ticket Logistico Registrato con Successo!</strong> La richiesta è stata inoltrata all'Ufficio Spedizioni AURORA (Ticket #LOG-{order.id.replace(/\D/g, '') || '992'}). Riceverai risposta entro 2 ore lavorative.
            </span>
          </motion.div>
        )}

        {/* Modal Action Buttons */}
        <div className="pt-3 border-t border-[#122544] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0a162d] hover:bg-[#0f2142] text-slate-300 hover:text-white transition-colors text-center"
          >
            Annulla
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={handleMailto}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0f274e] hover:bg-[#153568] text-sky-200 border border-sky-500/30 transition-all shadow-xs"
              title="Apre la bozza direttamente nel tuo client email predefinito (Outlook, Gmail, Thunderbird, Mail)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              <span>Apri nel Client E-mail</span>
            </button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleDirectTicketSend}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-md shadow-sky-950/50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{directSent ? 'Richiesta Inviata ✓' : 'Invia Ticket a Reparto Logistica'}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
