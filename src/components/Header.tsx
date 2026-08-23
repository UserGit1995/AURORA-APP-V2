import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Bell, ShoppingBag, X, Zap, Mic, MicOff, AlertCircle } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";

export function Header({ onOpenCart, onOpenTemplates }: { onOpenCart: () => void; onOpenTemplates: () => void }) {
  const navigate = useNavigate();
  const { count, isPulsing } = useCart();
  const { session } = useAuth();
  const [q, setQ] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  const voice = useVoiceSearch((text) => {
    setQ(text);
    navigate({ to: "/cerca", search: { q: text } as any });
  });

  const displayName = session?.user?.email?.split("@")[0] || "Ospite";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="hidden lg:flex sticky top-0 z-30 w-full bg-background/90 backdrop-blur-md border-b border-border px-8 py-3.5 items-center justify-between gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate({ to: "/cerca", search: { q } as any });
        }}
        className="flex-1 max-w-xl relative"
      >
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca prodotti..."
            className="w-full bg-card text-foreground placeholder-muted-foreground text-sm rounded-full pl-10 pr-16 py-2 border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute inset-y-0 right-9 flex items-center text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={voice.toggle}
            title={voice.isSupported ? "Cerca con la voce" : "Ricerca vocale non supportata da questo browser"}
            className={`absolute inset-y-0 right-2 flex items-center justify-center w-6 ${
              voice.isListening ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>
        {voice.error && (
          <div className="absolute top-full left-0 mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5">
            <AlertCircle className="w-3 h-3 shrink-0" /> {voice.error}
          </div>
        )}
      </form>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenTemplates}
          title="Riordino rapido: riusa un modello salvato in un click"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Zap size={13} className="fill-white" />
          <span className="hidden md:inline">Riordino Rapido</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 rounded-full bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors"
            aria-label="Notifiche"
          >
            <Bell className="w-4 h-4" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-popover border border-border rounded-xl shadow-xl p-3 text-xs text-muted-foreground">
              Nessuna notifica al momento.
            </div>
          )}
        </div>

        <button
          onClick={onOpenCart}
          className={`relative p-2 rounded-full bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors ${
            isPulsing ? "border-primary text-primary" : ""
          }`}
          aria-label="Carrello"
        >
          <ShoppingBag className="w-4 h-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-background">
              {count}
            </span>
          )}
        </button>

        <Link
          to={session ? "/account" : "/auth"}
          className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full border border-transparent hover:bg-card transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
            {initials}
          </div>
          <div className="hidden xl:block min-w-0">
            <p className="text-foreground text-xs font-bold leading-none truncate">{displayName}</p>
            <p className="text-muted-foreground text-[11px] leading-tight mt-0.5">
              {session ? "Il mio account" : "Accedi"}
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}
