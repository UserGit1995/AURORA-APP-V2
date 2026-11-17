import React from 'react';
import * as L from 'lucide-react';
import { Ic } from '../../nuova/Icona';

/* Icone di "Rimuovi sfondo" con lo stesso set disegnato del sito (a due toni, azzurro Aurora).
   Dove il set del sito non ha un'icona adatta si usa quella standard, con gli stessi colori. */
type P = { className?: string; strokeWidth?: number; size?: number };
const mk = (n: string): React.FC<P> => ({ className, size }) => <Ic n={n} s={size || 20} className={className} />;

export const Check = mk('check');
export const Download = mk('download');
export const Upload = mk('upload');
export const FolderOpen = mk('folder');
export const RefreshCw = mk('repeat');
export const Scissors = mk('scissors');
export const Search = mk('search');
export const X = mk('x');
export const ImageOff = mk('image');

export const {
  AlertTriangle, CheckCircle2, Crop, Eraser, FileArchive, Loader2, Paintbrush, Redo2, Save, Square, Star, Trash2, Undo2, Wand2, XCircle, ZoomIn, ZoomOut,
} = L;
