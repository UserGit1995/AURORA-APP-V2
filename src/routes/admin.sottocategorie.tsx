import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListSubcategories, adminListCategories, adminSaveSubcategory, adminDeleteSubcategory } from "@/lib/admin.functions";
import { Plus, Pencil, Trash2, X, Loader2, Layers } from "lucide-react";

export const Route = createFileRoute("/admin/sottocategorie")({
  component: AdminSottocategorie,
});

type FormState = { id?: string; category_id: string; name: string; slug: string; sort_order: string; active: boolean };
const emptyForm: FormState = { category_id: "", name: "", slug: "", sort_order: "0", active: true };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function AdminSottocategorie() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-subcategories"], queryFn: () => adminListSubcategories() });
  const { data: categories } = useQuery({ queryKey: ["admin-categories-lite"], queryFn: () => adminListCategories() });
  const [form, setForm] = useState<FormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-subcategories"] });

  const openEdit = (s: any) => {
    setSlugTouched(true);
    setForm({ id: s.id, category_id: s.category_id, name: s.name, slug: s.slug, sort_order: String(s.sort_order ?? 0), active: s.active });
  };
  const openNew = () => {
    setSlugTouched(false);
    setForm(emptyForm);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.category_id) return;
    setSaving(true);
    setError(null);
    try {
      await adminSaveSubcategory({
        data: {
          id: form.id,
          category_id: form.category_id,
          name: form.name,
          slug: form.slug || slugify(form.name),
          sort_order: Number(form.sort_order) || 0,
          active: form.active,
        },
      });
      setForm(null);
      refresh();
    } catch (err: any) {
      setError(err?.message ?? "Impossibile salvare la sottocategoria. Controlla i campi e riprova.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await adminDeleteSubcategory({ data: { id } });
      refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">Sottocategorie</h2>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
        >
          <Plus size={14} /> Nuova sottocategoria
        </button>
      </div>

      {isLoading ? (
        <div className="h-40 rounded-xl bg-card animate-pulse" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {(data ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
              <div className="p-2 rounded-lg bg-secondary text-muted-foreground shrink-0"><Layers size={14} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.categories?.name ?? "—"} · /{s.slug}{!s.active ? " · disattivata" : ""}
                </p>
              </div>
              <button onClick={() => openEdit(s)} className="p-2 text-muted-foreground hover:text-foreground"><Pencil size={15} /></button>
              <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} className="p-2 text-muted-foreground hover:text-destructive">
                {deletingId === s.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            </div>
          ))}
          {(data ?? []).length === 0 && <p className="text-xs text-muted-foreground p-4">Nessuna sottocategoria. Creale per organizzare meglio il catalogo (es. dentro "Carta e Monouso": bicchieri, tovaglioli, sacchetti).</p>}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form onSubmit={handleSave} className="w-full max-w-md bg-card border border-border rounded-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">{form.id ? "Modifica sottocategoria" : "Nuova sottocategoria"}</h3>
              <button type="button" onClick={() => setForm(null)}><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Categoria principale</span>
                <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input-field">
                  <option value="">— Scegli —</option>
                  {(categories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Nome</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugTouched ? form.slug : slugify(e.target.value) })}
                  className="input-field"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Slug (URL)</span>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm({ ...form, slug: e.target.value });
                  }}
                  className="input-field"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Ordine</span>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="input-field" />
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-primary" />
                Attiva (visibile nel sito)
              </label>
              {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/25 rounded-lg p-2">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving && <Loader2 size={14} className="animate-spin" />} Salva sottocategoria
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
