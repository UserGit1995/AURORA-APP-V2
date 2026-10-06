/**
 * Recupero automatico delle immagini che non si caricano.
 *
 * NON modifica in alcun modo il database né le immagini: agisce solo sulla
 * visualizzazione. Quando un'immagine fallisce prova, una alla volta, le
 * cause più comuni di link "rotti":
 *   - link http:// su un sito https:// (bloccato dal browser) -> https://
 *   - spazi o caratteri speciali non codificati nell'indirizzo
 *   - link di condivisione Google Drive / Dropbox che non sono link diretti
 * Se nessuna variante funziona mostra un segnaposto pulito, senza icona rotta.
 */

const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
  '<rect width="120" height="120" fill="#0d1420"/>' +
  '<g fill="none" stroke="#475569" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M38 46l22-12 22 12v28L60 86 38 74z"/><path d="M38 46l22 12 22-12M60 58v28"/></g></svg>';

export const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(PLACEHOLDER_SVG);

function candidates(raw: string): string[] {
  const out: string[] = [];
  const add = (u: string | undefined) => {
    if (u && u !== raw && !out.includes(u)) out.push(u);
  };
  const url = raw.trim();
  add(url);

  if (/^http:\/\//i.test(url)) add(url.replace(/^http:/i, 'https:'));

  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/i);
  if (drive) add(`https://lh3.googleusercontent.com/d/${drive[1]}`);

  if (/dropbox\.com/i.test(url)) {
    add(
      url
        .replace(/^http:/i, 'https:')
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace(/([?&])dl=0&?/i, '$1')
        .replace(/[?&]$/, '')
    );
  }

  try {
    add(encodeURI(decodeURI(url)));
    add(encodeURI(decodeURI(url)).replace(/^http:/i, 'https:'));
  } catch {
    /* indirizzo non decodificabile: si passa oltre */
  }
  return out;
}

export function installImageRepair(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener(
    'error',
    (ev) => {
      const img = ev.target as HTMLImageElement | null;
      if (!img || img.tagName !== 'IMG') return;

      const current = img.getAttribute('src') || '';
      if (!current || current.startsWith('data:')) return; // segnaposto o inline: niente da fare

      // Immagine "nuova" (React ha cambiato src): riparti da zero
      if (current !== img.dataset.repairSet) {
        img.dataset.repairOrig = current;
        img.dataset.repairIdx = '0';
      }
      const orig = img.dataset.repairOrig || current;
      // foto collegate al sito del fornitore: non si vedono, inutile riprovare (consuma rete e memoria)
      if (/freex\.es\//i.test(orig)) {
        img.dataset.repairSet = PLACEHOLDER_IMAGE;
        img.src = PLACEHOLDER_IMAGE;
        return;
      }
      const list = candidates(orig);
      const idx = Number(img.dataset.repairIdx || '0');

      const next = list[idx] ?? PLACEHOLDER_IMAGE;
      img.dataset.repairIdx = String(idx + 1);
      img.dataset.repairSet = next;
      img.removeAttribute('srcset');
      img.src = next;
    },
    true // gli errori delle immagini non "risalgono": vanno intercettati in fase di cattura
  );
}
