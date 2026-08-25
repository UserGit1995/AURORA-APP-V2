import { UserProfile } from '../types';

export interface StoredAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // stored for demo verification
  company: string;
  piva: string;
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

// Default Admin Account: Noemi
export const ADMIN_NOEMI_EMAIL = 'noemi@aurora.app';

export const DEFAULT_ADMIN_ACCOUNT: StoredAccount = {
  id: 'admin-noemi',
  name: 'Noemi',
  email: ADMIN_NOEMI_EMAIL,
  passwordHash: 'admin123', // standard admin password or aurora2026
  company: 'Aurora Distribuzione S.r.l. - Amministrazione',
  piva: 'IT09876543210',
  role: 'superadmin',
  createdAt: '2026-01-01T00:00:00.000Z',
  avatarInitials: 'NO',
  phone: '+39 02 9876543',
  address: "Via dell'Industria 45",
  city: 'Milano',
  postalCode: '20145',
  province: 'MI',
};

// Initial Demo Client Account
const INITIAL_DEMO_CLIENT: StoredAccount = {
  id: 'client-rossi',
  name: 'Mario Rossi',
  email: 'cliente@rossiforniture.it',
  passwordHash: 'cliente123',
  company: 'Rossi Forniture S.r.l.',
  piva: 'IT12345678901',
  role: 'user',
  createdAt: '2026-01-15T10:00:00.000Z',
  avatarInitials: 'MR',
  phone: '+39 06 1234567',
  address: 'Via Roma 12',
  city: 'Roma',
  postalCode: '00100',
  province: 'RM',
};

// Retrieve registered accounts from localStorage
export function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (raw) {
      const parsed: StoredAccount[] = JSON.parse(raw);
      // Ensure Admin Noemi is always present and updated
      const hasAdmin = parsed.some(
        (a) => a.email.toLowerCase() === ADMIN_NOEMI_EMAIL.toLowerCase()
      );
      if (!hasAdmin) {
        parsed.unshift(DEFAULT_ADMIN_ACCOUNT);
        localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Error reading accounts from storage', e);
  }

  // Initial seeding with Admin Noemi and a sample B2B client
  const defaultAccounts = [DEFAULT_ADMIN_ACCOUNT, INITIAL_DEMO_CLIENT];
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(defaultAccounts));
  } catch {}
  return defaultAccounts;
}

// Convert StoredAccount to public UserProfile
export function toUserProfile(account: StoredAccount): UserProfile {
  const isSuper = account.role === 'superadmin';
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    company: account.company,
    piva: account.piva,
    role: account.role,
    avatarInitials: account.avatarInitials,
    phone: account.phone || '+39 02 0000000',
    address: account.address || '',
    city: account.city || '',
    postalCode: account.postalCode || '',
    province: account.province || '',
    country: 'Italia',
    permissions: {
      canEditCatalog: isSuper,
      canEditPrices: isSuper,
      canEditStock: isSuper,
      canEditOrders: isSuper,
      canEditUsers: isSuper,
      canEditCompanyInfo: isSuper,
      canDeleteRecords: isSuper,
      canOverrideDiscounts: isSuper,
    },
  };
}

// Authenticate user
export function authenticateUser(
  emailInput: string,
  passwordInput: string
): { success: boolean; user?: UserProfile; error?: string } {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanEmail) {
    return { success: false, error: 'Inserisci un indirizzo email valido.' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Inserisci la password.' };
  }

  const accounts = getRegisteredAccounts();
  const found = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

  if (!found) {
    return {
      success: false,
      error:
        'Nessun account trovato per questa email. Clicca sulla scheda "Registrati" per creare il tuo account aziendale B2B.',
    };
  }

  // Validate password (support admin default pass, or exact match)
  const isMasterPass =
    found.role === 'superadmin' &&
    (cleanPass === 'admin123' ||
      cleanPass === 'aurora2026' ||
      cleanPass === 'noemi2026' ||
      cleanPass === found.passwordHash);

  if (!isMasterPass && found.passwordHash !== cleanPass) {
    return {
      success: false,
      error: 'Password errata. Riprova con le credenziali corrette.',
    };
  }

  return {
    success: true,
    user: toUserProfile(found),
  };
}

// Register a new B2B client
export function registerNewUser(data: {
  name: string;
  company: string;
  piva: string;
  email: string;
  password: string;
}): { success: boolean; user?: UserProfile; error?: string } {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name.trim();
  const cleanCompany = data.company.trim();
  const cleanPiva = data.piva.trim().toUpperCase();
  const cleanPass = data.password.trim();

  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Inserisci il nome e cognome del referente aziendale.' };
  }
  if (!cleanCompany || cleanCompany.length < 2) {
    return { success: false, error: 'Inserisci la Ragione Sociale / Nome Azienda.' };
  }
  if (!cleanPiva || cleanPiva.length < 5) {
    return { success: false, error: 'Inserisci una Partita IVA valida.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Inserisci un indirizzo email valido.' };
  }
  if (!cleanPass || cleanPass.length < 4) {
    return { success: false, error: 'La password deve contenere almeno 4 caratteri.' };
  }

  const accounts = getRegisteredAccounts();
  const alreadyExists = accounts.some((a) => a.email.toLowerCase() === cleanEmail);

  if (alreadyExists) {
    return {
      success: false,
      error: 'Questa email è già registrata nel sistema. Clicca su "Accedi" per effettuare il login.',
    };
  }

  // Prevent unauthorized registration attempting to claim admin email
  const isNoemiEmail = cleanEmail === ADMIN_NOEMI_EMAIL.toLowerCase();

  const newAccount: StoredAccount = {
    id: `cli-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: cleanName,
    company: cleanCompany,
    piva: cleanPiva,
    email: cleanEmail,
    passwordHash: cleanPass,
    role: isNoemiEmail ? 'superadmin' : 'user', // only Noemi gets superadmin
    createdAt: new Date().toISOString(),
    avatarInitials: cleanName.substring(0, 2).toUpperCase(),
    country: 'Italia',
  };

  const updatedAccounts = [...accounts, newAccount];
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
  } catch (e) {
    console.error('Failed to save user account', e);
  }

  return {
    success: true,
    user: toUserProfile(newAccount),
  };
}
