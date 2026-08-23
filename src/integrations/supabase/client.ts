// Questo file inizializza Supabase in modo standard
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// =========================================================================
// VALORI DI FALLBACK (Usati se le variabili d'ambiente mancano)
// =========================================================================
const FALLBACK_URL = "https://hkpqvggvqzvpkzeqmtga.supabase.co";
const FALLBACK_KEY = "sb_publishable_VsQKGL806R1Jkh9Q70zMLQ_BPiUa4g";

function createSupabaseClient() {
  const SUPABASE_URL = 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
    process.env.SUPABASE_URL || 
    FALLBACK_URL;

  const SUPABASE_PUBLISHABLE_KEY = 
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)) || 
    process.env.SUPABASE_PUBLISHABLE_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    FALLBACK_KEY;

  // Inizializzazione standard SENZA la modifica degli header (che causava l'errore)
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
