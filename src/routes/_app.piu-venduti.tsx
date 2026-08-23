import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listBestsellers } from "@/lib/products.functions";
import { ProductGrid } from "@/components/ProductCard";
import { Flame } from "lucide-react";

export const Route = createFileRoute("/_app/piu-venduti")({
  component: PiuVenduti,
});

function PiuVenduti() {
  const { data, isLoading } = useQuery({ queryKey: ["bestsellers"], queryFn: () => listBestsellers() });

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="text-orange-400" size={20} />
        <h1 className="text-xl font-heading font-bold text-foreground">I più venduti</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square rounded-2xl bg-card animate-pulse" />)}
        </div>
      ) : data && data.length > 0 ? (
        <ProductGrid products={data as any} />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-14">
          Non ci sono ancora abbastanza ordini per calcolare una classifica.
        </p>
      )}
    </div>
  );
}
