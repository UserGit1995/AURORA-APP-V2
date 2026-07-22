import { createFileRoute } from "@tanstack/react-router";
import { Truck, Clock, MapPin } from "lucide-react";
export const Route = createFileRoute("/_app/consegne")({
  component: () => (
    <div className="px-4 pt-4 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Informazioni consegne</h1>
      <div className="flex gap-3 items-start p-4 rounded-xl bg-card border border-border"><Truck className="text-primary shrink-0" /><div><div className="font-semibold text-foreground">Consegna rapida</div><div className="text-sm text-muted-foreground">24/48h in tutto il Lazio</div></div></div>
      <div className="flex gap-3 items-start p-4 rounded-xl bg-card border border-border"><MapPin className="text-primary shrink-0" /><div><div className="font-semibold text-foreground">Italia</div><div className="text-sm text-muted-foreground">Consegna in tutta Italia entro 5 giorni lavorativi</div></div></div>
      <div className="flex gap-3 items-start p-4 rounded-xl bg-card border border-border"><Clock className="text-primary shrink-0" /><div><div className="font-semibold text-foreground">Orari</div><div className="text-sm text-muted-foreground">Lun-Ven 9:00 - 18:00</div></div></div>
    </div>
  ),
});