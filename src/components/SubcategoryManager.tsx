import React, { useState } from 'react';
import { Plus, Edit3, Trash2, ChevronRight, FolderTree, PackageSearch } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Subcategory } from '../types';

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

  const subsForCategory = subcategoriesList.filter((s) => s.categoryId === selectedCategoryId);
  const topLevelSubs = subsForCategory.filter((s) => !s.parentSubcategoryId);
  const childrenOf = (parentId: string) => subsForCategory.filter((s) => s.parentSubcategoryId === parentId);

  // Conta i prodotti assegnati direttamente a questa sottocategoria; per una
  // marca (livello 0) somma anche i prodotti di tutte le sue tipologie figlie,
  // così si vede subito se una marca/tipologia è vuota o piena.
  const directProductCount = (subId: string) => productsList.filter((p) => p.subcategoryId === subId).length;
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

  const renderRow = (sub: Subcategory, depth: number) => {
    const count = totalProductCount(sub);
    // Per una tipologia (depth>0) il nome da solo ("Lacca e Styling") è troppo
    // generico: cerchiamo per marca (il genitore), così il tab Prodotti mostra
    // tutti gli articoli di quella marca e la tipologia specifica si trova a colpo d'occhio.
    const searchQuery = depth === 0 ? sub.name : subsForCategory.find((p) => p.id === sub.parentSubcategoryId)?.name || sub.name;
    return (
    <div key={sub.id}>
      <div
        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#071329] border border-slate-800 text-xs"
        style={{ marginLeft: depth * 20 }}
      >
        {editingId === sub.id ? (
          <>
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 bg-[#0c1c38] border border-amber-400 rounded-lg px-2 py-1 text-white text-xs"
            />
            <button onClick={() => handleSaveEdit(sub)} className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px]">
              Salva
            </button>
            <button onClick={() => setEditingId(null)} className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[11px]">
              Annulla
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              {depth > 0 && <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />}
              <span className="text-white font-semibold truncate">{sub.name}</span>
              {depth === 0 && childrenOf(sub.id).length > 0 && (
                <span className="text-[10px] text-slate-500">({childrenOf(sub.id).length} sotto-sottocategorie)</span>
              )}
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                  count > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-500'
                }`}
                title={depth === 0 ? 'Totale articoli in questa marca (incluse le tipologie)' : 'Articoli assegnati qui'}
              >
                {count} art.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {count > 0 && onViewProducts && (
                <button
                  onClick={() => onViewProducts(searchQuery)}
                  className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
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
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
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
                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                title="Elimina"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
      {childrenOf(sub.id).map((child) => renderRow(child, depth + 1))}
    </div>
  );
  };

  return (
    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left">
      <div className="flex items-center gap-2">
        <FolderTree className="w-4 h-4 text-amber-400" />
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Sottocategorie e sotto-sottocategorie</h3>
      </div>
      <p className="text-[11px] text-slate-500 -mt-3">
        Il numero accanto a ogni nome è quanti articoli ci sono davvero dentro. Clicca l'icona <PackageSearch className="w-3 h-3 inline mx-0.5" /> per vederli ed eventualmente spostarli su un'altra marca/tipologia dal tab Prodotti.
      </p>

      <label className="block">
        <span className="text-[11px] font-semibold text-slate-400 block mb-1">Categoria principale</span>
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="w-full bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
        >
          {categoriesList.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <form onSubmit={handleAdd} className="bg-[#08152b] p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="Nome (es. Ace, oppure Bicchieri)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
          />
          <select
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            className="bg-[#0c1c38] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
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

