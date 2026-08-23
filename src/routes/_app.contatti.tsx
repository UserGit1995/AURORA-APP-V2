import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/settings.functions";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/_app/contatti")({
  component: Contatti,
});

function Contatti() {
  const { data } = useQuery({ queryKey: ["public-settings"], queryFn: () => getPublicSettings() });

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-4 max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-heading font-bold text-foreground">Contatti</h1>
      <Card icon={<Phone size={20} />} title="Telefono" value={data?.contact_phone || "—"} href={data?.contact_phone ? `tel:${data.contact_phone.replace(/\s/g, "")}` : undefined} />
      <Card icon={<Mail size={20} />} title="Email" value={data?.contact_email || "—"} href={data?.contact_email ? `mailto:${data.contact_email}` : undefined} />
      <Card icon={<MapPin size={20} />} title="Sede" value={data?.contact_address || "—"} />
      <Card icon={<Clock size={20} />} title="Orari" value={data?.contact_hours || "Lun-Ven 9:00 - 18:00"} />
    </div>
  );
}

function Card({ icon, title, value, href }: { icon: React.ReactNode; title: string; value: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors">
      <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</span>
      <div><div className="text-xs text-muted-foreground">{title}</div><div className="text-sm text-foreground font-semibold">{value}</div></div>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}
