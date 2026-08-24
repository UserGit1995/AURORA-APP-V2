import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hkpqvggvqzvpkzeqmtga.supabase.co";

// Chiave ANON PUBLIC (non service_role)
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcHF2Z2d2cXp2cGt6ZXFtdGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2ODc3MjUsImV4cCI6MjEwMDI2MzcyNX0.1Lgr756jgYTo-dKsrlAOQpRkwvyULbV5Dt-xnpPrxss";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
