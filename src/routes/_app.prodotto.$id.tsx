import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProduct } from "@/lib/products.functions";
import { Package, Minus, Plus, ChevronLeft, Heart } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/prodotto/$id")({
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [qty, setQty] = useState(1);
  const { data: p, isLoading } = useQuery({ queryKey: ["prod", id], queryFn: () => getProduct({ data: { id } }) });

  if (isLoading) return <div className="p-6 text-muted-foreground">Caricamento…</div>;
  if (!p) return <div className="p-6 text-muted-foreground">Prodotto non trovato.</div>;

  const price = Number(p.discount_price ?? p.price);

  function handleOrder() {
    if (!session) {
      navigate({ to: "/auth" });
      return;
    }
    navigate({ to: "/ordina/$productId", params: { productId: p!.id }, search: { qty } as any });
  }

  return (
    <div>
      <div className="relative aspect-square bg-secondary flex items-center justify-center">
        {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <Package size={80} className="text-muted-foreground" />}
        <Link to="/categorie" className="absolute top-4 left-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground"><ChevronLeft size={20} /></Link>
        <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground"><Heart size={18} /></button>
        {p.discount_price && (
          <span className="absolute top-4 right-16 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
            -{Math.round((1 - Number(p.discount_price) / Number(p.price)) * 100)}%
          </span>
        )}
      </div>
      <div className="p-5 space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">{p.name}</h1>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-primary">€ {price.toFixed(2)}</span>
          {p.discount_price && <span className="text-sm text-muted-foreground line-through">€ {Number(p.price).toFixed(2)}</span>}
        </div>
        {p.description && <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>}

        <div>
          <p className="text-xs text-muted-foreground mb-2">Quantità</p>
          <div className="inline-flex items-center gap-3 border border-border rounded-lg overflow-hidden">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-11 flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground"><Minus size={16} /></button>
            <span className="min-w-8 text-center font-semibold text-foreground">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="w-11 h-11 flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground"><Plus size={16} /></button>
          </div>
        </div>

        <button
          onClick={handleOrder}
          className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold uppercase tracking-wider mt-4"
        >
          Ordina ora
        </button>
        <p className="text-[11px] text-muted-foreground text-center">
          Nessun pagamento online. L'ordine viene inviato via email per la conferma.
        </p>
      </div>
    </div>
  );
}