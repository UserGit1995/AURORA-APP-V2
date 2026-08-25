import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  CheckCircle2, 
  Shield, 
  TrendingUp, 
  Activity, 
  CreditCard,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  LogIn,
  LogOut,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PurchaseVelocityChart } from './PurchaseVelocityChart';
import { useAdmin } from '../context/AdminContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onOpenLogin }) => {
  const { currentUser, logout } = useAdmin();
  const [activeProfileTab, setActiveProfileTab] = useState<'velocity' | 'company' | 'credit'>('velocity');

  if (!isOpen) return null;

  const isGuest = !currentUser;
  const isPrivate = currentUser?.customerType === 'privato';
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const displayUser = currentUser || {
    id: 'guest',
    name: 'Visitatore',
    company: 'Nessun account connesso',
    email: 'Non autenticato',
    piva: '-',
    sdi: '-',
    customerType: 'privato' as const,
    role: 'user' as const,
    avatarInitials: 'VI',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-[#060e1d] border border-[#142848] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Profile Top Navigation Bar */}
        <div className="p-4 sm:p-5 border-b border-[#122340] bg-[#071329] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-sky-950/60 border border-sky-400/30 shrink-0">
              {displayUser.avatarInitials || displayUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {displayUser.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10.5px] font-semibold border border-sky-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-sky-400" />
                  {isSuperAdmin
                    ? '⚡ Amministratore'
                    : isPrivate
                    ? 'Cliente Registrato (Casalinghi & Casa)'
                    : 'Attività / Fornitore B2B'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {displayUser.company && (
                  <>
                    <span className="text-slate-200 font-sans font-medium">{displayUser.company}</span> •{' '}
                  </>
                )}
                Email: <span className="text-sky-300">{displayUser.email}</span>
                {displayUser.piva && (
                  <>
                    {' '}• P.IVA: <span className="text-slate-300">{displayUser.piva}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <button
                id="profile-logout-btn"
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Esci</span>
              </button>
            ) : (
              <button
                id="profile-login-btn"
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenLogin) onOpenLogin();
                }}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Accedi / Registrati</span>
              </button>
            )}

            <button
              id="close-user-profile-modal-btn"
              onClick={onClose}
              className="p-2 rounded-full bg-[#0d1c38] text-slate-400 hover:text-white border border-[#1b345b] transition-colors"
              title="Chiudi pannello profilo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher Headers */}
        <div className="px-4 sm:px-6 pt-3 border-b border-[#122340] bg-[#050b17] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            id="tab-purchase-velocity"
            type="button"
            onClick={() => setActiveProfileTab('velocity')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeProfileTab === 'velocity'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Panoramica Acquisti & Frequenza</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              Attivo
            </span>
          </button>

          <button
            id="tab-company-profile"
            type="button"
            onClick={() => setActiveProfileTab('company')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeProfileTab === 'company'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isPrivate ? <User className="w-4 h-4 text-sky-400" /> : <Building2 className="w-4 h-4 text-sky-400" />}
            <span>{isPrivate ? 'Dati Account & Spedizione' : 'Dati Azienda & Fatturazione'}</span>
          </button>

          <button
            id="tab-credit-terms"
            type="button"
            onClick={() => setActiveProfileTab('credit')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeProfileTab === 'credit'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4 text-sky-400" />
            <span>Vantaggi & Condizioni</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {activeProfileTab === 'velocity' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#071329] border border-[#132546] p-4 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tipologia Profilo
                  </span>
                  <div className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                    {isPrivate ? 'Cliente Privato (Casa)' : isSuperAdmin ? 'Amministrazione' : 'Attività / Fornitore'}
                  </div>
                  <span className="text-xs text-sky-400 block mt-0.5">Listino Scontato Applicato</span>
                </div>

                <div className="bg-[#071329] border border-[#132546] p-4 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Stato Account
                  </span>
                  <div className="text-lg font-bold text-emerald-400 mt-1">Verificato & Attivo</div>
                  <span className="text-xs text-slate-400 block mt-0.5">Spedizioni Prioritarie</span>
                </div>

                <div className="bg-[#071329] border border-[#132546] p-4 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Sconto Fedeltà Registrati
                  </span>
                  <div className="text-lg font-bold text-sky-300 mt-1">-10% su tutto il catalogo</div>
                  <span className="text-xs text-slate-400 block mt-0.5">Automatico al carrello</span>
                </div>
              </div>

              {/* Purchase Velocity AI Interactive Module */}
              <div className="bg-[#071329] border border-[#122340] rounded-2xl p-4 sm:p-5">
                <PurchaseVelocityChart />
              </div>
            </motion.div>
          )}

          {activeProfileTab === 'company' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#09152b] border border-[#142646] p-4 rounded-2xl flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                      {isPrivate ? 'Nome e Cognome' : 'Referente Principale'}
                    </span>
                    <span className="text-sm text-slate-100 font-bold block mt-0.5">
                      {displayUser.name}
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {isPrivate ? 'Acquisti Personali e Casalinghi' : 'Responsabile Acquisti & Forniture'}
                    </span>
                  </div>
                </div>

                <div className="bg-[#09152b] border border-[#142646] p-4 rounded-2xl flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                      Email di Contatto
                    </span>
                    <span className="text-sm text-slate-100 font-bold font-mono block mt-0.5">
                      {displayUser.email}
                    </span>
                    <span className="text-xs text-emerald-400 block mt-0.5">Verificata per notifiche ordini</span>
                  </div>
                </div>

                {displayUser.piva && (
                  <div className="bg-[#09152b] border border-[#142646] p-4 rounded-2xl flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                        Dati Fiscali / P.IVA
                      </span>
                      <span className="text-xs text-slate-200 font-bold block mt-0.5">
                        P.IVA / CF: <strong className="font-mono text-sky-300">{displayUser.piva}</strong>
                      </span>
                    </div>
                  </div>
                )}

                <div className="bg-[#09152b] border border-[#142646] p-4 rounded-2xl flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                    {isPrivate ? <ShoppingBag className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                      {isPrivate ? 'Destinazione Principale' : 'Sede Attività'}
                    </span>
                    <span className="text-xs text-slate-200 font-bold block mt-0.5">
                      {displayUser.address || 'Italia'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {displayUser.city || 'Consegna rapida espressa'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Terms */}
              <div className="bg-[#071329] border border-[#142646] p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" /> Condizioni Fornitura & Spedizione AURORA
                </h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Tutti i prodotti di detergenza, carta, igiene persona e casalinghi sono spediti con imballi anti-rottura protetti e tracciamento espresso h24.
                </p>
              </div>
            </motion.div>
          )}

          {activeProfileTab === 'credit' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#09152b] border border-emerald-500/30 p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Sconto Registrato
                  </span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">-10% Dedicato</div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Attivo su catalogo casalinghi</span>
                </div>

                <div className="bg-[#09152b] border border-sky-500/30 p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Spedizione Gratuita
                  </span>
                  <div className="text-xl font-bold text-sky-300 mt-1">Da € 49,00</div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Corriere espresso in tutta Italia</span>
                </div>

                <div className="bg-[#09152b] border border-purple-500/30 p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Garanzia Reso
                  </span>
                  <div className="text-xl font-bold text-purple-300 mt-1">30 Giorni</div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Sostituzione rapida prodotti</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#050b17] border-t border-[#122340] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-400" />
            <span>AURORA Casalinghi • Piattaforma Ufficiale</span>
          </div>
          <button
            id="profile-footer-close-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
