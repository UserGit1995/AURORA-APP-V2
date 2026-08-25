import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '../types';

export const generateOrderReceiptPdf = (order: Order): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [2, 132, 199]; // Sky-600 #0284c7
  const darkNavy: [number, number, number] = [7, 17, 32]; // #071120
  const slateText: [number, number, number] = [51, 65, 85]; // Slate-700
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate-50

  // 1. Header Banner & Branding
  doc.setFillColor(...darkNavy);
  doc.rect(0, 0, 210, 36, 'F');

  // Decorative blue line
  doc.setFillColor(...primaryColor);
  doc.rect(0, 35, 210, 1.5, 'F');

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('AURORA DISTRIBUZIONE', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(186, 230, 253); // Sky-200
  doc.text('Piattaforma E-commerce B2B • Forniture per Igiene & Sanificazione Professionale', 14, 22);
  doc.text('Via dell\'Industria 45, 20145 Milano (MI) • P.IVA IT09876543210 • Tel: +39 02 8900123', 14, 27);

  // Document Title & ID on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('RICEVUTA ORDINE / FATTURA', 196, 16, { align: 'right' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(56, 189, 248); // Sky-400
  doc.text(order.id, 196, 23, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Data: ${order.date}`, 196, 29, { align: 'right' });

  // 2. Order Metadata & Customer Information Cards (2-columns)
  const startY = 43;

  // Box 1: Intestatario & Spedizione
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 88, 44, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkNavy);
  doc.text('INDIRIZZO DI FATTURAZIONE & CONSEGNA', 18, startY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...slateText);
  const isCompany = !!order.shippingAddress?.companyName;
  const headerName = isCompany 
    ? order.shippingAddress?.companyName || 'AURORA S.r.l.'
    : order.shippingAddress?.recipient || 'Cliente Privato';
  doc.text(headerName, 18, startY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const recipient = isCompany 
    ? (order.shippingAddress?.recipient ? `C/A: ${order.shippingAddress.recipient}` : 'Ufficio Acquisti')
    : `Cliente: ${order.shippingAddress?.recipient || ''}`;
  const street = order.shippingAddress?.street || 'Via dell\'Industria 45';
  const city = `${order.shippingAddress?.postalCode || '20145'} ${order.shippingAddress?.city || 'Milano'} (${order.shippingAddress?.province || 'MI'})`;
  const fiscalId = order.shippingAddress?.vatNumber 
    ? `P.IVA: ${order.shippingAddress.vatNumber}` 
    : order.shippingAddress?.fiscalCode 
    ? `C.F.: ${order.shippingAddress.fiscalCode}` 
    : 'P.IVA/CF: Non specificato';
  const phone = order.shippingAddress?.phone ? `Tel: ${order.shippingAddress.phone}` : '';

  doc.text(recipient, 18, startY + 17);
  doc.text(street, 18, startY + 22);
  doc.text(city, 18, startY + 27);
  doc.text(fiscalId, 18, startY + 32);
  if (phone) doc.text(phone, 18, startY + 37);

  // Box 2: Dettagli Logistici & Pagamento
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(108, startY, 88, 44, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkNavy);
  doc.text('INFORMAZIONI SPEDIZIONE & STATO', 112, startY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateText);

  doc.text('Stato Documento:', 112, startY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(order.status, 150, startY + 12);

  doc.setFont('helvetica', 'normal');
  doc.text('Consegna stimata:', 112, startY + 17);
  doc.setFont('helvetica', 'bold');
  doc.text(order.estimatedDelivery, 150, startY + 17);

  doc.setFont('helvetica', 'normal');
  doc.text('Corriere assegnato:', 112, startY + 22);
  doc.text(order.courier || 'GLS Logistics B2B Express', 150, startY + 22);

  doc.text('Codice Tracking (AWB):', 112, startY + 27);
  doc.setFont('courier', 'bold');
  doc.text(order.trackingNumber || 'GLS-IT-992019', 150, startY + 27);

  doc.setFont('helvetica', 'normal');
  doc.text('Modalità Pagamento:', 112, startY + 34);
  doc.setFont('helvetica', 'bold');
  doc.text(order.paymentMethod || 'Bonifico Bancario B2B 30/60 gg', 112, startY + 39);

  // 3. Items Table using autoTable
  const tableData = order.items.map((item, index) => {
    const itemPrice = item.price;
    const itemTotal = item.price * item.qty;
    return [
      (index + 1).toString(),
      item.code || `SKU-${index + 100}`,
      item.productName,
      item.packageQty || 'Conf. Standard',
      `${item.qty} colli`,
      `€ ${itemPrice.toFixed(2)}`,
      `€ ${itemTotal.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: startY + 48,
    head: [['#', 'SKU', 'Descrizione Prodotto', 'Confezione', 'Quantità', 'Prezzo Unit.', 'Totale Netto']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: darkNavy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: slateText,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { font: 'courier', fontStyle: 'bold', cellWidth: 26 },
      2: { cellWidth: 'auto', fontStyle: 'bold' },
      3: { cellWidth: 26, fontSize: 7.5 },
      4: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
      5: { halign: 'right', font: 'courier', cellWidth: 22 },
      6: { halign: 'right', font: 'courier', fontStyle: 'bold', cellWidth: 24 },
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
    margin: { left: 14, right: 14 },
  });

  // Calculate position for Financial Totals Summary
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Subtotal, VAT, and Final Total Box
  const subtotal = order.subtotal ?? (order.total / 1.22);
  const vatAmount = order.vatAmount ?? (order.total - subtotal);
  const shippingCost = order.shippingCost ?? 0;

  // Notes on the left
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, finalY, 95, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);
  doc.text('NOTE FISCALI & OPERATIVE', 18, finalY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('• Documento proforma valido ai fini commerciali B2B.', 18, finalY + 10);
  doc.text('• Fattura elettronica SDI trasmessa tramite canale accreditato.', 18, finalY + 15);
  doc.text('• Merce resa franco destino con imballaggio standard.', 18, finalY + 20);
  doc.text('• Assistenza ordini & reclami: ordini@auroradistribuzione.it', 18, finalY + 25);

  // Financial Summary Box on the right
  const summaryX = 116;
  const summaryWidth = 80;

  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, finalY, summaryWidth, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateText);

  doc.text('Imponibile Merci:', summaryX + 4, finalY + 6);
  doc.setFont('courier', 'normal');
  doc.text(`€ ${subtotal.toFixed(2)}`, summaryX + summaryWidth - 4, finalY + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Spese di Spedizione:', summaryX + 4, finalY + 12);
  doc.setFont('courier', 'normal');
  doc.text(shippingCost === 0 ? 'Gratuite (B2B)' : `€ ${shippingCost.toFixed(2)}`, summaryX + summaryWidth - 4, finalY + 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('IVA Ordinaria (22%):', summaryX + 4, finalY + 18);
  doc.setFont('courier', 'normal');
  doc.text(`€ ${vatAmount.toFixed(2)}`, summaryX + summaryWidth - 4, finalY + 18, { align: 'right' });

  // Total Bar Highlight
  doc.setFillColor(...darkNavy);
  doc.roundedRect(summaryX + 2, finalY + 22, summaryWidth - 4, 9, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTALE DOVUTO:', summaryX + 5, finalY + 28);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(56, 189, 248); // Sky-400
  doc.text(`€ ${order.total.toFixed(2)}`, summaryX + summaryWidth - 5, finalY + 28, { align: 'right' });

  // 4. Footer
  const pageHeight = doc.internal.pageSize.height || 297;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageHeight - 14, 196, pageHeight - 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text('Aurora Distribuzione S.r.l. - Registro Imprese Milano n. MI-2094182 - Capitale Sociale € 150.000,00 i.v.', 14, pageHeight - 9);
  doc.text(`Documento generato il ${new Date().toLocaleDateString('it-IT')} ore ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`, 196, pageHeight - 9, { align: 'right' });

  // Trigger browser download
  const cleanId = order.id.replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`Ricevuta_Ordine_${cleanId}.pdf`);
};

export interface OrderHistoryPdfOptions {
  filterLabel?: string;
  customerName?: string;
  vatNumber?: string;
  language?: 'it' | 'en';
}

export const generateOrderHistoryPdf = (
  orders: Order[],
  options?: OrderHistoryPdfOptions
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const lang = options?.language || 'it';
  const isIt = lang === 'it';

  const primaryColor: [number, number, number] = [2, 132, 199]; // Sky-600 #0284c7
  const darkNavy: [number, number, number] = [7, 17, 32]; // #071120
  const slateText: [number, number, number] = [51, 65, 85]; // Slate-700
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate-50

  // Calculations & Aggregates
  const totalOrders = orders.length;
  const totalGross = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalNet = orders.reduce((sum, o) => sum + (o.subtotal ?? (o.total / 1.22)), 0);
  const totalVat = totalGross - totalNet;
  const totalItems = orders.reduce((sum, o) => sum + (o.itemsCount || 0), 0);

  const deliveredOrders = orders.filter((o) => o.status === 'Consegnato');
  const shippedOrders = orders.filter((o) => o.status === 'Spedito');
  const processingOrders = orders.filter((o) => o.status === 'In elaborazione');
  const cancelledOrders = orders.filter((o) => o.status === 'Annullato');

  const deliveredGross = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
  const activeGross = [...shippedOrders, ...processingOrders].reduce((sum, o) => sum + o.total, 0);

  // Product aggregation for top products summary
  const productMap = new Map<string, { name: string; qty: number; totalSpent: number; ordersCount: number }>();
  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const key = item.productId || item.productName;
      const current = productMap.get(key) || { name: item.productName, qty: 0, totalSpent: 0, ordersCount: 0 };
      current.qty += item.qty;
      current.totalSpent += (item.price || 0) * item.qty;
      current.ordersCount += 1;
      productMap.set(key, current);
    });
  });

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 8);

  const now = new Date();
  const dateStr = now.toLocaleDateString(isIt ? 'it-IT' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString(isIt ? 'it-IT' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const reportCode = `RPT-ORD-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Header Banner & Branding
  doc.setFillColor(...darkNavy);
  doc.rect(0, 0, 210, 36, 'F');

  // Decorative blue line
  doc.setFillColor(...primaryColor);
  doc.rect(0, 35, 210, 1.5, 'F');

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('AURORA DISTRIBUZIONE', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(186, 230, 253); // Sky-200
  doc.text(
    isIt 
      ? 'Piattaforma E-commerce B2B • Forniture per Igiene & Sanificazione Professionale'
      : 'B2B E-commerce Platform • Professional Hygiene & Sanitization Supplies',
    14,
    21
  );
  doc.text('Via dell\'Industria 45, 20145 Milano (MI) • P.IVA IT09876543210 • Tel: +39 02 8900123', 14, 26);

  // Document Title & Reference on the right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(isIt ? 'ESTRATTO STORICO ORDINI' : 'ORDER HISTORY STATEMENT', 196, 14, { align: 'right' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(56, 189, 248); // Sky-400
  doc.text(reportCode, 196, 21, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    isIt ? `Emesso il: ${dateStr} • ${timeStr}` : `Issued on: ${dateStr} • ${timeStr}`,
    196,
    27,
    { align: 'right' }
  );

  // 2. Client Info Card & Filter Scope (Left) and KPI Highlights (Right)
  const startY = 42;

  // Box Left: Intestazione Cliente & Filtro
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 92, 36, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text(isIt ? 'CONTO CLIENTE & AMBITO REPORT' : 'CLIENT ACCOUNT & REPORT SCOPE', 18, startY + 6);

  const clientName = options?.customerName || orders[0]?.shippingAddress?.companyName || 'AURORA DISTRIBUZIONE S.r.l. - Account B2B';
  const vatNumber = options?.vatNumber || orders[0]?.shippingAddress?.vatNumber || 'IT08492040962';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...slateText);
  doc.text(clientName, 18, startY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`P.IVA / C.F.: ${vatNumber}`, 18, startY + 17);
  doc.text(
    isIt ? `Ambito selezione: ${options?.filterLabel || 'Tutto lo storico ordini'}` : `Filter scope: ${options?.filterLabel || 'Full order history'}`,
    18,
    startY + 22
  );
  doc.text(
    isIt ? `Stato registro: ${deliveredOrders.length} Consegnati • ${shippedOrders.length + processingOrders.length} Attivi` : `Status summary: ${deliveredOrders.length} Delivered • ${shippedOrders.length + processingOrders.length} Active`,
    18,
    startY + 27
  );
  doc.text(
    isIt ? `Canale acquisto: Portale Telematico B2B Aurora` : `Purchase channel: Aurora B2B Portal`,
    18,
    startY + 32
  );

  // Box Right: 4 KPI Cards Grid (2x2 inside a 88x36 box)
  const kpiBoxX = 110;
  const kpiBoxW = 86;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(kpiBoxX, startY, kpiBoxW, 36, 1.5, 1.5, 'FD');

  // KPI 1: Totale Ordini
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(isIt ? 'TOTALE ORDINI' : 'TOTAL ORDERS', kpiBoxX + 5, startY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkNavy);
  doc.text(`${totalOrders}`, kpiBoxX + 5, startY + 12);

  // KPI 2: Totale Colli
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(isIt ? 'TOTALE COLLI' : 'TOTAL UNITS', kpiBoxX + 46, startY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkNavy);
  doc.text(`${totalItems} colli`, kpiBoxX + 46, startY + 12);

  // Divider inside KPI box
  doc.setDrawColor(226, 232, 240);
  doc.line(kpiBoxX + 4, startY + 16, kpiBoxX + kpiBoxW - 4, startY + 16);

  // KPI 3: Imponibile Totale
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(isIt ? 'TOTALE IMPONIBILE' : 'TAXABLE TOTAL', kpiBoxX + 5, startY + 22);
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkNavy);
  doc.text(`€ ${totalNet.toFixed(2)}`, kpiBoxX + 5, startY + 29);

  // KPI 4: Totale Lordo (Highlighted)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(isIt ? 'FATTURATO LORDO (IVA INC.)' : 'GROSS TOTAL (VAT INC.)', kpiBoxX + 46, startY + 22);
  doc.setFont('courier', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`€ ${totalGross.toFixed(2)}`, kpiBoxX + 46, startY + 29);

  // 3. Operational Status Summary Bar
  const statusBarY = startY + 40;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, statusBarY, 182, 8, 1, 1, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateText);

  const statusSummaryText = isIt
    ? `Riepilogo Forniture: ${deliveredOrders.length} Consegnati (€ ${deliveredGross.toFixed(2)}) • ${shippedOrders.length} In Transito • ${processingOrders.length} In Allestimento${cancelledOrders.length > 0 ? ` • ${cancelledOrders.length} Annullati` : ''}`
    : `Supply Status Summary: ${deliveredOrders.length} Delivered (€ ${deliveredGross.toFixed(2)}) • ${shippedOrders.length} In Transit • ${processingOrders.length} In Preparation${cancelledOrders.length > 0 ? ` • ${cancelledOrders.length} Cancelled` : ''}`;

  doc.text(statusSummaryText, 18, statusBarY + 5.5);

  // 4. Main Orders Table
  const ordersTableData = orders.map((order, idx) => {
    // Summary of products
    const itemsSummary = (order.items || [])
      .map((it) => `${it.productName} (${it.qty})`)
      .join(', ');
    const displayItems = itemsSummary.length > 55 ? `${itemsSummary.substring(0, 52)}...` : itemsSummary;

    const netAmount = order.subtotal ?? (order.total / 1.22);
    const courierInfo = order.courier 
      ? `${order.courier}${order.trackingNumber ? `\nAWB: ${order.trackingNumber}` : ''}`
      : 'Logistica Interna';

    let statusDisplay: string = order.status;
    if (!isIt) {
      if (order.status === 'Consegnato') statusDisplay = 'Delivered';
      else if (order.status === 'Spedito') statusDisplay = 'In Transit';
      else if (order.status === 'In elaborazione') statusDisplay = 'Processing';
      else if (order.status === 'Annullato') statusDisplay = 'Cancelled';
    }

    return [
      (idx + 1).toString(),
      order.id,
      order.date,
      statusDisplay,
      `${order.itemsCount} colli\n${displayItems || 'Articoli vari'}`,
      courierInfo,
      order.estimatedDelivery,
      `€ ${netAmount.toFixed(2)}`,
      `€ ${order.total.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: statusBarY + 12,
    head: [[
      '#',
      isIt ? 'ID Ordine' : 'Order ID',
      isIt ? 'Data' : 'Date',
      isIt ? 'Stato' : 'Status',
      isIt ? 'Colli & Articoli' : 'Units & Items',
      isIt ? 'Vettore / AWB' : 'Courier / AWB',
      isIt ? 'Consegna' : 'Delivery',
      isIt ? 'Imponibile' : 'Taxable',
      isIt ? 'Totale IVA' : 'Total'
    ]],
    body: ordersTableData,
    theme: 'striped',
    headStyles: {
      fillColor: darkNavy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 2.5,
      textColor: slateText,
      valign: 'middle',
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { font: 'courier', fontStyle: 'bold', cellWidth: 24 },
      2: { cellWidth: 16, fontSize: 7 },
      3: { fontStyle: 'bold', cellWidth: 20 },
      4: { cellWidth: 'auto', fontSize: 6.8 },
      5: { cellWidth: 26, fontSize: 6.8 },
      6: { cellWidth: 18, fontSize: 7 },
      7: { halign: 'right', font: 'courier', cellWidth: 19 },
      8: { halign: 'right', font: 'courier', fontStyle: 'bold', cellWidth: 21 },
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
    didParseCell: (data) => {
      // Colorize the status column
      if (data.section === 'body' && data.column.index === 3) {
        const text = String(data.cell.raw);
        if (text.includes('Consegnato') || text.includes('Delivered')) {
          data.cell.styles.textColor = [16, 149, 106]; // Emerald
        } else if (text.includes('Spedito') || text.includes('Transit')) {
          data.cell.styles.textColor = [2, 132, 199]; // Sky
        } else if (text.includes('elaborazione') || text.includes('Processing')) {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
        } else if (text.includes('Annullato') || text.includes('Cancelled')) {
          data.cell.styles.textColor = [225, 29, 72]; // Rose
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Top Ordered Products Breakdown Table (if space permits or on subsequent section)
  let currentFinalY = (doc as any).lastAutoTable.finalY + 6;

  // Check if we have enough room on current page for Top Products & Totals Summary; if not, add page
  if (currentFinalY > 215) {
    doc.addPage();
    currentFinalY = 24;
  }

  if (topProducts.length > 0) {
    const topProductsData = topProducts.map((p, index) => [
      (index + 1).toString(),
      p.name,
      `${p.ordersCount} ${isIt ? 'ordini' : 'orders'}`,
      `${p.qty} ${isIt ? 'colli' : 'units'}`,
      `€ ${p.totalSpent.toFixed(2)}`,
      `${((p.totalSpent / (totalGross || 1)) * 100).toFixed(1)}%`
    ]);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...darkNavy);
    doc.text(
      isIt ? 'RIEPILOGO ARTICOLI PIÙ ORDINATI & QUOTE FORNITURA' : 'TOP ORDERED PRODUCTS & VOLUME BREAKDOWN',
      14,
      currentFinalY + 2
    );

    autoTable(doc, {
      startY: currentFinalY + 5,
      head: [[
        '#',
        isIt ? 'Descrizione Articolo' : 'Product Name',
        isIt ? 'Frequenza' : 'Orders',
        isIt ? 'Quantità Totale' : 'Total Quantity',
        isIt ? 'Spesa Complessiva' : 'Total Spent',
        isIt ? 'Incidenza %' : 'Share %'
      ]],
      body: topProductsData,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 34, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: slateText,
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 24 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
        4: { halign: 'right', font: 'courier', fontStyle: 'bold', cellWidth: 28 },
        5: { halign: 'right', font: 'courier', cellWidth: 20 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
    });

    currentFinalY = (doc as any).lastAutoTable.finalY + 6;
  }

  // 6. Financial Summary Box
  if (currentFinalY > 235) {
    doc.addPage();
    currentFinalY = 24;
  }

  // Left notes box
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentFinalY, 95, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);
  doc.text(isIt ? 'NOTE & DISCIPLINARE FORNITURE' : 'NOTES & TERMS', 18, currentFinalY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    isIt 
      ? '• Estratto conto generato ad uso amministrativo e gestionale aziendale.'
      : '• Statement generated for corporate administrative and accounting records.',
    18,
    currentFinalY + 10
  );
  doc.text(
    isIt 
      ? '• Ciascun ordine ha una fattura elettronica SDI archiviata con relativo DDT.'
      : '• Each order is backed by an official electronic invoice and delivery note.',
    18,
    currentFinalY + 15
  );
  doc.text(
    isIt 
      ? '• Modalità pagamento registrata: Bonifico B2B / Plafond commerciale.'
      : '• Payment terms: B2B Bank Transfer / Approved Corporate Credit.',
    18,
    currentFinalY + 20
  );
  doc.text(
    isIt 
      ? '• Assistenza contabile: amministrazione@auroradistribuzione.it'
      : '• Accounting support: amministrazione@auroradistribuzione.it',
    18,
    currentFinalY + 25
  );

  // Right totals box
  const summaryX = 116;
  const summaryWidth = 80;

  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, currentFinalY, summaryWidth, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateText);

  doc.text(isIt ? 'Totale Imponibile Merci:' : 'Total Taxable Net:', summaryX + 4, currentFinalY + 6);
  doc.setFont('courier', 'normal');
  doc.text(`€ ${totalNet.toFixed(2)}`, summaryX + summaryWidth - 4, currentFinalY + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text(isIt ? 'Spese Trasporto B2B:' : 'B2B Transport Freight:', summaryX + 4, currentFinalY + 12);
  doc.setFont('courier', 'normal');
  doc.text(isIt ? 'Incluse / Gratuite' : 'Free / Included', summaryX + summaryWidth - 4, currentFinalY + 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text(isIt ? 'Totale IVA Ordinaria (22%):' : 'Total VAT (22%):', summaryX + 4, currentFinalY + 18);
  doc.setFont('courier', 'normal');
  doc.text(`€ ${totalVat.toFixed(2)}`, summaryX + summaryWidth - 4, currentFinalY + 18, { align: 'right' });

  // Highlighted Total Bar
  doc.setFillColor(...darkNavy);
  doc.roundedRect(summaryX + 2, currentFinalY + 22, summaryWidth - 4, 9, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(isIt ? 'TOTALE GENERALE:' : 'GRAND TOTAL:', summaryX + 5, currentFinalY + 28);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(56, 189, 248); // Sky-400
  doc.text(`€ ${totalGross.toFixed(2)}`, summaryX + summaryWidth - 5, currentFinalY + 28, { align: 'right' });

  // 7. Multi-page Headers and Footers
  const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.height || 297;

    // Running Header on pages 2+
    if (i > 1) {
      doc.setFillColor(...darkNavy);
      doc.rect(0, 0, 210, 14, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('AURORA DISTRIBUZIONE • ESTRATTO STORICO FORNITURE B2B', 14, 9);

      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(56, 189, 248);
      doc.text(reportCode, 196, 9, { align: 'right' });

      doc.setFillColor(...primaryColor);
      doc.rect(0, 13.5, 210, 0.5, 'F');
    }

    // Running Footer on all pages
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, 196, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(
      'Aurora Distribuzione S.r.l. - Registro Imprese Milano MI-2094182 - P.IVA IT09876543210 - Capitale Sociale € 150.000,00 i.v.',
      14,
      pageHeight - 7
    );

    const pageText = isIt ? `Pagina ${i} di ${totalPages}` : `Page ${i} of ${totalPages}`;
    doc.text(pageText, 196, pageHeight - 7, { align: 'right' });
  }

  // Trigger download
  const cleanFilter = (options?.filterLabel || 'Completo').replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`Estratto_Storico_Ordini_AURORA_${cleanFilter}_${now.toISOString().slice(0, 10)}.pdf`);
};
