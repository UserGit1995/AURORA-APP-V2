/**
 * Piccole animazioni della grafica nuova: avviso in alto (toast) e
 * prodotto che "vola" nel carrello. Funzionano con eventi, così qualsiasi
 * schermata può usarle senza passare funzioni da un componente all'altro.
 */
export const TOAST_EVENT = 'ng-toast';

export function toast(text: string, img?: string) {
  try {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { text, img } }));
  } catch {
    // niente
  }
}

const reduced = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** Bersaglio visibile del carrello: la barra in basso sul telefono, l'header sul computer. */
function cartTarget(): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>('[data-ng-cart]'));
  return all.find((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0) || null;
}

export function flyToCart(img: HTMLImageElement | null | undefined) {
  if (!img || reduced()) return;
  const target = cartTarget();
  if (!target) return;
  const r = img.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  if (!r.width || !t.width) return;
  const f = document.createElement('img');
  f.src = img.currentSrc || img.src;
  f.className = 'n-flyimg';
  f.style.left = `${r.left}px`;
  f.style.top = `${r.top}px`;
  f.style.width = `${r.width}px`;
  f.style.height = `${r.height}px`;
  document.body.appendChild(f);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      f.style.transform = `translate(${t.left - r.left + t.width / 2 - r.width / 2}px,${t.top - r.top + t.height / 2 - r.height / 2}px) scale(.12)`;
      f.style.opacity = '.35';
    })
  );
  window.setTimeout(() => f.remove(), 800);
  window.setTimeout(() => {
    target.classList.remove('n-bump');
    void target.offsetWidth;
    target.classList.add('n-bump');
  }, 650);
}

/** Cuoricini che esplodono intorno al pulsante preferiti. */
export function burst(el: HTMLElement | null, color = '#e0245e') {
  if (!el || reduced()) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('i');
    s.className = 'n-spark';
    const a = (i / 8) * Math.PI * 2;
    s.style.left = `${r.left + r.width / 2 - 3}px`;
    s.style.top = `${r.top + r.height / 2 - 3}px`;
    s.style.setProperty('--x', `${Math.cos(a) * 26}px`);
    s.style.setProperty('--y', `${Math.sin(a) * 26}px`);
    s.style.background = color;
    document.body.appendChild(s);
    window.setTimeout(() => s.remove(), 650);
  }
}
