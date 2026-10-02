"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { createSignedUploadUrl } from "@/app/actions/storage";

type Folder = "bares" | "locales" | "eventos" | "puntos_interes" | "avatars";

// Los logos de los locales se muestran en la app enteros dentro de un hueco común: para que todos
// salgan del mismo tamaño, el archivo no debe llevar márgenes. Aquí se recortan solos al subirlos:
// los bordes transparentes y, si el logo viene sobre fondo negro opaco, el negro pasa a transparente.
// Las fotos (opacas y sin fondo negro liso) se suben tal cual.
async function recortarLogo(file: File): Promise<File> {
  if (!/png|webp/i.test(file.type)) return file;
  const bmp = await createImageBitmap(file);
  const escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * escala));
  const h = Math.max(1, Math.round(bmp.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return file;
  ctx.drawImage(bmp, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  let transparentes = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 16) transparentes++;
  const conTransparencia = transparentes / (w * h) > 0.01;

  if (!conTransparencia) {
    // ¿Fondo negro liso? (las cuatro esquinas casi negras)
    const esquina = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return Math.max(d[i], d[i + 1], d[i + 2]);
    };
    const negro = [esquina(1, 1), esquina(w - 2, 1), esquina(1, h - 2), esquina(w - 2, h - 2)].every((v) => v < 24);
    if (!negro) return file; // es una foto
    for (let i = 0; i < d.length; i += 4) {
      const lum = Math.max(d[i], d[i + 1], d[i + 2]);
      const alfa = Math.max(0, Math.min(255, ((lum - 18) * 255 / 237) * 1.6));
      if (alfa > 0 && lum > 0) {
        d[i] = Math.min(255, (d[i] * 255) / lum);
        d[i + 1] = Math.min(255, (d[i + 1] * 255) / lum);
        d[i + 2] = Math.min(255, (d[i + 2] * 255) / lum);
      }
      d[i + 3] = alfa;
    }
    ctx.putImageData(img, 0, 0);
  }

  // Caja del contenido (píxeles visibles)
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return file;
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const k = Math.min(1, 900 / Math.max(cw, ch));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(cw * k));
  out.height = Math.max(1, Math.round(ch * k));
  out.getContext("2d")?.drawImage(canvas, x0, y0, cw, ch, 0, 0, out.width, out.height);
  const blob: Blob | null = await new Promise((res) => out.toBlob(res, "image/png"));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".png", { type: "image/png" });
}

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
      if (folder === "locales") file = await recortarLogo(file).catch(() => file);
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
        <div className={`relative w-full max-h-48 overflow-hidden rounded-md border border-border ${folder === "locales" ? "bg-neutral-900" : "bg-muted/30"}`}>
          {/* Los locales suelen llevar un logo con fondo transparente: se ve entero sobre oscuro */}
          <img src={value} alt="" className={folder === "locales" ? "w-full h-40 object-contain p-6" : "w-full h-full object-cover max-h-48"} />
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

      {folder === "locales" && (
        <p className="text-xs text-muted-foreground">
          Sube el logo en PNG (mejor con fondo transparente). Los márgenes se recortan solos para que en la app todos
          los locales salgan del mismo tamaño.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
