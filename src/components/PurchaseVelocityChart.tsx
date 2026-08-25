import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Zap,
  RotateCw,
  Info,
  CheckCircle2,
} from 'lucide-react';

export interface CategoryVelocityData {
  id: string;
  name: string;
  color: string;
  color2025: string;
  growthYoY: number;
  totalUnits2026: number;
  totalUnits2025: number;
  avgReorderDays: number;
  turnoverRate: string;
}

export const VELOCITY_CATEGORIES: CategoryVelocityData[] = [
  {
    id: 'igiene-casa',
    name: 'Igiene Casa',
    color: '#38bdf8', // Sky 400
    color2025: '#0284c7', // Sky 600
    growthYoY: 24.5,
    totalUnits2026: 4820,
    totalUnits2025: 3870,
    avgReorderDays: 14,
    turnoverRate: '12.4x / anno',
  },
  {
    id: 'detersivi',
    name: 'Detersivi & Bucato',
    color: '#818cf8', // Indigo 400
    color2025: '#4f46e5', // Indigo 600
    growthYoY: 18.2,
    totalUnits2026: 6240,
    totalUnits2025: 5280,
    avgReorderDays: 12,
    turnoverRate: '14.8x / anno',
  },
  {
    id: 'igiene-corpo',
    name: 'Igiene Corpo & Persona',
    color: '#34d399', // Emerald 400
    color2025: '#059669', // Emerald 600
    growthYoY: 14.8,
    totalUnits2026: 3150,
    totalUnits2025: 2740,
    avgReorderDays: 19,
    turnoverRate: '8.6x / anno',
  },
  {
    id: 'carta',
    name: 'Carta & Monouso',
    color: '#fbbf24', // Amber 400
    color2025: '#d97706', // Amber 600
    growthYoY: 29.1,
    totalUnits2026: 5120,
    totalUnits2025: 3965,
    avgReorderDays: 11,
    turnoverRate: '16.2x / anno',
  },
  {
    id: 'profumatori',
    name: 'Profumatori & Sanificanti',
    color: '#c084fc', // Purple 400
    color2025: '#9333ea', // Purple 600
    growthYoY: 31.4,
    totalUnits2026: 2480,
    totalUnits2025: 1885,
    avgReorderDays: 22,
    turnoverRate: '7.1x / anno',
  },
];

// Historical monthly data comparing 2025 and 2026
const MONTHLY_PURCHASE_DATA = [
  {
    month: 'Gen',
    fullName: 'Gennaio',
    'igiene-casa_2026': 340,
    'igiene-casa_2025': 290,
    detersivi_2026: 450,
    detersivi_2025: 410,
    'igiene-corpo_2026': 220,
    'igiene-corpo_2025': 200,
    carta_2026: 380,
    carta_2025: 310,
    profumatori_2026: 160,
    profumatori_2025: 130,
  },
  {
    month: 'Feb',
    fullName: 'Febbraio',
    'igiene-casa_2026': 365,
    'igiene-casa_2025': 305,
    detersivi_2026: 480,
    detersivi_2025: 420,
    'igiene-corpo_2026': 235,
    'igiene-corpo_2025': 210,
    carta_2026: 410,
    carta_2025: 325,
    profumatori_2026: 175,
    profumatori_2025: 140,
  },
  {
    month: 'Mar',
    fullName: 'Marzo',
    'igiene-casa_2026': 420,
    'igiene-casa_2025': 330,
    detersivi_2026: 530,
    detersivi_2025: 440,
    'igiene-corpo_2026': 260,
    'igiene-corpo_2025': 225,
    carta_2026: 445,
    carta_2025: 340,
    profumatori_2026: 210,
    profumatori_2025: 155,
  },
  {
    month: 'Apr',
    fullName: 'Aprile',
    'igiene-casa_2026': 460,
    'igiene-casa_2025': 355,
    detersivi_2026: 560,
    detersivi_2025: 465,
    'igiene-corpo_2026': 280,
    'igiene-corpo_2025': 240,
    carta_2026: 470,
    carta_2025: 360,
    profumatori_2026: 235,
    profumatori_2025: 170,
  },
  {
    month: 'Mag',
    fullName: 'Maggio',
    'igiene-casa_2026': 495,
    'igiene-casa_2025': 380,
    detersivi_2026: 590,
    detersivi_2025: 490,
    'igiene-corpo_2026': 305,
    'igiene-corpo_2025': 255,
    carta_2026: 510,
    carta_2025: 380,
    profumatori_2026: 260,
    profumatori_2025: 185,
  },
  {
    month: 'Giu',
    fullName: 'Giugno',
    'igiene-casa_2026': 530,
    'igiene-casa_2025': 410,
    detersivi_2026: 640,
    detersivi_2025: 520,
    'igiene-corpo_2026': 330,
    'igiene-corpo_2025': 270,
    carta_2026: 540,
    carta_2025: 405,
    profumatori_2026: 290,
    profumatori_2025: 205,
  },
  {
    month: 'Lug',
    fullName: 'Luglio',
    'igiene-casa_2026': 580,
    'igiene-casa_2025': 450,
    detersivi_2026: 690,
    detersivi_2025: 560,
    'igiene-corpo_2026': 365,
    'igiene-corpo_2025': 295,
    carta_2026: 590,
    carta_2025: 435,
    profumatori_2026: 330,
    profumatori_2025: 230,
  },
  {
    month: 'Ago',
    fullName: 'Agosto (Attuale)',
    'igiene-casa_2026': 610,
    'igiene-casa_2025': 465,
    detersivi_2026: 720,
    detersivi_2025: 580,
    'igiene-corpo_2026': 380,
    'igiene-corpo_2025': 305,
    carta_2026: 620,
    carta_2025: 450,
    profumatori_2026: 350,
    profumatori_2025: 245,
  },
  {
    month: 'Set',
    fullName: 'Settembre (Stima)',
    'igiene-casa_2026': 480,
    'igiene-casa_2025': 390,
    detersivi_2026: 580,
    detersivi_2025: 480,
    'igiene-corpo_2026': 310,
    'igiene-corpo_2025': 260,
    carta_2026: 520,
    carta_2025: 390,
    profumatori_2026: 270,
    profumatori_2025: 195,
  },
  {
    month: 'Ott',
    fullName: 'Ottobre (Stima)',
    'igiene-casa_2026': 450,
    'igiene-casa_2025': 360,
    detersivi_2026: 540,
    detersivi_2025: 450,
    'igiene-corpo_2026': 275,
    'igiene-corpo_2025': 240,
    carta_2026: 480,
    carta_2025: 360,
    profumatori_2026: 230,
    profumatori_2025: 170,
  },
  {
    month: 'Nov',
    fullName: 'Novembre (Stima)',
    'igiene-casa_2026': 490,
    'igiene-casa_2025': 395,
    detersivi_2026: 570,
    detersivi_2025: 470,
    'igiene-corpo_2026': 290,
    'igiene-corpo_2025': 250,
    carta_2026: 510,
    carta_2025: 380,
    profumatori_2026: 250,
    profumatori_2025: 180,
  },
  {
    month: 'Dic',
    fullName: 'Dicembre (Stima)',
    'igiene-casa_2026': 550,
    'igiene-casa_2025': 440,
    detersivi_2026: 630,
    detersivi_2025: 510,
    'igiene-corpo_2026': 340,
    'igiene-corpo_2025': 285,
    carta_2026: 580,
    carta_2025: 430,
    profumatori_2026: 310,
    profumatori_2025: 220,
  },
];

export const PurchaseVelocityChart: React.FC = () => {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([
    'igiene-casa',
    'detersivi',
    'carta',
  ]);
  const [viewMode, setViewMode] = useState<'both_years' | '2026_only' | 'single_category_yoy'>('both_years');
  const [focusedSingleCategoryId, setFocusedSingleCategoryId] = useState<string>('detersivi');
  const [timeRange, setTimeRange] = useState<'ytd' | 'full_year'>('ytd');

  // Filter months based on TimeRange (YTD is Gen-Ago, full_year is Gen-Dic)
  const chartData = useMemo(() => {
    if (timeRange === 'ytd') {
      return MONTHLY_PURCHASE_DATA.slice(0, 8); // Gen - Ago
    }
    return MONTHLY_PURCHASE_DATA;
  }, [timeRange]);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter((catId) => catId !== id);
      }
      return [...prev, id];
    });
  };

  // Overall KPI aggregates
  const totalVolume2026 = useMemo(() => {
    return VELOCITY_CATEGORIES.reduce((acc, cat) => acc + cat.totalUnits2026, 0);
  }, []);

  const totalVolume2025 = useMemo(() => {
    return VELOCITY_CATEGORIES.reduce((acc, cat) => acc + cat.totalUnits2025, 0);
  }, []);

  const aggregateGrowth = useMemo(() => {
    return (((totalVolume2026 - totalVolume2025) / totalVolume2025) * 100).toFixed(1);
  }, [totalVolume2026, totalVolume2025]);

  const focusedCategoryObj = useMemo(() => {
    return VELOCITY_CATEGORIES.find((c) => c.id === focusedSingleCategoryId) || VELOCITY_CATEGORIES[0];
  }, [focusedSingleCategoryId]);

  return (
    <div className="space-y-4">
      {/* Top Header Summary & KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI 1: Purchase Velocity */}
        <div className="bg-[#09152b] border border-[#142848] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Velocità Riordino</span>
            <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white font-mono">+{aggregateGrowth}%</span>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> YoY
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Tempo ciclo medio: 14.8 gg</p>
          </div>
        </div>

        {/* KPI 2: Total Volume */}
        <div className="bg-[#09152b] border border-[#142848] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Volume Totale 2026</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white font-mono">
                {totalVolume2026.toLocaleString('it-IT')}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">colli</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              vs {totalVolume2025.toLocaleString('it-IT')} colli (2025)
            </p>
          </div>
        </div>

        {/* KPI 3: Top Category Rotation */}
        <div className="bg-[#09152b] border border-[#142848] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Top Categoria</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-amber-300 truncate">Detersivi</span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">+18.2%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Rotazione magazzino: 14.8x</p>
          </div>
        </div>

        {/* KPI 4: Seasonal Spike Projection */}
        <div className="bg-[#09152b] border border-[#142848] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Picco Stagionale</span>
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <RotateCw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-purple-300">Luglio - Agosto</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">+42% disinfezione B2B</p>
          </div>
        </div>
      </div>

      {/* Chart Control Bar */}
      <div className="bg-[#071329] border border-[#132747] rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Trend di Consumo & Purchase Velocity YoY</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Live Multi-Line
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Confronto andamento consumi e frequenza di acquisto annuale per categoria merceologica.
              </p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#040c1a] border border-[#142848] rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setViewMode('both_years')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'both_years'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Multi-Categoria (2026 vs 2025)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2026_only')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === '2026_only'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Solo 2026
            </button>
            <button
              type="button"
              onClick={() => setViewMode('single_category_yoy')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'single_category_yoy'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Focus Categoria YoY
            </button>
          </div>
        </div>

        {/* Timeframe & Category Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#122340]">
          {viewMode !== 'single_category_yoy' ? (
            /* Multi Category Checkbox Pills */
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1 font-medium">Categorie:</span>
              {VELOCITY_CATEGORIES.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      isSelected
                        ? 'bg-[#0f2444] border-slate-600 text-white shadow-xs'
                        : 'bg-[#061021] border-[#13243f] text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: isSelected ? cat.color : '#475569' }}
                    />
                    <span>{cat.name}</span>
                    <span className="text-[9px] font-mono text-emerald-400">+{cat.growthYoY}%</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Single Category Select Dropdown/Pills */
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1 font-medium">Seleziona Categoria Focus:</span>
              {VELOCITY_CATEGORIES.map((cat) => {
                const isFocus = focusedSingleCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFocusedSingleCategoryId(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      isFocus
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-xs'
                        : 'bg-[#061021] border-[#13243f] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Time range selector */}
          <div className="flex items-center gap-1 bg-[#040c1a] border border-[#142848] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setTimeRange('ytd')}
              className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-colors ${
                timeRange === 'ytd'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              YTD (Gen-Ago)
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('full_year')}
              className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-colors ${
                timeRange === 'full_year'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              12 Mesi Completi
            </button>
          </div>
        </div>

        {/* Interactive Multi-Line Recharts Canvas */}
        <div className="h-64 w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#122340" vertical={false} />
              
              <XAxis
                dataKey="month"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#1b3256' }}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#1b3256' }}
                unit=" colli"
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const monthObj = MONTHLY_PURCHASE_DATA.find((m) => m.month === label);
                    return (
                      <div className="bg-[#050e1d] border border-[#1a365f] rounded-xl p-3 shadow-2xl text-left pointer-events-none min-w-56 z-50">
                        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#132747]">
                          <span className="text-xs font-bold text-white">
                            {monthObj?.fullName || label}
                          </span>
                          <span className="text-[10px] text-sky-400 font-mono">Consumo Mensile</span>
                        </div>

                        <div className="space-y-1.5">
                          {payload.map((entry: any, i: number) => {
                            const nameStr = entry.name || '';
                            const is2025 = nameStr.includes('2025');
                            const isDashed = entry.strokeDasharray;
                            return (
                              <div key={i} className="flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-slate-300 text-[11px] truncate max-w-36">
                                    {entry.name}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-white text-[11.5px]">
                                  {entry.value} <span className="text-[9.5px] text-slate-400 font-normal">colli</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine y={500} stroke="#38bdf8" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: 'Soglia Riordino Volume', fill: '#38bdf8', fontSize: 9, position: 'insideTopRight' }} />

              {/* Dynamic Lines Generation based on View Mode */}
              {viewMode === 'single_category_yoy' ? (
                <>
                  {/* Solid Line for 2026 */}
                  <Line
                    type="monotone"
                    dataKey={`${focusedSingleCategoryId}_2026`}
                    name={`${focusedCategoryObj.name} (2026)`}
                    stroke={focusedCategoryObj.color}
                    strokeWidth={3}
                    dot={{ r: 4, fill: focusedCategoryObj.color, stroke: '#071329', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: focusedCategoryObj.color, stroke: '#ffffff', strokeWidth: 2 }}
                  />
                  {/* Dashed Line for 2025 */}
                  <Line
                    type="monotone"
                    dataKey={`${focusedSingleCategoryId}_2025`}
                    name={`${focusedCategoryObj.name} (2025 - Anno Prec.)`}
                    stroke={focusedCategoryObj.color2025}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: focusedCategoryObj.color2025, stroke: '#071329', strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: focusedCategoryObj.color2025 }}
                  />
                </>
              ) : (
                selectedCategoryIds.map((catId) => {
                  const cat = VELOCITY_CATEGORIES.find((c) => c.id === catId);
                  if (!cat) return null;

                  return (
                    <React.Fragment key={catId}>
                      {/* 2026 Solid Line */}
                      <Line
                        type="monotone"
                        dataKey={`${catId}_2026`}
                        name={`${cat.name} (2026)`}
                        stroke={cat.color}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: cat.color, stroke: '#071329', strokeWidth: 1.5 }}
                        activeDot={{ r: 5, fill: cat.color, stroke: '#fff', strokeWidth: 2 }}
                      />

                      {/* 2025 Dashed Line if both_years is selected */}
                      {viewMode === 'both_years' && (
                        <Line
                          type="monotone"
                          dataKey={`${catId}_2025`}
                          name={`${cat.name} (2025)`}
                          stroke={cat.color2025}
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          strokeOpacity={0.7}
                          dot={false}
                          activeDot={{ r: 4, fill: cat.color2025 }}
                        />
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Category Legend / Velocity Breakdown */}
        <div className="mt-2 pt-2 border-t border-[#122340] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {VELOCITY_CATEGORIES.filter((cat) =>
            viewMode === 'single_category_yoy'
              ? cat.id === focusedSingleCategoryId
              : selectedCategoryIds.includes(cat.id)
          ).map((cat) => (
            <div
              key={cat.id}
              className="bg-[#050e1d] border border-[#132747] rounded-xl p-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <div>
                  <span className="font-semibold text-slate-200 text-[11px] block">{cat.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Ciclo: {cat.avgReorderDays} gg • Rot: {cat.turnoverRate}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-white font-mono text-xs block">
                  {cat.totalUnits2026} <span className="text-[10px] text-slate-400 font-normal">colli</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                  +{cat.growthYoY}% YoY
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Purchase Velocity Insights Note */}
      <div className="bg-[#061122] border border-sky-500/30 rounded-2xl p-3 px-4 flex items-start gap-3">
        <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <h5 className="font-bold text-sky-200 flex items-center gap-1.5">
            <span>Analisi Predittiva Velocità & Consumi B2B</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">
              Algoritmo Aurora AI
            </span>
          </h5>
          <p className="text-slate-300 mt-0.5 leading-relaxed">
            La categoria <strong>Carta & Monouso</strong> e <strong>Profumatori</strong> registrano la massima
            accelerazione di consumo (<span className="text-emerald-400 font-semibold">+29.1% e +31.4% YoY</span>).
            Si consiglia di programmare il riordino scorte automatico con <strong>14 giorni di anticipo</strong> rispetto
            ai picchi stagionali di Settembre/Ottobre per preservare gli scaglioni di sconto volume del listino B2B.
          </p>
        </div>
      </div>
    </div>
  );
};
