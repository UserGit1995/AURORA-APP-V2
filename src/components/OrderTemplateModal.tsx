import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Zap, Plus, Trash2, ShoppingBag, Loader2, Package } from "lucide-react";
import { listMyTemplates, saveTemplate, deleteTemplate } from "@/lib/templates.functions";
import { listProducts } from "@/lib/products.functions";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "./ToastContainer";
import { Link } from "@tanstack/react-router";

export function OrderTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useAuth();
  const { items, addItem } = useCart();
  const { showToast } = useToast();
  const qc = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["my-templates"],
    queryFn: () => listMyTemplates(),
    enabled: open && !!session,
  });
  const { data: products } = useQuery({ queryKey: ["all-products-templates"], queryFn: () => listProducts({ data: {} }), enabled: open });

  const [saveMode, setSaveMode] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!open) return null;

  if (!session) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 text-center space-y-3">
          <Zap className="mx-auto text-primary" size={28} />
          <p className="text-sm text-foreground font-semibold">Riordino rapido</p>
          <p className="text-xs text-muted-foreground">Accedi al tuo account per salvare e riusare modelli d'ordine.</p>
          <Link to="/auth" onClick={onClose} className="inline-block h-10 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold leading-10">
            Accedi
          </Link>
          <button onClick={onClose} className="block w-full text-xs text-muted-foreground mt-1">Chiudi</button>
        </div>
      </div>
    );
  }

  const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));

  const handleSaveCurrentCart = async () => {
    if (items.length === 0 || !templateName.trim()) return;
    setSaving(true);
    try {
      await saveTemplate({
        data: {
          name: templateName.trim(),
          items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
        },
      });
      showToast({ type: "success", title: "Modello salvato", message: `"${templateName}" è pronto per essere riusato.` });
      setTemplateName("");
      setSaveMode(false);
      qc.invalidateQueries({ queryKey: ["my-templates"] });
    } catch {
      showToast({ type: "warning", title: "Non sono riuscito a salvare il modello" });
    } finally {
      setSaving(false);
    }
  };

  const handleUseTemplate = (tpl: any) => {
    let added = 0;
    for (const it of tpl.items as { productId: string; quantity: number }[]) {
      const product = productMap.get(it.productId);
      if (!product || !product.in_stock) continue;
      addItem({ id: product.id, name: product.name, price: Number(product.discount_price ?? product.price), image_url: product.image_url }, it.quantity);
      added++;
    }
    showToast({
      type: added > 0 ? "success" : "warning",
      title: added > 0 ? "Modello aggiunto al carrello" : "Nessun prodotto disponibile",
      message: added < tpl.items.length ? "Alcuni articoli del modello non sono più disponibili." : undefined,
    });
    onClose();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTemplate({ data: { id } });
      qc.invalidateQueries({ queryKey: ["my-templates"] });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="font-heading font-bold text-foreground text-sm flex items-center gap-2">
            <Zap size={16} className="text-primary" /> Riordino rapido
          </h2>
          <button onClick={onClose}><X size={18} className="text-muted-foreground" /></button>
        </div>

        <div className="p-5 space-y-4">
          {items.length > 0 && (
            <div className="bg-secondary/40 border border-border rounded-xl p-3">
              {!saveMode ? (
                <button
                  onClick={() => setSaveMode(true)}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary/15 text-primary text-xs font-semibold border border-primary/30"
                >
                  <Plus size={14} /> Salva il carrello attuale come modello
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Es. Scorta mensile ufficio"
                    className="input-field flex-1"
                  />
                  <button
                    onClick={handleSaveCurrentCart}
                    disabled={saving || !templateName.trim()}
                    className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
                  >
                    {saving && <Loader2 size={12} className="animate-spin" />} Salva
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">I tuoi modelli</h3>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />)}
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="space-y-2">
                {templates.map((tpl: any) => (
                  <div key={tpl.id} className="flex items-center gap-3 bg-secondary/30 border border-border rounded-xl p-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Package size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{tpl.name}</p>
                      <p className="text-[11px] text-muted-foreground">{tpl.items.length} articoli</p>
                    </div>
                    <button
                      onClick={() => handleUseTemplate(tpl)}
                      className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1 shrink-0"
                    >
                      <ShoppingBag size={12} /> Usa
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      disabled={deletingId === tpl.id}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      {deletingId === tpl.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Non hai ancora modelli salvati. Aggiungi prodotti al carrello e salvali come modello per riordinarli in un click.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
