"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import type { Local } from "@/types/database";
import { upsertLocal, deleteLocal } from "@/app/actions/resources";
import ImageUpload from "@/components/ui/image-upload";

export default function LocalForm({ local, mode }: { local?: Local; mode: "create" | "edit" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombre: local?.nombre ?? "",
    tipo: local?.tipo ?? "",
    direccion: local?.direccion ?? "",
    descripcion: local?.descripcion ?? "",
    imagen_url: local?.imagen_url ?? "",
    latitud: local?.latitud?.toString() ?? "",
    longitud: local?.longitud?.toString() ?? "",
    vestimenta: local?.vestimenta ?? "Casual",
    edad_minima: local?.edad_minima ?? "+18",
    horario_habitual: local?.horario_habitual ?? "00:00 - 07:00",
    precio_copa: local?.precio_copa ?? "",
    precio_tercio: local?.precio_tercio ?? "",
    estilo: local?.estilo ?? "",
  });

  const set = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await upsertLocal({
          id: mode === "edit" ? local!.id : undefined,
          ...form,
          latitud: form.latitud ? parseFloat(form.latitud) : null,
          longitud: form.longitud ? parseFloat(form.longitud) : null,
        });
        router.push("/locales");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este local? Se eliminarán también sus eventos.")) return;
    startDeleteTransition(async () => {
      try {
        await deleteLocal(local!.id);
        router.push("/locales");
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
          <Label>Tipo *</Label>
          <Input value={form.tipo} onChange={(e) => set("tipo", e.target.value)} placeholder="discoteca, sala..." required />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Dirección *</Label>
          <Input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Latitud</Label>
          <Input type="number" step="any" value={form.latitud} onChange={(e) => set("latitud", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Longitud</Label>
          <Input type="number" step="any" value={form.longitud} onChange={(e) => set("longitud", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Vestimenta</Label>
          <Input value={form.vestimenta} onChange={(e) => set("vestimenta", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Edad mínima</Label>
          <Input value={form.edad_minima} onChange={(e) => set("edad_minima", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Horario habitual</Label>
          <Input value={form.horario_habitual} onChange={(e) => set("horario_habitual", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Estilo musical</Label>
          <Input value={form.estilo} onChange={(e) => set("estilo", e.target.value)} placeholder="Reggaeton, Electrónica..." />
        </div>
        <div className="space-y-1.5">
          <Label>Precio copa</Label>
          <Input value={form.precio_copa} onChange={(e) => set("precio_copa", e.target.value)} placeholder="Ej: 8€" />
        </div>
        <div className="space-y-1.5">
          <Label>Precio tercio</Label>
          <Input value={form.precio_tercio} onChange={(e) => set("precio_tercio", e.target.value)} placeholder="Ej: 3€" />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Imagen</Label>
          <ImageUpload value={form.imagen_url} onChange={(url) => set("imagen_url", url)} folder="locales" />
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
          {mode === "create" ? "Crear local" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/locales")}>Cancelar</Button>
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
