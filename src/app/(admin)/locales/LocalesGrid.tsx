"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectionBar } from "@/components/ui/selection-bar";
import { MapPin } from "lucide-react";
import { cn } from "cn";
import { deleteLocales } from "@/app/actions/resources";

type Local = {
  id: string;
  nombre: string;
  tipo: string | null;
  direccion: string | null;
  edad_minima: string | null;
  vestimenta: string | null;
  horario_habitual: string | null;
  imagen_url: string | null;
};

export default function LocalesGrid({ locales }: { locales: Local[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleteTransition] = useTransition();

  const allSelected = locales.length > 0 && selected.size === locales.length;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(locales.map((l) => l.id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function handleBulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} ${selected.size === 1 ? "local" : "locales"}? Se eliminarán también sus eventos.`)) return;
    startDeleteTransition(async () => {
      await deleteLocales([...selected]);
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

      {locales.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.size > 0
              ? `${selected.size} de ${locales.length} seleccionados`
              : `${locales.length} locales`}
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {locales.map((l) => (
          <div key={l.id} className="relative group">
            <div
              className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm rounded p-0.5"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(l.id);
              }}
            >
              <Checkbox checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
            </div>
            <Link href={`/locales/${l.id}`}>
              <Card
                className={cn(
                  "overflow-hidden hover:border-primary/40 transition-colors cursor-pointer",
                  selected.has(l.id) && "border-primary/50 bg-primary/5"
                )}
              >
                {l.imagen_url ? (
                  <img src={l.imagen_url} alt={l.nombre} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-primary/5 border-b border-border flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-primary/30" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{l.nombre}</h3>
                    <Badge variant="secondary" className="text-xs shrink-0">{l.tipo}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{l.direccion}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {l.edad_minima && <span>{l.edad_minima}</span>}
                    {l.vestimenta && <span>· {l.vestimenta}</span>}
                    {l.horario_habitual && <span>· {l.horario_habitual}</span>}
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
