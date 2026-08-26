import React, { useState } from 'react';
import { 
  Folder, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown, 
  Edit3, 
  Trash2, 
  Plus, 
  UploadCloud, 
  Image as ImageIcon, 
  Check, 
  Layers, 
  Tag, 
  Sparkles,
  Info,
  X
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Category, SubCategory, SubSubCategory } from '../types';
import { CategoryMediaUploader } from './CategoryMediaUploader';

export const CategoryHierarchyManager: React.FC = () => {
  const {
    categoriesList,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    addSubSubCategory,
    updateSubSubCategory,
    deleteSubSubCategory,
    updateCategoryImageFromPc,
  } = useAdmin();

  // Expanded categories & subcategories states
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categoriesList.forEach((c) => {
      initial[c.id] = true;
    });
    return initial;
  });

  const [expandedSubCatIds, setExpandedSubCatIds] = useState<Record<string, boolean>>({});

  // Image Upload Modal State
  const [imageUploadTarget, setImageUploadTarget] = useState<{
    isOpen: boolean;
    level: 'category' | 'subcategory' | 'subsubcategory';
    levelLabel: string;
    nodeTitle: string;
    currentImage?: string;
    categoryId: string;
    subCategoryId?: string;
    subSubCategoryId?: string;
  } | null>(null);

  // Add / Edit Modal States
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    level: 'category' | 'subcategory' | 'subsubcategory';
    categoryId?: string;
    subCategoryId?: string;
    subSubCategoryId?: string;
    name: string;
    description: string;
    image: string;
  }>({
    isOpen: false,
    mode: 'add',
    level: 'category',
    name: '',
    description: '',
    image: '',
  });

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCatIds((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const toggleSubCategoryExpand = (subId: string) => {
    setExpandedSubCatIds((prev) => ({ ...prev, [subId]: !prev[subId] }));
  };

  // Open PC Image Upload Modal
  const handleOpenUploadModal = (
    level: 'category' | 'subcategory' | 'subsubcategory',
    categoryId: string,
    subCategoryId?: string,
    subSubCategoryId?: string,
    nodeTitle: string = '',
    currentImage: string = ''
  ) => {
    const levelLabel =
      level === 'category'
        ? 'Livello 1: Categoria Principale'
        : level === 'subcategory'
        ? 'Livello 2: Sottocategoria'
        : 'Livello 3: Sottocategoria della Sottocategoria';

    setImageUploadTarget({
      isOpen: true,
      level,
      levelLabel,
      nodeTitle,
      currentImage,
      categoryId,
      subCategoryId,
      subSubCategoryId,
    });
  };

  // Handle Save Image from PC
  const handleSaveImageFromPc = (imageDataUrl: string) => {
    if (!imageUploadTarget) return;

    updateCategoryImageFromPc(
      {
        level: imageUploadTarget.level,
        categoryId: imageUploadTarget.categoryId,
        subCategoryId: imageUploadTarget.subCategoryId,
        subSubCategoryId: imageUploadTarget.subSubCategoryId,
      },
      imageDataUrl
    );

    setImageUploadTarget(null);
  };

  // Open Add Category Modal
  const openAddCategoryModal = () => {
    setModalState({
      isOpen: true,
      mode: 'add',
      level: 'category',
      name: '',
      description: '',
      image: '/logo-login.png',
    });
  };

  // Open Add Subcategory Modal
  const openAddSubCategoryModal = (categoryId: string) => {
    setModalState({
      isOpen: true,
      mode: 'add',
      level: 'subcategory',
      categoryId,
      name: '',
      description: '',
      image: '/logo-login.png',
    });
    // Ensure parent category is expanded
    setExpandedCatIds((prev) => ({ ...prev, [categoryId]: true }));
  };

  // Open Add Sub-subcategory Modal
  const openAddSubSubCategoryModal = (categoryId: string, subCategoryId: string) => {
    setModalState({
      isOpen: true,
      mode: 'add',
      level: 'subsubcategory',
      categoryId,
      subCategoryId,
      name: '',
      description: '',
      image: '/logo-login.png',
    });
    // Ensure parent subcategory is expanded
    setExpandedSubCatIds((prev) => ({ ...prev, [subCategoryId]: true }));
  };

  // Open Edit Node Modal
  const openEditModal = (
    level: 'category' | 'subcategory' | 'subsubcategory',
    categoryId: string,
    subCategoryId?: string,
    subSubCategoryId?: string,
    currentName: string = '',
    currentDescription: string = '',
    currentImage: string = ''
  ) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      level,
      categoryId,
      subCategoryId,
      subSubCategoryId,
      name: currentName,
      description: currentDescription,
      image: currentImage || '/logo-login.png',
    });
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalState.name.trim()) return;

    if (modalState.level === 'category') {
      if (modalState.mode === 'add') {
        addCategory({
          name: modalState.name.trim(),
          description: modalState.description.trim(),
          count: '0 prodotti',
          countNumber: 0,
          image: modalState.image || '/logo-login.png',
          subCategories: [],
        });
      } else if (modalState.mode === 'edit' && modalState.categoryId) {
        const existingCat = categoriesList.find((c) => c.id === modalState.categoryId);
        if (existingCat) {
          updateCategory({
            ...existingCat,
            name: modalState.name.trim(),
            description: modalState.description.trim(),
            image: modalState.image || existingCat.image,
          });
        }
      }
    } else if (modalState.level === 'subcategory' && modalState.categoryId) {
      if (modalState.mode === 'add') {
        addSubCategory(modalState.categoryId, {
          name: modalState.name.trim(),
          description: modalState.description.trim(),
          image: modalState.image || '/logo-login.png',
          countNumber: 0,
          subSubCategories: [],
        });
      } else if (modalState.mode === 'edit' && modalState.subCategoryId) {
        const cat = categoriesList.find((c) => c.id === modalState.categoryId);
        const sub = cat?.subCategories?.find((s) => s.id === modalState.subCategoryId);
        if (sub) {
          updateSubCategory(modalState.categoryId, {
            ...sub,
            name: modalState.name.trim(),
            description: modalState.description.trim(),
            image: modalState.image || sub.image,
          });
        }
      }
    } else if (
      modalState.level === 'subsubcategory' &&
      modalState.categoryId &&
      modalState.subCategoryId
    ) {
      if (modalState.mode === 'add') {
        addSubSubCategory(modalState.categoryId, modalState.subCategoryId, {
          name: modalState.name.trim(),
          description: modalState.description.trim(),
          image: modalState.image || '/logo-login.png',
          countNumber: 0,
        });
      } else if (modalState.mode === 'edit' && modalState.subSubCategoryId) {
        const cat = categoriesList.find((c) => c.id === modalState.categoryId);
        const sub = cat?.subCategories?.find((s) => s.id === modalState.subCategoryId);
        const micro = sub?.subSubCategories?.find((m) => m.id === modalState.subSubCategoryId);
        if (micro) {
          updateSubSubCategory(modalState.categoryId, modalState.subCategoryId, {
            ...micro,
            name: modalState.name.trim(),
            description: modalState.description.trim(),
            image: modalState.image || micro.image,
          });
        }
      }
    }

    setModalState({
      isOpen: false,
      mode: 'add',
      level: 'category',
      name: '',
      description: '',
      image: '',
    });
  };

  return (
    <div id="category-hierarchy-manager" className="space-y-6">
      {/* Top Banner and Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#08152b] p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Gerarchia Categorie a 3 Livelli
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestisci <span className="text-amber-300 font-semibold">Categorie</span>, <span className="text-sky-300 font-semibold">Sottocategorie</span> e <span className="text-emerald-300 font-semibold">Sotto-sottocategorie</span> con caricamento immagini diretto dal tuo PC.
          </p>
        </div>

        <button
          type="button"
          id="btn-add-master-category"
          onClick={openAddCategoryModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuova Categoria Principale</span>
        </button>
      </div>

      {/* Categories Tree */}
      <div className="space-y-4">
        {categoriesList.map((cat) => {
          const isCatExpanded = !!expandedCatIds[cat.id];
          const subCats = cat.subCategories || [];

          return (
            <div
              key={cat.id}
              id={`cat-card-${cat.id}`}
              className="rounded-2xl bg-[#071329] border border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
            >
              {/* Level 1: Main Category Bar */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#0a1b38] to-[#071329] flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleCategoryExpand(cat.id)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {isCatExpanded ? (
                      <ChevronDown className="w-5 h-5 text-amber-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {/* Thumbnail with direct PC Image Upload overlay */}
                  <div className="relative group w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-amber-500/30 shrink-0">
                    <img
                      src={cat.image || '/logo-login.png'}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenUploadModal('category', cat.id, undefined, undefined, cat.name, cat.image)}
                      title="Carica nuova immagine da PC per questa Categoria"
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-amber-300 text-[9px] font-bold transition-opacity cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>PC</span>
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase border border-amber-500/30">
                        Livello 1
                      </span>
                      <h4 className="font-bold text-white text-sm sm:text-base truncate">
                        {cat.name}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {cat.description || 'Nessuna descrizione impostata'}
                    </p>
                  </div>
                </div>

                {/* Level 1 Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    id={`upload-pc-cat-${cat.id}`}
                    onClick={() => handleOpenUploadModal('category', cat.id, undefined, undefined, cat.name, cat.image)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Carica foto da PC"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Foto da PC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openAddSubCategoryModal(cat.id)}
                    className="px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Aggiungi Sottocategoria</span>
                    <span className="sm:hidden">+ Sottocat.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal('category', cat.id, undefined, undefined, cat.name, cat.description, cat.image)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
                    title="Modifica Categoria"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Eliminare la categoria "${cat.name}" e tutte le sue sottocategorie?`)) {
                        deleteCategory(cat.id);
                      }
                    }}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Elimina Categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Level 2: Subcategories List */}
              {isCatExpanded && (
                <div className="p-3 sm:p-5 space-y-3 bg-[#050e1f]">
                  {subCats.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center space-y-2">
                      <p className="text-xs text-slate-400">Nessuna sottocategoria creata in questa sezione.</p>
                      <button
                        type="button"
                        onClick={() => openAddSubCategoryModal(cat.id)}
                        className="inline-flex items-center space-x-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Aggiungi la prima sottocategoria</span>
                      </button>
                    </div>
                  ) : (
                    subCats.map((sub) => {
                      const isSubExpanded = !!expandedSubCatIds[sub.id];
                      const microCats = sub.subSubCategories || [];

                      return (
                        <div
                          key={sub.id}
                          id={`subcat-card-${sub.id}`}
                          className="ml-2 sm:ml-4 rounded-xl bg-[#091730] border border-slate-800 hover:border-sky-500/30 transition-all overflow-hidden"
                        >
                          {/* Level 2 Header */}
                          <div className="p-3 bg-[#0c1f40] flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/60">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => toggleSubCategoryExpand(sub.id)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              >
                                {isSubExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-sky-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                              </button>

                              {/* Subcategory Thumbnail with direct PC Image Upload */}
                              <div className="relative group w-9 h-9 rounded-lg overflow-hidden bg-slate-900 border border-sky-500/30 shrink-0">
                                <img
                                  src={sub.image || cat.image || '/logo-login.png'}
                                  alt={sub.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenUploadModal('subcategory', cat.id, sub.id, undefined, sub.name, sub.image || cat.image)}
                                  title="Carica foto da PC per questa Sottocategoria"
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-sky-300 text-[8px] font-bold transition-opacity cursor-pointer"
                                >
                                  <UploadCloud className="w-3 h-3" />
                                  <span>PC</span>
                                </button>
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[9px] uppercase border border-sky-500/30">
                                    Livello 2: Sottocategoria
                                  </span>
                                  <h5 className="font-bold text-white text-xs sm:text-sm truncate">
                                    {sub.name}
                                  </h5>
                                </div>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {sub.description || 'Nessuna descrizione'}
                                </p>
                              </div>
                            </div>

                            {/* Level 2 Actions */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                id={`upload-pc-subcat-${sub.id}`}
                                onClick={() => handleOpenUploadModal('subcategory', cat.id, sub.id, undefined, sub.name, sub.image || cat.image)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Carica foto da PC"
                              >
                                <UploadCloud className="w-3 h-3 text-sky-400" />
                                <span className="hidden sm:inline">Foto da PC</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openAddSubSubCategoryModal(cat.id, sub.id)}
                                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Sotto-sottocategoria</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditModal('subcategory', cat.id, sub.id, undefined, sub.name, sub.description, sub.image)}
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-xs transition-colors cursor-pointer"
                                title="Modifica Sottocategoria"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Eliminare la sottocategoria "${sub.name}"?`)) {
                                    deleteSubCategory(cat.id, sub.id);
                                  }
                                }}
                                className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md text-xs transition-colors cursor-pointer"
                                title="Elimina Sottocategoria"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Level 3: Sub-subcategories (Micro-categories) */}
                          {isSubExpanded && (
                            <div className="p-2.5 sm:p-3 bg-[#061124] space-y-2">
                              {microCats.length === 0 ? (
                                <div className="p-2.5 border border-dashed border-slate-800/80 rounded-lg text-center">
                                  <p className="text-[11px] text-slate-500">Nessuna sotto-sottocategoria (Livello 3).</p>
                                  <button
                                    type="button"
                                    onClick={() => openAddSubSubCategoryModal(cat.id, sub.id)}
                                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 mt-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Aggiungi sotto-sottocategoria</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {microCats.map((micro) => (
                                    <div
                                      key={micro.id}
                                      id={`microcat-card-${micro.id}`}
                                      className="p-2.5 rounded-lg bg-[#0a1c3b] border border-slate-800 hover:border-emerald-500/40 flex items-center justify-between gap-2 transition-all"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {/* Microcategory thumbnail with PC upload */}
                                        <div className="relative group w-8 h-8 rounded bg-slate-900 border border-emerald-500/30 overflow-hidden shrink-0">
                                          <img
                                            src={micro.image || sub.image || cat.image || '/logo-login.png'}
                                            alt={micro.name}
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleOpenUploadModal('subsubcategory', cat.id, sub.id, micro.id, micro.name, micro.image || sub.image || cat.image)}
                                            title="Carica foto da PC per questa Sotto-sottocategoria"
                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-emerald-300 text-[7px] font-bold transition-opacity cursor-pointer"
                                          >
                                            <UploadCloud className="w-2.5 h-2.5" />
                                            <span>PC</span>
                                          </button>
                                        </div>

                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[8.5px] uppercase border border-emerald-500/30">
                                              L3
                                            </span>
                                            <span className="font-semibold text-white text-xs truncate">
                                              {micro.name}
                                            </span>
                                          </div>
                                          {micro.description && (
                                            <p className="text-[10px] text-slate-400 truncate">
                                              {micro.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Microcategory Actions */}
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          id={`upload-pc-microcat-${micro.id}`}
                                          onClick={() => handleOpenUploadModal('subsubcategory', cat.id, sub.id, micro.id, micro.name, micro.image || sub.image || cat.image)}
                                          className="p-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded text-xs transition-colors cursor-pointer"
                                          title="Carica foto da PC"
                                        >
                                          <UploadCloud className="w-3 h-3 text-emerald-400" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => openEditModal('subsubcategory', cat.id, sub.id, micro.id, micro.name, micro.description, micro.image)}
                                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors cursor-pointer"
                                          title="Modifica"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (confirm(`Eliminare la sotto-sottocategoria "${micro.name}"?`)) {
                                              deleteSubSubCategory(cat.id, sub.id, micro.id);
                                            }
                                          }}
                                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-xs transition-colors cursor-pointer"
                                          title="Elimina"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PC Image Upload Modal */}
      {imageUploadTarget?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white text-slate-900 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setImageUploadTarget(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-teal-600" />
                Carica Immagine da PC
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Seleziona un'immagine dal tuo computer per aggiornare visivamente questo elemento della gerarchia.
              </p>
            </div>

            <CategoryMediaUploader
              currentImage={imageUploadTarget.currentImage}
              levelLabel={imageUploadTarget.levelLabel}
              nodeTitle={imageUploadTarget.nodeTitle}
              onImageSelected={handleSaveImageFromPc}
              onClose={() => setImageUploadTarget(null)}
            />
          </div>
        </div>
      )}

      {/* Add / Edit Category/Subcategory Node Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0a1a36] border border-slate-700 text-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setModalState({ ...modalState, isOpen: false })}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {modalState.level === 'category'
                    ? 'Livello 1 • Categoria Principale'
                    : modalState.level === 'subcategory'
                    ? 'Livello 2 • Sottocategoria'
                    : 'Livello 3 • Sotto-sottocategoria'}
                </span>
                <h3 className="text-base font-bold text-white mt-1.5">
                  {modalState.mode === 'add' ? 'Aggiungi Nuovo Elemento' : 'Modifica Elemento'}
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Elemento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="es. Sgrassatori & Spray Multiuso"
                    value={modalState.name}
                    onChange={(e) => setModalState({ ...modalState, name: e.target.value })}
                    className="w-full bg-[#0c1f40] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Descrizione Breve
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Descrizione opzionale per la consultazione del catalogo"
                    value={modalState.description}
                    onChange={(e) => setModalState({ ...modalState, description: e.target.value })}
                    className="w-full bg-[#0c1f40] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalState({ ...modalState, isOpen: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  {modalState.mode === 'add' ? 'Crea Elemento' : 'Salva Modifiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
