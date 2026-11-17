import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ic, Bi, vib } from '../Icona';
import { Count } from './gestione/ui';
import { getSupabase } from '../../services/supabase';
import { segnaNonContare } from '../../utils/trackVisit';

/* Visite al sito: quante persone entrano, da dove (paese, regione, città) e con quale IP.
   La posizione viene dall'indirizzo IP: è la zona del gestore internet, non l'indirizzo di casa. */

type Visita = {
  id: number;
  created_at: string;
  visitatore: string | null;
  ip: string | null;
  paese: string | null;
  regione: string | null;
  provincia: string | null;
  citta: string | null;
  cap: string | null;
  pagina: string | null;
  provenienza: string | null;
  dispositivo: string | null;
  browser: string | null;
  sistema: string | null;
};

const GIORNO = 24 * 3600 * 1000;
const PERIODI = { Oggi: 0, '7 giorni': 7, '30 giorni': 30, '12 mesi': 365 } as const;
type Periodo = keyof typeof PERIODI;

const inizioOggi = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const daQuando = (p: Periodo) => (p === 'Oggi' ? inizioOggi() : Date.now() - PERIODI[p] * GIORNO);
const dataOra = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' alle');
const sito = (u: string | null) => {
  if (!u) return 'Accesso diretto';
  try {
    return new URL(u).host.replace(/^www\./, '');
  } catch {
    return u;
  }
};

function classifica(list: Visita[], key: (v: Visita) => string, n = 10) {
  const m = new Map<string, number>();
  list.forEach((v) => {
    const k = key(v) || 'Sconosciuto';
    m.set(k, (m.get(k) || 0) + 1);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

const Classifica: React.FC<{ titolo: string; righe: [string, number][]; tot: number }> = ({ titolo, righe, tot }) => (
  <div className="a-card a-list">
    <div className="a-ch"><h2>{titolo}</h2></div>
    {righe.length === 0 && <div className="a-empty">Nessun dato.</div>}
    {righe.map(([k, n]) => (
      <div key={k} className="a-row">
        <span className="a-tx">
          <b>{k}</b>
          <span className="a-bar"><i style={{ width: `${Math.max(3, (n / Math.max(1, tot)) * 100)}%` }} /></span>
        </span>
        <span style={{ font: '600 14px var(--display)' }}>{n.toLocaleString('it-IT')}</span>
      </div>
    ))}
  </div>
);

const Barre: React.FC<{ giorni: { g: string; n: number }[] }> = ({ giorni }) => {
  const W = 600, H = 170, pad = 22;
  const max = Math.max(1, ...giorni.map((x) => x.n));
  const bw = (W - pad * 2) / giorni.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 170, display: 'block' }} aria-label="Visite degli ultimi 30 giorni">
      {giorni.map((x, i) => {
        const h = (x.n / max) * (H - pad * 2);
        return (
          <g key={x.g}>
            <rect x={pad + i * bw + 2} y={H - pad - h} width={Math.max(2, bw - 4)} height={h} rx="3" fill="#4cb8ef" opacity={i === giorni.length - 1 ? 1 : 0.65}>
              <title>{`${x.g}: ${x.n} visite`}</title>
            </rect>
            {(i % 5 === 0 || i === giorni.length - 1) && (
              <text x={pad + i * bw + bw / 2} y={H - 6} fill="#7f94ab" fontSize="10" textAnchor="middle" fontFamily="Sora">{x.g}</text>
            )}
          </g>
        );
      })}
      <text x="0" y={pad} fill="#7f94ab" fontSize="10" fontFamily="Sora">{max}</text>
    </svg>
  );
};

export const VisiteView: React.FC<{ toast: (t: string) => void }> = ({ toast }) => {
  const [rows, setRows] = useState<Visita[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [per, setPer] = useState<Periodo>('30 giorni');
  const [q, setQ] = useState('');
  const [quante, setQuante] = useState(100);

  // chi apre questo pannello è l'amministratore: le sue visite non si contano
  useEffect(() => {
    segnaNonContare();
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const sb = getSupabase();
    if (!sb) {
      setError('Database non disponibile.');
      setRows([]);
      return;
    }
    const since = new Date(Date.now() - 365 * GIORNO).toISOString();
    const out: Visita[] = [];
    for (let from = 0; from < 50000; from += 1000) {
      const { data, error: e } = await sb
        .from('visite')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .range(from, from + 999);
      if (e) {
        if (/visite|schema cache|does not exist|could not find/i.test(e.message)) setError('Manca la tabella delle visite: esegui lo script VISITE_SITO.sql su Supabase.');
        else if (/permission|42501/i.test(e.message)) setError('Devi essere entrato come amministratore.');
        else setError('Visite non disponibili: ' + e.message);
        break;
      }
      out.push(...((data as Visita[]) || []));
      if (!data || data.length < 1000) break;
    }
    setRows(out);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const all = rows || [];
  const nel = useMemo(() => {
    const t = daQuando(per);
    return all.filter((v) => new Date(v.created_at).getTime() >= t);
  }, [all, per]);

  const unici = (l: Visita[]) => new Set(l.map((v) => v.visitatore || v.ip || String(v.id))).size;
  const oggi = all.filter((v) => new Date(v.created_at).getTime() >= inizioOggi());
  const sette = all.filter((v) => new Date(v.created_at).getTime() >= Date.now() - 7 * GIORNO);
  const trenta = all.filter((v) => new Date(v.created_at).getTime() >= Date.now() - 30 * GIORNO);

  const giorni = useMemo(() => {
    const out: { g: string; n: number; t: number }[] = [];
    const t0 = inizioOggi();
    for (let i = 29; i >= 0; i--) {
      const t = t0 - i * GIORNO;
      out.push({ g: new Date(t).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }), n: 0, t });
    }
    all.forEach((v) => {
      const t = new Date(v.created_at).getTime();
      const i = Math.floor((t - (t0 - 29 * GIORNO)) / GIORNO);
      if (i >= 0 && i < 30) out[i].n++;
    });
    return out;
  }, [all]);

  const elenco = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return nel;
    return nel.filter((v) => [v.ip, v.citta, v.regione, v.paese, v.provincia, v.dispositivo, v.browser, sito(v.provenienza)].some((x) => (x || '').toLowerCase().includes(s)));
  }, [nel, q]);

  const esporta = () => {
    const head = ['Data e ora', 'IP', 'Paese', 'Regione', 'Provincia', 'Città', 'CAP', 'Pagina', 'Provenienza', 'Dispositivo', 'Sistema', 'Browser'];
    const cell = (x: unknown) => `"${String(x ?? '').replace(/"/g, '""')}"`;
    const lines = [head.join(';'), ...elenco.map((v) => [dataOra(v.created_at), v.ip, v.paese, v.regione, v.provincia, v.citta, v.cap, v.pagina, sito(v.provenienza), v.dispositivo, v.sistema, v.browser].map(cell).join(';'))];
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `visite-${per.replace(' ', '-')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Elenco visite scaricato');
  };

  return (
    <>
      <div className="a-kpis">
        <div className="a-card a-kpi"><Bi n="clock" s={30} /><p className="a-v"><Count v={oggi.length} /></p><p>Visite oggi</p></div>
        <div className="a-card a-kpi"><Bi n="route" s={30} /><p className="a-v"><Count v={sette.length} /></p><p>Visite ultimi 7 giorni</p></div>
        <div className="a-card a-kpi"><Bi n="catalog" s={30} /><p className="a-v"><Count v={trenta.length} /></p><p>Visite ultimi 30 giorni</p></div>
        <div className="a-card a-kpi"><Bi n="seal" s={30} /><p className="a-v"><Count v={unici(trenta)} /></p><p>Persone diverse (30 giorni)</p></div>
      </div>

      <div className="a-card" style={{ marginTop: 14 }}>
        <div className="a-ch"><h2>Visite al giorno · ultimi 30 giorni</h2></div>
        <div style={{ padding: '0 18px 14px' }}><Barre giorni={giorni} /></div>
      </div>

      <div className="a-tool" style={{ marginTop: 14 }}>
        <div className="a-seg2">
          {(Object.keys(PERIODI) as Periodo[]).map((x) => (
            <button key={x} type="button" className={per === x ? 'a-on' : ''} onClick={() => { setPer(x); setQuante(100); vib(5); }}>{x}</button>
          ))}
        </div>
        <button type="button" className="a-btn a-gh a-sm" onClick={() => { setRows(null); load(); }}><Ic n="repeat" s={15} /> Aggiorna</button>
        <button type="button" className="a-btn a-gh a-sm" onClick={esporta} disabled={!elenco.length}><Ic n="download" s={15} /> Scarica Excel</button>
      </div>

      {error && <div className="a-card a-warn"><Ic n="shield" s={18} />{error}</div>}
      {!rows && <div className="a-card a-empty">Caricamento…</div>}

      {rows && (
        <>
          <div className="a-split">
            <Classifica titolo="Paesi" righe={classifica(nel, (v) => v.paese || '')} tot={nel.length} />
            <Classifica titolo="Regioni" righe={classifica(nel, (v) => (v.regione ? `${v.regione}${v.paese && v.paese !== 'Italia' ? ` (${v.paese})` : ''}` : ''))} tot={nel.length} />
          </div>
          <div className="a-split" style={{ marginTop: 14 }}>
            <Classifica titolo="Città" righe={classifica(nel, (v) => (v.citta ? `${v.citta}${v.provincia ? ` (${v.provincia})` : ''}` : ''), 15)} tot={nel.length} />
            <Classifica titolo="Da dove arrivano" righe={classifica(nel, (v) => sito(v.provenienza))} tot={nel.length} />
          </div>
          <div className="a-split" style={{ marginTop: 14 }}>
            <Classifica titolo="Dispositivi" righe={classifica(nel, (v) => v.dispositivo || '')} tot={nel.length} />
            <Classifica titolo="Sistemi" righe={classifica(nel, (v) => [v.sistema, v.browser].filter(Boolean).join(' · '))} tot={nel.length} />
          </div>

          <div className="a-tool" style={{ marginTop: 14 }}>
            <label className="a-fin">
              <Ic n="search" s={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per IP, città, regione, paese…" />
            </label>
          </div>
          <div className="a-card a-list">
            <div className="a-ch"><h2>{elenco.length === 1 ? '1 visita' : `${elenco.length.toLocaleString('it-IT')} visite`} · {per}</h2></div>
            {elenco.length === 0 && !error && <div className="a-empty">{all.length ? 'Nessuna visita in questo periodo.' : 'Nessuna visita registrata ancora.'}</div>}
            {elenco.slice(0, quante).map((v) => (
              <div key={v.id} className="a-row">
                <span className="a-oav"><Ic n={v.dispositivo === 'Computer' ? 'grid' : 'phone'} s={18} /></span>
                <span className="a-tx">
                  <b>{[v.citta, v.provincia, v.regione, v.paese].filter(Boolean).join(', ') || 'Posizione sconosciuta'}</b>
                  <small>{[dataOra(v.created_at), `IP ${v.ip || '—'}`, [v.dispositivo, v.sistema, v.browser].filter(Boolean).join(' '), sito(v.provenienza)].filter(Boolean).join(' · ')}</small>
                </span>
              </div>
            ))}
            {elenco.length > quante && (
              <div className="a-empty">
                <button type="button" className="a-btn a-gh a-sm" onClick={() => setQuante((n) => n + 200)}>Mostra altre</button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

/* Box per la home del pannello: visite di oggi + andamento degli ultimi 7 giorni. */
export function useVisiteSettimana() {
  const [v, setV] = useState<{ oggi: number; giorni: number[]; pct: number | null } | null>(null);
  useEffect(() => {
    let vivo = true;
    (async () => {
      const sb = getSupabase();
      if (!sb) return;
      const t0 = inizioOggi();
      const { data } = await sb
        .from('visite')
        .select('created_at')
        .gte('created_at', new Date(t0 - 13 * GIORNO).toISOString())
        .limit(20000);
      if (!vivo || !data) return;
      const giorni = Array(14).fill(0);
      (data as { created_at: string }[]).forEach((r) => {
        const i = Math.floor((new Date(r.created_at).getTime() - (t0 - 13 * GIORNO)) / GIORNO);
        if (i >= 0 && i < 14) giorni[i]++;
      });
      const prima = giorni.slice(0, 7).reduce((a, b) => a + b, 0);
      const ora = giorni.slice(7).reduce((a, b) => a + b, 0);
      setV({ oggi: giorni[13], giorni: giorni.slice(7), pct: prima > 0 ? Math.round(((ora - prima) / prima) * 100) : null });
    })().catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return v;
}
