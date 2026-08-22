import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface CompareContextValue {
  comparedIds: string[];
  isCompared: (id: string) => boolean;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  removeFromCompare: (id: string) => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);
const STORAGE_KEY = "aurora_compare_v1";
const MAX_COMPARE = 4;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [comparedIds, setComparedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setComparedIds(JSON.parse(raw));
    } catch {
      // ignora storage non disponibile
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comparedIds));
    } catch {
      // ignora storage non disponibile
    }
  }, [comparedIds]);

  const isCompared = (id: string) => comparedIds.includes(id);

  const toggleCompare = (id: string) =>
    setComparedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });

  const clearCompare = () => setComparedIds([]);
  const removeFromCompare = (id: string) => setComparedIds((prev) => prev.filter((p) => p !== id));

  return (
    <CompareContext.Provider value={{ comparedIds, isCompared, toggleCompare, clearCompare, removeFromCompare }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare deve essere usato dentro CompareProvider");
  return ctx;
}
