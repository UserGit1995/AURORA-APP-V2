import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listCategories } from "@/lib/products.functions";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_app/categorie")({
  component: Categorie,
});

function Categorie() {
  const { data, isLoading } = useQuery({ queryKey: ["cats"], queryFn: () => listCategories() });
  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-semibold text-foreground mb-4">Tutte le categorie</h1>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-card animate-pulse" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {data.map((c: any) => (
            <Link key={c.id} to="/categorie/$slug" params={{ slug: c.slug }} className="rounded-xl bg-card border border-border p-4 flex flex-col items-center gap-3 aspect-square justify-center">
              {c.image_url ? <img src={c.image_url} alt={c.name} className="w-16 h-16 object-cover rounded-lg" /> : <Package size={32} className="text-primary" />}
              <span className="text-sm font-medium text-foreground text-center">{c.name}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center p-8 border border-dashed border-border rounded-xl">Nessuna categoria. L'admin può aggiungerle dal pannello.</div>
      )}
    </div>
  );
}