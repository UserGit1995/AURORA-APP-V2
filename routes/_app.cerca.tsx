import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/products.functions";
import { useState } from "react";
import { Search, Mic, MicOff, AlertCircle } from "lucide-react";
import { ProductGrid } from "@/components/ProductCard";
import { SkeletonGrid } from "./_app.categorie.$slug";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";

export const Route = createFileRoute("/_app/cerca")({
  component: Cerca,
});

function Cerca() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["search", term],
    queryFn: () => listProducts({ data: { q: term } }),
    enabled: term.length > 1,
  });

  const voice = useVoiceSearch((text) => {
    setQ(text);
    setTerm(text);
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-4 max-w-[1400px] mx-auto space-y-5">
      <div>
        <form
          onSubmit={(e) => { e.preventDefault(); setTerm(q); }}
          className="flex items-center gap-3 h-11 px-4 rounded-full bg-card border border-border max-w-xl"
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca prodotti…"
            className="bg-transparent flex-1 outline-none text-sm text-foreground"
          />
          <button
            type="button"
            onClick={voice.toggle}
            title={voice.isSupported ? "Cerca con la voce" : "Ricerca vocale non supportata"}
            className={voice.isListening ? "text-primary" : "text-muted-foreground hover:text-foreground"}
          >
            {voice.isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button type="submit" aria-label="Cerca">
            <Search size={18} className="text-primary" />
          </button>
        </form>
        {voice.error && (
          <div className="max-w-xl mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5">
            <AlertCircle className="w-3 h-3 shrink-0" /> {voice.error}
          </div>
        )}
      </div>

      {!term ? (
        <p className="text-sm text-muted-foreground text-center py-8">Digita almeno 2 lettere per cercare.</p>
      ) : isLoading ? (
        <SkeletonGrid />
      ) : data && data.length > 0 ? (
        <ProductGrid products={data as any} />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">Nessun prodotto trovato per "{term}".</p>
      )}
    </div>
  );
}
