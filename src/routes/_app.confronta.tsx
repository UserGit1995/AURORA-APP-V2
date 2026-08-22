import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/products.functions";
import { useCompare } from "@/lib/compare-context";
import { useAuth } from "@/hooks/useAuth";
import { X, Package, Scale } from "lucide-react";

export const Route = createFileRoute("/_app/confronta")({
  component: Confronta,
});

function Confronta() {
  const { comparedIds, removeFromCompare, clearCompare } = useCompare();
  const { session } = useAuth();
  // Il catalogo pubblico è limitato a 60 articoli: sufficiente per il confronto (max 4 alla volta).
  const { data, isLoading } = useQuery({ queryKey: ["all-for-compare"], queryFn: () => listProducts({ data: {} }) });

  const products = (data ?? []).filter((p: any) => comparedIds.includes(p.id));

  if (comparedIds.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 pt-10 max-w-md mx-auto text-center">
        <Scale className="mx-auto text-muted-foreground mb-3" size={28} />
        <p className="text-sm text-muted-foreground">
          Nessun prodotto selezionato. Tocca l'icona della bilancia su un prodotto per aggiungerlo al confronto.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-24 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-heading font-bold text-foreground">Confronta prodotti</h1>
        <button onClick={clearCompare} className="text-xs text-muted-foreground hover:text-foreground">Svuota tutto</button>
      </div>

      {isLoading ? (
        <div className="h-64 rounded-xl bg-card animate-pulse" />
      ) : (
        <div className="overflow-x-auto">
          <div className="grid gap-3 min-w-[600px]" style={{ gridTemplateColumns: `140px repeat(${products.length}, 1fr)` }}>
            <div />
            {products.map((p: any) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-3 relative">
                <button
                  onClick={() => removeFromCompare(p.id)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                >
                  <X size={14} />
                </button>
                <div className="aspect-square w-full rounded-lg bg-background flex items-center justify-center overflow-hidden mb-2">
                  {p.image_url ? <img src={p.image_url} className="w-full h-full object-contain" /> : <Package className="text-muted-foreground" />}
                </div>
                <Link to="/prodotto/$id" params={{ id: p.id }} className="text-xs font-bold text-foreground hover:text-primary line-clamp-2">
                  {p.name}
                </Link>
              </div>
            ))}

            <CompareRow label="Categoria" values={products.map((p: any) => p.categories?.name ?? "—")} />
            <CompareRow
              label="Prezzo"
              values={products.map((p: any) => {
                const hasReserved = p.discount_price && p.discount_price < p.price;
                if (session && hasReserved) return `€ ${Number(p.discount_price).toFixed(2)}`;
                return `€ ${Number(p.price).toFixed(2)}`;
              })}
            />
            <CompareRow label="Codice" values={products.map((p: any) => p.sku ?? "—")} />
            <CompareRow label="Disponibilità" values={products.map((p: any) => (p.in_stock ? "Disponibile" : "Esaurito"))} />
            <CompareRow label="Descrizione" values={products.map((p: any) => p.description ?? "—")} small />
          </div>
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, values, small }: { label: string; values: string[]; small?: boolean }) {
  return (
    <>
      <div className="text-[11px] font-semibold text-muted-foreground py-2.5 border-t border-border flex items-center">{label}</div>
      {values.map((v, i) => (
        <div key={i} className={`py-2.5 border-t border-border text-foreground ${small ? "text-[11px]" : "text-xs font-semibold"}`}>
          {v}
        </div>
      ))}
    </>
  );
}
