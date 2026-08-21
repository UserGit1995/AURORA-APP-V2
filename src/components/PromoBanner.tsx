import { Tag, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import bannerBottles from "@/assets/images/banner_bottles_1787321549985.jpg";

export function PromoBanner() {
  return (
    <div className="w-full mt-7 rounded-2xl overflow-hidden bg-gradient-to-r from-[#071329] via-[#091b3b] to-[#0c244b] border border-[#13284c] shadow-xl relative">
      <div className="flex flex-col md:flex-row items-center justify-between p-4 sm:p-5 lg:px-8 gap-4">
        <div className="flex items-center gap-3.5 z-10">
          <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
            <Tag className="w-5 h-5 fill-sky-400" />
          </div>
          <div>
            <h3 className="text-white text-base sm:text-lg font-bold tracking-tight">Offerte del mese</h3>
            <p className="text-slate-300 text-xs sm:text-sm">Scopri le promozioni esclusive a te dedicate!</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-center flex-1 h-14 relative overflow-hidden px-4">
          <img
            src={bannerBottles}
            alt="Promozioni del mese"
            className="h-full max-w-[280px] object-contain opacity-90 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
          />
        </div>

        <div className="flex items-center gap-3 z-10 w-full sm:w-auto justify-between sm:justify-end">
          <Link
            to="/offerte"
            className="inline-flex items-center gap-2 bg-primary hover:bg-sky-600 text-primary-foreground text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full transition-all duration-200 shadow-md shadow-sky-950/50 group whitespace-nowrap"
          >
            <span>Scopri le offerte</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
