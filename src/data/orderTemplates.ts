import { OrderTemplate } from '../types';

// I "modelli preconfigurati" di esempio puntavano a prodotti finti (p1, p3...) che non
// esistono nel catalogo vero: ora ci sono solo i modelli salvati dal cliente stesso.
export const PRESET_ORDER_TEMPLATES: OrderTemplate[] = [];

const STORAGE_KEY = 'aurora_b2b_order_templates';

/**
 * Loads order templates from LocalStorage, seeded with initial default presets
 */
export function getSavedTemplates(): OrderTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: OrderTemplate[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Scarta i vecchi modelli di esempio salvati da versioni precedenti
    return parsed.filter((t) => !t.isPreset);
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
