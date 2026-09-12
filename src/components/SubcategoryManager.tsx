import React, { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2, ChevronRight, FolderTree, PackageSearch, ImagePlus, X } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Subcategory } from '../types';
import { ProductImageUploader } from './ProductImageUploader';

interface SubcategoryManagerProps {
  // Chiamato quando l'utente vuole vedere gli articoli dentro una
  // (sotto-)sottocategoria: passa il nome da usare come ricerca nel tab Prodotti.
  onViewProducts?: (query: string) => void;
}

export const SubcategoryManager: React.FC<SubcategoryManagerProps> = ({ onViewProducts }) => {
  const { categoriesList, subcategoriesList, productsList, addSubcategory, updateSubcategory, deleteSubcategory } = useAdmin();

  const [selectedCategoryId, setSelectedCategoryId] = useState(categoriesList[0]?.id || '');
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<string>(''); // vuoto = sottocategoria diretta
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [uploadingLogoFor, setUploadingLogoFor] = useState<string | null>(null);

  const subsForCategory = useMemo(
    () => subcategoriesList.filter((s) => s.categoryId === selectedCategoryId),
    [subcategoriesList, selectedCategoryId]
  );
  const topLevelSubs = useMemo(() => subsForCategory.filter((s) => !s.parentSubcategoryId), [subsForCategory]);

  // Con ~3000 prodotti, ricalcolare i conteggi con un filter() per ogni riga
  // (moltiplicato per centinaia di marche/tipologie) blocca la schermata.
  // Li precalcoliamo tutti una sola volta con due mappe (marca->figli,
  // sottocategoria->numero di prodotti diretti), poi ogni riga fa solo letture O(1).
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Subcategory[]>();
    for (const s of subsForCategory) {
      if (!s.parentSubcategoryId) continue;
      const arr = map.get(s.parentSubcategoryId) || [];
      arr.push(s);
      map.set(s.parentSubcategoryId, arr);
    }
    return map;
  }, [subsForCategory]);
  const childrenOf = (parentId: string) => childrenByParent.get(parentId) || [];

  const directCountById = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of productsList) {
      if (!p.subcategoryId) continue;
      map.set(p.subcategoryId, (map.get(p.subcategoryId) || 0) + 1);
    }
    return map;
  }, [productsList]);

  // Conta i prodotti assegnati direttamente a questa sottocategoria; per una
  // marca (livello 0) somma anche i prodotti di tutte le sue tipologie figlie,
  // così si vede subito se una marca/tipologia è vuota o piena.
  const directProductCount = (subId: string) => directCountById.get(subId) || 0;
  const totalProductCount = (sub: Subcategory): number =>
    directProductCount(sub.id) + childrenOf(sub.id).reduce((sum, child) => sum + totalProductCount(child), 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !selectedCategoryId) return;
    addSubcategory({
      categoryId: selectedCategoryId,
      parentSubcategoryId: newParentId || null,
      name: newName.trim(),
      slug: newName.trim(),
      sortOrder: subsForCategory.length,
      active: true,
    });
    setNewName('');
    setNewParentId('');
  };

  const handleSaveEdit = (sub: Subcategory) => {
    updateSubcategory({ ...sub, name: editName.trim() || sub.name });
    setEditingId(null);
  };

  const handleLogoChange = (sub: Subcategory, imageUri: string) => {
    updateSubcategory({ ...sub, image: imageUri });
    setUploadingLogoFor(null);
  };

  const renderRow = (sub: Subcategory, depth: number) => {
    const count = totalProductCount(sub);
    // Per una tipologia (depth>0) il nome da solo ("Lacca e Styling") è troppo
    // generico: cerchiamo per marca (il genitore), così il tab Prodotti mostra
    // tutti gli articoli di quella marca e la tipologia specifica si trova a colpo d'occhio.
    const searchQuery = depth === 0 ? sub.name : subsForCategory.find((p) => p.id === sub.parentSubcategoryId)?.name || sub.name;
    const isBrand = depth === 0;
    return (
    <div key={sub.id}>
      <div
        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0e1b30] border border-[#1c2433] text-xs"
        style={{ marginLeft: depth * 20 }}
      >
        {editingId === sub.id ? (
          <>
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 bg-[#0e1b30] border border-amber-400 rounded-lg px-2 py-1 text-white text-xs"
            />
            <button onClick={() => handleSaveEdit(sub)} className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px]">
              Salva
            </button>
            <button onClick={() => setEditingId(null)} className="px-2.5 py-1 bg-[#161f30] text-slate-400 rounded-lg text-[11px]">
              Annulla
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              {depth > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
              {isBrand && (
                <div className="w-6 h-6 rounded-full overflow-hidden bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                  {sub.image ? (
                    <img src={sub.image} alt={sub.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-sky-400 font-bold text-[10px]">{sub.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              )}
              <span className="text-white font-semibold truncate">{sub.name}</span>
              {isBrand && childrenOf(sub.id).length > 0 && (
                <span className="text-[10px] text-slate-400">({childrenOf(sub.id).length} sotto-sottocategorie)</span>
              )}
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                  count > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#161f30] text-slate-400'
                }`}
                title={isBrand ? 'Totale articoli in questa marca (incluse le tipologie)' : 'Articoli assegnati qui'}
              >
                {count} art.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isBrand && (
                <button
                  onClick={() => setUploadingLogoFor(uploadingLogoFor === sub.id ? null : sub.id)}
                  className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-100"
                  title="Carica il logo originale di questa marca"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                </button>
              )}
              {count > 0 && onViewProducts && (
                <button
                  onClick={() => onViewProducts(searchQuery)}
                  className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/20"
                  title="Vedi articoli di questa (sotto-)sottocategoria"
                >
                  <PackageSearch className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => {
                  setEditingId(sub.id);
                  setEditName(sub.name);
                }}
                className="p-1.5 rounded-lg bg-[#161f30] text-slate-500 hover:text-white"
                title="Modifica"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (count > 0) {
                    alert(
                      `Non puoi eliminare "${sub.name}": contiene ancora ${count} articol${count === 1 ? 'o' : 'i'}. Spostali prima su un'altra (sotto-)sottocategoria dal tab Prodotti.`
                    );
                    return;
                  }
                  if (confirm(`Eliminare "${sub.name}"? Verranno eliminate anche eventuali sotto-sottocategorie contenute.`)) {
                    deleteSubcategory(sub.id);
                  }
                }}
                className="p-1.5 rounded-lg bg-rose-500/15 text-rose-500 hover:bg-rose-100"
                title="Elimina"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {isBrand && uploadingLogoFor === sub.id && (
        <div className="mt-2 mb-1 p-3 rounded-xl bg-[#0e1b30] border border-amber-500/30" style={{ marginLeft: depth * 20 }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400">Logo di "{sub.name}"</span>
            <button onClick={() => setUploadingLogoFor(null)} className="text-slate-400 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ProductImageUploader
            currentImage={sub.image || ''}
            onImageChange={(uri) => handleLogoChange(sub, uri)}
          />
          {sub.image && (
            <button
              onClick={() => handleLogoChange(sub, '')}
              className="mt-2 text-[11px] font-semibold text-rose-500 hover:text-rose-300"
            >
              Rimuovi logo e torna al badge con iniziale
            </button>
          )}
        </div>
      )}

      {childrenOf(sub.id).map((child) => renderRow(child, depth + 1))}
    </div>
  );
  };

  return (
    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left">
      <div className="flex items-center gap-2">
        <FolderTree className="w-4 h-4 text-sky-400" />
        <h3 className="text-sm font-bold text-white">Sottocategorie e sotto-sottocategorie</h3>
      </div>
      <p className="text-[11px] text-slate-500 -mt-3">
        Il numero accanto a ogni nome è quanti articoli ci sono davvero dentro. Sulle marche, l'icona{' '}
        <ImagePlus className="w-3 h-3 inline mx-0.5" /> carica il logo originale (mostrato nella pagina "Marche" del sito al posto del
        badge con l'iniziale). L'icona <PackageSearch className="w-3 h-3 inline mx-0.5" /> apre gli articoli nel tab Prodotti.
      </p>

      <label className="block">
        <span className="text-[11px] font-semibold text-slate-500 block mb-1">Categoria principale</span>
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="w-full bg-[#0e1b30] border border-[#1c2433] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
        >
          {categoriesList.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <form onSubmit={handleAdd} className="bg-[#0e1b30] p-4 rounded-2xl border border-[#1c2433] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="Nome (es. Ace, oppure Bicchieri)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-[#0e1b30] border border-[#1c2433] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
          />
          <select
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            className="bg-[#0e1b30] border border-[#1c2433] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
          >
            <option value="">— Sottocategoria diretta —</option>
            {topLevelSubs.map((s) => (
              <option key={s.id} value={s.id}>Sotto-sottocategoria di: {s.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Crea
        </button>
      </form>

      <div className="space-y-2">
        {topLevelSubs.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">
            Nessuna sottocategoria ancora per questa categoria. Creane una qui sopra.
          </p>
        )}
        {topLevelSubs.map((s) => renderRow(s, 0))}
      </div>
    </div>
  );
};
