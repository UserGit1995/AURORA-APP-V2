import { useState } from "react";
import { Mail, Copy, Check, X, Clock, Building2, AlertCircle, FileText, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/settings.functions";

type InquiryReason = "tracking" | "urgent" | "time_window" | "delay" | "ddt_request";

interface OrderLite {
  order_number: string;
  created_at: string;
  total: number;
  customer_name: string;
  customer_address: string;
  customer_province: string;
}

const REASONS: { id: InquiryReason; title: string; subtitle: string; icon: any }[] = [
  { id: "tracking", title: "Stato avanzamento", subtitle: "Chiedi a che punto è il tuo ordine", icon: Clock },
  { id: "urgent", title: "Sollecito urgente", subtitle: "Hai bisogno dei prodotti con priorità", icon: AlertCircle },
  { id: "time_window", title: "Istruzioni consegna", subtitle: "Comunica orari o indicazioni per lo scarico", icon: Building2 },
  { id: "delay", title: "Verifica ritardo", subtitle: "L'ordine non è ancora arrivato", icon: AlertCircle },
  { id: "ddt_request", title: "Richiedi documento", subtitle: "Copia del documento di trasporto/fattura", icon: FileText },
];

export function OrderInquiryModal({ order, open, onClose }: { order: OrderLite | null; open: boolean; onClose: () => void }) {
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });
  const [reason, setReason] = useState<InquiryReason>("tracking");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  if (!open || !order) return null;

  const to = settings?.contact_email || "";
  const orderDate = new Date(order.created_at).toLocaleDateString("it-IT");

  const templates: Record<InquiryReason, { subject: string; body: string }> = {
    tracking: {
      subject: `Aggiornamento ordine ${order.order_number}`,
      body: `Buongiorno,\n\nvi scrivo per avere un aggiornamento sull'ordine ${order.order_number} del ${orderDate} (${order.customer_name}), destinazione ${order.customer_address} (${order.customer_province}), totale € ${order.total.toFixed(2)}.\n\n${notes ? notes + "\n\n" : ""}Grazie, resto in attesa.`,
    },
    urgent: {
      subject: `Sollecito ordine ${order.order_number}`,
      body: `Buongiorno,\n\nvi scrivo per sollecitare l'evasione dell'ordine ${order.order_number} del ${orderDate}, per esigenza urgente.\n\n${notes ? notes + "\n\n" : ""}Grazie per la disponibilità.`,
    },
    time_window: {
      subject: `Istruzioni consegna ordine ${order.order_number}`,
      body: `Buongiorno,\n\nper l'ordine ${order.order_number} vorrei comunicare le seguenti indicazioni per la consegna presso ${order.customer_address} (${order.customer_province}):\n\n${notes || "[inserire qui le indicazioni]"}\n\nGrazie.`,
    },
    delay: {
      subject: `Verifica ritardo ordine ${order.order_number}`,
      body: `Buongiorno,\n\nl'ordine ${order.order_number} del ${orderDate} non è ancora arrivato. Potreste verificare lo stato e darmi un aggiornamento?\n\n${notes ? notes + "\n\n" : ""}Grazie.`,
    },
    ddt_request: {
      subject: `Richiesta documento ordine ${order.order_number}`,
      body: `Buongiorno,\n\npotreste inviarmi il documento di trasporto/fattura relativo all'ordine ${order.order_number} del ${orderDate}, totale € ${order.total.toFixed(2)}?\n\n${notes ? notes + "\n\n" : ""}Grazie.`,
    },
  };

  const { subject, body } = templates[reason];
  const mailtoHref = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`A: ${to}\nOggetto: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="font-heading font-bold text-foreground text-sm flex items-center gap-2">
            <Mail size={16} className="text-primary" /> Richiedi informazioni — {order.order_number}
          </h2>
          <button onClick={onClose}><X size={18} className="text-muted-foreground" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                className={`text-left p-3 rounded-xl border transition-colors ${
                  reason === r.id ? "bg-primary/10 border-primary/40" : "bg-secondary/40 border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <r.icon size={14} className={reason === r.id ? "text-primary" : "text-muted-foreground"} />
                  <span className="text-xs font-bold text-foreground">{r.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{r.subtitle}</p>
              </button>
            ))}
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Note aggiuntive (opzionale)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-field resize-none" />
          </label>

          <div className="bg-background border border-border rounded-xl p-3 text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
            <p className="font-semibold text-foreground mb-1">Oggetto: {subject}</p>
            {body}
          </div>

          {!to && (
            <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg p-2">
              L'email di contatto non è ancora configurata in Admin → Impostazioni.
            </p>
          )}

          <div className="flex gap-2">
            <a
              href={mailtoHref}
              className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Send size={14} /> Apri email
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="h-10 px-4 rounded-lg bg-secondary text-foreground text-sm font-semibold flex items-center justify-center gap-2"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
