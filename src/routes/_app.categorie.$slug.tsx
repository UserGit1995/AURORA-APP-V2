import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listProducts, listSubcategories } from "@/lib/products.functions";
import { ProductGrid } from "@/components/ProductCard";

export const Route = createFileRoute("/_app/categorie/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const [activeSub, setActiveSub] = useState<string | null>(null);

  const { data: subcategories } = useQuery({
    queryKey: ["subcats", slug],
    queryFn: () => listSubcategories({ data: { categorySlug: slug } }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["prods", slug, activeSub],
    queryFn: () => listProducts({ data: { categorySlug: slug, subcategorySlug: activeSub ?? undefined } }),
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-4 max-w-[1400px] mx-auto">
      <h1 className="text-xl font-heading font-bold text-foreground mb-4 capitalize">{slug.replace(/-/g, " ")}</h1>

      {subcategories && subcategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
          <SubTab active={activeSub === null} onClick={() => setActiveSub(null)}>Tutti</SubTab>
          {subcategories.map((s: any) => (
            <SubTab key={s.id} active={activeSub === s.slug} onClick={() => setActiveSub(s.slug)}>
              {s.name}
            </SubTab>
          ))}
        </div>
      )}

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

function SubTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors shrink-0 ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
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
