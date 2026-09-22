"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import type { Destacado } from "@/types/database";
import { upsertDestacado, deleteDestacado } from "@/app/actions/resources";

type EventoOption = {
  id: string;
  titulo: string;
  fecha_texto: string | null;
  imagen_cartel_url: string | null;
  enlace_rrpp: string;
  descripcion: string | null;
  local_id: string | null;
  local_texto: string | null;
};

type Props = {
  destacado?: Destacado;
  mode: "create" | "edit";
  eventos?: EventoOption[];
};

const EMPTY_FORM = {
  badge_text: "",
  title: "",
  subtitle: "",
  image_url: "",
  action_url: "",
};

export default function DestacadoForm({ destacado, mode, eventos = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState("");

  const [sourceMode, setSourceMode] = useState<"evento" | "custom">(
    mode === "create" && eventos.length > 0 ? "evento" : "custom"
  );
  const [selectedLocalId, setSelectedLocalId] = useState("");
  const [selectedEventoId, setSelectedEventoId] = useState("");

  const [form, setForm] = useState({
    badge_text: destacado?.badge_text ?? "",
    title: destacado?.title ?? "",
    subtitle: destacado?.subtitle ?? "",
    image_url: destacado?.image_url ?? "",
    action_url: destacado?.action_url ?? "",
  });

  const set = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  // Derive unique locals from eventos
  const locales = useMemo(() => {
    const map = new Map<string, string>();
    eventos.forEach((ev) => {
      if (ev.local_id && ev.local_texto) map.set(ev.local_id, ev.local_texto);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [eventos]);

  const filteredEventos = useMemo(
    () =>
      selectedLocalId
        ? eventos.filter((ev) => ev.local_id === selectedLocalId)
        : eventos,
    [eventos, selectedLocalId]
  );

  const selectedLocalLabel = locales.find((l) => l.id === selectedLocalId)?.name;
  const selectedEventoLabel = filteredEventos.find((ev) => ev.id === selectedEventoId)
    ? `${filteredEventos.find((ev) => ev.id === selectedEventoId)!.titulo}${
        filteredEventos.find((ev) => ev.id === selectedEventoId)!.fecha_texto
          ? ` · ${filteredEventos.find((ev) => ev.id === selectedEventoId)!.fecha_texto}`
          : ""
      }`
    : undefined;

  function handleLocalChange(localId: string) {
    setSelectedLocalId(localId);
    setSelectedEventoId("");
    setForm(EMPTY_FORM);
  }

  function handleEventoSelect(eventoId: string) {
    setSelectedEventoId(eventoId);
    const ev = filteredEventos.find((e) => e.id === eventoId);
    if (!ev) return;
    setForm({
      badge_text: ev.fecha_texto ?? "EVENTO",
      title: ev.titulo,
      subtitle: ev.descripcion ? ev.descripcion.slice(0, 80) : (ev.fecha_texto ?? ""),
      image_url: ev.imagen_cartel_url ?? "",
      action_url: ev.enlace_rrpp,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await upsertDestacado({
          id: mode === "edit" ? destacado!.id : undefined,
          ...form,
        });
        router.push("/destacados");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este destacado?")) return;
    startDeleteTransition(async () => {
      try {
        await deleteDestacado(destacado!.id);
        router.push("/destacados");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al eliminar");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Source mode — only in create with events */}
      {mode === "create" && eventos.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={sourceMode === "evento" ? "default" : "outline"}
              onClick={() => {
                setSourceMode("evento");
                setSelectedLocalId("");
                setSelectedEventoId("");
                setForm(EMPTY_FORM);
              }}
              className="gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Desde evento
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sourceMode === "custom" ? "default" : "outline"}
              onClick={() => {
                setSourceMode("custom");
                setForm(EMPTY_FORM);
              }}
            >
              Personalizado
            </Button>
          </div>

          {sourceMode === "evento" && (
            <div className="space-y-3 p-3 rounded-lg border border-border/60 bg-muted/20">
              {/* Local filter */}
              {locales.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Local</Label>
                  <Select
                    value={selectedLocalId}
                    onValueChange={(v) => handleLocalChange(v ?? "")}
                  >
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue placeholder="Todos los locales">
                        {selectedLocalLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {locales.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Event selector */}
              <div className="space-y-1.5">
                <Label className="text-xs">Evento *</Label>
                <Select
                  value={selectedEventoId}
                  onValueChange={(v) => handleEventoSelect(v ?? "")}
                >
                  <SelectTrigger className="w-full h-8 text-sm">
                    <SelectValue placeholder="Selecciona un evento...">
                      {selectedEventoLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEventos.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.titulo}
                        {ev.fecha_texto ? ` · ${ev.fecha_texto}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEventoId && (
                  <p className="text-xs text-muted-foreground">
                    Campos rellenados con el evento. Edítalos antes de guardar.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Badge (etiqueta corta) *</Label>
          <Input
            value={form.badge_text}
            onChange={(e) => set("badge_text", e.target.value)}
            placeholder="NUEVO · HYPE · HOT"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Título *</Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Subtítulo *</Label>
          <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>URL imagen *</Label>
          <Input
            value={form.image_url}
            onChange={(e) => set("image_url", e.target.value)}
            placeholder="https://..."
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>URL acción *</Label>
          <Input
            value={form.action_url}
            onChange={(e) => set("action_url", e.target.value)}
            placeholder="https://... o deep link"
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "create" ? "Crear" : "Guardar"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/destacados")}>
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
    </div>
  );
}
