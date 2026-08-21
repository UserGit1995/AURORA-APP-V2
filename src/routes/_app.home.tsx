import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listCategories, listProducts, listCategoryCounts } from "@/lib/products.functions";
import { HeroBanner } from "@/components/HeroBanner";
import { CategorySection } from "@/components/CategorySection";
import { PromoBanner } from "@/components/PromoBanner";
import { FeaturedProductsSection } from "@/components/FeaturedProductsSection";

export const Route = createFileRoute("/_app/home")({
  component: Home,
});

function Home() {
  const cats = useQuery({ queryKey: ["cats"], queryFn: () => listCategories() });
  const counts = useQuery({ queryKey: ["cat-counts"], queryFn: () => listCategoryCounts() });
  const featured = useQuery({ queryKey: ["featured"], queryFn: () => listProducts({ data: { featured: true } }) });
  const offers = useQuery({ queryKey: ["offers-home"], queryFn: () => listProducts({ data: { onOffer: true } }) });

  const featuredProducts = featured.data && featured.data.length > 0 ? featured.data : offers.data ?? [];

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-4 max-w-[1400px] mx-auto">
      <HeroBanner />

      {cats.isLoading ? (
        <SkeletonGrid />
      ) : cats.data && cats.data.length > 0 ? (
        <CategorySection categories={cats.data as any} counts={counts.data ?? {}} />
      ) : (
        <EmptyHint text="Nessuna categoria ancora. L'admin può aggiungerle dal pannello." />
      )}

      <PromoBanner />

      {featured.isLoading || offers.isLoading ? (
        <SkeletonGrid />
      ) : featuredProducts.length > 0 ? (
        <FeaturedProductsSection products={featuredProducts as any} />
      ) : (
        <EmptyHint text="Nessun prodotto in evidenza al momento." />
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-7">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-2xl bg-card animate-pulse" />
      ))}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="mt-7 text-xs text-muted-foreground p-4 border border-dashed border-border rounded-xl text-center">
      {text}
    </div>
  );
}
