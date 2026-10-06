"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guardarComision } from "@/app/actions/fourvenues";
import { euros } from "./formato";


/**
 * Comisión por entrada editable. `propia` es la que tiene este ámbito (null si hereda);
 * `heredada` la que se aplica si no tiene propia (la del local o la general).
 */
export default function Comision({
  ambito, clave, propia, heredada, origenHeredada, compacta,
}: {
  ambito: "general" | "local" | "evento";
  clave: string;
  propia: number | null;
  heredada?: number;
  origenHeredada?: string;
  compacta?: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(propia !== null ? String(propia) : "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const guardar = (nuevo: number | null) => {
    setError(null);
    startTransition(async () => {
      try {
        await guardarComision(ambito, clave, nuevo);
        setEditando(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se ha podido guardar");
      }
    });
  };

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => { setValor(propia !== null ? String(propia) : ""); setEditando(true); }}
        className="group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left hover:bg-muted"
        title="Cambiar la comisión"
      >
        {propia !== null ? (
          <span className={compacta ? "font-medium" : "text-2xl font-bold"}>{euros(propia)}</span>
        ) : (
          <span className="text-muted-foreground">
            {euros(heredada ?? 0)}
            {origenHeredada && <span className="ml-1 text-xs">({origenHeredada})</span>}
          </span>
        )}
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </button>
    );
  }

  const numero = Number(valor.replace(",", "."));
  return (
    <div className="flex flex-col gap-1">
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => { e.preventDefault(); if (valor.trim() !== "" && Number.isFinite(numero)) guardar(numero); }}
      >
        <Input
          autoFocus
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={heredada !== undefined ? String(heredada) : "0"}
          className="h-7 w-20"
        />
        <span className="text-xs text-muted-foreground">€</span>
        <Button type="submit" size="icon-xs" disabled={pendiente || valor.trim() === "" || !Number.isFinite(numero)} title="Guardar">
          {pendiente ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
        <Button type="button" size="icon-xs" variant="ghost" onClick={() => setEditando(false)} title="Cancelar">
          <X className="h-3 w-3" />
        </Button>
        {ambito !== "general" && propia !== null && (
          <Button type="button" size="xs" variant="ghost" onClick={() => guardar(null)} disabled={pendiente} title="Volver a la comisión heredada">
            Quitar
          </Button>
        )}
      </form>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
