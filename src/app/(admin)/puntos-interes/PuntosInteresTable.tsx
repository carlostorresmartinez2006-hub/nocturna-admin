"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectionBar } from "@/components/ui/selection-bar";
import { Compass } from "lucide-react";
import { cn } from "cn";
import { deletePuntosInteres } from "@/app/actions/resources";

type Punto = {
  id: string;
  nombre: string;
  categoria: string | null;
  direccion: string | null;
  imagen_url: string | null;
  precio: string | null;
  horario: string | null;
};

export default function PuntosInteresTable({ puntos }: { puntos: Punto[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleteTransition] = useTransition();

  const allSelected = puntos.length > 0 && selected.size === puntos.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(puntos.map((p) => p.id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function handleBulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} ${selected.size === 1 ? "punto de interés" : "puntos de interés"}?`)) return;
    startDeleteTransition(async () => {
      await deletePuntosInteres([...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

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
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Categoría</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Dirección</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Precio</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Horario</th>
              </tr>
            </thead>
            <tbody>
              {puntos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Sin puntos de interés todavía
                  </td>
                </tr>
              ) : (
                puntos.map((p) => (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer",
                      selected.has(p.id) && "bg-primary/5 hover:bg-primary/10"
                    )}
                    onClick={() => router.push(`/puntos-interes/${p.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.imagen_url ? (
                          <img
                            src={p.imagen_url}
                            alt=""
                            className="w-8 h-8 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Compass className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <span className="font-medium">{p.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.categoria ? (
                        <Badge variant="secondary" className="text-xs">
                          {p.categoria}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate">
                      {p.direccion ?? "—"}
                    </td>
                    <td className="px-4 py-3">{p.precio ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.horario ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
