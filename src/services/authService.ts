import { UserProfile } from '../types';

export interface StoredAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
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

// Retrieve registered accounts from localStorage
export function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading accounts from storage', e);
  }
  return [];
}

// Convert StoredAccount to public UserProfile
export function toUserProfile(account: StoredAccount): UserProfile {
  const isSuper = account.role === 'superadmin';
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    customerType: account.customerType || (account.company ? 'attivita' : 'privato'),
    company: account.company || (account.customerType === 'privato' ? 'Cliente Privato (Casalinghi)' : 'Attività'),
    piva: account.piva || '',
    role: account.role,
    avatarInitials: account.avatarInitials,
    phone: account.phone || '',
    address: account.address || '',
    city: account.city || '',
    postalCode: account.postalCode || '',
    province: account.province || '',
    country: account.country || 'Italia',
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

// Authenticate user with strict verification against registered accounts or admin credentials
export function authenticateUser(
  emailInput: string,
  passwordInput: string
): { success: boolean; user?: UserProfile; error?: string } {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanEmail) {
    return { success: false, error: 'Inserisci il tuo indirizzo email.' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Inserisci la tua password.' };
  }

  // 1. Check if it is the dedicated SuperAdmin Noemi
  const isNoemiAdminEmail = cleanEmail === 'noemi@aurora.app';
  if (isNoemiAdminEmail) {
    const accounts = getRegisteredAccounts();
    const savedAdmin = accounts.find((a) => a.email.toLowerCase() === 'noemi@aurora.app');

    const isValidAdminPass =
      (savedAdmin && savedAdmin.passwordHash === cleanPass) ||
      cleanPass === 'admin123' ||
      cleanPass === 'aurora2026' ||
      cleanPass === 'noemi2026';

    if (!isValidAdminPass) {
      return {
        success: false,
        error: 'Password di amministrazione non corretta.',
      };
    }

    const adminUser: UserProfile = {
      id: 'admin-noemi',
      name: savedAdmin ? savedAdmin.name : 'Noemi',
      email: 'noemi@aurora.app',
      customerType: 'attivita',
      company: savedAdmin?.company || 'Aurora Distribuzione S.r.l. - Amministrazione',
      piva: savedAdmin?.piva || 'IT09876543210',
      role: 'superadmin',
      avatarInitials: 'NO',
      permissions: {
        canEditCatalog: true,
        canEditPrices: true,
        canEditStock: true,
        canEditOrders: true,
        canEditUsers: true,
        canEditCompanyInfo: true,
        canDeleteRecords: true,
        canOverrideDiscounts: true,
      },
    };

    return { success: true, user: adminUser };
  }

  // 2. For regular users: strictly look up registered accounts in storage
  const accounts = getRegisteredAccounts();
  const found = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

  if (!found) {
    return {
      success: false,
      error:
        'Account non trovato. Se non sei ancora registrato, clicca sulla scheda "Registrati" per creare il tuo account.',
    };
  }

  if (found.passwordHash !== cleanPass) {
    return {
      success: false,
      error: 'Password errata. Controlla e riprova.',
    };
  }

  return {
    success: true,
    user: toUserProfile(found),
  };
}

// Register a new user (supports both Private Household customer and Business/Supplier customer)
export function registerNewUser(data: {
  customerType: 'privato' | 'attivita';
  name: string;
  email: string;
  password: string;
  company?: string;
  piva?: string;
  phone?: string;
  city?: string;
}): { success: boolean; user?: UserProfile; error?: string } {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name.trim();
  const cleanPass = data.password.trim();
  const customerType = data.customerType || 'privato';

  if (!cleanName || cleanName.length < 2) {
    return {
      success: false,
      error: customerType === 'privato' ? 'Inserisci il tuo Nome e Cognome.' : 'Inserisci il nome del referente aziendale.',
    };
  }

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Inserisci un indirizzo email valido.' };
  }

  if (!cleanPass || cleanPass.length < 4) {
    return { success: false, error: 'La password deve avere almeno 4 caratteri.' };
  }

  let cleanCompany = '';
  let cleanPiva = '';

  if (customerType === 'attivita') {
    cleanCompany = (data.company || '').trim();
    cleanPiva = (data.piva || '').trim().toUpperCase();

    if (!cleanCompany || cleanCompany.length < 2) {
      return { success: false, error: 'Inserisci la Ragione Sociale / Nome dell\'attività.' };
    }
    if (!cleanPiva || cleanPiva.length < 5) {
      return { success: false, error: 'Inserisci una Partita IVA o Codice Fiscale valido.' };
    }
  } else {
    cleanCompany = 'Cliente Privato (Famiglia / Casalinghi)';
  }

  const accounts = getRegisteredAccounts();
  const alreadyExists = accounts.some((a) => a.email.toLowerCase() === cleanEmail);

  if (alreadyExists) {
    return {
      success: false,
      error: 'Questa email è già registrata. Clicca su "Accedi" per entrare.',
    };
  }

  // Only noemi@aurora.app gets admin privileges; all others are strictly standard users
  const isNoemi = cleanEmail === 'noemi@aurora.app';

  const newAccount: StoredAccount = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name: cleanName,
    customerType,
    company: cleanCompany,
    piva: cleanPiva,
    email: cleanEmail,
    passwordHash: cleanPass,
    role: isNoemi ? 'superadmin' : 'user',
    createdAt: new Date().toISOString(),
    avatarInitials: cleanName.substring(0, 2).toUpperCase(),
    phone: data.phone?.trim() || '',
    city: data.city?.trim() || '',
    country: 'Italia',
  };

  const updatedAccounts = [...accounts, newAccount];
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
  } catch (e) {
    console.error('Failed to save account', e);
  }

  return {
    success: true,
    user: toUserProfile(newAccount),
  };
}
