import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminDashboard } from "@/lib/admin.functions";
import { ShoppingBag, Package, Users, Euro } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => adminDashboard() });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ShoppingBag size={18} />} label="Ordini totali" value={data?.totalOrders ?? "—"} loading={isLoading} />
        <StatCard icon={<Euro size={18} />} label="Fatturato" value={data ? `€ ${data.totalRevenue.toFixed(2)}` : "—"} loading={isLoading} />
        <StatCard icon={<Package size={18} />} label="Prodotti attivi" value={data?.totalProducts ?? "—"} loading={isLoading} />
        <StatCard icon={<Users size={18} />} label="Clienti registrati" value={data?.totalUsers ?? "—"} loading={isLoading} />
      </div>

      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Ultimi ordini</h2>
        {isLoading ? (
          <div className="h-32 rounded-xl bg-card animate-pulse" />
        ) : data && data.recentOrders.length > 0 ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {data.recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 text-sm">
                <div>
                  <span className="font-semibold text-foreground">{o.order_number}</span>
                  <span className="text-muted-foreground ml-2">{o.customer_name}</span>
                </div>
                <span className="font-semibold text-foreground">€ {Number(o.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nessun ordine ancora.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value: string | number; loading: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{loading ? "…" : value}</p>
    </div>
  );
}
