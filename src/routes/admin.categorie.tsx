import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListCategories, adminSaveCategory, adminDeleteCategory } from "@/lib/admin.functions";
import { Plus, Pencil, Trash2, X, Loader2, Folder } from "lucide-react";
import { ImageUploadField } from "@/components/ImageUploadField";

export const Route = createFileRoute("/admin/categorie")({
  component: AdminCategorie,
});

type FormState = { id?: string; name: string; slug: string; image_url: string; sort_order: string; active: boolean };
const emptyForm: FormState = { name: "", slug: "", image_url: "", sort_order: "0", active: true };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function AdminCategorie() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-categories"], queryFn: () => adminListCategories() });
  const [form, setForm] = useState<FormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-categories"] });

  const openEdit = (c: any) => {
    setSlugTouched(true);
    setForm({ id: c.id, name: c.name, slug: c.slug, image_url: c.image_url ?? "", sort_order: String(c.sort_order ?? 0), active: c.active });
  };
  const openNew = () => {
    setSlugTouched(false);
    setForm(emptyForm);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await adminSaveCategory({
        data: {
          id: form.id,
          name: form.name,
          slug: form.slug || slugify(form.name),
          image_url: form.image_url || null,
          sort_order: Number(form.sort_order) || 0,
          active: form.active,
        },
      });
      setForm(null);
      refresh();
    } catch (err: any) {
      setError(err?.message ?? "Impossibile salvare la categoria. Controlla i campi e riprova.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await adminDeleteCategory({ data: { id } });
      refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">Categorie</h2>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
        >
          <Plus size={14} /> Nuova categoria
        </button>
      </div>

      {isLoading ? (
        <div className="h-40 rounded-xl bg-card animate-pulse" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(data ?? []).map((c: any) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-3">
              <div className="aspect-video rounded-lg overflow-hidden bg-background mb-2 flex items-center justify-center">
                {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover" /> : <Folder className="text-muted-foreground" size={20} />}
              </div>
              <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">/{c.slug}{!c.active ? " · disattivata" : ""}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => openEdit(c)} className="flex-1 h-7 rounded-md bg-secondary text-xs text-foreground flex items-center justify-center gap-1">
                  <Pencil size={12} /> Modifica
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  className="h-7 w-7 rounded-md bg-secondary text-muted-foreground hover:text-destructive flex items-center justify-center"
                >
                  {deletingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          ))}
          {(data ?? []).length === 0 && <p className="text-xs text-muted-foreground">Nessuna categoria.</p>}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form onSubmit={handleSave} className="w-full max-w-md bg-card border border-border rounded-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">{form.id ? "Modifica categoria" : "Nuova categoria"}</h3>
              <button type="button" onClick={() => setForm(null)}><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
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
              <ImageUploadField label="Immagine categoria" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
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
                {saving && <Loader2 size={14} className="animate-spin" />} Salva categoria
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
