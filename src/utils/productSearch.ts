/**
 * Ricerca prodotti "all'italiana".
 *
 * Prima la ricerca cercava la frase scritta ESATTAMENTE dentro il nome:
 *   - "sgrassatori" non trovava "Sgrassatore" (e viceversa);
 *   - "detersivo piatti" non trovava "Piatti Detersivo Limone";
 *   - le maiuscole/accenti/punteggiatura facevano perdere risultati.
 *
 * Ora:
 *   - si ignorano maiuscole, accenti e punteggiatura;
 *   - la frase viene divisa in parole e TUTTE devono comparire (in qualunque ordine);
 *   - singolare/plurale/maschile/femminile si equivalgono ("sgrassatore" = "sgrassatori",
 *     "bicchiere" = "bicchieri", "lavatrice" = "lavatrici");
 *   - si può scrivere anche solo l'inizio della parola ("sgrass");
 *   - i risultati escono in ordine di pertinenza (prima le corrispondenze migliori).
 */

export interface SearchableProduct {
  name: string;
  code?: string;
  category?: string;
  subCategoryName?: string;
  subSubCategoryName?: string;
}

const STOPWORDS = new Set(['i', 'di', 'da', 'del', 'della', 'dei', 'per', 'con', 'il', 'lo', 'la', 'le', 'gli', 'un', 'una', 'e', 'a', 'in', 'al']);

/** minuscolo, senza accenti, solo lettere/numeri separati da singoli spazi */
export function normalizeText(input: unknown): string {
  return String(input ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Radice "leggera" di una parola italiana, usata come prefisso:
 * toglie la vocale finale (o/a/i/e) che distingue singolare/plurale/genere.
 */
export function stemToken(token: string): string {
  if (token.length <= 3) return token;
  if (/\d/.test(token)) return token; // misure e codici (90x120, 500ml, 1kg) restano interi
  let s = token;
  if (/[aeio]$/.test(s)) s = s.slice(0, -1);
  // plurali in -chi/-ghi (sacchi/sacco, funghi/fungo): "sacch" -> "sacc"
  if (/[cg]h$/.test(s) && s.length >= 5) s = s.slice(0, -1);
  return s;
}

export function parseQuery(query: string): string[] {
  const words = normalizeText(query).split(' ').filter(Boolean);
  const meaningful = words.filter((w) => !(STOPWORDS.has(w) && words.length > 1));
  return meaningful.length > 0 ? meaningful : words;
}

interface Indexed {
  name: string;
  nameWords: string[];
  code: string;
  other: string;
}

const cache = new WeakMap<object, Indexed>();

function indexOf(p: SearchableProduct): Indexed {
  let ix = cache.get(p);
  if (!ix || ix.name !== normalizeText(p.name)) {
    const name = normalizeText(p.name);
    ix = {
      name,
      nameWords: name.split(' ').filter(Boolean),
      code: normalizeText(p.code),
      other: normalizeText([p.category, p.subCategoryName, p.subSubCategoryName].filter(Boolean).join(' ')),
    };
    cache.set(p, ix);
  }
  return ix;
}

/** Quanto bene una parola cercata corrisponde al prodotto (0 = per niente). */
function scoreToken(ix: Indexed, token: string): number {
  const stem = stemToken(token);
  let best = 0;

  for (const w of ix.nameWords) {
    if (w === token) best = Math.max(best, 6); // parola identica
    else if (stemToken(w) === stem) best = Math.max(best, 5); // singolare/plurale
    else if (w.startsWith(stem)) best = Math.max(best, 4); // inizio parola ("sgrass")
    else if (stem.length >= 4 && w.includes(stem)) best = Math.max(best, 2); // dentro la parola
  }
  if (best >= 4) return best;

  if (ix.code && (ix.code === token || ix.code.startsWith(token))) best = Math.max(best, 5);
  if (ix.other) {
    const otherWords = ix.other.split(' ');
    for (const w of otherWords) {
      if (w === token || stemToken(w) === stem) best = Math.max(best, 2);
      else if (w.startsWith(stem)) best = Math.max(best, 1);
    }
  }
  return best;
}

/** Punteggio complessivo: 0 se anche una sola parola cercata non viene trovata. */
export function scoreProduct(p: SearchableProduct, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const ix = indexOf(p);
  let total = 0;
  for (const t of tokens) {
    const s = scoreToken(ix, t);
    if (s === 0) return 0;
    total += s;
  }
  // bonus: la frase intera compare nel nome / il nome inizia con la ricerca
  const phrase = tokens.join(' ');
  if (ix.name.includes(phrase)) total += 3;
  if (ix.name.startsWith(phrase)) total += 2;
  return total;
}

/** Restituisce solo i prodotti che corrispondono, dal più pertinente al meno. */
export function searchProducts<T extends SearchableProduct>(products: T[], query: string): T[] {
  const tokens = parseQuery(query);
  if (tokens.length === 0) return products;
  const scored: { p: T; s: number; i: number }[] = [];
  products.forEach((p, i) => {
    const s = scoreProduct(p, tokens);
    if (s > 0) scored.push({ p, s, i });
  });
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  return scored.map((x) => x.p);
}
