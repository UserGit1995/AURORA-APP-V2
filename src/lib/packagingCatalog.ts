export interface PackagingColorOption {
  name: string;
  hex: string;
}

export interface PackagingSizeOption {
  key: string;
  label: string;
  dims: string; // e.g. "33 x 33 x 3.5 cm"
  basePricePerUnit: number; // EUR
  moq: number; // Minimum order quantity
}

export interface PackagingCategory {
  id: "kraft_bags" | "pizza_boxes" | "pinsa_boxes" | "shoppers" | "napkins" | "cups";
  name: string;
  iconName: string;
  description: string;
  colors: PackagingColorOption[];
  sizes: PackagingSizeOption[];
}

export const PACKAGING_CATALOG: PackagingCategory[] = [
  {
    id: "kraft_bags",
    name: "Sacchetti Kraft e Buste",
    iconName: "ShoppingBag",
    description: "Sacchetti di carta kraft ad alta resistenza per asporto, pane, gastronomia e delivery.",
    colors: [
      { name: "Avana / Kraft Naturale", hex: "#cfa878" },
      { name: "Bianco Candido", hex: "#ffffff" },
      { name: "Nero Opaco", hex: "#1a1a1a" },
      { name: "Rosso Bordeaux", hex: "#8b1e1e" },
      { name: "Verde Salvia Eco", hex: "#2d5a3f" },
      { name: "Blu Notte", hex: "#1e3a8a" },
    ],
    sizes: [
      { key: "small", label: "Piccolo", dims: "18 x 8 x 24 cm", basePricePerUnit: 0.12, moq: 500 },
      { key: "medium", label: "Medio Standard", dims: "26 x 12 x 31 cm", basePricePerUnit: 0.18, moq: 500 },
      { key: "large", label: "Grande Delivery", dims: "32 x 17 x 41 cm", basePricePerUnit: 0.25, moq: 300 },
      { key: "xlarge", label: "Extra Large Maxi", dims: "45 x 17 x 48 cm", basePricePerUnit: 0.38, moq: 200 },
    ],
  },
  {
    id: "pizza_boxes",
    name: "Scatole per Pizza",
    iconName: "Box",
    description: "Cartone microonda idoneo al contatto alimentare con ritenzione termica ottimale per asporto.",
    colors: [
      { name: "Avana Naturale Kraft", hex: "#c8a175" },
      { name: "Bianco Pizzeria", hex: "#ffffff" },
      { name: "Grafica Tradizionale", hex: "#d97706" },
      { name: "Nero Elegante", hex: "#1c1917" },
    ],
    sizes: [
      { key: "p_20", label: "20x20 Baby / Trancio", dims: "20 x 20 x 3 cm", basePricePerUnit: 0.16, moq: 300 },
      { key: "p_26", label: "26x26 Piccola", dims: "26 x 26 x 3.5 cm", basePricePerUnit: 0.22, moq: 300 },
      { key: "p_33", label: "33x33 Standard Classic", dims: "33 x 33 x 3.5 cm", basePricePerUnit: 0.29, moq: 200 },
      { key: "p_36", label: "36x36 Maxi Family", dims: "36 x 36 x 4 cm", basePricePerUnit: 0.35, moq: 200 },
      { key: "p_40", label: "40x40 Gigante Party", dims: "40 x 40 x 4 cm", basePricePerUnit: 0.48, moq: 150 },
      { key: "p_50", label: "50x50 Metro / Comitiva", dims: "50 x 50 x 4 cm", basePricePerUnit: 0.72, moq: 100 },
    ],
  },
  {
    id: "pinsa_boxes",
    name: "Scatole Pinsa Romana",
    iconName: "Package",
    description: "Scatole allungate studiate appositamente per la forma rettangolare della Pinsa Romana gourmet.",
    colors: [
      { name: "Avana Artigianale", hex: "#c29b6c" },
      { name: "Bianco Pulito", hex: "#ffffff" },
      { name: "Grafica Pinsatore", hex: "#78350f" },
      { name: "Nero Luxury", hex: "#18181b" },
    ],
    sizes: [
      { key: "pinsa_mono", label: "20x30 Monoporzione", dims: "20 x 30 x 4.5 cm", basePricePerUnit: 0.28, moq: 300 },
      { key: "pinsa_std", label: "20x38 Romana Standard", dims: "20 x 38 x 4.5 cm", basePricePerUnit: 0.34, moq: 200 },
      { key: "pinsa_maxi", label: "25x45 Maxi Gourmet", dims: "25 x 45 x 5 cm", basePricePerUnit: 0.49, moq: 150 },
    ],
  },
  {
    id: "shoppers",
    name: "Shopper con Manico",
    iconName: "ShoppingBag",
    description: "Buste shopper in carta con manico ritorto o piatto per asporto comodo e sicuro.",
    colors: [
      { name: "Avana Naturale", hex: "#ca9e6e" },
      { name: "Bianco Candido", hex: "#ffffff" },
      { name: "Nero Matt", hex: "#0f172a" },
      { name: "Rosso Elegante", hex: "#991b1b" },
      { name: "Verde Foresta", hex: "#14532d" },
    ],
    sizes: [
      { key: "shop_s", label: "Shopper Piccola", dims: "22 x 10 x 29 cm", basePricePerUnit: 0.22, moq: 400 },
      { key: "shop_m", label: "Shopper Media", dims: "28 x 14 x 38 cm", basePricePerUnit: 0.31, moq: 300 },
      { key: "shop_l", label: "Shopper Grande", dims: "32 x 16 x 44 cm", basePricePerUnit: 0.42, moq: 200 },
      { key: "shop_asporto", label: "Fondo Largo Asporto Food", dims: "32 x 22 x 34 cm", basePricePerUnit: 0.46, moq: 200 },
    ],
  },
  {
    id: "napkins",
    name: "Tovaglie e Tovaglioli Bar",
    iconName: "Layers",
    description: "Tovaglioli per dispenser, bar, aperitivi, tovaglie e tovagliette sottopiatto in carta paglia o airlaid.",
    colors: [
      { name: "Carta Paglia / Naturale", hex: "#d9b88f" },
      { name: "Bianco Puro", hex: "#ffffff" },
      { name: "Nero Elegante", hex: "#18181b" },
      { name: "Bordeaux Bar", hex: "#7f1d1d" },
      { name: "Crema / Avorio", hex: "#fef3c7" },
    ],
    sizes: [
      { key: "tov_disp", label: "Tovaglioli Dispenser Bar", dims: "17 x 17 cm", basePricePerUnit: 0.012, moq: 5000 },
      { key: "tov_24", label: "Tovaglioli Bar / Aperitivo", dims: "24 x 24 cm", basePricePerUnit: 0.021, moq: 3000 },
      { key: "tov_33", label: "Tovaglioli Ristorante 2 Veli", dims: "33 x 33 cm", basePricePerUnit: 0.035, moq: 2000 },
      { key: "tov_40", label: "Tovaglioli Gran Gala 1/4", dims: "40 x 40 cm", basePricePerUnit: 0.065, moq: 1000 },
      { key: "mat_paglia", label: "Tovagliette Carta Paglia", dims: "30 x 40 cm", basePricePerUnit: 0.045, moq: 2000 },
      { key: "mat_airlaid", label: "Tovagliette Airlaid TNT Premium", dims: "35 x 50 cm", basePricePerUnit: 0.14, moq: 1000 },
    ],
  },
  {
    id: "cups",
    name: "Bicchieri e Tazzine Caffè",
    iconName: "Coffee",
    description: "Bicchierini espresso, tazzine e bicchieri per bevande calde o fredde monouso personalizzabili.",
    colors: [
      { name: "Avana Kraft Eco", hex: "#be976b" },
      { name: "Bianco Opaco", hex: "#ffffff" },
      { name: "Nero Velvet", hex: "#09090b" },
      { name: "Rosso Espresso", hex: "#b91c1c" },
      { name: "Verde Bio", hex: "#15803d" },
    ],
    sizes: [
      { key: "cup_25oz", label: "2.5 oz Espresso (75 ml)", dims: "ø 50 mm x 52 mm", basePricePerUnit: 0.045, moq: 1000 },
      { key: "cup_4oz", label: "4 oz Caffè Ristretto (120 ml)", dims: "ø 62 mm x 60 mm", basePricePerUnit: 0.055, moq: 1000 },
      { key: "cup_8oz", label: "8 oz Calda Bevanda (240 ml)", dims: "ø 80 mm x 92 mm", basePricePerUnit: 0.085, moq: 1000 },
      { key: "cup_9oz", label: "9 oz Cappuccino / Monouso (270 ml)", dims: "ø 80 mm x 98 mm", basePricePerUnit: 0.095, moq: 1000 },
      { key: "cup_12oz", label: "12 oz Takeaway Medio (360 ml)", dims: "ø 90 mm x 110 mm", basePricePerUnit: 0.125, moq: 500 },
      { key: "cup_16oz", label: "16 oz Maxi Cold Drink (480 ml)", dims: "ø 90 mm x 135 mm", basePricePerUnit: 0.155, moq: 500 },
    ],
  },
];

export function calculatePackagingEstimate(
  category: PackagingCategory,
  sizeKey: string,
  quantity: number,
  printColors: number
) {
  const sizeObj = category.sizes.find((s) => s.key === sizeKey) || category.sizes[0];
  let price = sizeObj.basePricePerUnit;

  // Print colors multiplier
  if (printColors === 2) price *= 1.15;
  if (printColors >= 3) price *= 1.30;

  // Quantity volume discounts
  if (quantity >= 5000) price *= 0.75;
  else if (quantity >= 2500) price *= 0.85;
  else if (quantity >= 1000) price *= 0.92;

  const unitPrice = Math.max(0.01, parseFloat(price.toFixed(3)));
  const totalPrice = Math.round(unitPrice * quantity * 100) / 100;

  return {
    unitPrice,
    totalPrice,
    moq: sizeObj.moq,
  };
}
