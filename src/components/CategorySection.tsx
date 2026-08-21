import { Folder, ArrowRight, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
}

export function CategorySection({ categories, counts }: { categories: CategoryRow[]; counts: Record<string, number> }) {
  return (
    <section className="w-full mt-7">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
            <Folder className="w-4 h-4" />
          </div>
          <h2 className="text-white text-base sm:text-lg font-bold tracking-tight">Categorie principali</h2>
        </div>
        <Link
          to="/categorie"
          className="text-xs sm:text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 group"
        >
          <span>Vedi tutte</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {categories.slice(0, 7).map((cat) => {
          const count = counts[cat.id] ?? 0;
          return (
            <Link
              key={cat.id}
              to="/categorie/$slug"
              params={{ slug: cat.slug }}
              className="group cursor-pointer rounded-2xl p-2.5 text-center transition-all duration-200 bg-[#081326] hover:bg-[#0c1c36] border border-[#142646] hover:border-[#1e3966] hover:-translate-y-0.5"
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#050c18] mb-2.5 flex items-center justify-center">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <Package className="w-6 h-6 text-primary" />
                )}
              </div>
              <h3 className="text-white text-xs sm:text-sm font-bold truncate leading-tight">{cat.name}</h3>
              <p className="text-slate-400 text-[11px] mt-0.5 truncate">
                {count} {count === 1 ? "prodotto" : "prodotti"}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
