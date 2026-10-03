import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, Info, Package, ShoppingBag, Box, Coffee, Layers, CheckCircle2, Palette,
  Ruler, Maximize2, Type, FileCheck, ShieldCheck, Tag, ArrowLeft, AlertCircle, Loader2,
} from 'lucide-react';
import { Packaging3DViewer, Product3DConfig } from './Packaging3DViewer';
import {
  PACKAGING_CATALOG,
  calculatePackagingEstimate,
  PackagingCategory,
} from '../lib/packagingCatalog';
import {
  fetchPackagingPrices,
  submitCustomizationRequest,
  validateLogoFile,
  PackagingPriceRow,
  LegacyProductType,
} from '../services/customization';

interface PersonalizzaViewProps {
  onBackToHome: () => void;
  onOpenLegal: (page: 'privacy' | 'termini') => void;
}

type CategoryId = PackagingCategory['id'];
type Finish = Product3DConfig['materialFinish'];

const FINISHES: { id: Finish; label: string }[] = [
  { id: 'kraft_natural', label: 'Carta Kraft Naturale' },
  { id: 'white_cardboard', label: 'Cartone Bianco' },
  { id: 'black_matt', label: 'Nero Opaco Matt' },
  { id: 'airlaid_linen', label: 'Effetto Tessuto TNT' },
];

const CARD = 'bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/20 border border-[#1c2433] rounded-3xl';
const INPUT =
  'w-full bg-[#081326] border border-[#1c2433] focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500';
const LABEL = 'block text-xs font-semibold text-slate-400 mb-1';

const CategoryIcon: React.FC<{ id: CategoryId }> = ({ id }) => {
  const cls = 'w-5 h-5';
  if (id === 'pizza_boxes') return <Box className={cls} />;
  if (id === 'pinsa_boxes') return <Package className={cls} />;
  if (id === 'napkins') return <Layers className={cls} />;
  if (id === 'cups') return <Coffee className={cls} />;
  return <ShoppingBag className={cls} />;
};

function mapProductType(id: CategoryId): LegacyProductType {
  if (id === 'cups') return 'bicchieri';
  if (id === 'napkins') return 'tovagliette';
  if (id === 'kraft_bags' || id === 'shoppers') return 'bustine';
  return 'scatole';
}

const Slider: React.FC<{
  label: string; value: number; min: number; max: number; step?: number; suffix?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1, suffix = '', onChange }) => (
  <div>
    <div className="flex justify-between text-xs font-semibold mb-1 text-slate-200">
      <span>{label}</span>
      <span className="text-sky-400">{value}{suffix}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-sky-500 cursor-pointer"
    />
  </div>
);

export const PersonalizzaView: React.FC<PersonalizzaViewProps> = ({ onBackToHome, onOpenLegal }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prezzi live impostati dall'admin (fallback: prezzi di default del catalogo)
  const [livePrices, setLivePrices] = useState<PackagingPriceRow[]>([]);
  useEffect(() => {
    let alive = true;
    fetchPackagingPrices().then((rows) => alive && setLivePrices(rows));
    return () => { alive = false; };
  }, []);

  const liveCatalog: PackagingCategory[] = useMemo(() => {
    if (livePrices.length === 0) return PACKAGING_CATALOG;
    return PACKAGING_CATALOG.map((cat) => ({
      ...cat,
      sizes: cat.sizes.map((size) => {
        const live = livePrices.find((p) => p.category_id === cat.id && p.size_key === size.key);
        return live ? { ...size, basePricePerUnit: live.base_price_per_unit, moq: live.moq } : size;
      }),
    }));
  }, [livePrices]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<CategoryId>('pizza_boxes');
  const currentCategory = useMemo(
    () => liveCatalog.find((c) => c.id === selectedCategoryId) || liveCatalog[0],
    [selectedCategoryId, liveCatalog],
  );

  const [selectedSizeKey, setSelectedSizeKey] = useState<string>(
    currentCategory.sizes[2]?.key || currentCategory.sizes[0].key,
  );
  const [selectedColorHex, setSelectedColorHex] = useState<string>(currentCategory.colors[0].hex);
  const [materialFinish, setMaterialFinish] = useState<Finish>('kraft_natural');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState(45);
  const [logoX, setLogoX] = useState(0);
  const [logoY, setLogoY] = useState(0);
  const [logoRotation, setLogoRotation] = useState(0);
  const [customText, setCustomText] = useState('');
  const [textColorHex, setTextColorHex] = useState('#1e293b');

  const [quantity, setQuantity] = useState(500);
  const [printColors, setPrintColors] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { token: string; emailSent: boolean }>(null);

  const [form, setForm] = useState({
    notes: '', customerName: '', customerCompany: '', customerEmail: '', customerPhone: '',
    privacyConsent: false,
  });

  // libera l'URL locale dell'anteprima quando cambia o il componente si smonta
  useEffect(() => () => { if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl); }, [logoPreviewUrl]);

  const estimate = useMemo(
    () => calculatePackagingEstimate(currentCategory, selectedSizeKey, quantity, printColors),
    [currentCategory, selectedSizeKey, quantity, printColors],
  );

  const handleCategoryChange = (catId: CategoryId) => {
    setSelectedCategoryId(catId);
    const cat = liveCatalog.find((c) => c.id === catId);
    if (cat) {
      setSelectedSizeKey(cat.sizes[0].key);
      setSelectedColorHex(cat.colors[0].hex);
      setQuantity(cat.sizes[0].moq);
    }
  };

  const viewer3DConfig: Product3DConfig = useMemo(() => ({
    category: selectedCategoryId, sizeKey: selectedSizeKey, colorHex: selectedColorHex,
    materialFinish, logoUrl: logoPreviewUrl, logoScale, logoX, logoY, logoRotation,
    customText, textColorHex,
  }), [selectedCategoryId, selectedSizeKey, selectedColorHex, materialFinish, logoPreviewUrl,
    logoScale, logoX, logoY, logoRotation, customText, textColorHex]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const problem = validateLogoFile(file);
    if (problem) {
      setError(problem);
      e.target.value = '';
      return;
    }
    setError(null);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!logoFile) return setError('Carica prima il tuo logo aziendale.');
    if (!form.privacyConsent) return setError("Devi accettare l'informativa sulla privacy per procedere.");
    if (quantity < estimate.moq) return setError(`La quantità minima per questa misura è ${estimate.moq} pezzi.`);

    const sizeObj = currentCategory.sizes.find((s) => s.key === selectedSizeKey);
    const colorObj = currentCategory.colors.find((c) => c.hex === selectedColorHex);
    const finishLabel = FINISHES.find((f) => f.id === materialFinish)?.label ?? materialFinish;

    const detailedNotes = [
      '[CONFIGURAZIONE PACKAGING 3D]',
      `- Categoria: ${currentCategory.name}`,
      `- Misura scelta: ${sizeObj?.label || selectedSizeKey} (${sizeObj?.dims || ''})`,
      `- Colore scelto: ${colorObj?.name || selectedColorHex}`,
      `- Finitura materiale: ${finishLabel}`,
      `- Posizione logo: scala ${logoScale}%, X ${logoX}, Y ${logoY}, rotazione ${logoRotation}°`,
      `- Testo personalizzato: ${customText || 'Nessuno'}`,
      `- Stima preventivo: €${estimate.totalPrice.toFixed(2)} (€${estimate.unitPrice.toFixed(3)}/pz, IVA esclusa)`,
      `- Note cliente: ${form.notes || 'Nessuna'}`,
    ].join('\n');

    setSubmitting(true);
    try {
      const result = await submitCustomizationRequest({
        productType: mapProductType(selectedCategoryId),
        quantity, printColors, logoFile, notes: detailedNotes,
        customerName: form.customerName, customerCompany: form.customerCompany,
        customerEmail: form.customerEmail, customerPhone: form.customerPhone,
        privacyConsent: true,
      });
      setDone({ token: result.accessToken, emailSent: result.emailSent });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message ?? "Errore durante l'invio della richiesta.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const trackingPath = `/personalizzazione/${done.token}`;
    const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}${trackingPath}` : trackingPath;
    return (
      <div className={`${CARD} max-w-xl mx-auto p-8 text-center flex flex-col items-center`}>
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white font-heading">Richiesta inviata!</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">
          Un nostro grafico ti ricontatterà a breve con la bozza e il preventivo definitivo.
          {done.emailSent ? ' Ti abbiamo inviato una email di conferma.' : ''}
        </p>

        <div className="mt-5 w-full text-left bg-[#081326] border border-[#1c2433] rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-300">Segui lo stato della tua richiesta</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Conserva questo link: è l'unico modo per ritrovarla.</p>
          <input
            readOnly value={trackingUrl} onFocus={(e) => e.currentTarget.select()}
            className="mt-2 w-full bg-transparent border border-[#1c2433] rounded-lg px-3 py-2 text-[11px] text-sky-300 font-mono"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(trackingUrl).catch(() => {})}
              className="px-3 py-1.5 rounded-lg border border-[#1c2433] text-xs text-slate-200 hover:text-white"
            >
              Copia link
            </button>
            <a
              href={trackingPath} target="_blank" rel="noreferrer"
              className="px-3 py-1.5 rounded-lg border border-[#1c2433] text-xs text-sky-300 hover:text-sky-200"
            >
              Apri pagina
            </a>
          </div>
        </div>

        <button
          onClick={onBackToHome}
          className="mt-6 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all"
        >
          Torna alla Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Intestazione */}
      <div className={`${CARD} p-6 sm:p-8`}>
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-300 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Torna alla Home
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
              Personalizza la tua Linea Packaging &amp; Delivery
            </h1>
            <p className="mt-2 text-slate-400 max-w-2xl text-sm leading-relaxed">
              Modella in tempo reale scatole pizza, pinsa romana, sacchetti kraft, shopper, tovaglioli
              e bicchieri caffè. Posiziona il tuo logo in 3D e ricevi la quotazione diretta da produttore.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-[#081326] px-4 py-3 rounded-2xl border border-[#1c2433] text-xs shrink-0">
            <ShieldCheck className="w-8 h-8 text-sky-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Stampa ad Alta Precisione</p>
              <p className="text-slate-400">Inchiostri atossici certificati alimentari</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: categoria */}
      <div>
        <span className="block text-xs font-bold text-white uppercase tracking-wide mb-3">
          1. Scegli la Categoria di Prodotto
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {liveCatalog.map((cat) => {
            const sel = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id} type="button" onClick={() => handleCategoryChange(cat.id)}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all ${
                  sel
                    ? 'bg-sky-600 text-white border-sky-500 shadow-lg shadow-sky-950/50 scale-[1.02]'
                    : 'bg-[#0d1420] hover:bg-[#13203a] text-slate-200 border-[#1c2433]'
                }`}
              >
                <div className="mb-1.5 p-2 rounded-xl bg-white/5"><CategoryIcon id={cat.id} /></div>
                <span className="text-xs font-bold leading-tight">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid xl:grid-cols-12 gap-6 items-start">
        {/* Colonna sinistra: anteprima + opzioni */}
        <div className="xl:col-span-7 space-y-6">
          <div className={`${CARD} overflow-hidden`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2433]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-sky-400" /> Anteprima 3D
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Ruota, zooma ed ispeziona il packaging da ogni angolazione</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 text-[11px] font-bold border border-sky-500/30">
                {currentCategory.name}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              <Packaging3DViewer config={viewer3DConfig} />

              <div className="mt-6 space-y-5 border-t border-[#1c2433] pt-5">
                {/* Misure */}
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <Ruler className="w-3.5 h-3.5 text-sky-400" /> Misura / Dimensioni
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentCategory.sizes.map((s) => {
                      const sel = selectedSizeKey === s.key;
                      return (
                        <button
                          key={s.key} type="button"
                          onClick={() => { setSelectedSizeKey(s.key); if (quantity < s.moq) setQuantity(s.moq); }}
                          className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all ${
                            sel
                              ? 'bg-sky-500/15 border-sky-500 ring-1 ring-sky-500 text-white'
                              : 'bg-white/5 hover:bg-white/10 border-[#1c2433] text-slate-300'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">{s.label}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{s.dims}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#081326] border border-[#1c2433] text-slate-400 whitespace-nowrap">
                            MOQ {s.moq} pz
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Colori */}
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                    <Palette className="w-3.5 h-3.5 text-sky-400" /> Colore di Fondo
                  </span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {currentCategory.colors.map((c) => {
                      const sel = selectedColorHex === c.hex;
                      return (
                        <button
                          key={c.name} type="button" onClick={() => setSelectedColorHex(c.hex)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                            sel
                              ? 'bg-sky-600 text-white border-sky-500 font-bold'
                              : 'bg-[#081326] hover:bg-white/10 text-slate-200 border-[#1c2433]'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: c.hex }} />
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                    <div className="flex items-center gap-1.5 bg-[#081326] border border-[#1c2433] rounded-xl px-2.5 py-1">
                      <input
                        type="color" value={selectedColorHex}
                        onChange={(e) => setSelectedColorHex(e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                        title="Scegli colore personalizzato"
                      />
                      <span className="text-xs text-slate-400 font-mono">{selectedColorHex.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Finitura */}
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wide mb-2 block">Finitura Materiale</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {FINISHES.map((m) => (
                      <button
                        key={m.id} type="button" onClick={() => setMaterialFinish(m.id)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          materialFinish === m.id
                            ? 'bg-sky-600 text-white border-sky-500 font-bold'
                            : 'bg-white/5 hover:bg-white/10 text-slate-200 border-[#1c2433]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className={CARD}>
            <div className="px-5 py-3 border-b border-[#1c2433]">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" /> Caricamento Logo &amp; Strumenti Grafici
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <input
                ref={fileInputRef} type="file" className="hidden"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileSelect}
              />
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto h-12 px-6 border-dashed border-2 border-sky-500/50 hover:border-sky-400 bg-sky-500/10 hover:bg-sky-500/20 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-xs transition-all"
                >
                  <Upload className="w-4 h-4 text-sky-400" />
                  {logoFile ? 'Sostituisci Logo' : 'Carica Logo Aziendale'}
                </button>
                {logoFile && (
                  <div className="flex items-center gap-2 text-xs text-slate-200 bg-white/5 px-3 py-2 rounded-xl border border-[#1c2433] truncate max-w-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{logoFile.name}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500">PNG, JPG, WebP o SVG — massimo 5 MB. Meglio con sfondo trasparente.</p>

              {logoPreviewUrl && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#081326] p-4 rounded-xl border border-[#1c2433]">
                  <Slider label="Dimensione Logo" value={logoScale} min={10} max={90} suffix="%" onChange={setLogoScale} />
                  <Slider label="Rotazione Logo" value={logoRotation} min={0} max={360} step={5} suffix="°" onChange={setLogoRotation} />
                  <Slider label="Posizione Orizzontale (X)" value={logoX} min={-50} max={50} onChange={setLogoX} />
                  <Slider label="Posizione Verticale (Y)" value={logoY} min={-50} max={50} onChange={setLogoY} />
                </div>
              )}

              <div className="pt-2 border-t border-[#1c2433] space-y-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-sky-400" /> Aggiungi Testo o Slogan (opzionale)
                </label>
                <div className="flex gap-2">
                  <input
                    className={INPUT} value={customText} maxLength={80}
                    onChange={(e) => setCustomText(e.target.value)}
                  />
                  <input
                    type="color" value={textColorHex} onChange={(e) => setTextColorHex(e.target.value)}
                    className="w-10 h-9 rounded-lg cursor-pointer border border-[#1c2433] bg-[#081326] shrink-0"
                    title="Colore testo"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonna destra: preventivo + form */}
        <div className="xl:col-span-5 space-y-6">
          <div className={`${CARD} border-sky-500/30`}>
            <div className="px-5 py-4 border-b border-[#1c2433] flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-sky-400" /> Stima Preventivo
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                Prezzo Fabbrica
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Quantità Pezzi</label>
                  <input
                    type="number" min={estimate.moq} step={100} value={quantity} className={`${INPUT} font-bold`}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setQuantity(Number.isFinite(n) ? Math.max(estimate.moq, n) : estimate.moq);
                    }}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Minimo d'ordine: {estimate.moq} pz</p>
                </div>
                <div>
                  <label className={LABEL}>Colori di Stampa</label>
                  <select
                    value={printColors} onChange={(e) => setPrintColors(parseInt(e.target.value, 10))}
                    className={`${INPUT} h-[34px] font-bold`}
                  >
                    <option value={1}>1 Colore monocromatico</option>
                    <option value={2}>2 Colori separati</option>
                    <option value={3}>Quadricromia / Full color</option>
                    <option value={4}>Stampa a caldo Metallizzata</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-[#081326] border border-[#1c2433] rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-sky-400 font-semibold uppercase tracking-wider">Prezzo Unitario Stimato</p>
                  <p className="text-2xl font-extrabold text-white">
                    € {estimate.unitPrice.toFixed(3)} <span className="text-xs font-normal text-slate-400">/pezzo</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Totale (IVA escl.)</p>
                  <p className="text-xl font-bold text-sky-400">€ {estimate.totalPrice.toFixed(2)}</p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  Stima indicativa: il prezzo definitivo viene confermato dopo la verifica tecnica del file.
                  Include impianto di stampa e bozza grafica professionale gratuita.
                </span>
              </div>
            </div>
          </div>

          <div className={CARD}>
            <div className="px-5 py-4 border-b border-[#1c2433]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-sky-400" /> Invia Richiesta Bozza &amp; Preventivo
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div>
                <label className={LABEL}>Nome e Cognome *</label>
                <input className={INPUT} required maxLength={200} value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>Nome Azienda / Attività</label>
                <input className={INPUT} maxLength={200} value={form.customerCompany}
                  onChange={(e) => setForm({ ...form, customerCompany: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Email *</label>
                  <input type="email" className={INPUT} required maxLength={255} placeholder="mario@pizzeria.it"
                    value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Telefono / WhatsApp *</label>
                  <input className={INPUT} required maxLength={50} placeholder="333 1234567"
                    value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Note &amp; Istruzioni Stampa</label>
                <textarea className={INPUT} rows={2} maxLength={1500}
                  placeholder="Tempi di consegna desiderati, pantone specifico, ecc."
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <label className="flex items-start gap-2 pt-1 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox" className="mt-0.5 h-4 w-4 accent-sky-500"
                  checked={form.privacyConsent}
                  onChange={(e) => setForm({ ...form, privacyConsent: e.target.checked })}
                />
                <span>
                  Accetto l'
                  <button type="button" onClick={() => onOpenLegal('privacy')} className="text-sky-400 underline font-semibold mx-1">
                    informativa privacy
                  </button>
                  e i
                  <button type="button" onClick={() => onOpenLegal('termini')} className="text-sky-400 underline font-semibold ml-1">
                    termini di vendita
                  </button>
                  , per l'invio della richiesta e il contatto grafico.
                </span>
              </label>

              {error && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit" disabled={submitting || !form.privacyConsent}
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50"
              >
                {submitting ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Invio in corso…</>) : 'Richiedi Bozza Grafica & Preventivo'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
