import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  Building2,
  CheckCircle2,
  ShieldCheck,
  User,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuroraLogo } from './AuroraLogo';
import { useLanguage } from '../context/LanguageContext';
import { UserProfile } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const { language } = useLanguage();
  const isIt = language === 'it';

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [piva, setPiva] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const isNoemiAdmin = cleanEmail === 'noemi@aurora.app';

    setTimeout(() => {
      setIsLoading(false);
      setLoginSuccess(true);

      let authenticatedUser: UserProfile;

      if (isNoemiAdmin) {
        setSuccessMessage('Accesso Amministratore autorizzato. Benvenuta Noemi!');
        authenticatedUser = {
          id: 'admin-noemi',
          name: 'Noemi',
          email: 'noemi@aurora.app',
          company: 'Aurora Distribuzione S.r.l. - Amministrazione',
          piva: 'IT09876543210',
          sdi: 'AUR789K',
          pec: 'aurora.amministrazione@pec.it',
          role: 'superadmin',
          avatarInitials: 'NO',
          phone: '+39 02 9876543',
          address: "Via dell'Industria 45",
          city: 'Milano',
          postalCode: '20145',
          province: 'MI',
          country: 'Italia',
          permissions: {
            canEditCatalog: true,
            canEditPrices: true,
            canEditStock: true,
            canEditOrders: true,
            canEditUsers: true,
            canEditCompanyInfo: true,
            canDeleteRecords: true,
            canOverrideDiscounts: true,
          }
        };
      } else {
        setSuccessMessage(
          authMode === 'login' 
            ? 'Accesso B2B effettuato con successo!' 
            : 'Registrazione completata! Account B2B attivato.'
        );
        authenticatedUser = {
          id: `user-${Date.now()}`,
          name: name.trim() || (cleanEmail.split('@')[0] ? cleanEmail.split('@')[0] : 'Cliente B2B'),
          email: cleanEmail,
          company: company.trim() || 'Azienda Cliente',
          piva: piva.trim() || 'IT00000000000',
          role: 'user',
          avatarInitials: (name.trim() || 'CL').substring(0, 2).toUpperCase(),
          permissions: {
            canEditCatalog: false,
            canEditPrices: false,
            canEditStock: false,
            canEditOrders: false,
            canEditUsers: false,
            canEditCompanyInfo: false,
            canDeleteRecords: false,
            canOverrideDiscounts: false,
          }
        };
      }

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(authenticatedUser);
        }
        setLoginSuccess(false);
        onClose();
      }, 1000);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Dark backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-sm"
      />

      {/* Login Card Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-[#060e1d] border border-[#142848] rounded-3xl shadow-[0_0_50px_rgba(2,132,199,0.18)] z-10 overflow-hidden"
      >
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-sky-500/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          id="close-login-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-[#0d1d38]/80 hover:bg-[#132c54] border border-[#1a3359] transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Official Aurora Logo */}
        <div className="pt-8 pb-4 px-6 text-center flex flex-col items-center border-b border-[#0f213d] bg-[#071329]/60">
          <div className="relative mb-2 p-2">
            <AuroraLogo size="login" showSubtitle={true} />
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#09152b] border border-[#14284b] rounded-xl w-full max-w-xs mt-3">
            <button
              type="button"
              id="tab-login-btn"
              onClick={() => {
                setAuthMode('login');
                setLoginSuccess(false);
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isIt ? 'Accedi' : 'Sign In'}
            </button>
            <button
              type="button"
              id="tab-register-btn"
              onClick={() => {
                setAuthMode('register');
                setLoginSuccess(false);
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode === 'register'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isIt ? 'Registrati' : 'Register'}
            </button>
          </div>
        </div>

        {/* Auth Body */}
        <div className="p-6">
          {/* Quick info about Admin account */}
          <div className="mb-4 p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/25 flex items-start gap-2.5 text-[11px] text-sky-200">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              {authMode === 'login' ? (
                <p>
                  Accesso per clienti B2B e Amministrazione. L'account <strong>noemi@aurora.app</strong> sblocca le funzioni da Amministratore.
                </p>
              ) : (
                <p>
                  Compila i dati aziendali per registrarti come nuovo cliente B2B e accedere al listino riservato.
                </p>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {loginSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">{successMessage}</span>
              </div>
            )}

            {authMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isIt ? 'Nome e Cognome Referente' : 'Contact Full Name'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      id="register-name-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Mario Rossi"
                      className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isIt ? 'Ragione Sociale / Azienda' : 'Company Name'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      id="register-company-input"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      required
                      placeholder="Rossi Forniture S.r.l."
                      className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isIt ? 'Partita IVA' : 'VAT Number'}
                  </label>
                  <input
                    type="text"
                    id="register-piva-input"
                    value={piva}
                    onChange={(e) => setPiva(e.target.value)}
                    required
                    placeholder="IT12345678901"
                    className="w-full bg-[#050c18] border border-[#132542] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                <span>{isIt ? 'Email' : 'Email Address'}</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="login-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={authMode === 'login' ? 'es. noemi@aurora.app o cliente@email.it' : 'tuamail@azienda.it'}
                  className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                <span>{isIt ? 'Password' : 'Password'}</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-[#050c18] text-sky-500 focus:ring-0"
                />
                <span>{isIt ? 'Ricorda terminale' : 'Remember me'}</span>
              </label>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> SSL 256-bit
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={isLoading}
              className="w-full bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60 transition-all hover:scale-[1.01] mt-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : authMode === 'login' ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>{isIt ? 'Accedi al Listino Riservato' : 'Sign in to B2B Catalog'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{isIt ? 'Completa Registrazione' : 'Complete Registration'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-[#040a14] border-t border-[#0e1d35] text-center text-[11px] text-slate-500">
          AURORA Distribuzione • {isIt ? 'Soluzioni Professionali per Pulizia e Sanificazione' : 'Professional Hygiene Solutions'}
        </div>
      </motion.div>
    </div>
  );
};
