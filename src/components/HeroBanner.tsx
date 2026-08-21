import { ShieldCheck, Truck, Layers, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import heroImage from "@/assets/images/hero_cleaning_products_1787321412943.jpg";

export function HeroBanner() {
  return (
    <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-r from-[#071329] via-[#091b38] to-[#0c264d] border border-[#13284c] shadow-2xl">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[280px] lg:min-h-[340px]">
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between z-10">
          <div>
            <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-1.5">Aurora</p>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Soluzioni per ogni esigenza.
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2.5 leading-relaxed">
              Igiene, pulizia e benessere per la casa e la{" "}
              <span className="underline decoration-sky-500/60 decoration-2 underline-offset-4">persona.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-6">
            <FeatureBadge icon={<ShieldCheck className="w-4 h-4" />} title="Qualità Premium" subtitle="Prodotti selezionati" />
            <FeatureBadge icon={<Truck className="w-4 h-4" />} title="Consegna Veloce" subtitle="Affidabile e puntuale" />
            <FeatureBadge icon={<Layers className="w-4 h-4" />} title="Ampia Scelta" subtitle="Sempre disponibili" />
          </div>

          <div>
            <Link
              to="/categorie"
              className="inline-flex items-center gap-2 bg-primary hover:bg-sky-600 text-primary-foreground text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 shadow-lg shadow-sky-950/60 active:scale-[0.98] group"
            >
              <span>Scopri il catalogo</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5 relative flex items-end justify-center overflow-hidden min-h-[200px] lg:min-h-full">
          <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-l from-transparent via-[#071329]/40 to-[#071329] lg:to-[#091b38] z-10 pointer-events-none" />
          <img
            src={heroImage}
            alt="Soluzioni per igiene e pulizia"
            className="w-full h-full object-cover object-center lg:object-right transform scale-105"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureBadge({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="bg-[#0e203f]/80 backdrop-blur-sm border border-[#1d3864] rounded-xl p-2.5 flex items-center gap-2.5 transition-transform hover:-translate-y-px">
      <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-white text-xs font-bold truncate">{title}</p>
        <p className="text-slate-400 text-[10.5px] truncate">{subtitle}</p>
      </div>
    </div>
  );
}
