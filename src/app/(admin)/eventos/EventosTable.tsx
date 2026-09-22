"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectionBar } from "@/components/ui/selection-bar";
import { CalendarDays } from "lucide-react";
import { cn } from "cn";
import { deleteEventos } from "@/app/actions/resources";

type Evento = {
  id: string;
  titulo: string;
  fecha_evento: string | null;
  local_texto: string | null;
  precio: string | null;
  imagen_cartel_url: string | null;
};

export default function EventosTable({ eventos }: { eventos: Evento[] }) {
  const router = useRouter();
  const now = new Date();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleteTransition] = useTransition();

  const allSelected = eventos.length > 0 && selected.size === eventos.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(eventos.map((e) => e.id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function handleBulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} ${selected.size === 1 ? "evento" : "eventos"}?`)) return;
    startDeleteTransition(async () => {
      await deleteEventos([...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

  const upcoming = eventos
    .filter((e) => !e.fecha_evento || new Date(e.fecha_evento) >= now)
    .sort((a, b) => {
      if (!a.fecha_evento) return 1;
      if (!b.fecha_evento) return -1;
      return new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
    });

  const past = eventos
    .filter((e) => !!e.fecha_evento && new Date(e.fecha_evento) < now)
    .sort((a, b) => new Date(b.fecha_evento!).getTime() - new Date(a.fecha_evento!).getTime());

  const renderRow = (e: Evento, isPast: boolean) => (
    <tr
      key={e.id}
      className={cn(
        "border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer",
        selected.has(e.id) && "bg-primary/5 hover:bg-primary/10",
        isPast && "opacity-60"
      )}
      onClick={() => router.push(`/eventos/${e.id}`)}
    >
      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
        <Checkbox checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {e.imagen_cartel_url ? (
            <img
              src={e.imagen_cartel_url}
              alt=""
              className="w-8 h-8 rounded object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
          )}
          <div>
            <span className={cn("font-medium truncate max-w-[200px] block", isPast && "text-muted-foreground")}>
              {e.titulo}
            </span>
            {isPast && (
              <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">pasado</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {e.fecha_evento
          ? new Date(e.fecha_evento).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—"}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{e.local_texto ?? "—"}</td>
      <td className="px-4 py-3">{e.precio ?? "—"}</td>
      <td className="px-4 py-3">
        <Badge
          variant="secondary"
          className={
            isPast
              ? "text-muted-foreground"
              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          }
        >
          {isPast ? "Pasado" : "Próximo"}
        </Badge>
      </td>
    </tr>
  );

  return (
    <>
      <SelectionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onDelete={selected.size > 0 ? handleBulkDelete : undefined}
        deleting={isDeleting}
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-10">
                  <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
                </th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Evento</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Local</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Precio</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {eventos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No hay eventos registrados todavía
                  </td>
                </tr>
              ) : (
                <>
                  {upcoming.map((e) => renderRow(e, false))}
                  {past.length > 0 && (
                    <>
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground bg-muted/30 border-y border-border/60"
                        >
                          ── Eventos pasados ({past.length})
                        </td>
                      </tr>
                      {past.map((e) => renderRow(e, true))}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
