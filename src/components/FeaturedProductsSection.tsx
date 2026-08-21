import { Star, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ProductCard, type ProductRow } from "./ProductCard";

export function FeaturedProductsSection({
  products,
  title = "Prodotti in evidenza",
  viewAllTo = "/offerte",
}: {
  products: ProductRow[];
  title?: string;
  viewAllTo?: string;
}) {
  return (
    <section className="w-full mt-7 mb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
            <Star className="w-4 h-4 fill-sky-400/30" />
          </div>
          <h2 className="text-white text-base sm:text-lg font-bold tracking-tight">{title}</h2>
        </div>
        <Link to={viewAllTo} className="text-xs sm:text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 group">
          <span>Vedi tutti</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {products.slice(0, 6).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
