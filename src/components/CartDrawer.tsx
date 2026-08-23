import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, Trash2, ShoppingBag, Package, BookmarkPlus } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function CartDrawer({ open, onClose, onOrder, onSaveTemplate }: { open: boolean; onClose: () => void; onOrder: () => void; onSaveTemplate: () => void }) {
  const { items, total, setQty, removeItem } = useCart();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <aside className="w-full max-w-sm bg-card h-full overflow-y-auto border-l border-border flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" />
            <h2 className="font-heading font-bold text-foreground">Il tuo carrello</h2>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button onClick={onSaveTemplate} aria-label="Salva come modello" title="Salva come modello" className="text-muted-foreground hover:text-primary">
                <BookmarkPlus size={18} />
              </button>
            )}
            <button onClick={onClose} aria-label="Chiudi" className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="p-4 rounded-full bg-secondary text-muted-foreground">
              <ShoppingBag size={28} />
            </div>
            <p className="text-sm text-muted-foreground">Il carrello è vuoto.</p>
            <Link
              to="/categorie"
              onClick={onClose}
              className="text-xs font-semibold text-primary hover:text-sky-300"
            >
              Sfoglia il catalogo
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 bg-secondary/40 border border-border rounded-xl p-2.5">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-background flex items-center justify-center shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                      <Package size={20} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Rimuovi"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2 bg-background border border-border rounded-full px-1.5 py-0.5">
                        <button
                          onClick={() => setQty(item.id, item.qty - 1)}
                          className="p-0.5 text-muted-foreground hover:text-foreground"
                          aria-label="Diminuisci"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-semibold text-foreground w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => setQty(item.id, item.qty + 1)}
                          className="p-0.5 text-muted-foreground hover:text-foreground"
                          aria-label="Aumenta"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        € {(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Totale (+IVA)</span>
                <span className="font-bold text-foreground text-base">€ {total.toFixed(2)}</span>
              </div>
              <button
                onClick={onOrder}
                className="w-full flex items-center justify-center h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-sky-600 transition-colors"
              >
                Procedi con l'ordine
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Nessun pagamento online: invii la richiesta, ti ricontattiamo per confermare.
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
