import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/useAuth";
import { User, Save, CheckCircle2, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_app/account")({
  component: Account,
});

const emptyForm = {
  full_name: "",
  company: "",
  phone: "",
  piva: "",
  sdi: "",
  pec: "",
  address: "",
  city: "",
  postal_code: "",
  province: "",
};

function Account() {
  const { session, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile(), enabled: !!session });

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        company: data.company ?? "",
        phone: data.phone ?? "",
        piva: (data as any).piva ?? "",
        sdi: (data as any).sdi ?? "",
        pec: (data as any).pec ?? "",
        address: (data as any).address ?? "",
        city: (data as any).city ?? "",
        postal_code: (data as any).postal_code ?? "",
        province: (data as any).province ?? "",
      });
    }
  }, [data]);

  if (!authLoading && !session) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 pt-10 max-w-md mx-auto text-center">
        <User className="mx-auto text-muted-foreground mb-3" size={28} />
        <p className="text-sm text-muted-foreground mb-4">Accedi per gestire il tuo profilo aziendale.</p>
        <Link to="/auth" className="inline-block h-10 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold leading-10">
          Accedi
        </Link>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateMyProfile({ data: form });
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-heading font-bold text-foreground">Il mio profilo</h1>
        <Link to="/i-miei-ordini" className="text-xs font-semibold text-primary hover:text-sky-300 flex items-center gap-1">
          <ClipboardList size={13} /> I miei ordini
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{session?.user?.email}</p>

      {isLoading ? (
        <div className="h-96 rounded-2xl bg-card animate-pulse" />
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          <Section title="Dati anagrafici">
            <Field label="Nome e cognome" value={form.full_name} onChange={update("full_name")} />
            <Field label="Telefono" value={form.phone} onChange={update("phone")} />
          </Section>

          <Section title="Dati aziendali (fatturazione)">
            <Field label="Ragione sociale" value={form.company} onChange={update("company")} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Partita IVA" value={form.piva} onChange={update("piva")} />
              <Field label="Codice SDI" value={form.sdi} onChange={update("sdi")} />
            </div>
            <Field label="PEC" type="email" value={form.pec} onChange={update("pec")} />
          </Section>

          <Section title="Indirizzo">
            <Field label="Via e civico" value={form.address} onChange={update("address")} />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Città" value={form.city} onChange={update("city")} />
              <Field label="CAP" value={form.postal_code} onChange={update("postal_code")} />
              <Field label="Provincia" value={form.province} onChange={update("province")} />
            </div>
          </Section>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              <Save size={15} /> Salva profilo
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 size={14} /> Salvato
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Questi dati vengono usati per compilare automaticamente i tuoi ordini futuri.
          </p>
        </form>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground block mb-1">{label}</span>
      <input type={type} value={value} onChange={onChange} className="input-field" />
    </label>
  );
}
