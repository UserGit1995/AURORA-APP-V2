import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  Building2,
  CheckCircle2,
  User,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
  Briefcase,
  Phone,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AuroraLogo } from './AuroraLogo';
import { useLanguage } from '../context/LanguageContext';
import { UserProfile } from '../types';
import {
  authenticateUser,
  registerNewUser,
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
  const [customerType, setCustomerType] = useState<'privato' | 'attivita'>('privato');

  // Neutral form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [piva, setPiva] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCodeField, setShowAdminCodeField] = useState(false);

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

        const isSuperAdmin = authResult.user.role === 'superadmin';
        setSuccessMessage(
          isSuperAdmin
            ? `Accesso Amministratore autorizzato. Benvenuta ${authResult.user.name}!`
            : `Benvenuto ${authResult.user.name}! Accesso effettuato con successo.`
        );

        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(authResult.user!);
          }
          onClose();
        }, 750);
      } else {
        // Registration mode
        const regResult = registerNewUser({
          customerType,
          name,
          company: customerType === 'attivita' ? company : undefined,
          piva: customerType === 'attivita' ? piva : undefined,
          phone,
          email,
          password,
          adminCode: adminCode.trim() || undefined,
        });
        setIsLoading(false);

        if (!regResult.success || !regResult.user) {
          setErrorMessage(regResult.error || 'Errore durante la registrazione.');
          return;
        }

        const isSuperAdmin = regResult.user.role === 'superadmin';
        setSuccessMessage(
          isSuperAdmin
            ? `Registrazione Amministratore completata con successo!`
            : customerType === 'privato'
            ? `Registrazione completata! Benvenuto in AURORA Casalinghi.`
            : `Registrazione aziendale B2B completata con successo!`
        );

        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(regResult.user!);
          }
          onClose();
        }, 850);
      }
    }, 400);
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
          {authMode === 'register' ? (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-bold text-slate-300">
                Seleziona la tipologia di account:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="select-type-privato-btn"
                  onClick={() => {
                    setCustomerType('privato');
                    resetFormState();
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
                    customerType === 'privato'
                      ? 'bg-sky-950/70 border-sky-500 text-white shadow-md shadow-sky-950/50 ring-1 ring-sky-400/40'
                      : 'bg-[#08152c] border-[#142848] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShoppingBag className={`w-4 h-4 ${customerType === 'privato' ? 'text-sky-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold">Cliente Privato</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Uso casa e famiglia</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="select-type-attivita-btn"
                  onClick={() => {
                    setCustomerType('attivita');
                    resetFormState();
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
                    customerType === 'attivita'
                      ? 'bg-sky-950/70 border-sky-500 text-white shadow-md shadow-sky-950/50 ring-1 ring-sky-400/40'
                      : 'bg-[#08152c] border-[#142848] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Briefcase className={`w-4 h-4 ${customerType === 'attivita' ? 'text-sky-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold">Attività / Fornitore</div>
                    <div className="text-[10px] text-slate-400 leading-tight">P.IVA / B2B all'ingrosso</div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/20 text-[11px] text-slate-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Inserisci le tue credenziali per accedere al tuo account.</span>
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
                    {customerType === 'privato' ? 'Nome e Cognome *' : 'Nome e Cognome Referente *'}
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
                      placeholder={customerType === 'privato' ? 'es. Mario Rossi' : 'es. Mario Rossi (Referente Acquisti)'}
                      className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {customerType === 'attivita' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Ragione Sociale / Nome Attività *
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
                          placeholder="es. Rossi Forniture S.r.l. o Negozio Casalinghi"
                          className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Partita IVA / Codice Fiscale Azienda *
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
                    Recapito Telefonico <span className="text-slate-500 font-normal">(Opzionale per spedizioni)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      id="register-phone-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+39 333 1234567"
                      className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  {!showAdminCodeField ? (
                    <button
                      type="button"
                      onClick={() => setShowAdminCodeField(true)}
                      className="text-[11px] text-slate-500 hover:text-amber-400/80 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>🔑 Sei un amministratore? Inserisci codice di sicurezza</span>
                    </button>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-amber-400/90 mb-1">
                        Codice Sicurezza Amministratore <span className="text-slate-500 font-normal">(Riservato al gestore)</span>
                      </label>
                      <input
                        type="password"
                        id="register-admin-code-input"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        placeholder="Inserisci passkey admin (opzionale)"
                        className="w-full bg-[#050c18] border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                <span>{isIt ? 'Indirizzo Email *' : 'Email Address *'}</span>
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
                  placeholder="nome@dominio.it"
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
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
                  <span>{isIt ? 'Accedi' : 'Sign In'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {customerType === 'privato'
                      ? 'Crea Account Privato'
                      : 'Registra Attività / Fornitore'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-[#040a14] border-t border-[#0e1d35] text-center text-[11px] text-slate-500">
          AURORA Casalinghi & Forniture • Accesso Sicuro
        </div>
      </motion.div>
    </div>
  );
};
