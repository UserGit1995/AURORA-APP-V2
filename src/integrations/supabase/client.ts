import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hkpqvggvqzvpkzeqmtga.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_VsQKGL806R1Jkh9Q70zMLQ_BPiUa4g";

export const supabase = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
  global: {
    fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      
      // Imposta la chiave su tutti i tipi di chiamata (REST, Storage, Auth)
      headers.set('apikey', PUBLISHABLE_KEY);
      
      // Rimuove Authorization se presente come Bearer con la publishable key per evitare conflitti HTTP
      if (headers.get('Authorization')?.includes('sb_publishable_')) {
        headers.delete('Authorization');
      }

      return fetch(input, { ...init, headers });
    },
  },
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
