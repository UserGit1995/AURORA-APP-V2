import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/products.functions";
import { useFavorites } from "@/lib/favorites-context";
import { ProductGrid } from "@/components/ProductCard";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/_app/preferiti")({
  component: Preferiti,
});

function Preferiti() {
  const { favorites } = useFavorites();
  const { data, isLoading } = useQuery({ queryKey: ["all-products-for-favs"], queryFn: () => listProducts({ data: {} }) });

  const favoriteProducts = (data ?? []).filter((p: any) => favorites.includes(p.id));

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-4 max-w-[1400px] mx-auto">
      <h1 className="text-xl font-heading font-bold text-foreground mb-1">I tuoi preferiti</h1>
      <p className="text-sm text-muted-foreground mb-5">
        {favorites.length === 0 ? "Non hai ancora aggiunto prodotti ai preferiti." : `${favorites.length} prodotti salvati`}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : favoriteProducts.length > 0 ? (
        <ProductGrid products={favoriteProducts as any} />
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center py-10">
          <div className="p-4 rounded-full bg-secondary text-muted-foreground">
            <Heart size={28} />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Tocca il cuore su un prodotto per salvarlo qui e ritrovarlo velocemente.
          </p>
        </div>
      )}
    </div>
  );
}
