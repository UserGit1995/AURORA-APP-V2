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
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PurchaseVelocityChart } from './PurchaseVelocityChart';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onOpenLogin }) => {
  const [activeProfileTab, setActiveProfileTab] = useState<'velocity' | 'company' | 'credit'>('velocity');

  if (!isOpen) return null;

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
              AD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Aurora Distributi S.r.l.</h3>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10.5px] font-semibold border border-sky-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-sky-400" /> B2B Certificato
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                P.IVA: <span className="text-slate-200">IT09876543210</span> • Cod. SDI: <span className="text-sky-300">AUR789K</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
            <span>Dashboard Purchase Velocity</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              +21.8% YoY
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
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>Dati Azienda & Fatturazione</span>
          </button>

          <button
            id="tab-credit-conditions"
            type="button"
            onClick={() => setActiveProfileTab('credit')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeProfileTab === 'credit'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Fido Commerciale & Ri.Ba.</span>
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {activeProfileTab === 'velocity' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PurchaseVelocityChart />
            </motion.div>
          )}

          {activeProfileTab === 'company' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#09152b] border border-[#142646] p-4 rounded-2xl flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                      Referente Commerciale Principale
                    </span>
                    <span className="text-sm text-slate-100 font-bold block mt-0.5">Simone Aricò</span>
                    <span className="text-xs text-slate-400 block mt-0.5">Responsabile Acquisti & Supply Chain</span>
                  </div>
                </div>

                <div className="bg-[#09152b] border border-[#142646] p-4 rounded-2xl flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                      Email Istituzionale & Ordini
                    </span>
                    <span className="text-sm text-slate-100 font-bold font-mono block mt-0.5">
                      simonearico10@gmail.com
                    </span>
                    <span className="text-xs text-emerald-400 block mt-0.5">PEC & Fatture SDI Verificate</span>
                  </div>
                </div>

                <div className="bg-[#09152b] border border-[#142646] p-4 rounded-2xl flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                      Dati Fiscali & SDI
                    </span>
                    <span className="text-xs text-slate-200 font-bold block mt-0.5">
                      Codice Univoco: <strong className="font-mono text-sky-300">AUR789K</strong>
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Partita IVA / CF: IT09876543210 • REA MI-2094182
                    </span>
                  </div>
                </div>

                <div className="bg-[#09152b] border border-[#142646] p-4 rounded-2xl flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                      Sede Legale & Deposito
                    </span>
                    <span className="text-xs text-slate-200 font-bold block mt-0.5">
                      Via dell'Industria 45, Palazzina B
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      20145 Milano (MI) • Orario scarico merci 08:00 - 17:30
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Terms */}
              <div className="bg-[#071329] border border-[#142646] p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" /> Condizioni Fornitura & Accordi Quadro B2B
                </h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Listino convenzionato con scontistica a volume su pallet completi. Trasporto con sponda idraulica incluso
                  e preavviso telefonico del corriere GLS Logistics B2B.
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
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Fido Accordato</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono block mt-1">€ 50.000,00</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Disponibile: € 38.450,00</span>
                </div>

                <div className="bg-[#09152b] border border-[#142646] p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Termini di Pagamento</span>
                  <span className="text-base font-bold text-white block mt-1">Ri.Ba. 30/60 gg d.f.</span>
                  <span className="text-[11px] text-sky-400 block mt-0.5">Banca Intesa Sanpaolo</span>
                </div>

                <div className="bg-[#09152b] border border-[#142646] p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Rating Affidabilità</span>
                  <span className="text-xl font-bold text-sky-300 font-mono block mt-1">AAA (Massima)</span>
                  <span className="text-[11px] text-emerald-400 block mt-0.5">Zero insoluti registrati</span>
                </div>
              </div>

              <div className="bg-[#071329] border border-[#142848] rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-200">Coordinate Bancarie d'Appoggio (SEPA / Ri.Ba)</h4>
                <div className="p-3 rounded-xl bg-[#040b17] border border-[#10203a] font-mono text-xs text-sky-300">
                  IBAN: IT99 A 03069 09606 100000012345 • BIC/SWIFT: BCITITMM
                </div>
                <p className="text-[11px] text-slate-400">
                  Gli addebiti diretti SDD / Ri.Ba. vengono presentati con valuta fine mese concordata.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#122340] bg-[#071124] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Account B2B ID: <strong className="text-slate-400 font-mono">AUR-CLI-94812</strong>
          </span>
          <div className="flex items-center gap-2">
            {onOpenLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="px-3.5 py-2 rounded-xl bg-[#0b1b36] hover:bg-[#0e244d] border border-sky-500/30 text-sky-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Cambia Account / Login</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold transition-colors shadow-sm"
            >
              Chiudi Scheda Profilo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

