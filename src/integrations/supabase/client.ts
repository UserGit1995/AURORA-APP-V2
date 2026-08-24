// NOTA: semplificato per usare esclusivamente SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY
// (ignora deliberatamente VITE_SUPABASE_*, NEXT_PUBLIC_SUPABASE_* e simili: quelle
// variabili duplicate su Vercel erano la causa degli errori "Invalid API key"
// intermittenti, perché venivano lette per prime anche quando obsolete).
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const FALLBACK_URL = "https://hkpqvggvqzvpkzeqmtga.supabase.co";
const FALLBACK_KEY = "sb_publishable_VsQKGL806R1Jkh9Q70zMLQ_BPiUa4g";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  // La chiave "publishable" non è un segreto (è pensata per essere visibile nel browser),
  // quindi qui usiamo sempre il valore noto e corretto del progetto, senza dipendere
  // da variabili d'ambiente che su Vercel si sono dimostrate facili da disallineare.
  const SUPABASE_URL = FALLBACK_URL;
  const SUPABASE_PUBLISHABLE_KEY = FALLBACK_KEY;

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
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
