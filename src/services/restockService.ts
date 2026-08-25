import { Order, Product, RestockAnalysisResult } from '../types';

export async function fetchRestockAnalysis(
  orders: Order[],
  products: Product[],
  focusProductId?: string
): Promise<RestockAnalysisResult> {
  try {
    const res = await fetch('/api/restock-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orders,
        products,
        focusProductId,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Errore del server: ${res.status}`);
    }

    const data: RestockAnalysisResult = await res.json();
    return data;
  } catch (err: any) {
    console.error('Error fetching restock analysis:', err);
    throw err;
  }
}
