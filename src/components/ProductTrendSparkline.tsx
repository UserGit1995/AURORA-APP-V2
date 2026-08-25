import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { TrendingUp, DollarSign, Activity, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Product } from '../types';

interface ProductTrendSparklineProps {
  product: Product;
}

interface TrendDataPoint {
  month: string;
  price: number;
  demand: number; // monthly ordered cases
  stockLevel: number;
}

export const ProductTrendSparkline: React.FC<ProductTrendSparklineProps> = ({ product }) => {
  const [activeMetric, setActiveMetric] = useState<'price' | 'demand'>('price');

  // Deterministically generate 6-month historical trend based on product properties
  const trendData: TrendDataPoint[] = useMemo(() => {
    const months = ['Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago'];
    
    // Use hash of product ID to create consistent variations
    let hash = 0;
    for (let i = 0; i < product.id.length; i++) {
      hash = (hash << 5) - hash + product.id.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);

    const basePrice = product.price;
    const baseDemand = Math.max(12, Math.round(((seed % 35) + 15)));
    const hasDiscount = Boolean(product.discountPercent);

    return months.map((month, idx) => {
      // Month-specific variation factor
      const priceVariationFactor = (Math.sin(seed + idx * 1.3) * 0.04);
      let price = Math.round((basePrice * (1 + priceVariationFactor)) * 100) / 100;
      
      // If product currently has a discount, show previous months slightly higher
      if (hasDiscount && idx < 4) {
        price = Math.round((basePrice * (1 + (product.discountPercent! / 100) * 0.8)) * 100) / 100;
      } else if (idx === 5) {
        price = basePrice;
      }

      // Demand fluctuation
      const demandVariation = Math.round(Math.cos(seed + idx * 1.1) * (baseDemand * 0.25));
      const demand = Math.max(8, baseDemand + demandVariation + (idx >= 3 ? 6 : 0));
      const stockLevel = Math.max(20, product.stock + (5 - idx) * 15);

      return {
        month,
        price,
        demand,
        stockLevel,
      };
    });
  }, [product]);

  const priceStats = useMemo(() => {
    const prices = trendData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const first = prices[0];
    const last = prices[prices.length - 1];
    const diff = last - first;
    const percentDiff = first > 0 ? (diff / first) * 100 : 0;
    return { min, max, percentDiff, isDiscounted: product.discountPercent };
  }, [trendData, product]);

  const demandStats = useMemo(() => {
    const demands = trendData.map((d) => d.demand);
    const total = demands.reduce((a, b) => a + b, 0);
    const avg = Math.round(total / demands.length);
    const first = demands[0];
    const last = demands[demands.length - 1];
    const diff = last - first;
    const percentDiff = first > 0 ? (diff / first) * 100 : 0;
    return { avg, total, percentDiff };
  }, [trendData]);

  return (
    <div className="mt-3.5 bg-[#081326] border border-[#142848] rounded-xl p-3">
      {/* Sparkline Header & Switcher */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Trend Storico (6 Mesi)
          </span>
        </div>

        <div className="flex items-center bg-[#050c18] border border-[#142848] rounded-lg p-0.5">
          <button
            id="sparkline-price-tab"
            type="button"
            onClick={() => setActiveMetric('price')}
            className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-colors ${
              activeMetric === 'price'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Prezzo
          </button>
          <button
            id="sparkline-demand-tab"
            type="button"
            onClick={() => setActiveMetric('demand')}
            className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-colors ${
              activeMetric === 'demand'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Domanda B2B
          </button>
        </div>
      </div>

      {/* Mini Stats Summary Pill */}
      <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5 px-0.5">
        {activeMetric === 'price' ? (
          <>
            <span className="text-slate-400 text-[10.5px]">
              Min: <strong className="text-white font-mono">€{priceStats.min.toFixed(2)}</strong> / Max: <strong className="text-white font-mono">€{priceStats.max.toFixed(2)}</strong>
            </span>
            <span className="inline-flex items-center gap-0.5 font-medium text-[10.5px]">
              {priceStats.percentDiff < -0.5 ? (
                <span className="text-emerald-400 inline-flex items-center">
                  <ArrowDownRight className="w-3 h-3" />
                  {Math.abs(priceStats.percentDiff).toFixed(1)}% rispetto a Mar
                </span>
              ) : priceStats.percentDiff > 0.5 ? (
                <span className="text-amber-400 inline-flex items-center">
                  <ArrowUpRight className="w-3 h-3" />
                  +{priceStats.percentDiff.toFixed(1)}%
                </span>
              ) : (
                <span className="text-sky-300 inline-flex items-center">
                  <Minus className="w-3 h-3" />
                  Prezzo stabile
                </span>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="text-slate-400 text-[10.5px]">
              Media mensile: <strong className="text-white font-mono">{demandStats.avg} colli</strong>
            </span>
            <span className="inline-flex items-center gap-0.5 font-medium text-[10.5px]">
              {demandStats.percentDiff >= 0 ? (
                <span className="text-emerald-400 inline-flex items-center">
                  <ArrowUpRight className="w-3 h-3" />
                  +{demandStats.percentDiff.toFixed(0)}% volume vendite
                </span>
              ) : (
                <span className="text-slate-400 inline-flex items-center">
                  <ArrowDownRight className="w-3 h-3" />
                  {demandStats.percentDiff.toFixed(0)}%
                </span>
              )}
            </span>
          </>
        )}
      </div>

      {/* Sparkline Canvas Chart */}
      <div className="h-16 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              tickLine={false} 
              axisLine={false} 
              tick={{ fontSize: 9, fill: '#64748b' }}
              dy={2}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as TrendDataPoint;
                  return (
                    <div className="bg-[#050c18] border border-[#1b345b] p-2 rounded-lg shadow-xl text-left pointer-events-none">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{data.month} 2026</p>
                      {activeMetric === 'price' ? (
                        <p className="text-xs font-bold text-sky-300 font-mono">
                          €{data.price.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ {product.unit}</span>
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-emerald-300 font-mono">
                          {data.demand} colli <span className="text-[10px] text-slate-400 font-normal">ordinati</span>
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {activeMetric === 'price' ? (
              <Area
                type="monotone"
                dataKey="price"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#priceGradient)"
                isAnimationActive={true}
              />
            ) : (
              <Area
                type="monotone"
                dataKey="demand"
                stroke="#34d399"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#demandGradient)"
                isAnimationActive={true}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
