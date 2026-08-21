import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/products.functions";
import { ProductGrid } from "@/components/ProductCard";

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
    <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-4 max-w-[1400px] mx-auto">
      <h1 className="text-xl font-heading font-bold text-foreground mb-4 capitalize">{slug.replace(/-/g, " ")}</h1>
      {isLoading ? (
        <SkeletonGrid />
      ) : data && data.length > 0 ? (
        <ProductGrid products={data as any} />
      ) : (
        <EmptyHint />
      )}
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-2xl bg-card animate-pulse" />
      ))}
    </div>
  );
}

export function EmptyHint() {
  return (
    <div className="text-sm text-muted-foreground text-center p-8 border border-dashed border-border rounded-xl">
      Nessun prodotto trovato.
    </div>
  );
}
