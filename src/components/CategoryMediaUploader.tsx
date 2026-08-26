import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  Check, 
  Eye, 
  AlertCircle,
  FolderOpen,
  Camera,
  Layers
} from 'lucide-react';

interface CategoryMediaUploaderProps {
  currentImage?: string;
  onImageSelected: (imageDataUrl: string) => void;
  levelLabel: string;
  nodeTitle: string;
  onClose?: () => void;
}

export const CategoryMediaUploader: React.FC<CategoryMediaUploaderProps> = ({
  currentImage = '',
  onImageSelected,
  levelLabel,
  nodeTitle,
  onClose,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>(currentImage);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize and optimize image to keep localStorage and Supabase payloads fast and light
  const processAndResizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Errore nella lettura del file SVG.'));
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          try {
            const MAX_DIM = 900;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_DIM) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              resolve(dataUrl);
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const isPng = file.type === 'image/png';
            const outputType = isPng ? 'image/png' : 'image/jpeg';
            const quality = isPng ? 0.90 : 0.85;

            const finalDataUrl = canvas.toDataURL(outputType, quality);
            resolve(finalDataUrl);
          } catch {
            resolve(dataUrl);
          }
        };
        img.onerror = () => reject(new Error('Impossibile decodificare l\'immagine selezionata.'));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('Errore nella lettura del file.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (file: File) => {
    setUploadError(null);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Formato non supportato. Carica un file JPG, PNG, WebP o SVG.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Il file supera il limite massimo di 15 MB.');
      return;
    }

    setIsLoading(true);
    try {
      const formattedSize = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
        : `${(file.size / 1024).toFixed(1)} KB`;
        
      setFileDetails({ name: file.name, size: formattedSize });
      const processedUri = await processAndResizeImage(file);
      setPreviewUrl(processedUri);
    } catch (err: any) {
      setUploadError(err.message || 'Errore durante l\'elaborazione dell\'immagine.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = () => {
    if (previewUrl) {
      onImageSelected(previewUrl);
      if (onClose) onClose();
    }
  };

  return (
    <div id="category-media-uploader" className="space-y-4">
      {/* Target Category Header */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
              {levelLabel}
            </span>
            <h4 className="text-sm font-semibold text-slate-800 mt-0.5">{nodeTitle}</h4>
          </div>
        </div>
      </div>

      {/* Upload Zone from PC */}
      <div
        id="pc-upload-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-teal-500 bg-teal-50/50 scale-[0.99]'
            : 'border-slate-300 hover:border-teal-400 bg-slate-50/70 hover:bg-teal-50/20'
        }`}
      >
        <input
          ref={fileInputRef}
          id="pc-category-file-input"
          type="file"
          accept="image/png, image/jpeg, image/webp, image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />

        {isLoading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-3">
            <div className="w-9 h-9 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-600">Ottimizzazione immagine dal PC in corso...</p>
          </div>
        ) : (
          <div className="space-y-3 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Seleziona o trascina un'immagine dal tuo PC
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supporta JPG, PNG, WebP, SVG (fino a 15 MB) • Verrà adattata automaticamente
              </p>
            </div>

            <button
              type="button"
              id="browse-pc-image-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 hover:border-teal-600 hover:text-teal-700 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-teal-600" />
              <span>Sfoglia file nel PC</span>
            </button>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Live Preview Card */}
      {previewUrl && (
        <div className="border border-slate-200 bg-white rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-semibold text-slate-700">Anteprima Immagine</span>
              {fileDetails && (
                <span className="text-[11px] text-slate-400">({fileDetails.name} • {fileDetails.size})</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setPreviewUrl('');
                setFileDetails(null);
              }}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Rimuovi</span>
            </button>
          </div>

          <div className="relative h-40 w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
            <img
              src={previewUrl}
              alt={nodeTitle}
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-end space-x-3 pt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Annulla
          </button>
        )}
        <button
          type="button"
          id="confirm-save-category-image-btn"
          disabled={!previewUrl || isLoading}
          onClick={handleSave}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
        >
          <Check className="w-4 h-4" />
          <span>Salva Immagine dal PC</span>
        </button>
      </div>
    </div>
  );
};
