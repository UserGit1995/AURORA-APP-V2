import { useRef, useState } from "react";
import { Upload, Loader2, Link2, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Seleziona un file immagine (jpg, png, webp...).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("L'immagine supera 8MB, scegline una più leggera.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("aurora-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("aurora-images").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err: any) {
      setError(err?.message ?? "Caricamento non riuscito. Riprova.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <span className="text-[11px] font-semibold text-muted-foreground block mb-1">{label}</span>
      <div className="flex items-center gap-2">
        {value ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-background border border-border shrink-0 flex items-center justify-center">
            <img src={value} alt="" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-background border border-dashed border-border shrink-0 flex items-center justify-center text-muted-foreground">
            <ImageOff size={16} />
          </div>
        )}
        <div className="flex-1 relative">
          <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... oppure carica un file"
            className="input-field pl-7"
          />
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-9 px-3 rounded-lg bg-secondary text-foreground text-xs font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-60"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Dal PC
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
    </div>
  );
}
