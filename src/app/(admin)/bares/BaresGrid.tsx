"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectionBar } from "@/components/ui/selection-bar";
import { Wine, Coffee, Star } from "lucide-react";
import { cn } from "cn";
import { deleteBares } from "@/app/actions/resources";

type Bar = {
  id: string;
  nombre: string;
  tipo: string | null;
  direccion: string | null;
  rating: number | null;
  reviews_count: number | null;
  es_destacado: boolean | null;
  image_url: string | null;
  precio_rango: string | null;
};

function BarCard({ b, selected, toggle }: { b: Bar; selected: boolean; toggle: (id: string) => void }) {
  return (
    <div className="relative group">
      <div
        className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm rounded p-0.5"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle(b.id);
        }}
      >
        <Checkbox checked={selected} onChange={() => toggle(b.id)} />
      </div>
      <Link href={`/bares/${b.id}`}>
        <Card
          className={cn(
            "overflow-hidden hover:border-primary/40 transition-colors cursor-pointer",
            selected && "border-primary/50 bg-primary/5"
          )}
        >
          {b.image_url ? (
            <img src={b.image_url} alt={b.nombre} className="w-full h-32 object-cover" />
          ) : (
            <div className="w-full h-32 bg-amber-500/5 border-b border-border flex items-center justify-center">
              <Wine className="w-8 h-8 text-amber-500/30" />
            </div>
          )}
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{b.nombre}</h3>
              <div className="flex gap-1 shrink-0">
                {b.es_destacado && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs gap-1">
                    <Star className="w-3 h-3" /> Top
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{b.direccion ?? "—"}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {b.rating != null && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {Number(b.rating).toFixed(1)} ({b.reviews_count ?? 0})
                </span>
              )}
              {b.precio_rango && <span>· {b.precio_rango}</span>}
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
}

export default function BaresGrid({ bares }: { bares: Bar[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleteTransition] = useTransition();

  const solosBares = bares.filter((b) => b.tipo?.toLowerCase() !== "tabernas");
  const tabernas = bares.filter((b) => b.tipo?.toLowerCase() === "tabernas");

  const allSelected = bares.length > 0 && selected.size === bares.length;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(bares.map((b) => b.id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function handleBulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} ${selected.size === 1 ? "elemento" : "elementos"}?`)) return;
    startDeleteTransition(async () => {
      await deleteBares([...selected]);
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

      {bares.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.size > 0
              ? `${selected.size} de ${bares.length} seleccionados`
              : `${bares.length} en total`}
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

      {/* Sección Bares */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Wine className="w-4 h-4 text-amber-500" />
          Bares
          <span className="text-sm font-normal text-muted-foreground">({solosBares.length})</span>
        </h2>
        {solosBares.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Sin bares todavía</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {solosBares.map((b) => (
              <BarCard key={b.id} b={b} selected={selected.has(b.id)} toggle={toggle} />
            ))}
          </div>
        )}
      </div>

      {/* Sección Tabernas */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Coffee className="w-4 h-4 text-amber-700" />
          Tabernas
          <span className="text-sm font-normal text-muted-foreground">({tabernas.length})</span>
        </h2>
        {tabernas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Sin tabernas todavía</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tabernas.map((b) => (
              <BarCard key={b.id} b={b} selected={selected.has(b.id)} toggle={toggle} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
