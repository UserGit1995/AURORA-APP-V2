import { FileCheck, PackageCheck, Truck, CheckCircle2, Ban } from "lucide-react";

const STEPS = [
  { id: "nuovo", label: "Ordine ricevuto", icon: FileCheck },
  { id: "in_lavorazione", label: "In lavorazione", icon: PackageCheck },
  { id: "evaso", label: "Evaso", icon: Truck },
] as const;

export function OrderTrackingTimeline({ status }: { status: string }) {
  if (status === "annullato") {
    return (
      <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2 text-xs font-semibold">
        <Ban size={14} /> Ordine annullato
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.id === status);

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i < currentIndex || (i === currentIndex && status === "evaso");
        const current = i === currentIndex && status !== "evaso";
        const Icon = done ? CheckCircle2 : step.icon;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 ${
                  done
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : current
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-secondary border-border text-muted-foreground"
                }`}
              >
                <Icon size={13} />
              </div>
              <span className={`text-[10px] font-semibold text-center whitespace-nowrap ${done || current ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 ${i < currentIndex ? "bg-emerald-400" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
