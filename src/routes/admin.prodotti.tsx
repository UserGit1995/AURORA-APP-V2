import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListProducts, adminSaveProduct, adminDeleteProduct } from "@/lib/admin.functions";
import { adminListCategories } from "@/lib/admin.functions";
import { Plus, Pencil, Trash2, X, Loader2, Package } from "lucide-react";

export const Route = createFileRoute("/admin/prodotti")({
  component: AdminProdotti,
});

type ProductFormState = {
  id?: string;
  name: string;
  description: string;
  category_id: string;
  price: string;
  discount_price: string;
  image_url: string;
  sku: string;
  in_stock: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_on_offer: boolean;
  active: boolean;
};

const emptyForm: ProductFormState = {
  name: "",
  description: "",
  category_id: "",
  price: "",
  discount_price: "",
  image_url: "",
  sku: "",
  in_stock: true,
  is_featured: false,
  is_new: false,
  is_on_offer: false,
  active: true,
};

function AdminProdotti() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-products"], queryFn: () => adminListProducts() });
  const { data: categories } = useQuery({ queryKey: ["admin-categories-lite"], queryFn: () => adminListCategories() });

  const [form, setForm] = useState<ProductFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-products"] });

  const openNew = () => setForm(emptyForm);
  const openEdit = (p: any) =>
    setForm({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      category_id: p.category_id ?? "",
      price: String(p.price),
      discount_price: p.discount_price != null ? String(p.discount_price) : "",
      image_url: p.image_url ?? "",
      sku: p.sku ?? "",
      in_stock: p.in_stock,
      is_featured: p.is_featured,
      is_new: p.is_new,
      is_on_offer: p.is_on_offer,
      active: p.active,
    });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await adminSaveProduct({
        data: {
          id: form.id,
          name: form.name,
          description: form.description || null,
          category_id: form.category_id || null,
          price: Number(form.price),
          discount_price: form.discount_price ? Number(form.discount_price) : null,
          image_url: form.image_url || null,
          sku: form.sku || null,
          in_stock: form.in_stock,
          is_featured: form.is_featured,
          is_new: form.is_new,
          is_on_offer: form.is_on_offer,
          active: form.active,
        },
      });
      setForm(null);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await adminDeleteProduct({ data: { id } });
      refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">Prodotti</h2>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
        >
          <Plus size={14} /> Nuovo prodotto
        </button>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-xl bg-card animate-pulse" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {(data ?? []).map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center overflow-hidden shrink-0">
                {p.image_url ? <img src={p.image_url} className="w-full h-full object-contain" /> : <Package size={16} className="text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {p.categories?.name ?? "—"} · € {Number(p.price).toFixed(2)}
                  {p.discount_price ? ` (riservato € ${Number(p.discount_price).toFixed(2)})` : ""}
                  {!p.active ? " · disattivato" : ""}
                </p>
              </div>
              <button onClick={() => openEdit(p)} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Modifica">
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                disabled={deletingId === p.id}
                className="p-2 text-muted-foreground hover:text-destructive"
                aria-label="Elimina"
              >
                {deletingId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            </div>
          ))}
          {(data ?? []).length === 0 && <p className="text-xs text-muted-foreground p-4">Nessun prodotto.</p>}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form onSubmit={handleSave} className="w-full max-w-lg bg-card border border-border rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-bold text-foreground text-sm">{form.id ? "Modifica prodotto" : "Nuovo prodotto"}</h3>
              <button type="button" onClick={() => setForm(null)}><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <TextField label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <TextArea label="Descrizione" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
              <label className="block">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Categoria</span>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">— Nessuna —</option>
                  {(categories ?? []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Prezzo (€)" type="number" step="0.01" value={form.price} onChange={(v) => setForm({ ...form, price: v })} required />
                <TextField label="Prezzo riservato (€, opzionale)" type="number" step="0.01" value={form.discount_price} onChange={(v) => setForm({ ...form, discount_price: v })} />
              </div>
              <TextField label="URL immagine" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
              <TextField label="Codice / SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Checkbox label="Disponibile" checked={form.in_stock} onChange={(v) => setForm({ ...form, in_stock: v })} />
                <Checkbox label="In evidenza" checked={form.is_featured} onChange={(v) => setForm({ ...form, is_featured: v })} />
                <Checkbox label="Novità" checked={form.is_new} onChange={(v) => setForm({ ...form, is_new: v })} />
                <Checkbox label="In offerta" checked={form.is_on_offer} onChange={(v) => setForm({ ...form, is_on_offer: v })} />
                <Checkbox label="Attivo (visibile nel sito)" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving && <Loader2 size={14} className="animate-spin" />} Salva prodotto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", step, required }: { label: string; value: string; onChange: (v: string) => void; type?: string; step?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground block mb-1">{label}</span>
      <input type={type} step={step} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="input-field" />
    </label>
  );
}
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground block mb-1">{label}</span>
      <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className="input-field resize-none" />
    </label>
  );
}
function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-primary" />
      {label}
    </label>
  );
}
