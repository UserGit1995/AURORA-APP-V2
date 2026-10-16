import React, { useMemo, useRef, useState } from 'react';
import { adminListChats, ChatConversation } from '../../../services/chat';
import { Ic, Bi, vib } from '../../Icona';
import { CLIENTE_VUOTO, Cliente, nomeCliente, numeroWa, remove, save, soloCifre, useArchivio } from './store';
import { Count, F, Group, Sel, Sheet, iniziali } from './ui';

/* Portafoglio clienti: rubrica con salvataggio da chat, da WhatsApp (contatto condiviso) e dalla rubrica del telefono. */

const stessoNumero = (a: string, b: string) => {
  const x = soloCifre(a).slice(-9), y = soloCifre(b).slice(-9);
  return x.length >= 6 && x === y;
};

/** Legge uno o più contatti da un file .vcf (quello che WhatsApp crea con "Condividi contatto") */
export function leggiVcf(txt: string): Partial<Cliente>[] {
  const unfold = txt.replace(/\r\n[ \t]/g, '').replace(/\r/g, '');
  const out: Partial<Cliente>[] = [];
  for (const card of unfold.split(/BEGIN:VCARD/i).slice(1)) {
    const get = (k: string) => {
      const m = card.match(new RegExp(`^(?:item\\d+\\.)?${k}(?:;[^:\\n]*)?:(.*)$`, 'im'));
      return m ? m[1].trim().replace(/\\,/g, ',').replace(/\\;/g, ';') : '';
    };
    const qp = (s: string) => {
      if (!/=[0-9A-F]{2}/i.test(s)) return s;
      try {
        return decodeURIComponent(s.replace(/=\n/g, '').replace(/=([0-9A-F]{2})/gi, '%$1'));
      } catch {
        return s;
      }
    };
    const fn = qp(get('FN'));
    const n = qp(get('N')).split(';');
    const org = qp(get('ORG')).split(';')[0];
    const tels = [...card.matchAll(/^(?:item\d+\.)?TEL[^:\n]*:(.*)$/gim)].map((m) => m[1].trim());
    const waid = card.match(/waid=(\d+)/i)?.[1];
    const tel = waid ? '+' + waid : tels[0] || '';
    const email = get('EMAIL');
    const adr = qp(get('ADR')).split(';');
    const c: Partial<Cliente> = {
      ragioneSociale: org || fn || [n[1], n[0]].filter(Boolean).join(' '),
      nome: n[1] || '',
      cognome: n[0] || '',
      tipoSoggetto: org ? 'azienda' : 'privato',
      telefono: tel,
      email,
      indirizzo: adr[2] || '',
      comune: adr[3] || '',
      provincia: (adr[4] || '').slice(0, 2).toUpperCase(),
      cap: adr[5] || '',
    };
    if (c.ragioneSociale || c.telefono) out.push(c);
  }
  return out;
}

export const ClientiView: React.FC<{ toast: (t: string) => void; nuovoDaChat?: { name: string; phone: string } | null }> = ({ toast }) => {
  const { rows, ready, error } = useArchivio('cliente');
  const [q, setQ] = useState('');
  const [f, setF] = useState<'Tutti' | 'Aziende' | 'Privati'>('Tutti');
  const [edit, setEdit] = useState<Partial<Cliente> | null>(null);
  const [chats, setChats] = useState<ChatConversation[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasContacts = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    let l = s ? rows.filter((c) => [nomeCliente(c), c.piva, c.cf, c.comune, c.telefono, c.email].some((x) => (x || '').toLowerCase().includes(s))) : rows;
    if (f === 'Aziende') l = l.filter((c) => c.tipoSoggetto !== 'privato');
    if (f === 'Privati') l = l.filter((c) => c.tipoSoggetto === 'privato');
    return l;
  }, [rows, q, f]);

  const giaPresente = (tel: string) => !!tel && rows.find((c) => stessoNumero(c.telefono, tel));

  const importa = async (items: Partial<Cliente>[], fonte: Cliente['fonte']) => {
    let n = 0, doppi = 0;
    for (const it of items) {
      if (it.telefono && giaPresente(it.telefono)) {
        doppi++;
        continue;
      }
      try {
        await save('cliente', { ...CLIENTE_VUOTO, ...it, fonte });
        n++;
      } catch (e) {
        toast((e as Error).message);
        return;
      }
    }
    vib(10);
    toast(n ? `${n === 1 ? '1 cliente salvato' : `${n} clienti salvati`}${doppi ? `, ${doppi} già in rubrica` : ''}` : 'Già in rubrica');
  };

  const daVcf = async (file: File) => {
    const items = leggiVcf(await file.text());
    if (!items.length) return toast('Nel file non ho trovato contatti');
    if (items.length === 1 && !giaPresente(items[0].telefono || '')) setEdit({ ...CLIENTE_VUOTO, ...items[0], fonte: 'whatsapp' });
    else importa(items, 'whatsapp');
  };

  const daRubrica = async () => {
    try {
      const sel = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true });
      const items: Partial<Cliente>[] = (sel || []).map((c: any) => ({
        ragioneSociale: c.name?.[0] || '',
        tipoSoggetto: 'privato',
        nome: c.name?.[0] || '',
        telefono: c.tel?.[0] || '',
        email: c.email?.[0] || '',
      }));
      if (items.length === 1) setEdit({ ...CLIENTE_VUOTO, ...items[0], fonte: 'rubrica' });
      else if (items.length) importa(items, 'rubrica');
    } catch {
      /* annullato */
    }
  };

  const apriChat = async () => {
    setChats([]);
    try {
      setChats(await adminListChats());
    } catch (e) {
      toast((e as Error).message);
      setChats(null);
    }
  };

  return (
    <>
      <div className="a-kpis a-kpis3">
        <div className="a-card a-kpi"><Bi n="seal" s={30} /><p className="a-v"><Count v={rows.length} /></p><p>Clienti in rubrica</p></div>
        <div className="a-card a-kpi"><Bi n="whats" s={30} /><p className="a-v"><Count v={rows.filter((c) => c.fonte === 'whatsapp' || c.fonte === 'chat').length} /></p><p>Arrivati da chat e WhatsApp</p></div>
        <div className="a-card a-kpi"><Bi n="invoice" s={30} /><p className="a-v"><Count v={rows.filter((c) => c.piva || c.cf).length} /></p><p>Con dati per fattura</p></div>
      </div>
      <div className="a-tool">
        <label className="a-fin">
          <Ic n="search" s={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome, P.IVA, città o telefono" />
        </label>
        <div className="a-seg2">
          {(['Tutti', 'Aziende', 'Privati'] as const).map((x) => (
            <button key={x} type="button" className={f === x ? 'a-on' : ''} onClick={() => { setF(x); vib(5); }}>{x}</button>
          ))}
        </div>
        <button type="button" className="a-btn a-prim a-sm" onClick={() => setEdit({ ...CLIENTE_VUOTO })}><Ic n="plus" s={15} /> Nuovo</button>
      </div>
      <div className="a-imp">
        <button type="button" className="a-card" onClick={() => fileRef.current?.click()}>
          <Ic n="whats" s={22} />
          <span><b>Da WhatsApp</b><small>Condividi il contatto da WhatsApp e scegli il file</small></span>
        </button>
        <button type="button" className="a-card" onClick={apriChat}>
          <Ic n="chat" s={22} />
          <span><b>Dalla chat dell'app</b><small>Salva chi ti ha scritto</small></span>
        </button>
        {hasContacts && (
          <button type="button" className="a-card" onClick={daRubrica}>
            <Ic n="user" s={22} />
            <span><b>Dalla rubrica</b><small>Scegli dai contatti del telefono</small></span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".vcf,text/vcard,text/x-vcard"
          hidden
          onChange={(e) => {
            const fl = e.target.files?.[0];
            if (fl) daVcf(fl);
            e.target.value = '';
          }}
        />
      </div>
      {error && <div className="a-card a-warn"><Ic n="shield" s={18} />{error}</div>}
      <div className="a-card a-list">
        <div className="a-ch"><h2>{list.length === 1 ? '1 cliente' : `${list.length.toLocaleString('it-IT')} clienti`}</h2></div>
        {!ready && <div className="a-empty">Caricamento…</div>}
        {ready && list.length === 0 && <div className="a-empty">{rows.length ? 'Nessun cliente trovato.' : 'La rubrica è vuota: aggiungi il primo cliente.'}</div>}
        {list.map((c, i) => (
          <div key={c.id} className="a-row a-crow" style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }} role="button" tabIndex={0} onClick={() => setEdit(c)} onKeyDown={(e) => e.key === 'Enter' && setEdit(c)}>
            <span className="a-oav">{iniziali(nomeCliente(c))}</span>
            <span className="a-tx">
              <b>{nomeCliente(c)}</b>
              <small>{[c.comune, c.telefono, c.piva && `P.IVA ${c.piva}`].filter(Boolean).join(' · ') || 'Dati da completare'}</small>
            </span>
            {c.fonte !== 'manuale' && <span className="a-src">{c.fonte === 'chat' ? 'Chat' : c.fonte === 'whatsapp' ? 'WhatsApp' : 'Rubrica'}</span>}
            {c.telefono && (
              <a className="a-ib a-sib a-wa" href={`https://wa.me/${numeroWa(c.telefono)}`} target="_blank" rel="noreferrer" title="Scrivi su WhatsApp" aria-label="Scrivi su WhatsApp" onClick={(e) => e.stopPropagation()}>
                <Ic n="whats" s={17} />
              </a>
            )}
          </div>
        ))}
      </div>

      {chats && (
        <Sheet title="Salva dalla chat" onClose={() => setChats(null)}>
          {chats.length === 0 && <div className="a-empty">Nessuna conversazione.</div>}
          {chats.map((c) => {
            const in_ = giaPresente(c.phone);
            return (
              <button
                key={c.id}
                type="button"
                className="a-row"
                disabled={!!in_}
                onClick={() => {
                  setChats(null);
                  setEdit({ ...CLIENTE_VUOTO, ragioneSociale: c.name, telefono: c.phone, fonte: 'chat' });
                }}
              >
                <span className="a-oav">{iniziali(c.name)}</span>
                <span className="a-tx"><b>{c.name}</b><small>{c.phone}</small></span>
                {in_ ? <span className="a-src">In rubrica</span> : <Ic n="plus" s={16} />}
              </button>
            );
          })}
        </Sheet>
      )}

      {edit && <ClienteSheet c={edit} onClose={() => setEdit(null)} toast={toast} />}
    </>
  );
};

export const ClienteSheet: React.FC<{ c: Partial<Cliente>; onClose: () => void; toast: (t: string) => void; onSaved?: (c: Cliente) => void }> = ({
  c: start, onClose, toast, onSaved,
}) => {
  const [c, setC] = useState<Partial<Cliente>>({ ...CLIENTE_VUOTO, ...start });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Cliente) => (v: string) => setC((x) => ({ ...x, [k]: v }));
  const az = c.tipoSoggetto !== 'privato';

  const salva = async () => {
    if (!nomeCliente(c as Cliente).trim()) return toast(az ? 'Scrivi la ragione sociale' : 'Scrivi nome e cognome');
    setBusy(true);
    try {
      const r = await save('cliente', c as Cliente);
      vib(10);
      toast(start.id ? 'Cliente aggiornato' : 'Cliente salvato in rubrica');
      onSaved?.(r);
      onClose();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const elimina = async () => {
    if (!start.id || !window.confirm(`Eliminare ${nomeCliente(c as Cliente)} dalla rubrica? DDT e fatture già fatti restano.`)) return;
    try {
      await remove('cliente', start.id);
      toast('Cliente eliminato');
      onClose();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <Sheet
      title={start.id ? 'Scheda cliente' : 'Nuovo cliente'}
      onClose={onClose}
      footer={
        <>
          {start.id ? <button type="button" className="a-btn a-gh a-del" onClick={elimina} aria-label="Elimina"><Ic n="x" s={16} /></button> : null}
          <button type="button" className="a-btn a-gh" onClick={onClose}>Annulla</button>
          <button type="button" className="a-btn a-prim" disabled={busy} onClick={salva}>{busy ? 'Salvo…' : 'Salva cliente'}</button>
        </>
      }
    >
      {c.telefono ? (
        <div className="a-qbtns">
          <a className="a-btn a-gh a-sm" href={`https://wa.me/${numeroWa(c.telefono)}`} target="_blank" rel="noreferrer"><Ic n="whats" s={15} /> WhatsApp</a>
          <a className="a-btn a-gh a-sm" href={`tel:${soloCifre(c.telefono)}`}><Ic n="phone" s={15} /> Chiama</a>
          {c.email ? <a className="a-btn a-gh a-sm" href={`mailto:${c.email}`}><Ic n="arrow" s={15} /> Email</a> : null}
        </div>
      ) : null}
      <div className="a-seg2 a-segfull">
        <button type="button" className={az ? 'a-on' : ''} onClick={() => setC((x) => ({ ...x, tipoSoggetto: 'azienda' }))}>Azienda</button>
        <button type="button" className={!az ? 'a-on' : ''} onClick={() => setC((x) => ({ ...x, tipoSoggetto: 'privato' }))}>Privato</button>
      </div>
      <Group title="Anagrafica">
        {az ? <F label="Ragione sociale" value={c.ragioneSociale || ''} onChange={set('ragioneSociale')} /> : null}
        <div className="a-two">
          <F label={az ? 'Referente: nome' : 'Nome'} value={c.nome || ''} onChange={set('nome')} />
          <F label={az ? 'Referente: cognome' : 'Cognome'} value={c.cognome || ''} onChange={set('cognome')} />
        </div>
        <div className="a-two">
          <F label="Telefono / WhatsApp" value={c.telefono || ''} onChange={set('telefono')} type="tel" inputMode="tel" />
          <F label="Email" value={c.email || ''} onChange={set('email')} type="email" />
        </div>
      </Group>
      <Group title="Dati per la fattura">
        <div className="a-two">
          <F label="Partita IVA" value={c.piva || ''} onChange={set('piva')} inputMode="numeric" />
          <F label="Codice fiscale" value={c.cf || ''} onChange={set('cf')} upper />
        </div>
        <div className="a-two">
          <F label="Codice destinatario SDI" value={c.sdi || ''} onChange={set('sdi')} upper placeholder={az ? '7 caratteri' : '0000000'} />
          <F label="PEC" value={c.pec || ''} onChange={set('pec')} type="email" />
        </div>
      </Group>
      <Group title="Indirizzo">
        <div className="a-two a-two-wide">
          <F label="Via / Piazza" value={c.indirizzo || ''} onChange={set('indirizzo')} />
          <F label="Civico" value={c.civico || ''} onChange={set('civico')} />
        </div>
        <div className="a-three">
          <F label="CAP" value={c.cap || ''} onChange={set('cap')} inputMode="numeric" />
          <F label="Comune" value={c.comune || ''} onChange={set('comune')} />
          <F label="Prov." value={c.provincia || ''} onChange={(v) => set('provincia')(v.toUpperCase().slice(0, 2))} />
        </div>
        <Sel label="Nazione" value={c.nazione || 'IT'} onChange={set('nazione')} options={[['IT', 'Italia'], ['SM', 'San Marino'], ['VA', 'Città del Vaticano'], ['DE', 'Germania'], ['FR', 'Francia'], ['ES', 'Spagna'], ['CH', 'Svizzera']]} />
      </Group>
      <Group title="Note">
        <label className="a-fld"><textarea rows={3} value={c.note || ''} onChange={(e) => set('note')(e.target.value)} placeholder="Orari di consegna, preferenze, accordi…" /></label>
      </Group>
    </Sheet>
  );
};
