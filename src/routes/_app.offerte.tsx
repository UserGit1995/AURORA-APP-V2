import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/products.functions";
import { ProductGrid } from "@/components/ProductCard";
import { SkeletonGrid, EmptyHint } from "./_app.categorie.$slug";

export const Route = createFileRoute("/_app/offerte")({
  component: Offerte,
});

function Offerte() {
  const { data, isLoading } = useQuery({ queryKey: ["offers"], queryFn: () => listProducts({ data: { onOffer: true } }) });
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-4 max-w-[1400px] mx-auto">
      <h1 className="text-xl font-heading font-bold text-foreground mb-4">Offerte del mese</h1>
      {isLoading ? <SkeletonGrid /> : data && data.length > 0 ? <ProductGrid products={data as any} /> : <EmptyHint />}
    </div>
  );
}
