import React, { useEffect, useState } from 'react';
import { Tag, Save, Loader2, Check, AlertCircle } from 'lucide-react';
import { PACKAGING_CATALOG } from '../lib/packagingCatalog';
import { fetchPackagingPrices, savePackagingPrice, PackagingPriceRow } from '../services/customization';

const PANEL_CARD = 'bg-[#0d1420] border border-[#1c2433] rounded-2xl';
const INPUT =
  'w-full bg-[#081326] border border-[#1c2433] focus:border-sky-500 focus:outline-none rounded-lg px-3 py-2 text-sm text-white';

interface RowProps {
  categoryId: string;
  sizeKey: string;
  label: string;
  dims: string;
  initialPrice: number;
  initialMoq: number;
  isCustom: boolean;
  onSaved: () => void;
}

const PriceRow: React.FC<RowProps> = ({
  categoryId, sizeKey, label, dims, initialPrice, initialMoq, isCustom, onSaved,
}) => {
  const [price, setPrice] = useState(String(initialPrice));
  const [moq, setMoq] = useState(String(initialMoq));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // se i dati arrivano dopo il primo render (caricamento dal database), riallinea i campi
  useEffect(() => { setPrice(String(initialPrice)); setMoq(String(initialMoq)); }, [initialPrice, initialMoq]);

  const priceNum = parseFloat(price.replace(',', '.'));
  const moqNum = parseInt(moq, 10);
  const dirty = priceNum !== initialPrice || moqNum !== initialMoq;
  const valid = priceNum > 0 && Number.isInteger(moqNum) && moqNum >= 1;

  async function handleSave() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await savePackagingPrice(categoryId, sizeKey, priceNum, moqNum);
    setSaving(false);
    if (!res.ok) return setError(res.error ?? 'Salvataggio non riuscito.');
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="p-3 rounded-xl bg-[#081326] border border-[#1c2433]">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-[11px] text-slate-400">
            {dims}
            {isCustom && <span className="ml-2 text-sky-400">• prezzo personalizzato</span>}
          </p>
        </div>
        <div className="sm:w-32">
          <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">€ / unità</label>
          <input className={INPUT} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="sm:w-28">
          <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">Minimo (pz)</label>
          <input className={INPUT} inputMode="numeric" value={moq} onChange={(e) => setMoq(e.target.value)} />
        </div>
        <button
          type="button" onClick={handleSave} disabled={!dirty || !valid || saving}
          className="h-[38px] px-4 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Salvato' : 'Salva'}
        </button>
      </div>
      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
        </p>
      )}
    </div>
  );
};

export const CustomizationPricingPanel: React.FC = () => {
  const [prices, setPrices] = useState<PackagingPriceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setPrices(await fetchPackagingPrices());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-left">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Tag className="w-5 h-5 text-sky-400" /> Prezzi Personalizzazione Packaging
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Il prezzo base di ogni misura, per unità, lo decidi tu. Sconti quantità e supplemento colori di
          stampa restano calcolati in automatico sopra questo prezzo nella pagina "Personalizza".
        </p>
      </div>

      {loading && <p className="text-sm text-slate-400">Carico i prezzi…</p>}

      {PACKAGING_CATALOG.map((cat) => (
        <div key={cat.id} className={`${PANEL_CARD} p-4 space-y-3`}>
          <h3 className="text-base font-semibold text-white">{cat.name}</h3>
          {cat.sizes.map((size) => {
            const live = prices.find((p) => p.category_id === cat.id && p.size_key === size.key);
            return (
              <PriceRow
                key={size.key}
                categoryId={cat.id}
                sizeKey={size.key}
                label={size.label}
                dims={size.dims}
                initialPrice={live ? live.base_price_per_unit : size.basePricePerUnit}
                initialMoq={live ? live.moq : size.moq}
                isCustom={!!live}
                onSaved={load}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
