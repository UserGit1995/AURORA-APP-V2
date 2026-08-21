import { Heart, Plus, Check, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart-context";
import { useFavorites } from "@/lib/favorites-context";

export interface ProductRow {
  id: string;
  name: string;
  price: number;
  discount_price: number | null;
  image_url: string | null;
  in_stock: boolean;
  categories?: { name: string; slug: string } | null;
}

export function ProductCard({ product }: { product: ProductRow }) {
  const { addItem, addedProductId } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const isFav = isFavorite(product.id);
  const isJustAdded = addedProductId === product.id;
  const price = product.discount_price ?? product.price;
  const discountPercent = product.discount_price
    ? Math.round((1 - Number(product.discount_price) / Number(product.price)) * 100)
    : null;

  return (
    <Link
      to="/prodotto/$id"
      params={{ id: product.id }}
      className="group relative cursor-pointer bg-[#081326] hover:bg-[#0c1c36] border border-[#142646] hover:border-[#1e3966] rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-lg hover:shadow-sky-950/40"
    >
      <div className="flex items-center justify-between w-full mb-1 z-10 gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          {discountPercent ? (
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-500/30">
              -{discountPercent}%
            </span>
          ) : null}
          {!product.in_stock && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/35 px-1.5 py-0.5 rounded-md">
              Esaurito
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(product.id);
          }}
          className={`p-1.5 rounded-full backdrop-blur-sm transition-colors shrink-0 ${
            isFav ? "text-rose-400 bg-rose-500/10" : "text-slate-400 hover:text-white bg-[#0a1528]/80 hover:bg-[#112344]"
          }`}
          aria-label="Aggiungi ai preferiti"
          title={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-rose-400 text-rose-400" : ""}`} />
        </button>
      </div>

      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-b from-[#060e1d] to-[#0a1529] flex items-center justify-center p-2 my-1">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <Package className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      <div className="mt-2 text-left">
        <h3 className="text-white text-xs sm:text-sm font-bold truncate leading-tight group-hover:text-sky-300 transition-colors">
          {product.name}
        </h3>
        <p className="text-slate-400 text-[11px] truncate mt-0.5">{product.categories?.name ?? ""}</p>

        <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-[#122340]">
          <div>
            <span className="text-white text-xs font-bold">€{Number(price).toFixed(2)}</span>
            <span className="text-slate-400 text-[10px] ml-1">+IVA</span>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (!product.in_stock) return;
              addItem({ id: product.id, name: product.name, price: Number(price), image_url: product.image_url });
            }}
            disabled={!product.in_stock}
            className={`p-1 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isJustAdded ? "bg-emerald-600 text-white" : "bg-[#102342] hover:bg-primary text-slate-300 hover:text-white"
            }`}
            title="Aggiungi al carrello"
          >
            {isJustAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductRow[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
