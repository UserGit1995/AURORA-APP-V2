import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/products.functions";
import { ProductGrid } from "./_app.categorie.$slug";

export const Route = createFileRoute("/_app/offerte")({
  component: () => {
    const { data, isLoading } = useQuery({ queryKey: ["offers"], queryFn: () => listProducts({ data: { onOffer: true } }) });
    return (
      <div className="px-4 pt-4">
        <h1 className="text-xl font-semibold text-foreground mb-4">Offerte del mese</h1>
        <ProductGrid products={data} loading={isLoading} />
      </div>
    );
  },
});