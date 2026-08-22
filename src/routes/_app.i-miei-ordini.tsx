import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardList, Package } from "lucide-react";

export const Route = createFileRoute("/_app/i-miei-ordini")({
  component: IMieiOrdini,
});

const statusLabel: Record<string, string> = {
  nuovo: "Nuovo",
  in_lavorazione: "In lavorazione",
  evaso: "Evaso",
  annullato: "Annullato",
};
const statusColor: Record<string, string> = {
  nuovo: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  in_lavorazione: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  evaso: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  annullato: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

function IMieiOrdini() {
  const { session, loading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => listMyOrders(),
    enabled: !!session,
  });

  if (!loading && !session) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 pt-10 max-w-md mx-auto text-center">
        <ClipboardList className="mx-auto text-muted-foreground mb-3" size={28} />
        <p className="text-sm text-muted-foreground mb-4">
          Accedi al tuo account per vedere lo storico dei tuoi ordini.
        </p>
        <Link to="/auth" className="inline-block h-10 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold leading-10">
          Accedi
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-4 max-w-[900px] mx-auto">
      <h1 className="text-xl font-heading font-bold text-foreground mb-4">I tuoi ordini</h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((o: any) => (
            <div key={o.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm text-foreground">{o.order_number}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor[o.status] ?? ""}`}>
                  {statusLabel[o.status] ?? o.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {new Date(o.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-xs text-muted-foreground">
                {(o.order_items ?? []).map((it: any) => `${it.quantity}× ${it.product_name}`).join(", ")}
              </p>
              <p className="text-sm font-bold text-foreground mt-2">€ {Number(o.total).toFixed(2)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 text-center py-14">
          <Package className="text-muted-foreground" size={28} />
          <p className="text-sm text-muted-foreground">Non hai ancora effettuato ordini.</p>
        </div>
      )}
    </div>
  );
}
