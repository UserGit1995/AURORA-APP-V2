import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy init for Gemini API
let aiInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback algorithm for restock forecasting if Gemini API key is missing or encounters issues
function generateLocalRestockAnalysis(orders: any[], products: any[], focusProductId?: string) {
  // Aggregate sales volume per product
  const salesMap = new Map<string, number>();
  orders.forEach((order) => {
    (order.items || []).forEach((item: any) => {
      const pid = item.productId;
      if (pid) {
        salesMap.set(pid, (salesMap.get(pid) || 0) + (Number(item.qty) || 1));
      }
    });
  });

  const targetProducts = focusProductId
    ? products.filter((p) => p.id === focusProductId)
    : products;

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
    } else {
      urgency = 'OTTIMALE';
      suggestedReorderQty = 0;
    }

    const rationale = urgency === 'CRITICA'
      ? `Giacenza critica (${stock} colli) con ritmo vendite di ~${Math.round(monthlyRunRate)} colli/mese. Esaurimento stimato entro ${daysUntilDepletion} giorni. Si raccomanda riordino prioritario di ${suggestedReorderQty} colli.`
      : urgency === 'ALTA'
      ? `Scorte sotto soglia minima (${stock} colli vs soglia ${threshold}). Consumo consolidato di ${pastSales} colli negli ordini recenti. Si suggerisce reintegro di ${suggestedReorderQty} colli per coprire 6 settimane.`
      : urgency === 'MEDIA'
      ? `Livello di scorte moderato (${stock} colli). In base alla rotazione storica (${pastSales} colli ordinati), si suggerisce un reintegro programmato di ${suggestedReorderQty} colli.`
      : `Scorte adeguate (${stock} colli) rispetto al volume di vendita attuale. Nessun riordino immediato necessario.`;

    const costEstimate = Math.round(suggestedReorderQty * (Number(p.price) || 0) * 100) / 100;

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
      costEstimate,
    };
  });

  // Sort by urgency: CRITICA -> ALTA -> MEDIA -> OTTIMALE
  const urgencyOrder: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, OTTIMALE: 3 };
  recommendations.sort((a, b) => (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4));

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

// RESTOCK ANALYSIS API (Powered by Gemini API)
app.post('/api/restock-analysis', async (req, res) => {
  try {
    const { orders = [], products = [], focusProductId } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ error: 'Nessun prodotto specificato per l\'analisi.' });
      return;
    }

    const ai = getGenAI();

    // Prepare context for Gemini
    const orderHistorySummary = orders.map((o: any) => ({
      id: o.id,
      date: o.date,
      status: o.status,
      items: (o.items || []).map((i: any) => ({
        productId: i.productId,
        productName: i.productName,
        qty: i.qty,
        packageQty: i.packageQty,
      })),
    }));

    const targetProducts = focusProductId
      ? products.filter((p: any) => p.id === focusProductId)
      : products;

    const inventoryData = targetProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold || 100,
      unit: p.unit,
      packageQty: p.packageQty,
    }));

    if (!ai || !process.env.GEMINI_API_KEY) {
      // Fallback local analytical engine if no key
      const localResult = generateLocalRestockAnalysis(orders, products, focusProductId);
      res.json(localResult);
      return;
    }

    const prompt = `Sei l'assistente AI per la gestione logistica e il riordino B2B della piattaforma 'Aurora Distribuzione'.
Analizza lo storico ordini dei clienti e i livelli attuali di inventario per formulare raccomandazioni intelligenti di riordino merci (Restock Analysis).

DATI INVENTARIO ATTUALE:
${JSON.stringify(inventoryData, null, 2)}

STORICO ORDINI RECENTI:
${JSON.stringify(orderHistorySummary, null, 2)}

${focusProductId ? `IMPORTANTE: Focalizza l'analisi prevalentemente sul prodotto con ID: "${focusProductId}".` : ''}

OBIETTIVI DELL'ANALISI:
1. Calcola il volume storico di vendita e la velocità di consumo (run rate) di ogni prodotto.
2. Confronta lo stock attuale con la soglia minima (lowStockThreshold) e stima i giorni residui prima dell'esaurimento (daysUntilDepletion).
3. Determina la quantità di riordino consigliata (suggestedReorderQty in colli/cartoni) per garantire continuità di fornitura per le prossime 4-8 settimane.
4. Assegna un livello di urgenza: 'CRITICA' (stock < 40% soglia o < 15 giorni), 'ALTA' (stock <= soglia o < 30 giorni), 'MEDIA' (consumo attivo), o 'OTTIMALE' (scorte sufficienti).
5. Fornisci una motivazione commerciale e logistica chiara in lingua italiana (rationale) per ciascun prodotto.
6. Calcola il costo totale stimato dell'ordine di riassortimento.

Restituisci il risultato rigorosamente in formato JSON strutturato secondo lo schema specificato.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Sei un esperto di supply chain, demand forecasting e gestione scorte per distributori all\'ingrosso B2B. Rispondi sempre con analisi accurate e in lingua italiana.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'Sintesi esecutiva in italiano dell\'analisi delle scorte, trend di vendita e priorità di riordino B2B.',
            },
            criticalItemsCount: {
              type: Type.INTEGER,
              description: 'Numero totale di articoli con livello di urgenza CRITICA o ALTA.',
            },
            totalEstimatedCost: {
              type: Type.NUMBER,
              description: 'Costo stimato totale dell\'imponibile per rifornire tutti gli articoli consigliati.',
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  productName: { type: Type.STRING },
                  currentStock: { type: Type.INTEGER },
                  pastOrderedQty: { type: Type.INTEGER },
                  suggestedReorderQty: { type: Type.INTEGER },
                  urgency: { type: Type.STRING, description: 'CRITICA, ALTA, MEDIA o OTTIMALE' },
                  daysUntilDepletion: { type: Type.INTEGER, description: 'Giorni stimati prima dell\'esaurimento scorte' },
                  rationale: { type: Type.STRING, description: 'Motivazione logica e commerciale dettagliata in italiano' },
                  leadTimeWeeks: { type: Type.NUMBER, description: 'Settimane di fornitura garantite dal riordino' },
                  costEstimate: { type: Type.NUMBER, description: 'Costo stimato del riordino per questa voce' },
                },
                required: [
                  'productId',
                  'productName',
                  'currentStock',
                  'pastOrderedQty',
                  'suggestedReorderQty',
                  'urgency',
                  'daysUntilDepletion',
                  'rationale',
                  'costEstimate',
                ],
              },
            },
          },
          required: ['summary', 'criticalItemsCount', 'totalEstimatedCost', 'recommendations'],
        },
      },
    });

    const responseText = response.text?.trim() || '{}';
    const parsedData = JSON.parse(responseText);

    res.json({
      ...parsedData,
      modelUsed: 'gemini-3.7-flash',
    });
  } catch (error: any) {
    console.error('Gemini Restock Analysis error:', error);
    // Fallback to algorithmic analysis gracefully
    const { orders = [], products = [], focusProductId } = req.body;
    const localResult = generateLocalRestockAnalysis(orders, products, focusProductId);
    res.json({
      ...localResult,
      fallbackNotice: 'Analisi generata tramite motore logistico predittivo locale.',
    });
  }
});

// Vite middleware for development & static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurora B2B Server running on port ${PORT}`);
  });
}

startServer();
