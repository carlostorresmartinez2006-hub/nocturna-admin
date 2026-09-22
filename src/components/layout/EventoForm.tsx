"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import type { Evento, Local } from "@/types/database";
import { upsertEvento, deleteEvento } from "@/app/actions/resources";
import ImageUpload from "@/components/ui/image-upload";

interface Props {
  evento?: Evento;
  locales: Pick<Local, "id" | "nombre">[];
  mode: "create" | "edit";
}

export default function EventoForm({ evento, locales, mode }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    titulo: evento?.titulo ?? "",
    local_id: evento?.local_id ?? "",
    fecha_evento: evento?.fecha_evento
      ? new Date(evento.fecha_evento).toISOString().slice(0, 16)
      : "",
    fecha_texto: evento?.fecha_texto ?? "",
    local_texto: evento?.local_texto ?? "",
    imagen_cartel_url: evento?.imagen_cartel_url ?? "",
    enlace_rrpp: evento?.enlace_rrpp ?? "",
    precio: evento?.precio ?? "",
    descripcion: evento?.descripcion ?? "",
    fourvenues_evento_id: evento?.fourvenues_evento_id ?? "",
    cupo_ventas: evento?.cupo_ventas?.toString() ?? "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await upsertEvento({
          id: mode === "edit" ? evento!.id : undefined,
          titulo: form.titulo,
          local_id: form.local_id,
          fecha_evento: form.fecha_evento || null,
          fecha_texto: form.fecha_texto || null,
          local_texto: form.local_texto || null,
          imagen_cartel_url: form.imagen_cartel_url || null,
          enlace_rrpp: form.enlace_rrpp,
          precio: form.precio || null,
          descripcion: form.descripcion || null,
          fourvenues_evento_id: form.fourvenues_evento_id || null,
          cupo_ventas: form.cupo_ventas ? parseInt(form.cupo_ventas) : null,
        });
        router.push("/eventos");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este evento? Esta acción no se puede deshacer.")) return;
    startDeleteTransition(async () => {
      try {
        await deleteEvento(evento!.id);
        router.push("/eventos");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al eliminar");
      }
    });
  }

  const localLabel = locales.find((l) => l.id === form.local_id)?.nombre;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1.5">
          <Label>Título *</Label>
          <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label>Local *</Label>
          <Select value={form.local_id} onValueChange={(v) => set("local_id", v ?? "")}>
            <SelectTrigger><SelectValue placeholder="Selecciona un local">{localLabel}</SelectValue></SelectTrigger>
            <SelectContent>
              {locales.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Texto del local (visible en app)</Label>
          <Input value={form.local_texto} onChange={(e) => set("local_texto", e.target.value)} placeholder="Ej: Sala X, Valencia" />
        </div>

        <div className="space-y-1.5">
          <Label>Fecha y hora del evento</Label>
          <Input type="datetime-local" value={form.fecha_evento} onChange={(e) => set("fecha_evento", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Texto de fecha (visible en app)</Label>
          <Input value={form.fecha_texto} onChange={(e) => set("fecha_texto", e.target.value)} placeholder="Ej: Sábado 21 Sep" />
        </div>

        <div className="space-y-1.5">
          <Label>Enlace RRPP (único) *</Label>
          <Input value={form.enlace_rrpp} onChange={(e) => set("enlace_rrpp", e.target.value)} placeholder="https://..." required />
        </div>

        <div className="space-y-1.5">
          <Label>Precio</Label>
          <Input value={form.precio} onChange={(e) => set("precio", e.target.value)} placeholder="Ej: 10€ / Gratis" />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label>Imagen cartel</Label>
          <ImageUpload value={form.imagen_cartel_url} onChange={(url) => set("imagen_cartel_url", url)} folder="eventos" />
        </div>

        <div className="space-y-1.5">
          <Label>Cupo de ventas</Label>
          <Input type="number" value={form.cupo_ventas} onChange={(e) => set("cupo_ventas", e.target.value)} placeholder="0 = ilimitado" />
        </div>

        <div className="space-y-1.5">
          <Label>ID Fourvenues (opcional)</Label>
          <Input value={form.fourvenues_evento_id} onChange={(e) => set("fourvenues_evento_id", e.target.value)} />
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
          {mode === "create" ? "Crear evento" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/eventos")}>
          Cancelar
        </Button>
        {mode === "edit" && (
          <Button
            type="button"
            variant="destructive"
            className="ml-auto gap-2"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Eliminar
          </Button>
        )}
      </div>
    </form>
  );
}
