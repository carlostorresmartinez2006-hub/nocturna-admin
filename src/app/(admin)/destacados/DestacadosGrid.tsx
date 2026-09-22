"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectionBar } from "@/components/ui/selection-bar";
import { cn } from "cn";
import { deleteDestacados } from "@/app/actions/resources";

type Destacado = {
  id: string;
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  image_url: string | null;
};

export default function DestacadosGrid({ destacados }: { destacados: Destacado[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleteTransition] = useTransition();

  const allSelected = destacados.length > 0 && selected.size === destacados.length;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(destacados.map((d) => d.id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function handleBulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} ${selected.size === 1 ? "destacado" : "destacados"}?`)) return;
    startDeleteTransition(async () => {
      await deleteDestacados([...selected]);
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

      {destacados.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.size > 0
              ? `${selected.size} de ${destacados.length} seleccionados`
              : `${destacados.length} destacados`}
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-primary hover:underline cursor-pointer"
          >
            {allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
          </button>
        </div>
      )}

      {destacados.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-base font-medium">No hay destacados creados todavía</p>
          <p className="text-sm mt-1">Usa el botón &quot;Nuevo&quot; para crear el primero</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {destacados.map((d) => (
            <div key={d.id} className="relative group">
              <div
                className="absolute top-2 left-2 z-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle(d.id);
                }}
              >
                <Checkbox checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
              </div>
              <Link href={`/destacados/${d.id}`}>
                <Card
                  className={cn(
                    "overflow-hidden hover:border-primary/40 transition-colors cursor-pointer",
                    selected.has(d.id) && "border-primary/50 bg-primary/5"
                  )}
                >
                  {d.image_url && (
                    <img src={d.image_url} alt={d.title} className="w-full h-36 object-cover" />
                  )}
                  <div className="p-4 space-y-1">
                    {d.badge_text && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                          {d.badge_text}
                        </span>
                      </div>
                    )}
                    <h3 className="font-semibold">{d.title}</h3>
                    <p className="text-xs text-muted-foreground">{d.subtitle}</p>
                  </div>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
