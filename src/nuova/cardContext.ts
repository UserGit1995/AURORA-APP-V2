import { createContext, useContext, ReactNode } from 'react';
import type { Product } from '../types';

/**
 * Con la grafica nuova attiva, le liste prodotti (catalogo, offerte, preferiti,
 * marche, ricerca) disegnano le schede con questo componente. Con la grafica
 * classica il valore è null e le liste restano esattamente come prima.
 */
export type CardRenderer = (product: Product) => ReactNode;
export const CardRendererContext = createContext<CardRenderer | null>(null);
export const useCardRenderer = () => useContext(CardRendererContext);
