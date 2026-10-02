/**
 * DATI AZIENDALI - l'UNICO posto da compilare.
 * Questi dati compaiono nei PDF degli ordini e nei riepiloghi.
 * I campi lasciati vuoti ('') semplicemente NON vengono stampati.
 */
export const COMPANY = {
  name: 'Aurora S.r.l.s',
  vatNumber: '15399421005',
  address: 'Via di Prato Lungo Casilino 128/130, 00132 Roma (RM)',
  phone: '345 600 0865',
  email: 'gruppo.aurora.ordini@gmail.com',
};

/** Riga con i dati aziendali disponibili, es. "Via Roma 12 • P.IVA IT0123 • Tel: +39 06 123" */
export function companyInfoLine(): string {
  return [
    COMPANY.address,
    COMPANY.vatNumber ? `P.IVA ${COMPANY.vatNumber}` : '',
    COMPANY.phone ? `Tel: ${COMPANY.phone}` : '',
    COMPANY.email,
  ]
    .filter(Boolean)
    .join(' • ');
}
