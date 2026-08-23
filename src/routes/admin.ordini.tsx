import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListOrders, adminUpdateOrderStatus, adminUpdateOrderDetails } from "@/lib/admin.functions";
import { ChevronDown, Pencil, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/ordini")({
  component: AdminOrdini,
});

const STATUSES = ["nuovo", "in_lavorazione", "evaso", "annullato"] as const;
const statusLabel: Record<string, string> = {
  nuovo: "Nuovo",
  in_lavorazione: "In lavorazione",
  evaso: "Evaso",
  annullato: "Annullato",
};

function AdminOrdini() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-orders"], queryFn: () => adminListOrders() });
  const [editOrder, setEditOrder] = useState<any | null>(null);

  const updateStatus = async (id: string, status: string) => {
    await adminUpdateOrderStatus({ data: { id, status: status as any } });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  if (isLoading) return <div className="h-64 rounded-xl bg-card animate-pulse" />;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-foreground mb-1">Ordini ricevuti</h2>
      {(!data || data.length === 0) && <p className="text-xs text-muted-foreground">Nessun ordine ricevuto ancora.</p>}

      {data?.map((o: any) => (
        <div key={o.id} className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <span className="font-bold text-foreground text-sm">{o.order_number}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {new Date(o.created_at).toLocaleDateString("it-IT")}
              </span>
              {!o.user_id && (
                <span className="text-[10px] font-bold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 rounded ml-2">
                  Ospite
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditOrder(o)} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Modifica dati">
                <Pencil size={14} />
              </button>
              <div className="relative">
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  className="appearance-none bg-secondary border border-border text-xs font-semibold text-foreground rounded-lg pl-3 pr-7 py-1.5 outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel[s]}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <p className="text-xs text-foreground font-semibold">{o.customer_name}</p>
          <p className="text-xs text-muted-foreground">
            {o.customer_email} · {o.customer_phone} · {o.customer_address} ({o.customer_province})
          </p>
          {o.notes && <p className="text-xs text-muted-foreground italic mt-1">"{o.notes}"</p>}

          <div className="mt-2.5 pt-2.5 border-t border-border space-y-0.5">
            {(o.order_items ?? []).map((it: any) => (
              <div key={it.id} className="flex justify-between text-xs text-muted-foreground">
                <span>{it.quantity}× {it.product_name}</span>
                <span>€ {Number(it.subtotal).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <p className="text-right text-sm font-bold text-foreground mt-2">€ {Number(o.total).toFixed(2)}</p>
        </div>
      ))}

      {editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSaved={() => {
            setEditOrder(null);
            qc.invalidateQueries({ queryKey: ["admin-orders"] });
          }}
        />
      )}
    </div>
  );
}

function EditOrderModal({ order, onClose, onSaved }: { order: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    customer_name: order.customer_name ?? "",
    customer_email: order.customer_email ?? "",
    customer_phone: order.customer_phone ?? "",
    customer_address: order.customer_address ?? "",
    customer_province: order.customer_province ?? "",
    notes: order.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminUpdateOrderDetails({ data: { id: order.id, ...form } });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <form onSubmit={handleSave} className="w-full max-w-md bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-foreground text-sm">Modifica dati ordine {order.order_number}</h3>
          <button type="button" onClick={onClose}><X size={18} className="text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3">
          {[
            { key: "customer_name", label: "Nome / Ragione sociale" },
            { key: "customer_email", label: "Email", type: "email" },
            { key: "customer_phone", label: "Telefono" },
            { key: "customer_address", label: "Indirizzo" },
            { key: "customer_province", label: "Provincia" },
          ].map((f) => (
            <label key={f.key} className="block">
              <span className="text-[11px] font-semibold text-muted-foreground block mb-1">{f.label}</span>
              <input
                type={f.type ?? "text"}
                required
                value={(form as any)[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="input-field"
              />
            </label>
          ))}
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Note interne</span>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field resize-none" />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Salva modifiche
          </button>
        </div>
      </form>
    </div>
  );
}
