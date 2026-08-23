import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { adminGetSetting, adminSetSetting, ORDER_NOTIFICATION_EMAIL_KEY, PUBLIC_SETTINGS_KEYS } from "@/lib/settings.functions";
import { Mail, Save, CheckCircle2, Phone, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/impostazioni")({
  component: Impostazioni,
});

const FIELDS: { key: string; label: string; icon: any; placeholder: string; type?: string }[] = [
  { key: ORDER_NOTIFICATION_EMAIL_KEY, label: "Email per ricevere gli ordini", icon: Mail, placeholder: "ordini@tuaazienda.it", type: "email" },
  { key: "contact_phone", label: "Telefono (mostrato ai clienti)", icon: Phone, placeholder: "+39 02 1234567" },
  { key: "contact_email", label: "Email pubblica (mostrata ai clienti)", icon: Mail, placeholder: "info@tuaazienda.it", type: "email" },
  { key: "contact_address", label: "Indirizzo sede", icon: MapPin, placeholder: "Via Roma 1, 00100 Roma (RM)" },
  { key: "contact_hours", label: "Orari di apertura", icon: Clock, placeholder: "Lun-Ven 9:00 - 18:00" },
];

function Impostazioni() {
  const qc = useQueryClient();
  const keys = [ORDER_NOTIFICATION_EMAIL_KEY, ...PUBLIC_SETTINGS_KEYS];
  const results = useQuery({
    queryKey: ["all-settings"],
    queryFn: async () => {
      const entries = await Promise.all(keys.map(async (k) => [k, await adminGetSetting({ data: { key: k } })] as const));
      return Object.fromEntries(entries.map(([k, v]) => [k, v.value ?? ""]));
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (results.data) setValues(results.data);
  }, [results.data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all(keys.map((k) => adminSetSetting({ data: { key: k, value: values[k] ?? "" } })));
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
        Questi dati vengono usati nella pagina Contatti e nel Footer del sito pubblico, e per ricevere gli ordini via email.
      </p>

      <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-5 space-y-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5 flex items-center gap-1.5">
              <f.icon size={13} /> {f.label}
            </span>
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
