import { Product } from '../types';

/**
 * Generates and downloads a CSV file containing the selected catalog products
 * for offline inventory management, reordering, and warehouse audits.
 */
export function exportProductsToCsv(
  products: Product[],
  fileNamePrefix: string = 'aurora_inventario_prodotti'
): void {
  if (!products || products.length === 0) return;

  const headers = [
    'Codice Articolo (SKU)',
    'Nome Prodotto',
    'Categoria',
    'Formato / Specifica',
    'Confezionamento',
    'Giacenza Stock (Colli)',
    'Soglia Minima',
    'Stato Magazzino',
    'Prezzo Netto Unitario (EUR)',
    'IVA (%)',
    'Prezzo Lordo (EUR)',
    'Offerta / Sconto',
    'Descrizione Sintetica',
  ];

  const escapeCsvValue = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    // If contains quote, comma, semicolon, newline, escape with double quotes
    if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const rows = products.map((product) => {
    const isLowStock = product.stock <= (product.lowStockThreshold ?? 100);
    const stockStatus = isLowStock ? 'SCORTA BASSA' : 'DISPONIBILE';
    const grossPrice = (product.price * 1.22).toFixed(2);
    const discountInfo = product.discountPercent
      ? `Sconto ${product.discountPercent}%`
      : product.isOffer
      ? 'In Offerta B2B'
      : 'Standard';

    return [
      escapeCsvValue(product.code),
      escapeCsvValue(product.name),
      escapeCsvValue(product.category),
      escapeCsvValue(product.specs?.format || '-'),
      escapeCsvValue(product.packageQty),
      escapeCsvValue(product.stock),
      escapeCsvValue(product.lowStockThreshold ?? 100),
      escapeCsvValue(stockStatus),
      escapeCsvValue(product.price.toFixed(2)),
      escapeCsvValue('22%'),
      escapeCsvValue(grossPrice),
      escapeCsvValue(discountInfo),
      escapeCsvValue(product.description || ''),
    ].join(';');
  });

  const headerRow = headers.map(escapeCsvValue).join(';');
  // Include UTF-8 BOM so Excel opens Italian accents properly
  const csvContent = '\uFEFF' + [headerRow, ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileNamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
