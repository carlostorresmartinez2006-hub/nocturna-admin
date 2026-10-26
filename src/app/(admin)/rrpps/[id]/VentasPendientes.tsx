"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BanknoteArrowUp, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { liquidarVentas } from "@/app/actions/rrpps";
import { euros } from "@/app/(admin)/fourvenues/formato";
import CorregirVenta from "./CorregirVenta";

export interface VentaFila {
  id: number;
  fiesta: string;
  eventoId: string | null;
  /** Fecha ya formateada en el servidor */
  vendida: string;
  origen: "web" | "app";
  precio: number | null;
  comision: number;
  comprador: string;
  compradorId: string | null;
  motivo: string | null;
  /** La fiesta ya se celebró (12 h después de empezar): se puede pagar */
  pagable: boolean;
  pagableDesde: string;
  liquidacionId: number | null;
}

// Ventas válidas aún sin pagar: se eligen y se marcan como pagadas de una vez (queda un pago en el
// historial que se puede deshacer). Las anuladas después de pagárselas se descuentan en ese pago.
export default function VentasPendientes({ rrppId, ventas, aDescontar }: { rrppId: string; ventas: VentaFila[]; aDescontar: VentaFila[] }) {
  const router = useRouter();
  const [elegidas, setElegidas] = useState<Set<number>>(() => new Set());
  // Lo que hay que descontar va marcado de entrada (se puede desmarcar)
  const [noDescontar, setNoDescontar] = useState<Set<number>>(() => new Set());
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  // Solo cuenta lo elegido que sigue en la lista (al recargar, una ya pagada o anulada se cae sola)
  const pagables = ventas.filter((v) => v.pagable);
  const sel = pagables.filter((v) => elegidas.has(v.id));
  const desc = aDescontar.filter((v) => !noDescontar.has(v.id));
  const bruto = sel.reduce((s, v) => s + v.comision, 0);
  const menos = desc.reduce((s, v) => s + v.comision, 0);
  const neto = Math.round((bruto - menos) * 100) / 100;
  const todas = sel.length === pagables.length && pagables.length > 0;
  const noPagables = ventas.length - pagables.length;

  if (ventas.length === 0 && aDescontar.length === 0) {
    return (
      <div className="space-y-2">
        {hecho && <p className="text-sm text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {hecho}</p>}
        <p className="text-sm text-muted-foreground">No tiene ventas pendientes de pagar.</p>
      </div>
    );
  }

  const alternar = (conjunto: Set<number>, poner: (s: Set<number>) => void, id: number) => {
    const n = new Set(conjunto);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    poner(n);
  };

  const pagar = () => {
    if (!sel.length && !desc.length) return;
    const texto =
      neto >= 0
        ? `¿Registrar un pago de ${euros(neto)} a este RRPP?\n\n${sel.length} ${sel.length === 1 ? "venta" : "ventas"} (${euros(bruto)})` +
          (desc.length ? ` menos ${desc.length} ${desc.length === 1 ? "anulada" : "anuladas"} ya pagadas (${euros(menos)})` : "") +
          ".\n\nHazlo cuando ya le hayas pagado."
        : `Lo descontado (${euros(menos)}) es más que lo que se le paga (${euros(bruto)}): te tiene que devolver ${euros(-neto)}. ¿Registrarlo así?`;
    if (!confirm(texto)) return;
    setError(null);
    setHecho(null);
    const ids = sel.map((v) => v.id);
    const descIds = desc.map((v) => v.id);
    startTransition(async () => {
      const r = await liquidarVentas(rrppId, ids, descIds, nota);
      if (!r.ok) {
        setError(r.error);
        router.refresh();
        return;
      }
      setElegidas(new Set());
      setNoDescontar(new Set());
      setNota("");
      setHecho(`Pago #${r.data} registrado: ${neto < 0 ? `te devuelve ${euros(-neto)}` : euros(neto)}.`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {ventas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-2 py-2 w-8">
                  <input
                    type="checkbox"
                    aria-label="Elegir todas las que se pueden pagar"
                    checked={todas}
                    disabled={!pagables.length}
                    onChange={() => setElegidas(todas ? new Set() : new Set(pagables.map((v) => v.id)))}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                </th>
                <th className="text-left font-medium px-2 py-2">Vendida</th>
                <th className="text-left font-medium px-2 py-2">Fiesta</th>
                <th className="text-left font-medium px-2 py-2">Comprador</th>
                <th className="text-left font-medium px-2 py-2">Dónde</th>
                <th className="text-right font-medium px-2 py-2">Entrada</th>
                <th className="text-right font-medium px-2 py-2">Comisión</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${v.pagable ? "" : "text-muted-foreground"}`}>
                  <td className="px-2 py-2">
                    {v.pagable ? (
                      <input
                        type="checkbox"
                        aria-label={`Elegir la venta ${v.id}`}
                        checked={elegidas.has(v.id)}
                        onChange={() => alternar(elegidas, setElegidas, v.id)}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />
                    ) : (
                      <span title={`La fiesta aún no se ha celebrado: se podrá pagar ${v.pagableDesde}`}>
                        <Clock className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{v.vendida}</td>
                  <td className="px-2 py-2">{v.eventoId ? <Link href={`/eventos/${v.eventoId}`} className="hover:underline">{v.fiesta}</Link> : v.fiesta}</td>
                  <td className="px-2 py-2">{v.compradorId ? <Link href={`/usuarios/${v.compradorId}`} className="hover:underline">{v.comprador}</Link> : v.comprador}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{v.origen === "app" ? "En la app" : "Web de Fourvenues"}</td>
                  <td className="px-2 py-2 text-right">{v.precio === null ? "—" : euros(v.precio)}</td>
                  <td className="px-2 py-2 text-right font-medium">{euros(v.comision)}</td>
                  <td className="px-2 py-2 text-right"><CorregirVenta rrppId={rrppId} ventaId={v.id} accion="anulada" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {noPagables > 0 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" /> {noPagables} {noPagables === 1 ? "es de una fiesta que aún no se ha celebrado" : "son de fiestas que aún no se han celebrado"}: se
              podrán pagar 12 horas después de que empiece, cuando ya no haya reembolsos.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tiene ventas pendientes de pagar.</p>
      )}

      {aDescontar.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 p-3 space-y-2">
          <p className="text-sm font-medium text-amber-400">
            A descontar: {aDescontar.length} {aDescontar.length === 1 ? "venta anulada" : "ventas anuladas"} después de pagársela (
            {euros(aDescontar.reduce((s, v) => s + v.comision, 0))})
          </p>
          <p className="text-xs text-muted-foreground">
            Se le pagaron, pero luego la entrada se anuló, se reembolsó o la fiesta se canceló. Las marcadas se restan de este pago (si el pago anterior fue
            un error, deshazlo abajo en vez de descontar).
          </p>
          {aDescontar.map((v) => (
            <label key={v.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={!noDescontar.has(v.id)}
                onChange={() => alternar(noDescontar, setNoDescontar, v.id)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span>
                {v.vendida} · {v.fiesta} · {v.comprador} · <b>−{euros(v.comision)}</b>
                <span className="text-xs text-muted-foreground"> (pago #{v.liquidacionId}{v.motivo ? ` · ${v.motivo}` : ""})</span>
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <p className="text-sm">
          {sel.length || desc.length ? (
            <>
              {sel.length} {sel.length === 1 ? "venta" : "ventas"} ({euros(bruto)}){desc.length ? <> − {euros(menos)} descontado</> : null} ={" "}
              <b className={neto < 0 ? "text-amber-400" : ""}>{neto < 0 ? `te devuelve ${euros(-neto)}` : euros(neto)}</b>
            </>
          ) : (
            <span className="text-muted-foreground">Elige las ventas que le has pagado</span>
          )}
        </p>
        <Input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} placeholder="Nota del pago (Bizum, fecha…)" className="max-w-xs" />
        <Button onClick={pagar} disabled={(!sel.length && !desc.length) || pendiente} className="gap-2">
          {pendiente ? <Loader2 className="w-4 h-4 animate-spin" /> : <BanknoteArrowUp className="w-4 h-4" />}
          Registrar pago
        </Button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {hecho && <p className="text-sm text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {hecho}</p>}
    </div>
  );
}
