import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { adminGetSetting, adminSetSetting } from "@/lib/settings.functions";
import { ORDER_NOTIFICATION_EMAIL_KEY } from "@/lib/settings.functions";
import { Mail, Save, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/impostazioni")({
  component: Impostazioni,
});

function Impostazioni() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["setting", ORDER_NOTIFICATION_EMAIL_KEY],
    queryFn: () => adminGetSetting({ data: { key: ORDER_NOTIFICATION_EMAIL_KEY } }),
  });

  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.value) setEmail(data.value);
  }, [data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await adminSetSetting({ data: { key: ORDER_NOTIFICATION_EMAIL_KEY, value: email } });
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["setting", ORDER_NOTIFICATION_EMAIL_KEY] });
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-sm font-bold text-foreground mb-1">Ricezione ordini</h2>
      <p className="text-xs text-muted-foreground mb-5">
        A questo indirizzo arriverà un'email ogni volta che un cliente invia una richiesta d'ordine dal sito.
      </p>

      <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-5 space-y-4">
        <label className="block">
          <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5 flex items-center gap-1.5">
            <Mail size={13} /> Email aziendale per ricevere gli ordini
          </span>
          <input
            type="email"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ordini@tuaazienda.it"
            className="input-field"
          />
        </label>

        <button
          type="submit"
          disabled={saving || isLoading}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          <Save size={15} /> Salva
        </button>

        {saved && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 ml-3">
            <CheckCircle2 size={14} /> Salvato
          </span>
        )}
      </form>

      <p className="text-[11px] text-muted-foreground mt-3">
        Nota tecnica: l'invio effettivo richiede che la variabile d'ambiente <code className="bg-secondary px-1 rounded">RESEND_API_KEY</code> sia configurata su Vercel. Finché non è impostata, gli ordini vengono comunque salvati e visibili qui in "Ordini".
      </p>
    </div>
  );
}
