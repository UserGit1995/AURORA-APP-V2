import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listMyOrders } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardList, Package, MessageCircleQuestion } from "lucide-react";
import { OrderTrackingTimeline } from "@/components/OrderTrackingTimeline";
import { OrderInquiryModal } from "@/components/OrderInquiryModal";

export const Route = createFileRoute("/_app/i-miei-ordini")({
  component: IMieiOrdini,
});

function IMieiOrdini() {
  const { session, loading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => listMyOrders(),
    enabled: !!session,
  });
  const [inquiryOrder, setInquiryOrder] = useState<any | null>(null);

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
            <div key={i} className="h-32 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((o: any) => (
            <div key={o.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-foreground">{o.order_number}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>

              <div className="mb-3">
                <OrderTrackingTimeline status={o.status} />
              </div>

              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                {(o.order_items ?? []).map((it: any) => `${it.quantity}× ${it.product_name}`).join(", ")}
              </p>

              <div className="flex items-center justify-between mt-2">
                <p className="text-sm font-bold text-foreground">€ {Number(o.total).toFixed(2)}</p>
                <button
                  onClick={() => setInquiryOrder(o)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-sky-300"
                >
                  <MessageCircleQuestion size={13} /> Richiedi informazioni
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 text-center py-14">
          <Package className="text-muted-foreground" size={28} />
          <p className="text-sm text-muted-foreground">Non hai ancora effettuato ordini.</p>
        </div>
      )}

      <OrderInquiryModal order={inquiryOrder} open={!!inquiryOrder} onClose={() => setInquiryOrder(null)} />
    </div>
  );
}
