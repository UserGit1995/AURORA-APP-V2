/**
 * Ricerca prodotti "all'italiana".
 *
 *   - si ignorano maiuscole, accenti e punteggiatura;
 *   - la frase viene divisa in parole e TUTTE devono comparire (in qualunque ordine);
 *     se nessun prodotto le contiene tutte, si mostrano quelli che ne contengono di più;
 *   - singolare/plurale/maschile/femminile si equivalgono ("sgrassatore" = "sgrassatori");
 *   - basta l'inizio della parola ("sgrass", "tov", "bicch");
 *   - si cercano nome, codice, categoria, marca e tipologia: scrivendo una marca o una
 *     categoria escono tutti i suoi prodotti;
 *   - le abbreviazioni del fornitore vengono riconosciute ("SGR." = sgrassatore,
 *     "TOV." = tovaglioli, "BICCH." = bicchieri);
 *   - parole della stessa famiglia si trovano a vicenda ("sgrassatori" trova anche
 *     "sgrassante", "sacchi" trova anche "sacchetti", "buste" e "shopper");
 *   - un errore di battitura in parole lunghe viene tollerato ("sgrasatore");
 *   - i risultati escono in ordine di pertinenza.
 */

export interface SearchableProduct {
  id?: string;
  name: string;
  code?: string;
  category?: string;
  subCategoryName?: string;
  subSubCategoryName?: string;
}

const STOPWORDS = new Set(['i', 'di', 'da', 'del', 'della', 'dei', 'degli', 'delle', 'per', 'con', 'il', 'lo', 'la', 'le', 'gli', 'un', 'una', 'uno', 'e', 'a', 'in', 'al', 'alla', 'ai', 'agli', 'alle', 'su', 'x']);

/**
 * Famiglie di parole: radici che si trovano a vicenda.
 * Se la parola cercata inizia con una radice di un gruppo, valgono anche le altre.
 */
const WORD_FAMILIES: string[][] = [
  ['sgrass', 'degreas'],
  ['bicchier', 'bicch'],
  ['tovagliol', 'tov', 'salviett'],
  ['sacc', 'sacch', 'bust', 'shopper'],
  ['piatt', 'piattin', 'fondin'],
  ['posat', 'forchett', 'coltell', 'cucchia'],
  ['detersiv', 'deterg'],
  ['candeggin', 'varechin', 'ipoclorit', 'clorat'],
  ['rotolon', 'asciugatutt', 'bobin'],
  ['vaschett', 'contenitor', 'vassoi'],
  ['pellicol', 'film'],
  ['stagnol', 'allumini'],
  ['guant'],
  ['spugn'],
  ['cannucc', 'cannuc'],
  ['igienizz', 'disinfett', 'sanific', 'germicid'],
  ['anticalc', 'decalcif'],
  ['lavastovigl'],
  ['bucat', 'lavatric', 'lavatrice'],
  ['shampo'],
  ['bagnoschium', 'docciaschium', 'bagnodocc'],
  ['deodorant', 'deo'],
  ['dentifric'],
  ['profumator', 'diffusor', 'deoambient', 'profumaambient'],
  ['insetticid', 'antizanzar', 'zanzar', 'antitarm'],
  ['mop', 'mocio', 'moci'],
  ['scop', 'scopon'],
  ['ammorbident'],
];

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

/** Radici "sorelle" della parola cercata (famiglie di parole). */
const familyCache = new Map<string, string[]>();
function familyOf(token: string): string[] {
  const cached = familyCache.get(token);
  if (cached) return cached;
  const out = new Set<string>();
  if (token.length >= 3 && !/\d/.test(token)) {
    for (const group of WORD_FAMILIES) {
      if (group.some((root) => token.startsWith(root))) {
        for (const root of group) out.add(root);
      }
    }
  }
  const arr = Array.from(out);
  familyCache.set(token, arr);
  return arr;
}

/** true se a e b differiscono al massimo di un carattere (aggiunto, tolto, cambiato o scambiato). */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true; // cambiato
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // scambiato
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

interface Indexed {
  key: string;
  name: string;
  nameWords: string[];
  abbreviations: string[]; // parole scritte con il punto nel nome ("sgr.", "tov.", "bicch.")
  code: string;
  otherWords: string[]; // categoria, marca, tipologia
}

const cache = new WeakMap<object, Indexed>();

/** Parole di un testo, comprese le sigle scritte con i punti unite ("Ho.Re.Ca" -> "ho re ca" + "horeca"). */
function wordsOf(text: string): string[] {
  const plain = normalizeText(text).split(' ').filter(Boolean);
  const joined = normalizeText(String(text ?? '').replace(/(\w)[.'’](?=\w)/g, '$1')).split(' ').filter(Boolean);
  return Array.from(new Set([...plain, ...joined]));
}

function indexOf(p: SearchableProduct): Indexed {
  const key = [p.name, p.code, p.category, p.subCategoryName, p.subSubCategoryName].join('|');
  let ix = cache.get(p);
  if (!ix || ix.key !== key) {
    const name = normalizeText(p.name);
    const lowered = String(p.name ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const abbreviations = Array.from(lowered.matchAll(/([a-z]{3,})\./g)).map((m) => m[1]);
    ix = {
      key,
      name,
      nameWords: wordsOf(String(p.name ?? '')),
      abbreviations,
      code: normalizeText(p.code).replace(/ /g, ''),
      otherWords: wordsOf([p.category, p.subCategoryName, p.subSubCategoryName].filter(Boolean).join(' ')),
    };
    cache.set(p, ix);
  }
  return ix;
}

/** Quanto bene una parola cercata corrisponde a una parola del prodotto (0 = per niente). */
function scoreWord(w: string, token: string, stem: string, family: string[]): number {
  if (w === token) return 6; // parola identica
  if (stemToken(w) === stem) return 5; // singolare/plurale
  if (w.startsWith(stem)) return 4; // inizio parola ("sgrass")
  if (family.length > 0 && family.some((root) => w.startsWith(root))) return 3; // stessa famiglia
  if (stem.length >= 4 && w.includes(stem)) return 2; // dentro la parola
  if (token.length >= 5 && w.length >= 5 && w[0] === token[0] && (withinOneEdit(w, token) || withinOneEdit(stemToken(w), stem))) {
    return 1; // errore di battitura
  }
  return 0;
}

function scoreToken(ix: Indexed, token: string): number {
  const stem = stemToken(token);
  const family = familyOf(token);
  let best = 0;

  for (const w of ix.nameWords) {
    const s = scoreWord(w, token, stem, family);
    if (s > best) best = s;
    if (best === 6) return best;
  }

  // abbreviazioni del fornitore: "SGR." vale per "sgrassatore", "TOV." per "tovaglioli"
  if (best < 4 && token.length >= 3) {
    for (const abbr of ix.abbreviations) {
      if (token.startsWith(abbr) || family.some((root) => root.startsWith(abbr) || abbr.startsWith(root))) {
        best = Math.max(best, 4);
        break;
      }
    }
  }

  if (ix.code) {
    const compactToken = token.replace(/ /g, '');
    if (ix.code === compactToken) best = Math.max(best, 6);
    else if (compactToken.length >= 3 && ix.code.startsWith(compactToken)) best = Math.max(best, 5);
  }

  // categoria, marca, tipologia: scrivendo "chanteclair" o "sgrassatori" escono tutti i loro prodotti
  for (const w of ix.otherWords) {
    const s = scoreWord(w, token, stem, family);
    if (s > 0) best = Math.max(best, Math.max(1, s - 1));
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

/** Punteggio "parziale": quante parole cercate sono state trovate (per la ricerca di riserva). */
function partialScore(p: SearchableProduct, tokens: string[]): { found: number; total: number } {
  const ix = indexOf(p);
  let found = 0;
  let total = 0;
  for (const t of tokens) {
    const s = scoreToken(ix, t);
    if (s > 0) {
      found++;
      total += s;
    }
  }
  return { found, total };
}

/**
 * Punteggio di tutti i prodotti che corrispondono alla ricerca.
 * Prima si cercano i prodotti che contengono TUTTE le parole; se non ce n'è
 * nessuno, si mostrano quelli che ne contengono di più (mai una pagina vuota
 * solo perché una parola è scritta in modo diverso).
 */
export function scoreAllProducts<T extends SearchableProduct>(products: T[], query: string): Map<T, number> {
  const tokens = parseQuery(query);
  const result = new Map<T, number>();
  if (tokens.length === 0) {
    products.forEach((p) => result.set(p, 1));
    return result;
  }
  for (const p of products) {
    const s = scoreProduct(p, tokens);
    if (s > 0) result.set(p, s);
  }
  if (result.size > 0 || tokens.length < 2) return result;

  let bestFound = 0;
  const partial: { p: T; found: number; total: number }[] = [];
  for (const p of products) {
    const r = partialScore(p, tokens);
    if (r.found > 0) {
      partial.push({ p, ...r });
      if (r.found > bestFound) bestFound = r.found;
    }
  }
  for (const r of partial) {
    if (r.found === bestFound) result.set(r.p, r.total);
  }
  return result;
}

/** Restituisce solo i prodotti che corrispondono, dal più pertinente al meno. */
export function searchProducts<T extends SearchableProduct>(products: T[], query: string): T[] {
  const tokens = parseQuery(query);
  if (tokens.length === 0) return products;
  const scores = scoreAllProducts(products, query);
  const order = new Map<T, number>();
  products.forEach((p, i) => order.set(p, i));
  return Array.from(scores.keys()).sort(
    (a, b) => (scores.get(b) || 0) - (scores.get(a) || 0) || (order.get(a) || 0) - (order.get(b) || 0)
  );
}
