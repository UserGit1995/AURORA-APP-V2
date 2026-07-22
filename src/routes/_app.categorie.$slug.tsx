import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/products.functions";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_app/categorie/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["prods", slug],
    queryFn: () => listProducts({ data: { categorySlug: slug } }),
  });
  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-semibold text-foreground mb-4 capitalize">{slug.replace(/-/g, " ")}</h1>
      <ProductGrid products={data} loading={isLoading} />
    </div>
  );
}

export function ProductGrid({ products, loading }: { products?: any[]; loading?: boolean }) {
  if (loading) return <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-56 rounded-xl bg-card animate-pulse" />)}</div>;
  if (!products || products.length === 0) return <div className="text-sm text-muted-foreground text-center p-8 border border-dashed border-border rounded-xl">Nessun prodotto trovato.</div>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((p: any) => (
        <Link key={p.id} to="/prodotto/$id" params={{ id: p.id }} className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="relative aspect-square bg-secondary flex items-center justify-center">
            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <Package size={40} className="text-muted-foreground" />}
            {p.discount_price && (
              <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded">-{Math.round((1 - Number(p.discount_price) / Number(p.price)) * 100)}%</span>
            )}
          </div>
          <div className="p-3">
            <div className="text-xs text-foreground truncate">{p.name}</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-primary font-semibold text-sm">€ {Number(p.discount_price ?? p.price).toFixed(2)}</span>
              {p.discount_price && <span className="text-[11px] text-muted-foreground line-through">€ {Number(p.price).toFixed(2)}</span>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}