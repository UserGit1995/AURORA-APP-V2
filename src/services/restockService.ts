import { Order, Product, RestockAnalysisResult } from '../types';

/**
 * Analisi di riassortimento calcolata direttamente nel browser.
 * (Prima la pagina chiamava /api/restock-analysis, un server che sul sito
 * pubblicato su Vercel non esiste: l'analisi finiva sempre in errore.)
 */
export async function fetchRestockAnalysis(
  orders: Order[],
  products: Product[],
  focusProductId?: string
): Promise<RestockAnalysisResult> {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("Nessun prodotto specificato per l'analisi.");
  }

  const salesMap = new Map<string, number>();
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      if (item.productId) {
        salesMap.set(item.productId, (salesMap.get(item.productId) || 0) + (Number(item.qty) || 1));
      }
    });
  });

  const targetProducts = focusProductId ? products.filter((p) => p.id === focusProductId) : products;

  const recommendations = targetProducts.map((p) => {
    const pastSales = salesMap.get(p.id) || 0;
    const threshold = p.lowStockThreshold || 100;
    const stock = Number(p.stock) || 0;
    const monthlyRunRate = pastSales > 0 ? pastSales * 1.3 : 15;
    const dailyRunRate = monthlyRunRate / 30;
    const daysUntilDepletion = Math.max(1, Math.round(stock / Math.max(0.5, dailyRunRate)));

    let urgency: 'CRITICA' | 'ALTA' | 'MEDIA' | 'OTTIMALE' = 'OTTIMALE';
    let suggestedReorderQty = 0;

    if (stock <= threshold * 0.4 || daysUntilDepletion <= 15) {
      urgency = 'CRITICA';
      suggestedReorderQty = Math.max(25, Math.ceil(monthlyRunRate * 2));
    } else if (stock <= threshold || daysUntilDepletion <= 30) {
      urgency = 'ALTA';
      suggestedReorderQty = Math.max(15, Math.ceil(monthlyRunRate * 1.5));
    } else if (stock <= threshold * 1.5 || pastSales >= 10) {
      urgency = 'MEDIA';
      suggestedReorderQty = Math.max(10, Math.ceil(monthlyRunRate));
    }

    const rationale =
      urgency === 'CRITICA'
        ? `Giacenza critica (${stock} colli) con ritmo vendite di ~${Math.round(monthlyRunRate)} colli/mese. Esaurimento stimato entro ${daysUntilDepletion} giorni. Si raccomanda riordino prioritario di ${suggestedReorderQty} colli.`
        : urgency === 'ALTA'
        ? `Scorte sotto soglia minima (${stock} colli vs soglia ${threshold}). Consumo consolidato di ${pastSales} colli negli ordini recenti. Si suggerisce reintegro di ${suggestedReorderQty} colli per coprire 6 settimane.`
        : urgency === 'MEDIA'
        ? `Livello di scorte moderato (${stock} colli). In base alla rotazione storica (${pastSales} colli ordinati), si suggerisce un reintegro programmato di ${suggestedReorderQty} colli.`
        : `Scorte adeguate (${stock} colli) rispetto al volume di vendita attuale. Nessun riordino immediato necessario.`;

    return {
      productId: p.id,
      productName: p.name,
      currentStock: stock,
      pastOrderedQty: pastSales,
      suggestedReorderQty,
      urgency,
      daysUntilDepletion,
      rationale,
      leadTimeWeeks: urgency === 'OTTIMALE' ? 8 : 6,
      costEstimate: Math.round(suggestedReorderQty * (Number(p.price) || 0) * 100) / 100,
    };
  });

  const order: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, OTTIMALE: 3 };
  recommendations.sort((a, b) => (order[a.urgency] ?? 4) - (order[b.urgency] ?? 4));

  const criticalItemsCount = recommendations.filter((r) => r.urgency === 'CRITICA' || r.urgency === 'ALTA').length;
  const totalEstimatedCost = Math.round(recommendations.reduce((acc, r) => acc + r.costEstimate, 0) * 100) / 100;

  return {
    summary: `Analisi delle scorte completata: individuati ${criticalItemsCount} articoli con priorità di riordino alta/critica su un totale di ${targetProducts.length} referenze monitorate. Fabbisogno stimato di riassortimento complessivo pari a €${totalEstimatedCost.toFixed(2)}.`,
    criticalItemsCount,
    totalEstimatedCost,
    recommendations,
    modelUsed: 'local-analytics-engine',
  };
}
