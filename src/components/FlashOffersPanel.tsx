import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Timer, Search, Trash2, Pencil, Power, Plus, X } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { FlashOffer, Product } from '../types';
import { getFlashStatus, FlashStatus } from '../utils/flashOffers';

const pad = (n: number) => String(n).padStart(2, '0');
// Data per i campi "data e ora" (ora locale)
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const QUICK_DURATIONS: { label: string; hours: number }[] = [
  { label: '2 ore', hours: 2 },
  { label: '4 ore', hours: 4 },
  { label: '8 ore', hours: 8 },
  { label: '12 ore', hours: 12 },
  { label: '1 giorno', hours: 24 },
  { label: '3 giorni', hours: 72 },
  { label: '7 giorni', hours: 168 },
  { label: '1 mese', hours: 720 },
];

const STATUS_STYLE: Record<FlashStatus, { label: string; cls: string }> = {
  in_corso: { label: 'In corso', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  programmata: { label: 'Programmata', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  in_pausa: { label: 'Fuori fascia oraria', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  scaduta: { label: 'Scaduta', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  disattivata: { label: 'Disattivata', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
};

const inputCls =
  'w-full bg-[#0d1420] border border-[#1c2433] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500';
const labelCls = 'block text-xs font-semibold text-slate-400 mb-1';
const cardCls = 'bg-[#111a2b] border border-[#1c2433] rounded-xl';

export const FlashOffersPanel: React.FC = () => {
  const { baseProductsList, updateProduct, flashOffersEnabled, setFlashOffersEnabled, systemSettings, updateSystemSettings } = useAdmin();

  // ---------- Box "Offerte del mese" in home ----------
  const [promoLabel, setPromoLabel] = useState(systemSettings.promoBadgeLabel ?? 'FINO AL');
  const [promoValue, setPromoValue] = useState(systemSettings.promoBadgeValue ?? '-30%');
  const [promoAuto, setPromoAuto] = useState(!!systemSettings.promoBadgeAuto);
  const [promoSaved, setPromoSaved] = useState(false);
  const savePromo = () => {
    updateSystemSettings({ promoBadgeLabel: promoLabel.trim(), promoBadgeValue: promoValue.trim(), promoBadgeAuto: promoAuto });
    setPromoSaved(true);
    setTimeout(() => setPromoSaved(false), 2500);
  };

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 20000);
    return () => window.clearInterval(t);
  }, []);

  // ---------- Modulo nuova offerta ----------
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [percent, setPercent] = useState('');
  // Prezzo in offerta scelto per ogni prodotto selezionato
  const [offerPrices, setOfferPrices] = useState<Record<string, string>>({});
  const [startAt, setStartAt] = useState(() => toLocalInput(new Date()));
  const [endAt, setEndAt] = useState(() => toLocalInput(new Date(Date.now() + 8 * 3600 * 1000)));
  const [useDaily, setUseDaily] = useState(false);
  const [dailyFrom, setDailyFrom] = useState('09:00');
  const [dailyTo, setDailyTo] = useState('17:00');
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return baseProductsList
      .filter((p) => p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q))
      .slice(0, 40);
  }, [baseProductsList, query]);

  const selectedProducts = useMemo(
    () => baseProductsList.filter((p) => selectedIds.includes(p.id)),
    [baseProductsList, selectedIds]
  );

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const parseNum = (v: string) => Number(String(v).replace(',', '.'));

  // Applica lo stesso sconto % a tutti i prodotti selezionati (poi i prezzi si possono ritoccare uno per uno)
  const applyPercentToAll = () => {
    const pct = parseNum(percent);
    if (!(pct > 0 && pct < 100)) return setError('Lo sconto deve essere tra 1 e 99%.');
    setError('');
    setOfferPrices((prev) => {
      const next = { ...prev };
      selectedProducts.forEach((p) => {
        next[p.id] = (p.price * (1 - pct / 100)).toFixed(2);
      });
      return next;
    });
  };

  const applyQuick = (hours: number) => {
    const start = new Date(startAt);
    const base = isNaN(start.getTime()) ? new Date() : start;
    setEndAt(toLocalInput(new Date(base.getTime() + hours * 3600 * 1000)));
  };

  const resetForm = () => {
    setSelectedIds([]);
    setQuery('');
    setPercent('');
    setOfferPrices({});
    setStartAt(toLocalInput(new Date()));
    setEndAt(toLocalInput(new Date(Date.now() + 8 * 3600 * 1000)));
    setUseDaily(false);
    setError('');
  };

  const saveOffer = () => {
    setError('');
    setOkMsg('');
    if (selectedProducts.length === 0) return setError('Seleziona almeno un prodotto.');
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return setError('Inserisci data e ora di inizio e di fine.');
    if (end <= start) return setError('La fine deve essere dopo l’inizio.');
    if (useDaily && dailyFrom === dailyTo) return setError('La fascia oraria non è valida.');

    const missing = selectedProducts.filter((p) => !(parseNum(offerPrices[p.id] ?? '') > 0));
    if (missing.length > 0) return setError(`Inserisci il prezzo in offerta per: ${missing.map((p) => p.name).join(', ')}`);

    let saved = 0;
    const skipped: string[] = [];
    selectedProducts.forEach((p) => {
      const price = +parseNum(offerPrices[p.id]).toFixed(2);
      if (!(price > 0 && price < p.price)) {
        skipped.push(p.name);
        return;
      }
      const offer: FlashOffer = {
        price,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        dailyFrom: useDaily ? dailyFrom : undefined,
        dailyTo: useDaily ? dailyTo : undefined,
        active: true,
      };
      updateProduct({ ...p, flashOffer: offer });
      saved++;
    });

    if (skipped.length > 0) {
      setError(`Non messi in offerta (il prezzo in offerta deve essere più basso di quello normale): ${skipped.join(', ')}`);
    }
    if (saved > 0) {
      setOkMsg(`${saved} prodott${saved === 1 ? 'o messo' : 'i messi'} in offerta a tempo.`);
      setSelectedIds((prev) => prev.filter((id) => skipped.includes(baseProductsList.find((p) => p.id === id)?.name || '')));
      setQuery('');
    }
  };

  const editOffer = (p: Product) => {
    const fo = p.flashOffer!;
    setSelectedIds([p.id]);
    setOfferPrices({ [p.id]: fo.price.toFixed(2) });
    setStartAt(toLocalInput(new Date(fo.startAt)));
    setEndAt(toLocalInput(new Date(fo.endAt)));
    setUseDaily(!!(fo.dailyFrom && fo.dailyTo));
    if (fo.dailyFrom) setDailyFrom(fo.dailyFrom);
    if (fo.dailyTo) setDailyTo(fo.dailyTo);
    setError('');
    setOkMsg('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleOffer = (p: Product) => updateProduct({ ...p, flashOffer: { ...p.flashOffer!, active: !p.flashOffer!.active } });

  const removeOffer = (p: Product) => {
    if (confirm(`Togliere l'offerta a tempo da "${p.name}"?`)) updateProduct({ ...p, flashOffer: undefined });
  };

  // ---------- Elenco offerte ----------
  const offers = useMemo(
    () =>
      baseProductsList
        .filter((p) => p.flashOffer)
        .sort((a, b) => new Date(a.flashOffer!.endAt).getTime() - new Date(b.flashOffer!.endAt).getTime()),
    [baseProductsList]
  );
  const expired = offers.filter((p) => getFlashStatus(p.flashOffer, now) === 'scaduta');

  const removeExpired = () => {
    if (expired.length === 0) return;
    if (confirm(`Eliminare ${expired.length} offerte scadute?`)) expired.forEach((p) => updateProduct({ ...p, flashOffer: undefined }));
  };

  return (
    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left text-sm">
      {/* Interruttore generale */}
      <div className={`${cardCls} p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between`}>
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Timer className="w-4 h-4 text-sky-400" />
            Offerte a tempo
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Quando è spento, nessuna offerta a tempo viene mostrata ai clienti (le offerte restano salvate).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFlashOffersEnabled(!flashOffersEnabled)}
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
            flashOffersEnabled
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
              : 'bg-rose-500/15 text-rose-400 border-rose-500/40 hover:bg-rose-500/25'
          }`}
        >
          <Power className="w-4 h-4" />
          {flashOffersEnabled ? 'ATTIVE' : 'SPENTE'}
        </button>
      </div>

      {/* Box "Offerte del mese" in home */}
      <div className={`${cardCls} p-4 space-y-3`}>
        <div>
          <h3 className="text-sm font-semibold text-white">Box "Offerte del mese" in home</h3>
          <p className="text-xs text-slate-400 mt-1">
            Il box mostra in automatico quante offerte a tempo sono in corso e quando termina la prima. Qui scegli il testo
            del riquadro con lo sconto (lascia vuoto il valore per nasconderlo).
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="sm:w-40">
            <label className={labelCls}>Scritta piccola</label>
            <input value={promoLabel} onChange={(e) => setPromoLabel(e.target.value)} placeholder="FINO AL" className={inputCls} />
          </div>
          <div className="sm:w-40">
            <label className={labelCls}>Sconto</label>
            <input value={promoValue} onChange={(e) => setPromoValue(e.target.value)} placeholder="-30%" className={inputCls} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Anteprima</span>
            <div className="bg-[#0d1420] border border-amber-500/30 px-3 py-1.5 rounded-lg text-center min-w-[64px]">
              {promoLabel.trim() && (
                <span className="block text-[9px] uppercase tracking-wider font-bold text-amber-300 leading-none">{promoLabel}</span>
              )}
              <span className="block text-amber-400 font-extrabold text-sm leading-none mt-0.5">{promoValue || '—'}</span>
            </div>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={promoAuto} onChange={(e) => setPromoAuto(e.target.checked)} className="accent-sky-500" />
          <span className="text-xs text-slate-300">
            Quando ci sono offerte a tempo in corso, mostra in automatico lo sconto più alto (es. -45%)
          </span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={savePromo}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold"
          >
            Salva
          </button>
          {promoSaved && <span className="text-xs text-emerald-400">Salvato: è già visibile nella home.</span>}
        </div>
      </div>

      {/* Nuova offerta */}
      <div ref={formRef} className={`${cardCls} p-4 space-y-4`}>
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-sky-400" />
          Nuova offerta a tempo
        </h3>

        <div>
          <label className={labelCls}>1. Scegli i prodotti</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per nome o codice (almeno 2 lettere)"
              className={`${inputCls} pl-9`}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-52 overflow-y-auto border border-[#1c2433] rounded-lg p-1">
              {searchResults.map((p) => (
                <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#161f30] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="accent-sky-500"
                  />
                  <span className="flex-1 min-w-0 text-xs text-white truncate">{p.name}</span>
                  <span className="text-xs text-slate-400 shrink-0">€{p.price.toFixed(2)}</span>
                </label>
              ))}
            </div>
          )}
          {selectedProducts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedProducts.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-xs text-sky-200"
                >
                  <span className="max-w-[200px] truncate">{p.name}</span>
                  <button type="button" onClick={() => toggleSelect(p.id)} className="p-0.5 rounded-full hover:bg-sky-500/20">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>2. Prezzi in offerta</label>
          {selectedProducts.length === 0 ? (
            <p className="text-xs text-slate-500">Seleziona prima i prodotti: qui potrai scrivere il prezzo in offerta di ognuno.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[11px] text-slate-500">Scorciatoia: stesso sconto per tutti</span>
                <div className="flex items-center gap-1 w-24">
                  <input
                    value={percent}
                    onChange={(e) => setPercent(e.target.value)}
                    inputMode="decimal"
                    placeholder="es. 20"
                    className={inputCls}
                  />
                  <span className="text-slate-400">%</span>
                </div>
                <button
                  type="button"
                  onClick={applyPercentToAll}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#0d1420] border border-[#1c2433] text-slate-300 hover:border-sky-500 hover:text-white"
                >
                  Calcola prezzi
                </button>
              </div>
              <div className="space-y-1.5">
                {selectedProducts.map((p) => {
                  const offer = parseNum(offerPrices[p.id] ?? '');
                  const pct = offer > 0 && offer < p.price ? Math.round((1 - offer / p.price) * 100) : null;
                  return (
                    <div key={p.id} className="flex items-center gap-2 bg-[#0d1420] border border-[#1c2433] rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-semibold truncate">{p.name}</p>
                        <p className="text-[11px] text-slate-500">Prezzo normale €{p.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1 w-32 shrink-0">
                        <span className="text-slate-400 text-xs">€</span>
                        <input
                          value={offerPrices[p.id] ?? ''}
                          onChange={(e) => setOfferPrices((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          inputMode="decimal"
                          placeholder="Prezzo offerta"
                          className={inputCls}
                        />
                      </div>
                      <span className={`w-12 text-right text-xs font-bold shrink-0 ${pct ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {pct ? `-${pct}%` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <p className="text-[11px] text-slate-500 mt-1">Prezzi senza IVA, come nel listino.</p>
        </div>

        <div>
          <label className={labelCls}>3. Periodo</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="block text-[11px] text-slate-500 mb-1">Dal (giorno e ora)</span>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 mb-1">Al (giorno e ora)</span>
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[11px] text-slate-500 self-center mr-1">Durata rapida:</span>
            {QUICK_DURATIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => applyQuick(d.hours)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#0d1420] border border-[#1c2433] text-slate-300 hover:border-sky-500 hover:text-white"
              >
                {d.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input type="checkbox" checked={useDaily} onChange={(e) => setUseDaily(e.target.checked)} className="accent-sky-500" />
            <span className="text-xs text-slate-300">Solo in una fascia oraria ogni giorno (es. dalle 09:00 alle 17:00)</span>
          </label>
          {useDaily && (
            <div className="flex items-center gap-2 mt-2 max-w-[300px]">
              <input type="time" value={dailyFrom} onChange={(e) => setDailyFrom(e.target.value)} className={inputCls} />
              <span className="text-slate-400 text-xs">alle</span>
              <input type="time" value={dailyTo} onChange={(e) => setDailyTo(e.target.value)} className={inputCls} />
            </div>
          )}
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}
        {okMsg && <p className="text-xs text-emerald-400">{okMsg}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveOffer}
            disabled={selectedProducts.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold"
          >
            <Timer className="w-4 h-4" />
            Metti in offerta{selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ''}
          </button>
          <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white">
            Annulla
          </button>
        </div>
      </div>

      {/* Elenco offerte */}
      <div className={`${cardCls} p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Offerte programmate ({offers.length})</h3>
          {expired.length > 0 && (
            <button type="button" onClick={removeExpired} className="text-xs font-semibold text-rose-400 hover:text-rose-300">
              Elimina scadute ({expired.length})
            </button>
          )}
        </div>

        {offers.length === 0 && <p className="text-xs text-slate-500">Nessuna offerta a tempo.</p>}

        <div className="space-y-2">
          {offers.map((p) => {
            const fo = p.flashOffer!;
            const status = getFlashStatus(fo, now);
            const st = STATUS_STYLE[status];
            return (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#0d1420] border border-[#1c2433] rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white font-semibold truncate">{p.name}</span>
                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>
                      {!flashOffersEnabled ? 'Sistema spento' : st.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className="line-through">€{p.price.toFixed(2)}</span>{' '}
                    <span className="text-emerald-400 font-semibold">€{fo.price.toFixed(2)}</span>
                    {' · '}dal {fmt(fo.startAt)} al {fmt(fo.endAt)}
                    {fo.dailyFrom && fo.dailyTo ? ` · ogni giorno ${fo.dailyFrom}–${fo.dailyTo}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleOffer(p)}
                    title={fo.active ? 'Disattiva questa offerta' : 'Attiva questa offerta'}
                    className={`p-2 rounded-lg ${fo.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editOffer(p)}
                    title="Modifica"
                    className="p-2 rounded-lg bg-[#161f30] text-slate-300 hover:text-white"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOffer(p)}
                    title="Elimina offerta"
                    className="p-2 rounded-lg bg-rose-500/15 text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
