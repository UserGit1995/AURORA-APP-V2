/**
 * DATI AZIENDALI - l'UNICO posto da compilare.
 * Questi dati compaiono nei PDF degli ordini e nei riepiloghi.
 * I campi lasciati vuoti ('') semplicemente NON vengono stampati.
 */
export const COMPANY = {
  name: 'AURORA',            // ragione sociale, es. 'Aurora S.r.l.'
  vatNumber: '',             // partita IVA, es. 'IT01234567890'
  address: '',               // es. 'Via Roma 12, 00100 Roma (RM)'
  phone: '',                 // es. '+39 06 1234567'
  email: 'ordini.aurorasrls@gmail.com',
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
