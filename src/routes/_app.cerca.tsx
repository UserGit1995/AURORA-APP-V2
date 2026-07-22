import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/products.functions";
import { useState } from "react";
import { Search } from "lucide-react";
import { ProductGrid } from "./_app.categorie.$slug";

export const Route = createFileRoute("/_app/cerca")({
  component: Cerca,
});

function Cerca() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["search", term], queryFn: () => listProducts({ data: { q: term } }), enabled: term.length > 1 });
  return (
    <div className="px-4 pt-4 space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); setTerm(q); }} className="flex items-center gap-3 h-11 px-4 rounded-full bg-card border border-border">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca prodotti…" className="bg-transparent flex-1 outline-none text-sm text-foreground" />
        <button type="submit"><Search size={18} className="text-primary" /></button>
      </form>
      {term ? <ProductGrid products={data} loading={isLoading} /> : <p className="text-sm text-muted-foreground text-center py-8">Digita almeno 2 lettere per cercare.</p>}
    </div>
  );
}