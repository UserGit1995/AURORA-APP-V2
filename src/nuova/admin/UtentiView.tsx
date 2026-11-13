import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ic, Bi, vib } from '../Icona';
import {
  Benefit,
  RegisteredUser,
  addBenefit,
  adminListUsers,
  benefitActive,
  benefitLabel,
  deleteBenefit,
  eur,
  listBenefits,
} from '../../services/users';
import { CLIENTE_VUOTO, Cliente, numeroWa, soloCifre, useArchivio } from './gestione/store';
import { ClienteSheet } from './gestione/Clienti';
import { Count, F, Group, Sel, Sheet, Toggle, iniziali } from './gestione/ui';

/* Utenti registrati nell'app: chi sono, quando si sono registrati, ordini fatti.
   Da qui si aggiungono al portafoglio clienti e si assegnano bonus acquisto e sconti personali. */

const GIORNO = 24 * 3600 * 1000;
const isNuovo = (u: RegisteredUser) => Date.now() - new Date(u.registeredAt).getTime() < 7 * GIORNO;
const dataOra = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' alle')
    : '—';
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
const nomeUtente = (u: RegisteredUser) => u.company || u.name || u.email.split('@')[0];
const stessaEmail = (a: string, b: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
const stessoTel = (a: string, b: string) => {
  const x = soloCifre(a).slice(-9), y = soloCifre(b).slice(-9);
  return x.length >= 6 && x === y;
};

export const UtentiView: React.FC<{ toast: (t: string) => void }> = ({ toast }) => {
  const [users, setUsers] = useState<RegisteredUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [q, setQ] = useState('');
  const [f, setF] = useState<'Tutti' | 'Nuovi' | 'Attività' | 'Privati' | 'Con bonus'>('Tutti');
  const [open, setOpen] = useState<RegisteredUser | null>(null);
  const { rows: portafoglio } = useArchivio('cliente');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [u, b] = await Promise.all([adminListUsers(), listBenefits().catch(() => [] as Benefit[])]);
      setUsers(u.filter((x) => !x.isAdmin));
      setBenefits(b);
    } catch (e) {
      setError((e as Error).message);
      setUsers([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const attivi = useMemo(() => {
    const m = new Map<string, Benefit[]>();
    benefits.filter((b) => benefitActive(b)).forEach((b) => m.set(b.userId, [...(m.get(b.userId) || []), b]));
    return m;
  }, [benefits]);

  const inPortafoglio = useCallback(
    (u: RegisteredUser): Cliente | undefined =>
      portafoglio.find((c) => stessaEmail(c.email, u.email) || (!!u.phone && stessoTel(c.telefono, u.phone))),
    [portafoglio]
  );

  const list = useMemo(() => {
    let l = users || [];
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((u) => [u.name, u.company, u.email, u.phone, u.city, u.piva].some((x) => (x || '').toLowerCase().includes(s)));
    if (f === 'Nuovi') l = l.filter(isNuovo);
    if (f === 'Attività') l = l.filter((u) => u.customerType === 'attivita');
    if (f === 'Privati') l = l.filter((u) => u.customerType !== 'attivita');
    if (f === 'Con bonus') l = l.filter((u) => attivi.has(u.id));
    return l;
  }, [users, q, f, attivi]);

  const all = users || [];
  return (
    <>
      <div className="a-kpis a-kpis3">
        <div className="a-card a-kpi"><Bi n="seal" s={30} /><p className="a-v"><Count v={all.length} /></p><p>Utenti registrati</p></div>
        <div className="a-card a-kpi"><Bi n="clock" s={30} /><p className="a-v"><Count v={all.filter(isNuovo).length} /></p><p>Nuovi negli ultimi 7 giorni</p></div>
        <div className="a-card a-kpi"><Bi n="invoice" s={30} /><p className="a-v"><Count v={all.filter((u) => u.ordersCount > 0).length} /></p><p>Hanno già ordinato</p></div>
      </div>
      <div className="a-tool">
        <label className="a-fin">
          <Ic n="search" s={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome, email, telefono o città" />
        </label>
        <div className="a-seg2">
          {(['Tutti', 'Nuovi', 'Attività', 'Privati', 'Con bonus'] as const).map((x) => (
            <button key={x} type="button" className={f === x ? 'a-on' : ''} onClick={() => { setF(x); vib(5); }}>{x}</button>
          ))}
        </div>
        <button type="button" className="a-btn a-gh a-sm" onClick={() => { setUsers(null); load(); }}><Ic n="repeat" s={15} /> Aggiorna</button>
      </div>
      {error && <div className="a-card a-warn"><Ic n="shield" s={18} />{error}</div>}
      <div className="a-card a-list">
        <div className="a-ch"><h2>{list.length === 1 ? '1 utente' : `${list.length.toLocaleString('it-IT')} utenti`}</h2></div>
        {!users && <div className="a-empty">Caricamento…</div>}
        {users && list.length === 0 && !error && <div className="a-empty">{all.length ? 'Nessun utente trovato.' : 'Nessuno si è ancora registrato.'}</div>}
        {list.map((u, i) => {
          const b = attivi.get(u.id);
          return (
            <div
              key={u.id}
              className="a-row a-crow"
              style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }}
              role="button"
              tabIndex={0}
              onClick={() => setOpen(u)}
              onKeyDown={(e) => e.key === 'Enter' && setOpen(u)}
            >
              <span className="a-oav">{iniziali(nomeUtente(u))}</span>
              <span className="a-tx">
                <b>{nomeUtente(u)}</b>
                <small>
                  {[`Registrato il ${dataOra(u.registeredAt)}`, u.city, u.ordersCount ? `${u.ordersCount} ${u.ordersCount === 1 ? 'ordine' : 'ordini'}` : 'nessun ordine'].filter(Boolean).join(' · ')}
                </small>
              </span>
              {isNuovo(u) && <span className="a-pill a-p-new"><i />Nuovo</span>}
              {b && <span className="a-pill a-p-ship" title={b.map(benefitLabel).join(', ')}><i />{b.length === 1 ? (b[0].kind === 'bonus' ? 'Bonus' : 'Sconto') : `${b.length} vantaggi`}</span>}
              {inPortafoglio(u) && <span className="a-src">Portafoglio</span>}
              {u.phone && (
                <a className="a-ib a-sib a-wa" href={`https://wa.me/${numeroWa(u.phone)}`} target="_blank" rel="noreferrer" title="Scrivi su WhatsApp" aria-label="Scrivi su WhatsApp" onClick={(e) => e.stopPropagation()}>
                  <Ic n="whats" s={17} />
                </a>
              )}
            </div>
          );
        })}
      </div>
      <p className="a-note">Qui compare chiunque crei un account nell'app. Chi ordina senza registrarsi lo trovi solo in Ordini.</p>

      {open && (
        <UtenteSheet
          u={open}
          toast={toast}
          cliente={inPortafoglio(open)}
          benefits={benefits.filter((b) => b.userId === open.id)}
          onBenefits={(next) => setBenefits((prev) => [...prev.filter((b) => b.userId !== open.id), ...next])}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
};

const UtenteSheet: React.FC<{
  u: RegisteredUser;
  cliente?: Cliente;
  benefits: Benefit[];
  onBenefits: (b: Benefit[]) => void;
  toast: (t: string) => void;
  onClose: () => void;
}> = ({ u, cliente, benefits, onBenefits, toast, onClose }) => {
  const [scheda, setScheda] = useState<Partial<Cliente> | null>(null);
  const [kind, setKind] = useState<'bonus' | 'sconto'>('bonus');
  const [value, setValue] = useState('');
  const [once, setOnce] = useState(true);
  const [scad, setScad] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [ultimo, setUltimo] = useState<Benefit | null>(null);

  const nome = nomeUtente(u);
  const attivi = benefits.filter((b) => benefitActive(b));
  const vecchi = benefits.filter((b) => !benefitActive(b));

  const nuovoCliente = (): Partial<Cliente> => {
    const parti = u.name.trim().split(/\s+/);
    return {
      ...CLIENTE_VUOTO,
      tipoSoggetto: u.customerType === 'attivita' ? 'azienda' : 'privato',
      ragioneSociale: u.company || u.name,
      nome: parti[0] || '',
      cognome: parti.slice(1).join(' '),
      telefono: u.phone,
      email: u.email,
      piva: u.piva,
      indirizzo: u.address,
      comune: u.city,
      cap: u.postalCode,
      provincia: u.province,
      note: `Registrato nell'app il ${data(u.registeredAt)}`,
      fonte: 'app',
    };
  };

  const messaggio = (b: Benefit) => {
    const saluto = u.name ? `Ciao ${u.name.split(' ')[0]}` : 'Ciao';
    const cosa = b.kind === 'bonus' ? `un bonus acquisto di ${eur(b.amount)}` : `uno sconto del ${String(b.percent).replace('.', ',')}%${b.once ? ' sul tuo prossimo ordine' : ' sui tuoi ordini'}`;
    const fino = b.expiresAt ? `, valido fino al ${data(b.expiresAt)}` : '';
    return `${saluto}! Ti abbiamo riservato ${cosa}${fino}. Lo trovi già applicato nel carrello dell'app Aurora quando entri con il tuo account: https://appaurorav2updated.vercel.app`;
  };

  const assegna = async () => {
    const v = Number(value.replace(',', '.'));
    if (!(v > 0)) return toast(kind === 'bonus' ? "Scrivi l'importo del bonus" : 'Scrivi la percentuale di sconto');
    if (kind === 'sconto' && v > 90) return toast('Lo sconto massimo è 90%');
    setBusy(true);
    try {
      const b = await addBenefit({
        userId: u.id,
        kind,
        value: v,
        once,
        note,
        expiresAt: scad ? new Date(scad + 'T23:59:59').toISOString() : null,
      });
      onBenefits([b, ...benefits]);
      setUltimo(b);
      setValue('');
      setNote('');
      setScad('');
      vib(10);
      toast(`${benefitLabel(b)} assegnato a ${nome}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const togli = async (b: Benefit) => {
    if (!window.confirm(`Togliere "${benefitLabel(b)}" a ${nome}?`)) return;
    try {
      await deleteBenefit(b.id);
      onBenefits(benefits.filter((x) => x.id !== b.id));
      if (ultimo?.id === b.id) setUltimo(null);
      toast('Tolto');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const riga = (label: string, v: React.ReactNode) => (
    <div className="a-row" style={{ borderTop: 0, padding: '6px 18px', alignItems: 'baseline', gap: 12 }}>
      <span style={{ flex: '0 0 128px', color: 'var(--mu)', fontSize: 12.5 }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflowWrap: 'anywhere' }}>{v || '—'}</span>
    </div>
  );

  return (
    <>
      <Sheet title={nome} onClose={onClose}>
        <div className="a-qbtns">
          {u.phone ? <a className="a-btn a-gh a-sm" href={`https://wa.me/${numeroWa(u.phone)}`} target="_blank" rel="noreferrer"><Ic n="whats" s={15} /> WhatsApp</a> : null}
          {u.phone ? <a className="a-btn a-gh a-sm" href={`tel:${soloCifre(u.phone)}`}><Ic n="phone" s={15} /> Chiama</a> : null}
          <a className="a-btn a-gh a-sm" href={`mailto:${u.email}`}><Ic n="arrow" s={15} /> Email</a>
        </div>

        <Group title="Dati dell'utente">
          {riga('Registrato il', dataOra(u.registeredAt))}
          {riga('Ultimo accesso', dataOra(u.lastSignInAt))}
          {riga('Email', <>{u.email}{u.confirmed ? '' : ' (non confermata)'}</>)}
          {riga('Telefono', u.phone)}
          {riga('Tipo', u.customerType === 'attivita' ? 'Attività / Azienda' : u.customerType === 'privato' ? 'Privato' : '')}
          {u.customerType === 'attivita' && riga('Ragione sociale', u.company)}
          {u.piva && riga('P.IVA / C.F.', u.piva)}
          {riga('Indirizzo', [u.address, [u.postalCode, u.city, u.province && `(${u.province})`].filter(Boolean).join(' ')].filter(Boolean).join(', '))}
          {riga('Ordini', u.ordersCount ? `${u.ordersCount} per ${eur(u.ordersTotal)} · ultimo il ${data(u.lastOrderAt)}` : 'Nessun ordine')}
          {!u.name && !u.phone && (
            <p className="a-note" style={{ margin: '4px 18px 12px' }}>
              Registrato prima di questo aggiornamento: nome e telefono compariranno appena riapre l'app o fa un ordine.
            </p>
          )}
        </Group>

        <Group title="Portafoglio clienti">
          {cliente ? (
            <div className="a-optrow">
              <span>È già nel portafoglio<small>Salvato come {cliente.ragioneSociale || [cliente.nome, cliente.cognome].join(' ')}</small></span>
              <button type="button" className="a-btn a-gh a-sm" onClick={() => setScheda(cliente)}>Apri scheda</button>
            </div>
          ) : (
            <div className="a-optrow">
              <span>Non è nel portafoglio<small>Lo salvi con i dati che ha inserito nell'app</small></span>
              <button type="button" className="a-btn a-prim a-sm" onClick={() => setScheda(nuovoCliente())}><Ic n="plus" s={15} /> Aggiungi</button>
            </div>
          )}
        </Group>

        <Group title="Bonus e sconti">
          {attivi.length === 0 && <p className="a-note" style={{ margin: '0 18px 10px' }}>Nessun bonus o sconto attivo.</p>}
          {attivi.map((b) => (
            <div key={b.id} className="a-row" style={{ borderTop: 0 }}>
              <span className="a-pill a-p-ship"><i />{b.kind === 'bonus' ? 'Bonus' : 'Sconto'}</span>
              <span className="a-tx">
                <b>{benefitLabel(b)}</b>
                <small>{[b.expiresAt ? `fino al ${data(b.expiresAt)}` : 'senza scadenza', b.note, `dal ${data(b.createdAt)}`].filter(Boolean).join(' · ')}</small>
              </span>
              {u.phone && (
                <a className="a-ib a-sib a-wa" href={`https://wa.me/${numeroWa(u.phone)}?text=${encodeURIComponent(messaggio(b))}`} target="_blank" rel="noreferrer" title="Avvisa su WhatsApp" aria-label="Avvisa su WhatsApp">
                  <Ic n="whats" s={17} />
                </a>
              )}
              <button type="button" className="a-ib a-sib" title="Togli" aria-label="Togli" onClick={() => togli(b)}><Ic n="x" s={16} /></button>
            </div>
          ))}

          <div className="a-seg2 a-segfull" style={{ margin: '6px 18px 4px' }}>
            <button type="button" className={kind === 'bonus' ? 'a-on' : ''} onClick={() => setKind('bonus')}>Bonus acquisto €</button>
            <button type="button" className={kind === 'sconto' ? 'a-on' : ''} onClick={() => setKind('sconto')}>Sconto %</button>
          </div>
          <div className="a-two">
            <F
              label={kind === 'bonus' ? 'Importo del bonus (€)' : 'Sconto (%)'}
              value={value}
              onChange={(v) => setValue(v.replace(/[^\d.,]/g, ''))}
              inputMode="decimal"
              placeholder={kind === 'bonus' ? 'es. 5' : 'es. 10'}
            />
            <F label="Valido fino al (facoltativo)" value={scad} onChange={setScad} type="date" />
          </div>
          {kind === 'sconto' && (
            <Toggle label="Solo sul prossimo ordine" sub={once ? "Dopo il primo ordine non vale più" : 'Vale su tutti gli ordini fino alla scadenza'} on={once} onChange={setOnce} />
          )}
          <F label="Nota per te (facoltativa)" value={note} onChange={setNote} placeholder="es. Benvenuto, cliente fedele…" />
          <div style={{ padding: '4px 18px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="a-btn a-prim" disabled={busy} onClick={assegna}>{busy ? 'Salvo…' : kind === 'bonus' ? 'Assegna bonus' : 'Assegna sconto'}</button>
            {ultimo && u.phone && (
              <a className="a-btn a-gh" href={`https://wa.me/${numeroWa(u.phone)}?text=${encodeURIComponent(messaggio(ultimo))}`} target="_blank" rel="noreferrer">
                <Ic n="whats" s={15} /> Avvisalo su WhatsApp
              </a>
            )}
            {ultimo && (
              <a className="a-btn a-gh" href={`mailto:${u.email}?subject=${encodeURIComponent('Un regalo per te da Aurora')}&body=${encodeURIComponent(messaggio(ultimo))}`}>
                <Ic n="arrow" s={15} /> Avvisalo per email
              </a>
            )}
          </div>
          <p className="a-note" style={{ margin: '0 18px 12px' }}>
            Il cliente lo trova già applicato nel carrello quando entra con il suo account. Il bonus si usa una volta sola e non supera il totale dei prodotti; l'ordine minimo si calcola sui prodotti prima dello sconto.
          </p>

          {vecchi.length > 0 && (
            <>
              <p className="a-note" style={{ margin: '4px 18px 6px' }}>Usati o scaduti</p>
              {vecchi.map((b) => (
                <div key={b.id} className="a-row" style={{ borderTop: 0, opacity: 0.6 }}>
                  <span className="a-tx">
                    <b>{benefitLabel(b)}</b>
                    <small>{b.usedAt ? `usato il ${data(b.usedAt)}${b.usedOrder ? ` (ordine ${b.usedOrder})` : ''}` : `scaduto il ${data(b.expiresAt)}`}</small>
                  </span>
                  <button type="button" className="a-ib a-sib" title="Elimina" aria-label="Elimina" onClick={() => togli(b)}><Ic n="x" s={16} /></button>
                </div>
              ))}
            </>
          )}
        </Group>
      </Sheet>
      {scheda && <ClienteSheet c={scheda} toast={toast} onClose={() => setScheda(null)} />}
    </>
  );
};
