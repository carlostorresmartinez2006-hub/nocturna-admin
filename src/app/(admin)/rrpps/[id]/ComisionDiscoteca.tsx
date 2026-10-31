"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fijarComisionRrpp } from "@/app/actions/rrpps";
import { euros } from "@/app/(admin)/fourvenues/formato";
import { numeroEuros } from "../CamposRrpp";

export type TipoComision = "euros" | "porcentaje";
export interface Comision {
  tipo: TipoComision;
  valor: number;
}

export const textoComision = (c: Comision) =>
  c.tipo === "euros" ? `${euros(c.valor)} por entrada` : `${c.valor.toLocaleString("es-ES")} % del precio`;

const MAX: Record<TipoComision, number> = { euros: 1000, porcentaje: 100 };

// Lo que se escribe: tipo (€ por entrada o % del precio) y valor. Devuelve el valor o el error.
function leer(tipo: TipoComision, valor: string): { valor: number } | { error: string } {
  const n = numeroEuros(valor);
  if (!Number.isFinite(n) || n > MAX[tipo]) {
    return { error: tipo === "euros" ? "Pon los € por entrada (de 0 a 1000, p. ej. 2,50)" : "Pon el % (de 0 a 100, p. ej. 10 o 12,5)" };
  }
  return { valor: n };
}

function CamposComision({ tipo, setTipo, valor, setValor, enfocar }: {
  tipo: TipoComision; setTipo: (t: TipoComision) => void; valor: string; setValor: (v: string) => void; enfocar?: boolean;
}) {
  return (
    <>
      <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
        {(["euros", "porcentaje"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`rounded px-2 py-1 ${tipo === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "euros" ? "€ por entrada" : "% del precio"}
          </button>
        ))}
      </div>
      <Input
        autoFocus={enfocar}
        inputMode="decimal"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={tipo === "euros" ? "2,50" : "10"}
        className="h-7 w-20"
        aria-label={tipo === "euros" ? "Euros por entrada" : "Porcentaje del precio"}
      />
      <span className="text-xs text-muted-foreground">{tipo === "euros" ? "€" : "%"}</span>
    </>
  );
}

/**
 * Comisión de un RRPP en una discoteca, editable. Solo es una ayuda para calcular lo que se le paga:
 * cambiarla cambia lo calculado de sus ventas de esa discoteca aún sin pagar (no lo ya pagado).
 */
export default function ComisionDiscoteca({ rrppId, localId, comision }: { rrppId: string; localId: string; comision: Comision | null }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState<TipoComision>(comision?.tipo ?? "euros");
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const abrir = () => {
    setTipo(comision?.tipo ?? "euros");
    setValor(comision ? String(comision.valor).replace(".", ",") : "");
    setError(null);
    setEditando(true);
  };

  const guardar = (nueva: Comision | null) => {
    setError(null);
    startTransition(async () => {
      const r = await fijarComisionRrpp(rrppId, localId, nueva?.tipo ?? null, nueva?.valor ?? null);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  };

  if (!editando) {
    return (
      <button
        type="button"
        onClick={abrir}
        className="group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left hover:bg-muted"
        title="Cambiar su comisión en esta discoteca"
      >
        {comision ? <span className="font-medium">{textoComision(comision)}</span> : <span className="text-muted-foreground">Sin fijar</span>}
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </button>
    );
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const r = leer(tipo, valor);
    if ("error" in r) setError(r.error);
    else guardar({ tipo, valor: r.valor });
  };

  return (
    <div className="flex flex-col gap-1">
      <form className="flex flex-wrap items-center gap-1.5" onSubmit={enviar}>
        <CamposComision tipo={tipo} setTipo={setTipo} valor={valor} setValor={setValor} enfocar />
        <Button type="submit" size="icon-xs" disabled={pendiente || !valor.trim()} title="Guardar">
          {pendiente ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
        <Button type="button" size="icon-xs" variant="ghost" onClick={() => setEditando(false)} title="Cancelar">
          <X className="h-3 w-3" />
        </Button>
        {comision && (
          <Button type="button" size="xs" variant="ghost" onClick={() => guardar(null)} disabled={pendiente} title="Dejarla sin comisión fijada">
            Quitar
          </Button>
        )}
      </form>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/** Fijar la comisión en una discoteca en la que aún no ha vendido (para tenerla lista) */
export function NuevaComision({ rrppId, discotecas }: { rrppId: string; discotecas: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [localId, setLocalId] = useState("");
  const [tipo, setTipo] = useState<TipoComision>("euros");
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  if (!discotecas.length) return null;
  if (!abierto) {
    return (
      <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setAbierto(true)}>
        <Plus className="h-3.5 w-3.5" /> Fijar su comisión en otra discoteca
      </Button>
    );
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localId) {
      setError("Elige la discoteca");
      return;
    }
    const r = leer(tipo, valor);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fijarComisionRrpp(rrppId, localId, tipo, r.valor);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setAbierto(false);
      setLocalId("");
      setValor("");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <form className="flex flex-wrap items-center gap-1.5" onSubmit={enviar}>
        <Select value={localId} onValueChange={(v) => setLocalId(v ?? "")}>
          <SelectTrigger className="h-7 w-56">
            <SelectValue placeholder="Discoteca">{discotecas.find((d) => d.id === localId)?.nombre}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {discotecas.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CamposComision tipo={tipo} setTipo={setTipo} valor={valor} setValor={setValor} />
        <Button type="submit" size="xs" disabled={pendiente} className="gap-1">
          {pendiente ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Guardar
        </Button>
        <Button type="button" size="icon-xs" variant="ghost" onClick={() => setAbierto(false)} title="Cancelar">
          <X className="h-3 w-3" />
        </Button>
      </form>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
