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
import { Loader2, Plus } from "lucide-react";
import { addEntrada } from "@/app/actions/entradas";

interface Props {
  userId: string;
  eventos: { id: string; titulo: string; fecha_texto: string | null; local_id: string | null }[];
  locales: { id: string; nombre: string }[];
}

export default function AddEntradaForm({ userId, eventos, locales }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedLocalId, setSelectedLocalId] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [nombreTicket, setNombreTicket] = useState("");
  const [emailTicket, setEmailTicket] = useState("");

  const sortedLocales = useMemo(
    () => [...locales].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [locales]
  );

  const filteredEventos = useMemo(() => {
    const list = selectedLocalId
      ? eventos.filter((ev) => ev.local_id === selectedLocalId)
      : eventos;
    const now = new Date();
    return [...list].sort((a, b) => {
      const aDate = a.fecha_texto;
      const bDate = b.fecha_texto;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return 0;
    });
  }, [eventos, selectedLocalId]);

  function handleLocalChange(v: string | null) {
    setSelectedLocalId(v ?? "");
    setEventoId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventoId) { setError("Selecciona un evento"); return; }
    setError("");
    startTransition(async () => {
      try {
        await addEntrada({ userId, eventoId, nombreTicket: nombreTicket || null, emailTicket: emailTicket || null });
        setOpen(false);
        setSelectedLocalId("");
        setEventoId("");
        setNombreTicket("");
        setEmailTicket("");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    });
  }

  const localLabel = sortedLocales.find((l) => l.id === selectedLocalId)?.nombre;
  const eventoItem = filteredEventos.find((ev) => ev.id === eventoId);
  const eventoLabel = eventoItem
    ? `${eventoItem.titulo}${eventoItem.fecha_texto ? ` · ${eventoItem.fecha_texto}` : ""}`
    : undefined;

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Añadir entrada
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
      <p className="text-sm font-medium">Nueva entrada manual</p>

      <div className="space-y-1.5">
        <Label className="text-xs">Local (filtrar eventos)</Label>
        <Select value={selectedLocalId} onValueChange={handleLocalChange}>
          <SelectTrigger className="w-full h-8 text-sm">
            <SelectValue placeholder="Todos los locales">{localLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortedLocales.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Evento *</Label>
        <Select value={eventoId} onValueChange={(v) => setEventoId(v ?? "")}>
          <SelectTrigger className="w-full h-8 text-sm">
            <SelectValue placeholder="Selecciona un evento...">{eventoLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filteredEventos.map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {ev.titulo}{ev.fecha_texto ? ` · ${ev.fecha_texto}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Nombre en ticket</Label>
          <Input
            value={nombreTicket}
            onChange={(e) => setNombreTicket(e.target.value)}
            placeholder="Nombre del asistente"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email en ticket</Label>
          <Input
            type="email"
            value={emailTicket}
            onChange={(e) => setEmailTicket(e.target.value)}
            placeholder="email@..."
            className="h-8 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Guardar entrada
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
