import React, { useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';
import { Order } from '../types';
import { SHOP_EMAIL, orderMailtoHref, orderToPlainText } from '../services/orderSubmit';

interface Props {
  order: Order;
}

/**
 * Mostrato solo se l'invio automatico non è riuscito: permette comunque di
 * ordinare con la propria app email o copiando il riepilogo (funziona per tutti,
 * anche per chi non è registrato).
 */
export const OrderSendFallback: React.FC<Props> = ({ order }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = orderToPlainText(order);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* niente da fare */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mt-2 p-3 rounded-xl bg-slate-800/60 border border-slate-600/50 text-xs text-slate-200 space-y-2">
      <p className="leading-relaxed">
        Puoi comunque inviarci l'ordine da solo: scrivi a <strong>{SHOP_EMAIL}</strong> con il riepilogo qui sotto.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          id="order-fallback-mailto"
          href={orderMailtoHref(order)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Invia con la mia email</span>
        </a>
        <button
          type="button"
          id="order-fallback-copy"
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0d1420] border border-[#1c2433] hover:border-sky-400 text-slate-200 font-bold"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copiato!' : 'Copia ordine'}</span>
        </button>
      </div>
    </div>
  );
};
