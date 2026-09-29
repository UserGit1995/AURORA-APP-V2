import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Freccetta flottante per tornare in cima alla pagina: compare solo dopo
 * aver scorso un po' (utile con migliaia di prodotti).
 */
export const ScrollToTopButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      id="scroll-to-top-btn"
      aria-label="Torna in cima"
      title="Torna in cima"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed z-40 right-4 bottom-24 sm:right-6 sm:bottom-6 w-12 h-12 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-lg shadow-sky-950/60 border border-sky-300/30 flex items-center justify-center transition-all active:scale-95"
    >
      <ArrowUp className="w-5 h-5 stroke-[2.5]" />
    </button>
  );
};
