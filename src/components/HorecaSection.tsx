import React, { useMemo, useState } from 'react';
import { ArrowRight, UtensilsCrossed, Camera } from 'lucide-react';
import { Category, Subcategory, Product } from '../types';
import { HORECA_CATEGORY_IDS } from '../lib/horeca';
import { colorForBrand } from './BrandsSection';
import { useAdmin } from '../context/AdminContext';
import { QuickManageModal } from './QuickManageModal';

interface HorecaSectionProps {
  categories: Category[];
  subcategories: Subcategory[];
  products: Product[];
  /** Apre il catalogo su una categoria e, se indicata, su una sua sottocategoria */
  onOpen: (categoryId: string, subcategoryId: string | null) => void;
}

// Quanti badge mostrare per categoria prima di "Mostra tutti"
const PREVIEW_PER_CATEGORY = 9;

interface Group {
  category: Category;
  total: number;
  badges: { sub: Subcategory; count: number }[];
}

/**
 * Sezione "Ho.Re.Ca - Monouso" della home (sotto le Marche): un badge per ogni
 * tipologia di prodotto (Tovaglioli, Bicchieri, Vaschette OPS...), raggruppati
 * per categoria come nell'app Ho.Re.Ca di origine.
 */
export const HorecaSection: React.FC<HorecaSectionProps> = ({ categories, subcategories, products, onOpen }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { isAdmin } = useAdmin();
  const [managing, setManaging] = useState<Subcategory | null>(null);

  const groups = useMemo<Group[]>(() => {
    const countBySub = new Map<string, number>();
    const countByCat = new Map<string, number>();
    for (const p of products) {
      if (p.subCategoryId) countBySub.set(p.subCategoryId, (countBySub.get(p.subCategoryId) || 0) + 1);
      if (p.categoryId) countByCat.set(p.categoryId, (countByCat.get(p.categoryId) || 0) + 1);
    }
    return categories
      .filter((c) => HORECA_CATEGORY_IDS.includes(c.id))
      .map((category) => ({
        category,
        total: countByCat.get(category.id) || 0,
        badges: subcategories
          .filter((s) => s.categoryId === category.id && !s.parentSubcategoryId && s.active)
          .map((sub) => ({ sub, count: countBySub.get(sub.id) || 0 }))
          .filter((b) => b.count > 0)
          .sort((a, b) => a.sub.sortOrder - b.sub.sortOrder || a.sub.name.localeCompare(b.sub.name, 'it')),
      }))
      .filter((g) => g.total > 0);
  }, [categories, subcategories, products]);

  if (groups.length === 0) return null;

  return (
    <section id="home-horeca-section" className="w-full mt-6 sm:mt-7">
      <div className="flex items-center gap-2 sm:gap-2.5 mb-3.5 sm:mb-4">
        <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
          <UtensilsCrossed className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-white text-sm sm:text-lg font-bold tracking-tight leading-tight">Ho.Re.Ca - Monouso</h2>
          <p className="hidden sm:block text-slate-500 text-xs">Forniture per ristorazione, asporto, pulizia e casse</p>
        </div>
      </div>

      <div className="space-y-5">
        {groups.map(({ category, total, badges }) => {
          const isOpen = !!expanded[category.id];
          const shown = isOpen ? badges : badges.slice(0, PREVIEW_PER_CATEGORY);
          return (
            <div key={category.id} id={`horeca-group-${category.id}`}>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-slate-200 text-xs sm:text-sm font-bold">
                  {category.name} <span className="text-slate-500 font-medium">· {total} prodotti</span>
                </h3>
                <button
                  type="button"
                  onClick={() => onOpen(category.id, null)}
                  className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 shrink-0"
                >
                  Vedi tutti
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
                {shown.map(({ sub, count }) => (
                  <div key={sub.id} className="relative">
                  <button
                    type="button"
                    id={`horeca-badge-${sub.id}`}
                    onClick={() => onOpen(category.id, sub.id)}
                    className="w-full bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/20 hover:from-slate-950/95 border border-[#1c2433] hover:border-sky-500/50 hover:shadow-md rounded-2xl p-3.5 flex flex-col items-center text-center gap-2 transition-all hover:-translate-y-0.5"
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center border overflow-hidden shrink-0 ${
                        sub.image ? 'bg-white border-slate-200' : colorForBrand(sub.name)
                      }`}
                    >
                      {sub.image ? (
                        <img src={sub.image} alt={sub.name} loading="lazy" className="w-full h-full object-contain p-1.5" />
                      ) : (
                        <span className="font-bold text-lg">{sub.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-white text-xs font-bold leading-tight line-clamp-2">{sub.name}</p>
                      <p className="text-slate-400 text-[10.5px] mt-0.5">{count} prodotti</p>
                    </div>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManaging(sub);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-sm transition-colors"
                      title={`Gestisci ${sub.name} (solo admin)`}
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  )}
                  </div>
                ))}
              </div>

              {badges.length > PREVIEW_PER_CATEGORY && (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [category.id]: !isOpen }))}
                  className="mt-3 text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  {isOpen ? 'Mostra meno' : `Mostra tutti i badge (${badges.length})`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin && managing && (
        <QuickManageModal
          title={managing.name}
          rootIds={[managing.id]}
          currentImage={subcategories.find((x) => x.id === managing.id)?.image}
          onClose={() => setManaging(null)}
        />
      )}
    </section>
  );
};
