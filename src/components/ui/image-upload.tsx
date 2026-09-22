"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { createSignedUploadUrl } from "@/app/actions/storage";

type Folder = "bares" | "locales" | "eventos" | "puntos_interes" | "avatars";

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder: Folder;
}

export default function ImageUpload({ value, onChange, folder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const { signedUrl, publicUrl } = await createSignedUploadUrl(folder, file.name);
      const res = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error(`Error ${res.status} al subir`);
      onChange(publicUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative w-full max-h-48 overflow-hidden rounded-md border border-border bg-muted/30">
          <img src={value} alt="" className="w-full h-full object-cover max-h-48" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 bg-background/80 hover:bg-background rounded-full p-1 shadow transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 py-8 cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Haz clic para subir una imagen</p>
            </>
          )}
        </div>
      )}

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

      <div className="flex gap-2 items-center">
        {uploading ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...
          </span>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            {value ? "Cambiar imagen" : "Subir imagen"}
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
