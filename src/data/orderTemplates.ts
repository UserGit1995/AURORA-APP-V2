import { OrderTemplate } from '../types';

export const PRESET_ORDER_TEMPLATES: OrderTemplate[] = [
  {
    id: 'tpl-settimanale-uffici',
    name: 'Rifornimento Settimanale Uffici & Reception',
    description: 'Kit essenziale per la sanificazione periodica di reception, scrivanie e aree comuni.',
    tag: 'Settimanale',
    isPreset: true,
    createdAt: '2026-01-15',
    items: [
      { productId: 'p1', quantity: 2 }, // Detersivo Lavatrice 3L
      { productId: 'p3', quantity: 3 }, // Sgrassatore Universale
      { productId: 'p4', quantity: 4 }, // Sapone Liquido Dermoprotettivo
      { productId: 'p5', quantity: 3 }, // Carta Igienica 2 Veli
      { productId: 'p6', quantity: 2 }, // Profumatore Ambiente
    ],
  },
  {
    id: 'tpl-haccp-cucina',
    name: 'Sanificazione Mensile HACCP Cucina & Mensa',
    description: 'Formulati concentrati per sgrassaggio piani inox, igiene mani e rispetto protocolli alimentari.',
    tag: 'Cucina & HACCP',
    isPreset: true,
    createdAt: '2026-02-01',
    items: [
      { productId: 'p3', quantity: 6 }, // Sgrassatore Universale (alta concentrazione)
      { productId: 'p4', quantity: 4 }, // Sapone Mani Antibatterico
      { productId: 'p5', quantity: 4 }, // Carta Monouso
      { productId: 'p1', quantity: 2 }, // Detersivo Tessili
    ],
  },
  {
    id: 'tpl-bagni-servizi',
    name: 'Scorta Igiene Bagni & Dispenser',
    description: 'Pacco scorta ad alta densità per servizi igienici aziendali a medio-alto passaggio.',
    tag: 'Bagni & Igiene',
    isPreset: true,
    createdAt: '2026-02-10',
    items: [
      { productId: 'p5', quantity: 6 }, // Carta Igienica Pura Cellulosa
      { productId: 'p4', quantity: 6 }, // Sapone Liquido 500ml
      { productId: 'p6', quantity: 3 }, // Profumatore Diffusore
      { productId: 'p3', quantity: 2 }, // Sgrassatore Sanitizzante
    ],
  },
  {
    id: 'tpl-accoglienza-top',
    name: 'Kit Accoglienza & Benessere Ospiti',
    description: 'Linea profumazioni persistenti, saponi idratanti e finiture di cura per showroom e hospitality.',
    tag: 'Reception & Hospitality',
    isPreset: true,
    createdAt: '2026-03-01',
    items: [
      { productId: 'p6', quantity: 4 }, // Profumatore Ambiente
      { productId: 'p4', quantity: 4 }, // Sapone Mani Aloe Vera
      { productId: 'p2', quantity: 2 }, // Ammorbidente Concentrato
      { productId: 'p5', quantity: 2 }, // Carta Igienica
    ],
  },
];

const STORAGE_KEY = 'aurora_b2b_order_templates';

/**
 * Loads order templates from LocalStorage, seeded with initial default presets
 */
export function getSavedTemplates(): OrderTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First time: store initial presets
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESET_ORDER_TEMPLATES));
      return PRESET_ORDER_TEMPLATES;
    }
    const parsed: OrderTemplate[] = JSON.parse(raw);
    
    // Ensure presets are present if user deleted all
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return PRESET_ORDER_TEMPLATES;
    }
    return parsed;
  } catch (err) {
    console.error('Error loading order templates:', err);
    return PRESET_ORDER_TEMPLATES;
  }
}

/**
 * Persists the entire list of templates to LocalStorage
 */
export function saveTemplatesToStorage(templates: OrderTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Error saving order templates to storage:', err);
  }
}

/**
 * Adds or updates an order template
 */
export function saveOrderTemplate(template: OrderTemplate): OrderTemplate[] {
  const current = getSavedTemplates();
  const existingIdx = current.findIndex((t) => t.id === template.id);
  let updated: OrderTemplate[];
  
  if (existingIdx > -1) {
    updated = [...current];
    updated[existingIdx] = {
      ...template,
      updatedAt: new Date().toISOString().split('T')[0],
    };
  } else {
    updated = [template, ...current];
  }

  saveTemplatesToStorage(updated);
  return updated;
}

/**
 * Deletes a user template (presets are protected or can be reset)
 */
export function deleteOrderTemplate(id: string): OrderTemplate[] {
  const current = getSavedTemplates();
  const updated = current.filter((t) => t.id !== id);
  saveTemplatesToStorage(updated);
  return updated;
}
