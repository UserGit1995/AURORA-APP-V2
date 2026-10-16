import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Cliente, DatiAzienda, Ddt, Fattura, NATURE, PAGAMENTI, REGIMI, TIPI_DOC, dataIt, nomeCliente, totaliFattura,
} from './store';

/*
 * PDF di DDT e fatture con il logo Aurora in semi rilievo.
 * Il rilievo si ottiene disegnando il logo tre volte (luce, ombra, colore) con un piccolo scarto.
 */

type RGB = [number, number, number];
const NAVY: RGB = [11, 26, 46];
const AURORA: RGB = [44, 150, 216];
const INK: RGB = [38, 52, 70];
const MUTED: RGB = [112, 128, 146];
const LINE: RGB = [220, 228, 236];
const SOFT: RGB = [244, 247, 250];

const imgCache: Record<string, Promise<HTMLImageElement>> = {};
const loadImg = (url: string) =>
  (imgCache[url] =
    imgCache[url] ||
    new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error('Logo non trovato: ' + url));
      i.src = url;
    }));

/** Logo in rilievo come PNG. w = larghezza in pixel del logo. */
async function rilievo(url: string, w: number, o: { base: string; luce: string; ombra: string; d: number; alfaLuce?: number; alfaOmbra?: number }) {
  const img = await loadImg(url);
  const ratio = (img.naturalHeight || 1) / (img.naturalWidth || 1);
  const h = Math.round(w * ratio);
  const pad = Math.ceil(o.d * 2);
  const tinta = (col: string) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d')!;
    x.drawImage(img, 0, 0, w, h);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = col;
    x.fillRect(0, 0, w, h);
    return c;
  };
  const out = document.createElement('canvas');
  out.width = w + pad * 2;
  out.height = h + pad * 2;
  const g = out.getContext('2d')!;
  g.globalAlpha = o.alfaLuce ?? 1;
  g.drawImage(tinta(o.luce), pad - o.d, pad - o.d);
  g.globalAlpha = o.alfaOmbra ?? 1;
  g.drawImage(tinta(o.ombra), pad + o.d, pad + o.d);
  g.globalAlpha = 1;
  g.drawImage(tinta(o.base), pad, pad);
  return { data: out.toDataURL('image/png'), ratio: out.height / out.width };
}

const loghi = async () => {
  const [marchio, filigrana] = await Promise.all([
    rilievo('/nuova/logo-blu.svg', 900, { base: '#0b1a2e', luce: '#ffffff', ombra: '#7f97b0', d: 6, alfaOmbra: 0.5 }),
    rilievo('/nuova/emblem.svg', 700, { base: '#f5f8fb', luce: '#ffffff', ombra: '#dfe7ef', d: 5 }),
  ]);
  return { marchio, filigrana };
};

const eur = (v: number) => '€ ' + v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 3 });
const prezzo = (v: number) => '€ ' + v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const righeAzienda = (a: DatiAzienda) =>
  [
    [a.indirizzo, a.civico].filter(Boolean).join(' ') + (a.cap || a.comune ? ` - ${[a.cap, a.comune].filter(Boolean).join(' ')}${a.provincia ? ` (${a.provincia})` : ''}` : ''),
    [a.piva && `P.IVA ${a.piva}`, a.cf && a.cf !== a.piva && `C.F. ${a.cf}`, a.reaUfficio && a.reaNumero && `REA ${a.reaUfficio}-${a.reaNumero}`].filter(Boolean).join('  ·  '),
    [a.telefono && `Tel. ${a.telefono}`, a.email, a.pec && `PEC ${a.pec}`].filter(Boolean).join('  ·  '),
  ].filter((x) => x.trim());

const righeCliente = (c: Cliente | null) => {
  if (!c) return [];
  return [
    [c.indirizzo, c.civico].filter(Boolean).join(' '),
    [c.cap, c.comune, c.provincia && `(${c.provincia.toUpperCase()})`].filter(Boolean).join(' '),
    [c.piva && `P.IVA ${c.piva}`, c.cf && `C.F. ${c.cf.toUpperCase()}`].filter(Boolean).join('  ·  '),
    [c.sdi && `Cod. destinatario ${c.sdi.toUpperCase()}`, c.pec && `PEC ${c.pec}`].filter(Boolean).join('  ·  '),
  ].filter((x) => x.trim());
};

/** Intestazione comune: logo, dati azienda, titolo del documento */
function intestazione(doc: jsPDF, a: DatiAzienda, L: Awaited<ReturnType<typeof loghi>>, titolo: string, sotto: string) {
  const W = doc.internal.pageSize.getWidth();
  // filigrana in rilievo al centro della pagina
  const fw = 92;
  const H = doc.internal.pageSize.getHeight();
  doc.addImage(L.filigrana.data, 'PNG', (W - fw) / 2, (H - fw * L.filigrana.ratio) / 2 + 20, fw, fw * L.filigrana.ratio, 'filigrana', 'FAST');
  // logo
  const lw = 58;
  doc.addImage(L.marchio.data, 'PNG', 13, 12, lw, lw * L.marchio.ratio, 'marchio', 'FAST');
  let y = 14 + lw * L.marchio.ratio + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(a.denominazione || '', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...MUTED);
  for (const r of righeAzienda(a)) {
    y += 4;
    doc.text(r, 15, y);
  }
  // titolo
  doc.setFont('helvetica', 'bold');
  const T = titolo.toUpperCase();
  const fs = T.length > 16 ? 14.5 : 18;
  const sp = T.length > 16 ? 0.7 : 1.1;
  doc.setFontSize(fs);
  doc.setTextColor(...NAVY);
  doc.setCharSpace(sp);
  doc.text(T, W - 15 - doc.getTextWidth(T) - sp * (T.length - 1), 22);
  doc.setCharSpace(0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(sotto, W - 15, 29, { align: 'right' });
  doc.setDrawColor(...AURORA);
  doc.setLineWidth(0.8);
  doc.line(W - 55, 33, W - 15, 33);
  return Math.max(y + 7, 46);
}

function riquadro(doc: jsPDF, x: number, y: number, w: number, etichetta: string, nome: string, righe: string[]) {
  const h = 12 + righe.length * 4.2 + 3;
  doc.setFillColor(...SOFT);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...AURORA);
  doc.setCharSpace(0.6);
  doc.text(etichetta.toUpperCase(), x + 4, y + 5.2);
  doc.setCharSpace(0);
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(doc.splitTextToSize(nome || '-', w - 8)[0], x + 4, y + 10.4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  righe.forEach((r, i) => doc.text(doc.splitTextToSize(r, w - 8)[0], x + 4, y + 15 + i * 4.2));
  return h;
}

function campi(doc: jsPDF, y: number, voci: [string, string][]) {
  const W = doc.internal.pageSize.getWidth();
  const n = voci.length;
  const w = (W - 30) / n;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);
  doc.roundedRect(15, y, W - 30, 13, 2.5, 2.5, 'S');
  voci.forEach(([k, v], i) => {
    const x = 15 + i * w;
    if (i) doc.line(x, y + 2.5, x, y + 10.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(k.toUpperCase(), x + 3.5, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    doc.setTextColor(...NAVY);
    doc.text(doc.splitTextToSize(v || '-', w - 6)[0], x + 3.5, y + 10);
  });
  return 13;
}

const tabella = {
  theme: 'plain' as const,
  styles: { font: 'helvetica', fontSize: 8.4, textColor: INK, cellPadding: { top: 2.4, bottom: 2.4, left: 2.5, right: 2.5 }, lineColor: LINE, lineWidth: { bottom: 0.2 } as any },
  headStyles: { fillColor: NAVY, textColor: [255, 255, 255] as RGB, fontStyle: 'bold' as const, fontSize: 7.4, lineWidth: 0 },
  alternateRowStyles: { fillColor: [250, 252, 254] as RGB },
  margin: { left: 15, right: 15, top: 20, bottom: 24 },
  // le intestazioni seguono l'allineamento delle colonne
  didParseCell: (d: any) => {
    if (d.section === 'head') d.cell.styles.halign = d.table.settings?.columnStyles?.[d.column.index]?.halign || 'left';
  },
};

function pie(doc: jsPDF, a: DatiAzienda, nota: string) {
  const n = doc.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.line(15, H - 16, W - 15, H - 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    const t = [a.piede, nota].filter(Boolean).join('   ');
    doc.text(doc.splitTextToSize(t, W - 60), 15, H - 11.5);
    doc.text(`Pagina ${i} di ${n}`, W - 15, H - 11.5, { align: 'right' });
  }
}

/* ---------------- DDT ---------------- */
export async function pdfDdt(d: Ddt, a: DatiAzienda): Promise<jsPDF> {
  const L = await loghi();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = intestazione(doc, a, L, 'Documento di trasporto', `N. ${d.numero}/${d.anno}  del  ${dataIt(d.data)}`);
  const half = (W - 30 - 6) / 2;
  const h1 = riquadro(doc, 15, y, half, 'Destinatario', nomeCliente(d.cliente), righeCliente(d.cliente));
  const dest = (d.destinazione || '').split('\n').filter(Boolean);
  const h2 = riquadro(
    doc,
    15 + half + 6,
    y,
    half,
    'Luogo di destinazione',
    dest[0] || (d.cliente ? 'Come destinatario' : '-'),
    dest.slice(1, 4)
  );
  y += Math.max(h1, h2) + 5;
  y += campi(doc, y, [
    ['Causale del trasporto', d.causale],
    ['Trasporto a cura del', d.trasporto + (d.trasporto === 'Vettore' && d.vettore ? `: ${d.vettore}` : '')],
    ['Porto', d.porto],
    ['Inizio trasporto', `${dataIt(d.data)}${d.ora ? ' ore ' + d.ora : ''}`],
  ]);
  autoTable(doc, {
    ...tabella,
    startY: y + 5,
    head: [['Codice', 'Descrizione dei beni', 'U.M.', 'Quantità']],
    body: d.righe.map((r) => [r.code || '', r.descrizione, r.um || '', num(r.qty)]),
    columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 18, halign: 'center' }, 3: { cellWidth: 24, halign: 'right', fontStyle: 'bold' } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;
  const H = doc.internal.pageSize.getHeight();
  if (y > H - 70) {
    doc.addPage();
    y = 20;
  }
  y += campi(doc, y, [
    ['Aspetto dei beni', d.aspetto],
    ['Numero colli', d.colli],
    ['Peso (kg)', d.peso],
    ['Vettore', d.trasporto === 'Vettore' ? d.vettore : '-'],
  ]);
  if (d.note) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    const t = doc.splitTextToSize('Note: ' + d.note, W - 30);
    doc.text(t, 15, y + 7);
    y += 4 + t.length * 3.8;
  }
  // firme
  const fy = Math.max(y + 22, H - 46);
  const fw = (W - 30 - 12) / 3;
  ['Firma del mittente', 'Firma del vettore', 'Firma del destinatario'].forEach((t, i) => {
    const x = 15 + i * (fw + 6);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(x, fy, x + fw, fy);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(t, x, fy + 4);
  });
  pie(doc, a, '');
  return doc;
}

/* ---------------- Fattura ---------------- */
export async function pdfFattura(f: Fattura, a: DatiAzienda): Promise<jsPDF> {
  const L = await loghi();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const tot = totaliFattura(f.righe);
  let y = intestazione(doc, a, L, TIPI_DOC[f.tipoDoc], `N. ${f.numero}/${f.anno}  del  ${dataIt(f.data)}`);
  const half = (W - 30 - 6) / 2;
  const h1 = riquadro(doc, 15, y, half, 'Cliente', nomeCliente(f.cliente), righeCliente(f.cliente));
  const info = [
    `Tipo documento: ${f.tipoDoc} - ${TIPI_DOC[f.tipoDoc]}`,
    `Regime fiscale: ${REGIMI[a.regimeFiscale] || a.regimeFiscale}`,
    f.ddtRif.length ? `DDT: ${f.ddtRif.map((x) => `n. ${x.numero} del ${dataIt(x.data)}`).join(', ')}` : '',
    f.tipoDoc === 'TD04' && f.fatturaRif ? `Rif. fattura n. ${f.fatturaRif}` : '',
  ].filter(Boolean);
  const h2 = riquadro(doc, 15 + half + 6, y, half, 'Dati documento', f.causale || 'Vendita', info);
  y += Math.max(h1, h2) + 5;

  autoTable(doc, {
    ...tabella,
    startY: y,
    head: [['Codice', 'Descrizione', 'Q.tà', 'U.M.', 'Prezzo', 'Sc. %', 'IVA', 'Importo']],
    body: f.righe.map((r) => [
      r.code || '',
      r.descrizione,
      num(r.qty),
      r.um || '',
      prezzo(r.prezzo),
      r.sconto ? num(r.sconto) : '',
      r.iva ? `${num(r.iva)}%` : r.natura,
      eur(Math.round(r.qty * r.prezzo * (1 - (r.sconto || 0) / 100) * 100) / 100),
    ]),
    columnStyles: {
      0: { cellWidth: 22 },
      2: { cellWidth: 13, halign: 'right' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 21, halign: 'right' },
      5: { cellWidth: 12, halign: 'right' },
      6: { cellWidth: 13, halign: 'center' },
      7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 7;
  const H = doc.internal.pageSize.getHeight();
  if (y > H - 85) {
    doc.addPage();
    y = 20;
  }
  // riepilogo IVA (sinistra)
  autoTable(doc, {
    ...tabella,
    startY: y,
    tableWidth: 104,
    margin: { ...tabella.margin, left: 15 },
    styles: { ...tabella.styles, fontSize: 7.8 },
    headStyles: { ...tabella.headStyles, fillColor: SOFT, textColor: NAVY },
    head: [['Aliquota / Natura', 'Imponibile', 'Imposta']],
    body: tot.riepilogo.map((x) => [x.iva ? `${num(x.iva)}%` : NATURE[x.natura] || x.natura, eur(x.imponibile), eur(x.imposta)]),
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  });
  const yr = (doc as any).lastAutoTable.finalY;
  // totali (destra)
  const tx = W - 15 - 68;
  const tr: [string, string][] = [
    ['Imponibile', eur(tot.imponibile)],
    ['IVA', eur(tot.imposta)],
  ];
  doc.setFontSize(8.6);
  tr.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(k, tx + 4, y + 5 + i * 6);
    doc.setTextColor(...INK);
    doc.text(v, W - 19, y + 5 + i * 6, { align: 'right' });
  });
  doc.setFillColor(...NAVY);
  doc.roundedRect(tx, y + 15, 68, 13, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(150, 205, 240);
  doc.text('TOTALE DOCUMENTO', tx + 4, y + 20.4);
  doc.setFontSize(12.5);
  doc.setTextColor(255, 255, 255);
  doc.text(eur(tot.totale), W - 19, y + 24.6, { align: 'right' });
  y = Math.max(yr, y + 30) + 7;

  // pagamento
  const pag: [string, string][] = [
    ['Modalità di pagamento', PAGAMENTI[f.pagamento]],
    ['Scadenza', f.scadenza ? dataIt(f.scadenza) : 'A vista'],
  ];
  if (f.pagamento === 'MP05' || f.pagamento === 'MP12') pag.push(['IBAN', [a.iban, a.banca].filter(Boolean).join('  ·  ')]);
  y += campi(doc, y, pag);
  if (f.note) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    const t = doc.splitTextToSize('Note: ' + f.note, W - 30);
    doc.text(t, 15, y + 7);
  }
  pie(
    doc,
    a,
    "Copia di cortesia. L'originale della fattura elettronica è trasmesso tramite il Sistema di Interscambio ed è disponibile nell'area riservata del sito dell'Agenzia delle Entrate."
  );
  return doc;
}

export const nomePdf = (tipo: 'DDT' | 'Fattura' | 'Nota di credito', n: number, anno: number, cliente: string) =>
  `${tipo} ${n}-${anno} ${cliente}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.pdf';
