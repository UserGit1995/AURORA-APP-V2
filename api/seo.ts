/**
 * Funzione serverless Vercel: rende il catalogo LEGGIBILE DA GOOGLE.
 *
 * L'app è una "single page app": a Google arriva sempre la stessa pagina vuota, qualunque
 * indirizzo apra. Questa funzione genera al volo, dai dati veri di Supabase:
 *
 *   /prodotto/<id>      -> la pagina dell'app con titolo, descrizione, prezzo e dati
 *                          strutturati (schema.org Product/Offer) di QUEL prodotto
 *   /forniture          -> elenco delle pagine per attività
 *   /forniture/<slug>   -> pagina "Forniture per pescherie a Roma" ecc. con i prodotti
 *                          presi in automatico dal catalogo (prezzi sempre aggiornati)
 *   /sitemap.xml        -> mappa del sito con TUTTI i prodotti attivi, per Google
 *   /recensione         -> porta il cliente a lasciare una recensione su Google
 *   /api/seo?type=img&id=<id> -> foto del prodotto (anche quelle salvate dentro il database)
 *
 * Collegamenti in vercel.json (rewrites). Nessuna variabile obbligatoria:
 *   SITE_URL            (facoltativa) dominio principale, default https://www.aurora-srls.it
 *   GOOGLE_REVIEW_URL   (facoltativa) link "Chiedi recensioni" della scheda Google dell'attività.
 *                       Se manca, /recensione apre la ricerca dell'attività su Google Maps.
 *
 * Solo LETTURA dal database (nessun INSERT/UPDATE/DELETE).
 */

const FALLBACK_URL = 'https://hkpqvggvqzvpkzeqmtga.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcHF2Z2d2cXp2cGt6ZXFtdGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2ODc3MjUsImV4cCI6MjEwMDI2MzcyNX0.1Lgr756jgYTo-dKsrlAOQpRkwvyULbV5Dt-xnpPrxss';
const SB_URL = process.env.VITE_SUPABASE_URL || FALLBACK_URL;
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;
const SITE = (process.env.SITE_URL || 'https://www.aurora-srls.it').replace(/\/+$/, '');

const BIZ = {
  name: 'Aurora S.r.l.s',
  street: 'Via di Prato Lungo Casilino 128/130',
  cap: '00132',
  city: 'Roma',
  phone: '+39 345 600 0865',
  phoneShow: '345 600 0865',
};
const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(`${BIZ.name} ${BIZ.street} ${BIZ.cap} ${BIZ.city}`);

// ---------------------------------------------------------------------------
// Pagine per attività. `kw` = parole cercate nel NOME dei prodotti del catalogo.
// ---------------------------------------------------------------------------
type Landing = { slug: string; title: string; short: string; intro: string; kw: string[] };
const LANDINGS: Landing[] = [
  { slug: 'pescherie', title: 'Forniture per pescherie a Roma', short: 'Pescherie',
    intro: 'Vaschette in polistirolo, guanti in nitrile, bobine in carta, sacchetti per alimenti e per il ghiaccio: tutto il materiale di consumo per il banco del pesce, con consegna a Roma.',
    kw: ['vaschetta xps', 'polistirolo', 'guanti nitrile', 'bobina', 'sacchetti ghiaccio', 'sacchetto alimenti', 'cuffia'] },
  { slug: 'macellerie', title: 'Forniture per macellerie a Roma', short: 'Macellerie',
    intro: 'Carta paglia, coprimacchia, vaschette XPS, sacchetti per alimenti e guanti monouso per macellerie e gastronomie di Roma.',
    kw: ['carta paglia', 'coprimacchia', 'vaschetta', 'sacchetto alimenti', 'guanti nitrile', 'guanti monouso'] },
  { slug: 'forni-panifici', title: 'Forniture per forni e panifici a Roma', short: 'Forni e panifici',
    intro: 'Sacchetti per il pane, carta velina, carta forno, buste per alimenti e guanti monouso per forni e panifici di Roma.',
    kw: ['sacchetti pane', 'sacchetto pane', 'velina', 'carta forno', 'sacchetto alimenti', 'sacchetti alimenti', 'guanti'] },
  { slug: 'pasticcerie-cornetterie', title: 'Forniture per pasticcerie e cornetterie a Roma', short: 'Pasticcerie e cornetterie',
    intro: 'Vassoi in cartone e dorati, scatole porta panettone, pirottini, carta forno, sacchetti e tovaglioli per pasticcerie e cornetterie di Roma.',
    kw: ['vassoi', 'vassoio', 'panettone', 'pirottin', 'carta forno', 'velina', 'tovagliol'] },
  { slug: 'bar-caffetterie', title: 'Forniture per bar e caffetterie a Roma', short: 'Bar e caffetterie',
    intro: 'Bicchieri e bicchierini, palette da caffè, cannucce, tovaglioli e rotoli per la cassa: il monouso per il bancone del bar, consegnato a Roma.',
    kw: ['bicchier', 'palett', 'cannucc', 'tovagliol', 'rotolo termico', 'rotoli termici'] },
  { slug: 'ristoranti-horeca', title: 'Monouso Ho.Re.Ca per ristoranti e cucine a Roma', short: 'Ristoranti e cucine',
    intro: 'Vaschette in alluminio e PP, contenitori in kraft e polpa, posate e tovaglioli per ristoranti, pizzerie e delivery a Roma.',
    kw: ['vaschett', 'contenitor', 'posate', 'alluminio', 'kraft', 'piatti', 'tovagliol'] },
  { slug: 'rosticcerie-tavole-calde', title: 'Forniture per rosticcerie e tavole calde a Roma', short: 'Rosticcerie e tavole calde',
    intro: 'Box per fritti e patatine, vaschette in alluminio, coni e sacchetti antigrasso per rosticcerie, friggitorie e tavole calde di Roma.',
    kw: ['fritti', 'patatine', 'antigrasso', 'alluminio', 'cono', 'box'] },
  { slug: 'gelaterie', title: 'Forniture per gelaterie a Roma', short: 'Gelaterie',
    intro: 'Coppette in carta, palette per gelato, coni, cucchiaini e tovaglioli per gelaterie e yogurterie di Roma.',
    kw: ['coppett', 'palette gelato', 'cono', 'cucchiain', 'tovagliol'] },
  { slug: 'chioschi', title: 'Forniture per chioschi e stabilimenti a Roma', short: 'Chioschi',
    intro: 'Bicchieri in PET e plastica, cannucce, tovaglioli, vaschette per fritti e palette per chioschi, stabilimenti balneari e food truck di Roma.',
    kw: ['bicchieri pet', 'bicchieri in pet', 'bicchier', 'cannucc', 'tovagliol', 'fritti', 'palett'] },
  { slug: 'hotel', title: 'Forniture per hotel a Roma', short: 'Hotel',
    intro: 'Kit cortesia, saponette, cuffie doccia, carta igienica e detergenti professionali per hotel e residence di Roma.',
    kw: ['saponett', 'sapone', 'doccia shampoo', 'cuffia doccia', 'carta igienica', 'lysoform', 'candeggin'] },
  { slug: 'bed-and-breakfast', title: 'Forniture per B&B e case vacanza a Roma', short: 'B&B e case vacanza',
    intro: 'Kit cortesia, carta igienica, monouso per la colazione, detersivi e igienizzanti per B&B, affittacamere e case vacanza di Roma.',
    kw: ['saponett', 'sapone', 'doccia shampoo', 'cuffia doccia', 'carta igienica', 'lysoform', 'candeggin'] },
  { slug: 'farmacie', title: 'Forniture per farmacie a Roma', short: 'Farmacie',
    intro: 'Shopper e buste per farmacia, cerotti, guanti in nitrile e igienizzanti per farmacie e parafarmacie di Roma.',
    kw: ['shopper', 'buste farmacia', 'cerott', 'guanti nitrile', 'amuchina', 'alcogel', 'igienizzant'] },
  { slug: 'studi-dentistici', title: 'Forniture per studi dentistici a Roma', short: 'Studi dentistici',
    intro: 'Guanti in nitrile, mascherine, cuffie monouso, disinfettanti per superfici e collutori per studi dentistici e medici di Roma.',
    kw: ['guanti nitrile', 'mascherin', 'cuffi', 'virogard', 'septogard', 'disinfettant', 'collutorio'] },
  { slug: 'officine-meccanici', title: 'Forniture per officine e meccanici a Roma', short: 'Officine e meccanici',
    intro: 'Pasta lavamani, sbloccanti, sgrassatori, bobine industriali e guanti in nitrile neri per officine, carrozzerie e gommisti di Roma.',
    kw: ['lavamani', 'svitol', 'wd40', 'wd-40', 'sbloccante', 'sgrassator', 'bobina industriale', 'guanti nitrile'] },
  { slug: 'lavanderie', title: 'Forniture per lavanderie a Roma', short: 'Lavanderie',
    intro: 'Detersivi per lavatrice, ammorbidenti, smacchiatori, candeggina e sacchi per lavanderie e stirerie di Roma.',
    kw: ['lavatrice', 'ammorbident', 'smacchiator', 'candeggin', 'sacchi'] },
  { slug: 'tabaccherie', title: 'Forniture per tabaccherie e ricevitorie a Roma', short: 'Tabaccherie e ricevitorie',
    intro: 'Accendini, rotoli termici per POS, cassa e terminali di gioco, shopper, penne e pile per tabaccherie e ricevitorie di Roma.',
    kw: ['accendin', 'rotolo termico', 'rotoli termici', 'rotolo pos', 'shopper', 'penna', 'duracell'] },
  { slug: 'vinoteche-enoteche', title: 'Forniture per vinoteche ed enoteche a Roma', short: 'Vinoteche ed enoteche',
    intro: 'Porta bottiglie, scatole cubotto, porta calici, calici e shopper per vinoteche, enoteche e wine bar di Roma.',
    kw: ['porta bottigli', 'portabottigli', 'cubotto', 'calic', 'porta calice'] },
  { slug: 'negozi-caffe', title: 'Forniture per negozi di caffè, capsule e cialde a Roma', short: 'Negozi di caffè',
    intro: 'Bicchierini da caffè, coperchi, palette, vassoi porta bicchieri e decalcificanti per negozi di capsule, cialde e caffè di Roma.',
    kw: ['bicchieri caff', 'bicchierini', 'coperch', 'palett', 'decalcific', 'caffettiera', 'porta bicchieri'] },
  { slug: 'bazar-casa-giardino', title: 'Articoli casa e giardino per bazar a Roma', short: 'Bazar casa e giardino',
    intro: 'Annaffiatoi, vasi, secchi e mop, scope, insetticidi e mollette per bazar, ferramenta e negozi di casalinghi di Roma.',
    kw: ['annaffiatoio', 'vaso', 'secchio', 'scopa', 'insetticid', 'zanzar', 'mollett'] },
  { slug: 'imprese-di-pulizia', title: 'Detergenza professionale per imprese di pulizia a Roma', short: 'Imprese di pulizia',
    intro: 'Lavapavimenti, sgrassatori, igienizzanti e detergenti in tanica per imprese di pulizia, condomini e uffici di Roma.',
    kw: ['lavapavimenti', 'sgrassator', 'igienizzant', 'tanica', 'detergente', 'lysoform'] },
  { slug: 'fruttivendoli', title: 'Forniture per fruttivendoli e ortofrutta a Roma', short: 'Fruttivendoli',
    intro: 'Shopper, sacchetti per alimenti, guanti ortofrutta, vaschette e bobine in carta per fruttivendoli e negozi di ortofrutta di Roma.',
    kw: ['guanti ortofrutta', 'shopper', 'sacchetto alimenti', 'sacchetti alimenti', 'vaschett', 'bobina'] },
  { slug: 'pizzerie', title: 'Forniture per pizzerie e pizza al taglio a Roma', short: 'Pizzerie',
    intro: 'Contenitori e cartoni per pizza, carta forno, vaschette, tovaglioli e guanti per pizzerie e pizza al taglio di Roma.',
    kw: ['pizza', 'carta forno', 'vaschett', 'tovagliol', 'guanti', 'antigrasso'] },
  { slug: 'salumerie-gastronomie', title: 'Forniture per salumerie e gastronomie a Roma', short: 'Salumerie e gastronomie',
    intro: 'Carta accoppiata e politenata, vaschette, sacchetti per alimenti, guanti e bobine per salumerie, gastronomie e alimentari di Roma.',
    kw: ['carta accoppiata', 'politenata', 'vaschett', 'sacchetto alimenti', 'guanti', 'bobina'] },
  { slug: 'minimarket-alimentari', title: 'Forniture per minimarket e alimentari a Roma', short: 'Minimarket e alimentari',
    intro: 'Shopper, sacchi, rotoli per la cassa, guanti, bobine e prodotti per la pulizia per minimarket, alimentari e negozi di vicinato di Roma.',
    kw: ['shopper', 'rotolo termico', 'rotoli termici', 'sacchi', 'guanti', 'bobina'] },
  { slug: 'sushi-delivery', title: 'Packaging per sushi, asporto e delivery a Roma', short: 'Sushi e delivery',
    intro: 'Contenitori in kraft e plastica, vaschette, posate, shopper e sacchetti per sushi, poke, kebab e consegne a domicilio a Roma.',
    kw: ['kraft', 'contenitor', 'vaschett', 'posate', 'shopper', 'sacchett'] },
  { slug: 'catering-eventi', title: 'Monouso per catering ed eventi a Roma', short: 'Catering ed eventi',
    intro: 'Piatti, bicchieri, posate, tovaglie e tovaglioli monouso per catering, feste, comunioni ed eventi a Roma.',
    kw: ['piatti', 'bicchier', 'posate', 'tovagli', 'flute', 'calic'] },
  { slug: 'palestre', title: 'Forniture per palestre e centri sportivi a Roma', short: 'Palestre',
    intro: 'Carta asciugamani, sapone, igienizzanti, salviette, sacchi e detergenti per palestre, piscine e centri sportivi di Roma.',
    kw: ['asciugamani', 'sapone', 'igienizzant', 'salviette', 'sacchi', 'detergente'] },
  { slug: 'parrucchieri-estetisti', title: 'Forniture per parrucchieri ed estetisti a Roma', short: 'Parrucchieri ed estetisti',
    intro: 'Guanti, asciugamani e lenzuolini monouso, cuffie, salviette e igienizzanti per parrucchieri, barbieri e centri estetici di Roma.',
    kw: ['guanti', 'asciugamani', 'lenzuolin', 'cuffi', 'salviette', 'igienizzant'] },
  { slug: 'uffici-condomini', title: 'Forniture per uffici e condomini a Roma', short: 'Uffici e condomini',
    intro: 'Carta igienica, carta mani, sapone, sacchi per la spazzatura, detergenti e cancelleria per uffici, studi e condomini di Roma.',
    kw: ['carta igienica', 'asciugamani', 'sapone', 'sacchi', 'detergente', 'penna'] },
  { slug: 'scuole-asili', title: 'Forniture per scuole e asili a Roma', short: 'Scuole e asili',
    intro: 'Carta igienica, sapone, salviette, guanti, sacchi e detergenti igienizzanti per scuole, asili nido e ludoteche di Roma.',
    kw: ['carta igienica', 'sapone', 'salviette', 'guanti', 'sacchi', 'igienizzant'] },
  { slug: 'prodotti-bambini', title: 'Pannolini e prodotti per bambini a Roma', short: 'Prodotti per bambini',
    intro: 'Pannolini Pampers e Huggies, salviette, prodotti Chicco, Johnson\'s e Nivea Baby a prezzi da ingrosso, con consegna a Roma.',
    kw: ['pampers', 'huggies', 'chicco', 'johnson', 'nivea baby', 'fissan'] },
  { slug: 'bellezza-cura-persona', title: 'Prodotti di bellezza e cura della persona a Roma', short: 'Bellezza e cura persona',
    intro: 'Sieri e creme viso, struccanti, acqua micellare e salviette delle migliori marche, per negozi e rivenditori di Roma.',
    kw: ['siero', 'crema viso', 'struccant', 'micellar', 'salviette struccanti'] },
  { slug: 'detersivi-casa', title: 'Detersivi e prodotti per la pulizia della casa a Roma', short: 'Detersivi casa',
    intro: 'Dash, Dixan, Lenor, Svelto, Finish, Mastro Lindo, Viakal e Chanteclair: i detersivi per la casa delle grandi marche a prezzi da ingrosso.',
    kw: ['dash', 'dixan', 'lenor', 'svelto', 'finish', 'mastro lindo', 'viakal', 'chanteclair'] },
];

// ---------------------------------------------------------------------------
// utilità
// ---------------------------------------------------------------------------
const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const eur = (n: number) =>
  '€ ' + Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const jsonld = (o: any) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
const nice = (name: string) =>
  name === name.toUpperCase() ? name.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (m) => m.toUpperCase()) : name;

async function sb(path: string, timeoutMs = 9000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`supabase ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

const businessLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WholesaleStore',
  '@id': `${SITE}/#azienda`,
  name: BIZ.name,
  url: SITE,
  logo: `${SITE}/icon-512.png`,
  image: `${SITE}/icon-512.png`,
  telephone: BIZ.phone,
  priceRange: '€',
  address: { '@type': 'PostalAddress', streetAddress: BIZ.street, postalCode: BIZ.cap, addressLocality: BIZ.city, addressRegion: 'RM', addressCountry: 'IT' },
  areaServed: [{ '@type': 'City', name: 'Roma' }, { '@type': 'AdministrativeArea', name: 'Lazio' }],
});

const imgUrl = (id: string) => `${SITE}/api/seo?type=img&id=${encodeURIComponent(id)}`;

// ---------------------------------------------------------------------------
// /prodotto/<id> : index.html dell'app + contenuti per Google
// ---------------------------------------------------------------------------
let indexCache: { html: string; at: number } | null = null;
async function appIndex(origin: string): Promise<string> {
  if (indexCache && Date.now() - indexCache.at < 10 * 60 * 1000) return indexCache.html;
  const r = await fetch(`${origin}/index.html`);
  if (!r.ok) throw new Error('index ' + r.status);
  const html = await r.text();
  indexCache = { html, at: Date.now() };
  return html;
}

async function productPage(id: string, origin: string, res: any) {
  let html: string;
  try {
    html = await appIndex(origin);
  } catch {
    res.statusCode = 302;
    res.setHeader('Location', '/home');
    return res.end();
  }
  let p: any = null;
  try {
    const rows = await sb(
      `products?select=id,name,description,price,sku,in_stock,is_on_offer,extra_data,categories(name)&id=eq.${encodeURIComponent(id)}&active=eq.true&limit=1`
    );
    p = rows?.[0] || null;
  } catch {
    /* database non raggiungibile: si serve l'app normale */
  }
  if (!p) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600');
    res.statusCode = 200;
    return res.end(html);
  }
  const name = nice(p.name);
  const ex = p.extra_data || {};
  const cat = p.categories?.name || '';
  const pack = [ex.packageQty && ex.packageQty !== '1' ? ex.packageQty : '', ex.unit && ex.unit !== 'pz' ? ex.unit : ''].filter(Boolean).join(' ');
  const url = `${SITE}/prodotto/${encodeURIComponent(p.id)}`;
  const title = cut(`${name} – ${eur(p.price)} | Aurora Roma`, 70);
  const desc = cut(
    `${name}${pack ? ' (' + pack + ')' : ''} a ${eur(p.price)}. ${p.description ? String(p.description).replace(/\s+/g, ' ') + ' ' : ''}Ordina online su Aurora: forniture per casa e attività con consegna a Roma, pagamento alla consegna.`,
    160
  );
  const ld = jsonld({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    sku: p.sku || undefined,
    image: [imgUrl(p.id)],
    description: p.description || `${name} – ${cat}`,
    category: cat || undefined,
    url,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'EUR',
      price: Number(p.price).toFixed(2),
      availability: p.in_stock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: BIZ.name, '@id': `${SITE}/#azienda` },
    },
  });
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:title" content="${esc(name)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(imgUrl(p.id))}" />`,
    `<meta property="product:price:amount" content="${Number(p.price).toFixed(2)}" />`,
    `<meta property="product:price:currency" content="EUR" />`,
    ld,
  ].join('\n    ');
  // contenuto testuale dentro #root: React lo sostituisce appena parte l'app,
  // ma Google (e chi ha JavaScript disattivato) lo legge.
  const body = `<div id="root"><main style="max-width:720px;margin:40px auto;padding:0 16px;font-family:sans-serif;color:#e2e8f0">
      <p><a href="/home" style="color:#7dd3fc">Aurora</a>${cat ? ' › ' + esc(cat) : ''}</p>
      <h1>${esc(name)}</h1>
      <img src="${esc(imgUrl(p.id))}" alt="${esc(name)}" width="320" style="max-width:100%;background:#fff;border-radius:12px" />
      <p style="font-size:28px;font-weight:700">${esc(eur(p.price))}${pack ? ' <small>· ' + esc(pack) + '</small>' : ''}</p>
      ${p.description ? `<p>${esc(p.description)}</p>` : ''}
      <p>Ordina online con pagamento alla consegna. ${esc(BIZ.name)} – ${esc(BIZ.street)}, ${esc(BIZ.cap)} ${esc(BIZ.city)} · Tel. ${esc(BIZ.phoneShow)}</p>
      <p><a href="/forniture" style="color:#7dd3fc">Forniture per attività a Roma</a></p>
    </main></div>`;
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/i, '')
    .replace(/<link\s+rel="canonical"[^>]*>/i, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<head>/i, `<head>\n    ${head}`)
    .replace(/<div id="root"><\/div>/i, body);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.statusCode = 200;
  return res.end(out);
}

// ---------------------------------------------------------------------------
// pagine HTML autonome (forniture, recensione)
// ---------------------------------------------------------------------------
const CSS = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Plus Jakarta Sans',system-ui,-apple-system,Segoe UI,sans-serif;background:#f4f6fa;color:#0f1d33;line-height:1.5}
a{color:inherit}
.top{background:radial-gradient(circle at 85% 0,#1d4f8f 0,#0b1d36 45%,#07111f 100%);color:#fff;padding:20px 16px 56px}
.wrap{max-width:1120px;margin:0 auto}
.bar{display:flex;align-items:center;gap:12px;justify-content:space-between}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:800;letter-spacing:.5px}
.brand img{height:34px}
.cta{display:inline-block;background:#38bdf8;color:#04172c;font-weight:800;text-decoration:none;padding:11px 20px;border-radius:999px}
.cta.ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.35)}
.kick{margin-top:38px;color:#7dd3fc;font-weight:800;font-size:13px;letter-spacing:2px;text-transform:uppercase}
h1{font-size:clamp(28px,5vw,46px);line-height:1.08;margin:10px 0 14px;max-width:820px}
.lead{max-width:760px;font-size:17px;opacity:.9}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.chip{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);padding:6px 12px;border-radius:999px;font-size:13px;font-weight:600}
main{margin-top:-30px;padding:0 16px 40px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.card{background:#fff;border-radius:16px;padding:14px;box-shadow:0 6px 20px rgba(15,29,51,.08);text-decoration:none;display:flex;flex-direction:column}
.card .ph{height:150px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,#eaf4ff 0,#fff 70%);border-radius:12px;margin-bottom:10px}
.card .ph img{max-height:140px;max-width:90%;object-fit:contain}
.card h3{font-size:14.5px;line-height:1.25;flex:1}
.card .pr{margin-top:8px;align-self:flex-start;background:#ffc93c;font-weight:800;padding:4px 10px;border-radius:8px;font-size:16px}
.hub .card h3{font-size:18px}.hub .card p{font-size:14px;color:#55627a;margin-top:6px}
h2{font-size:24px;margin:34px 0 14px}
.info{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.box{background:#fff;border-radius:16px;padding:18px;box-shadow:0 6px 20px rgba(15,29,51,.06)}
.box b{display:block;margin-bottom:4px}
details{background:#fff;border-radius:12px;padding:14px 16px;margin-bottom:10px;box-shadow:0 4px 14px rgba(15,29,51,.05)}
summary{font-weight:700;cursor:pointer}
details p{margin-top:8px;color:#3d4a60}
.more{display:flex;flex-wrap:wrap;gap:8px}
.more a{background:#fff;border:1px solid #d9e1ee;border-radius:999px;padding:7px 13px;font-size:14px;text-decoration:none;font-weight:600}
footer{background:#07111f;color:#cbd5e1;padding:26px 16px;font-size:14px}
footer a{color:#7dd3fc}
.empty{background:#fff;border-radius:16px;padding:24px;text-align:center}`;

const FAQ = [
  ['Consegnate a domicilio?', 'Sì. A Roma città consegniamo con i nostri mezzi; in provincia di Roma e nel resto del Lazio entro 24/48 ore lavorative con spedizione a € 3,50; nel resto d\'Italia a € 6,90. Niente consegne il sabato e la domenica.'],
  ['C\'è un ordine minimo?', 'Sì, l\'ordine minimo è di € 50.'],
  ['Come si paga?', 'Il pagamento si fa alla consegna: nessun pagamento online richiesto.'],
  ['Come ordino?', `Dall\'app/sito ${SITE.replace('https://', '')}: scegli i prodotti, aggiungili al carrello e invia l\'ordine, anche senza registrarti. Oppure chiama il ${BIZ.phoneShow}.`],
];

function page(opts: { title: string; desc: string; canonical: string; kick: string; h1: string; lead: string; content: string; ld: any[] }) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.desc)}" />
<link rel="canonical" href="${esc(opts.canonical)}" />
<meta property="og:type" content="website" /><meta property="og:title" content="${esc(opts.h1)}" />
<meta property="og:description" content="${esc(opts.desc)}" /><meta property="og:url" content="${esc(opts.canonical)}" />
<meta property="og:image" content="${SITE}/icon-512.png" />
<link rel="icon" type="image/png" href="/logo-login.png" /><meta name="theme-color" content="#07111f" />
<link rel="stylesheet" href="/fonts/fonts.css" />
<style>${CSS}</style>
${opts.ld.map(jsonld).join('\n')}
</head><body>
<header class="top"><div class="wrap">
<div class="bar"><a class="brand" href="/home"><img src="/nuova/emblem.svg" alt="" /> AURORA</a><a class="cta" href="/home">Apri il catalogo</a></div>
<div class="kick">${esc(opts.kick)}</div><h1>${esc(opts.h1)}</h1><p class="lead">${esc(opts.lead)}</p>
<div class="chips"><span class="chip">📍 Roma</span><span class="chip">Oltre 8.000 prodotti</span><span class="chip">Pagamento alla consegna</span><span class="chip">Ordine minimo € 50</span></div>
</div></header>
<main><div class="wrap">${opts.content}</div></main>
<footer><div class="wrap"><b>${esc(BIZ.name)}</b> – ${esc(BIZ.street)}, ${esc(BIZ.cap)} ${esc(BIZ.city)} · Tel. <a href="tel:${BIZ.phone.replace(/\s/g, '')}">${esc(BIZ.phoneShow)}</a> · <a href="/home">Catalogo online</a> · <a href="/forniture">Forniture per attività</a> · <a href="/recensione">Lascia una recensione</a></div></footer>
</body></html>`;
}

function infoAndFaq() {
  return `<h2>Come funziona</h2><div class="info">
<div class="box"><b>🚚 Consegna a Roma</b>Con i nostri mezzi in città; provincia e Lazio in 24/48 ore a € 3,50.</div>
<div class="box"><b>💶 Pagamento alla consegna</b>Nessun pagamento online. Ordine minimo € 50.</div>
<div class="box"><b>📱 Ordini in un minuto</b>Dal catalogo online, anche senza registrazione, oppure al ${esc(BIZ.phoneShow)}.</div></div>
<h2>Domande frequenti</h2>${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}`;
}

const faqLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

async function landingProducts(l: Landing): Promise<any[]> {
  const or = l.kw.map((k) => `name.ilike.*${k.replace(/[,()*]/g, ' ')}*`).join(',');
  const rows: any[] = await sb(
    `products?select=id,name,price,extra_data&active=eq.true&price=gt.0&or=(${encodeURIComponent(or)})&order=is_on_offer.desc,name.asc&limit=200`
  );
  // un po' di varietà: al massimo 4 prodotti per ogni parola chiave, poi il resto
  const seen = new Set<string>();
  const out: any[] = [];
  for (const k of l.kw) {
    let n = 0;
    for (const r of rows) {
      if (n >= 4 || out.length >= 24) break;
      if (!seen.has(r.id) && r.name.toLowerCase().includes(k)) { seen.add(r.id); out.push(r); n++; }
    }
  }
  for (const r of rows) {
    if (out.length >= 24) break;
    if (!seen.has(r.id)) { seen.add(r.id); out.push(r); }
  }
  return out;
}

async function landingPage(slug: string, res: any) {
  const l = LANDINGS.find((x) => x.slug === slug);
  if (!l) {
    res.statusCode = 301;
    res.setHeader('Location', '/forniture');
    return res.end();
  }
  let prods: any[] = [];
  try { prods = await landingProducts(l); } catch { /* pagina comunque utile */ }
  const url = `${SITE}/forniture/${l.slug}`;
  const cards = prods.length
    ? `<div class="grid">${prods
        .map((p) => {
          const n = nice(p.name);
          return `<a class="card" href="/prodotto/${encodeURIComponent(p.id)}"><div class="ph"><img loading="lazy" src="/api/seo?type=img&id=${encodeURIComponent(p.id)}" alt="${esc(n)}" /></div><h3>${esc(n)}</h3><span class="pr">${esc(eur(p.price))}</span></a>`;
        })
        .join('')}</div>`
    : `<div class="empty">Sfoglia tutti i prodotti nel <a href="/home"><b>catalogo online</b></a>.</div>`;
  const others = LANDINGS.filter((x) => x.slug !== l.slug)
    .map((x) => `<a href="/forniture/${x.slug}">${esc(x.short)}</a>`)
    .join('');
  const content = `${cards}
<p style="margin-top:18px"><a class="cta" href="/home">Vedi tutti i prodotti nel catalogo</a></p>
${infoAndFaq()}
<h2>Forniture per altre attività</h2><div class="more">${others}</div>`;
  const ld = [
    businessLd(),
    faqLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: l.title,
      itemListElement: prods.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/prodotto/${encodeURIComponent(p.id)}`, name: nice(p.name) })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Aurora', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Forniture per attività', item: `${SITE}/forniture` },
        { '@type': 'ListItem', position: 3, name: l.short, item: url },
      ],
    },
  ];
  const html = page({
    title: cut(`${l.title} | Ingrosso Aurora`, 70),
    desc: cut(`${l.intro} Prezzi da ingrosso, pagamento alla consegna, ordine minimo € 50.`, 160),
    canonical: url,
    kick: 'Forniture per attività · Roma',
    h1: l.title,
    lead: l.intro,
    content,
    ld,
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
  res.statusCode = 200;
  return res.end(html);
}

function hubPage(res: any) {
  const content = `<div class="grid hub">${LANDINGS.map(
    (l) => `<a class="card" href="/forniture/${l.slug}"><h3>${esc(l.short)}</h3><p>${esc(cut(l.intro, 120))}</p></a>`
  ).join('')}</div>${infoAndFaq()}`;
  const html = page({
    title: 'Forniture per attività a Roma: Ho.Re.Ca, igiene e pulizia | Aurora',
    desc: 'Ingrosso di prodotti per igiene, pulizia, monouso Ho.Re.Ca e packaging per bar, ristoranti, negozi e professionisti di Roma. Pagamento alla consegna.',
    canonical: `${SITE}/forniture`,
    kick: 'Ingrosso a Roma',
    h1: 'Forniture per casa e attività a Roma',
    lead: 'Scegli la tua attività: trovi i prodotti più richiesti dal nostro catalogo di oltre 8.000 articoli, con prezzi sempre aggiornati.',
    content,
    ld: [businessLd(), faqLd()],
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400');
  res.statusCode = 200;
  return res.end(html);
}

function reviewPage(res: any) {
  const target = process.env.GOOGLE_REVIEW_URL;
  if (target && /^https:\/\//.test(target)) {
    res.statusCode = 302;
    res.setHeader('Location', target);
    res.setHeader('Cache-Control', 'no-store');
    return res.end();
  }
  const content = `<div class="box" style="text-align:center;padding:32px">
<p style="font-size:18px;margin-bottom:18px">Grazie per aver scelto Aurora! La tua opinione aiuta altre attività di Roma a conoscerci.</p>
<a class="cta" href="${esc(MAPS_URL)}">Apri Aurora su Google e lascia la tua recensione</a>
<p style="margin-top:14px;color:#55627a;font-size:14px">Si apre Google Maps: tocca la scheda di ${esc(BIZ.name)} e poi «Scrivi una recensione».</p></div>`;
  const html = page({
    title: 'Lascia una recensione | Aurora Roma',
    desc: 'Lascia una recensione su Google ad Aurora S.r.l.s, forniture per casa e attività a Roma.',
    canonical: `${SITE}/recensione`,
    kick: 'Recensioni',
    h1: 'Com\'è andata con Aurora?',
    lead: 'Bastano 30 secondi per lasciare una recensione su Google.',
    content,
    ld: [businessLd()],
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  return res.end(html);
}

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------
async function sitemap(res: any) {
  const urls: string[] = [`${SITE}/home`, `${SITE}/forniture`, ...LANDINGS.map((l) => `${SITE}/forniture/${l.slug}`)];
  try {
    for (let from = 0; from < 50000; from += 1000) {
      const rows: any[] = await sb(`products?select=id&active=eq.true&order=id.asc&offset=${from}&limit=1000`);
      for (const r of rows) urls.push(`${SITE}/prodotto/${encodeURIComponent(r.id)}`);
      if (rows.length < 1000) break;
    }
  } catch { /* si pubblica almeno la parte fissa */ }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `<url><loc>${esc(u)}</loc></url>`).join('\n') +
    '\n</urlset>\n';
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400');
  res.statusCode = 200;
  return res.end(xml);
}

// ---------------------------------------------------------------------------
// foto prodotto (anche base64 salvate nel database)
// ---------------------------------------------------------------------------
async function productImage(id: string, res: any) {
  let src = '';
  try {
    const rows = await sb(`products?select=image_url&id=eq.${encodeURIComponent(id)}&limit=1`);
    src = rows?.[0]?.image_url || '';
  } catch { /* niente foto */ }
  if (/^https?:\/\//.test(src)) {
    res.statusCode = 302;
    res.setHeader('Location', src);
    res.setHeader('Cache-Control', 'public, s-maxage=86400');
    return res.end();
  }
  const m = /^data:(image\/[a-z+.-]+);base64,(.*)$/s.exec(src);
  if (m) {
    const buf = Buffer.from(m[2], 'base64');
    res.statusCode = 200;
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    return res.end(buf);
  }
  res.statusCode = 302;
  res.setHeader('Location', '/icon-512.png');
  return res.end();
}

export default async function handler(req: any, res: any) {
  const q = req.query || {};
  const type = String(q.type || '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const origin = host ? `https://${host}` : SITE;
  try {
    if (type === 'product' && q.id) return await productPage(String(q.id), origin, res);
    if (type === 'landing' && q.slug) return await landingPage(String(q.slug), res);
    if (type === 'hub') return hubPage(res);
    if (type === 'review') return reviewPage(res);
    if (type === 'sitemap') return await sitemap(res);
    if (type === 'img' && q.id) return await productImage(String(q.id), res);
  } catch (e) {
    console.error('seo error', e);
  }
  res.statusCode = 302;
  res.setHeader('Location', '/home');
  return res.end();
}
