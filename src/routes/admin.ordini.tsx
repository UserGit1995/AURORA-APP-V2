import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListOrders, adminUpdateOrderStatus } from "@/lib/admin.functions";
import { ChevronDown } from "lucide-react";

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
    </div>
  );
}
