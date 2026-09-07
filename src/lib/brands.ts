import { Category, Product, Subcategory } from '../types';

export interface BrandSummary {
  name: string;
  image?: string;
  productCount: number;
  subcategoryIds: string[]; // tutte le righe "marca" con questo nome (una per categoria)
}

/**
 * Le marche sono salvate come sottocategorie di primo livello (parentSubcategoryId
 * nullo). La stessa marca reale può comparire come più righe distinte se venduta
 * in più categorie (es. "Nivea" sia in Detersivi che in Igiene Corpo): qui le
 * raggruppiamo per nome così l'utente vede UNA scheda marca con tutti i suoi
 * prodotti, a prescindere dalla categoria in cui sono catalogati.
 */
export function buildBrandSummaries(categoriesList: Category[], subcategoriesList: Subcategory[]): BrandSummary[] {
  const brandRows = subcategoriesList.filter((s) => !s.parentSubcategoryId && s.active);
  const byName = new Map<string, BrandSummary>();

  for (const row of brandRows) {
    const key = row.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.subcategoryIds.push(row.id);
      if (!existing.image && row.image) existing.image = row.image;
    } else {
      byName.set(key, {
        name: row.name,
        image: row.image || undefined,
        productCount: 0,
        subcategoryIds: [row.id],
      });
    }
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

/** Calcola quanti prodotti ha ogni marca (diretti + nelle loro tipologie figlie). */
export function withProductCounts(
  brands: BrandSummary[],
  subcategoriesList: Subcategory[],
  productsList: Product[]
): BrandSummary[] {
  const childIdsOf = (brandId: string) =>
    subcategoriesList.filter((s) => s.parentSubcategoryId === brandId).map((s) => s.id);

  return brands.map((b) => {
    const allIds = new Set<string>(b.subcategoryIds);
    for (const bid of b.subcategoryIds) {
      for (const cid of childIdsOf(bid)) allIds.add(cid);
    }
    const count = productsList.filter((p) => p.subcategoryId && allIds.has(p.subcategoryId)).length;
    return { ...b, productCount: count };
  });
}

/** Prodotti di una marca, raggruppati per tipologia (nome sotto-sottocategoria). */
export function productsByBrandGroupedByType(
  brandName: string,
  subcategoriesList: Subcategory[],
  productsList: Product[]
): { typeName: string; products: Product[] }[] {
  const key = brandName.trim().toLowerCase();
  const brandRows = subcategoriesList.filter((s) => !s.parentSubcategoryId && s.name.trim().toLowerCase() === key);
  const brandIds = new Set(brandRows.map((r) => r.id));
  const childRows = subcategoriesList.filter((s) => s.parentSubcategoryId && brandIds.has(s.parentSubcategoryId));

  const groups = new Map<string, Product[]>();
  for (const child of childRows) {
    const prods = productsList.filter((p) => p.subcategoryId === child.id);
    if (prods.length === 0) continue;
    const arr = groups.get(child.name) || [];
    groups.set(child.name, [...arr, ...prods]);
  }
  // prodotti assegnati direttamente alla marca (rare: marche senza tipologie)
  const directProds = productsList.filter((p) => p.subcategoryId && brandIds.has(p.subcategoryId));
  if (directProds.length > 0) {
    const arr = groups.get('Altro') || [];
    groups.set('Altro', [...arr, ...directProds]);
  }

  return Array.from(groups.entries())
    .map(([typeName, products]) => ({ typeName, products }))
    .sort((a, b) => b.products.length - a.products.length);
}
