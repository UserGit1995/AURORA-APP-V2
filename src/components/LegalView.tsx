import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { isCookieBannerActive, openCookieSettings } from '../utils/cookieConsent';

export type LegalPage = 'privacy' | 'termini';

interface LegalViewProps {
  page: LegalPage;
  onBack: () => void;
  onOpenLegal: (page: LegalPage) => void;
}

const H2 = 'mb-2 mt-6 text-lg font-semibold text-white font-heading';
const P = 'mb-4';

const PrivacyContent: React.FC = () => (
  <>
    <h1 className="mb-2 text-2xl font-bold text-white font-heading">Informativa sulla Privacy e sui Cookie</h1>

    <h2 className={H2}>Titolare del trattamento</h2>
    <p className={P}>
      Il titolare del trattamento dei dati raccolti tramite questo sito è Aurora S.r.l.s, con sede in
      Via di Prato Lungo Casilino 128/130, 00132 Roma (RM), Partita IVA 15399421005, telefono 345 600 0865, email gruppo.aurora.ordini@gmail.com.
    </p>

    <h2 className={H2}>Quali dati raccogliamo</h2>
    <p className={P}>
      Quando invii un ordine, una richiesta di prodotto o una richiesta di personalizzazione,
      raccogliamo: nome e cognome, email, numero di telefono, indirizzo di consegna, eventuale nome
      azienda, e — solo per le richieste di personalizzazione — il file grafico (logo) che carichi.
    </p>
    <p className={P}>
      Se ci scrivi dalla chat dell'app raccogliamo il nome, il numero di telefono e i messaggi che
      invii: li usiamo solo per risponderti e restano visibili soltanto a te (sul tuo dispositivo) e a noi.
    </p>

    <h2 className={H2}>Perché li usiamo</h2>
    <p className={P}>
      Usiamo questi dati esclusivamente per gestire il tuo ordine o la tua richiesta: contattarti per
      confermare disponibilità, quantità, prezzi e consegna, ed evadere quanto richiesto. Non vendiamo
      né condividiamo i tuoi dati con terze parti per finalità di marketing.
    </p>

    <h2 className={H2}>Per quanto tempo li conserviamo</h2>
    <p className={P}>
      Conserviamo i dati per il tempo necessario a gestire l'ordine e per gli eventuali obblighi
      fiscali e contabili previsti dalla legge italiana.
    </p>

    <h2 className={H2}>I tuoi diritti</h2>
    <p className={P}>
      Puoi chiedere in qualsiasi momento di accedere, correggere o cancellare i tuoi dati, scrivendo
      all'indirizzo email di contatto del sito.
    </p>

    <h2 className={H2}>Cookie e strumenti simili</h2>
    <p className={P}>
      Questo sito usa esclusivamente <strong className="text-slate-200">strumenti tecnici</strong>, necessari al
      suo funzionamento. Non usiamo cookie di profilazione, di marketing o di statistica di terze parti, e non
      tracciamo la tua navigazione su altri siti. Per questo motivo, come previsto dalle linee guida del Garante
      per la protezione dei dati personali, non ti chiediamo il consenso tramite banner.
    </p>
    <p className={P}>Gli strumenti tecnici che usiamo, salvati solo nel tuo browser, servono a:</p>
    <ul className="mb-4 list-disc pl-5 space-y-1">
      <li>mantenerti collegato al tuo account dopo l'accesso;</li>
      <li>ricordare il contenuto del carrello, i prodotti preferiti e quelli da confrontare;</li>
      <li>ricordare le tue preferenze (per esempio lingua e suono del volantino);</li>
      <li>permettere di installare l'app sul telefono e di aprirla più velocemente.</li>
    </ul>
    <p className={P}>
      I caratteri grafici del sito sono caricati direttamente dai nostri server: il tuo indirizzo IP non viene
      trasmesso a fornitori esterni di caratteri. Il sito è ospitato su servizi tecnici professionali (hosting e
      database) che trattano i dati solo per farlo funzionare.
    </p>
    <p className={P}>
      Puoi cancellare in qualsiasi momento questi dati dalle impostazioni del tuo browser: in quel caso potrebbe
      essere necessario accedere di nuovo e il carrello verrebbe svuotato.
    </p>
    {isCookieBannerActive() && (
      <p className={P}>
        <button type="button" onClick={openCookieSettings} className="text-sky-400 underline hover:text-sky-300">
          Gestisci le tue preferenze sui cookie
        </button>
      </p>
    )}
  </>
);

const TerminiContent: React.FC<{ onOpenLegal: (p: LegalPage) => void }> = ({ onOpenLegal }) => (
  <>
    <h1 className="mb-2 text-2xl font-bold text-white font-heading">Termini e Condizioni di Vendita</h1>

    <h2 className={H2}>Chi vende</h2>
    <p className={P}>
      Il venditore è Aurora S.r.l.s, con sede in Via di Prato Lungo Casilino 128/130, 00132 Roma (RM), Partita IVA 15399421005, telefono
      345 600 0865, email gruppo.aurora.ordini@gmail.com. Queste condizioni si applicano a tutti gli ordini effettuati tramite questo sito, sia
      da parte di attività con Partita IVA (bar, ristoranti, pizzerie e altre imprese) sia da parte di
      privati cittadini.
    </p>

    <h2 className={H2}>Come si conclude un ordine</h2>
    <p className={P}>
      L'ordine inviato tramite il sito è una richiesta: diventa definitivo solo dopo la nostra conferma
      (via email, telefono o WhatsApp), in cui verifichiamo insieme disponibilità, prezzo finale e
      tempi di consegna. Il pagamento avviene con le modalità concordate direttamente con te al
      momento della conferma, e non tramite il sito.
    </p>

    <h2 className={H2}>Prezzi</h2>
    <p className={P}>
      I prezzi mostrati sul sito sono indicativi e possono variare in base a quantità, personalizzazioni
      richieste e disponibilità al momento dell'ordine. Il prezzo definitivo viene sempre confermato
      prima della consegna.
    </p>

    <h2 className={H2}>Consegna</h2>
    <ul className="mb-4 list-disc space-y-1 pl-5">
      <li><strong className="text-white">Lazio:</strong> consegna entro 24/48 ore lavorative, al costo di € 3,50 o € 4,50 in base alla zona di consegna.</li>
      <li><strong className="text-white">Resto d'Italia:</strong> spedizione al costo di € 7,00.</li>
      <li>Consegne e spedizioni avvengono nei giorni lavorativi, esclusi sabato e domenica.</li>
    </ul>
    <p className={P}>
      I tempi di consegna indicati sono stimati e possono variare in base alla zona, alla quantità
      ordinata e alla disponibilità dei prodotti. Eventuali ritardi verranno comunicati appena
      possibile.
    </p>

    <h2 className={H2}>Diritto di recesso — solo per i clienti privati</h2>
    <p className={P}>
      Se acquisti come privato cittadino (non nell'ambito della tua attività professionale), hai
      diritto di recedere dall'ordine entro 14 giorni dalla ricezione della merce, senza dover indicare
      il motivo, secondo il Codice del Consumo (D.Lgs. 206/2005). Per esercitare questo diritto,
      scrivici ai contatti indicati su questo sito. La merce va restituita integra; le spese di
      restituzione sono a carico del cliente, salvo diversi accordi.
    </p>
    <p className={P}>
      <strong className="text-white">Eccezione importante:</strong> i prodotti realizzati su misura o
      personalizzati con logo, testo o grafica specifica su richiesta del cliente (come quelli
      ordinati dalla pagina "Personalizza con il tuo logo") sono esclusi per legge dal diritto di
      recesso, in quanto beni confezionati su misura o chiaramente personalizzati (art. 59, comma 1,
      lettera c, del Codice del Consumo).
    </p>
    <p className={P}>
      Se acquisti come attività/impresa (con Partita IVA, per la tua attività professionale), il
      diritto di recesso previsto dal Codice del Consumo non si applica; eventuali resi o annullamenti
      si gestiscono con accordo diretto caso per caso.
    </p>

    <h2 className={H2}>Garanzia legale di conformità</h2>
    <p className={P}>
      Per i clienti privati, i prodotti sono coperti dalla garanzia legale di conformità di 2 anni
      prevista dal Codice del Consumo per eventuali difetti. Per segnalare un problema, contattaci il
      prima possibile con foto del prodotto e una breve descrizione.
    </p>

    <h2 className={H2}>Reclami e controversie</h2>
    <p className={P}>
      Per qualsiasi reclamo, contattaci prima direttamente: cerchiamo sempre di risolvere in modo
      diretto e rapido. Se sei un consumatore privato, hai anche diritto di rivolgerti alla
      piattaforma europea di risoluzione delle controversie online (ODR), raggiungibile all'indirizzo{' '}
      <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">
        ec.europa.eu/consumers/odr
      </a>
      .
    </p>

    <h2 className={H2}>Foro competente</h2>
    <p className={P}>
      Per i clienti privati (consumatori), è sempre competente il foro del luogo di residenza del
      consumatore, secondo quanto previsto dalla legge, indipendentemente da ogni diversa indicazione.
      Per i clienti con Partita IVA, salvo diverso accordo scritto, è competente il foro di Roma.
    </p>

    <h2 className={H2}>Modifiche</h2>
    <p className={P}>
      Queste condizioni possono essere aggiornate nel tempo; la versione applicabile è sempre quella
      pubblicata su questa pagina al momento dell'ordine.
    </p>

    <p className="mt-8 text-xs">
      Per l'informativa sul trattamento dei dati personali, consulta la{' '}
      <button type="button" onClick={() => onOpenLegal('privacy')} className="text-sky-400 underline">
        Informativa Privacy
      </button>
      .
    </p>
  </>
);

export const LegalView: React.FC<LegalViewProps> = ({ page, onBack, onOpenLegal }) => (
  <div className="max-w-3xl mx-auto pb-10">
    <button
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-300 mb-4 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> Indietro
    </button>
    <div className="bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/20 border border-[#1c2433] rounded-3xl p-6 sm:p-8 text-sm leading-relaxed text-slate-400">
      {page === 'privacy' ? <PrivacyContent /> : <TerminiContent onOpenLegal={onOpenLegal} />}
    </div>
  </div>
);
