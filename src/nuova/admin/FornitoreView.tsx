import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Product } from '../../types';
import { hasProductImage } from '../../utils/imageFirst';
import { Ic, Bi, eur, vib } from '../Icona';
import { Count, F } from './gestione/ui';
import { MsChange, MsNuovo, MsStato, loginYollgo, msApi, prezzoSito } from '../../services/mondoSapone';

/* Mondo Sapone: collegamento al portale Yollgo, aggiornamento prezzi (+30%),
   prodotti non più disponibili, nuovi prodotti da approvare, prodotti da controllare. */

type Tab = 'nuovi' | 'controllo' | 'verifica' | 'ultimo';
const PAGE = 60;
const quando = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' alle') : '—';
const cerca = (s: string, q: string) => {
  const parole = q.toLowerCase().split(/\s+/).filter(Boolean);
  const t = s.toLowerCase();
  return parole.every((w) => t.includes(w));
};

export const FornitoreView: React.FC<{ toast: (t: string) => void }> = ({ toast }) => {
  const { productsList, categoriesList, subcategoriesList, refreshFromCloud } = useAdmin();
  const [st, setSt] = useState<MsStato | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('nuovi');
  const [q, setQ] = useState('');
  const [n, setN] = useState(PAGE);
  const [vedi, setVedi] = useState<'da fare' | 'scartati' | 'ignorati'>('da fare');
  const [catScelta, setCatScelta] = useState<Record<string, string>>({});
  // accesso
  const [pref, setPref] = useState('+39');
  const [tel, setTel] = useState('');
  const [pwd, setPwd] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      setSt(await msApi<MsStato>('stato'));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const byId = useMemo(() => new Map(productsList.map((p) => [p.id, p])), [productsList]);
  const catName = useMemo(() => new Map(categoriesList.map((c) => [c.id, c.name])), [categoriesList]);
  const subName = useMemo(() => new Map(subcategoriesList.map((s) => [s.id, s.name])), [subcategoriesList]);
  const r = st?.risultato || {};
  const nonDisp = useMemo(() => productsList.filter((p) => p.supplierMissing).length, [productsList]);

  const accedi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tel.trim() || !pwd) {
      toast('Scrivi telefono e password di Yollgo');
      return;
    }
    setBusy('login');
    setError(null);
    try {
      const pass = await loginYollgo(pref, tel, pwd);
      setPwd('');
      await msApi('collega', pass);
      toast('Collegato a Mondo Sapone');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPwd('');
      setBusy(null);
    }
  };

  const aggiorna = async () => {
    setBusy('sync');
    setError(null);
    try {
      const out = await msApi<MsStato & { risultato: MsStato['risultato'] }>('aggiorna');
      setSt((prev) => (prev ? { ...prev, ...out, nuovi: prev.nuovi } : prev));
      await load();
      refreshFromCloud(); // ricarica i prezzi nuovi nel pannello, senza far aspettare
      const x = out.risultato || {};
      toast(`Fatto: ${x.prezzi || 0} prezzi, ${x.assenti || 0} non disponibili, ${x.nuoviOggi || 0} nuovi`);
      setTab('ultimo');
    } catch (err) {
      setError((err as Error).message);
      load();
    } finally {
      setBusy(null);
    }
  };

  const esci = async () => {
    setBusy('esci');
    try {
      await msApi('scollega');
      await load();
      toast('Scollegato da Yollgo');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // ---------- nuovi dal fornitore ----------
  const nuovi = useMemo(() => {
    let l = (st?.nuovi || []).filter((x) => (vedi === 'scartati' ? x.stato === 'scartato' : x.stato === 'nuovo'));
    if (q.trim()) l = l.filter((x) => cerca(`${x.nome} ${x.ean || ''} ${x.categoria_fornitore || ''}`, q));
    return l;
  }, [st, q, vedi]);
  const contaNuovi = (st?.nuovi || []).filter((x) => x.stato === 'nuovo').length;
  const contaScartati = (st?.nuovi || []).filter((x) => x.stato === 'scartato').length;

  const catDi = (x: MsNuovo) => catScelta[x.art_id] ?? `${x.category_id || ''}|${x.subcategory_id || ''}`;
  const opzioniCat = useMemo(() => {
    const out: [string, string][] = [['|', '— scegli la categoria —']];
    for (const c of categoriesList) {
      out.push([`${c.id}|`, c.name]);
      const subs = subcategoriesList.filter((s) => s.categoryId === c.id);
      for (const s of subs.filter((x) => !x.parentSubcategoryId)) {
        out.push([`${c.id}|${s.id}`, `${c.name} › ${s.name}`]);
        for (const t of subs.filter((x) => x.parentSubcategoryId === s.id)) out.push([`${c.id}|${t.id}`, `${c.name} › ${s.name} › ${t.name}`]);
      }
    }
    return out;
  }, [categoriesList, subcategoriesList]);

  const aggiungi = async (x: MsNuovo) => {
    const [cat, sub] = catDi(x).split('|');
    if (!cat) {
      toast('Scegli prima la categoria');
      return;
    }
    vib(8);
    setBusy('add-' + x.art_id);
    try {
      await msApi('aggiungi', { artIds: [x.art_id], categorie: { [x.art_id]: { category_id: cat, subcategory_id: sub || null } } });
      setSt((prev) => (prev ? { ...prev, nuovi: prev.nuovi.filter((y) => y.art_id !== x.art_id) } : prev));
      toast('Aggiunto al catalogo: ' + x.nome);
      refreshFromCloud();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const scarta = async (x: MsNuovo, rimetti = false) => {
    vib(5);
    setBusy('sc-' + x.art_id);
    try {
      await msApi(rimetti ? 'rimetti' : 'scarta', { artIds: [x.art_id] });
      setSt((prev) => (prev ? { ...prev, nuovi: prev.nuovi.map((y) => (y.art_id === x.art_id ? { ...y, stato: rimetti ? 'nuovo' : 'scartato' } : y)) } : prev));
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // ---------- da controllare ----------
  const ignorati = useMemo(() => new Set(st?.ignorati || []), [st]);
  const daControllare = useMemo(() => {
    const ids = vedi === 'ignorati' ? [...ignorati] : (st?.daControllare || []).filter((id) => !ignorati.has(id));
    let l = ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
    if (q.trim()) l = l.filter((p) => cerca(`${p.name} ${p.code} ${p.category}`, q));
    return l;
  }, [st, ignorati, byId, q, vedi]);
  const contaControllo = (st?.daControllare || []).filter((id) => !ignorati.has(id) && byId.has(id)).length;

  const controllo = async (p: Product, scelta: 'assente' | 'torna' | 'ignora' | 'riprendi') => {
    vib(5);
    setBusy('ck-' + p.id);
    try {
      await msApi('controllo', { productIds: [p.id], scelta });
      if (scelta === 'ignora' || scelta === 'riprendi') {
        setSt((prev) => {
          if (!prev) return prev;
          const s = new Set(prev.ignorati);
          if (scelta === 'ignora') s.add(p.id);
          else s.delete(p.id);
          return { ...prev, ignorati: [...s] };
        });
      } else {
        await refreshFromCloud();
        toast(scelta === 'assente' ? 'Ora risulta Non disponibile' : 'Di nuovo disponibile');
      }
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // ---------- prezzi da verificare ----------
  const sospetti: MsChange[] = r.listaSospetti || [];
  const decidiPrezzo = async (c: MsChange, tieni: boolean) => {
    vib(6);
    setBusy('pz-' + c.id);
    try {
      await msApi('prezzo', { productId: c.id, price: tieni ? c.prima : c.dopo, tieni });
      setSt((prev) => {
        if (!prev) return prev;
        const l = (prev.risultato.listaSospetti || []).filter((x) => x.id !== c.id);
        return { ...prev, risultato: { ...prev.risultato, listaSospetti: l, sospetti: l.length } };
      });
      if (!tieni) refreshFromCloud();
      toast(tieni ? 'Tieni il tuo prezzo: non verrà più cambiato' : `Nuovo prezzo ${eur(c.dopo || 0)}`);
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const collegato = !!st?.collegato && st.stato !== 'scaduto';
  const tabs: [Tab, string, number?][] = [
    ['nuovi', 'Nuovi dal fornitore', contaNuovi],
    ['controllo', 'Da controllare', contaControllo],
    ['verifica', 'Prezzi da verificare', sospetti.length],
    ['ultimo', 'Ultimo aggiornamento'],
  ];

  return (
    <>
      <div className="a-kpis">
        <div className="a-card a-kpi"><Bi n="boxes" s={30} /><p className="a-v"><Count v={r.collegati || 0} /></p><p>Prodotti collegati a Mondo Sapone</p></div>
        <button type="button" className="a-card a-kpi" onClick={() => { setTab('nuovi'); setVedi('da fare'); }}><Bi n="seal" s={30} /><p className="a-v"><Count v={contaNuovi} /></p><p>Nuovi da approvare</p></button>
        <button type="button" className="a-card a-kpi" onClick={() => { setTab('controllo'); setVedi('da fare'); }}><Bi n="clock" s={30} /><p className="a-v"><Count v={contaControllo} /></p><p>Da controllare</p></button>
        <div className="a-card a-kpi"><Bi n="invoice" s={30} /><p className="a-v"><Count v={nonDisp} /></p><p>Non disponibili sul sito</p></div>
      </div>

      {/* collegamento */}
      <div className="a-card a-ms-link">
        {!st && !error && <div className="a-empty">Caricamento…</div>}
        {st && collegato && (
          <div className="a-ms-on">
            <span className="a-ms-dot a-ok" />
            <span className="a-tx">
              <b>Collegato a Mondo Sapone</b>
              <small>
                Aggiornamento automatico ogni mattina · ultimo: {quando(st.ultimoOk)}
                {r.totaleFornitore ? ` · ${r.totaleFornitore.toLocaleString('it-IT')} prodotti da Mondo Sapone` : ''}
              </small>
            </span>
            <button type="button" className="a-btn a-prim a-sm" onClick={aggiorna} disabled={!!busy}>
              <Ic n="repeat" s={15} /> {busy === 'sync' ? 'Aggiorno… (circa 20 secondi)' : 'Aggiorna ora'}
            </button>
            <button type="button" className="a-btn a-gh a-sm" onClick={esci} disabled={!!busy}>Esci da Yollgo</button>
          </div>
        )}
        {st && !collegato && (
          <form className="a-ms-form" onSubmit={accedi}>
            <div className="a-ms-intro">
              <span className={`a-ms-dot ${st.stato === 'scaduto' ? 'a-bad' : ''}`} />
              <span className="a-tx">
                <b>{st.stato === 'scaduto' ? 'Yollgo ti ha fatto uscire: accedi di nuovo' : 'Accedi a Mondo Sapone (Yollgo)'}</b>
                <small>Stesso telefono e password che usi su Yollgo. La password non viene salvata: serve solo per entrare adesso.</small>
              </span>
            </div>
            <div className="a-ms-fields">
              <label className="a-fld a-ms-pref">
                <span>Prefisso</span>
                <select value={pref} onChange={(e) => setPref(e.target.value)}>
                  <option value="+39">+39 Italia</option>
                  <option value="+34">+34 Spagna</option>
                </select>
              </label>
              <F label="Telefono" value={tel} onChange={setTel} type="tel" inputMode="tel" placeholder="es. 345 600 0865" />
              <label className="a-fld">
                <span>Password</span>
                <input type="password" autoComplete="current-password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
              </label>
              <button type="submit" className="a-btn a-prim" disabled={!!busy}>{busy === 'login' ? 'Accesso…' : 'Accedi'}</button>
            </div>
          </form>
        )}
      </div>
      {error && <div className="a-card a-warn"><Ic n="shield" s={18} />{error}</div>}

      {st && (
        <>
          <div className="a-tool">
            <div className="a-seg2 a-ms-tabs">
              {tabs.map(([id, label, c]) => (
                <button key={id} type="button" className={tab === id ? 'a-on' : ''} onClick={() => { setTab(id); setN(PAGE); setVedi('da fare'); vib(5); }}>
                  {label}{c ? <em>{c.toLocaleString('it-IT')}</em> : null}
                </button>
              ))}
            </div>
          </div>
          {(tab === 'nuovi' || tab === 'controllo') && (
            <div className="a-tool">
              <label className="a-fin">
                <Ic n="search" s={18} />
                <input value={q} onChange={(e) => { setQ(e.target.value); setN(PAGE); }} placeholder="Cerca per nome, codice o categoria" />
              </label>
              <div className="a-seg2">
                {(tab === 'nuovi' ? (['da fare', 'scartati'] as const) : (['da fare', 'ignorati'] as const)).map((x) => (
                  <button key={x} type="button" className={vedi === x ? 'a-on' : ''} onClick={() => { setVedi(x); setN(PAGE); vib(5); }}>
                    {x === 'da fare' ? (tab === 'nuovi' ? 'Da approvare' : 'Da controllare') : x === 'scartati' ? `Scartati (${contaScartati})` : `Va bene così (${ignorati.size})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'nuovi' && (
            <div className="a-card a-list">
              <div className="a-ch">
                <h2>{nuovi.length === 1 ? '1 prodotto' : `${nuovi.length.toLocaleString('it-IT')} prodotti`}</h2>
                <small className="a-chs">Prodotti di Mondo Sapone che non sono sul sito. Prezzo già con il tuo 30%.</small>
              </div>
              {nuovi.slice(0, n).map((x, i) => {
                const [cat, sub] = catDi(x).split('|');
                return (
                  <div key={x.art_id} className="a-row a-mrow a-ms-row" style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}>
                    <span className="a-mth a-mth-l">{x.immagine ? <img src={x.immagine} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} /> : <Ic n="package" s={18} />}</span>
                    <span className="a-tx">
                      <b>{x.nome}</b>
                      <small>
                        {[`Mondo Sapone ${eur(x.prezzo_fornitore)}`, x.confezione ? `conf. ${x.confezione} pz` : '', x.ean, x.categoria_fornitore].filter(Boolean).join(' · ')}
                      </small>
                      {vedi !== 'scartati' && (
                        <select className="a-ms-cat" value={catDi(x)} onChange={(e) => setCatScelta((m) => ({ ...m, [x.art_id]: e.target.value }))} aria-label="Categoria sul sito">
                          {opzioniCat.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                          {cat && !opzioniCat.some(([v]) => v === catDi(x)) && <option value={catDi(x)}>{[catName.get(cat), subName.get(sub)].filter(Boolean).join(' › ') || 'Categoria'}</option>}
                        </select>
                      )}
                    </span>
                    <span className="a-ms-pz"><b>{eur(prezzoSito(x.prezzo_fornitore))}</b><small>tuo prezzo</small></span>
                    <span className="a-ms-bt">
                      {vedi === 'scartati' ? (
                        <button type="button" className="a-btn a-gh a-sm" disabled={busy === 'sc-' + x.art_id} onClick={() => scarta(x, true)}>Rimetti</button>
                      ) : (
                        <>
                          <button type="button" className="a-btn a-gh a-sm" disabled={!!busy && busy.endsWith(x.art_id)} onClick={() => scarta(x)}>Scarta</button>
                          <button type="button" className="a-btn a-prim a-sm" disabled={!!busy && busy.endsWith(x.art_id)} onClick={() => aggiungi(x)}>
                            <Ic n="plus" s={15} /> {busy === 'add-' + x.art_id ? 'Aggiungo…' : 'Aggiungi'}
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
              {nuovi.length === 0 && (
                <div className="a-empty">{(st.nuovi || []).length || r.quando ? 'Nessun prodotto qui.' : 'Premi "Aggiorna ora" per vedere i prodotti nuovi di Mondo Sapone.'}</div>
              )}
              {nuovi.length > n && (
                <button type="button" className="a-row a-moreb" onClick={() => setN((x) => x + PAGE)}>
                  <span className="a-tx"><b>Mostra altri prodotti</b><small>{n} di {nuovi.length.toLocaleString('it-IT')}</small></span>
                  <Ic n="chev" s={16} />
                </button>
              )}
            </div>
          )}

          {tab === 'controllo' && (
            <div className="a-card a-list">
              <div className="a-ch">
                <h2>{daControllare.length === 1 ? '1 prodotto' : `${daControllare.length.toLocaleString('it-IT')} prodotti`}</h2>
                <small className="a-chs">Prodotti del sito che non trovo uguali da Mondo Sapone (esclusi Ho.Re.Ca). Non li tocco: decidi tu.</small>
              </div>
              {daControllare.slice(0, n).map((p, i) => (
                <div key={p.id} className="a-row a-mrow a-ms-row" style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}>
                  <span className="a-mth">{hasProductImage(p) ? <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Ic n="package" s={16} />}</span>
                  <span className="a-tx">
                    <b>{p.name}</b>
                    <small>{[eur(p.price), p.code, p.category].filter(Boolean).join(' · ')}</small>
                  </span>
                  {p.supplierMissing && <span className="a-pill a-p-bad"><i />Non disponibile</span>}
                  <span className="a-ms-bt">
                    {vedi === 'ignorati' ? (
                      <button type="button" className="a-btn a-gh a-sm" disabled={!!busy} onClick={() => controllo(p, 'riprendi')}>Rimetti in lista</button>
                    ) : (
                      <>
                        {p.supplierMissing ? (
                          <button type="button" className="a-btn a-gh a-sm" disabled={!!busy} onClick={() => controllo(p, 'torna')}>Rimetti disponibile</button>
                        ) : (
                          <button type="button" className="a-btn a-gh a-sm" disabled={!!busy} onClick={() => controllo(p, 'assente')}>Non disponibile</button>
                        )}
                        <button type="button" className="a-btn a-gh a-sm" disabled={!!busy} onClick={() => controllo(p, 'ignora')}>Va bene così</button>
                      </>
                    )}
                  </span>
                </div>
              ))}
              {daControllare.length === 0 && <div className="a-empty">{r.quando ? 'Nessun prodotto da controllare.' : 'Premi "Aggiorna ora" per il primo controllo.'}</div>}
              {daControllare.length > n && (
                <button type="button" className="a-row a-moreb" onClick={() => setN((x) => x + PAGE)}>
                  <span className="a-tx"><b>Mostra altri prodotti</b><small>{n} di {daControllare.length.toLocaleString('it-IT')}</small></span>
                  <Ic n="chev" s={16} />
                </button>
              )}
            </div>
          )}

          {tab === 'verifica' && (
            <div className="a-card a-list">
              <div className="a-ch">
                <h2>Prezzi cambiati di molto</h2>
                <small className="a-chs">Più del 50% in su o in giù: non li ho cambiati da solo. Scegli tu.</small>
              </div>
              {sospetti.map((c) => (
                <div key={c.id} className="a-row a-ms-row">
                  <span className="a-tx"><b>{c.nome}</b><small>Ora {eur(c.prima || 0)} · con Mondo Sapone +30% sarebbe {eur(c.dopo || 0)}</small></span>
                  <span className="a-ms-bt">
                    <button type="button" className="a-btn a-gh a-sm" disabled={!!busy} onClick={() => decidiPrezzo(c, true)}>Tieni {eur(c.prima || 0)}</button>
                    <button type="button" className="a-btn a-prim a-sm" disabled={!!busy} onClick={() => decidiPrezzo(c, false)}>Usa {eur(c.dopo || 0)}</button>
                  </span>
                </div>
              ))}
              {sospetti.length === 0 && <div className="a-empty">Nessun prezzo da verificare.</div>}
            </div>
          )}

          {tab === 'ultimo' && (
            <div className="a-card a-list">
              <div className="a-ch">
                <h2>Ultimo aggiornamento</h2>
                <small className="a-chs">{r.quando ? quando(r.quando) : 'Non ancora fatto'}</small>
              </div>
              {r.quando ? (
                <>
                  <div className="a-ms-sum">
                    <span><b>{r.prezzi || 0}</b>prezzi cambiati</span>
                    <span><b>{r.assenti || 0}</b>non più disponibili</span>
                    <span><b>{r.tornati || 0}</b>tornati disponibili</span>
                    <span><b>{r.nuoviOggi || 0}</b>nuovi oggi</span>
                    <span><b>{r.collegatiOra || 0}</b>collegati ora</span>
                    <span><b>{r.inOfferta || 0}</b>in volantino (non toccati)</span>
                  </div>
                  {r.bloccati ? <div className="a-card a-warn"><Ic n="shield" s={18} />{r.bloccati} prodotti NON messi "Non disponibile" per sicurezza: {r.motivoBlocco}. Riprova più tardi.</div> : null}
                  {([['Prezzi cambiati', r.listaPrezzi || [], true], ['Non più disponibili', r.listaAssenti || [], false], ['Tornati disponibili', r.listaTornati || [], false]] as [string, MsChange[], boolean][]).map(([t, l, pz]) =>
                    l.length ? (
                      <div key={t} className="a-ms-grp">
                        <p className="a-ms-gt">{t} ({l.length})</p>
                        {l.map((c) => (
                          <div key={t + c.id} className="a-row a-ms-row">
                            <span className="a-tx"><b>{c.nome}</b></span>
                            {pz && <span className="a-ms-ch"><s>{eur(c.prima || 0)}</s> {eur(c.dopo || 0)}</span>}
                          </div>
                        ))}
                      </div>
                    ) : null
                  )}
                </>
              ) : (
                <div className="a-empty">Premi "Aggiorna ora" per il primo aggiornamento.</div>
              )}
            </div>
          )}
          <p className="a-note">
            Ogni mattina il sito controlla Mondo Sapone da solo: prezzi al +30%, prodotti tolti in "Non disponibile" (non vengono cancellati) e
            ti arriva il riepilogo su WhatsApp ed email. I prodotti in volantino e quelli con "Tieni il mio prezzo" non vengono toccati.
          </p>
        </>
      )}
    </>
  );
};
