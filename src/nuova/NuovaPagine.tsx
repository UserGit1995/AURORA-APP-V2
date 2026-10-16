import React, { useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { LegalView } from '../components/LegalView';
import { Ic, Bi, vib } from './Icona';
import { EMBLEM } from './NuovaShell';

/* Pagine con la grafica del prototipo: barra in alto (indietro, titolo, cerca) e contenuto. */

export const focusSearch = () => window.dispatchEvent(new Event('n-open-search'));

export const PageBar: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <header className="n-pbar">
    <button type="button" aria-label="Indietro" onClick={onBack}>
      <Ic n="chevl" s={22} />
    </button>
    <b>{title}</b>
    <button type="button" aria-label="Cerca" onClick={focusSearch}>
      <Ic n="search" s={20} />
    </button>
  </header>
);

const Head: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <header className="x-head">
    <h1>{title}</h1>
    {sub ? <p>{sub}</p> : null}
  </header>
);

/** "Come funziona": consegne e spedizioni */
export const NuovaConsegne: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { minimumOrderEur } = useAdmin();
  const min = minimumOrderEur > 0 ? minimumOrderEur : 50;
  return (
    <div className="n-xpage">
      <PageBar title="Come funziona" onBack={onBack} />
      <div className="n-xbody">
        <img className="x-bgemb" src={EMBLEM} alt="" />
        <Head title="Consegne e spedizioni" sub="Ordini dall'app, ti confermiamo disponibilità e prezzo, poi consegniamo." />
        <div className="x-sec">
          <div className="x-box">
            <div className="x-zone">
              <Bi n="rome" s={30} />
              <span><b>Roma e provincia</b><small>Con i nostri furgoni, in 24/48 ore lavorative</small></span>
              <em>Gratis</em>
            </div>
            <div className="x-zone">
              <Bi n="route" s={30} />
              <span><b>Resto del Lazio</b><small>In 24/48 ore lavorative, in base alla zona</small></span>
              <em>€ 3,50 · 4,50</em>
            </div>
            <div className="x-zone">
              <Bi n="route" s={30} />
              <span><b>Resto d'Italia</b><small>Spedizione con corriere</small></span>
              <em>€ 7,00</em>
            </div>
          </div>
          <div className="x-note"><Ic n="bag" s={18} /><span>Ordine minimo <b>€ {String(min).replace('.', ',')}</b> di prodotti, spese di consegna escluse.</span></div>
          <div className="x-note"><Ic n="truck" s={18} /><span>Consegne e spedizioni nei giorni lavorativi, esclusi sabato e domenica.</span></div>
          <div className="x-note"><Ic n="chat" s={18} /><span>L'ordine diventa definitivo con la nostra conferma: verifichiamo insieme disponibilità, prezzo finale e tempi.</span></div>
        </div>
      </div>
    </div>
  );
};

/** Termini e Privacy: stessi testi di sempre, con la grafica del prototipo */
export const NuovaLegale: React.FC<{
  page: 'privacy' | 'termini';
  onBack: () => void;
  onOpenLegal: (page: 'privacy' | 'termini') => void;
}> = ({ page, onBack, onOpenLegal }) => (
  <div className="n-xpage">
    <PageBar title={page === 'privacy' ? 'Informativa privacy' : 'Termini e condizioni'} onBack={onBack} />
    <div className="n-xbody n-legal">
      <LegalView page={page} onBack={onBack} onOpenLegal={onOpenLegal} bare />
      <img className="x-endemb" src={EMBLEM} alt="" />
    </div>
  </div>
);

type AuroraInstallApi = {
  isStandalone?: () => boolean;
  promptInstall?: () => Promise<string>;
};
const installApi = (): AuroraInstallApi | undefined => (window as unknown as { AuroraInstall?: AuroraInstallApi }).AuroraInstall;

const IOS_ICON = (
  <svg className="xa-dev" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="9" y="3.5" width="14" height="25" rx="3.6" />
    <path d="M14 6.6h4" strokeWidth="2.2" />
    <path d="M13.5 25.3h5" />
  </svg>
);
const AND_ICON = (
  <svg className="xa-dev" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="9" y="3.5" width="14" height="25" rx="2.4" />
    <circle cx="16" cy="6.8" r=".9" fill="currentColor" stroke="none" />
    <path d="M12.5 25.2h1.6M15.2 25.2h1.6M17.9 25.2h1.6" strokeWidth="1.6" />
  </svg>
);
const SHARE_ICON = (
  <svg className="n-si" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 9H6.5v11h11V9H16M12 15V3.5M8.5 7 12 3.5 15.5 7" />
  </svg>
);

/** Scarica l'app: Android si installa dal pulsante, iPhone mostra i passaggi (Apple non permette di più) */
export const NuovaInstalla: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [os, setOs] = useState<'ios' | 'and' | null>(null);
  const [steps, setSteps] = useState<'ios' | 'and' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 2600);
    return () => window.clearTimeout(t);
  }, [msg]);

  const install = async (o: 'ios' | 'and') => {
    vib(5);
    setOs(o);
    const api = installApi();
    const standalone =
      api?.isStandalone?.() ||
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setMsg('Aurora è già installata su questo telefono');
      return;
    }
    if (o === 'and' && api?.promptInstall) {
      const r = await api.promptInstall();
      if (r === 'accepted') {
        setMsg('Aurora installata nella Home');
        return;
      }
      if (r === 'dismissed') return;
    }
    setSteps(o);
    setMsg('Segui i passaggi qui sotto');
    window.setTimeout(() => document.querySelector('.xa-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  return (
    <div className="n-xpage">
      <PageBar title="Scarica l'app" onBack={onBack} />
      <div className="n-xbody n-inst">
        <img className="x-appemb" src={EMBLEM} alt="" />
        <section className="xa-hero">
          <span className="xa-icon"><img src={EMBLEM} alt="" /></span>
          <small>App Aurora</small>
          <h1>Aurora sul tuo telefono</h1>
          <p>Si installa in pochi secondi.</p>
          <div className="xa-feat">
            <span><Ic n="home" s={15} />Si apre dall'icona</span>
            <span><Ic n="bag" s={15} />Carrello salvato</span>
          </div>
        </section>
        <div className="xa-btns">
          <button type="button" className={`xa-btn${os === 'ios' ? ' on' : ''}`} onClick={() => install('ios')}>
            {IOS_ICON}
            <span><small>Installa su</small><b>iPhone</b></span>
            <i><Ic n="download" s={18} /></i>
          </button>
          <button type="button" className={`xa-btn${os === 'and' ? ' on' : ''}`} onClick={() => install('and')}>
            {AND_ICON}
            <span><small>Installa su</small><b>Android</b></span>
            <i><Ic n="download" s={18} /></i>
          </button>
        </div>
        {steps === 'ios' && (
          <section className="xa-card">
            <header><b>Su iPhone</b><em>Safari</em></header>
            <ol className="xa-steps">
              <li><i>1</i><span><b>Apri il sito con Safari</b><small>Lo stesso indirizzo che stai usando adesso.</small></span></li>
              <li><i>2</i><span><b>Tocca il pulsante Condividi</b><small>L'icona {SHARE_ICON} in basso al centro.</small></span></li>
              <li><i>3</i><span><b>Scegli "Aggiungi alla schermata Home"</b><small>Conferma e trovi Aurora tra le tue app.</small></span></li>
            </ol>
          </section>
        )}
        {steps === 'and' && (
          <section className="xa-card">
            <header><b>Su Android</b><em>Chrome</em></header>
            <ol className="xa-steps">
              <li><i>1</i><span><b>Apri il sito con Chrome</b><small>Lo stesso indirizzo che stai usando adesso.</small></span></li>
              <li><i>2</i><span><b>Tocca "Installa app" oppure il menu ⋮</b><small>Il menu è in alto a destra.</small></span></li>
              <li><i>3</i><span><b>Conferma con "Installa"</b><small>Aurora compare tra le tue app.</small></span></li>
            </ol>
          </section>
        )}
        <p className="xa-note"><Ic n="download" s={16} />Già installata? La trovi tra le app del telefono, con l'icona Aurora.</p>
      </div>
      {msg && <div className="n-xtoast"><img src={EMBLEM} alt="" />{msg}</div>}
    </div>
  );
};

/* ---------- Privacy e cookie all'apertura (stesso riquadro del messaggio "Inizia" del prototipo) ---------- */
const CONSENSO_KEY = 'aurora_consenso_privacy_v1';
const CONSENSO_GIORNI = 180; // si richiede di nuovo dopo 6 mesi

const consensoValido = () => {
  try {
    const c = JSON.parse(localStorage.getItem(CONSENSO_KEY) || 'null') as { date?: string } | null;
    if (!c?.date) return false;
    const giorni = (Date.now() - new Date(c.date).getTime()) / 86400000;
    return giorni >= 0 && giorni <= CONSENSO_GIORNI;
  } catch {
    return false;
  }
};

export const NuovaConsenso: React.FC<{ onOpenPrivacy: () => void; paused?: boolean }> = ({ onOpenPrivacy, paused }) => {
  const [open, setOpen] = useState(() => !consensoValido());
  if (!open || paused) return null;
  const scegli = (scelta: 'tutti' | 'necessari') => {
    try {
      localStorage.setItem(CONSENSO_KEY, JSON.stringify({ scelta, date: new Date().toISOString() }));
    } catch {
      /* il browser non salva: il riquadro ricompare alla prossima apertura */
    }
    vib(6);
    setOpen(false);
  };
  return (
    <div className="n-consenso" role="dialog" aria-modal="true" aria-label="Privacy e cookie">
      <div className="n-consenso-box">
        <h2>Privacy e cookie</h2>
        <p>
          Per far funzionare l'app usiamo solo cookie <b>tecnici necessari</b>: accesso, carrello, preferiti e preferenze.
        </p>
        <p>
          I dati che ci lasci (nome e cognome, numero di telefono, indirizzo) li usiamo solo per gestire ordini, consegne e
          assistenza, come spiegato nell'
          <button type="button" onClick={onOpenPrivacy}>Informativa privacy</button>.
        </p>
        <div className="n-consenso-btns">
          <button type="button" className="go" onClick={() => scegli('tutti')}>Accetta</button>
          <button type="button" className="gh" onClick={() => scegli('necessari')}>Solo necessari</button>
        </div>
      </div>
    </div>
  );
};
