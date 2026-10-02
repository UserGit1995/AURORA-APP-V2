import React, { useMemo, useState } from 'react';
import { X, Image as ImageIcon, FolderTree, MoveRight, Pencil, Trash2, Plus, Check, Search } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Subcategory } from '../types';
import { ProductImageUploader } from './ProductImageUploader';

interface QuickManageModalProps {
  /** Nome mostrato nel titolo (marca o badge Ho.Re.Ca) */
  title: string;
  /** Righe sottocategoria che rappresentano questo badge (una marca può averne più di una, una per categoria) */
  rootIds: string[];
  currentImage?: string;
  onClose: () => void;
}

type Tab = 'immagine' | 'sottosezioni' | 'sposta';

/**
 * Gestione rapida (solo admin) aperta dal pulsantino fotocamera sui badge:
 * immagine/logo, nome e sottosezioni, spostamento prodotti in altre
 * categorie/sottocategorie — senza dover passare dal pannello admin.
 */
export const QuickManageModal: React.FC<QuickManageModalProps> = ({ title, rootIds, currentImage, onClose }) => {
  const {
    categoriesList,
    subcategoriesList,
    productsList,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    updateProduct,
  } = useAdmin();

  const [tab, setTab] = useState<Tab>('immagine');

  const rootRows = useMemo(
    () => subcategoriesList.filter((s) => rootIds.includes(s.id)),
    [subcategoriesList, rootIds]
  );
  const childRows = useMemo(
    () => subcategoriesList.filter((s) => s.parentSubcategoryId && rootIds.includes(s.parentSubcategoryId)),
    [subcategoriesList, rootIds]
  );
  const allIds = useMemo(() => new Set([...rootIds, ...childRows.map((c) => c.id)]), [rootIds, childRows]);
  const badgeProducts = useMemo(
    () => productsList.filter((p) => p.subcategoryId && allIds.has(p.subcategoryId)),
    [productsList, allIds]
  );

  const categoryName = (id: string) => categoriesList.find((c) => c.id === id)?.name || '';
  const productCountOf = (subId: string) => productsList.filter((p) => p.subcategoryId === subId).length;

  // ---------- Immagine ----------
  const handleImageChange = (uri: string) => {
    rootRows.forEach((row) => updateSubcategory({ ...row, image: uri }));
  };

  // ---------- Nome badge ----------
  const [badgeName, setBadgeName] = useState(title);
  const saveBadgeName = () => {
    const name = badgeName.trim();
    if (!name || name === title) return;
    rootRows.forEach((row) => updateSubcategory({ ...row, name }));
    onClose();
  };

  // ---------- Sottosezioni ----------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState(rootIds[0] || '');

  const saveEdit = (sub: Subcategory) => {
    const name = editName.trim();
    if (name) updateSubcategory({ ...sub, name });
    setEditingId(null);
  };

  const removeSub = (sub: Subcategory) => {
    const count = productCountOf(sub.id);
    if (count > 0) {
      alert(
        `Non puoi eliminare "${sub.name}": contiene ancora ${count} prodott${count === 1 ? 'o' : 'i'}. Spostali prima dalla scheda "Sposta prodotti".`
      );
      return;
    }
    if (confirm(`Eliminare la sottosezione "${sub.name}"?`)) deleteSubcategory(sub.id);
  };

  const addSub = () => {
    const name = newName.trim();
    const parent = rootRows.find((r) => r.id === newParentId) || rootRows[0];
    if (!name || !parent) return;
    addSubcategory({
      categoryId: parent.categoryId,
      parentSubcategoryId: parent.id,
      name,
      slug: name,
      sortOrder: childRows.filter((c) => c.parentSubcategoryId === parent.id).length,
      active: true,
    });
    setNewName('');
  };

  // ---------- Sposta prodotti ----------
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destCategoryId, setDestCategoryId] = useState('');
  const [destSubId, setDestSubId] = useState('');
  const [destChildId, setDestChildId] = useState('');

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return badgeProducts;
    return badgeProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q)
    );
  }, [badgeProducts, query]);

  const destSubs = useMemo(
    () =>
      subcategoriesList
        .filter((s) => s.categoryId === destCategoryId && !s.parentSubcategoryId)
        .sort((a, b) => a.name.localeCompare(b.name, 'it')),
    [subcategoriesList, destCategoryId]
  );
  const destChildren = useMemo(
    () =>
      subcategoriesList
        .filter((s) => s.parentSubcategoryId === destSubId)
        .sort((a, b) => a.name.localeCompare(b.name, 'it')),
    [subcategoriesList, destSubId]
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selected.has(p.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredProducts.forEach((p) => next.delete(p.id));
      else filteredProducts.forEach((p) => next.add(p.id));
      return next;
    });

  const moveSelected = () => {
    if (selected.size === 0 || !destCategoryId) return;
    const cat = categoriesList.find((c) => c.id === destCategoryId);
    if (!cat) return;
    const targetSubId = destChildId || destSubId || null;
    const moving = productsList.filter((p) => selected.has(p.id));
    if (!confirm(`Spostare ${moving.length} prodott${moving.length === 1 ? 'o' : 'i'} in "${cat.name}"?`)) return;
    moving.forEach((p) => updateProduct({ ...p, categoryId: cat.id, category: cat.name, subcategoryId: targetSubId }));
    setSelected(new Set());
  };

  const tabBtn = (id: Tab, label: string, Icon: React.ElementType) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold transition-colors ${
        tab === id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-[#161f30]'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  const inputCls =
    'w-full bg-[#0d1420] border border-[#1c2433] rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-[#0e1b30] border border-[#1c2433] rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-3">
          <p className="text-sm font-bold text-white truncate">{title}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 px-4 pb-3">
          {tabBtn('immagine', 'Immagine', ImageIcon)}
          {tabBtn('sottosezioni', 'Sottosezioni', FolderTree)}
          {tabBtn('sposta', 'Sposta prodotti', MoveRight)}
        </div>

        <div className="overflow-y-auto px-4 pb-4">
          {tab === 'immagine' && (
            <>
              <ProductImageUploader currentImage={currentImage || ''} onImageChange={handleImageChange} />
              {currentImage && (
                <button
                  onClick={() => handleImageChange('')}
                  className="mt-2.5 text-xs font-semibold text-rose-500 hover:text-rose-300"
                >
                  Rimuovi logo e torna al badge con iniziale
                </button>
              )}
            </>
          )}

          {tab === 'sottosezioni' && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Nome</p>
                <div className="flex gap-2">
                  <input value={badgeName} onChange={(e) => setBadgeName(e.target.value)} className={inputCls} />
                  <button
                    onClick={saveBadgeName}
                    className="shrink-0 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
                  >
                    Salva
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Sottosezioni</p>
                {childRows.length === 0 && <p className="text-xs text-slate-500">Nessuna sottosezione.</p>}
                <div className="space-y-1.5">
                  {childRows
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, 'it'))
                    .map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-2 bg-[#0d1420] border border-[#1c2433] rounded-lg px-2.5 py-1.5"
                      >
                        {editingId === sub.id ? (
                          <>
                            <input
                              autoFocus
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit(sub)}
                              className={inputCls}
                            />
                            <button onClick={() => saveEdit(sub)} className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-slate-400">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-white font-semibold truncate">{sub.name}</p>
                              <p className="text-[10.5px] text-slate-500 truncate">
                                {productCountOf(sub.id)} prodotti
                                {rootRows.length > 1 ? ` · ${categoryName(sub.categoryId)}` : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setEditingId(sub.id);
                                setEditName(sub.name);
                              }}
                              className="p-1.5 rounded-lg bg-[#161f30] text-slate-400 hover:text-white"
                              title="Rinomina"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeSub(sub)}
                              className="p-1.5 rounded-lg bg-rose-500/15 text-rose-500 hover:text-rose-300"
                              title="Elimina"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Aggiungi sottosezione</p>
                {rootRows.length > 1 && (
                  <select value={newParentId} onChange={(e) => setNewParentId(e.target.value)} className={`${inputCls} mb-2`}>
                    {rootRows.map((r) => (
                      <option key={r.id} value={r.id}>
                        In categoria: {categoryName(r.categoryId)}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSub()}
                    placeholder="Nome nuova sottosezione"
                    className={inputCls}
                  />
                  <button
                    onClick={addSub}
                    className="shrink-0 inline-flex items-center gap-1 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Aggiungi
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'sposta' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Cerca tra ${badgeProducts.length} prodotti`}
                  className={`${inputCls} pl-8`}
                />
              </div>

              <div className="flex items-center justify-between">
                <button onClick={toggleAll} className="text-xs font-semibold text-sky-400 hover:text-sky-300">
                  {allFilteredSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </button>
                <span className="text-[11px] text-slate-400">{selected.size} selezionati</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1 border border-[#1c2433] rounded-lg p-1.5">
                {filteredProducts.length === 0 && <p className="text-xs text-slate-500 p-2">Nessun prodotto.</p>}
                {filteredProducts.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#161f30] cursor-pointer"
                  >
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="accent-sky-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-white truncate">{p.name}</span>
                      <span className="block text-[10.5px] text-slate-500 truncate">
                        {p.subSubCategoryName || p.subCategoryName || p.category}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Sposta in</p>
                <select
                  value={destCategoryId}
                  onChange={(e) => {
                    setDestCategoryId(e.target.value);
                    setDestSubId('');
                    setDestChildId('');
                  }}
                  className={inputCls}
                >
                  <option value="">Scegli categoria…</option>
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {destCategoryId && destSubs.length > 0 && (
                  <select
                    value={destSubId}
                    onChange={(e) => {
                      setDestSubId(e.target.value);
                      setDestChildId('');
                    }}
                    className={inputCls}
                  >
                    <option value="">Nessuna sottocategoria</option>
                    {destSubs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                {destSubId && destChildren.length > 0 && (
                  <select value={destChildId} onChange={(e) => setDestChildId(e.target.value)} className={inputCls}>
                    <option value="">Nessuna sottosezione</option>
                    {destChildren.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={moveSelected}
                  disabled={selected.size === 0 || !destCategoryId}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold"
                >
                  <MoveRight className="w-3.5 h-3.5" />
                  Sposta {selected.size > 0 ? `${selected.size} prodotti` : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
