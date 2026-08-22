import { Link } from "@tanstack/react-router";
import { Scale, X } from "lucide-react";
import { useCompare } from "@/lib/compare-context";

export function CompareFloatingBar() {
  const { comparedIds, removeFromCompare, clearCompare } = useCompare();

  if (comparedIds.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-full shadow-2xl px-3 py-2 flex items-center gap-2 max-w-[92vw]">
      <div className="flex items-center gap-1.5 pl-1">
        <Scale size={15} className="text-primary shrink-0" />
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">{comparedIds.length} selezionati</span>
      </div>
      <button onClick={clearCompare} className="text-[11px] text-muted-foreground hover:text-foreground px-1 whitespace-nowrap">
        Svuota
      </button>
      <Link
        to="/confronta"
        className="h-8 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center whitespace-nowrap"
      >
        Confronta
      </Link>
    </div>
  );
}
