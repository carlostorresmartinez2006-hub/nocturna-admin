"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import type { PuntoInteres } from "@/types/database";
import { upsertPuntoInteres, deletePuntoInteres } from "@/app/actions/resources";
import ImageUpload from "@/components/ui/image-upload";

export default function PuntoInteresForm({ punto, mode }: { punto?: PuntoInteres; mode: "create" | "edit" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombre: punto?.nombre ?? "",
    categoria: punto?.categoria ?? "",
    descripcion: punto?.descripcion ?? "",
    direccion: punto?.direccion ?? "",
    horario: punto?.horario ?? "",
    precio: punto?.precio ?? "",
    imagen_url: punto?.imagen_url ?? "",
    web_url: punto?.web_url ?? "",
    latitud: punto?.latitud?.toString() ?? "",
    longitud: punto?.longitud?.toString() ?? "",
  });

  const set = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await upsertPuntoInteres({
          id: mode === "edit" ? punto!.id : undefined,
          nombre: form.nombre,
          categoria: form.categoria || null,
          descripcion: form.descripcion || null,
          direccion: form.direccion || null,
          horario: form.horario || null,
          precio: form.precio || null,
          imagen_url: form.imagen_url || null,
          web_url: form.web_url || null,
          latitud: parseFloat(form.latitud) || 0,
          longitud: parseFloat(form.longitud) || 0,
        });
        router.push("/puntos-interes");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este punto de interés?")) return;
    startDeleteTransition(async () => {
      try {
        await deletePuntoInteres(punto!.id);
        router.push("/puntos-interes");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al eliminar");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nombre *</Label>
          <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Input value={form.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="museo, parque, monumento..." />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Dirección</Label>
          <Input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Latitud *</Label>
          <Input type="number" step="any" value={form.latitud} onChange={(e) => set("latitud", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Longitud *</Label>
          <Input type="number" step="any" value={form.longitud} onChange={(e) => set("longitud", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Horario</Label>
          <Input value={form.horario} onChange={(e) => set("horario", e.target.value)} placeholder="10:00 - 20:00" />
        </div>
        <div className="space-y-1.5">
          <Label>Precio</Label>
          <Input value={form.precio} onChange={(e) => set("precio", e.target.value)} placeholder="Gratis / 5€" />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Imagen</Label>
          <ImageUpload value={form.imagen_url} onChange={(url) => set("imagen_url", url)} folder="puntos_interes" />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Web / Enlace</Label>
          <Input value={form.web_url} onChange={(e) => set("web_url", e.target.value)} placeholder="https://..." />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Descripción</Label>
          <Textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={3} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "create" ? "Crear punto" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/puntos-interes")}>Cancelar</Button>
        {mode === "edit" && (
          <Button type="button" variant="destructive" className="ml-auto gap-2" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Eliminar
          </Button>
        )}
      </div>
    </form>
  );
}
