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
  AlertTriangle,
  Crown,
  KeyRound,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuroraLogo } from './AuroraLogo';
import { useLanguage } from '../context/LanguageContext';
import { UserProfile } from '../types';
import {
  authenticateUser,
  registerNewUser,
  ADMIN_NOEMI_EMAIL,
} from '../services/authService';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleQuickFillAdmin = () => {
    setAuthMode('login');
    setEmail(ADMIN_NOEMI_EMAIL);
    setPassword('admin123');
    resetFormState();
  };

  const handleQuickFillDemoClient = () => {
    setAuthMode('login');
    setEmail('cliente@rossiforniture.it');
    setPassword('cliente123');
    resetFormState();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setIsLoading(true);

    setTimeout(() => {
      if (authMode === 'login') {
        const authResult = authenticateUser(email, password);
        setIsLoading(false);

        if (!authResult.success || !authResult.user) {
          setErrorMessage(authResult.error || 'Credenziali di accesso non valide.');
          return;
        }

        const isNoemi = authResult.user.email.toLowerCase() === ADMIN_NOEMI_EMAIL.toLowerCase();
        setSuccessMessage(
          isNoemi
            ? 'Accesso SuperAdmin autorizzato con successo. Benvenuta Noemi!'
            : `Benvenuto ${authResult.user.name}! Accesso al listino B2B completato.`
        );

        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(authResult.user!);
          }
          onClose();
        }, 800);
      } else {
        // Registration mode
        const regResult = registerNewUser({
          name,
          company,
          piva,
          email,
          password,
        });
        setIsLoading(false);

        if (!regResult.success || !regResult.user) {
          setErrorMessage(regResult.error || 'Errore durante la registrazione.');
          return;
        }

        setSuccessMessage('Registrazione aziendale B2B completata con successo! Account attivato.');

        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(regResult.user!);
          }
          onClose();
        }, 900);
      }
    }, 450);
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
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md bg-[#060e1d] border border-[#142848] rounded-3xl shadow-[0_0_50px_rgba(2,132,199,0.18)] z-10 overflow-hidden my-auto"
      >
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-28 bg-sky-500/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          id="close-login-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-[#0d1d38]/80 hover:bg-[#132c54] border border-[#1a3359] transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Official Aurora Logo */}
        <div className="pt-7 pb-3.5 px-6 text-center flex flex-col items-center border-b border-[#0f213d] bg-[#071329]/60">
          <div className="relative mb-2 p-1">
            <AuroraLogo size="login" showSubtitle={true} />
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#09152b] border border-[#14284b] rounded-xl w-full max-w-xs mt-2.5">
            <button
              type="button"
              id="tab-login-btn"
              onClick={() => {
                setAuthMode('login');
                resetFormState();
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
                resetFormState();
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
        <div className="p-5 sm:p-6">
          {/* Informative Guidance Banner */}
          {authMode === 'login' ? (
            <div className="mb-4 p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/20 text-[11px] text-sky-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="leading-tight">
                <span>Accesso riservato per </span>
                <strong className="text-amber-300">Amministratore (Noemi)</strong>
                <span> e </span>
                <strong className="text-white">Clienti B2B registrati</strong>.
              </div>
            </div>
          ) : (
            <div className="mb-4 p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/20 text-[11px] text-sky-200 flex items-start gap-2">
              <UserPlus className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="leading-tight">
                Registra la tua attività per accedere al listino all'ingrosso e alle condizioni commerciali dedicate.
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2 shadow-lg animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Success banner */}
            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">{successMessage}</span>
              </div>
            )}

            {authMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isIt ? 'Nome e Cognome Referente *' : 'Full Name *'}
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
                      placeholder="es. Mario Rossi"
                      className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isIt ? 'Ragione Sociale / Azienda *' : 'Company Name *'}
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
                      placeholder="es. Rossi Forniture S.r.l."
                      className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isIt ? 'Partita IVA *' : 'VAT Number *'}
                  </label>
                  <input
                    type="text"
                    id="register-piva-input"
                    value={piva}
                    onChange={(e) => setPiva(e.target.value)}
                    required
                    placeholder="IT01234567890"
                    className="w-full bg-[#050c18] border border-[#132542] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono uppercase"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                <span>{isIt ? 'Email *' : 'Email Address *'}</span>
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
                  placeholder={authMode === 'login' ? 'es. noemi@aurora.app o tua@email.it' : 'email@azienda.it'}
                  className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                <span>{isIt ? 'Password *' : 'Password *'}</span>
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
                <span>{isIt ? 'Resta connesso' : 'Stay signed in'}</span>
              </label>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Protetto SSL
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
                  <span>{isIt ? 'Verifica Credenziali ed Accedi' : 'Verify and Sign In'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{isIt ? 'Registra e Attiva Account B2B' : 'Complete Registration'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Access Helper Buttons for Testing / Admin */}
          {authMode === 'login' && (
            <div className="mt-4 pt-4 border-t border-[#10223d] space-y-2">
              <p className="text-[10px] text-slate-500 text-center font-medium">
                Accesso Rapido Preconfigurato:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleQuickFillAdmin}
                  className="p-2 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Noemi</span>
                </button>
                <button
                  type="button"
                  onClick={handleQuickFillDemoClient}
                  className="p-2 rounded-xl bg-[#09172f] hover:bg-[#0f244a] border border-sky-500/30 text-sky-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                  <span>Cliente B2B Demo</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-[#040a14] border-t border-[#0e1d35] text-center text-[11px] text-slate-500">
          AURORA Distribuzione • Soluzioni Professionali Certificate
        </div>
      </motion.div>
    </div>
  );
};
