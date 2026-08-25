import { Category, Product, Order, NotificationItem } from '../types';

// Images imported from generated assets
import heroImage from '../assets/images/hero_cleaning_products_1787321412943.jpg';
import catIgieneCasa from '../assets/images/cat_igiene_casa_1787321431686.jpg';
import catIgieneCorpo from '../assets/images/cat_igiene_corpo_1787321448819.jpg';
import catDetersivi from '../assets/images/cat_detersivi_1787321464302.jpg';
import catCasa from '../assets/images/cat_casa_1787321486866.jpg';
import catAccessori from '../assets/images/cat_accessori_1787321499984.jpg';
import catCarta from '../assets/images/cat_carta_1787321516328.jpg';
import catProfumatori from '../assets/images/cat_profumatori_1787321530765.jpg';
import bannerBottles from '../assets/images/banner_bottles_1787321549985.jpg';

import prodDetersivo from '../assets/images/prod_detersivo_1787321565946.jpg';
import prodAmmorbidente from '../assets/images/prod_ammorbidente_1787321579670.jpg';
import prodSgrassatore from '../assets/images/prod_sgrassatore_1787321594188.jpg';
import prodSapone from '../assets/images/prod_sapone_1787321609554.jpg';
import prodCarta from '../assets/images/prod_carta_1787321627770.jpg';
import prodProfumatore from '../assets/images/prod_profumatore_1787321644325.jpg';

export const HERO_IMAGE = heroImage;
export const BANNER_BOTTLES_IMAGE = bannerBottles;

export const CATEGORIES: Category[] = [
  {
    id: 'igiene-casa',
    name: 'Igiene Casa',
    count: '128 prodotti',
    countNumber: 128,
    image: catIgieneCasa,
    description: 'Detergenti multiuso, igienizzanti e prodotti per superfici dure, bagni e cucine.',
  },
  {
    id: 'igiene-corpo',
    name: 'Igiene Corpo',
    count: '92 prodotti',
    countNumber: 92,
    image: catIgieneCorpo,
    description: 'Saponi liquidi, bagnoschiuma professionali, shampoo e cura della persona.',
  },
  {
    id: 'detersivi',
    name: 'Detersivi',
    count: '156 prodotti',
    countNumber: 156,
    image: catDetersivi,
    description: 'Detersivi per lavatrice, polveri concentrate, ammorbidenti e smacchiatori.',
  },
  {
    id: 'casa',
    name: 'Casa',
    count: '78 prodotti',
    countNumber: 78,
    image: catCasa,
    description: 'Articoli e soluzioni complete per la cura, pulizia e accoglienza della casa.',
  },
  {
    id: 'accessori-pulizia',
    name: 'Accessori Pulizia',
    count: '64 prodotti',
    countNumber: 64,
    image: catAccessori,
    description: 'Mop professionali, secchi industriali, panni microfibra, spugne abrasive.',
  },
  {
    id: 'carta-monouso',
    name: 'Carta e Monouso',
    count: '54 prodotti',
    countNumber: 54,
    image: catCarta,
    description: 'Carta igienica maxi rotoli, asciugamani piegati a V/Z, tovaglioli e bobine.',
  },
  {
    id: 'profumatori',
    name: 'Profumatori',
    count: '37 prodotti',
    countNumber: 37,
    image: catProfumatori,
    description: 'Diffusori a bastoncino, spray essenziali persistenti per ambienti e tessuti.',
  },
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Detersivo Lavatrice',
    category: 'Igiene Casa',
    categoryId: 'igiene-casa',
    image: prodDetersivo,
    price: 4.85,
    unit: 'flacone 3L',
    packageQty: 'Cartone da 4 pz',
    code: 'AUR-LAV-3000',
    isFeatured: true,
    isFavorite: false,
    stock: 240,
    lowStockThreshold: 100,
    description: 'Detersivo liquido concentrato igienizzante per bucato a mano e in lavatrice. Rimuove le macchie ostinate anche a basse temperature (30°C).',
    specs: {
      format: '3000 ml (60 lavaggi)',
      fragrance: 'Brezza Marina & Muschio Bianco',
      certifications: ['HACCP Compliant', 'Eco-Formula'],
    },
  },
  {
    id: 'p2',
    name: 'Ammorbidente',
    category: 'Detersivi',
    categoryId: 'detersivi',
    image: prodAmmorbidente,
    price: 3.40,
    unit: 'flacone 2L',
    packageQty: 'Cartone da 6 pz',
    code: 'AUR-AMM-2000',
    isFeatured: true,
    isFavorite: false,
    isOffer: true,
    discountPercent: 20,
    stock: 180,
    lowStockThreshold: 100,
    description: 'Ammorbidente concentrato ad azione distensiva sulle fibre tessili, dona morbidezza duratura e facilita la stiratura.',
    specs: {
      format: '2000 ml (80 dosi)',
      fragrance: 'Fiori di Primavera & Vaniglia',
      certifications: ['Dermatologicamente Testato'],
    },
  },
  {
    id: 'p3',
    name: 'Sgrassatore Universale',
    category: 'Igiene Casa',
    categoryId: 'igiene-casa',
    image: prodSgrassatore,
    price: 2.75,
    unit: 'spray 750ml',
    packageQty: 'Cartone da 12 pz',
    code: 'AUR-SGR-750',
    isFeatured: true,
    isFavorite: false,
    stock: 350,
    lowStockThreshold: 150,
    description: 'Super sgrassatore ad altissima concentrazione. Pulisce a fondo cappe, forni, piani di lavoro, acciaio inox e macchie meccaniche.',
    specs: {
      format: '750 ml con trigger bi-funzione',
      fragrance: 'Marsiglia Tradizionale',
      certifications: ['HACCP Food Contact', 'Super Action'],
    },
  },
  {
    id: 'p4',
    name: 'Sapone Liquido',
    category: 'Igiene Corpo',
    categoryId: 'igiene-corpo',
    image: prodSapone,
    price: 2.10,
    unit: 'dosatore 500ml',
    packageQty: 'Cartone da 12 pz',
    code: 'AUR-SAP-500',
    isFeatured: true,
    isFavorite: false,
    stock: 420,
    lowStockThreshold: 100,
    description: 'Sapone liquido dermoprotettivo a pH neutro per le mani con antibatterico naturale ed estratto di aloe vera idratante.',
    specs: {
      format: '500 ml con dispenser',
      fragrance: 'Aloe Vera & Latte di Mandorla',
      certifications: ['pH 5.5 Neutro', 'Clinicamente Testato'],
    },
  },
  {
    id: 'p5',
    name: 'Carta Igienica 2 Veli',
    category: 'Carta e Monouso',
    categoryId: 'carta-monouso',
    image: prodCarta,
    price: 6.90,
    unit: 'pacco 24 rotoli',
    packageQty: 'Confezione 4x6 rotoli',
    code: 'AUR-CRT-024',
    isFeatured: true,
    isFavorite: false,
    isOffer: true,
    discountPercent: 30,
    stock: 500,
    lowStockThreshold: 200,
    description: 'Carta igienica pura cellulosa vergine a 2 veli microgoffrata. Massima morbidezza e resistenza per uso domestico e professionale.',
    specs: {
      format: '200 strappi per rotolo (2 veli)',
      fragrance: 'Inodore / Puro Bianco',
      certifications: ['PEFC Certificato', '100% Pura Cellulosa'],
    },
  },
  {
    id: 'p6',
    name: 'Profumatore Ambiente',
    category: 'Profumatori',
    categoryId: 'profumatori',
    image: prodProfumatore,
    price: 7.50,
    unit: 'diffusore 250ml',
    packageQty: 'Confezione 6 pz con bastoncini',
    code: 'AUR-PRF-250',
    isFeatured: true,
    isFavorite: false,
    stock: 45,
    lowStockThreshold: 100,
    description: 'Diffusore di fragranza per ambienti con bastoncini in rattan naturale e fiore sola diffondente. Rilascia una persistente scia per oltre 60 giorni.',
    specs: {
      format: '250 ml in flacone vetro satinato',
      fragrance: 'Ambra Nera & Legno di Sandalo',
      certifications: ['Oli Essenziali Naturali'],
    },
  },
  // Additional products for comprehensive browsing
  {
    id: 'p7',
    name: 'Disinfettante Pavimenti Cloro-Attivo',
    category: 'Igiene Casa',
    categoryId: 'igiene-casa',
    image: catIgieneCasa,
    price: 3.20,
    unit: 'flacone 1.5L',
    packageQty: 'Cartone da 8 pz',
    code: 'AUR-DIS-1500',
    isFeatured: false,
    isFavorite: false,
    stock: 210,
    lowStockThreshold: 100,
    description: 'Presidio Medico Chirurgico per la disinfezione profonda di pavimenti e superfici piastrellate.',
    specs: {
      format: '1500 ml',
      fragrance: 'Pino Selvatico',
      certifications: ['PMC Reg. Min. Salute'],
    },
  },
  {
    id: 'p8',
    name: 'Mop Professionale Microfibra Twist',
    category: 'Accessori Pulizia',
    categoryId: 'accessori-pulizia',
    image: catAccessori,
    price: 5.40,
    unit: 'ricambio 250g',
    packageQty: 'Confezione da 10 pz',
    code: 'AUR-MOP-250',
    isFeatured: false,
    isFavorite: false,
    stock: 28,
    lowStockThreshold: 80,
    description: 'Mop professionale ad alta densità di microfibra assorbente con attacco universale filettato.',
    specs: {
      format: '250 grammi filato doppio',
      certifications: ['Resistente al lavaggio a 90°C'],
    },
  },
  {
    id: 'p9',
    name: 'Bobina Industriale Carta Asciugatutto',
    category: 'Carta e Monouso',
    categoryId: 'carta-monouso',
    image: catCarta,
    price: 11.50,
    unit: 'rotolo 800 strappi',
    packageQty: 'Confezione 2 rotoli',
    code: 'AUR-BOB-800',
    isFeatured: false,
    isFavorite: false,
    isOffer: true,
    discountPercent: 15,
    stock: 310,
    lowStockThreshold: 150,
    description: 'Bobina di carta a 2 veli goffrata per cucine professionali, officine e laboratori.',
    specs: {
      format: '800 strappi (240 metri)',
      certifications: ['Idoneità Contatto Alimenti'],
    },
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-2026-8841',
    date: '18 Ago 2026',
    status: 'In elaborazione',
    estimatedDelivery: '22 Ago 2026 (Entro 48h)',
    courier: 'GLS Logistics B2B Express',
    trackingNumber: 'GLS-IT-8841920',
    total: 348.50,
    subtotal: 285.65,
    vatAmount: 62.85,
    shippingCost: 0.00,
    paymentMethod: 'Bonifico Bancario B2B 30/60 gg d.f.',
    shippingAddress: {
      companyName: 'AURORA Retail & Facility Service S.r.l.',
      recipient: 'Ing. Marco Bellini (Ufficio Acquisti)',
      street: 'Via dell\'Industria 45, Palazzina B, Ingresso Magazzino 3',
      city: 'Milano',
      province: 'MI',
      postalCode: '20145',
      country: 'Italia',
      phone: '+39 02 8934 1120',
      vatNumber: 'IT09876543210',
      deliveryNotes: 'Consegna con sponda idraulica, orario scarico 08:30 - 12:30 / 14:00 - 17:30.'
    },
    itemsCount: 48,
    items: [
      { productId: 'p1', productName: 'Detersivo Lavatrice Igienizzante', code: 'AUR-LAV-01', packageQty: 'Cartone 4 pz x 3000ml', qty: 10, price: 19.40 },
      { productId: 'p3', productName: 'Sgrassatore Professionale Marsiglia', code: 'AUR-SGR-750', packageQty: 'Cartone 12 pz x 750ml', qty: 3, price: 33.00 },
      { productId: 'p5', productName: 'Carta Igienica Soft 2 Veli Pura Cellulosa', code: 'AUR-CIG-200', packageQty: 'Conf 24 rotoli (96 conf)', qty: 8, price: 55.20 }
    ]
  },
  {
    id: 'ORD-2026-8512',
    date: '15 Ago 2026',
    status: 'Spedito',
    estimatedDelivery: 'Oggi, 21 Ago 2026 (In consegna)',
    courier: 'BRT Corriere Espresso B2B',
    trackingNumber: 'BRT-9041824-B2B',
    total: 640.00,
    subtotal: 524.59,
    vatAmount: 115.41,
    shippingCost: 0.00,
    paymentMethod: 'Ri.Ba. 30 giorni fine mese',
    shippingAddress: {
      companyName: 'AURORA Facility & Cleaning Hub',
      recipient: 'Sig. Roberto Vianello (Responsabile Logistica)',
      street: 'Corso Europa 128, Polo Logistico Est',
      city: 'Monza',
      province: 'MB',
      postalCode: '20900',
      country: 'Italia',
      phone: '+39 039 4482 911',
      vatNumber: 'IT09876543210',
      deliveryNotes: 'Avvisare 30 minuti prima dell\'arrivo per predisporre muletto.'
    },
    itemsCount: 72,
    items: [
      { productId: 'p1', productName: 'Detersivo Lavatrice Igienizzante', code: 'AUR-LAV-01', packageQty: 'Cartone 4 pz x 3000ml', qty: 8, price: 19.40 },
      { productId: 'p7', productName: 'Disinfettante Presidio Medico Chirurgico', code: 'AUR-MED-150', packageQty: 'Cartone 6 pz x 1500ml', qty: 12, price: 21.00 },
      { productId: 'p4', productName: 'Sapone Mani Antibatterico Aloe', code: 'AUR-SAP-500', packageQty: 'Cartone 12 pz x 500ml', qty: 10, price: 25.20 }
    ]
  },
  {
    id: 'ORD-2026-7930',
    date: '04 Ago 2026',
    status: 'Consegnato',
    estimatedDelivery: '06 Ago 2026 (Consegnato)',
    courier: 'Arco Spedizioni Pallet',
    trackingNumber: 'ARC-7930114',
    total: 820.00,
    subtotal: 672.13,
    vatAmount: 147.87,
    shippingCost: 0.00,
    paymentMethod: 'Carta di Credito Aziendale Corporate',
    shippingAddress: {
      companyName: 'AURORA Retail & Facility Service S.r.l.',
      recipient: 'Ing. Marco Bellini',
      street: 'Via dell\'Industria 45, Palazzina B',
      city: 'Milano',
      province: 'MI',
      postalCode: '20145',
      country: 'Italia',
      phone: '+39 02 8934 1120',
      vatNumber: 'IT09876543210',
      deliveryNotes: 'Ricevuto e verificato al cancello 4.'
    },
    itemsCount: 120,
    items: [
      { productId: 'p4', productName: 'Sapone Mani Antibatterico Aloe', code: 'AUR-SAP-500', packageQty: 'Cartone 12 pz x 500ml', qty: 15, price: 25.20 },
      { productId: 'p6', productName: 'Profumatore Ambiente Bastoncini Rattan', code: 'AUR-PRF-250', packageQty: 'Conf 6 pz x 250ml', qty: 10, price: 45.00 }
    ]
  },
  {
    id: 'ORD-2026-6412',
    date: '22 Lug 2026',
    status: 'Consegnato',
    estimatedDelivery: '24 Lug 2026 (Consegnato)',
    courier: 'GLS Logistics B2B Express',
    trackingNumber: 'GLS-IT-641208',
    total: 512.30,
    subtotal: 419.92,
    vatAmount: 92.38,
    shippingCost: 0.00,
    paymentMethod: 'Bonifico Bancario Anticipato',
    shippingAddress: {
      companyName: 'AURORA Retail & Facility Service S.r.l.',
      recipient: 'Dott.ssa Laura De Luca',
      street: 'Via dell\'Industria 45, Palazzina A',
      city: 'Milano',
      province: 'MI',
      postalCode: '20145',
      country: 'Italia',
      phone: '+39 02 8934 1122',
      vatNumber: 'IT09876543210',
      deliveryNotes: 'Consegnato con successo.'
    },
    itemsCount: 65,
    items: [
      { productId: 'p2', productName: 'Ammorbidente Concentrato Lavanda', code: 'AUR-AMM-02', packageQty: 'Cartone 6 pz x 2000ml', qty: 12, price: 20.40 }
    ]
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Offerte Speciali del Mese',
    message: 'Sconti esclusivi fino al -30% su carta monouso e ammorbidenti per ordini sopra 10 colli.',
    time: '2 ore fa',
    read: false,
    type: 'promo'
  },
  {
    id: 'n2',
    title: 'Nuovo Listino Disponibile',
    message: 'È stato aggiornato il listino B2B per la linea Igiene Casa e Sanificazione.',
    time: 'Ieri',
    read: false,
    type: 'info'
  },
  {
    id: 'n3',
    title: 'Spedizione Ordine ORD-2026-7930',
    message: 'Il tuo ordine è stato consegnato con successo dal corriere espresso.',
    time: '3 giorni fa',
    read: true,
    type: 'order'
  }
];
