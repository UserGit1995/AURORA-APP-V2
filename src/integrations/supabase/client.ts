import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hkpqvggvqzvpkzeqmtga.supabase.co";

// INCOLLA QUI LA TUA CHIAVE SERVICE_ROLE DI SUPABASE (quella che inizia per eyJ...)
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcHF2Z2d2cXp2cGt6ZXFtdGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDY4NzcyNSwiZXhwIjoyMTAwMjYzNzI1fQ.otpGqTEUMlqGQwWtroTaarfEdDGBklxakaBk6mpkLi0";

export const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
