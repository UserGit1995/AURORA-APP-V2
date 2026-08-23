import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { adminGetSetting, adminSetSetting, ORDER_NOTIFICATION_EMAIL_KEY, PUBLIC_SETTINGS_KEYS } from "@/lib/settings.functions";
import { Mail, Save, CheckCircle2, Phone, MapPin, Clock, Building2, Truck, Megaphone } from "lucide-react";

export const Route = createFileRoute("/admin/impostazioni")({
  component: Impostazioni,
});

const SECTIONS: { title: string; icon: any; fields: { key: string; label: string; placeholder: string; type?: string }[] }[] = [
  {
    title: "Ricezione ordini",
    icon: Mail,
    fields: [{ key: ORDER_NOTIFICATION_EMAIL_KEY, label: "Email per ricevere gli ordini", placeholder: "ordini@tuaazienda.it", type: "email" }],
  },
  {
    title: "Contatti pubblici",
    icon: Phone,
    fields: [
      { key: "contact_phone", label: "Telefono", placeholder: "+39 02 1234567" },
      { key: "contact_email", label: "Email pubblica", placeholder: "info@tuaazienda.it", type: "email" },
      { key: "contact_address", label: "Indirizzo sede", placeholder: "Via Roma 1, 00100 Roma (RM)" },
      { key: "contact_hours", label: "Orari di apertura", placeholder: "Lun-Ven 9:00 - 18:00" },
    ],
  },
  {
    title: "Dati aziendali",
    icon: Building2,
    fields: [
      { key: "company_name", label: "Ragione sociale", placeholder: "Aurora S.r.l." },
      { key: "company_vat", label: "Partita IVA", placeholder: "IT00000000000" },
      { key: "company_sdi", label: "Codice SDI", placeholder: "0000000" },
    ],
  },
  {
    title: "Ordini e spedizioni",
    icon: Truck,
    fields: [
      { key: "min_order_amount", label: "Ordine minimo (€, 0 = nessun minimo)", placeholder: "0", type: "number" },
      { key: "free_shipping_threshold", label: "Spedizione gratuita sopra (€, vuoto = mai)", placeholder: "150", type: "number" },
      { key: "standard_shipping_cost", label: "Costo spedizione standard (€)", placeholder: "0", type: "number" },
    ],
  },
  {
    title: "Banner annunci",
    icon: Megaphone,
    fields: [{ key: "announcement_banner_text", label: "Testo banner (in cima al sito, lascia vuoto per nasconderlo)", placeholder: "Es. Consegne rallentate nel weekend" }],
  },
];

function Impostazioni() {
  const qc = useQueryClient();
  const keys = SECTIONS.flatMap((s) => s.fields.map((f) => f.key)).concat(["announcement_banner_enabled"]);
  const results = useQuery({
    queryKey: ["all-settings"],
    queryFn: async () => {
      const entries = await Promise.all(keys.map(async (k) => [k, await adminGetSetting({ data: { key: k } })] as const));
      return Object.fromEntries(entries.map(([k, v]) => [k, v.value ?? ""]));
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (results.data) {
      setValues(results.data);
      setBannerEnabled(results.data.announcement_banner_enabled === "true");
    }
  }, [results.data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all([
        ...keys.filter((k) => k !== "announcement_banner_enabled").map((k) => adminSetSetting({ data: { key: k, value: values[k] ?? "" } })),
        adminSetSetting({ data: { key: "announcement_banner_enabled", value: String(bannerEnabled) } }),
      ]);
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["all-settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-sm font-bold text-foreground mb-1">Impostazioni</h2>
      <p className="text-xs text-muted-foreground mb-5">
        Usate nella pagina Contatti, nel Footer, nel banner e nel calcolo di spedizione/ordine minimo.
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <section.icon size={13} /> {section.title}
            </h3>
            {section.fields.map((f) => (
              <label key={f.key} className="block">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">{f.label}</span>
                <input
                  type={f.type ?? "text"}
                  disabled={results.isLoading}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="input-field"
                />
              </label>
            ))}
            {section.title === "Banner annunci" && (
              <label className="flex items-center gap-2 text-xs text-foreground">
                <input type="checkbox" checked={bannerEnabled} onChange={(e) => setBannerEnabled(e.target.checked)} className="accent-primary" />
                Mostra il banner sul sito pubblico
              </label>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={saving || results.isLoading}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          <Save size={15} /> Salva tutto
        </button>

        {saved && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 ml-3">
            <CheckCircle2 size={14} /> Salvato
          </span>
        )}
      </form>

      <p className="text-[11px] text-muted-foreground mt-3">
        Nota tecnica: l'invio email ordini richiede la variabile d'ambiente <code className="bg-secondary px-1 rounded">RESEND_API_KEY</code> su Vercel. Finché non è impostata, gli ordini vengono comunque salvati e visibili in "Ordini".
      </p>
    </div>
  );
}
