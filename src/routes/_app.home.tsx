import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listCategories, listProducts } from "@/lib/products.functions";
import { Search, LayoutGrid, Tag, Sparkles, MoreHorizontal, Package } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/home")({
  component: Home,
});

function Home() {
  const [q, setQ] = useState("");
  const cats = useQuery({ queryKey: ["cats"], queryFn: () => listCategories() });
  const offers = useQuery({ queryKey: ["offers"], queryFn: () => listProducts({ data: { onOffer: true } }) });

  return (
    <div className="px-4 pt-4 space-y-6">
      {/* Search */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) window.location.href = `/cerca?q=${encodeURIComponent(q)}`; }}
        className="flex items-center gap-3 h-11 px-4 rounded-full bg-card border border-border"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca prodotti..."
          className="bg-transparent flex-1 outline-none text-sm text-foreground"
        />
        <Search size={18} className="text-primary" />
      </form>

      {/* Hero banner */}
      <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <p className="text-xs uppercase tracking-wider text-primary font-semibold">Scopri la nostra</p>
        <h2 className="text-2xl font-bold text-foreground mt-1 leading-tight">GAMMA COMPLETA</h2>
        <p className="text-xs text-muted-foreground mt-2 max-w-[60%]">
          Qualità e convenienza per la tua attività
        </p>
        <Link to="/categorie" className="inline-block mt-4 h-9 px-5 rounded-md bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider leading-9">
          Scopri di più
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <QuickAction to="/categorie" icon={<LayoutGrid size={22} />} label="Categorie" />
        <QuickAction to="/offerte" icon={<Tag size={22} />} label="Offerte" />
        <QuickAction to="/novita" icon={<Sparkles size={22} />} label="Novità" />
      </div>

      {/* Categorie principali */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Categorie principali</h3>
          <Link to="/categorie" className="text-xs text-primary">Vedi tutte</Link>
        </div>
        {cats.isLoading ? (
          <SkeletonRow />
        ) : cats.data && cats.data.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {cats.data.slice(0, 4).map((c: any) => (
              <Link key={c.id} to="/categorie/$slug" params={{ slug: c.slug }} className="flex flex-col items-center gap-2">
                <div className="w-full aspect-square rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden">
                  {c.image_url ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" /> : <Package size={22} className="text-primary" />}
                </div>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">{c.name}</span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyHint text="Nessuna categoria ancora. L'admin può aggiungerle dal pannello." />
        )}
      </section>

      {/* Offerte */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Offerte del mese</h3>
          <Link to="/offerte" className="text-xs text-primary">Vedi tutte</Link>
        </div>
        {offers.isLoading ? (
          <SkeletonRow />
        ) : offers.data && offers.data.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {offers.data.map((p: any) => (
              <Link key={p.id} to="/prodotto/$id" params={{ id: p.id }} className="min-w-[46%] rounded-xl bg-card border border-border overflow-hidden">
                <div className="relative aspect-square bg-secondary flex items-center justify-center">
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <Package size={32} className="text-muted-foreground" />}
                  {p.discount_price && (
                    <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded">
                      -{Math.round((1 - Number(p.discount_price) / Number(p.price)) * 100)}%
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <div className="text-xs text-foreground truncate">{p.name}</div>
                  <div className="text-primary font-semibold text-sm">€ {Number(p.discount_price ?? p.price).toFixed(2)}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyHint text="Nessuna offerta al momento." />
        )}
      </section>
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl bg-card border border-border">
      <span className="text-primary">{icon}</span>
      <span className="text-xs text-foreground">{label}</span>
    </Link>
  );
}

function SkeletonRow() {
  return <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square rounded-xl bg-card animate-pulse" />)}</div>;
}

function EmptyHint({ text }: { text: string }) {
  return <div className="text-xs text-muted-foreground p-4 border border-dashed border-border rounded-xl text-center">{text}</div>;
}