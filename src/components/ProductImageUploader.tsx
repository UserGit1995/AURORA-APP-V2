import React, { useState, useRef, useCallback } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  Check, 
  Link2, 
  Sparkles, 
  Eye, 
  AlertCircle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface ProductImageUploaderProps {
  currentImage?: string;
  onImageChange: (imageUri: string) => void;
  presetImages?: { label: string; url: string }[];
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  currentImage = '',
  onImageChange,
  presetImages = [
    { label: 'Detergenza Casa', url: '/logo-login.png' },
    { label: 'Igiene Bagno & Sanitari', url: '/logo-login.png' },
    { label: 'Cucina & Sgrassatori', url: '/logo-login.png' },
    { label: 'Monouso & Carta', url: '/logo-login.png' },
  ],
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [urlInput, setUrlInput] = useState(currentImage || '');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to optimize and resize image file to prevent localStorage quota exhaustion
  const processAndResizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // SVG files can be read directly
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
            const MAX_DIM = 1200;
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

            // Compress to WebP or JPEG
            const isPngWithTransparency = file.type === 'image/png';
            const outputType = isPngWithTransparency ? 'image/png' : 'image/jpeg';
            const quality = isPngWithTransparency ? 0.92 : 0.86;

            const finalDataUrl = canvas.toDataURL(outputType, quality);
            resolve(finalDataUrl);
          } catch (err) {
            console.error('Resize fallback to raw dataUrl', err);
            resolve(dataUrl);
          }
        };
        img.onerror = () => reject(new Error('Impossibile decodificare l\'immagine.'));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('Errore durante il caricamento del file.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (file: File) => {
    setUploadError(null);

    // Validate mime type
    if (!file.type.startsWith('image/')) {
      setUploadError('Il file selezionato non è un\'immagine valida (sono supportati PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    // Limit maximum size before compression (e.g. 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Il file supera i 15MB. Seleziona un file di dimensioni inferiori.');
      return;
    }

    try {
      setIsLoading(true);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const sizeKb = (file.size / 1024).toFixed(0);
      const sizeStr = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

      setFileDetails({
        name: file.name,
        size: sizeStr,
      });

      const processedDataUri = await processAndResizeImage(file);
      onImageChange(processedDataUri);
      setUrlInput(processedDataUri);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setUploadError(err.message || 'Errore durante l\'elaborazione dell\'immagine.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    onImageChange(urlInput.trim());
    setFileDetails(null);
    setUploadError(null);
  };

  const handleRemoveImage = () => {
    onImageChange('');
    setUrlInput('');
    setFileDetails(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isUploadedFromPc = currentImage?.startsWith('data:image/');

  return (
    <div className="space-y-3 bg-[#08152b]/70 p-4 rounded-2xl border border-slate-800">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            Foto & Immagine Prodotto
          </label>
          <p className="text-[11px] text-slate-400">
            Carica un'immagine direttamente dal tuo computer o inserisci un URL web.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#060e1d] p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Dal PC</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'url'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link Web</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset</span>
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      {activeTab === 'upload' && (
        <div className="space-y-3">
          {/* Drop Zone Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-amber-400 bg-amber-500/15 scale-[1.01]'
                : 'border-slate-700 hover:border-amber-500/50 bg-[#060e1d]/80 hover:bg-[#071328]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
              id="product-image-pc-file-input"
            />

            {isLoading ? (
              <div className="py-4 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                <span className="text-xs font-bold text-amber-300">Ottimizzazione e caricamento in corso...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    <span className="text-amber-400 underline underline-offset-2">Fai clic per selezionare</span> o trascina qui l'immagine dal computer
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supporta PNG, JPG, JPEG, WEBP, GIF, SVG (fino a 15MB)
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 mt-1">
                  <FolderOpen className="w-3 h-3 text-amber-400" /> Sfoglia file locali
                </span>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Incolla URL immagine (es. https://example.com/foto.jpg)"
              className="flex-1 bg-[#060e1d] border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Applica
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Inserisci un link HTTPS diretto all'immagine.
          </p>
        </div>
      )}

      {activeTab === 'presets' && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400">
            Scegli una grafica o icona predefinita dal catalogo AURORA:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presetImages.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onImageChange(preset.url);
                  setUrlInput(preset.url);
                  setFileDetails(null);
                }}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  currentImage === preset.url
                    ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                    : 'border-slate-800 bg-[#060e1d] hover:border-slate-700 text-slate-300'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  className="w-7 h-7 rounded-lg object-contain bg-white/5 border border-slate-700"
                />
                <span className="text-[11px] font-bold truncate">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Image Preview Bar */}
      {currentImage ? (
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#060e1d]/90 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-14 h-14 rounded-xl bg-black/40 border border-amber-500/40 p-1 flex items-center justify-center shrink-0 overflow-hidden group">
              <img
                src={currentImage}
                alt="Anteprima"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-bold text-white flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> 
                  {isUploadedFromPc ? 'Immagine caricata dal PC' : 'Immagine attiva'}
                </span>
                {isUploadedFromPc && (
                  <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                    LOCALE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px] sm:max-w-md font-mono mt-0.5">
                {fileDetails?.name ? `${fileDetails.name} (${fileDetails.size})` : currentImage.substring(0, 45) + '...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
              <span>Sostituisci</span>
            </button>

            <button
              type="button"
              onClick={handleRemoveImage}
              className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
              title="Rimuovi immagine"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          Nessuna immagine impostata. Verrà visualizzato il logo placeholder AURORA.
        </div>
      )}
    </div>
  );
};
