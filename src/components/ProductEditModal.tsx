import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  Layers, 
  Tag, 
  Package, 
  ShieldAlert, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { Product, Category } from '../types';
import { useAdmin } from '../context/AdminContext';
import { ProductImageUploader } from './ProductImageUploader';

interface ProductEditModalProps {
  isOpen: boolean;
  product: Product | null;
  categories: Category[];
  onClose: () => void;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  isOpen,
  product,
  categories,
  onClose,
}) => {
  const { updateProduct, addProduct, deleteProduct, subcategoriesList } = useAdmin();
  const isNew = !product;

  const [formData, setFormData] = useState<Partial<Product>>(() => {
    if (product) {
      return { ...product };
    }
    return {
      name: '',
      category: categories[0]?.name || 'Igiene Casa',
      categoryId: categories[0]?.id || 'igiene-casa',
      price: 9.90,
      unit: 'flacone 1L',
      packageQty: 'Cartone da 6 pz',
      code: `AUR-PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      stock: 100,
      lowStockThreshold: 20,
      isFeatured: false,
      isOffer: false,
      discountPercent: 0,
      description: 'Detergente professionale ad alta concentrazione per uso industriale e civile.',
      image: categories[0]?.image || '',
      specs: {
        format: '1000 ml',
        fragrance: 'Fresco Limone',
        certifications: ['HACCP Compliant', 'Eco Detergenza', 'ISO 9001'],
      },
    };
  });

  const [certInput, setCertInput] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  // Sync state if product changes
  React.useEffect(() => {
    if (product) {
      setFormData({ ...product });
    } else {
      setFormData({
        name: '',
        category: categories[0]?.name || 'Igiene Casa',
        categoryId: categories[0]?.id || 'igiene-casa',
        price: 9.90,
        unit: 'flacone 1L',
        packageQty: 'Cartone da 6 pz',
        code: `AUR-PRD-${Math.floor(1000 + Math.random() * 9000)}`,
        stock: 100,
        lowStockThreshold: 20,
        isFeatured: false,
        isOffer: false,
        discountPercent: 0,
        description: 'Detergente professionale ad alta concentrazione per uso industriale e civile.',
        image: categories[0]?.image || '',
        specs: {
          format: '1000 ml',
          fragrance: 'Fresco Limone',
          certifications: ['HACCP Compliant', 'Eco Detergenza', 'ISO 9001'],
        },
      });
    }
  }, [product, categories, isOpen]);

  if (!isOpen) return null;

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCat = categories.find((c) => c.id === e.target.value);
    setFormData((prev) => ({
      ...prev,
      categoryId: e.target.value,
      category: selectedCat?.name || prev.category || 'Igiene Casa',
    }));
  };

  const handleAddCert = () => {
    if (!certInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      specs: {
        format: prev.specs?.format || '1000 ml',
        fragrance: prev.specs?.fragrance || '',
        certifications: [...(prev.specs?.certifications || []), certInput.trim()],
      },
    }));
    setCertInput('');
  };

  const handleRemoveCert = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specs: {
        format: prev.specs?.format || '1000 ml',
        fragrance: prev.specs?.fragrance || '',
        certifications: (prev.specs?.certifications || []).filter((_, i) => i !== index),
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('Inserisci il nome del prodotto');
      return;
    }

    if (isNew) {
      addProduct(formData as Omit<Product, 'id'>);
    } else {
      updateProduct(formData as Product);
    }

    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 600);
  };

  const handleDelete = () => {
    if (!product) return;
    if (confirm(`Sei sicuro di voler eliminare definitivamente il prodotto "${product.name}"?`)) {
      deleteProduct(product.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl bg-[#060e1d] border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Admin Header Bar */}
        <div className="p-4 sm:p-5 border-b border-amber-500/20 bg-[#09152b] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Controllo SuperAdmin
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {isNew ? 'Crea Nuovo Prodotto Catalogo' : `Modifica: ${formData.name}`}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Tutti i campi sono modificabili in tempo reale con override immediato.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                title="Elimina prodotto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-[#0d1c38] text-slate-400 hover:text-white border border-[#1b345b] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-left text-sm flex-1">
          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nome Articolo / Prodotto *
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#09152b] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white font-medium text-sm outline-none transition-all"
                placeholder="Es. Detergente Pavimenti Sgrassante HACCP"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <select
                value={formData.categoryId || ''}
                onChange={handleCategoryChange}
                className="w-full bg-[#09152b] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-all"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Sottocategoria (opzionale)
              </label>
              <select
                value={formData.subcategoryId || ''}
                onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value || null })}
                className="w-full bg-[#09152b] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-all"
              >
                <option value="">— Nessuna —</option>
                {subcategoriesList
                  .filter((s) => s.categoryId === formData.categoryId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.parentSubcategoryId ? '↳ ' : ''}
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Codice Articolo / SKU
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full bg-[#09152b] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm outline-none transition-all"
                placeholder="Es. AUR-LAV-3000"
              />
            </div>
          </div>

          {/* Pricing & Stock Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#08152b]/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                Prezzo B2B (€) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price !== undefined ? formData.price : ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0c1c38] border border-amber-500/40 rounded-xl px-3 py-2 text-white font-bold text-base outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Stock Magazzino *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.stock !== undefined ? formData.stock : ''}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-base outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Soglia Stock Minimo
              </label>
              <input
                type="number"
                min="0"
                value={formData.lowStockThreshold !== undefined ? formData.lowStockThreshold : 15}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Sconto Offerta (%)
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={formData.discountPercent || 0}
                onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value, 10) || 0, isOffer: (parseInt(e.target.value, 10) || 0) > 0 })}
                className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none"
              />
            </div>
          </div>

          {/* Unit & Packaging Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Unità di misura / Formato
              </label>
              <input
                type="text"
                value={formData.unit || ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-[#09152b] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm outline-none"
                placeholder="Es. flacone 3L o tanica 5kg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Confezionamento Master
              </label>
              <input
                type="text"
                value={formData.packageQty || ''}
                onChange={(e) => setFormData({ ...formData, packageQty: e.target.value })}
                className="w-full bg-[#09152b] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm outline-none"
                placeholder="Es. Cartone da 4 pz • Pallet da 48 ct"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Descrizione Dettagliata & Istruzioni d'uso
            </label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#09152b] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-all resize-y"
              placeholder="Descrizione tecnica del prodotto..."
            />
          </div>

          {/* Image Uploader Component (PC Upload, URL, Presets) */}
          <ProductImageUploader
            currentImage={formData.image || ''}
            onImageChange={(newImage) => setFormData({ ...formData, image: newImage })}
            presetImages={categories.map((c) => ({
              label: c.name,
              url: c.image || '/logo-login.png',
            }))}
          />

          {/* Flags & Toggles */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 accent-amber-500"
              />
              <span className="text-xs text-slate-200 font-medium">In Evidenza nella Home</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.isOffer}
                onChange={(e) => setFormData({ ...formData, isOffer: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 accent-amber-500"
              />
              <span className="text-xs text-slate-200 font-medium">Sezione Offerte Speciali</span>
            </label>
          </div>

          {/* Certifications Manager */}
          <div className="bg-[#08152b]/40 p-3.5 rounded-2xl border border-slate-800">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Certificazioni & Specifiche
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(formData.specs?.certifications || []).map((cert, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30"
                >
                  {cert}
                  <button
                    type="button"
                    onClick={() => handleRemoveCert(idx)}
                    className="text-slate-400 hover:text-white ml-1 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCert();
                  }
                }}
                placeholder="Aggiungi certificazione (es. HACCP, EcoCert)"
                className="flex-1 bg-[#09152b] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
              />
              <button
                type="button"
                onClick={handleAddCert}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
              >
                + Aggiungi
              </button>
            </div>
          </div>

          {/* Submit Action Buttons */}
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
              {isNew ? 'Crea e Salva' : 'Salva Modifiche (Applica a Tutti)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
