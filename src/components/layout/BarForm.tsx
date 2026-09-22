"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import type { Bar } from "@/types/database";
import { upsertBar, deleteBar } from "@/app/actions/resources";
import ImageUpload from "@/components/ui/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIPOS_BAR = ["Bares", "Tabernas"];

export default function BarForm({ bar, mode }: { bar?: Bar; mode: "create" | "edit" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombre: bar?.nombre ?? "",
    tipo: bar?.tipo ?? "",
    descripcion: bar?.descripcion ?? "",
    direccion: bar?.direccion ?? "",
    horario: bar?.horario ?? "",
    contacto: bar?.contacto ?? "",
    precio_rango: bar?.precio_rango ?? "",
    image_url: bar?.image_url ?? "",
    latitud: bar?.latitud?.toString() ?? "",
    longitud: bar?.longitud?.toString() ?? "",
    tags: bar?.tags?.join(", ") ?? "",
    es_destacado: bar?.es_destacado ? "true" : "false",
  });

  const set = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await upsertBar({
          id: mode === "edit" ? bar!.id : undefined,
          nombre: form.nombre,
          tipo: form.tipo,
          descripcion: form.descripcion || null,
          direccion: form.direccion || null,
          horario: form.horario || null,
          contacto: form.contacto || null,
          precio_rango: form.precio_rango || null,
          image_url: form.image_url || null,
          latitud: form.latitud ? parseFloat(form.latitud) : null,
          longitud: form.longitud ? parseFloat(form.longitud) : null,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
          es_destacado: form.es_destacado === "true",
        });
        router.push("/bares");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este bar?")) return;
    startDeleteTransition(async () => {
      try {
        await deleteBar(bar!.id);
        router.push("/bares");
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
          <Select value={form.tipo} onValueChange={(v) => set("tipo", v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tipo">{form.tipo || undefined}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TIPOS_BAR.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Dirección</Label>
          <Input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Horario</Label>
          <Input value={form.horario} onChange={(e) => set("horario", e.target.value)} placeholder="18:00 - 02:00" />
        </div>
        <div className="space-y-1.5">
          <Label>Contacto</Label>
          <Input value={form.contacto} onChange={(e) => set("contacto", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Rango de precio</Label>
          <Input value={form.precio_rango} onChange={(e) => set("precio_rango", e.target.value)} placeholder="€ / €€ / €€€" />
        </div>
        <div className="space-y-1.5">
          <Label>Destacado</Label>
          <Select value={form.es_destacado} onValueChange={(v) => set("es_destacado", v ?? "false")}>
            <SelectTrigger>
              <SelectValue>{form.es_destacado === "true" ? "Sí" : "No"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">No</SelectItem>
              <SelectItem value="true">Sí</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Tags (separados por coma)</Label>
          <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="cocktails, rooftop, jazz" />
        </div>
        <div className="space-y-1.5">
          <Label>Latitud</Label>
          <Input type="number" step="any" value={form.latitud} onChange={(e) => set("latitud", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Longitud</Label>
          <Input type="number" step="any" value={form.longitud} onChange={(e) => set("longitud", e.target.value)} />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Imagen</Label>
          <ImageUpload value={form.image_url} onChange={(url) => set("image_url", url)} folder="bares" />
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
          {mode === "create" ? "Crear bar" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/bares")}>Cancelar</Button>
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
