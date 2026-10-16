import { Cliente, DatiAzienda, Fattura, nomeCliente, soloCifre, totaliFattura } from './store';

/*
 * Fattura elettronica nel formato FatturaPA 1.2.2 (FPR12, tra privati).
 * Il file si carica gratis sul portale "Fatture e Corrispettivi" dell'Agenzia delle Entrate.
 */

/** Lo SDI accetta solo caratteri latini di base: tolgo o converto il resto */
const latin = (s: string) =>
  (s || '')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/€/g, 'EUR')
    .replace(/×/g, 'x')
    .normalize('NFC')
    .replace(/[^ -~ -ÿ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const esc = (s: string) => latin(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cut = (s: string, n: number) => latin(s).slice(0, n);
const tag = (n: string, v: string | number | undefined | null, max = 0) => {
  if (v === undefined || v === null || v === '') return '';
  const t = typeof v === 'number' ? String(v) : max ? cut(v, max) : latin(v);
  return t ? `<${n}>${esc(t)}</${n}>` : '';
};
const n2 = (v: number) => (Math.round((v + Number.EPSILON) * 100) / 100).toFixed(2);
const nq = (v: number) => {
  const s = (Math.round(v * 100000000) / 100000000).toString();
  const [a, b = ''] = s.split('.');
  return `${a}.${(b + '00').slice(0, Math.max(2, b.length))}`;
};

const piva = (s: string) => {
  const t = (s || '').toUpperCase().replace(/\s/g, '');
  const m = t.match(/^([A-Z]{2})(.+)$/);
  return m ? { paese: m[1], codice: m[2] } : { paese: 'IT', codice: t };
};

const sede = (x: { indirizzo: string; civico: string; cap: string; comune: string; provincia: string; nazione?: string }) => {
  const naz = (x.nazione || 'IT').toUpperCase();
  return (
    '<Sede>' +
    tag('Indirizzo', x.indirizzo, 60) +
    tag('NumeroCivico', x.civico, 8) +
    tag('CAP', naz === 'IT' ? soloCifre(x.cap).padStart(5, '0').slice(0, 5) : '00000') +
    tag('Comune', x.comune, 60) +
    (naz === 'IT' && /^[A-Za-z]{2}$/.test(x.provincia || '') ? tag('Provincia', x.provincia.toUpperCase()) : '') +
    tag('Nazione', naz) +
    '</Sede>'
  );
};

/** Controlli prima di creare il file: restituisce l'elenco dei problemi (vuoto = tutto ok) */
export function controllaFattura(f: Fattura, a: DatiAzienda): string[] {
  const e: string[] = [];
  const c = f.cliente;
  if (!a.denominazione) e.push('Dati azienda: manca la ragione sociale');
  if (!/^\d{11}$/.test(soloCifre(a.piva))) e.push('Dati azienda: la partita IVA deve avere 11 cifre');
  if (!a.indirizzo || !a.comune || !/^\d{5}$/.test(soloCifre(a.cap))) e.push('Dati azienda: manca indirizzo, CAP o comune');
  if (!c) e.push('Scegli il cliente');
  else {
    if (!nomeCliente(c)) e.push('Cliente: manca il nome o la ragione sociale');
    if (c.tipoSoggetto === 'privato' && !c.nome && !c.ragioneSociale) e.push('Cliente: manca il nome');
    if (!c.piva && !c.cf) e.push('Cliente: serve la partita IVA o il codice fiscale');
    if (!c.indirizzo || !c.comune) e.push('Cliente: manca indirizzo o comune');
    if ((c.nazione || 'IT') === 'IT' && !/^\d{5}$/.test(soloCifre(c.cap))) e.push('Cliente: il CAP deve avere 5 cifre');
    if (c.sdi && !/^[A-Za-z0-9]{6,7}$/.test(c.sdi)) e.push('Cliente: il codice destinatario SDI ha 7 caratteri');
  }
  if (!f.righe.length) e.push('Aggiungi almeno una riga');
  f.righe.forEach((r, i) => {
    if (!r.descrizione.trim()) e.push(`Riga ${i + 1}: manca la descrizione`);
    if (!(r.qty > 0)) e.push(`Riga ${i + 1}: la quantità deve essere maggiore di zero`);
    if (!r.iva && !r.natura) e.push(`Riga ${i + 1}: con IVA 0 scegli la natura (motivo dell'esenzione)`);
  });
  if (f.tipoDoc === 'TD04' && !f.fatturaRif.trim()) e.push('Nota di credito: scrivi il numero della fattura a cui si riferisce');
  if (f.pagamento === 'MP05' && !a.iban) e.push('Pagamento con bonifico: scrivi il tuo IBAN nei dati azienda');
  return e;
}

/** Progressivo per il nome del file (5 caratteri) */
export const progressivo = (f: Fattura) =>
  (String(f.anno % 100).padStart(2, '0') + f.numero.toString(36).toUpperCase().padStart(3, '0')).slice(-5);

export const nomeFileXml = (f: Fattura, a: DatiAzienda) => `IT${soloCifre(a.piva)}_${progressivo(f)}.xml`;

export function creaXml(f: Fattura, a: DatiAzienda): string {
  const c = f.cliente as Cliente;
  const tot = totaliFattura(f.righe);
  const naz = (c.nazione || 'IT').toUpperCase();
  const sdi = (c.sdi || '').toUpperCase();
  const codDest = naz !== 'IT' ? 'XXXXXXX' : /^[A-Z0-9]{7}$/.test(sdi) ? sdi : '0000000';
  const trasm = soloCifre(a.cf) && soloCifre(a.cf).length === 11 ? soloCifre(a.cf) : (a.cf || '').toUpperCase().replace(/\s/g, '') || soloCifre(a.piva);

  const cliId = c.piva
    ? `<IdFiscaleIVA><IdPaese>${piva(c.piva).paese}</IdPaese><IdCodice>${esc(piva(c.piva).codice)}</IdCodice></IdFiscaleIVA>`
    : '';
  const cliCf = c.cf ? tag('CodiceFiscale', c.cf.toUpperCase().replace(/\s/g, '')) : '';
  const cliAna =
    c.tipoSoggetto === 'privato' && c.nome && c.cognome
      ? `<Anagrafica>${tag('Nome', c.nome, 60)}${tag('Cognome', c.cognome, 60)}</Anagrafica>`
      : `<Anagrafica>${tag('Denominazione', nomeCliente(c), 80)}</Anagrafica>`;

  const rea =
    a.reaUfficio && a.reaNumero
      ? '<IscrizioneREA>' +
        tag('Ufficio', a.reaUfficio.toUpperCase().slice(0, 2)) +
        tag('NumeroREA', a.reaNumero, 20) +
        (a.capitale && !isNaN(parseFloat(a.capitale.replace(',', '.'))) ? tag('CapitaleSociale', n2(parseFloat(a.capitale.replace(',', '.')))) : '') +
        '<StatoLiquidazione>LN</StatoLiquidazione></IscrizioneREA>'
      : '';
  const tel = latin(a.telefono).replace(/\s/g, '');
  const telOk = tel.length >= 5 && tel.length <= 12;
  const mailOk = /^\S+@\S+\.\S+$/.test(a.email || '') && a.email.length >= 7;
  const contatti =
    telOk || mailOk ? '<Contatti>' + (telOk ? tag('Telefono', tel) : '') + (mailOk ? tag('Email', a.email, 256) : '') + '</Contatti>' : '';

  const causali = [f.causale, f.note]
    .filter(Boolean)
    .map((x) => latin(x))
    .join(' - ');
  const causaleTag = causali ? (causali.match(/.{1,200}/g) || []).map((x) => tag('Causale', x)).join('') : '';

  const linee = f.righe
    .map((r, i) => {
      const totale = r.qty * r.prezzo * (1 - (r.sconto || 0) / 100);
      return (
        '<DettaglioLinee>' +
        `<NumeroLinea>${i + 1}</NumeroLinea>` +
        (r.code ? `<CodiceArticolo><CodiceTipo>INTERNO</CodiceTipo>${tag('CodiceValore', r.code, 35)}</CodiceArticolo>` : '') +
        tag('Descrizione', r.descrizione, 1000) +
        `<Quantita>${nq(r.qty)}</Quantita>` +
        tag('UnitaMisura', r.um, 10) +
        `<PrezzoUnitario>${nq(r.prezzo)}</PrezzoUnitario>` +
        (r.sconto ? `<ScontoMaggiorazione><Tipo>SC</Tipo><Percentuale>${n2(r.sconto)}</Percentuale></ScontoMaggiorazione>` : '') +
        `<PrezzoTotale>${n2(totale)}</PrezzoTotale>` +
        `<AliquotaIVA>${n2(r.iva)}</AliquotaIVA>` +
        (r.iva ? '' : tag('Natura', r.natura)) +
        '</DettaglioLinee>'
      );
    })
    .join('');

  const riepilogo = tot.riepilogo
    .map(
      (x) =>
        '<DatiRiepilogo>' +
        `<AliquotaIVA>${n2(x.iva)}</AliquotaIVA>` +
        (x.iva ? '' : tag('Natura', x.natura)) +
        `<ImponibileImporto>${n2(x.imponibile)}</ImponibileImporto>` +
        `<Imposta>${n2(x.imposta)}</Imposta>` +
        (x.iva ? '<EsigibilitaIVA>I</EsigibilitaIVA>' : '') +
        '</DatiRiepilogo>'
    )
    .join('');

  const pagamento =
    '<DatiPagamento><CondizioniPagamento>TP02</CondizioniPagamento><DettaglioPagamento>' +
    tag('ModalitaPagamento', f.pagamento) +
    (f.scadenza ? tag('DataScadenzaPagamento', f.scadenza) : '') +
    `<ImportoPagamento>${n2(tot.totale)}</ImportoPagamento>` +
    (f.pagamento === 'MP05' || f.pagamento === 'MP12'
      ? tag('IstitutoFinanziario', a.banca, 80) + (a.iban ? tag('IBAN', a.iban.toUpperCase().replace(/\s/g, '')) : '')
      : '') +
    '</DettaglioPagamento></DatiPagamento>';

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">' +
    '<FatturaElettronicaHeader>' +
    '<DatiTrasmissione>' +
    `<IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>${esc(trasm)}</IdCodice></IdTrasmittente>` +
    `<ProgressivoInvio>${progressivo(f)}</ProgressivoInvio>` +
    '<FormatoTrasmissione>FPR12</FormatoTrasmissione>' +
    `<CodiceDestinatario>${codDest}</CodiceDestinatario>` +
    (codDest === '0000000' && c.pec ? tag('PECDestinatario', c.pec, 256) : '') +
    '</DatiTrasmissione>' +
    '<CedentePrestatore><DatiAnagrafici>' +
    `<IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${soloCifre(a.piva)}</IdCodice></IdFiscaleIVA>` +
    (a.cf ? tag('CodiceFiscale', a.cf.toUpperCase().replace(/\s/g, '')) : '') +
    `<Anagrafica>${tag('Denominazione', a.denominazione, 80)}</Anagrafica>` +
    tag('RegimeFiscale', a.regimeFiscale || 'RF01') +
    '</DatiAnagrafici>' +
    sede({ ...a, nazione: 'IT' }) +
    rea +
    contatti +
    '</CedentePrestatore>' +
    '<CessionarioCommittente><DatiAnagrafici>' +
    cliId +
    cliCf +
    cliAna +
    '</DatiAnagrafici>' +
    sede(c) +
    '</CessionarioCommittente>' +
    '</FatturaElettronicaHeader>' +
    '<FatturaElettronicaBody>' +
    '<DatiGenerali><DatiGeneraliDocumento>' +
    tag('TipoDocumento', f.tipoDoc) +
    '<Divisa>EUR</Divisa>' +
    tag('Data', f.data) +
    tag('Numero', `${f.numero}/${f.anno}`) +
    `<ImportoTotaleDocumento>${n2(tot.totale)}</ImportoTotaleDocumento>` +
    causaleTag +
    '</DatiGeneraliDocumento>' +
    (f.tipoDoc === 'TD04' && f.fatturaRif ? `<DatiFattureCollegate>${tag('IdDocumento', f.fatturaRif, 20)}</DatiFattureCollegate>` : '') +
    f.ddtRif.map((d) => `<DatiDDT>${tag('NumeroDDT', `${d.numero}/${d.data.slice(0, 4)}`, 20)}${tag('DataDDT', d.data)}</DatiDDT>`).join('') +
    '</DatiGenerali>' +
    '<DatiBeniServizi>' +
    linee +
    riepilogo +
    '</DatiBeniServizi>' +
    pagamento +
    '</FatturaElettronicaBody>' +
    '</p:FatturaElettronica>'
  );
}
