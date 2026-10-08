import React, { useEffect, useRef, useState } from 'react';
import { Share2, Check, Link2, Mail, Send, MessageCircle, Globe } from 'lucide-react';
import type { Product } from '../types';
import { productShareUrl } from '../utils/deepLinks';

/**
 * Pulsante "Condividi": manda il link diretto a QUESTO prodotto.
 * - Sul telefono apre il menu di condivisione del sistema (WhatsApp, Instagram, Telegram, SMS…).
 * - Dove quel menu non esiste (PC, alcune app) mostra un piccolo elenco con WhatsApp,
 *   Telegram, Facebook, Email e "Copia link" (da incollare su Instagram o dove si vuole).
 * Chi apre il link vede subito la scheda di questo prodotto.
 */
export const ShareProductButton: React.FC<{ product: Product; buttonClassName?: string }> = ({ product, buttonClassName }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const url = productShareUrl(product.id);
  const text = `Guarda questo prodotto su Aurora: ${product.name}`;
  const full = `${text}\n${url}`;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copia questo link:', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onShare = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
    if (nav.share && isTouch) {
      try {
        await nav.share({ title: product.name, text, url });
        return;
      } catch (e) {
        // annullato dall'utente: non fare nulla
        if ((e as Error)?.name === 'AbortError') return;
      }
    }
    setOpen((v) => !v);
  };

  const enc = encodeURIComponent;
  const links = [
    { label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4 text-emerald-400" />, href: `https://wa.me/?text=${enc(full)}` },
    { label: 'Telegram', icon: <Send className="w-4 h-4 text-sky-400" />, href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
    { label: 'Facebook', icon: <Globe className="w-4 h-4 text-blue-400" />, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: 'Email', icon: <Mail className="w-4 h-4 text-slate-300" />, href: `mailto:?subject=${enc(product.name)}&body=${enc(full)}` },
  ];

  return (
    <div className="relative" ref={boxRef}>
      <button
        id="modal-share-product"
        type="button"
        onClick={onShare}
        className={
          buttonClassName ??
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-[#1c2433] bg-[#0d1420] text-slate-400 hover:text-white hover:border-sky-500/40 transition-colors'
        }
        title="Condividi questo prodotto"
      >
        <Share2 className="w-3.5 h-3.5 shrink-0" />
        <span>Condividi</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-56 max-w-[80vw] rounded-2xl border border-[#1c2433] bg-[#0b121d] p-1.5 shadow-2xl">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              {l.icon}
              {l.label}
            </a>
          ))}
          <button
            type="button"
            onClick={copy}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4 text-slate-300" />}
            {copied ? 'Link copiato' : 'Copia link (Instagram e altri)'}
          </button>
        </div>
      )}
    </div>
  );
};
