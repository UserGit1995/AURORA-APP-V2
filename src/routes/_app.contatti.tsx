import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/_app/contatti")({
  component: Contatti,
});

function Contatti() {
  return (
    <div className="px-4 pt-4 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Contatti</h1>
      <Card icon={<Phone size={20} />} title="Telefono" value="—" />
      <Card icon={<Mail size={20} />} title="Email" value="—" />
      <Card icon={<MapPin size={20} />} title="Sede" value="—" />
      <Card icon={<Clock size={20} />} title="Orari" value="Lun-Ven 9:00 - 18:00" />
      <p className="text-xs text-muted-foreground text-center pt-4">Contatti configurabili dal pannello admin.</p>
    </div>
  );
}
function Card({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
      <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</span>
      <div><div className="text-xs text-muted-foreground">{title}</div><div className="text-sm text-foreground">{value}</div></div>
    </div>
  );
}