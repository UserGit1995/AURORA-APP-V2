import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hkpqvggvqzvpkzeqmtga.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcHF2Z2d2cXp2cGt6ZXFtdGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2ODc3MjUsImV4cCI6MjEwMDI2MzcyNX0.1Lgr756jgYTo-dKsrlAOQpRkwvyULbV5Dt-xnpPrxss";

export const supabase = createClient<Database>(
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || SUPABASE_URL,
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)) || SUPABASE_ANON_KEY,
  {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
