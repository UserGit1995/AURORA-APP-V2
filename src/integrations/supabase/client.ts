import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hkpqvggvqzvpkzeqmtga.supabase.co";

// SE HAI RIGENERATO LA CHIAVE SU SUPABASE, SOSTITUISCI QUESTA STRINGA CON QUELLA NUOVA
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_VsQKGL806R1Jkh9Q70zMLQ_BPiUa4g";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
