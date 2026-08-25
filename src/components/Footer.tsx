import React from 'react';
import { 
  Globe, 
  ShieldCheck, 
  Truck, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Check, 
  ExternalLink,
  ChevronRight,
  Leaf
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AuroraLogo } from './AuroraLogo';

interface FooterProps {
  onSelectCategoryTab?: () => void;
  onOpenContact?: () => void;
  onOpenQuickReorder?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategoryTab,
  onOpenContact,
  onOpenQuickReorder
}) => {
  const { language, setLanguage, toggleLanguage, t } = useLanguage();

  return (
    <footer className="mt-16 border-t border-[#0e1d38] bg-[#030712] text-slate-400 text-xs">
      {/* Top Value Strip */}
      <div className="border-b border-[#0b1830] bg-[#050c1c]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#08142a]/70 border border-[#112444]">
              <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/25 shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-white text-xs">
                  {language === 'it' ? 'Consegne B2B in 24/48h' : '24/48h B2B Fast Freight'}
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'it' ? 'Flotta convenzionata con sponda idraulica' : 'Direct courier with hydraulic lift gate'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#08142a]/70 border border-[#112444]">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-white text-xs">
                  {language === 'it' ? 'Certificato ISO 9001 & HACCP' : 'ISO 9001 & HACCP Certified'}
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'it' ? 'Detergenti e presidi per alimenti e sanità' : 'Professional hospital & food safety formulas'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#08142a]/70 border border-[#112444]">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-white text-xs">
                  {language === 'it' ? 'Fatturazione Elettronica B2B' : 'Direct B2B Invoicing & DDT'}
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'it' ? 'Ricevute PDF, SDS e DDT conformi' : 'Downloadable PDF invoices, SDS & shipping notes'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#08142a]/70 border border-[#112444]">
              <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/25 shrink-0">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-white text-xs">
                  {language === 'it' ? 'Gamma Eco Green & Ecolabel' : 'Ecolabel & Green Formulations'}
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'it' ? 'Formulazioni a ridotto impatto ambientale' : 'Environmentally conscious biodegradable cleaning'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Information Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Col 1: Brand & Language Toggle Section */}
          <div className="lg:col-span-4 space-y-4">
            <AuroraLogo size="md" />
            <p className="text-slate-300 text-xs leading-relaxed max-w-sm">
              {t('brand.desc')}
            </p>

            {/* Language Selector in Footer */}
            <div className="pt-2">
              <div className="inline-flex flex-col p-3 rounded-2xl bg-[#061124] border border-[#14294c] shadow-md space-y-2">
                <div className="flex items-center justify-between gap-3 text-slate-300">
                  <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-xs">
                    <Globe className="w-4 h-4" />
                    <span>{t('footer.language')}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-sky-400/80 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-400/20">
                    {language.toUpperCase()}
                  </span>
                </div>

                {/* Segmented language toggle buttons */}
                <div className="flex items-center bg-[#020610] p-1 rounded-xl border border-[#10223f] gap-1">
                  <button
                    id="footer-lang-toggle-it"
                    type="button"
                    onClick={() => setLanguage('it')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                      language === 'it'
                        ? 'bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white shadow-sm shadow-sky-950'
                        : 'text-slate-400 hover:text-white hover:bg-[#0a172e]'
                    }`}
                    title="Passa all'interfaccia in Italiano"
                  >
                    <span className="text-sm leading-none">🇮🇹</span>
                    <span>Italiano</span>
                    {language === 'it' && <Check className="w-3 h-3 text-white ml-0.5" />}
                  </button>

                  <button
                    id="footer-lang-toggle-en"
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                      language === 'en'
                        ? 'bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white shadow-sm shadow-sky-950'
                        : 'text-slate-400 hover:text-white hover:bg-[#0a172e]'
                    }`}
                    title="Switch UI to English"
                  >
                    <span className="text-sm leading-none">🇬🇧</span>
                    <span>English</span>
                    {language === 'en' && <Check className="w-3 h-3 text-white ml-0.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              {t('footer.quickLinks')}
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={onSelectCategoryTab}
                  className="hover:text-sky-300 transition-colors flex items-center gap-1.5 text-left"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{t('footer.catalog')}</span>
                </button>
              </li>
              {onOpenQuickReorder && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenQuickReorder}
                    className="hover:text-sky-300 transition-colors flex items-center gap-1.5 text-left"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{t('nav.quickReorder')} (1-Click)</span>
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="hover:text-sky-300 transition-colors flex items-center gap-1.5 text-left"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{t('footer.orderAssistance')}</span>
                </button>
              </li>
              <li>
                <a
                  href="#sds-compliance"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenContact) onOpenContact();
                  }}
                  className="hover:text-sky-300 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{t('footer.safetySheets')}</span>
                </a>
              </li>
              <li>
                <a
                  href="#privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(language === 'it' ? 'Privacy Policy conforme a GDPR (Regolamento UE 2016/679).' : 'Privacy Policy compliant with GDPR (EU Regulation 2016/679).');
                  }}
                  className="hover:text-sky-300 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{t('footer.privacy')}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Certifications & Quality */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              {t('footer.certifications')}
            </h4>
            <div className="space-y-2 text-[11px] text-slate-400">
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('footer.iso')}</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('footer.haccp')}</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('footer.eco')}</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('footer.reach')}</span>
              </div>
            </div>
          </div>

          {/* Col 4: Direct Logistics Contacts */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              {t('footer.support')}
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">{t('footer.hours')}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <a href="tel:+390289457710" className="text-slate-300 hover:text-sky-300 font-mono transition-colors">
                  {t('footer.phone')}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <a href="mailto:logistica@auroradistribuzione.it" className="text-slate-300 hover:text-sky-300 transition-colors">
                  logistica@auroradistribuzione.it
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">{t('footer.headquarters')}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Bar: Copyright & Legal Registry */}
      <div className="border-t border-[#0a162b] bg-[#02050c] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} AURORA Distribuzione S.r.l. — {t('footer.rights')}</p>
          <p className="text-center sm:text-right">{t('footer.companyInfo')}</p>
        </div>
      </div>
    </footer>
  );
};
