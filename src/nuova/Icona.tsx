import React from 'react';
import { SM, BIG } from './icone';

/** Icona piccola (24x24) del set disegnato per la grafica nuova. */
export const Ic: React.FC<{ n: string; s?: number; className?: string }> = ({ n, s = 20, className }) => (
  <svg
    className={`n-si${className ? ' ' + className : ''}`}
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: SM[n] || '' }}
  />
);

/** Icona grande (48x48) a due toni, per riquadri, categorie e servizi. */
export const Bi: React.FC<{ n: string; s?: number; className?: string }> = ({ n, s = 30, className }) => (
  <svg
    className={`n-bi${className ? ' ' + className : ''}`}
    width={s}
    height={s}
    viewBox="0 0 48 48"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: BIG[n] || '' }}
  />
);

export const vib = (ms: number | number[]) => {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    // il telefono non vibra: nessun problema
  }
};

export const eur = (v: number) => '€ ' + (Number.isFinite(v) ? v : 0).toFixed(2).replace('.', ',');
