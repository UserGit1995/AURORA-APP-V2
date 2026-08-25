import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  ShoppingBag, 
  Truck, 
  User, 
  Building2, 
  Plus, 
  Minus, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { Order, Product, OrderItemDetail } from '../types';
import { useAdmin } from '../context/AdminContext';

interface OrderEditModalProps {
  isOpen: boolean;
  order: Order | null;
  products: Product[];
  onClose: () => void;
}

export const OrderEditModal: React.FC<OrderEditModalProps> = ({
  isOpen,
  order,
  products,
  onClose,
}) => {
  const { updateOrder, deleteOrder } = useAdmin();

  const [formData, setFormData] = useState<Partial<Order>>({});
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [addQty, setAddQty] = useState<number>(1);

  React.useEffect(() => {
    if (order) {
      setFormData({ ...order, items: [...order.items] });
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleStatusChange = (status: Order['status']) => {
    setFormData((prev) => ({ ...prev, status }));
  };

  const handleItemQtyChange = (index: number, newQty: number) => {
    if (newQty <= 0) {
      // Remove item
      const updatedItems = (formData.items || []).filter((_, idx) => idx !== index);
      recalculateTotals(updatedItems);
    } else {
      const updatedItems = [...(formData.items || [])];
      updatedItems[index] = { ...updatedItems[index], qty: newQty };
      recalculateTotals(updatedItems);
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const existingIdx = (formData.items || []).findIndex((item) => item.productId === prod.id);
    let updatedItems = [...(formData.items || [])];

    if (existingIdx > -1) {
      updatedItems[existingIdx].qty += addQty;
    } else {
      updatedItems.push({
        productId: prod.id,
        productName: prod.name,
        code: prod.code,
        price: prod.price,
        qty: addQty,
        packageQty: prod.packageQty,
      });
    }

    recalculateTotals(updatedItems);
    setSelectedProductId('');
    setAddQty(1);
  };

  const recalculateTotals = (items: OrderItemDetail[]) => {
    const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
    const shipping = subtotal > 150 ? 0 : 9.90;
    const vat = subtotal * 0.22;
    const total = subtotal + vat + shipping;

    setFormData((prev) => ({
      ...prev,
      items,
      itemsCount: items.reduce((acc, i) => acc + i.qty, 0),
      subtotal: parseFloat(subtotal.toFixed(2)),
      vatAmount: parseFloat(vat.toFixed(2)),
      shippingCost: shipping,
      total: parseFloat(total.toFixed(2)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrder(formData as Order);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Sei sicuro di voler eliminare l'ordine ${order.id}?`)) {
      deleteOrder(order.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-[#060e1d] border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-500/20 bg-[#09152b] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  SuperAdmin Ordine
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Modifica Ordine #{order.id}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Modifica stato, articoli, prezzi, destinatario, corriere e tracking number.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
              title="Elimina ordine"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-[#0d1c38] text-slate-400 hover:text-white border border-[#1b345b] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 text-left text-sm flex-1">
          {/* Status and Logistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#08152b]/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Stato di Avanzamento
              </label>
              <select
                value={formData.status || 'In elaborazione'}
                onChange={(e) => handleStatusChange(e.target.value as Order['status'])}
                className="w-full bg-[#0c1c38] border border-amber-500/40 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none"
              >
                <option value="In elaborazione">In elaborazione</option>
                <option value="Spedito">Spedito (In transito)</option>
                <option value="Consegnato">Consegnato</option>
                <option value="Annullato">Annullato</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Corriere Assegnato
              </label>
              <input
                type="text"
                value={formData.courier || ''}
                onChange={(e) => setFormData({ ...formData, courier: e.target.value })}
                placeholder="Es. BRT Express B2B"
                className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Codice Tracking
              </label>
              <input
                type="text"
                value={formData.trackingNumber || ''}
                onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                placeholder="Es. BRT-8921-94812"
                className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm outline-none"
              />
            </div>
          </div>

          {/* Recipient & Shipping Information */}
          <div className="bg-[#08152b]/40 p-4 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Dati Intestatario & Destinazione Spedizione
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Ragione Sociale / Destinatario
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress?.companyName || formData.shippingAddress?.recipient || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shippingAddress: {
                        ...formData.shippingAddress!,
                        companyName: e.target.value,
                        recipient: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#09152b] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  P.IVA / Codice Fiscale
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress?.vatNumber || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shippingAddress: { ...formData.shippingAddress!, vatNumber: e.target.value },
                    })
                  }
                  className="w-full bg-[#09152b] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Codice SDI / PEC
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress?.sdiCode || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shippingAddress: { ...formData.shippingAddress!, sdiCode: e.target.value },
                    })
                  }
                  className="w-full bg-[#09152b] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Indirizzo di Consegna
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress?.street || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shippingAddress: { ...formData.shippingAddress!, street: e.target.value },
                    })
                  }
                  className="w-full bg-[#09152b] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Città e Provincia (CAP)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={formData.shippingAddress?.city || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingAddress: { ...formData.shippingAddress!, city: e.target.value },
                      })
                    }
                    placeholder="Città"
                    className="flex-1 bg-[#09152b] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                  <input
                    type="text"
                    value={formData.shippingAddress?.province || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingAddress: { ...formData.shippingAddress!, province: e.target.value },
                      })
                    }
                    placeholder="PR"
                    className="w-12 bg-[#09152b] border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white font-mono uppercase text-center outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Editable Order Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Articoli nell'Ordine ({(formData.items || []).length})
              </h4>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {(formData.items || []).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#09152b] border border-slate-800 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{item.productName}</p>
                    <p className="text-slate-400 text-[11px] font-mono">
                      € {item.price.toFixed(2)}/pz • {item.packageQty || 'Confezione Standard'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-[#060e1d] border border-slate-700 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => handleItemQtyChange(idx, item.qty - 1)}
                        className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold text-white">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleItemQtyChange(idx, item.qty + 1)}
                        className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="w-20 text-right font-mono font-bold text-amber-300">
                      € {(item.price * item.qty).toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleItemQtyChange(idx, 0)}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg"
                      title="Rimuovi riga"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Product to Order */}
            <div className="flex gap-2 pt-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 bg-[#09152b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="">+ Aggiungi un articolo dal catalogo all'ordine...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — € {p.price.toFixed(2)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(parseInt(e.target.value, 10) || 1)}
                className="w-16 bg-[#09152b] border border-slate-700 rounded-xl px-2 py-2 text-xs text-white text-center font-bold"
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedProductId}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl"
              >
                Aggiungi
              </button>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-[#08152b] p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Imponibile: <span className="text-white font-mono">€ {(formData.subtotal || 0).toFixed(2)}</span></p>
              <p>IVA (22%): <span className="text-white font-mono">€ {(formData.vatAmount || 0).toFixed(2)}</span></p>
              <p>Spedizione: <span className="text-white font-mono">€ {(formData.shippingCost || 0).toFixed(2)}</span></p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-bold">Totale Ordine Ricalcolato</span>
              <p className="text-2xl font-black text-amber-400 font-mono">
                € {(formData.total || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-[#060e1d] py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-all"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salva Ordine Modificato
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
