import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Category, Product, Subcategory } from '../types';
import { useAdmin } from '../context/AdminContext';
import { HORECA_CATEGORY_IDS, isHorecaCategory } from '../lib/horeca';
import { buildBrandSummaries, withProductCounts } from '../lib/brands';
import { hasProductImage } from '../utils/imageFirst';
import { isFlashLive } from '../utils/flashOffers';
import { Flyer, fetchActiveFlyer, shortDate } from '../services/flyers';
import { FlyerSection } from '../components/FlyerSection';
import { QuickManageModal } from '../components/QuickManageModal';
import { Ic, Bi, vib } from './Icona';
import { NuovaCard } from './NuovaCard';
import { useCardRenderer } from './cardContext';
import { useBrandVectors, vecKey, BrandVec } from './brandVectors';
import { EMBLEM } from './NuovaShell';

export interface NuovaHomeProps {
  products: Product[];
  categories: Category[];
  subcategories: Subcategory[];
  favorites: string[];
  comparedIds: string[];
  cartQty: Record<string, number>;
  priceFactor: number;
  onOpenCatalog: () => void;
  onSelectCategory: (id: string) => void;
  onOpenOffers: () => void;
  onPersonalizza: () => void;
  onChat: () => void;
  onQuickReorder: () => void;
  onSelectBrand: (name: string) => void;
  onAllBrands: () => void;
  onOpenHoreca: (categoryId: string, subcategoryId: string | null) => void;
  onSelectProduct: (p: Product) => void;
  onAdd: (p: Product) => void;
  onRemoveOne: (p: Product) => void;
  onToggleFavorite: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onOpenOrders: () => void;
  onHowItWorks: () => void;
  onInstall: () => void;
}

const low = (s: string) => s.trim().toLowerCase();

/** Foto delle categorie disegnate per la grafica nuova (per nome); le altre usano la loro foto. */
function categoryPhoto(c: Category): { src: string; white: boolean } {
  const n = low(c.name);
  const map: [RegExp, string][] = [
    [/^detersiv/, 'cat-detersivi'],
    [/^igiene casa/, 'cat-igiene-casa'],
    [/^carta/, 'cat-carta'],
    [/^packaging|asporto|delivery/, 'cat-asporto'],
    [/^igiene corpo/, 'cat-igiene-corpo'],
    [/^profumator/, 'cat-profumatori'],
    [/^accessori/, 'cat-accessori'],
    [/^casa$/, 'cat-casa'],
  ];
  for (const [re, f] of map) if (re.test(n)) return { src: `/nuova/${f}.webp`, white: false };
  if (c.image) return { src: c.image, white: false };
  return { src: EMBLEM, white: true };
}

function categoryIcon(name: string): string {
  const n = low(name);
  if (/detersiv/.test(n)) return 'bottle';
  if (/igiene casa|igiene e pulizia/.test(n)) return 'spray';
  if (/carta/.test(n)) return 'roll';
  if (/packaging|asporto|delivery/.test(n)) return 'takeaway';
  if (/igiene corpo/.test(n)) return 'pump';
  if (/profum/.test(n)) return 'diffuser';
  if (/accessori/.test(n)) return 'bucket';
  if (/cassa|pos|bilancia/.test(n)) return 'receipt';
  if (/ho\.?re\.?ca|monouso/.test(n)) return 'cup';
  if (/casaling|cucina/.test(n)) return 'plate';
  return 'boxes';
}

function horecaFallback(name: string): { src: string; cover: boolean } | null {
  const n = low(name);
  if (/bicchier|caff/.test(n)) return { src: '/nuova/hor-bicchieri-caffe.webp', cover: false };
  if (/piatt|posat/.test(n)) return { src: '/nuova/hor-piatti.webp', cover: false };
  if (/vaschett|asporto|delivery|contenitor/.test(n)) return { src: '/nuova/cat-asporto.webp', cover: true };
  if (/rotol|pos|cassa/.test(n)) return { src: '/nuova/hor-rotoli-pos.webp', cover: false };
  if (/shopper|sacchett|busta|buste/.test(n)) return { src: '/nuova/hor-shopper.webp', cover: false };
  if (/sacch|immondiz|rifiut/.test(n)) return { src: '/nuova/hor-sacchi-neri-rotolo.webp', cover: false };
  return null;
}

const CHIP_GROUPS: { label: string; test: (c: Category) => boolean }[] = [
  { label: 'Tutte', test: () => true },
  { label: 'Casa', test: (c) => /^casa$|detersiv|igiene casa|accessori|profum|casaling|fai da te|animali/.test(low(c.name)) },
  { label: 'Persona', test: (c) => /igiene corpo|profum/.test(low(c.name)) },
  { label: 'Ho.Re.Ca.', test: (c) => isHorecaCategory(c.id) || /carta e monouso/.test(low(c.name)) },
  { label: 'Ufficio', test: (c) => /carta e monouso/.test(low(c.name)) },
  { label: 'Eco e bio', test: (c) => /^detersiv|igiene casa|packaging/.test(low(c.name)) },
];

/* ---------------- hero a storie ---------------- */
const Hero: React.FC<{
  minimumOrderEur: number;
  badgeLabel: string;
  badgeValue: string;
  flashCount: number;
  onCatalog: () => void;
  onOffers: () => void;
  onChat: () => void;
}> = ({ minimumOrderEur, badgeLabel, badgeValue, flashCount, onCatalog, onOffers, onChat }) => {
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const tx = useRef<number | null>(null);
  const N = 3;
  const show = (k: number) => {
    setI(((k % N) + N) % N);
    setRun((r) => r + 1);
  };
  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => show(i + 1), 5000);
    return () => window.clearTimeout(t);
  }, [i, run, paused]);
  useEffect(() => {
    const onVis = () => setPaused(document.visibilityState !== 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const min = minimumOrderEur > 0 ? ` Ordine minimo € ${minimumOrderEur.toFixed(0)}.` : '';
  return (
    <section
      className={`n-hero${paused ? ' paused' : ''}`}
      aria-roledescription="carosello"
      onTouchStart={(e) => (tx.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (tx.current == null) return;
        const d = e.changedTouches[0].clientX - tx.current;
        if (Math.abs(d) > 40) show(i + (d < 0 ? 1 : -1));
        tx.current = null;
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="n-bars">
        {Array.from({ length: N }).map((_, k) => (
          <i key={k === i ? `r${run}` : k} className={k < i ? 'done' : k === i ? 'run' : ''}><b /></i>
        ))}
      </div>
      <div className="n-slides" style={{ transform: `translateX(-${i * 100}%)` }}>
        <div className="n-slide" aria-hidden={i !== 0}>
          <img className="emb" src={EMBLEM} alt="" />
          <h1>Soluzioni per ogni esigenza.</h1>
          <p>Igiene, pulizia e benessere, consegnati a Roma con i nostri mezzi.</p>
          <div className="n-cuts">
            <div className="ped" />
            <img src="/nuova/cut-rotoloni.webp" style={{ width: 104, left: 18, bottom: 22 }} alt="" />
            <img src="/nuova/cut-bicchieri-caffe.webp" style={{ width: 66, right: 8, bottom: 24 }} alt="" />
            <img src="/nuova/cut-vaschette-alluminio.webp" style={{ width: 92, left: 76, bottom: 0 }} alt="" />
          </div>
          <button type="button" className="n-btn prim cta" tabIndex={i === 0 ? 0 : -1} onClick={onCatalog}>
            Scopri il catalogo <Ic n="arrow" s={17} />
          </button>
        </div>
        <div className="n-slide" aria-hidden={i !== 1}>
          <img className="emb" src={EMBLEM} alt="" />
          <h1>Offerte del mese</h1>
          <p>Prezzi da volantino su carta, monouso e packaging.</p>
          <div className="n-bigoff">{`${badgeLabel.toLowerCase()} ${badgeValue}`.trim()}</div>
          <div className="n-cuts">
            <div className="ped" />
            <img src="/nuova/cut-risme.webp" style={{ width: 104, left: 22, bottom: 14 }} alt="" />
            <img src="/nuova/cut-sacchetti-pane.webp" style={{ width: 54, right: 18, bottom: 18 }} alt="" />
          </div>
          <button type="button" className="n-btn prim cta" tabIndex={i === 1 ? 0 : -1} onClick={onOffers}>
            Vedi le offerte <Ic n="arrow" s={17} />
          </button>
        </div>
        <div className="n-slide" aria-hidden={i !== 2}>
          <img className="emb" src={EMBLEM} alt="" />
          <h1>Consegna gratuita a Roma</h1>
          <p>{`Con i nostri furgoni, in 24/48 ore.${min}`}</p>
          <div className="n-cuts truck">
            <div className="ped" />
            <Bi n="truck" s={118} />
          </div>
          <button type="button" className="n-btn gh cta" tabIndex={i === 2 ? 0 : -1} onClick={onChat}>
            Come funziona
          </button>
        </div>
      </div>
    </section>
  );
};

/* ---------------- categorie con filtri ---------------- */
const Categorie: React.FC<{ categories: Category[]; onAll: () => void; onPick: (id: string) => void }> = ({ categories, onAll, onPick }) => {
  const chips = useMemo(() => CHIP_GROUPS.filter((g, k) => k === 0 || categories.some(g.test)), [categories]);
  const [chip, setChip] = useState(0);
  const [swap, setSwap] = useState(0);
  const chipsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const catsRef = useRef<HTMLDivElement>(null);
  const total = categories.reduce((s, c) => s + (c.countNumber || 0), 0);
  const group = chips[chip] || chips[0];
  const list = categories.filter(group.test);

  const placePill = () => {
    const box = chipsRef.current;
    const pill = pillRef.current;
    if (!box || !pill) return;
    const b = box.querySelectorAll<HTMLButtonElement>('.n-chip')[chip];
    if (!b) return;
    pill.style.transform = `translateX(${b.offsetLeft}px)`;
    pill.style.width = `${b.offsetWidth}px`;
  };
  useLayoutEffect(placePill, [chip, chips.length]);
  useEffect(() => {
    window.addEventListener('resize', placePill);
    const f = (document as any).fonts;
    f?.ready?.then?.(placePill);
    return () => window.removeEventListener('resize', placePill);
  });

  return (
    <section className="n-sec">
      <div className="n-sh">
        <h2>Categorie principali</h2>
        <button type="button" className="more" onClick={onAll}>Tutte <Ic n="chev" s={15} /></button>
      </div>
      <div className="n-chips" ref={chipsRef} role="tablist" aria-label="Filtra le categorie">
        <span className="n-pill" ref={pillRef} />
        {chips.map((g, k) => (
          <button
            key={g.label}
            type="button"
            role="tab"
            aria-selected={k === chip}
            className={`n-chip${k === chip ? ' on' : ''}`}
            onClick={(e) => {
              setChip(k);
              setSwap((s) => s + 1);
              vib(6);
              const box = chipsRef.current;
              const c = e.currentTarget;
              // scorre solo la fila dei filtri, mai la pagina
              box?.scrollTo({ left: c.offsetLeft - (box.clientWidth - c.offsetWidth) / 2, behavior: 'smooth' });
              catsRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
            }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className={`n-cats${swap ? ' swap' : ''}`} key={swap} ref={catsRef}>
        <button type="button" className="n-cat all" onClick={onAll}>
          <img className="aemb" src={EMBLEM} alt="" />
          <span className="ib"><Bi n="catalog" s={28} /></span>
          <span className="tx">
            <b style={{ fontSize: 19 }}>Catalogo completo</b>
            <small style={{ color: '#e3f4ff' }}>{total.toLocaleString('it-IT')} prodotti</small>
          </span>
        </button>
        {list.map((c) => {
          const ph = categoryPhoto(c);
          return (
            <button key={c.id} type="button" className="n-cat" onClick={() => onPick(c.id)}>
              <img className={`ph${ph.white ? ' w' : ''}`} src={ph.src} alt="" loading="lazy" referrerPolicy="no-referrer" />
              <span className="ib"><Bi n={categoryIcon(c.name)} s={28} /></span>
              <span className="tx">
                <b>{c.name}</b>
                <small>{(c.countNumber || 0).toLocaleString('it-IT')} prodotti</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

/* ---------------- volantino ---------------- */
const Volantino: React.FC<{ onOffers: () => void; badge: string }> = ({ onOffers, badge }) => {
  const [flyer, setFlyer] = useState<Flyer | null | undefined>(undefined);
  const [open, setOpen] = useState(0);
  useEffect(() => {
    let alive = true;
    fetchActiveFlyer()
      .then((f) => alive && setFlyer(f))
      .catch(() => alive && setFlyer(null));
    return () => {
      alive = false;
    };
  }, []);
  if (flyer === undefined) return null;
  if (!flyer || flyer.pages.length === 0) {
    return (
      <button type="button" className="n-offer" onClick={onOffers}>
        <img className="emb" src={EMBLEM} alt="" />
        <h3>Il volantino del mese</h3>
        <p>Tutti gli articoli sono già nelle offerte, con gli stessi prezzi.</p>
        <span className="n-btn prim"><Ic n="expand" s={16} /> Sfoglia</span>
        {badge && <span className="bigpct">{badge}</span>}
      </button>
    );
  }
  return (
    <>
      <button type="button" className="n-offer" onClick={() => setOpen((n) => n + 1)}>
        <img className="emb" src={EMBLEM} alt="" />
        <h3>Il volantino del mese</h3>
        <p>Tutti gli articoli sono già nelle offerte, con gli stessi prezzi.</p>
        <span className="n-btn prim"><Ic n="expand" s={16} /> Sfoglia</span>
        <span className="n-fly">
          {flyer.pages.slice(0, 2).map((src, k) => (
            <img key={k} src={src} alt={`Volantino pagina ${k + 1}`} loading="lazy" />
          ))}
        </span>
      </button>
      <FlyerSection openSignal={open} hideInline />
    </>
  );
};

/* ---------------- scheda marca (come nel prototipo) ----------------
   Logo in bianco sulla scheda scura; toccandolo (o passandoci sopra col mouse)
   appare a colori su fondo bianco. Sul telefono il secondo tocco apre la marca. */
export const BrandCard: React.FC<{
  name: string;
  image?: string;
  vec?: BrandVec;
  count: number;
  isAdmin: boolean;
  onOpen: () => void;
  onManage: () => void;
}> = ({ name, image: img0, vec, count, isAdmin, onOpen, onManage }) => {
  const [on, setOn] = useState(false);
  // se il logo a colori non si carica, al tocco si vede il logo vettoriale invece di un riquadro vuoto
  const [bad, setBad] = useState(false);
  const image = bad ? undefined : img0;
  const fail = () => setBad(true);
  const t = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const click = () => {
    const hover = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;
    if ((!image && !vec) || hover || on) {
      onOpen();
      return;
    }
    setOn(true);
    vib(8);
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setOn(false), 2500);
  };
  return (
    <div style={{ position: 'relative', minWidth: 0 }}>
      <button type="button" className={`n-br${on ? ' on' : ''}${image || vec ? '' : ' nologo'}${vec && !image ? ' vonly' : ''}`} onClick={click} aria-label={name}>
        <span className="lg">
          {vec ? (
            <>
              <svg className="mono" viewBox={`0 0 ${vec.w} ${vec.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <path d={vec.d} fillRule="evenodd" opacity={vec.s ? 0.42 : undefined} />
                {vec.s ? <path d={vec.s} fillRule="evenodd" /> : null}
              </svg>
              {image && vec.c && vec.u && image.slice(0, 300) === vec.u ? (
                // stesso riquadro del logo bianco: al tocco il logo a colori ha la stessa misura
                <span className="orig crop" style={{ ['--a' as string]: vec.w / vec.h }}>
                  <img
                    src={image}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={fail}
                    style={{ width: `${100 / vec.c[2]}%`, left: `${(-vec.c[0] / vec.c[2]) * 100}%`, top: `${(-vec.c[1] / vec.c[3]) * 100}%` }}
                  />
                </span>
              ) : image ? (
                <img className="orig" src={image} alt="" referrerPolicy="no-referrer" onError={fail} />
              ) : null}
            </>
          ) : image ? (
            <>
              <img className="fmono" src={image} alt="" referrerPolicy="no-referrer" onError={fail} />
              <img className="orig" src={image} alt="" referrerPolicy="no-referrer" onError={fail} />
            </>
          ) : (
            <span className="wm">{name}</span>
          )}
        </span>
        <b>{name}</b>
        <small>{count} prodott{count === 1 ? 'o' : 'i'}</small>
      </button>
      {isAdmin && (
        <button type="button" className="n-adm" title={`Gestisci ${name} (solo admin)`} aria-label={`Gestisci ${name}`} onClick={onManage}>
          <Ic n="image" s={14} />
        </button>
      )}
    </div>
  );
};

/* ---------------- riquadro Ho.Re.Ca ---------------- */
const HorTile: React.FC<{
  sub: Subcategory;
  count: number;
  categoryId: string;
  isAdmin: boolean;
  onOpen: (categoryId: string, subId: string) => void;
  onManage: (sub: Subcategory) => void;
}> = ({ sub, count, categoryId, isAdmin, onOpen, onManage }) => {
  const fb = horecaFallback(sub.name);
  const src = sub.image || fb?.src || EMBLEM;
  const cover = !sub.image && !!fb?.cover;
  const icon = categoryIcon(sub.name);
  return (
    <div style={{ position: 'relative', minWidth: 0 }}>
      <button type="button" className="n-hc" onClick={() => onOpen(categoryId, sub.id)}>
        <span className="n-hph"><img src={src} className={cover ? 'cv' : undefined} alt="" loading="lazy" referrerPolicy="no-referrer" /></span>
        <span className="n-hic"><Bi n={icon === 'boxes' ? 'cup' : icon} s={22} /></span>
        <b>{sub.name}</b>
        <small>{count} prodott{count === 1 ? 'o' : 'i'}</small>
      </button>
      {isAdmin && (
        <button type="button" className="n-adm" title={`Gestisci ${sub.name} (solo admin)`} aria-label={`Gestisci ${sub.name}`} onClick={() => onManage(sub)}>
          <Ic n="image" s={14} />
        </button>
      )}
    </div>
  );
};

/* ---------------- "Tieni premuto" del riordino rapido (come nel prototipo) ---------------- */
const HoldButton: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [st, setSt] = useState<'idle' | 'holding' | 'ok'>('idle');
  const t = useRef<number>(0);
  const start = (e: React.PointerEvent | React.KeyboardEvent) => {
    if (st === 'ok') return;
    e.preventDefault();
    setSt('holding');
    vib(8);
    t.current = window.setTimeout(() => {
      setSt('ok');
      vib([12, 50, 20]);
      onDone();
      window.setTimeout(() => setSt('idle'), 2600);
    }, 1100);
  };
  const end = () => {
    if (st === 'ok') return;
    window.clearTimeout(t.current);
    setSt('idle');
  };
  useEffect(() => () => window.clearTimeout(t.current), []);
  return (
    <button
      type="button"
      className={`n-hold${st === 'holding' ? ' holding' : ''}${st === 'ok' ? ' ok' : ''}`}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && st === 'idle' && start(e)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <i />
      <span>{st === 'holding' ? 'Tieni…' : st === 'ok' ? 'Fatto' : 'Tieni premuto'}</span>
    </button>
  );
};

/* ---------------- home ---------------- */
export const NuovaHome: React.FC<NuovaHomeProps> = (p) => {
  const { isAdmin, minimumOrderEur, systemSettings, baseProductsList, flashOffersEnabled, ordersList } = useAdmin();
  const lastOrder = ordersList && ordersList.length ? ordersList[0] : null;
  const [managing, setManaging] = useState<{ title: string; ids: string[]; image?: string } | null>(null);

  // offerte a tempo in corso (come il riquadro "Offerte del mese" classico)
  const live = useMemo(() => {
    if (!flashOffersEnabled) return { count: 0, maxPct: 0 };
    const now = new Date();
    let count = 0;
    let maxPct = 0;
    for (const x of baseProductsList) {
      if (!x.flashOffer || !isFlashLive(x, now)) continue;
      count++;
      maxPct = Math.max(maxPct, Math.round((1 - x.flashOffer.price / x.price) * 100));
    }
    return { count, maxPct };
  }, [baseProductsList, flashOffersEnabled]);
  const badgeLabel = (systemSettings.promoBadgeLabel || '').trim() || 'FINO AL';
  const manualValue = (systemSettings.promoBadgeValue || '').trim() || '-30%';
  const badgeValue = systemSettings.promoBadgeAuto && live.maxPct > 0 ? `-${live.maxPct}%` : manualValue;

  const vecs = useBrandVectors();
  const brands = useMemo(() => {
    const base = buildBrandSummaries(p.categories, p.subcategories);
    return withProductCounts(base, p.subcategories, p.products)
      .filter((b) => b.productCount > 0)
      .sort((a, b) => b.productCount - a.productCount);
  }, [p.categories, p.subcategories, p.products]);

  const pick = (list: Product[]) => {
    const withImg = list.filter(hasProductImage);
    const base = withImg.length >= 6 ? withImg : list;
    return [...base.filter((x) => x.isFeatured), ...base.filter((x) => !x.isFeatured)].slice(0, 6);
  };
  const featured = useMemo(() => pick(p.products.filter((x) => !isHorecaCategory(x.categoryId))), [p.products]);

  const horeca = useMemo(() => {
    const countBySub = new Map<string, number>();
    for (const x of p.products) if (x.subCategoryId) countBySub.set(x.subCategoryId, (countBySub.get(x.subCategoryId) || 0) + 1);
    return p.categories
      .filter((c) => HORECA_CATEGORY_IDS.includes(c.id))
      .map((category) => ({
        category,
        badges: p.subcategories
          .filter((s) => s.categoryId === category.id && !s.parentSubcategoryId && s.active)
          .map((sub) => ({ sub, count: countBySub.get(sub.id) || 0 }))
          .filter((b) => b.count > 0)
          .sort((a, b) => a.sub.sortOrder - b.sub.sortOrder || a.sub.name.localeCompare(b.sub.name, 'it')),
      }))
      .filter((g) => g.badges.length > 0);
  }, [p.categories, p.subcategories, p.products]);
  const horecaTop = useMemo(
    () =>
      horeca
        .flatMap((g) => g.badges.map((b) => ({ ...b, categoryId: g.category.id })))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    [horeca]
  );

  const manageSub = (sub: Subcategory) => setManaging({ title: sub.name, ids: [sub.id], image: sub.image });

  const grid = (list: Product[]) => (
    <div className="n-grid">
      {list.map((x) => (
        <NuovaCard
          key={x.id}
          product={x}
          qty={p.cartQty[x.id] || 0}
          isFavorite={p.favorites.includes(x.id)}
          isCompared={p.comparedIds.includes(x.id)}
          priceFactor={p.priceFactor}
          onOpen={p.onSelectProduct}
          onAdd={p.onAdd}
          onRemoveOne={p.onRemoveOne}
          onToggleFavorite={p.onToggleFavorite}
        />
      ))}
    </div>
  );

  return (
    <div className="n-wrap n-enter">
      <Hero
        minimumOrderEur={minimumOrderEur}
        badgeLabel={badgeLabel}
        badgeValue={badgeValue}
        flashCount={live.count}
        onCatalog={p.onOpenCatalog}
        onOffers={p.onOpenOffers}
        onChat={p.onHowItWorks}
      />

      <div className="n-acts">
        <button type="button" className="n-act p" onClick={p.onOpenCatalog}><Bi n="catalog" s={26} />Catalogo</button>
        <button type="button" className="n-act" onClick={p.onPersonalizza}><Bi n="palette" s={26} />Personalizza</button>
        <button type="button" className="n-act" onClick={p.onInstall}><Bi n="download" s={26} />Scarica app</button>
        <button type="button" className="n-act" onClick={p.onChat}><Bi n="whats" s={26} />Chatta</button>
      </div>

      <div className="n-reorder">
        <Ic n="repeat" s={24} />
        <span>
          <b>Riordino rapido</b>
          <small>{lastOrder ? `Ripeti l'ultimo ordine, ${lastOrder.itemsCount} articoli` : "Ripeti l'ultimo ordine"}</small>
        </span>
        <HoldButton onDone={p.onQuickReorder} />
      </div>

      <Categorie categories={p.categories} onAll={p.onOpenCatalog} onPick={p.onSelectCategory} />

      <section className="n-light">
        {brands.length > 0 && (
          <>
            <div className="n-sh">
              <h2>Marche</h2>
              <button type="button" className="more" onClick={p.onAllBrands}>Tutte le {brands.length} <Ic n="chev" s={15} /></button>
            </div>
            <div className="n-brands">
              {brands.slice(0, 9).map((b) => (
                <BrandCard
                  key={b.name}
                  name={b.name}
                  image={b.image}
                  vec={vecs[vecKey(b.name)]}
                  count={b.productCount}
                  isAdmin={isAdmin}
                  onOpen={() => p.onSelectBrand(b.name)}
                  onManage={() => setManaging({ title: b.name, ids: b.subcategoryIds, image: b.image })}
                />
              ))}
            </div>
          </>
        )}

        <Volantino onOffers={p.onOpenOffers} badge={badgeValue} />

        {featured.length > 0 && (
          <div className="n-sec">
            <div className="n-sh">
              <h2>Prodotti in evidenza</h2>
              <button type="button" className="more" onClick={p.onOpenCatalog}>Vedi tutti <Ic n="chev" s={15} /></button>
            </div>
            {grid(featured)}
          </div>
        )}

        {horeca.length > 0 && (
          <div className="n-sec">
            <div className="n-sh">
              <h2>Ho.Re.Ca. e monouso</h2>
              <button type="button" className="more" onClick={() => p.onOpenHoreca(HORECA_CATEGORY_IDS[1], null)}>
                Vedi tutto <Ic n="chev" s={15} />
              </button>
            </div>
            <div className="n-hor">
              {horecaTop.map((b) => (
                <HorTile key={b.sub.id} sub={b.sub} count={b.count} categoryId={b.categoryId} isAdmin={isAdmin} onOpen={p.onOpenHoreca} onManage={manageSub} />
              ))}
            </div>
          </div>
        )}

      </section>

      <section className="n-sec" style={{ marginTop: 26 }}>
        <div className="n-serv">
          <div className="n-sv"><Bi n="rome" s={32} /><b>Roma e provincia</b><small>Consegna gratuita con i nostri furgoni</small></div>
          <div className="n-sv"><Bi n="route" s={32} /><b>Tutta Italia</b><small>Spedizione con corriere e tracciamento</small></div>
          <div className="n-sv"><Bi n="invoice" s={32} /><b>Per le attività</b><small>Fattura elettronica e DDT</small></div>
          <div className="n-sv"><Bi n="seal" s={32} /><b>Qualità certificata</b><small>ISO 9001, HACCP, Ecolabel</small></div>
        </div>
      </section>

      {isAdmin && managing && (
        <QuickManageModal title={managing.title} rootIds={managing.ids} currentImage={managing.image} onClose={() => setManaging(null)} />
      )}
    </div>
  );
};

/** Testata con foto in cima alla pagina di una categoria (grafica nuova). */
export const NuovaCategoryHero: React.FC<{ category: Category }> = ({ category }) => {
  const ph = categoryPhoto(category);
  const full = ph.src.endsWith('/cat-asporto.webp');
  return (
    <div className={`n-cathero${full ? ' full' : ''}`}>
      <img src={ph.src} className={ph.white ? 'w' : undefined} alt="" referrerPolicy="no-referrer" />
      <div>
        <span>
          <h2>{category.name}</h2>
          <small>{(category.countNumber || 0).toLocaleString('it-IT')} prodotti</small>
        </span>
        <Bi n={categoryIcon(category.name)} s={30} />
      </div>
    </div>
  );
};

/** Pagina Catalogo come nel prototipo: titolo, ricerca, categorie con foto e tutte le marche. */
export const NuovaCatalogTop: React.FC<{
  categories: Category[];
  subcategories: Subcategory[];
  products: Product[];
  onPick: (id: string) => void;
  onSelectBrand: (name: string) => void;
  onSearch: () => void;
}> = ({ categories, subcategories, products, onPick, onSelectBrand, onSearch }) => (
  <div className="n-ctop">
    <header className="n-vh">
      <h1>Catalogo</h1>
      <p>
        {categories.reduce((s, c) => s + (c.countNumber || 0), 0).toLocaleString('it-IT')} prodotti in {categories.length} categorie
      </p>
    </header>
    <button type="button" className="n-vsearch" onClick={onSearch}>
      <Ic n="search" s={19} />
      <span>Cerca nel catalogo</span>
    </button>
    <div className="n-vgrid">
      <button type="button" className="n-cat all" onClick={() => { vib(6); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
        <img className="aemb" src={EMBLEM} alt="" />
        <span className="ib"><Bi n="catalog" s={28} /></span>
        <span className="tx">
          <b style={{ fontSize: 19 }}>Catalogo completo</b>
          <small style={{ color: '#e3f4ff' }}>{categories.reduce((s, c) => s + (c.countNumber || 0), 0).toLocaleString('it-IT')} prodotti</small>
        </span>
      </button>
      {categories.map((c) => {
        const ph = categoryPhoto(c);
        return (
          <button key={c.id} type="button" className="n-cat" onClick={() => onPick(c.id)}>
            <img className={`ph${ph.white ? ' w' : ''}`} src={ph.src} alt="" loading="lazy" referrerPolicy="no-referrer" />
            <span className="ib"><Bi n={categoryIcon(c.name)} s={28} /></span>
            <span className="tx">
              <b>{c.name}</b>
              <small>{(c.countNumber || 0).toLocaleString('it-IT')} prodotti</small>
            </span>
          </button>
        );
      })}
    </div>
    <NuovaBrandsPage embedded categories={categories} subcategories={subcategories} products={products} onSelectBrand={onSelectBrand} />
  </div>
);

/** Pagina "Tutte le marche" come nel prototipo: ricerca, lettere A-Z e schede logo. */
export const NuovaBrandsPage: React.FC<{
  categories: Category[];
  subcategories: Subcategory[];
  products: Product[];
  onSelectBrand: (name: string) => void;
  onBack?: () => void;
  embedded?: boolean;
}> = ({ categories, subcategories, products, onSelectBrand, onBack, embedded }) => {
  const { isAdmin } = useAdmin();
  const vecs = useBrandVectors();
  const [q, setQ] = useState('');
  const [managing, setManaging] = useState<{ title: string; ids: string[]; image?: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const brands = useMemo(
    () =>
      withProductCounts(buildBrandSummaries(categories, subcategories), subcategories, products)
        .filter((b) => b.productCount > 0)
        .sort((a, b) => a.name.localeCompare(b.name, 'it')),
    [categories, subcategories, products]
  );
  const list = q.trim() ? brands.filter((b) => b.name.toLowerCase().includes(q.trim().toLowerCase())) : brands;
  const letters = Array.from(new Set(brands.map((b) => b.name.charAt(0).toUpperCase()))).filter((c) => /[A-Z]/.test(c));
  return (
    <div className={embedded ? 'n-bemb' : 'n-bpage'} id="n-marche">
      <header className="n-vh n-bhead">
        {!embedded && onBack && (
          <button type="button" className="n-back" onClick={onBack} aria-label="Indietro">
            <Ic n="chevl" s={20} />
          </button>
        )}
        <div>
          <h1>Marche <span>· {list.length}</span></h1>
          <p>Tocca un logo per vederlo a colori, toccalo di nuovo per aprirlo</p>
        </div>
      </header>
      <label className="n-bsearch">
        <Ic n="search" s={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca una marca" autoComplete="off" aria-label="Cerca una marca" />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Cancella">
            <Ic n="x" s={16} />
          </button>
        )}
      </label>
      {!q && (
        <div className="n-az">
          {letters.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                const el = gridRef.current?.querySelector<HTMLElement>(`[data-l="${c}"]`);
                if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
                vib(5);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="n-bgrid" ref={gridRef}>
        {list.map((b) => (
          <div key={b.name} data-l={b.name.charAt(0).toUpperCase()} style={{ minWidth: 0 }}>
            <BrandCard
              name={b.name}
              image={b.image}
              vec={vecs[vecKey(b.name)]}
              count={b.productCount}
              isAdmin={isAdmin}
              onOpen={() => onSelectBrand(b.name)}
              onManage={() => setManaging({ title: b.name, ids: b.subcategoryIds, image: b.image })}
            />
          </div>
        ))}
      </div>
      {list.length === 0 && <p className="n-empty">Nessuna marca trovata per “{q}”.</p>}
      {isAdmin && managing && (
        <QuickManageModal title={managing.title} rootIds={managing.ids} currentImage={managing.image} onClose={() => setManaging(null)} />
      )}
    </div>
  );
};

/** Pagina Offerte come nel prototipo: titolo e schede dei prodotti in offerta. */
export const NuovaOffersPage: React.FC<{ products: Product[] }> = ({ products }) => {
  const render = useCardRenderer();
  const [flyer, setFlyer] = useState<Flyer | null>(null);
  useEffect(() => {
    fetchActiveFlyer().then(setFlyer).catch(() => setFlyer(null));
  }, []);
  const list = useMemo(
    () => products.filter((p) => p.isOffer || !!p.discountPercent || (!!p.originalPrice && p.originalPrice > p.price)),
    [products]
  );
  const sub = flyer?.validTo ? `Prezzi da volantino, validi fino al ${shortDate(flyer.validTo)}` : 'Prezzi da volantino';
  return (
    <div>
      <header className="n-vh">
        <h1>Offerte del mese</h1>
        <p>{sub}</p>
      </header>
      {list.length ? (
        <div className="n-pgrid">{list.map((p) => <React.Fragment key={p.id}>{render ? render(p) : null}</React.Fragment>)}</div>
      ) : (
        <p className="n-empty">In questo momento non ci sono offerte.</p>
      )}
    </div>
  );
};
