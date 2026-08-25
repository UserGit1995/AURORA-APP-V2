import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Order, Category, SystemSettings } from '../types';

// Read client-side environment variables safely
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Supabase initialization error:', err);
      supabaseInstance = null;
    }
  }
  return supabaseInstance;
}

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));
};

/**
 * Fetch products from Supabase table 'products'
 */
export async function fetchSupabaseProducts(): Promise<Product[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('products').select('*');
    if (error) {
      console.warn('Supabase fetch products notice:', error.message);
      return null;
    }
    return data && data.length > 0 ? (data as Product[]) : null;
  } catch (e) {
    console.warn('Supabase products fetch failed:', e);
    return null;
  }
}

/**
 * Upsert product to Supabase
 */
export async function syncSupabaseProduct(product: Product): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('products').upsert(product);
    if (error) {
      console.warn('Supabase sync product notice:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase sync product error:', e);
    return false;
  }
}

/**
 * Delete product from Supabase
 */
export async function deleteSupabaseProduct(productId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('products').delete().eq('id', productId);
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch orders from Supabase table 'orders'
 */
export async function fetchSupabaseOrders(): Promise<Order[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('orders').select('*').order('date', { ascending: false });
    if (error) return null;
    return data && data.length > 0 ? (data as Order[]) : null;
  } catch {
    return null;
  }
}

/**
 * Upsert order to Supabase
 */
export async function syncSupabaseOrder(order: Order): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('orders').upsert(order);
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch categories from Supabase table 'categories'
 */
export async function fetchSupabaseCategories(): Promise<Category[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('categories').select('*');
    if (error) return null;
    return data && data.length > 0 ? (data as Category[]) : null;
  } catch {
    return null;
  }
}

/**
 * Sync category to Supabase
 */
export async function syncSupabaseCategory(category: Category): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('categories').upsert(category);
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Sync system settings to Supabase
 */
export async function syncSupabaseSettings(settings: SystemSettings): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from('system_settings').upsert({ id: 'global_settings', ...settings });
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}
