import { Category, Product, Subcategory } from '../types';
import { imageFirst } from '../utils/imageFirst';
import { isHorecaCategory } from './horeca';

export interface BrandSummary {
  name: string;
  image?: string;
  productCount: number;
  subcategoryIds: string[]; // tutte le righe "marca" con questo nome (una per categoria)
}

// La pagina "Marche" è solo per prodotti cosmetici/igiene/pulizia (detersivi,
// ammorbidenti, saponi, creme viso e corpo, doposole, schiume da barba, gel,
// insetticidi/antizanzare, candele profumate...). Gli accessori (spugne,
// scope, palette...) NON ci devono comparire anche se condividono la marca
// con un prodotto igienico/cosmetico: restano visibili solo dentro la loro
// categoria normale.
const EXCLUDED_BRAND_CATEGORY_NAMES = ['Accessori Pulizia'];

function brandEligibleCategoryIds(categoriesList: Category[]): Set<string> {
  return new Set(
    categoriesList
      .filter((c) => !EXCLUDED_BRAND_CATEGORY_NAMES.includes(c.name) && !isHorecaCategory(c.id))
      .map((c) => c.id)
  );
}

/**
 * Le marche sono salvate come sottocategorie di primo livello (parentSubcategoryId
 * nullo). La stessa marca reale può comparire come più righe distinte se venduta
 * in più categorie (es. "Nivea" sia in Detersivi che in Igiene Corpo): qui le
 * raggruppiamo per nome così l'utente vede UNA scheda marca con tutti i suoi
 * prodotti, a prescindere dalla categoria in cui sono catalogati (categoria
 * Accessori Pulizia esclusa, vedi sopra).
 */
export function buildBrandSummaries(categoriesList: Category[], subcategoriesList: Subcategory[]): BrandSummary[] {
  const eligibleCategoryIds = brandEligibleCategoryIds(categoriesList);
  const brandRows = subcategoriesList.filter(
    (s) => !s.parentSubcategoryId && s.active && eligibleCategoryIds.has(s.categoryId)
  );
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

/** Calcola quanti prodotti ha ogni marca (diretti + nelle loro tipologie figlie), Accessori Pulizia escluso. */
export function withProductCounts(
  brands: BrandSummary[],
  subcategoriesList: Subcategory[],
  productsList: Product[]
): BrandSummary[] {
  // Conteggi calcolati UNA volta sola (prima si rileggeva tutto il catalogo per ogni marca:
  // con migliaia di prodotti e centinaia di marche bloccava i telefoni per qualche secondo)
  const perSub = new Map<string, number>();
  for (const p of productsList) {
    if (p.subcategoryId) perSub.set(p.subcategoryId, (perSub.get(p.subcategoryId) || 0) + 1);
  }
  const childrenOf = new Map<string, string[]>();
  for (const s of subcategoriesList) {
    if (s.parentSubcategoryId) {
      const arr = childrenOf.get(s.parentSubcategoryId) || [];
      arr.push(s.id);
      childrenOf.set(s.parentSubcategoryId, arr);
    }
  }

  return brands.map((b) => {
    const allIds = new Set<string>(b.subcategoryIds);
    for (const bid of b.subcategoryIds) {
      for (const cid of childrenOf.get(bid) || []) allIds.add(cid);
    }
    let count = 0;
    allIds.forEach((id) => (count += perSub.get(id) || 0));
    return { ...b, productCount: count };
  });
}

/** Prodotti di una marca, raggruppati per tipologia (nome sotto-sottocategoria), Accessori Pulizia escluso. */
export function productsByBrandGroupedByType(
  brandName: string,
  categoriesList: Category[],
  subcategoriesList: Subcategory[],
  productsList: Product[]
): { typeName: string; products: Product[] }[] {
  const eligibleCategoryIds = brandEligibleCategoryIds(categoriesList);
  const key = brandName.trim().toLowerCase();
  const brandRows = subcategoriesList.filter(
    (s) => !s.parentSubcategoryId && s.name.trim().toLowerCase() === key && eligibleCategoryIds.has(s.categoryId)
  );
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
    // dentro ogni tipologia: prima i prodotti con foto, in fondo quelli senza
    .map(([typeName, products]) => ({ typeName, products: imageFirst(products) }))
    .sort((a, b) => b.products.length - a.products.length);
}
