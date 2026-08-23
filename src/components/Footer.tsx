import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/settings.functions";
import { AuroraLogo } from "./AuroraLogo";
import { Truck, ShieldCheck, FileText, Leaf, ChevronRight, Check, Clock, Phone, Mail, MapPin } from "lucide-react";

export function Footer() {
  const { data } = useQuery({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });

  return (
    <footer className="mt-16 border-t border-border bg-[#030712] text-slate-400 text-xs">
      <div className="border-b border-[#0b1830] bg-[#050c1c]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <ValueCard icon={<Truck className="w-5 h-5" />} color="sky" title="Consegne B2B rapide" desc="Ordini gestiti con attenzione, consegna puntuale" />
            <ValueCard icon={<ShieldCheck className="w-5 h-5" />} color="emerald" title="Prodotti selezionati" desc="Forniture professionali per igiene e pulizia" />
            <ValueCard icon={<FileText className="w-5 h-5" />} color="amber" title="Fatturazione B2B" desc="Documentazione regolare per la tua attività" />
            <ValueCard icon={<Leaf className="w-5 h-5" />} color="teal" title="Gamma eco-attenta" desc="Anche formulazioni a ridotto impatto ambientale" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-4 space-y-4">
            <AuroraLogo size="md" />
            <p className="text-slate-300 text-xs leading-relaxed max-w-sm">
              Forniture professionali per l'igiene e la pulizia, pensate per la tua attività: ordini semplici, assistenza diretta.
            </p>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Link rapidi</h4>
            <ul className="space-y-2">
              <FooterLink to="/categorie">Catalogo prodotti</FooterLink>
              <FooterLink to="/i-miei-ordini">I miei ordini</FooterLink>
              <FooterLink to="/contatti">Assistenza ordini</FooterLink>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Perché Aurora</h4>
            <div className="space-y-2 text-[11px] text-slate-400">
              <Bullet>Catalogo pensato per il B2B</Bullet>
              <Bullet>Prezzi riservati per i clienti registrati</Bullet>
              <Bullet>Assistenza diretta sugli ordini</Bullet>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Contatti</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">{data?.contact_hours || "Lun-Ven 9:00 - 18:00"}</span>
              </div>
              {data?.contact_phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <a href={`tel:${data.contact_phone.replace(/\s/g, "")}`} className="text-slate-300 hover:text-sky-300 font-mono transition-colors">
                    {data.contact_phone}
                  </a>
                </div>
              )}
              {data?.contact_email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <a href={`mailto:${data.contact_email}`} className="text-slate-300 hover:text-sky-300 transition-colors">
                    {data.contact_email}
                  </a>
                </div>
              )}
              {data?.contact_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">{data.contact_address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#0a162b] bg-[#02050c] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Aurora — Tutti i diritti riservati</p>
        </div>
      </div>
    </footer>
  );
}

function ValueCard({ icon, color, title, desc }: { icon: React.ReactNode; color: string; title: string; desc: string }) {
  const colorMap: Record<string, string> = {
    sky: "bg-sky-500/15 text-sky-400 border-sky-500/25",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    teal: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  };
  return (
    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#08142a]/70 border border-[#112444]">
      <div className={`p-2.5 rounded-xl border shrink-0 ${colorMap[color]}`}>{icon}</div>
      <div>
        <h5 className="font-bold text-white text-xs">{title}</h5>
        <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="hover:text-sky-300 transition-colors flex items-center gap-1.5">
        <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span>{children}</span>
      </Link>
    </li>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
