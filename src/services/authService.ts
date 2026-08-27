import { UserProfile } from '../types';
import { getSupabase } from './supabase';

export interface StoredAccount {
  id: string;
  name: string;
  email: string;
  customerType: 'privato' | 'attivita';
  company?: string;
  piva?: string;
  role: 'superadmin' | 'user';
  createdAt: string;
  avatarInitials: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
}

const STORAGE_ACCOUNTS_KEY = 'aurora_registered_accounts';

// Recupera i profili "arricchiti" (azienda, P.IVA, ecc.) salvati localmente.
// L'identità e la password vere restano SEMPRE su Supabase Auth: qui teniamo
// solo i dati extra che l'app mostra nell'interfaccia.
export function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading accounts from storage', e);
  }
  return [];
}

function saveAccount(account: StoredAccount) {
  const accounts = getRegisteredAccounts().filter((a) => a.id !== account.id);
  accounts.push(account);
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save account profile', e);
  }
}

async function isRealAdmin(userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { data, error } = await sb
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

function buildProfile(userId: string, email: string, isAdmin: boolean, extra?: Partial<StoredAccount>): UserProfile {
  const stored = getRegisteredAccounts().find((a) => a.id === userId);
  const name = extra?.name || stored?.name || email.split('@')[0];
  return {
    id: userId,
    name,
    email,
    customerType: extra?.customerType || stored?.customerType || 'privato',
    company: extra?.company || stored?.company || (isAdmin ? 'AURORA Casalinghi & Distribuzione' : 'Cliente Privato (Casalinghi)'),
    piva: extra?.piva || stored?.piva || '',
    role: isAdmin ? 'superadmin' : 'user',
    avatarInitials: name.substring(0, 2).toUpperCase(),
    phone: extra?.phone || stored?.phone || '',
    address: stored?.address || '',
    city: extra?.city || stored?.city || '',
    postalCode: stored?.postalCode || '',
    province: stored?.province || '',
    country: stored?.country || 'Italia',
    permissions: {
      canEditCatalog: isAdmin,
      canEditPrices: isAdmin,
      canEditStock: isAdmin,
      canEditOrders: isAdmin,
      canEditUsers: isAdmin,
      canEditCompanyInfo: isAdmin,
      canDeleteRecords: isAdmin,
      canOverrideDiscounts: isAdmin,
    },
  };
}

/**
 * Login vero: stabilisce una sessione reale su Supabase (necessaria perché il
 * database accetti i salvataggi). Prima l'app non lo faceva mai: sembrava
 * "loggato" ma era solo un'etichetta locale, e ogni scrittura veniva rifiutata.
 */
export async function authenticateUser(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanEmail) return { success: false, error: 'Inserisci il tuo indirizzo email.' };
  if (!cleanPass) return { success: false, error: 'Inserisci la tua password.' };

  const sb = getSupabase();
  if (!sb) {
    return { success: false, error: 'Connessione al database non disponibile. Riprova tra poco.' };
  }

  const { data, error } = await sb.auth.signInWithPassword({ email: cleanEmail, password: cleanPass });
  if (error || !data.user) {
    return { success: false, error: 'Email o password non corrette.' };
  }

  const admin = await isRealAdmin(data.user.id);
  return { success: true, user: buildProfile(data.user.id, cleanEmail, admin) };
}

/**
 * Registrazione vera: crea un account reale su Supabase Auth. Il ruolo admin
 * NON si può più assegnare da un "codice segreto" nel codice del browser
 * (chiunque avrebbe potuto leggerlo e auto-promuoversi admin) — va assegnato
 * una volta sola dal pannello Supabase, vedi le istruzioni che ti ho scritto.
 */
export async function registerNewUser(data: {
  customerType: 'privato' | 'attivita';
  name: string;
  email: string;
  password: string;
  company?: string;
  piva?: string;
  phone?: string;
  city?: string;
}): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name.trim();
  const cleanPass = data.password.trim();
  const customerType = data.customerType || 'privato';

  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: customerType === 'privato' ? 'Inserisci il tuo Nome e Cognome.' : 'Inserisci il nome del referente aziendale.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Inserisci un indirizzo email valido.' };
  }
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'La password deve avere almeno 6 caratteri.' };
  }

  let cleanCompany = '';
  let cleanPiva = '';
  if (customerType === 'attivita') {
    cleanCompany = (data.company || '').trim();
    cleanPiva = (data.piva || '').trim().toUpperCase();
    if (!cleanCompany || cleanCompany.length < 2) {
      return { success: false, error: "Inserisci la Ragione Sociale / Nome dell'attività." };
    }
    if (!cleanPiva || cleanPiva.length < 5) {
      return { success: false, error: 'Inserisci una Partita IVA o Codice Fiscale valido.' };
    }
  } else {
    cleanCompany = 'Cliente Privato (Famiglia / Casalinghi)';
  }

  const sb = getSupabase();
  if (!sb) {
    return { success: false, error: 'Connessione al database non disponibile. Riprova tra poco.' };
  }

  const { data: signUpData, error } = await sb.auth.signUp({ email: cleanEmail, password: cleanPass });
  if (error) {
    if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('registered')) {
      return { success: false, error: 'Questa email è già registrata. Clicca su "Accedi" per entrare.' };
    }
    return { success: false, error: error.message };
  }
  if (!signUpData.user) {
    return { success: false, error: 'Registrazione non riuscita. Riprova.' };
  }

  const account: StoredAccount = {
    id: signUpData.user.id,
    name: cleanName,
    customerType,
    company: cleanCompany,
    piva: cleanPiva,
    email: cleanEmail,
    role: 'user',
    createdAt: new Date().toISOString(),
    avatarInitials: cleanName.substring(0, 2).toUpperCase(),
    phone: data.phone?.trim() || '',
    city: data.city?.trim() || '',
    country: 'Italia',
  };
  saveAccount(account);

  return { success: true, user: buildProfile(signUpData.user.id, cleanEmail, false, account) };
}

/** Recupera l'utente già loggato (sessione persistita) al riavvio dell'app. */
export async function getCurrentSessionUser(): Promise<UserProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user || !user.email) return null;
  const admin = await isRealAdmin(user.id);
  return buildProfile(user.id, user.email, admin);
}

export async function signOutUser(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
}
