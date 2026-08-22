import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/hooks/useAuth";
import { submitOrderAuthenticated, submitOrderGuest } from "@/lib/orders.functions";

export function OrderForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, total, clear } = useCart();
  const { session, user } = useAuth();
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: user?.email ?? "",
    customerPhone: "",
    customerAddress: "",
    customerProvince: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    try {
      const payload = {
        items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
        ...form,
      };
      let result: { orderNumber: string };
      if (session) {
        result = await submitOrderAuthenticated({ data: payload });
      } else {
        result = await submitOrderGuest({ data: payload });
      }
      setOrderNumber(result.orderNumber);
      setStatus("done");
      clear();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Errore durante l'invio dell'ordine. Riprova.");
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="font-heading font-bold text-foreground">
            {status === "done" ? "Ordine inviato" : "Completa l'ordine"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {status === "done" ? (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="text-emerald-400" size={40} />
            <p className="text-sm text-foreground font-semibold">Ordine {orderNumber} ricevuto!</p>
            <p className="text-xs text-muted-foreground">
              Riceverai una conferma via email. Ti contatteremo per la conferma finale.
            </p>
            <button
              onClick={onClose}
              className="mt-2 h-10 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Chiudi
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3">
            {!session && (
              <p className="text-[11px] text-muted-foreground bg-secondary/50 border border-border rounded-lg p-2.5">
                Stai ordinando come ospite, a prezzo pieno. <a href="/auth" className="text-primary font-semibold">Accedi</a> per i prezzi riservati.
              </p>
            )}
            <Field label="Nome e cognome / Ragione sociale">
              <input required value={form.customerName} onChange={update("customerName")} className="input-field" />
            </Field>
            <Field label="Email">
              <input required type="email" value={form.customerEmail} onChange={update("customerEmail")} className="input-field" />
            </Field>
            <Field label="Telefono">
              <input required value={form.customerPhone} onChange={update("customerPhone")} className="input-field" />
            </Field>
            <Field label="Indirizzo di consegna">
              <input required value={form.customerAddress} onChange={update("customerAddress")} className="input-field" />
            </Field>
            <Field label="Provincia">
              <input required maxLength={60} value={form.customerProvince} onChange={update("customerProvince")} className="input-field" />
            </Field>
            <Field label="Note (opzionale)">
              <textarea value={form.notes} onChange={update("notes")} rows={2} className="input-field resize-none" />
            </Field>

            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Totale (+IVA)</span>
              <span className="font-bold text-foreground text-base">€ {total.toFixed(2)}</span>
            </div>

            {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {status === "sending" ? <Loader2 size={16} className="animate-spin" /> : null}
              Invia richiesta d'ordine
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground block mb-1">{label}</span>
      {children}
    </label>
  );
}
